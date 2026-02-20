import { platformColor, platformLabel } from '../../lib/utils'

export default function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${platformColor(platform)}`}
    >
      {platformLabel(platform)}
    </span>
  )
}
