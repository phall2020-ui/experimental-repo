# Notification Implementation - Impacted Users Only

## Overview
Updated the notification system to only notify users who are directly impacted by ticket events, reducing notification noise.

## Notification Rules

### 1. Ticket Created with Assignment
- **Who gets notified:** Assigned user only
- **Type:** `TICKET_ASSIGNED`
- **Condition:** Ticket is created with an `assignedUserId`

### 2. Ticket Assignment Changed
- **Who gets notified:** Newly assigned user only
- **Type:** `TICKET_ASSIGNED`
- **Conditions:**
  - User is assigned to the ticket
  - User is not the one making the change (actor)

### 3. Ticket Status Changed to Resolved
- **Who gets notified:** Assigned user only
- **Type:** `TICKET_RESOLVED`
- **Conditions:**
  - Ticket status changes to `RESOLVED`
  - Ticket has an assigned user
  - Assigned user is not the one making the change

### 4. Ticket Updated (General)
- **Who gets notified:** Assigned user only
- **Type:** `TICKET_UPDATED`
- **Conditions:**
  - Any field changes (except assignment)
  - Ticket has an assigned user
  - Assigned user is not the one making the change

### 5. Comment Added
- **Who gets notified:** 
  - Assigned user (if not the commenter)
  - All previous commenters (if not the current commenter)
- **Type:** `TICKET_COMMENTED`
- **Conditions:**
  - Comment visibility is `PUBLIC`
  - Recipients are not the comment author

### 6. Recurring Ticket Generated
- **Who gets notified:** Assigned user only
- **Type:** `RECURRING_TICKET_GENERATED`
- **Condition:** Recurring ticket has an `assignedUserId`

## Implementation Details

### Backend Changes

#### 1. Tickets Module (`tickets.module.ts`)
- Added `NotificationsModule` import

#### 2. Tickets Service (`tickets.service.ts`)
- Injected `NotificationsService`
- Added notification logic in `create()` method for new assignments
- Added notification logic in `applyUpdate()` method for:
  - Assignment changes
  - Status changes to resolved
  - General updates

#### 3. Comments Module (`comments.module.ts`)
- Added `NotificationsModule` import

#### 4. Comments Service (`comments.service.ts`)
- Injected `NotificationsService`
- Added notification logic in `add()` method to notify:
  - Assigned user
  - Previous commenters
- Only sends notifications for `PUBLIC` comments

#### 5. Email Service (`email.service.ts`) - NEW
- Created email service for sending notification emails
- Currently logs emails to console (ready for SMTP integration)
- Includes HTML email template builder
- Can be integrated with SendGrid, AWS SES, Mailgun, etc.

#### 6. Notifications Service (`notifications.service.ts`)
- Injected `EmailService`
- Updated `create()` method to automatically send email notifications
- Email sending is non-blocking (errors don't fail notification creation)

#### 7. Notifications Module (`notifications.module.ts`)
- Added `EmailService` provider and export

## Email Integration

The email service is ready for production integration. To enable actual email sending:

1. Install email library (e.g., nodemailer):
   ```bash
   npm install nodemailer @types/nodemailer
   ```

2. Configure environment variables:
   ```env
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-password
   EMAIL_FROM=noreply@example.com
   APP_URL=https://your-app.com
   ```

3. Uncomment and configure the email sending code in `email.service.ts`

## Testing

To test notifications:

1. **Create a ticket with assignment:**
   - Assigned user should receive notification

2. **Update ticket assignment:**
   - New assignee should receive notification
   - Previous assignee should NOT receive notification

3. **Add a comment:**
   - Assigned user should receive notification (if not the commenter)
   - Previous commenters should receive notification (if not the current commenter)

4. **Update ticket status to resolved:**
   - Assigned user should receive notification (if not the resolver)

5. **Update ticket details:**
   - Assigned user should receive notification (if not the updater)

## Benefits

1. **Reduced Noise:** Users only get notifications for tickets they're involved with
2. **No Self-Notifications:** Users don't get notified for their own actions
3. **Contextual:** Notifications are relevant to the recipient
4. **Dual Channel:** Both in-app and email notifications (when configured)
5. **Scalable:** Easy to add new notification types and conditions

## Future Enhancements

1. User notification preferences (enable/disable specific notification types)
2. Digest emails (daily/weekly summary instead of immediate)
3. Notification grouping (combine multiple updates into one notification)
4. Push notifications for mobile apps
5. Slack/Teams integration
