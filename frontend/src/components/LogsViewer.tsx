import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui-card"

const API_URL = "http://localhost:8000"

export function LogsViewer() {
    const [logs, setLogs] = useState<string[]>([])
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${API_URL}/api/logs?limit=100`)
                if (res.ok) {
                    const data = await res.json()
                    setLogs(data.logs || [])
                }
            } catch (e) {
                console.error(e)
            }
        }

        fetchLogs()
        const interval = setInterval(fetchLogs, 3000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    return (
        <Card className="col-span-1 border-slate-700 bg-surface">
            <CardHeader>
                <CardTitle>Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-slate-950 p-4 rounded border border-slate-800">
                    {logs.length === 0 ? (
                        <p className="text-slate-500 italic">No logs available...</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="whitespace-pre-wrap break-all border-b border-slate-900/50 pb-0.5 mb-0.5">
                                {log}
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </CardContent>
        </Card>
    )
}
