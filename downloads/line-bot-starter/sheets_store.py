import base64
import json
from datetime import date, datetime, timedelta, timezone


TAIPEI_TIMEZONE = timezone(timedelta(hours=8), "Asia/Taipei")
GROUP_HEADERS = ["group_id", "group_name", "receiver_email"]
MESSAGE_HEADERS = [
    "webhook_event_id",
    "message_id",
    "group_id",
    "user_id",
    "display_name",
    "message",
    "created_at",
    "sent",
]


class GoogleSheetsStore:
    """讀寫 LINE 訊息整理 Bot 的 groups 與 messages 工作表。"""

    def __init__(self, spreadsheet) -> None:
        self._groups = spreadsheet.worksheet("groups")
        self._messages = spreadsheet.worksheet("messages")

    @classmethod
    def from_base64(
        cls, sheet_id: str, encoded_credentials: str
    ) -> "GoogleSheetsStore":
        """從環境變數中的 Base64 JSON 建立 Google Sheets 連線。"""
        import gspread

        credentials_json = base64.b64decode(
            encoded_credentials,
            validate=True,
        ).decode("utf-8")
        credentials = json.loads(credentials_json)
        client = gspread.service_account_from_dict(credentials)
        return cls(client.open_by_key(sheet_id))

    @staticmethod
    def _padded(row: list[str], length: int) -> list[str]:
        return row + [""] * max(0, length - len(row))

    def _group_rows(self):
        values = self._groups.get_all_values()
        for row_number, row in enumerate(values[1:], start=2):
            group_id, group_name, receiver_email = self._padded(row, 3)[:3]
            yield row_number, {
                "group_id": group_id.strip(),
                "group_name": group_name.strip(),
                "receiver_email": receiver_email.strip(),
            }

    def _message_rows(self):
        values = self._messages.get_all_values()
        for row_number, row in enumerate(values[1:], start=2):
            (
                webhook_event_id,
                message_id,
                group_id,
                user_id,
                display_name,
                message_text,
                created_at,
                sent,
            ) = self._padded(row, 8)[:8]
            yield row_number, {
                "webhook_event_id": webhook_event_id.strip(),
                "message_id": message_id.strip(),
                "group_id": group_id.strip(),
                "user_id": user_id.strip(),
                "user_name": display_name.strip(),
                "message_text": message_text,
                "created_at": created_at.strip(),
                "sent": sent.strip().casefold() == "true",
            }

    def get_group(self, group_id: str) -> dict[str, str] | None:
        for _row_number, group in self._group_rows():
            if group["group_id"] == group_id:
                return group
        return None

    def ensure_group(self, group_id: str, group_name: str) -> dict[str, str]:
        normalized_name = group_name.strip() or "LINE群組"
        for row_number, group in self._group_rows():
            if group["group_id"] != group_id:
                continue
            if group["group_name"] != normalized_name:
                group["group_name"] = normalized_name
                self._groups.update(
                    [[group_id, normalized_name, group["receiver_email"]]],
                    range_name=f"A{row_number}:C{row_number}",
                    raw=True,
                )
            return group

        group = {
            "group_id": group_id,
            "group_name": normalized_name,
            "receiver_email": "",
        }
        self._groups.append_row(
            [group_id, normalized_name, ""],
            value_input_option="RAW",
        )
        return group

    def set_group_email(self, group_id: str, receiver_email: str) -> None:
        normalized_email = receiver_email.strip()
        for row_number, group in self._group_rows():
            if group["group_id"] != group_id:
                continue
            self._groups.update(
                [[group_id, group["group_name"] or "LINE群組", normalized_email]],
                range_name=f"A{row_number}:C{row_number}",
                raw=True,
            )
            return

        self._groups.append_row(
            [group_id, "LINE群組", normalized_email],
            value_input_option="RAW",
        )

    def message_exists(self, message_id: str) -> bool:
        return any(
            message["message_id"] == message_id
            for _row_number, message in self._message_rows()
        )

    def webhook_event_exists(self, webhook_event_id: str) -> bool:
        return any(
            message["webhook_event_id"] == webhook_event_id
            for _row_number, message in self._message_rows()
        )

    def insert_message(
        self,
        *,
        webhook_event_id: str,
        message_id: str,
        group_id: str,
        user_id: str | None,
        display_name: str,
        message: str,
        created_at: datetime,
    ) -> str | None:
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            raise ValueError("created_at must be timezone-aware")
        if (
            self.webhook_event_exists(webhook_event_id)
            if webhook_event_id
            else self.message_exists(message_id)
        ):
            return None

        taipei_created_at = created_at.astimezone(TAIPEI_TIMEZONE).isoformat(
            timespec="seconds"
        )
        self._messages.append_row(
            [
                webhook_event_id,
                message_id,
                group_id,
                user_id or "",
                display_name,
                message,
                taipei_created_at,
                "FALSE",
            ],
            value_input_option="RAW",
        )
        return message_id

    def get_pending_messages(self, group_id: str) -> list[dict[str, object]]:
        return [
            message
            for _row_number, message in self._message_rows()
            if message["group_id"] == group_id and message["sent"] is False
        ]

    def mark_messages_sent(self, group_id: str, message_ids: list[str]) -> int:
        target_ids = set(message_ids)
        updates = []
        for row_number, message in self._message_rows():
            if (
                message["group_id"] == group_id
                and message["message_id"] in target_ids
                and message["sent"] is False
            ):
                updates.append({"range": f"H{row_number}", "values": [["TRUE"]]})
        if updates:
            self._messages.batch_update(updates, value_input_option="RAW")
        return len(updates)

    def backfill_group_member_name(
        self, group_id: str, user_id: str, display_name: str
    ) -> int:
        updates = []
        for row_number, message in self._message_rows():
            if (
                message["group_id"] == group_id
                and message["user_id"] == user_id
                and not str(message["user_name"]).strip()
            ):
                updates.append(
                    {"range": f"E{row_number}", "values": [[display_name]]}
                )
        if updates:
            self._messages.batch_update(updates, value_input_option="RAW")
        return len(updates)

    def query_group_messages_between_dates(
        self,
        *,
        group_id: str,
        start_date: date,
        end_date: date,
    ) -> list[dict[str, object]]:
        messages = []
        for _row_number, message in self._message_rows():
            if message["group_id"] != group_id:
                continue
            try:
                created_at = datetime.fromisoformat(str(message["created_at"]))
            except ValueError:
                continue
            if created_at.tzinfo is None or created_at.utcoffset() is None:
                created_at = created_at.replace(tzinfo=TAIPEI_TIMEZONE)
            taipei_date = created_at.astimezone(TAIPEI_TIMEZONE).date()
            if start_date <= taipei_date < end_date:
                messages.append(message)
        return messages
