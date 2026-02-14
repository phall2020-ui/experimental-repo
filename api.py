from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import threading
import time
import signal
import sys
import logging
import os
from typing import Dict, List, Optional, Any
from halo import Halo

# Import from main.py
from main import (
    ThreadSafeState, 
    ThreadManager, 
    update_price_history, 
    detect_and_trade, 
    check_trade_exits, 
    fetch_positions_with_retry, 
    validate_config, 
    get_client,
    setup_logging,
    load_config,
    load_web3_config
)
import main as bot_module

app = FastAPI(title="Polymarket Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Bot State
class BotInstance:
    def __init__(self):
        self.state: Optional[ThreadSafeState] = None
        self.thread_manager: Optional[ThreadManager] = None
        self.is_running = False
        self.logger = setup_logging()

    def start(self):
        if self.is_running:
            return {"status": "already_running"}
        
        try:
            load_config()
            load_web3_config()
            self.state = ThreadSafeState()
            self.thread_manager = ThreadManager(self.state)
            
            # Initialize connection (lazy)
            get_client()
            
            self.logger.info("Initializing bot via API...")
            
            self.thread_manager.start_thread("price_update", update_price_history)
            self.thread_manager.start_thread("detect_trade", detect_and_trade)
            self.thread_manager.start_thread("check_exits", check_trade_exits)
            
            self.is_running = True
            return {"status": "started"}
            
        except Exception as e:
            self.logger.error(f"Failed to start bot: {e}")
            self.stop()
            raise HTTPException(status_code=500, detail=str(e))

    def stop(self):
        if self.state:
            self.state.shutdown()
        if self.thread_manager:
            self.thread_manager.stop()
        
        self.state = None
        self.thread_manager = None
        self.is_running = False
        return {"status": "stopped"}

    def get_status(self):
        if not self.is_running or not self.state:
            return {
                "running": False,
                "active_threads": 0,
                "assets_tracked": 0,
                "positions": {},
                "active_trades": {},
                "pnl": 0 
            }
        
        active_threads = 0
        if self.thread_manager:
            active_threads = sum(1 for t in self.thread_manager.threads.values() if t.is_alive())
            
        return {
            "running": True,
            "active_threads": active_threads,
            "assets_tracked": len(self.state._price_history),
            "positions": self.state.get_positions(),
            "active_trades": self.state.get_active_trades()
        }

bot = BotInstance()

@app.get("/api/status")
async def status():
    return bot.get_status()

@app.post("/api/start")
async def start_bot(background_tasks: BackgroundTasks):
    return bot.start()

@app.post("/api/stop")
async def stop_bot():
    return bot.stop()

@app.get("/api/logs")
async def get_logs(limit: int = 100):
    log_file = "logs/polymarket_bot.log"
    if not os.path.exists(log_file):
        return {"logs": []}
    
    try:
        with open(log_file, "r") as f:
            lines = f.readlines()
            return {"logs": lines[-limit:]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/config")
async def get_config():
    config = {}
    keys_to_show = [
        "trade_unit", "slippage_tolerance", "pct_profit", "pct_loss", 
        "cash_profit", "cash_loss", "spike_threshold", "sold_position_time",
        "holding_time_limit", "max_concurrent_trades", "min_liquidity_requirement"
    ]
    for key in keys_to_show:
        config[key] = os.getenv(key)
    return config

class ConfigUpdate(BaseModel):
    key: str
    value: str

@app.post("/api/update_config")
async def update_config(update: ConfigUpdate):
    allowed_keys = [
        "trade_unit", "slippage_tolerance", "pct_profit", "pct_loss", 
        "cash_profit", "cash_loss", "spike_threshold", "sold_position_time",
        "holding_time_limit", "max_concurrent_trades", "min_liquidity_requirement"
    ]
    if update.key not in allowed_keys:
        raise HTTPException(status_code=400, detail="Invalid config key")
    
    os.environ[update.key] = update.value
    
    try:
        if hasattr(bot_module, update.key.upper()):
            old_val = getattr(bot_module, update.key.upper())
            new_val = type(old_val)(update.value)
            setattr(bot_module, update.key.upper(), new_val)
            return {"status": "updated", "key": update.key, "new_value": new_val}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid value type")
        
    return {"status": "updated_env_only"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
