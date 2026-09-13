from collections.abc import Callable
from datetime import datetime, timezone
import logging
import re

from email_service import send_record_email
from sheets_store import TAIPEI_TIMEZONE


GroupCommandHandler = Callable[[dict, str | None], None]
GroupMemberNameProvider = Callable[[str, str], str]
GroupWelcomeHandler = Callable[[dict], None]
FULL_WELCOME_MESSAGE = """👋 大家好，我是「LINE 訊息整理 Bot」

我會從加入這個群組後開始記錄新的文字訊息，
並可以把尚未寄出的聊天紀錄寄到這個群組設定的 Email。

可使用以下指令：

📧 #設定信箱 your@gmail.com
設定或修改這個群組的紀錄收件信箱。

🔍 #查看信箱
查看這個群組目前設定的收件信箱。

📤 #寄出紀錄
把目前尚未寄出的文字紀錄寄到設定好的 Email。
寄送成功後，這批紀錄會標記為已寄出。

注意：
・只記錄 Bot 加入後的新文字訊息
・不記錄加入前的歷史訊息
・目前不處理圖片、貼圖、影片、檔案與 LINE 記事本
・#設定信箱 後面要有一個半形空格再輸入 Email
・一般聊天不需要標記 Bot，會自動保存"""
MEMBER_WELCOME_MESSAGE = """👋 歡迎新成員！

我是「LINE 訊息整理 Bot」，會自動記錄我加入群組後的新文字訊息。

可使用以下指令：

📧 #設定信箱 your@gmail.com
設定或修改本群組的紀錄收件信箱。

🔍 #查看信箱
查看目前設定的收件信箱。

📤 #寄出紀錄
把尚未寄出的群組文字紀錄寄到設定好的 Email。

一般聊天不需要標記我，我會自動保存。"""
INVALID_EMAIL_REPLY = (
    "Email 格式不正確。\n\n請重新輸入，例如：\n#設定信箱 example@gmail.com"
)
MISSING_EMAIL_REPLY = (
    "本聊天室尚未設定收件信箱。\n\n請先輸入：\n#設定信箱 example@gmail.com"
)
NO_NEW_RECORDS_REPLY = "目前沒有新的 LINE 紀錄可以寄出。"
EMAIL_FAILURE_REPLY = "LINE 紀錄寄送失敗，紀錄已保留。"
logger = logging.getLogger(__name__)


def create_group_welcome_handler(*, line_client) -> GroupWelcomeHandler:
    """建立 Bot 與新成員加入群組時的介紹訊息處理函式。"""

    def handle(event: dict) -> None:
        if event.get("source", {}).get("type") != "group":
            return
        if event.get("type") == "join":
            reply_text = FULL_WELCOME_MESSAGE
        elif event.get("type") == "memberJoined":
            reply_text = MEMBER_WELCOME_MESSAGE
        else:
            return

        try:
            line_client.reply_text(event["replyToken"], reply_text)
        except Exception:
            logger.warning("LINE welcome reply failed")

    return handle


def parse_record_command(message_text: str) -> tuple[str, str | None] | None:
    """辨識不應寫入聊天紀錄的三個控制指令。"""
    normalized = message_text.strip()
    match = re.fullmatch(r"#設定信箱(?:\s+(.*))?", normalized)
    if match:
        return "set_email", match.group(1)
    if normalized == "#查看信箱":
        return "view_email", None
    if normalized == "#寄出紀錄":
        return "send_records", None
    return None


def is_valid_email(value: str | None) -> bool:
    if value is None:
        return False
    return re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value.strip()) is not None


def format_record_email(
    *,
    group_name: str,
    target_date,
    messages: list[dict[str, object]],
) -> tuple[str, str]:
    subject = f"[LINE紀錄][{group_name}] {target_date.isoformat()}"
    lines = []
    for message in messages:
        created_at = datetime.fromisoformat(str(message["created_at"]))
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            created_at = created_at.replace(tzinfo=TAIPEI_TIMEZONE)
        time_text = created_at.astimezone(TAIPEI_TIMEZONE).strftime("%H:%M")
        author = message.get("user_name") or message.get("user_id") or "LINE 使用者"
        lines.append(f'{time_text} {author}：{message["message_text"]}')
    body = (
        "LINE 對話紀錄\n\n"
        f"聊天室：{group_name}\n"
        f"日期：{target_date.isoformat()}\n\n"
        + "\n".join(lines)
    )
    return subject, body


