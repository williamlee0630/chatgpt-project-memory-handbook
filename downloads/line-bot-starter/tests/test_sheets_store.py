from sheets_store import GROUP_HEADERS, MESSAGE_HEADERS, GoogleSheetsStore


class Worksheet:
    def __init__(self, values):
        self.values = [list(row) for row in values]
        self.batch_calls = []

    def get_all_values(self):
        return [list(row) for row in self.values]

    def append_row(self, row, value_input_option):
        assert value_input_option == "RAW"
        self.values.append(list(row))

    def update(self, rows, range_name, raw):
        assert raw is True
        row_number = int(range_name.split(":")[0][1:])
        self.values[row_number - 1] = list(rows[0])

    def batch_update(self, updates, value_input_option):
        assert value_input_option == "RAW"
        self.batch_calls.extend(updates)


class Spreadsheet:
    def __init__(self):
        self.groups = Worksheet(
            [
                GROUP_HEADERS,
                ["C_A", "A 群", "a@example.com"],
                ["C_B", "B 群", "b@example.com"],
            ]
        )
        self.messages = Worksheet(
            [
                MESSAGE_HEADERS,
                ["W_A", "M_A", "C_A", "U_A", "小美", "A 群訊息", "2026-09-12T09:00:00+08:00", "FALSE"],
                ["W_B", "M_B", "C_B", "U_B", "小王", "B 群訊息", "2026-09-12T09:00:00+08:00", "FALSE"],
                ["W_OLD", "M_OLD", "C_A", "U_A", "舊成員", "已寄訊息", "2026-09-11T09:00:00+08:00", "TRUE"],
            ]
        )

    def worksheet(self, name):
        return getattr(self, name)


def test_google_sheets_schema_constants_match_the_student_headers():
    assert GROUP_HEADERS == ["group_id", "group_name", "receiver_email"]
    assert MESSAGE_HEADERS == [
        "webhook_event_id",
        "message_id",
        "group_id",
        "user_id",
        "display_name",
        "message",
        "created_at",
        "sent",
    ]


def test_pending_messages_and_sent_updates_are_isolated_by_group_id():
    spreadsheet = Spreadsheet()
    store = GoogleSheetsStore(spreadsheet)

    assert [row["message_id"] for row in store.get_pending_messages("C_A")] == ["M_A"]
    assert [row["message_id"] for row in store.get_pending_messages("C_B")] == ["M_B"]

    updated = store.mark_messages_sent("C_A", ["M_A", "M_B"])

    assert updated == 1
    assert spreadsheet.messages.batch_calls == [
        {"range": "H2", "values": [["TRUE"]]}
    ]
