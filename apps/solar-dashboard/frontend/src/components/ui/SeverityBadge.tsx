import { severityColor } from '../../lib/utils'

export default function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${severityColor(severity)}`}
    >
      {severity}
    </span>
  )
}
