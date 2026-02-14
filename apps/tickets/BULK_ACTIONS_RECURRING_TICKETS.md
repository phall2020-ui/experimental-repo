# Bulk Actions for Recurring Tickets (Future Activities)

## Overview
Added comprehensive bulk operations for recurring tickets with grouping/rollup functionality, matching the capabilities available for regular tickets on the dashboard.

## Features Implemented

### 1. Bulk Selection
- **Checkbox column** in recurring tickets table
- **Select all** checkbox in header
- **Individual selection** per recurring ticket
- **Selection counter** shows number of selected items

### 2. Bulk Actions Available
All actions work on multiple selected recurring tickets:

#### 📁 Group/Rollup
- Assign a group name to multiple recurring tickets
- Groups displayed as colored badges in table
- Useful for organizing related recurring activities
- Example: "Monthly Maintenance", "Quarterly Reviews", etc.

#### 🔄 Change Status
- Activate or deactivate multiple recurring tickets at once
- Options: Active / Inactive

#### ⚡ Change Priority
- Update priority for multiple recurring tickets
- Options: P1 (Critical), P2 (High), P3 (Medium), P4 (Low)

#### 👤 Assign User
- Assign a user to multiple recurring tickets
- Dropdown shows all available users

#### 🗑️ Delete
- Delete multiple recurring tickets at once
- Confirmation dialog to prevent accidents

### 3. UI Improvements

#### Bulk Actions Bar
- **Fixed bottom bar** appears when items are selected
- Shows selection count
- Quick access to all bulk actions
- Close button to deselect all

#### Group Name Column
- New column in table showing group assignments
- Colored badge display for grouped items
- Shows "—" for ungrouped items

#### Dialogs
- Clean modal dialogs for each action
- Input validation
- Clear cancel/confirm buttons
- Contextual help text

### 4. Button Rename
- **"Future Activities"** → **"Future Recurring Activities"**
- Updated in both Dashboard and RecurringTickets page
- More descriptive and accurate

### 5. Auto-Refresh
- Dashboard automatically refreshes when:
  - New ticket created
  - Ticket updated via bulk actions
  - Ticket deleted via bulk actions
- Recurring tickets list also refreshes
- Keeps both views in sync

### 6. Create Ticket Behavior
- **No navigation** after creating ticket
- Modal simply closes
- Dashboard refreshes automatically
- Smoother user experience

## Database Schema Changes

### RecurringTicket Model
Added `groupName` field:
```prisma
model RecurringTicket {
  // ... existing fields
  groupName String?
  // ... rest of fields
  
  @@index([tenantId, groupName])
}
```

## Backend API

### New Endpoints

#### Bulk Update
```
PATCH /recurring-tickets/bulk-update
Body: {
  ids: string[]
  updates: {
    siteId?: string
    typeKey?: string
    description?: string
    priority?: string
    details?: string
    assignedUserId?: string
    frequency?: string
    intervalValue?: number
    leadTimeDays?: number
    isActive?: boolean
  }
}
Response: { updated: number }
```

#### Bulk Delete
```
DELETE /recurring-tickets/bulk-delete
Body: { ids: string[] }
Response: { deleted: number }
```

#### Bulk Group
```
PATCH /recurring-tickets/bulk-group
Body: {
  ids: string[]
  groupName: string
}
Response: { grouped: number, groupName: string }
```

### Permissions
All bulk operations require one of:
- `AssetManager` role
- `OandM` role
- `ADMIN` role

## Frontend Implementation

### Files Modified
- `src/components/RecurringTickets.tsx` - Added bulk actions UI
- `src/lib/api.ts` - Added bulk operation API functions
- `src/views/Dashboard.tsx` - Auto-refresh and button rename
- `src/components/CreateTicket.tsx` - Removed navigation after create

### Files Modified (Backend)
- `src/recurring-tickets/recurring-tickets.controller.ts` - Bulk endpoints
- `src/recurring-tickets/recurring-tickets.service.ts` - Bulk logic
- `src/recurring-tickets/dto/update-recurring-ticket.dto.ts` - Added fields
- `prisma/schema.prisma` - Added groupName field

## User Workflow

### Grouping Recurring Tickets
1. Go to "Future Recurring Activities"
2. Select multiple recurring tickets (checkboxes)
3. Click "📁 Group" in bottom bar
4. Enter group name (e.g., "Monthly Maintenance")
5. Click "Group"
6. Group badge appears in table

### Bulk Status Change
1. Select recurring tickets
2. Click "🔄 Change Status"
3. Choose Active or Inactive
4. Click "Update"
5. All selected tickets updated

### Bulk Priority Change
1. Select recurring tickets
2. Click "⚡ Change Priority"
3. Choose priority level
4. Click "Update"

### Bulk Assignment
1. Select recurring tickets
2. Click "👤 Assign"
3. Select user from dropdown
4. Click "Assign"

### Bulk Delete
1. Select recurring tickets
2. Click "🗑️ Delete"
3. Confirm deletion
4. Tickets permanently deleted

## Benefits

1. **Efficiency**: Update multiple recurring tickets at once
2. **Organization**: Group related activities together
3. **Consistency**: Apply same settings to multiple items
4. **Time Saving**: No need to edit each recurring ticket individually
5. **Better UX**: Smooth workflow without page navigation
6. **Auto-Sync**: Dashboard and recurring tickets stay in sync

## Database Migration Required

After deployment, run:
```bash
npx prisma migrate deploy
```

Or create migration:
```bash
npx prisma migrate dev --name add_recurring_ticket_grouping
```

Or run SQL manually in Neon:
```sql
ALTER TABLE "RecurringTicket" ADD COLUMN "groupName" TEXT;
CREATE INDEX "RecurringTicket_tenantId_groupName_idx" ON "RecurringTicket"("tenantId", "groupName");
```

## Testing Checklist

- [ ] Select individual recurring tickets
- [ ] Select all recurring tickets
- [ ] Group multiple tickets with custom name
- [ ] Change status (activate/deactivate) in bulk
- [ ] Change priority in bulk
- [ ] Assign user in bulk
- [ ] Delete multiple tickets with confirmation
- [ ] Verify group badges display correctly
- [ ] Create new ticket and verify no navigation
- [ ] Verify dashboard auto-refreshes
- [ ] Verify recurring list auto-refreshes
- [ ] Test with different user roles

## Future Enhancements

- Bulk edit recurring settings (frequency, interval)
- Bulk duplicate recurring tickets
- Export selected recurring tickets
- Filter by group name
- Group management page
- Bulk template creation from recurring tickets
