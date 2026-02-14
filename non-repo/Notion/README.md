# Notion Contact Extractor

Python script that parses meeting notes/transcripts, extracts contacts with an LLM, and upserts rows into a Notion contacts database with deduplication.

## What it does

- Reads meeting text from:
  - a Notion page (`--page-url` or `--page-id`), or
  - direct text (`--text`) / local file (`--text-file`)
- Extracts `{name, email, role, company}` tuples with OpenAI
- Deduplicates against existing contacts:
  - exact email match (case-insensitive)
  - fuzzy name match (with company boost)
- Upserts into a Notion contacts database:
  - match -> update `Last Seen` and fill missing fields
  - no match -> create new row with `First Seen` + `Last Seen`
- Optional summary logging back to the source meeting page (`--write-summary`)

## Contacts database schema

Default property names expected:

- `Name` (title)
- `Email` (email)
- `Company/Org` (rich_text or select)
- `Role` (rich_text or select)
- `Source` (relation or rich_text)
- `First Seen` (date)
- `Last Seen` (date)
- `Tags` (multi_select)

You can override any property name via CLI flags.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set environment variables:

```bash
export NOTION_TOKEN="secret_..."
export NOTION_CONTACTS_DATABASE_ID="..."
export OPENAI_API_KEY="sk-..."
# optional:
export OPENAI_MODEL="gpt-4.1-mini"
```

## Manual mode (start here)

Process a specific Notion meeting page URL:

```bash
python3 notion_contacts_sync.py \
  --page-url "https://www.notion.so/Your-Meeting-Title-..." \
  --tags external customer \
  --write-summary
```

Or process raw text:

```bash
python3 notion_contacts_sync.py --text-file ./sample_meeting.txt
```

## Notes

- Partial contacts are supported (for example, `"Al from ClearSol"`).
- The script feeds known contacts from Notion into the extraction prompt for ambiguity resolution.
- Content is sent to your configured LLM provider (OpenAI API).

## Tests

```bash
python3 -m unittest discover -s tests -q
```

