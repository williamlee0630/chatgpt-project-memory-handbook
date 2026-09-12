from dataclasses import dataclass, field
from typing import Mapping


REQUIRED_VARIABLES = (
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "GMAIL_ADDRESS",
    "GMAIL_APP_PASSWORD",
    "GOOGLE_SHEET_ID",
    "GOOGLE_SERVICE_ACCOUNT_BASE64",
)


@dataclass(frozen=True)
class Settings:
    line_channel_secret: str = field(repr=False)
    line_channel_access_token: str = field(repr=False)
    gmail_address: str
    gmail_app_password: str = field(repr=False)
    google_sheet_id: str
    google_service_account_base64: str = field(repr=False)

    @classmethod
    def from_mapping(cls, values: Mapping[str, str]) -> "Settings":
        missing = [
            name for name in REQUIRED_VARIABLES if not values.get(name, "").strip()
        ]
        if missing:
            raise ValueError(
                "Missing required environment variables: " + ", ".join(missing)
            )

        return cls(
            line_channel_secret=values["LINE_CHANNEL_SECRET"].strip(),
            line_channel_access_token=values["LINE_CHANNEL_ACCESS_TOKEN"].strip(),
            gmail_address=values["GMAIL_ADDRESS"].strip(),
            gmail_app_password=values["GMAIL_APP_PASSWORD"].strip(),
            google_sheet_id=values["GOOGLE_SHEET_ID"].strip(),
            google_service_account_base64=values[
                "GOOGLE_SERVICE_ACCOUNT_BASE64"
            ].strip(),
        )
