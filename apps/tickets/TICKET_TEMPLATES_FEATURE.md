# Ticket Templates Feature

## Overview
Save tickets and recurring tickets as reusable templates to speed up ticket creation with predefined settings.

## Features

### 1. Save Ticket as Template
- **Location:** Ticket View page (when viewing any ticket)
- **Button:** "💾 Save as Template" (next to Back button)
- **What Gets Saved:**
  - Issue Type
  - Description
  - Details
  - Priority
  - Status
  - Assigned User
  - Custom Fields
  - Recurring Settings (if enabled):
    - Frequency
    - Interval Value
    - Lead Time Days

### 2. What Does NOT Get Saved
- Site (left blank for user to select)
- Start Date / Due Date (left blank)
- Ticket ID
- Created/Updated timestamps
- Comments
- Attachments
- History

### 3. Use Template When Creating Ticket
- **Location:** Create Ticket modal
- **Dropdown:** "Use Template (Optional)" at the top of the form
- **Behavior:**
  - Select a template from dropdown
  - Form auto-fills with template values
  - User can still modify any field
  - User must select Site (required)
  - Dates remain blank for user to set

## Database Schema

### New Model: TicketTemplate
```prisma
model TicketTemplate {
  id              String         @id @default(uuid())
  tenantId        String
  name            String
  typeKey         String
  description     String
  details         String?
  priority        TicketPriority
  status          TicketStatus
  assignedUserId  String?
  customFields    Json           @default("{}")
  
  // Recurring fields (if template is for recurring ticket)
  isRecurring     Boolean        @default(false)
  frequency       RecurrenceFrequency?
  intervalValue   Int?
  leadTimeDays    Int?
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdBy       String?
  
  tenant          Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, name])
}
```

## Backend API

### Endpoints

#### Create Template
```
POST /templates
Body: {
  name: string
  typeKey: string
  description: string
  details?: string
  priority: string
  status: string
  assignedUserId?: string
  customFields: object
  isRecurring: boolean
  frequency?: string
  intervalValue?: number
  leadTimeDays?: number
}
```

#### List Templates
```
GET /templates
Response: TicketTemplate[]
```

#### Get Template
```
GET /templates/:id
Response: TicketTemplate
```

#### Delete Template
```
DELETE /templates/:id
Response: { success: true }
```

### Files Created
- `src/templates/templates.controller.ts`
- `src/templates/templates.service.ts`
- `src/templates/templates.module.ts`

## Frontend Implementation

### Files Modified
- `src/views/TicketView.tsx` - Added "Save as Template" button and dialog
- `src/components/CreateTicket.tsx` - Added template dropdown

### Files Created
- `src/lib/templates.ts` - API client functions

### UI Components

#### Save Template Dialog
- Modal popup with template name input
- Shows what will be saved
- Indicates if recurring settings included
- Cancel and Save buttons

#### Template Dropdown
- Appears at top of Create Ticket form
- Shows all available templates
- "-- None --" option to clear selection
- Auto-fills form when template selected

## User Workflow

### Creating a Template
1. Open any ticket
2. Click "💾 Save as Template" button
3. Enter template name
4. Click "Save Template"
5. Template is saved and can be reused

### Using a Template
1. Click "Create Ticket" button
2. Select template from "Use Template" dropdown
3. Form auto-fills with template values
4. Select Site (required)
5. Modify any fields as needed
6. Submit ticket

## Benefits

1. **Speed:** Quickly create similar tickets
2. **Consistency:** Standardize ticket creation
3. **Efficiency:** Reduce repetitive data entry
4. **Recurring Support:** Save recurring ticket configurations
5. **Flexibility:** Templates are starting points, not rigid forms

## Database Migration Required

After deployment, run:
```bash
npx prisma migrate deploy
```

Or create migration:
```bash
npx prisma migrate dev --name add_ticket_templates
```

## Testing Checklist

- [ ] Save regular ticket as template
- [ ] Save recurring ticket as template
- [ ] List templates in Create Ticket dropdown
- [ ] Select template and verify form auto-fills
- [ ] Modify template values and create ticket
- [ ] Create ticket without template
- [ ] Delete template
- [ ] Verify templates are tenant-isolated
- [ ] Test with custom fields
- [ ] Test with different priorities/statuses

## Future Enhancements

- Template management page (edit, delete, organize)
- Template categories/tags
- Share templates across tenants (admin feature)
- Template usage analytics
- Default templates for new tenants
- Template versioning
