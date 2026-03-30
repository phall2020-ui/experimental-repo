export const STATUS_OPTIONS = [
  { value: 'AWAITING_RESPONSE', label: 'Awaiting Response' },
  { value: 'ADE_TO_RESPOND', label: 'ADE to Respond' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED', label: 'Closed' },
] as const

export type TicketStatusValue = typeof STATUS_OPTIONS[number]['value']

export const STATUS_LABELS: Record<TicketStatusValue, string> = STATUS_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label
    return acc
  },
  {} as Record<TicketStatusValue, string>
)

