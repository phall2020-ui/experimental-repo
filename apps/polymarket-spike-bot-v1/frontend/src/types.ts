export interface PositionInfo {
    eventslug: string;
    outcome: string;
    asset: string;
    avg_price: number;
    shares: number;
    current_price: number;
    initial_value: number;
    current_value: number;
    pnl: number;
    percent_pnl: number;
    realized_pnl: number;
}

export interface TradeInfo {
    entry_price: number;
    entry_time: number;
    amount: number;
    bot_triggered: boolean;
}

export interface BotStatus {
    running: boolean;
    active_threads: number;
    assets_tracked: number;
    positions: Record<string, PositionInfo[]>;
    active_trades: Record<string, TradeInfo>;
}
