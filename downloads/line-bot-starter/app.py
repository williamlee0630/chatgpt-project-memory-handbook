from flask import Flask, abort, request

from line_utils import verify_signature
from message_service import GroupCommandHandler, route_text_event
from message_service import GroupMemberNameProvider


def create_app(
    *,
    channel_secret: str,
    message_store,
    group_command_handler: GroupCommandHandler | None = None,
    group_member_name_provider: GroupMemberNameProvider | None = None,
) -> Flask:
    """Create the Flask application for the LINE webhook."""
    app = Flask(__name__)

    @app.post("/callback")
    def callback():
        raw_body = request.get_data(cache=True)
        signature = request.headers.get("X-Line-Signature")

        if not verify_signature(raw_body, signature, channel_secret):
            abort(400)

        payload = request.get_json(silent=True) or {}
        for event in payload.get("events", []):
            if event.get("type") != "message":
                continue
            if event.get("message", {}).get("type") != "text":
                continue

            route_text_event(
                event,
                message_store=message_store,
                group_command_handler=group_command_handler,
                group_member_name_provider=group_member_name_provider,
            )

        return "", 200

    return app
