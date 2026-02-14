import unittest
from datetime import date

from notion_contacts_sync import (
    ExistingContact,
    IncomingContact,
    dedupe_contact,
    merge_contact_fields,
    parse_contacts_json,
)


class NotionContactsSyncTests(unittest.TestCase):
    def test_parse_contacts_json_handles_wrapped_markdown(self):
        raw = """```json
        {"contacts": [
          {"name": "Al", "email": null, "role": "CTO", "company": "ClearSol"}
        ]}
        ```"""

        contacts = parse_contacts_json(raw)

        self.assertEqual(
            contacts,
            [IncomingContact(name="Al", email=None, role="CTO", company="ClearSol")],
        )

    def test_dedupe_prefers_exact_email_case_insensitive(self):
        existing = [
            ExistingContact(
                page_id="1",
                name="Alice Wong",
                email="ALICE@example.com",
                role="Director",
                company="ClearSol",
            )
        ]
        incoming = IncomingContact(
            name="Alice W.", email="alice@example.com", role=None, company=None
        )

        match = dedupe_contact(incoming, existing)

        self.assertIsNotNone(match)
        self.assertEqual(match.page_id, "1")

    def test_dedupe_fuzzy_name_when_email_missing(self):
        existing = [
            ExistingContact(
                page_id="2",
                name="Jordan Lee",
                email=None,
                role="PM",
                company="Optimize",
            )
        ]
        incoming = IncomingContact(
            name="Jordon Lee", email=None, role="Program Manager", company="Optimize"
        )

        match = dedupe_contact(incoming, existing)

        self.assertIsNotNone(match)
        self.assertEqual(match.page_id, "2")

    def test_merge_contact_fields_fills_missing_and_updates_last_seen(self):
        existing = ExistingContact(
            page_id="3",
            name="Alberto",
            email=None,
            role=None,
            company="ClearSol",
        )
        incoming = IncomingContact(
            name="Alberto", email="al@clearsol.com", role="Sales Lead", company="ClearSol"
        )

        merged = merge_contact_fields(existing, incoming, seen_on=date(2026, 2, 14))

        self.assertEqual(merged["Email"], "al@clearsol.com")
        self.assertEqual(merged["Role"], "Sales Lead")
        self.assertEqual(merged["Last Seen"], "2026-02-14")


if __name__ == "__main__":
    unittest.main()
