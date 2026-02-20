import { AlertTriangle } from 'lucide-react'

export default function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
      <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
      <p className="text-red-300 text-sm">{message}</p>
    </div>
  )
}
