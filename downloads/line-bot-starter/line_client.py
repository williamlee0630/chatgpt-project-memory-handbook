from typing import Any

import requests


LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"
LINE_API_BASE_URL = "https://api.line.me/v2/bot"
LINE_TEXT_CHARACTER_LIMIT = 5000


class LineClient:
    """Small client for the LINE Messaging API operations used by this MVP."""

    def __init__(
        self,
        *,
        access_token: str,
        session: Any = requests,
        timeout: float = 10,
    ) -> None:
        self._access_token = access_token
        self._session = session
        self._timeout = timeout

    def reply_text(self, reply_token: str, text: str) -> None:
        if len(text) > LINE_TEXT_CHARACTER_LIMIT:
            text = text[: LINE_TEXT_CHARACTER_LIMIT - 1] + "…"
        response = self._session.post(
            LINE_REPLY_URL,
            headers={
                "Authorization": f"Bearer {self._access_token}",
                "Content-Type": "application/json",
            },
            json={
                "replyToken": reply_token,
                "messages": [{"type": "text", "text": text}],
            },
            timeout=self._timeout,
        )
        response.raise_for_status()

    def get_group_member_display_name(self, group_id: str, user_id: str) -> str:
        response = self._session.get(
            f"{LINE_API_BASE_URL}/group/{group_id}/member/{user_id}",
            headers={"Authorization": f"Bearer {self._access_token}"},
            timeout=self._timeout,
        )
        response.raise_for_status()
        display_name = response.json().get("displayName", "").strip()
        if not display_name:
            raise RuntimeError("LINE returned an empty group member display name")
        return display_name

    def get_group_name(self, group_id: str) -> str:
        response = self._session.get(
            f"{LINE_API_BASE_URL}/group/{group_id}/summary",
            headers={"Authorization": f"Bearer {self._access_token}"},
            timeout=self._timeout,
        )
        response.raise_for_status()
        group_name = response.json().get("groupName", "").strip()
        if not group_name:
            raise RuntimeError("LINE returned an empty group name")
        return group_name
