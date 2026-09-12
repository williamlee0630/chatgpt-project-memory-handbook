import os

import requests
from dotenv import load_dotenv

from app import create_app
from config import Settings
from line_client import LineClient
from message_service import create_group_command_handler
from sheets_store import GoogleSheetsStore


def build_app(
    settings: Settings,
    *,
    line_session=requests,
    message_store=None,
    email_sender=None,
):
    """Compose the bot from explicit settings and injectable API clients."""
    if message_store is None:
        message_store = GoogleSheetsStore.from_base64(
            settings.google_sheet_id,
            settings.google_service_account_base64,
        )

    line_client = LineClient(
        access_token=settings.line_channel_access_token,
        session=line_session,
    )
    group_handler = create_group_command_handler(
        message_store=message_store,
        line_client=line_client,
        gmail_address=settings.gmail_address,
        gmail_app_password=settings.gmail_app_password,
        email_sender=email_sender,
    )
    return create_app(
        channel_secret=settings.line_channel_secret,
        message_store=message_store,
        group_command_handler=group_handler,
        group_member_name_provider=line_client.get_group_member_display_name,
    )


def create_runtime_app():
    """Load local environment variables and create the runnable Flask app."""
    load_dotenv()
    settings = Settings.from_mapping(os.environ)
    return build_app(settings)


if __name__ == "__main__":
    runtime_app = create_runtime_app()
    runtime_app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
    )
