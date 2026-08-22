#!/usr/bin/env python3
"""
MetaTrader 5 Data Fetcher & Terminal Viewer
Documentation: https://www.mql5.com/en/docs/python_metatrader5

Requirements:
    pip install MetaTrader5 pandas

Description:
    This script connects to a MetaTrader 5 terminal, retrieves account details,
    symbol lists, real-time tick prices, historical OHLCV candles, and open positions,
    and outputs them formatted as clean tables/lists directly in the terminal.
"""

import sys
import argparse
from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None

try:
    import pandas as pd
except ImportError:
    pd = None


def check_mt5_installed():
    """Verify that MetaTrader5 library is installed."""
    if mt5 is None:
        print("[ERROR] MetaTrader5 package is not installed.")
        print("To install it, run: pip install MetaTrader5")
        print("\nImportant Note for macOS / Linux users:")
        print("  The MetaTrader5 Python API relies on Windows DLLs to interface with terminal64.exe.")
        print("  To run MT5 with Python on macOS/Linux, you must execute Python inside Wine/CrossOver,")
        print("  a Windows virtual machine, or connect via a remote Windows VPS / WebAPI gateway.")
        sys.exit(1)


def init_mt5(path=None, login=None, password=None, server=None):
    """Initialize connection to MetaTrader 5 terminal."""
    check_mt5_installed()

    init_kwargs = {}
    if path:
        init_kwargs['path'] = path
    if login:
        init_kwargs['login'] = int(login)
    if password:
        init_kwargs['password'] = password
    if server:
        init_kwargs['server'] = server

    if not mt5.initialize(**init_kwargs):
        print(f"[ERROR] mt5.initialize() failed. Error code: {mt5.last_error()}")
        sys.exit(1)

    print("==================================================")
    print(" [SUCCESS] Connected to MetaTrader 5 Terminal")
    print("==================================================")


def get_terminal_and_account_info():
    """Print terminal status and account balance/margin information."""
    terminal_info = mt5.terminal_info()
    account_info = mt5.account_info()

    print("\n" + "=" * 50)
    print(" 🖥 TERMINAL INFORMATION")
    print("=" * 50)
    if terminal_info:
        for key, val in terminal_info._asdict().items():
            print(f"  {key:<22}: {val}")
    else:
        print("  Unable to retrieve terminal info.")

    print("\n" + "=" * 50)
    print(" 👤 ACCOUNT INFORMATION")
    print("=" * 50)
    if account_info:
        acc_dict = account_info._asdict()
        important_keys = [
            'login', 'trade_mode', 'name', 'server', 'currency', 'leverage',
            'balance', 'equity', 'profit', 'margin', 'margin_free', 'margin_level'
        ]
        for key in important_keys:
            if key in acc_dict:
                print(f"  {key:<22}: {acc_dict[key]}")
    else:
        print("  Unable to retrieve account info.")


def get_symbols(group=None, limit=20):
    """Fetch and list available trading symbols."""
    print("\n" + "=" * 50)
    print(f" 📈 SYMBOLS LIST (Filter: '{group or 'All'}', Limit: {limit})")
    print("=" * 50)

    if group:
        symbols = mt5.symbols_get(group=group)
    else:
        symbols = mt5.symbols_get()

    if symbols is None or len(symbols) == 0:
        print("  No symbols found matching criteria.")
        return

    print(f"Total symbols found: {len(symbols)}\n")

    data = []
    for s in symbols[:limit]:
        data.append({
            'Symbol': s.name,
            'Path': s.path,
            'Digits': s.digits,
            'Spread': s.spread,
            'Bid': s.bid,
            'Ask': s.ask
        })

    if pd:
        df = pd.DataFrame(data)
        print(df.to_string(index=False))
    else:
        for idx, item in enumerate(data, 1):
            print(f"{idx:2d}. Symbol: {item['Symbol']:<10} | Bid: {item['Bid']:<10.5f} | Ask: {item['Ask']:<10.5f} | Spread: {item['Spread']}")


def get_current_tick(symbol):
    """Fetch real-time tick price for a given symbol."""
    symbol = symbol.upper()
    print("\n" + "=" * 50)
    print(f" ⏱ REAL-TIME TICK QUOTE: {symbol}")
    print("=" * 50)

    selected = mt5.symbol_select(symbol, True)
    if not selected:
        print(f"  [ERROR] Failed to select symbol '{symbol}' in Market Watch.")
        return

    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        print(f"  [ERROR] Could not retrieve tick for symbol '{symbol}'. Error: {mt5.last_error()}")
        return

    tick_dict = tick._asdict()
    tick_dict['time_formatted'] = datetime.fromtimestamp(tick.time).strftime('%Y-%m-%d %H:%M:%S')

    for k, v in tick_dict.items():
        print(f"  {k:<22}: {v}")


TIMEFRAME_MAP = {
    'M1': mt5.TIMEFRAME_M1 if mt5 else 1,
    'M5': mt5.TIMEFRAME_M5 if mt5 else 5,
    'M15': mt5.TIMEFRAME_M15 if mt5 else 15,
    'M30': mt5.TIMEFRAME_M30 if mt5 else 30,
    'H1': mt5.TIMEFRAME_H1 if mt5 else 60,
    'H4': mt5.TIMEFRAME_H4 if mt5 else 240,
    'D1': mt5.TIMEFRAME_D1 if mt5 else 1440,
    'W1': mt5.TIMEFRAME_W1 if mt5 else 10080,
    'MN1': mt5.TIMEFRAME_MN1 if mt5 else 43200
}


