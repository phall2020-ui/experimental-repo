import type { Ticket } from './api'

const basePriorityWeights = { P1: 50, P2: 20, P3: 5, P4: 1 } as const
type PriorityLevel = keyof typeof basePriorityWeights

const normalizePriorityWeights = (weights?: Partial<Record<string, number>>): Record<PriorityLevel, number> => ({
  P1: typeof weights?.P1 === 'number'
    ? weights.P1
    : typeof weights?.High === 'number'
      ? weights.High
      : basePriorityWeights.P1,
  P2: typeof weights?.P2 === 'number'
    ? weights.P2
    : typeof weights?.Medium === 'number'
      ? weights.Medium
      : basePriorityWeights.P2,
  P3: typeof weights?.P3 === 'number'
    ? weights.P3
    : typeof weights?.Low === 'number'
      ? weights.Low
      : basePriorityWeights.P3,
  P4: typeof weights?.P4 === 'number'
    ? weights.P4
    : typeof weights?.VeryLow === 'number'
      ? weights.VeryLow
      : basePriorityWeights.P4,
})

const baseStatusWeights: Partial<Record<Ticket['status'], number>> = {
  AWAITING_RESPONSE: 10,
  ADE_TO_RESPOND: 6,
  ON_HOLD: 2,
  CLOSED: 0,
}

const normalizeStatusWeights = (weights?: Partial<Record<string, number>>): Partial<Record<Ticket['status'], number>> => {
  if (!weights) return baseStatusWeights

  const mapped: Partial<Record<Ticket['status'], number>> = { ...baseStatusWeights }
  const legacyMap: Record<string, Ticket['status']> = {
    NEW: 'AWAITING_RESPONSE',
    TRIAGE: 'AWAITING_RESPONSE',
    IN_PROGRESS: 'ADE_TO_RESPOND',
    PENDING: 'ON_HOLD',
    RESOLVED: 'CLOSED',
    CLOSED: 'CLOSED',
  }

  Object.entries(weights).forEach(([key, value]) => {
    if (typeof value !== 'number') return
    const normalizedKey = (legacyMap[key] ?? key) as Ticket['status']
    mapped[normalizedKey] = value
  })

  return mapped
}

export type PriorityCfg = {
  boostAssignedToMe: number,
  weightPriority: Record<PriorityLevel, number>,
  weightStatus: Partial<Record<Ticket['status'], number>>,
  typeBoosts: Record<string, number>
}
export const defaultCfg: PriorityCfg = {
  boostAssignedToMe: 20,
  weightPriority: basePriorityWeights,
  weightStatus: baseStatusWeights,
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
      weightStatus: normalizeStatusWeights(parsed.weightStatus),
    }
  } catch {
    return defaultCfg
  }
}
export function saveCfg(userKey: string, cfg: PriorityCfg) {
  const normalized: PriorityCfg = {
    ...cfg,
    weightPriority: normalizePriorityWeights(cfg.weightPriority),
    weightStatus: normalizeStatusWeights(cfg.weightStatus),
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
