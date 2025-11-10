import type { Ticket } from './api'

const basePriorityWeights = { High: 50, Medium: 20, Low: 5 } as const
type PriorityLevel = keyof typeof basePriorityWeights

const normalizePriorityWeights = (weights?: Partial<Record<string, number>>): Record<PriorityLevel, number> => ({
  High: typeof weights?.High === 'number'
    ? weights.High
    : typeof weights?.P1 === 'number'
      ? weights.P1
      : basePriorityWeights.High,
  Medium: typeof weights?.Medium === 'number'
    ? weights.Medium
    : typeof weights?.P2 === 'number'
      ? weights.P2
      : basePriorityWeights.Medium,
  Low: typeof weights?.Low === 'number'
    ? weights.Low
    : typeof weights?.P3 === 'number'
      ? weights.P3
      : typeof weights?.P4 === 'number'
        ? weights.P4
        : basePriorityWeights.Low,
})

export type PriorityCfg = {
  boostAssignedToMe: number,
  weightPriority: Record<PriorityLevel, number>,
  weightStatus: Partial<Record<Ticket['status'], number>>,
  typeBoosts: Record<string, number>
}
export const defaultCfg: PriorityCfg = {
  boostAssignedToMe: 20,
<<<<<<< HEAD
  weightPriority: { P1: 50, P2: 20, P3: 5, P4: 1 },
  weightStatus: { AWAITING_RESPONSE: 10, ADE_TO_RESPOND: 6, ON_HOLD: 2, CLOSED: 0 },
=======
  weightPriority: normalizePriorityWeights(basePriorityWeights),
  weightStatus: { NEW: 10, TRIAGE: 6, IN_PROGRESS: 3, PENDING: 1 },
>>>>>>> 74f08e7 (Align dashboard site column and custom field filtering)
  typeBoosts: {}
}
export function loadCfg(userKey: string): PriorityCfg {
  const raw = localStorage.getItem(`prio:${userKey}`)
  if (!raw) return defaultCfg
  try {
    const parsed = JSON.parse(raw)
    return {
      ...defaultCfg,
      ...parsed,
      weightPriority: normalizePriorityWeights(parsed.weightPriority),
    }
  } catch {
    return defaultCfg
  }
}
export function saveCfg(userKey: string, cfg: PriorityCfg) {
  const normalized: PriorityCfg = {
    ...cfg,
    weightPriority: normalizePriorityWeights(cfg.weightPriority),
  }
  localStorage.setItem(`prio:${userKey}`, JSON.stringify(normalized))
}
export function score(t: Ticket, userId?: string, cfg: PriorityCfg = defaultCfg) {
  let s = 0
  s += cfg.weightPriority[t.priority] ?? 0
  s += cfg.weightStatus[t.status] ?? 0
  if (t.typeKey && cfg.typeBoosts[t.typeKey]) s += cfg.typeBoosts[t.typeKey]
  if (userId && (t as any).assignedUserId === userId) s += cfg.boostAssignedToMe
  const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3_600_000
  s += Math.max(0, 10 - Math.min(10, ageHours))
  return s
}
export function sortTickets(tickets: Ticket[], userId?: string, cfg: PriorityCfg = defaultCfg) {
  return [...tickets].sort((a,b) => score(b, userId, cfg) - score(a, userId, cfg))
}
