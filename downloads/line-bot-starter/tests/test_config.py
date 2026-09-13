import pytest

from config import REQUIRED_VARIABLES, Settings


EXPECTED_VARIABLES = (
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "GMAIL_ADDRESS",
    "GMAIL_APP_PASSWORD",
    "GOOGLE_SHEET_ID",
    "GOOGLE_SERVICE_ACCOUNT_BASE64",
)


def test_settings_require_exactly_the_six_student_variables():
    assert REQUIRED_VARIABLES == EXPECTED_VARIABLES


def test_settings_reject_a_missing_required_variable():
    values = {name: "test-value" for name in EXPECTED_VARIABLES}
    values["GMAIL_ADDRESS"] = " "

    with pytest.raises(ValueError, match="GMAIL_ADDRESS"):
        Settings.from_mapping(values)


def test_settings_removes_display_whitespace_from_gmail_app_password():
    values = {name: "test-value" for name in EXPECTED_VARIABLES}
    values["GMAIL_APP_PASSWORD"] = "abcd efgh\tijkl\nmnop"

    settings = Settings.from_mapping(values)

    assert settings.gmail_app_password == "abcdefghijklmnop"
