#!/usr/bin/env python3
"""Sync contacts mentioned in Notion meeting notes into a Notion contacts database.

Manual mode is supported out of the box:
- Pass `--page-url` (or `--page-id`) to read notes from Notion
- Or pass `--text` / `--text-file` to process local text

Environment variables:
- NOTION_TOKEN
- NOTION_CONTACTS_DATABASE_ID
- OPENAI_API_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from difflib import SequenceMatcher
from typing import Any


@dataclass(eq=True, frozen=True)
class IncomingContact:
    name: str | None
    email: str | None
    role: str | None
    company: str | None


@dataclass
class ExistingContact:
    page_id: str
    name: str | None
    email: str | None
    role: str | None
    company: str | None


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip()
    return cleaned or None


def normalize_email(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    return cleaned.lower() if cleaned else None


def normalize_name(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    if not cleaned:
        return None
    return re.sub(r"[^a-z0-9 ]+", "", cleaned.lower()).strip() or None


def normalize_company(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    if not cleaned:
        return None
    return re.sub(r"\s+", " ", cleaned.lower())


def parse_contacts_json(raw_output: str) -> list[IncomingContact]:
    """Parse JSON produced by the extractor into normalized IncomingContact rows."""
    cleaned = raw_output.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    data = json.loads(cleaned)
    rows: list[dict[str, Any]]
    if isinstance(data, dict):
        contacts = data.get("contacts", [])
        rows = contacts if isinstance(contacts, list) else []
    elif isinstance(data, list):
        rows = data
    else:
        rows = []

    parsed: list[IncomingContact] = []
    seen_keys: set[tuple[str | None, str | None, str | None, str | None]] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        contact = IncomingContact(
            name=_clean_text(_safe_get(row, "name")),
            email=normalize_email(_safe_get(row, "email")),
            role=_clean_text(_safe_get(row, "role")),
            company=_clean_text(_safe_get(row, "company")),
        )
        if not contact.name and not contact.email:
            continue
        key = (
            normalize_name(contact.name),
            contact.email,
            normalize_company(contact.company),
            _clean_text(contact.role.lower() if contact.role else None),
        )
        if key in seen_keys:
            continue
        seen_keys.add(key)
        parsed.append(contact)

    return parsed


def _safe_get(row: dict[str, Any], key: str) -> str | None:
    value = row.get(key)
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return str(value)


def _similarity(a: str, b: str) -> float:
    try:
        from rapidfuzz import fuzz  # type: ignore

        return float(fuzz.token_set_ratio(a, b))
    except Exception:
        return SequenceMatcher(None, a, b).ratio() * 100.0


def dedupe_contact(
    incoming: IncomingContact, existing_contacts: list[ExistingContact]
) -> ExistingContact | None:
    """Find a best match by email exact match, then fuzzy name/company."""
    incoming_email = normalize_email(incoming.email)
    if incoming_email:
        for existing in existing_contacts:
            if normalize_email(existing.email) == incoming_email:
                return existing

    incoming_name = normalize_name(incoming.name)
    if not incoming_name:
        return None

    incoming_company = normalize_company(incoming.company)
    best: ExistingContact | None = None
    best_score = 0.0

    for existing in existing_contacts:
        existing_name = normalize_name(existing.name)
        if not existing_name:
            continue
        score = _similarity(incoming_name, existing_name)

        existing_company = normalize_company(existing.company)
        if incoming_company and existing_company:
            if incoming_company == existing_company:
                score += 8.0
            else:
                score -= 8.0

        threshold = 90.0 if incoming_company else 93.0
        if score >= threshold and score > best_score:
            best = existing
            best_score = score

    return best


def merge_contact_fields(
    existing: ExistingContact, incoming: IncomingContact, seen_on: date
) -> dict[str, str]:
    """Return canonical property updates for an existing contact row."""
    updates: dict[str, str] = {"Last Seen": seen_on.isoformat()}

    if incoming.email and not normalize_email(existing.email):
        updates["Email"] = normalize_email(incoming.email) or ""
    if incoming.role and not _clean_text(existing.role):
        updates["Role"] = incoming.role
    if incoming.company and not _clean_text(existing.company):
        updates["Company/Org"] = incoming.company
    if incoming.name and not _clean_text(existing.name):
        updates["Name"] = incoming.name

    return updates


def extract_contacts_with_openai(
    meeting_text: str,
    known_contacts: list[ExistingContact],
    model: str,
    api_key: str | None = None,
) -> list[IncomingContact]:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError(
            "The 'openai' package is required. Install with: pip install openai"
        ) from exc

    known_blob = "\n".join(
        f"- name={c.name or 'unknown'}; email={c.email or 'unknown'}; company={c.company or 'unknown'}; role={c.role or 'unknown'}"
        for c in known_contacts[:500]
    )
    system_prompt = (
        "You extract contact mentions from meeting notes. "
        "Return JSON only: {\"contacts\": [{\"name\": str|null, \"email\": str|null, \"role\": str|null, \"company\": str|null}]}. "
        "Include partial contacts when only name/company is known. "
        "Do not invent emails. If unsure, leave fields null."
    )
    user_prompt = (
        "Known contacts (for ambiguity resolution):\n"
        f"{known_blob or '- none'}\n\n"
        "Meeting notes/transcript:\n"
        f"{meeting_text}\n\n"
        "Return JSON only."
    )

    client = OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    return parse_contacts_json(raw)


def extract_notion_id(page_url_or_id: str) -> str:
    candidate = page_url_or_id.strip()
    hex_chars = re.findall(r"[a-fA-F0-9]", candidate)
    if len(hex_chars) >= 32:
        compact = "".join(hex_chars[-32:])
        return (
            f"{compact[0:8]}-{compact[8:12]}-{compact[12:16]}-"
            f"{compact[16:20]}-{compact[20:32]}"
        )
    raise ValueError(f"Unable to extract a Notion page ID from: {page_url_or_id}")


def _plain_text_from_rich_text(rich_text_items: list[dict[str, Any]]) -> str | None:
    if not rich_text_items:
        return None
    text = "".join(item.get("plain_text", "") for item in rich_text_items).strip()
    return text or None


class NotionClientAdapter:
    def __init__(self, token: str):
        try:
            from notion_client import Client
        except ImportError as exc:
            raise RuntimeError(
                "The 'notion-client' package is required. Install with: pip install notion-client"
            ) from exc

        self.client = Client(auth=token)

    def fetch_database_schema(self, database_id: str) -> dict[str, Any]:
        return self.client.databases.retrieve(database_id=database_id)

    def query_database_all(self, database_id: str) -> list[dict[str, Any]]:
        all_results: list[dict[str, Any]] = []
        cursor: str | None = None
        while True:
            payload: dict[str, Any] = {"database_id": database_id, "page_size": 100}
            if cursor:
                payload["start_cursor"] = cursor
            response = self.client.databases.query(**payload)
            all_results.extend(response.get("results", []))
            if not response.get("has_more"):
                break
            cursor = response.get("next_cursor")
        return all_results

    def get_page(self, page_id: str) -> dict[str, Any]:
        return self.client.pages.retrieve(page_id=page_id)

    def list_block_children(self, block_id: str, cursor: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"block_id": block_id, "page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        return self.client.blocks.children.list(**payload)

    def create_page(self, parent_database_id: str, properties: dict[str, Any]) -> dict[str, Any]:
        return self.client.pages.create(parent={"database_id": parent_database_id}, properties=properties)

    def update_page(self, page_id: str, properties: dict[str, Any]) -> dict[str, Any]:
        return self.client.pages.update(page_id=page_id, properties=properties)

    def append_blocks(self, block_id: str, children: list[dict[str, Any]]) -> dict[str, Any]:
        return self.client.blocks.children.append(block_id=block_id, children=children)


def _extract_property_text(property_value: dict[str, Any]) -> str | None:
    prop_type = property_value.get("type")
    if prop_type == "title":
        return _plain_text_from_rich_text(property_value.get("title", []))
    if prop_type == "rich_text":
        return _plain_text_from_rich_text(property_value.get("rich_text", []))
    if prop_type == "email":
        return _clean_text(property_value.get("email"))
    if prop_type == "select":
        select = property_value.get("select") or {}
        return _clean_text(select.get("name"))
    if prop_type == "multi_select":
        names = [item.get("name", "") for item in property_value.get("multi_select", [])]
        joined = ", ".join(name for name in names if name)
        return _clean_text(joined)
    return None


class ContactSyncService:
    def __init__(
        self,
        notion: NotionClientAdapter,
        contacts_database_id: str,
        property_map: dict[str, str],
    ):
        self.notion = notion
        self.contacts_database_id = contacts_database_id
        self.property_map = property_map
        self.schema = notion.fetch_database_schema(contacts_database_id).get("properties", {})

    def load_existing_contacts(self) -> list[ExistingContact]:
        pages = self.notion.query_database_all(self.contacts_database_id)
        contacts: list[ExistingContact] = []
        for page in pages:
            props = page.get("properties", {})
            contacts.append(
                ExistingContact(
                    page_id=page["id"],
                    name=_extract_property_text(props.get(self.property_map["name"], {})),
                    email=_extract_property_text(props.get(self.property_map["email"], {})),
                    role=_extract_property_text(props.get(self.property_map["role"], {})),
                    company=_extract_property_text(props.get(self.property_map["company"], {})),
                )
            )
        return contacts

    def fetch_page_text(self, page_id: str) -> str:
        chunks: list[str] = []

        def walk(block_id: str) -> None:
            cursor: str | None = None
            while True:
                response = self.notion.list_block_children(block_id, cursor)
                for block in response.get("results", []):
                    block_type = block.get("type")
                    block_payload = block.get(block_type, {}) if block_type else {}
                    if isinstance(block_payload, dict):
                        text = _plain_text_from_rich_text(block_payload.get("rich_text", []))
                        if text:
                            chunks.append(text)
                    if block.get("has_children"):
                        walk(block["id"])
                if not response.get("has_more"):
                    break
                cursor = response.get("next_cursor")

        walk(page_id)
        return "\n".join(chunks)

    def _build_property_value(self, property_name: str, value: Any) -> dict[str, Any] | None:
        schema = self.schema.get(property_name)
        if not schema:
            return None
        prop_type = schema.get("type")

        if value is None:
            return None

        if prop_type == "title":
            return {"title": [{"type": "text", "text": {"content": str(value)}}]}
        if prop_type == "rich_text":
            return {"rich_text": [{"type": "text", "text": {"content": str(value)}}]}
        if prop_type == "email":
            return {"email": str(value)}
        if prop_type == "select":
            return {"select": {"name": str(value)}}
        if prop_type == "multi_select":
            if not isinstance(value, list):
                value = [value]
            names = [{"name": str(item)} for item in value if str(item).strip()]
            return {"multi_select": names}
        if prop_type == "date":
            return {"date": {"start": str(value)}}
        if prop_type == "relation":
            if not isinstance(value, list):
                value = [value]
            refs = [{"id": extract_notion_id(str(item))} for item in value]
            return {"relation": refs}

        return None

    def _canonical_to_notion_properties(
        self,
        canonical_updates: dict[str, Any],
        source_page_id: str | None,
        tags: list[str] | None,
        is_new: bool,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}

        canonical_map = {
            "Name": self.property_map["name"],
            "Email": self.property_map["email"],
            "Company/Org": self.property_map["company"],
            "Role": self.property_map["role"],
            "First Seen": self.property_map["first_seen"],
            "Last Seen": self.property_map["last_seen"],
        }

        for canonical_name, value in canonical_updates.items():
            property_name = canonical_map.get(canonical_name)
            if not property_name:
                continue
            built = self._build_property_value(property_name, value)
            if built is not None:
                payload[property_name] = built

        if is_new and tags:
            built_tags = self._build_property_value(self.property_map["tags"], tags)
            if built_tags is not None:
                payload[self.property_map["tags"]] = built_tags

        if source_page_id:
            source_property = self.property_map["source"]
            source_schema = self.schema.get(source_property, {})
            if source_schema.get("type") == "relation":
                built_source = self._build_property_value(source_property, [source_page_id])
            else:
                built_source = self._build_property_value(source_property, source_page_id)
            if built_source is not None:
                payload[source_property] = built_source

        return payload

    def upsert_contacts(
        self,
        extracted_contacts: list[IncomingContact],
        source_page_id: str | None,
        tags: list[str] | None,
        seen_on: date,
    ) -> dict[str, int]:
        existing = self.load_existing_contacts()
        created = 0
        updated = 0
        skipped = 0

        for incoming in extracted_contacts:
            if not incoming.name and not incoming.email:
                skipped += 1
                continue

            match = dedupe_contact(incoming, existing)
            if match:
                canonical_updates = merge_contact_fields(match, incoming, seen_on)
                notion_payload = self._canonical_to_notion_properties(
                    canonical_updates,
                    source_page_id,
                    tags,
                    is_new=False,
                )
                if notion_payload:
                    self.notion.update_page(match.page_id, notion_payload)
                match.email = match.email or incoming.email
                match.name = match.name or incoming.name
                match.role = match.role or incoming.role
                match.company = match.company or incoming.company
                updated += 1
                continue

            canonical_new = {
                "Name": incoming.name,
                "Email": incoming.email,
                "Company/Org": incoming.company,
                "Role": incoming.role,
                "First Seen": seen_on.isoformat(),
                "Last Seen": seen_on.isoformat(),
            }
            notion_payload = self._canonical_to_notion_properties(
                canonical_new,
                source_page_id,
                tags,
                is_new=True,
            )
            page = self.notion.create_page(self.contacts_database_id, notion_payload)
            existing.append(
                ExistingContact(
                    page_id=page["id"],
                    name=incoming.name,
                    email=incoming.email,
                    role=incoming.role,
                    company=incoming.company,
                )
            )
            created += 1

        return {
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "total_extracted": len(extracted_contacts),
        }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract contacts from meeting notes and upsert into a Notion contacts database."
    )
    parser.add_argument("--page-url", help="Notion meeting page URL")
    parser.add_argument("--page-id", help="Notion meeting page ID")
    parser.add_argument("--text", help="Raw meeting text")
    parser.add_argument("--text-file", help="Path to a text file with meeting notes")
    parser.add_argument("--openai-model", default=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"))
    parser.add_argument("--seen-on", help="Date for First Seen/Last Seen (YYYY-MM-DD). Defaults to today UTC.")
    parser.add_argument("--tags", nargs="*", default=[], help="Tags for new contacts (multi-select).")
    parser.add_argument(
        "--write-summary",
        action="store_true",
        help="Append processing summary to the source meeting page",
    )
    parser.add_argument("--notion-token", default=os.environ.get("NOTION_TOKEN"))
    parser.add_argument(
        "--contacts-database-id",
        default=os.environ.get("NOTION_CONTACTS_DATABASE_ID"),
    )

    parser.add_argument("--prop-name", default="Name")
    parser.add_argument("--prop-email", default="Email")
    parser.add_argument("--prop-company", default="Company/Org")
    parser.add_argument("--prop-role", default="Role")
    parser.add_argument("--prop-source", default="Source")
    parser.add_argument("--prop-first-seen", default="First Seen")
    parser.add_argument("--prop-last-seen", default="Last Seen")
    parser.add_argument("--prop-tags", default="Tags")

    return parser


def _resolve_text_input(args: argparse.Namespace, service: ContactSyncService | None) -> tuple[str, str | None]:
    if args.text:
        return args.text, None
    if args.text_file:
        with open(args.text_file, "r", encoding="utf-8") as fh:
            return fh.read(), None

    source_page_id: str | None = None
    if args.page_id:
        source_page_id = extract_notion_id(args.page_id)
    elif args.page_url:
        source_page_id = extract_notion_id(args.page_url)

    if source_page_id and service:
        return service.fetch_page_text(source_page_id), source_page_id

    raise ValueError(
        "You must provide one of: --text, --text-file, --page-url, or --page-id"
    )


def _format_summary(
    source_page_id: str | None,
    result: dict[str, int],
    extracted: list[IncomingContact],
) -> str:
    lines = [
        "Contact processing summary",
        f"- Source page: {source_page_id or 'text input'}",
        f"- Contacts extracted: {result['total_extracted']}",
        f"- Created: {result['created']}",
        f"- Updated: {result['updated']}",
        f"- Skipped: {result['skipped']}",
        "- Extracted tuples:",
    ]
    for item in extracted:
        lines.append(
            f"  - name={item.name or 'unknown'}, email={item.email or 'unknown'}, role={item.role or 'unknown'}, company={item.company or 'unknown'}"
        )
    return "\n".join(lines)


def run_cli() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if not args.notion_token:
        raise RuntimeError("Missing Notion token. Set NOTION_TOKEN or pass --notion-token")
    if not args.contacts_database_id:
        raise RuntimeError(
            "Missing contacts database ID. Set NOTION_CONTACTS_DATABASE_ID or pass --contacts-database-id"
        )

    property_map = {
        "name": args.prop_name,
        "email": args.prop_email,
        "company": args.prop_company,
        "role": args.prop_role,
        "source": args.prop_source,
        "first_seen": args.prop_first_seen,
        "last_seen": args.prop_last_seen,
        "tags": args.prop_tags,
    }

    notion = NotionClientAdapter(args.notion_token)
    service = ContactSyncService(notion, args.contacts_database_id, property_map)
    meeting_text, source_page_id = _resolve_text_input(args, service)

    seen_on = (
        datetime.strptime(args.seen_on, "%Y-%m-%d").date()
        if args.seen_on
        else datetime.now(UTC).date()
    )

    known_contacts = service.load_existing_contacts()
    extracted = extract_contacts_with_openai(
        meeting_text=meeting_text,
        known_contacts=known_contacts,
        model=args.openai_model,
    )
    result = service.upsert_contacts(
        extracted_contacts=extracted,
        source_page_id=source_page_id,
        tags=args.tags,
        seen_on=seen_on,
    )

    summary = _format_summary(source_page_id, result, extracted)
    print(summary)

    if args.write_summary and source_page_id:
        notion.append_blocks(
            source_page_id,
            children=[
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {"content": summary[:1900]},
                            }
                        ]
                    },
                }
            ],
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(run_cli())
