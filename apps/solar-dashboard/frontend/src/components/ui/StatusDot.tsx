import { statusDot } from '../../lib/utils'

export default function StatusDot({
  status,
  size = 'sm',
}: {
  status: string
  size?: 'sm' | 'md'
}) {
  const sz = size === 'md' ? 'w-3 h-3' : 'w-2 h-2'
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sz} ${statusDot(status)}`}
    />
  )
}
