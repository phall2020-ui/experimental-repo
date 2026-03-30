# Notion Database Setup Guide

Follow these steps to set up your Notion workspace for the ticketing system.

## Step 1: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Name it "Ticketing System"
4. Select your workspace
5. Click **Submit**
6. Copy the **Internal Integration Token** (starts with `secret_`)

## Step 2: Create Databases

Create these databases in your Notion workspace. For each database, share it with your integration (click "..." → "Connections" → add your integration).

### 2.1 Sites Database

| Property | Type | Notes |
|----------|------|-------|
| Name | Title | Primary field |
| Location | Text | Optional |

### 2.2 Users Database

| Property | Type | Notes |
|----------|------|-------|
| Email | Title | Primary field (used for lookup) |
| Name | Text | Display name |
| Role | Select | Options: `ADMIN`, `USER` |
| Password Hash | Text | For auth (leave empty for shared token) |

### 2.3 Issue Types Database

| Property | Type | Notes |
|----------|------|-------|
| Key | Title | Unique identifier (e.g., "maintenance") |
| Label | Text | Display name |
| Active | Checkbox | Default: checked |

### 2.4 Tickets Database

| Property | Type | Notes |
|----------|------|-------|
| ID | Title | Ticket ID (e.g., "SITE-001") |
| Site | Relation | → Sites database |
| Type | Text | Issue type key |
| Description | Text | Short description |
| Status | Select | `AWAITING_RESPONSE`, `ADE_TO_RESPOND`, `ON_HOLD`, `CLOSED` |
| Priority | Select | `P1`, `P2`, `P3`, `P4` |
| Details | Text | Long description |
| Assigned User | Relation | → Users database |
| Due Date | Date | Optional |
| Custom Fields | Text | JSON string |
| Created At | Created time | Auto |
| Updated At | Last edited time | Auto |

### 2.5 Comments Database

| Property | Type | Notes |
|----------|------|-------|
| ID | Title | Auto-generated UUID |
| Ticket | Relation | → Tickets database |
| Body | Text | Comment content |
| Visibility | Select | `PUBLIC`, `INTERNAL` |
| Author | Relation | → Users database |
| Created At | Created time | Auto |

### 2.6 Notifications Database

| Property | Type | Notes |
|----------|------|-------|
| Title | Title | Notification title |
| Message | Text | Notification body |
| Type | Select | `TICKET_CREATED`, `TICKET_UPDATED`, etc. |
| User | Relation | → Users database |
| Ticket | Relation | → Tickets database |
| Is Read | Checkbox | Default: unchecked |
| Created At | Created time | Auto |

### 2.7 Ticket History Database

| Property | Type | Notes |
|----------|------|-------|
| ID | Title | Auto-generated UUID |
| Ticket | Relation | → Tickets database |
| Changes | Rich Text | JSON format of changes |
| At | Date | Timestamp of change |

### 2.8 Attachments Database

| Property | Type | Notes |
|----------|------|-------|
| Filename | Title | Original filename |
| Ticket | Relation | → Tickets database |
| Storage URL | URL | URL to the stored file (e.g., S3) |
| Size | Number | File size in bytes |
| Content Type | Rich Text | MIME type of the file |

### 2.9 Templates Database

| Property | Type | Notes |
|----------|------|-------|
| Name | Title | Template name |
| Issue Type | Rich Text | Key of the issue type |
| Description | Rich Text | Template description |
| Details | Rich Text | Template details |
| Priority | Select | P1, P2, P3, P4 |
| Status | Select | Template default status |
| Assigned User | Relation | → Users database |
| Custom Fields | Rich Text | JSON format of custom fields |
| Is Recurring | Checkbox | Whether this is a recurring template |
| Frequency | Select | DAILY, WEEKLY, etc. |
| Interval Value | Number | Frequency interval |
| Lead Time Days | Number | Generation lead time |

## Step 3: Get Database IDs

For each database:
1. Open the database as a full page
2. Copy the URL: `https://notion.so/your-workspace/DATABASE_ID?v=...`
3. The DATABASE_ID is the 32-character string before the `?`

## Step 4: Configure Environment

Create/update `.env` in the project root:

```env
# Notion Configuration
VITE_NOTION_TOKEN=secret_your_integration_token
VITE_NOTION_SITES_DB=your_sites_database_id
VITE_NOTION_USERS_DB=your_users_database_id
VITE_NOTION_TYPES_DB=your_issue_types_database_id
VITE_NOTION_TICKETS_DB=your_tickets_database_id
VITE_NOTION_COMMENTS_DB=your_comments_database_id
VITE_NOTION_NOTIFICATIONS_DB=your_notifications_database_id
VITE_NOTION_RECURRING_DB=your_recurring_db_id
VITE_NOTION_HISTORY_DB=your_history_db_id
VITE_NOTION_TEMPLATES_DB=your_templates_db_id
```

## Step 5: Seed Initial Data

Add at least one entry to each database:
- 1 Site (e.g., "Main Office")
- 1 User (your admin account)
- Issue Types: "maintenance", "bug", "feature", "general"

## Notion API Limitations

- **Rate limits**: ~3 requests/second average
- **No complex joins**: Relations are basic
- **File handling**: External URLs expire; use external storage for attachments