def get_historical_rates(symbol, tf_str='H1', count=10):
    """Fetch historical OHLCV candles for a symbol."""
    symbol = symbol.upper()
    tf_str = tf_str.upper()

    if tf_str not in TIMEFRAME_MAP:
        print(f"[ERROR] Invalid timeframe '{tf_str}'. Supported timeframes: {list(TIMEFRAME_MAP.keys())}")
        return

    timeframe = TIMEFRAME_MAP[tf_str]

    print("\n" + "=" * 50)
    print(f" 📊 HISTORICAL OHLCV CANDLES: {symbol} [{tf_str}] (Last {count} bars)")
    print("=" * 50)

    rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, count)
    if rates is None or len(rates) == 0:
        print(f"  [ERROR] No rates returned for {symbol}. Error: {mt5.last_error()}")
        return

    if pd:
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        columns_to_show = ['time', 'open', 'high', 'low', 'close', 'tick_volume', 'spread']
        print(df[columns_to_show].to_string(index=False))
    else:
        print(f"{'Time':<20} | {'Open':<10} | {'High':<10} | {'Low':<10} | {'Close':<10} | {'Volume':<8}")
        print("-" * 78)
        for r in rates:
            time_str = datetime.fromtimestamp(r['time']).strftime('%Y-%m-%d %H:%M:%S')
            print(f"{time_str:<20} | {r['open']:<10.5f} | {r['high']:<10.5f} | {r['low']:<10.5f} | {r['close']:<10.5f} | {r['tick_volume']:<8}")


def get_positions():
    """Fetch active open trading positions."""
    print("\n" + "=" * 50)
    print(" 💼 ACTIVE OPEN POSITIONS")
    print("=" * 50)

    positions = mt5.positions_get()
    if positions is None or len(positions) == 0:
        print("  No active open positions.")
        return

    data = []
    for pos in positions:
        p = pos._asdict()
        type_str = "BUY" if p['type'] == mt5.ORDER_TYPE_BUY else ("SELL" if p['type'] == mt5.ORDER_TYPE_SELL else str(p['type']))
        time_str = datetime.fromtimestamp(p['time']).strftime('%Y-%m-%d %H:%M:%S')
        data.append({
            'Ticket': p['ticket'],
            'Time': time_str,
            'Symbol': p['symbol'],
            'Type': type_str,
            'Volume': p['volume'],
            'Open Price': p['price_open'],
            'Current Price': p['price_current'],
            'SL': p['sl'],
            'TP': p['tp'],
            'Profit': p['profit'],
            'Comment': p['comment']
        })

    if pd:
        df = pd.DataFrame(data)
        print(df.to_string(index=False))
    else:
        for d in data:
            print(f"Ticket #{d['Ticket']} | {d['Symbol']} {d['Type']} {d['Volume']} lots | Open: {d['Open Price']} -> Current: {d['Current Price']} | Profit: {d['Profit']}")


def main():
    parser = argparse.ArgumentParser(description="MetaTrader 5 Python Data Extractor & Terminal Viewer")
    parser.add_argument("--path", help="Path to terminal64.exe (optional)")
    parser.add_argument("--login", type=int, help="Account number (optional)")
    parser.add_argument("--password", help="Account password (optional)")
    parser.add_argument("--server", help="Trade server name (optional)")

    parser.add_argument("--info", action="store_true", help="Fetch terminal & account details")
    parser.add_argument("--symbols", nargs="?", const="*", help="List symbols (optional group filter e.g. 'EUR*')")
    parser.add_argument("--tick", help="Get real-time tick for symbol e.g. EURUSD")
    parser.add_argument("--rates", help="Get historical candles for symbol e.g. EURUSD")
    parser.add_argument("--tf", default="H1", help="Timeframe (M1, M5, M15, M30, H1, H4, D1, W1, MN1). Default: H1")
    parser.add_argument("--count", type=int, default=10, help="Number of candles to fetch. Default: 10")
    parser.add_argument("--positions", action="store_true", help="List active open positions")
    parser.add_argument("--all", action="store_true", help="Fetch full overview (account info, symbols, tick, rates, positions)")

    args = parser.parse_args()

    # Default to --all if no specific action flag is provided
    if not any([args.info, args.symbols, args.tick, args.rates, args.positions, args.all]):
        args.all = True

    init_mt5(path=args.path, login=args.login, password=args.password, server=args.server)

    try:
        if args.all or args.info:
            get_terminal_and_account_info()

        if args.all or args.symbols is not None:
            group = None if args.symbols == "*" else args.symbols
            get_symbols(group=group, limit=20)

        if args.tick:
            get_current_tick(args.tick)
        elif args.all:
            get_current_tick("EURUSD")

        if args.rates:
            get_historical_rates(args.rates, tf_str=args.tf, count=args.count)
        elif args.all:
            get_historical_rates("EURUSD", tf_str=args.tf, count=args.count)

        if args.all or args.positions:
            get_positions()

    finally:
        mt5.shutdown()
        print("\n[INFO] Closed MetaTrader 5 connection.")


if __name__ == "__main__":
    main()
