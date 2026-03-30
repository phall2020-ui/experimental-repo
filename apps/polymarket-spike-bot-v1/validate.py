import os
from dotenv import load_dotenv

def validate_config() -> None:
    load_dotenv(".env")
    required_vars = {
        "trade_unit": float,
        "slippage_tolerance": float,
        "pct_profit": float,
        "pct_loss": float,
        "cash_profit": float,
        "cash_loss": float,
        "spike_threshold": float,
        "sold_position_time": float,
        "YOUR_PROXY_WALLET": str,
        "BOT_TRADER_ADDRESS": str,
        "USDC_CONTRACT_ADDRESS": str,
        "POLYMARKET_SETTLEMENT_CONTRACT": str,
        "PK": str,
        "holding_time_limit": float,
        "max_concurrent_trades": int,
        "min_liquidity_requirement": float
    }
    
    missing = []
    invalid = []
    
    for var, var_type in required_vars.items():
        value = os.getenv(var)
        if not value:
            missing.append(var)
            continue
        try:
            if var_type == float:
                float(value)
            elif var_type == int:
                int(value)
            elif var_type == str:
                str(value)
        except ValueError:
            invalid.append(var)
    
    if missing or invalid:
        if missing:
            print(f"Missing variables: {', '.join(missing)}")
        if invalid:
            print(f"Invalid values for: {', '.join(invalid)}")
    else:
        print("Configuration is valid!")

if __name__ == "__main__":
    validate_config()
