# Recurring Tickets & Notifications Feature

## Overview

This feature adds the ability to create recurring tickets and a notification system to keep users informed of ticket updates.

## Features

### 1. Recurring Tickets

Recurring tickets allow you to automatically generate tickets on a schedule.

**Key Features:**
- **Frequency Options**: Daily, Weekly, Monthly, Quarterly, Yearly
- **Interval Control**: Set how often the ticket recurs (e.g., every 2 weeks, every 3 months)
- **Lead Time**: Create tickets X days before the scheduled date
- **Start/End Dates**: Define when the recurring schedule begins and optionally ends
- **Active/Inactive Toggle**: Pause and resume recurring tickets
- **Full Ticket Configuration**: Set priority, description, site, type, and custom fields

**API Endpoints:**
- `POST /recurring-tickets` - Create a new recurring ticket
- `GET /recurring-tickets` - List all recurring tickets
- `GET /recurring-tickets/:id` - Get a specific recurring ticket
- `PATCH /recurring-tickets/:id` - Update a recurring ticket
- `DELETE /recurring-tickets/:id` - Delete a recurring ticket
- `POST /recurring-tickets/process` - Manually trigger processing (admin only)

**Example Request:**
```json
{
  "siteId": "site-123",
  "typeKey": "MAINTENANCE",
  "description": "Monthly equipment inspection",
  "priority": "P2",
  "frequency": "MONTHLY",
  "intervalValue": 1,
  "startDate": "2025-01-01",
  "leadTimeDays": 7,
  "details": "Inspect all critical equipment"
}
```

### 2. Notifications

Real-time notification system to keep users informed of ticket activities.

**Notification Types:**
- `TICKET_CREATED` - New ticket created
- `TICKET_UPDATED` - Ticket details changed
- `TICKET_ASSIGNED` - Ticket assigned to a user
- `TICKET_COMMENTED` - New comment added
- `TICKET_RESOLVED` - Ticket marked as resolved
- `RECURRING_TICKET_GENERATED` - Recurring ticket automatically created

**API Endpoints:**
- `GET /notifications` - Get user's notifications
- `GET /notifications/unread-count` - Get count of unread notifications
- `POST /notifications/:id/read` - Mark notification as read
- `POST /notifications/mark-all-read` - Mark all notifications as read
- `DELETE /notifications/:id` - Delete a notification

**Frontend Features:**
- Notification bell icon in header with unread count badge
- Dropdown panel showing recent notifications
- Auto-refresh every 30 seconds
- Click to mark as read
- Visual indicators for unread notifications

## Database Schema

### RecurringTicket Table
```sql
- id: UUID (primary key)
- tenantId: String
- siteId: String
- typeKey: String
- description: String
- priority: TicketPriority enum
- details: Text (optional)
- assignedUserId: String (optional)
- customFields: JSON
- frequency: RecurrenceFrequency enum
- intervalValue: Integer (default: 1)
- startDate: DateTime
- endDate: DateTime (optional)
- leadTimeDays: Integer (default: 0)
- isActive: Boolean (default: true)
- lastGeneratedAt: DateTime (optional)
- nextScheduledAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime
```

### Notification Table
```sql
- id: UUID (primary key)
- tenantId: String
- userId: String (optional)
- type: NotificationType enum
- title: String
- message: String
- ticketId: String (optional)
- metadata: JSON
- isRead: Boolean (default: false)
- createdAt: DateTime
```

## Usage

### Creating a Recurring Ticket

1. Navigate to "Recurring" in the top menu
2. Click "+ New Recurring Ticket"
3. Fill in the form:
   - Site ID and Type Key
   - Description and details
   - Priority level
   - Frequency (Daily/Weekly/Monthly/Quarterly/Yearly)
   - Interval (e.g., every 2 weeks)
   - Start date and optional end date
   - Lead time in days (how far in advance to create the ticket)
4. Click "Create Recurring Ticket"

### Managing Recurring Tickets

- **View All**: See all recurring tickets with their next scheduled dates
- **Toggle Active/Inactive**: Pause or resume a recurring schedule
- **Delete**: Remove a recurring ticket permanently

### Viewing Notifications

1. Click the bell icon (🔔) in the top right corner
2. View unread count badge
3. Click on a notification to mark it as read
4. Use "Mark all read" to clear all unread notifications

## Automated Processing

Recurring tickets are automatically processed by a background job that:
1. Checks for recurring tickets where `nextScheduledAt <= now()`
2. Generates a new ticket based on the recurring template
3. Creates a notification for the assigned user
4. Updates `lastGeneratedAt` and calculates the next `nextScheduledAt`

To manually trigger processing (admin only):
```bash
POST /recurring-tickets/process
```

## Migration

The feature includes a database migration that adds:
- `RecurringTicket` table
- `Notification` table
- `RecurrenceFrequency` enum
- `NotificationType` enum

Migration file: `20251111135200_add_recurring_tickets_and_notifications`

## Testing

Test the recurring ticket generation:
```bash
# Create a recurring ticket with a past start date and 0 lead time
POST /recurring-tickets
{
  "startDate": "2025-01-01",
  "leadTimeDays": 0,
  ...
}

# Manually trigger processing
POST /recurring-tickets/process

# Check that a ticket was created and notification sent
GET /tickets
GET /notifications
```

## Future Enhancements

- Email notifications
- Push notifications
- Notification preferences per user
- Recurring ticket templates
- Bulk operations on recurring tickets
- Calendar view of scheduled tickets
- Webhook support for external integrations
