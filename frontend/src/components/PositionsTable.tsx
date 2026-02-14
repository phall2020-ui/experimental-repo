import { PositionInfo } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "./ui-card"

export function PositionsTable({ positions }: { positions: Record<string, PositionInfo[]> }) {
    const allPositions = Object.values(positions).flat()

    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle>Open Positions ({allPositions.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs text-slate-200 uppercase bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">Outcome</th>
                                <th className="px-4 py-3 text-right">Shares</th>
                                <th className="px-4 py-3 text-right">Avg Price</th>
                                <th className="px-4 py-3 text-right">Cur Price</th>
                                <th className="px-4 py-3 text-right">Value</th>
                                <th className="px-4 py-3 text-right">PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allPositions.map((pos) => (
                                <tr key={pos.asset} className="border-b border-slate-700 hover:bg-slate-700/30">
                                    <td className="px-4 py-3 font-medium text-white">{pos.eventslug}</td>
                                    <td className="px-4 py-3 text-blue-400">{pos.outcome}</td>
                                    <td className="px-4 py-3 text-right">{pos.shares.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">${pos.avg_price.toFixed(3)}</td>
                                    <td className="px-4 py-3 text-right">${pos.current_price.toFixed(3)}</td>
                                    <td className="px-4 py-3 text-right">${pos.current_value.toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${pos.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        ${pos.pnl.toFixed(2)} ({pos.percent_pnl.toFixed(2)}%)
                                    </td>
                                </tr>
                            ))}
                            {allPositions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        No open positions
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
