import type { Ticket } from './api'
export type PriorityCfg = {
  boostAssignedToMe: number,
  weightPriority: Record<'P1'|'P2'|'P3'|'P4', number>,
  weightStatus: Partial<Record<Ticket['status'], number>>,
  typeBoosts: Record<string, number>
}
export const defaultCfg: PriorityCfg = {
  boostAssignedToMe: 20,
  weightPriority: { P1: 50, P2: 20, P3: 5, P4: 1 },
  weightStatus: { AWAITING_RESPONSE: 10, ADE_TO_RESPOND: 6, ON_HOLD: 2, CLOSED: 0 },
  typeBoosts: {}
}
export function loadCfg(userKey: string): PriorityCfg {
  const raw = localStorage.getItem(`prio:${userKey}`)
  if (!raw) return defaultCfg
  try { return { ...defaultCfg, ...JSON.parse(raw) } } catch { return defaultCfg }
}
export function saveCfg(userKey: string, cfg: PriorityCfg) {
  localStorage.setItem(`prio:${userKey}`, JSON.stringify(cfg))
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
