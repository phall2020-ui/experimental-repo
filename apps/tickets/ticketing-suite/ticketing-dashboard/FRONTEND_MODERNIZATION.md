# Frontend Modernization - Documentation

## Overview

The ticketing dashboard frontend has been modernized with a consistent design system, improved state management, and enhanced accessibility. This document outlines the key changes and how to use the new system.

## Technology Stack

### Core Dependencies
- **React 18** - UI library
- **Material-UI v5** - Component library and design system
- **React Query (TanStack Query)** - Data fetching and caching
- **React Router v6** - Client-side routing
- **Emotion** - CSS-in-JS styling
- **TypeScript** - Type safety

### Key Features
- ✅ Light/Dark theme support with system preference detection
- ✅ Responsive layouts for mobile, tablet, and desktop
- ✅ Reusable UI primitive components
- ✅ Optimized data fetching with automatic caching and background refetch
- ✅ Comprehensive ARIA labels and keyboard navigation
- ✅ Loading skeletons and empty states
- ✅ Error boundaries for graceful error handling
- ✅ Icon library integration

## Design System

### Theme Configuration

The application uses Material-UI's theming system with custom tokens:

**Location:** `src/theme/theme.ts`

**Features:**
- Customized color palettes for light and dark modes
- Typography scale with Inter font family
- Spacing scale (8px base unit)
- Component-level style overrides

**Usage:**
```tsx
import { useTheme } from '@mui/material/styles'

const MyComponent = () => {
  const theme = useTheme()
  return <Box sx={{ color: theme.palette.primary.main }}>Hello</Box>
}
```

### Theme Toggle

Users can toggle between light and dark modes using the theme switcher in the app bar.

**Location:** `src/theme/ThemeProvider.tsx`

**Hook:**
```tsx
import { useThemeMode } from '../theme/ThemeProvider'

const MyComponent = () => {
  const { mode, toggleTheme } = useThemeMode()
  return <Button onClick={toggleTheme}>Toggle Theme</Button>
}
```

## State Management

### React Query Setup

**Location:** `src/lib/queryClient.ts`

**Configuration:**
- 5-minute stale time for queries
- 10-minute garbage collection time
- Automatic refetch on window focus and reconnect
- Single retry for failed queries

### API Hooks

**Location:** `src/lib/hooks.ts`

All API calls have been wrapped in React Query hooks for efficient data fetching:

**Tickets:**
```tsx
import { useTickets, useTicket, useUpdateTicket, useCreateTicket } from '../lib/hooks'

// List tickets with filters
const { data: tickets, isLoading, refetch } = useTickets({ status: 'NEW' })

// Get single ticket
const { data: ticket } = useTicket(ticketId)

// Update ticket
const updateTicket = useUpdateTicket()
await updateTicket.mutateAsync({ id, patch: { status: 'RESOLVED' } })

// Create ticket
const createTicket = useCreateTicket()
await createTicket.mutateAsync(ticketData)
```

**Health:**
```tsx
import { useHealth, useHealthDb, useHealthRedis } from '../lib/hooks'

// Automatically refetches every 30 seconds
const { data: health } = useHealth()
```

## UI Components

### Reusable Primitives

**Location:** `src/components/ui/`

#### Skeleton
Loading placeholder component:
```tsx
import { Skeleton } from '../components/ui'

<Skeleton variant="table" rows={5} />
<Skeleton variant="card" rows={3} />
<Skeleton variant="form" rows={4} />
```

#### EmptyState
Display when no data is available:
```tsx
import { EmptyState } from '../components/ui'

<EmptyState
  icon="search"
  title="No tickets found"
  description="Try adjusting your filters"
  action={{
    label: 'Create Ticket',
    onClick: () => setShowCreate(true)
  }}
/>
```

#### UserAvatar
Display user initials or icon:
```tsx
import { UserAvatar } from '../components/ui'

<UserAvatar name="John Doe" email="john@example.com" size={32} showTooltip />
```

#### PriorityBadge & StatusChip
Display ticket priority and status:
```tsx
import { PriorityBadge, StatusChip } from '../components/ui'

<PriorityBadge priority="P1" />
<StatusChip status="IN_PROGRESS" />
```

## Error Handling

### Error Boundary

**Location:** `src/components/ErrorBoundary.tsx`

Catches React errors and displays a user-friendly error page with:
- Error message and stack trace (in development)
- "Try Again" button to reset the component
- "Reload Page" button for critical errors

Automatically integrated in `main.tsx`.

