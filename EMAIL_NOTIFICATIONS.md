# Email Notifications Feature

This document describes the email notification feature that allows users to receive email alerts for various ticket activities.

## Overview

The ticketing system now supports email notifications for key events. Users can configure their email notification preferences to choose which types of notifications they want to receive via email.

## Features

### Automatic Welcome Email
- When an admin creates a new user account, a welcome email is automatically sent to the user
- The welcome email includes:
  - User's email address
  - Temporary password
  - Instructions to change password upon first login

### Configurable Email Notifications
Users can enable/disable email notifications for the following events:
- **Ticket Created**: Receive an email when a new ticket is created
- **Ticket Updated**: Receive an email when a ticket is updated
- **Ticket Assigned**: Receive an email when a ticket is assigned to you
- **Ticket Commented**: Receive an email when someone comments on a ticket
- **Ticket Resolved**: Receive an email when a ticket is resolved

## Configuration

### Backend Environment Variables

To enable email functionality, configure the following environment variables in your backend `.env` file:

```env
SMTP_HOST=smtp.example.com       # SMTP server hostname
SMTP_PORT=587                     # SMTP server port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@example.com # SMTP username/email
SMTP_PASS=your-password          # SMTP password
SMTP_FROM=noreply@example.com    # From address for emails
```

**Note**: If these variables are not configured, the system will still function normally but emails will not be sent. A warning will be logged indicating email service is disabled.

### Common SMTP Providers

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-gmail@gmail.com
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=verified-sender@yourdomain.com
```

## User Interface

### Managing Email Preferences

Users can manage their email notification preferences from their profile page:

1. Navigate to the User Profile page
2. Scroll to the "Email Notifications" section
3. Check or uncheck the notification types you want to receive
4. Click "Save Email Preferences" to apply changes

### Admin User Management

Administrators can view user email notification preferences in the User Registration/Management modal:
1. Click on "Register New User" (admin only)
2. View the list of existing users with their preferences
3. Edit user details as needed

## Database Schema

The email notification preferences are stored in the `User` table with a new `emailNotifications` JSONB field:

```sql
ALTER TABLE "User" ADD COLUMN "emailNotifications" JSONB NOT NULL 
DEFAULT '{"ticketCreated":true,"ticketUpdated":true,"ticketAssigned":true,"ticketCommented":true,"ticketResolved":true}';
```

Default values (all enabled):
```json
{
  "ticketCreated": true,
  "ticketUpdated": true,
  "ticketAssigned": true,
  "ticketCommented": true,
  "ticketResolved": true
}
```

## API Endpoints

### Update Email Notification Preferences (User)
```
PATCH /users/profile/email-notifications
Authorization: Bearer <token>

Body:
{
  "emailNotifications": {
    "ticketCreated": true,
    "ticketUpdated": false,
    "ticketAssigned": true,
    "ticketCommented": true,
    "ticketResolved": false
  }
}
```

### Update Email Notification Preferences (Admin)
```
PATCH /users/:id/email-notifications
Authorization: Bearer <admin-token>

Body:
{
  "emailNotifications": {
    "ticketCreated": true,
    "ticketUpdated": false,
    "ticketAssigned": true,
    "ticketCommented": true,
    "ticketResolved": false
  }
}
```

### Get User List (includes email preferences)
```
GET /directory/users
Authorization: Bearer <token>

Response includes emailNotifications field for each user
```

## Technical Implementation

### Backend Components

1. **Email Service** (`src/email/email.service.ts`)
   - Handles SMTP configuration and email sending
   - Provides methods for sending different types of emails
   - Automatically disabled if SMTP config is missing

2. **Auth Service Updates** (`src/auth/auth.service.ts`)
   - Sends welcome email when new user is registered
   - Provides API for updating email notification preferences

3. **Notifications Service Updates** (`src/notifications/notifications.service.ts`)
   - Checks user preferences before sending email notifications
   - Integrates with email service to send notifications

### Frontend Components

1. **User Profile** (`src/views/UserProfile.tsx`)
   - Displays email notification checkboxes
   - Allows users to update their preferences
   - Saves preferences to backend

2. **User Management** (`src/components/UserRegistration.tsx`)
   - Shows email notification info for users (admin view)

## Migration

The migration file `20251112211500_add_user_email_notification_preferences/migration.sql` adds the `emailNotifications` field to existing users with all notifications enabled by default.

To apply the migration:
```bash
cd ticketing-suite/ticketing
npm run prisma:deploy
```

## Troubleshooting

### Emails Not Being Sent

1. **Check SMTP Configuration**: Verify all SMTP environment variables are set correctly
2. **Check Logs**: Look for email-related log messages in the backend console
3. **Test SMTP Connection**: Use a tool like `telnet` or `openssl s_client` to verify SMTP server connectivity
4. **Check Spam Folder**: Emails might be filtered as spam

### User Preferences Not Saving

1. **Check Authorization**: Ensure the user is logged in with a valid token
2. **Check Network**: Verify the API request is reaching the backend
3. **Check Console**: Look for error messages in browser console

## Security Considerations

1. **Password in Email**: The welcome email contains the user's temporary password in plain text. Users should be encouraged to change their password immediately.
2. **Email Content**: All email content is generated server-side to prevent injection attacks.
3. **SMTP Credentials**: SMTP credentials should be stored securely in environment variables, never in code.

## Future Enhancements

Possible improvements for future versions:
- HTML email templates with branding
- Email digest options (daily/weekly summary)
- More granular notification options
- Email verification on registration
- Two-factor authentication via email
- Custom email templates per tenant
