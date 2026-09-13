from datetime import date

import pytest

from message_service import (
    EMAIL_FAILURE_REPLY,
    create_group_command_handler,
    create_group_welcome_handler,
    format_record_email,
    parse_record_command,
    route_text_event,
)


def text_event(text, *, group_id="C_A", message_id="M_1", webhook_id="W_1"):
    return {
        "type": "message",
        "webhookEventId": webhook_id,
        "timestamp": 1799737200000,
        "replyToken": "reply-token",
        "source": {"type": "group", "groupId": group_id, "userId": "U_1"},
        "message": {"type": "text", "id": message_id, "text": text},
    }


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("#設定信箱 student@example.com", ("set_email", "student@example.com")),
        ("#查看信箱", ("view_email", None)),
        ("#寄出紀錄", ("send_records", None)),
    ],
)
def test_formal_control_commands_are_recognized(text, expected):
    assert parse_record_command(text) == expected


def test_control_commands_do_not_write_to_messages():
    class StoreThatMustNotBeRead:
        def __getattr__(self, name):
            raise AssertionError("control command touched message store: " + name)

    routed = []
    for command in (
        "#設定信箱 student@example.com",
        "#查看信箱",
        "#寄出紀錄",
    ):
        route_text_event(
            text_event(command),
            message_store=StoreThatMustNotBeRead(),
            group_command_handler=lambda event, message_id: routed.append(
                (event["message"]["text"], message_id)
            ),
        )

    assert routed == [
        ("#設定信箱 student@example.com", None),
        ("#查看信箱", None),
        ("#寄出紀錄", None),
    ]


def test_webhook_redelivery_is_inserted_only_once():
    class Store:
        def __init__(self):
            self.webhook_ids = set()
            self.inserted = []

        def webhook_event_exists(self, webhook_event_id):
            return webhook_event_id in self.webhook_ids

        def message_exists(self, _message_id):
            return False

        def backfill_group_member_name(self, *_args):
            return 0

        def insert_message(self, **message):
            self.webhook_ids.add(message["webhook_event_id"])
            self.inserted.append(message)
            return message["message_id"]

    store = Store()
    event = text_event("一般訊息")
    route_text_event(event, message_store=store)
    route_text_event(event, message_store=store)

    assert [row["message_id"] for row in store.inserted] == ["M_1"]


class CommandStore:
    def __init__(self):
        self.groups = {
            "C_A": {
                "group_id": "C_A",
                "group_name": "A 群",
                "receiver_email": "a@example.com",
            },
            "C_B": {
                "group_id": "C_B",
                "group_name": "B 群",
                "receiver_email": "b@example.com",
            },
        }
        self.pending = {
            "C_A": [
                {
                    "message_id": "M_A1",
                    "group_id": "C_A",
                    "user_name": "小美",
                    "message_text": "A 群第一則",
                    "created_at": "2026-09-12T09:00:00+08:00",
                },
                {
                    "message_id": "M_A2",
                    "group_id": "C_A",
                    "user_name": "小王",
                    "message_text": "A 群第二則",
                    "created_at": "2026-09-12T09:05:00+08:00",
                },
            ],
            "C_B": [
                {
                    "message_id": "M_B1",
                    "group_id": "C_B",
                    "user_name": "小李",
                    "message_text": "B 群訊息",
                    "created_at": "2026-09-12T09:10:00+08:00",
                }
            ],
        }
        self.mark_calls = []

    def get_group(self, group_id):
        return self.groups[group_id]

    def get_pending_messages(self, group_id):
        return list(self.pending[group_id])

    def mark_messages_sent(self, group_id, message_ids):
        self.mark_calls.append((group_id, list(message_ids)))
        return len(message_ids)


class ReplyingLineClient:
    def __init__(self):
        self.replies = []

    def reply_text(self, _reply_token, text):
        self.replies.append(text)


def test_email_failure_keeps_pending_messages_unsent():
    store = CommandStore()
    line_client = ReplyingLineClient()

    def fail_email(**_kwargs):
        raise RuntimeError("SMTP unavailable")

    handler = create_group_command_handler(
        message_store=store,
        line_client=line_client,
        gmail_address="sender@example.com",
        gmail_app_password="app-password",
        email_sender=fail_email,
        today_provider=lambda: date(2026, 9, 12),
    )
    handler(text_event("#寄出紀錄", group_id="C_A"), None)

    assert store.mark_calls == []
    assert line_client.replies[-1] == EMAIL_FAILURE_REPLY


def test_email_success_marks_only_the_current_group_snapshot_message_ids():
    store = CommandStore()
    line_client = ReplyingLineClient()
    sent_emails = []

    def send_email(**message):
        sent_emails.append(message)
        store.pending["C_A"].append(
            {
                "message_id": "M_A3",
                "group_id": "C_A",
                "user_name": "後來加入",
                "message_text": "寄信期間的新訊息",
                "created_at": "2026-09-12T09:15:00+08:00",
            }
        )

    handler = create_group_command_handler(
        message_store=store,
        line_client=line_client,
        gmail_address="sender@example.com",
        gmail_app_password="app-password",
        email_sender=send_email,
        today_provider=lambda: date(2026, 9, 12),
    )
    handler(text_event("#寄出紀錄", group_id="C_A"), None)

    assert store.mark_calls == [("C_A", ["M_A1", "M_A2"])]
    assert store.pending["C_B"][0]["message_id"] == "M_B1"
    assert sent_emails[0]["receiver_email"] == "a@example.com"
    assert sent_emails[0]["subject"] == "[LINE紀錄][A 群] 2026-09-12"


def test_email_subject_uses_group_name_and_iso_date():
    subject, _body = format_record_email(
        group_name="設計組",
        target_date=date(2026, 9, 12),
        messages=[],
    )
    assert subject == "[LINE紀錄][設計組] 2026-09-12"


def test_welcome_handler_explains_commands_for_bot_and_member_join_events():
    line_client = ReplyingLineClient()
    handler = create_group_welcome_handler(line_client=line_client)

    handler({"type": "join", "replyToken": "one", "source": {"type": "group"}})
    handler(
        {
            "type": "memberJoined",
            "replyToken": "two",
            "source": {"type": "group"},
        }
    )

    assert line_client.replies[0].startswith("👋 大家好")
    assert line_client.replies[1].startswith("👋 歡迎新成員")
    for reply in line_client.replies:
        assert "#設定信箱" in reply
        assert "#查看信箱" in reply
        assert "#寄出紀錄" in reply