## Accessibility (WCAG 2.2 AA)

### Implemented Features

#### Keyboard Navigation
- All interactive elements are keyboard accessible
- Table sorting with TableSortLabel
- Form inputs with proper tab order
- Modal dialogs trap focus

#### ARIA Labels
- All buttons have descriptive `aria-label` attributes
- Form inputs have associated labels
- Icon buttons have tooltips and ARIA labels
- Status indicators use `role="status"` and `aria-live`

#### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Form field associations
- Alert announcements for notifications

### Testing Recommendations

1. **Keyboard Navigation Test:**
   - Navigate using Tab, Shift+Tab
   - Activate buttons with Enter/Space
   - Sort tables with keyboard

2. **Screen Reader Test:**
   - Test with NVDA (Windows) or VoiceOver (macOS)
   - Verify all interactive elements are announced
   - Check form field labels are read correctly

## Responsive Design

### Breakpoints

Material-UI breakpoints:
- `xs`: 0px (mobile)
- `sm`: 600px (tablet)
- `md`: 900px (small laptop)
- `lg`: 1200px (desktop)
- `xl`: 1536px (large desktop)

### Responsive Components

All major components adapt to screen size:
- Dashboard uses Grid layout (9/3 split on desktop, stacked on mobile)
- Tables scroll horizontally on mobile
- Filters collapse into expandable sections
- Navigation adapts to mobile layout

## Migration Guide

### Converting Old Components to Material-UI

**Before:**
```tsx
<div className="panel">
  <h1>Title</h1>
  <input type="text" placeholder="Search..." />
  <button className="primary">Submit</button>
</div>
```

**After:**
```tsx
import { Paper, Typography, TextField, Button, Stack } from '@mui/material'

<Paper sx={{ p: 2 }}>
  <Stack spacing={2}>
    <Typography variant="h6">Title</Typography>
    <TextField placeholder="Search..." />
    <Button variant="contained">Submit</Button>
  </Stack>
</Paper>
```

### Using React Query

**Before:**
```tsx
const [tickets, setTickets] = useState([])
const [loading, setLoading] = useState(false)

useEffect(() => {
  setLoading(true)
  listTickets().then(setTickets).finally(() => setLoading(false))
}, [])
```

**After:**
```tsx
const { data: tickets = [], isLoading } = useTickets()
```

## Component Status

### Completed ✅
- Dashboard
- Login
- HealthDashboard
- App Layout (with theme toggle)
- UI Primitives (Skeleton, EmptyState, UserAvatar, etc.)
- Error Boundary

### To Do 📝
- TicketView
- CreateTicket modal
- Comments component
- UserProfile
- AdvancedSearch modal
- UserRegistration modal
- Attachments component
- CustomFieldsForm component

## Performance Optimizations

### Implemented
- React Query caching reduces API calls
- Automatic background refetch keeps data fresh
- Material-UI component memoization
- Proper React.memo() and useMemo() usage

### Future Optimizations
- React Window virtualization for long ticket lists
- Code splitting with React.lazy()
- Bundle size optimization
- Image optimization

## Development Tips

### Adding New Components

1. Use Material-UI components as base
2. Add proper TypeScript types
3. Include ARIA labels
4. Test keyboard navigation
5. Test on mobile devices
6. Document usage in this file

### Styling Best Practices

1. Use `sx` prop for one-off styles:
   ```tsx
   <Box sx={{ p: 2, bgcolor: 'background.paper' }} />
   ```

2. Use theme tokens instead of hardcoded values:
   ```tsx
   // ❌ Bad
   <Box sx={{ color: '#5b9cff' }} />
   
   // ✅ Good
   <Box sx={{ color: 'primary.main' }} />
   ```

3. Use responsive syntax:
   ```tsx
   <Box sx={{ 
     display: { xs: 'block', md: 'flex' },
     p: { xs: 1, sm: 2, md: 3 }
   }} />
   ```

## Troubleshooting

### Common Issues

**Issue:** Theme not applying
- **Solution:** Ensure component is wrapped in ThemeProvider

**Issue:** React Query not caching
- **Solution:** Check queryKey is stable (use useMemo for dynamic keys)

**Issue:** Component not responsive
- **Solution:** Use Material-UI Grid and responsive sx props

**Issue:** Dark mode colors look wrong
- **Solution:** Use theme tokens, not hardcoded colors

## Resources

- [Material-UI Documentation](https://mui.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [React Accessibility](https://react.dev/learn/accessibility)
