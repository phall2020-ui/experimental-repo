import { useEffect, useState } from "react"
import { BotStatus } from "./types"
import { PositionsTable } from "./components/PositionsTable"
import { LogsViewer } from "./components/LogsViewer"
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui-card"
import { Activity, Play, Square, RefreshCw } from "lucide-react"

const API_URL = "http://localhost:8000"

function App() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/status`)
      if (!res.ok) throw new Error("Failed to fetch status")
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to connect to bot API")
    }
  }

  const toggleBot = async () => {
    if (!status) return
    setLoading(true)
    try {
      const endpoint = status.running ? "stop" : "start"
      await fetch(`${API_URL}/api/${endpoint}`, { method: "POST" })
      await new Promise(r => setTimeout(r, 1000)) // Wait for startup
      fetchStatus()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Polymarket Spike Bot</h1>
            <p className="text-slate-400">Automated trading dashboard</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={fetchStatus}
              className="p-2 rounded-full hover:bg-slate-800 transition-colors"
              title="Refresh Status"
            >
              <RefreshCw className="w-5 h-5 text-slate-400" />
            </button>
            {status && (
              <button
                onClick={toggleBot}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium transition-colors ${status.running
                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                  }`}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : status.running ? (
                  <>
                    <Square className="w-4 h-4 fill-current" /> Stop Bot
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Start Bot
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg">
            ⚠️ {error}. check if backend is running on port 8000.
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status?.running ? <span className="text-green-400">Running</span> : <span className="text-slate-500">Stopped</span>}
              </div>
              <p className="text-xs text-slate-400">
                {status?.active_threads || 0} active threads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tracking</CardTitle>
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.assets_tracked || 0}</div>
              <p className="text-xs text-slate-400">Assets monitored</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status ? Object.values(status.positions).flat().length : 0}
              </div>
              <p className="text-xs text-slate-400">Active positions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status ? Object.values(status.active_trades).length : 0}
              </div>
              <p className="text-xs text-slate-400">Trades in progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {status && <PositionsTable positions={status.positions} />}

          <LogsViewer />
        </div>
      </div>
    </div>
  )
}

export default App
