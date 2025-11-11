import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Checkbox,
  FormControlLabel,
  Collapse,
  Divider,
} from '@mui/material'
import { Modal } from './common'
import { useSites, useUsers, useIssueTypes, useFieldDefinitions } from '../hooks/useDirectory'
import { useCreateTicket } from '../hooks/useTickets'
import { createRecurringTicket } from '../lib/api'
import CustomFieldsForm from './CustomFieldsForm'
import { STATUS_OPTIONS, type TicketStatusValue } from '../lib/statuses'
import { filterFieldDefs, sanitizeCustomFieldValues } from '../lib/customFields'

interface CreateTicketProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateTicket({ onClose, onSuccess }: CreateTicketProps) {
  const nav = useNavigate()
  const { data: sites = [] } = useSites()
  const { data: users = [] } = useUsers()
  const { data: types = [] } = useIssueTypes()
  const { data: fieldDefs = [] } = useFieldDefinitions()
  const createTicketMutation = useCreateTicket()
  const filteredFieldDefs = React.useMemo(() => filterFieldDefs(fieldDefs), [fieldDefs])
  
const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const

type FrequencyValue = typeof FREQUENCY_OPTIONS[number]['value']

const [formData, setFormData] = React.useState({
    siteId: '',
    type: '',
    description: '',
    details: '',
    status: (STATUS_OPTIONS[0]?.value ?? 'AWAITING_RESPONSE') as TicketStatusValue,
    priority: 'P3' as const,
    assignedUserId: '',
    custom_fields: {} as Record<string, any>
  })
const [isRecurring, setIsRecurring] = React.useState(false)

const [recurringSettings, setRecurringSettings] = React.useState({
  frequency: 'MONTHLY' as FrequencyValue,
  intervalValue: 1,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  leadTimeDays: 7,
})

  React.useEffect(() => {
    if (sites.length > 0 && !formData.siteId) {
      setFormData(prev => ({ ...prev, siteId: sites[0].id }))
    }
    if (types.length > 0 && !formData.type) {
      setFormData(prev => ({ ...prev, type: types[0].key }))
    }
  }, [sites, types])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.siteId || !formData.type || !formData.description) {
      return
    }
    if (isRecurring && (!recurringSettings.startDate || recurringSettings.intervalValue < 1 || recurringSettings.leadTimeDays < 0)) {
      return
    }

    try {
      const payload: any = {
        siteId: formData.siteId,
        type: formData.type,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
      }
      if (formData.details) payload.details = formData.details
      if (formData.assignedUserId) payload.assignedUserId = formData.assignedUserId
      const sanitizedCustomFields = sanitizeCustomFieldValues(formData.custom_fields)
      if (Object.keys(sanitizedCustomFields).length > 0) {
        payload.custom_fields = sanitizedCustomFields
      }

      const ticket = await createTicketMutation.mutateAsync(payload)

      if (isRecurring) {
        try {
          await createRecurringTicket({
            siteId: formData.siteId,
            typeKey: formData.type,
            description: formData.description,
            priority: formData.priority,
            frequency: recurringSettings.frequency,
            intervalValue: recurringSettings.intervalValue,
            startDate: recurringSettings.startDate,
            endDate: recurringSettings.endDate || undefined,
            leadTimeDays: recurringSettings.leadTimeDays,
            details: formData.details || undefined,
          })
        } catch (recurringError) {
          console.error('Failed to schedule recurring ticket:', recurringError)
          alert('Ticket was created, but setting up the recurring schedule failed. Please try again later.')
        }
      }

      onSuccess?.()
      nav(`/tickets/${ticket.id}`)
    } catch (error) {
      console.error('Failed to create ticket:', error)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Create New Ticket"
      maxWidth="md"
      actions={
        <>
          <Button onClick={onClose} disabled={createTicketMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-ticket-form"
            variant="contained"
            disabled={createTicketMutation.isPending}
          >
            {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
          </Button>
        </>
      }
    >
      <Box component="form" id="create-ticket-form" onSubmit={handleSubmit}>
        {createTicketMutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to create ticket
          </Alert>
        )}

        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel id="site-label">Site</InputLabel>
              <Select
                labelId="site-label"
                value={formData.siteId}
                onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                label="Site"
                aria-label="Site"
              >
                {sites.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel id="type-label">Issue Type</InputLabel>
              <Select
                labelId="type-label"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                label="Issue Type"
                aria-label="Issue Type"
              >
                {types.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            required
            size="small"
            label="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the issue"
            inputProps={{ 'aria-label': 'Description' }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Details"
            value={formData.details}
            onChange={e => setFormData({ ...formData, details: e.target.value })}
            placeholder="Additional details..."
            inputProps={{ 'aria-label': 'Details' }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                label="Status"
                aria-label="Status"
              >
                {STATUS_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select
                labelId="priority-label"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                label="Priority"
                aria-label="Priority"
              >
                {['P1', 'P2', 'P3', 'P4'].map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel id="assigned-user-label">Assigned User</InputLabel>
            <Select
              labelId="assigned-user-label"
              value={formData.assignedUserId}
              onChange={e => setFormData({ ...formData, assignedUserId: e.target.value })}
              label="Assigned User"
              aria-label="Assigned User"
            >
              <MenuItem value="">
                <em>Unassigned</em>
              </MenuItem>
              {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>)}
            </Select>
          </FormControl>

          {filteredFieldDefs.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <CustomFieldsForm
                fieldDefs={filteredFieldDefs}
                values={formData.custom_fields}
                onChange={(custom_fields) => {
                  setFormData({ ...formData, custom_fields: sanitizeCustomFieldValues(custom_fields) })
                }}
              />
            </Box>
          )}

          <Divider sx={{ my: 1 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
              />
            }
            label="Make this a recurring ticket"
          />
          <Collapse in={isRecurring} unmountOnExit>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #d7dbe3',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="frequency-label">Frequency</InputLabel>
                  <Select
                    labelId="frequency-label"
                    value={recurringSettings.frequency}
                    label="Frequency"
                    onChange={e =>
                      setRecurringSettings(prev => ({
                        ...prev,
                        frequency: e.target.value as typeof recurringSettings.frequency,
                      }))
                    }
                  >
                    {FREQUENCY_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  label="Interval"
                  inputProps={{ min: 1 }}
                  value={recurringSettings.intervalValue}
                  onChange={e =>
                    setRecurringSettings(prev => ({
                      ...prev,
                      intervalValue: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                <TextField
                  size="small"
                  type="date"
                  label="Start Date"
                  InputLabelProps={{ shrink: true }}
                  value={recurringSettings.startDate}
                  onChange={e =>
                    setRecurringSettings(prev => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  required
                />
                <TextField
                  size="small"
                  type="date"
                  label="End Date (optional)"
                  InputLabelProps={{ shrink: true }}
                  value={recurringSettings.endDate}
                  onChange={e =>
                    setRecurringSettings(prev => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
                <TextField
                  size="small"
                  type="number"
                  label="Lead time (days)"
                  inputProps={{ min: 0 }}
                  value={recurringSettings.leadTimeDays}
                  onChange={e =>
                    setRecurringSettings(prev => ({
                      ...prev,
                      leadTimeDays: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </Box>
            </Box>
          </Collapse>
        </Stack>
      </Box>
    </Modal>
  )
}