def create_group_command_handler(
    *,
    message_store,
    line_client,
    gmail_address: str = "",
    gmail_app_password: str = "",
    email_sender=None,
    today_provider=None,
) -> GroupCommandHandler:
    """建立三個聊天室紀錄控制指令的處理函式。"""
    if today_provider is None:
        today_provider = lambda: datetime.now(TAIPEI_TIMEZONE).date()
    if email_sender is None:
        email_sender = send_record_email

    def reply_safely(event: dict, reply_text: str) -> None:
        try:
            line_client.reply_text(event["replyToken"], reply_text)
        except Exception:
            logger.warning("LINE Reply API request failed")

    def ensure_current_group(event: dict) -> dict[str, str]:
        group_id = event["source"]["groupId"]
        group = message_store.get_group(group_id)
        if group and group.get("group_name") not in (None, "", "LINE群組"):
            return group
        try:
            group_name = line_client.get_group_name(group_id)
        except Exception:
            logger.warning("LINE group summary request failed")
            group_name = (group or {}).get("group_name") or "LINE群組"
        return message_store.ensure_group(group_id, group_name)

    def handle_record_command(
        event: dict,
        record_command: tuple[str, str | None],
        group: dict[str, str],
    ) -> None:
        command, argument = record_command
        group_id = event["source"]["groupId"]
        if command == "set_email":
            if not is_valid_email(argument):
                reply_safely(event, INVALID_EMAIL_REPLY)
                return
            receiver_email = str(argument).strip()
            message_store.set_group_email(group_id, receiver_email)
            reply_safely(
                event,
                f"已設定本聊天室的紀錄收件信箱：\n{receiver_email}",
            )
            return

        receiver_email = group.get("receiver_email", "").strip()
        if command == "view_email":
            reply_text = (
                f"本聊天室目前的紀錄收件信箱：\n{receiver_email}"
                if receiver_email
                else "本聊天室尚未設定收件信箱。\n\n請輸入：\n#設定信箱 example@gmail.com"
            )
            reply_safely(event, reply_text)
            return

        if not receiver_email:
            reply_safely(event, MISSING_EMAIL_REPLY)
            return
        messages = message_store.get_pending_messages(group_id)
        if not messages:
            reply_safely(event, NO_NEW_RECORDS_REPLY)
            return

        today = today_provider()
        group_name = group.get("group_name") or "LINE群組"
        subject, body = format_record_email(
            group_name=group_name,
            target_date=today,
            messages=messages,
        )
        message_ids = [str(message["message_id"]) for message in messages]
        try:
            if not gmail_address or not gmail_app_password:
                raise RuntimeError("Gmail SMTP settings are missing")
            email_sender(
                sender_address=gmail_address,
                app_password=gmail_app_password,
                receiver_email=receiver_email,
                subject=subject,
                body=body,
            )
        except Exception as error:
            logger.warning(
                "LINE record email delivery failed: "
                "stage=email_delivery error_type=%s smtp_code=%s",
                type(error).__name__,
                getattr(error, "smtp_code", "none"),
            )
            reply_safely(event, EMAIL_FAILURE_REPLY)
            return

        try:
            message_store.mark_messages_sent(group_id, message_ids)
        except Exception as error:
            logger.warning(
                "LINE record email delivery failed: "
                "stage=sheets_mark_sent error_type=%s",
                type(error).__name__,
            )
            reply_safely(event, EMAIL_FAILURE_REPLY)
            return
        reply_safely(event, f"LINE 紀錄已寄送至：\n{receiver_email}")

    def handle(event: dict, _inserted_message_id: str | None) -> None:
        group = ensure_current_group(event)
        record_command = parse_record_command(event["message"]["text"])
        if record_command is not None:
            handle_record_command(event, record_command, group)

    return handle


def route_text_event(
    event: dict,
    *,
    message_store,
    group_command_handler: GroupCommandHandler | None = None,
    group_member_name_provider: GroupMemberNameProvider | None = None,
) -> None:
    """只處理 LINE 群組中的文字訊息。"""
    if event.get("source", {}).get("type") == "group":
        source = event["source"]
        message = event["message"]
        if parse_record_command(message["text"]) is not None:
            if group_command_handler is not None:
                group_command_handler(event, None)
            return
        webhook_event_id = str(event.get("webhookEventId") or "").strip()
        message_id = str(message.get("id") or "").strip()
        is_duplicate = (
            message_store.webhook_event_exists(webhook_event_id)
            if webhook_event_id
            else message_store.message_exists(message_id)
        )
        if is_duplicate:
            return
        user_id = source.get("userId") or ""
        user_name = None
        if group_member_name_provider is not None and user_id:
            try:
                user_name = group_member_name_provider(source["groupId"], user_id)
            except Exception:
                logger.warning("LINE group member profile request failed")
        if user_name is not None and user_id:
            message_store.backfill_group_member_name(
                source["groupId"],
                user_id,
                user_name,
            )
        display_name = user_name or "LINE 使用者"
        created_at = datetime.fromtimestamp(
            event["timestamp"] / 1000,
            tz=timezone.utc,
        )
        inserted_message_id = message_store.insert_message(
            webhook_event_id=webhook_event_id,
            message_id=message_id,
            group_id=source["groupId"],
            user_id=user_id,
            display_name=display_name,
            message=message["text"],
            created_at=created_at,
        )
        if inserted_message_id is None:
            return
        if group_command_handler is not None:
            group_command_handler(event, inserted_message_id)
