export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-solar-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
