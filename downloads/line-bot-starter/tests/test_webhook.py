import base64
import hashlib
import hmac
import json

from app import create_app
from line_utils import verify_signature


class RecordingStore:
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


def test_line_signature_uses_the_unmodified_request_body():
    body = b'{"events":[]}'
    assert verify_signature(
        body,
        "pkK1lVPJPiJ+wPLziRD79xIxohl8AImYM8AEeM7IbzQ=",
        "secret",
    )
    assert not verify_signature(body, "wrong", "secret")


def test_callback_rejects_an_invalid_line_signature():
    app = create_app(channel_secret="secret", message_store=RecordingStore())
    response = app.test_client().post(
        "/callback",
        data=b'{"events":[]}',
        content_type="application/json",
        headers={"X-Line-Signature": "wrong"},
    )
    assert response.status_code == 400


def test_callback_accepts_the_formal_callback_path():
    app = create_app(channel_secret="secret", message_store=RecordingStore())
    response = app.test_client().post(
        "/callback",
        data=b'{"events":[]}',
        content_type="application/json",
        headers={
            "X-Line-Signature": "pkK1lVPJPiJ+wPLziRD79xIxohl8AImYM8AEeM7IbzQ="
        },
    )
    assert response.status_code == 200


def test_callback_routes_group_join_events_to_the_welcome_handler():
    events = [
        {
            "type": "join",
            "replyToken": "join-token",
            "source": {"type": "group", "groupId": "C_A"},
        },
        {
            "type": "memberJoined",
            "replyToken": "member-token",
            "source": {"type": "group", "groupId": "C_A"},
        },
    ]
    body = json.dumps({"events": events}, separators=(",", ":")).encode()
    signature = base64.b64encode(
        hmac.new(b"secret", body, hashlib.sha256).digest()
    ).decode()
    welcomed = []
    store = RecordingStore()
    app = create_app(
        channel_secret="secret",
        message_store=store,
        group_welcome_handler=welcomed.append,
    )

    response = app.test_client().post(
        "/callback",
        data=body,
        content_type="application/json",
        headers={"X-Line-Signature": signature},
    )

    assert response.status_code == 200
    assert [event["type"] for event in welcomed] == ["join", "memberJoined"]
    assert store.inserted == []
