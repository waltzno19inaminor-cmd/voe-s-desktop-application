#!/usr/bin/env python3
"""
Mac MT5 Trades Extractor (Multi-Bridge)
Supports 2 Bridges on macOS:
  1. File Bridge (trades.json from MT5 Common Files)
  2. Socket / ZeroMQ Bridge (localhost:5555 / localhost:8080)
"""

import os
import sys
import glob
import json
import argparse
import urllib.request
import pandas as pd

try:
    import zmq
except ImportError:
    zmq = None


def find_common_trades_file():
    """Find trades.json in exact MT5 Wine bottle paths on this Mac."""
    home = os.path.expanduser("~")
    possible_paths = [
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/Terminal/Common/Files/trades.json"),
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Files/trades.json"),
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/user/AppData/Roaming/MetaQuotes/Terminal/Common/Files/trades.json"),
        os.path.join(home, "Library/Application Support/com.metaquotes.metatrader5/netdrive/Terminal/Common/Files/trades.json"),
        os.path.join(home, ".wine/drive_c/users/*/AppData/Roaming/MetaQuotes/Terminal/Common/Files/trades.json"),
        "./trades.json"
    ]

    for p in possible_paths:
        if "*" in p:
            matches = glob.glob(p)
            if matches and os.path.exists(matches[0]):
                return matches[0]
        elif os.path.exists(p):
            return p

    # Fallback recursive search if not found in static paths
    wine_dir = os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5")
    if os.path.exists(wine_dir):
        for root, dirs, files in os.walk(wine_dir):
            if "trades.json" in files:
                return os.path.join(root, "trades.json")

    return None


def fetch_trades_from_file(file_path=None):
    """Read trades directly from trades.json (File Bridge)."""
    target_file = file_path or find_common_trades_file()

    if not target_file or not os.path.exists(target_file):
        return None, "File 'trades.json' not found."

    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data, f"Read successfully from {target_file}"
    except Exception as e:
        return None, f"Error reading file: {e}"


def fetch_trades_from_http(url="http://127.0.0.1:8080/trades"):
    """Fetch trades from HTTP Bridge in MT5."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=1) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data, f"Fetched via HTTP from {url}"
    except Exception as e:
        return None, f"HTTP Error: {e}"


def fetch_trades_from_zmq(host="127.0.0.1", port=5555):
    """Fetch trades from ZeroMQ Bridge in MT5 with immediate non-blocking timeout."""
    if zmq is None:
        return None, "pyzmq not installed."

    context = zmq.Context()
    socket = context.socket(zmq.REQ)
    socket.setsockopt(zmq.LINGER, 0)
    socket.setsockopt(zmq.RCVTIMEO, 1000)  # 1s timeout
    socket.setsockopt(zmq.SNDTIMEO, 1000)

    try:
        socket.connect(f"tcp://{host}:{port}")
        socket.send_string("GET_POSITIONS;")
        reply = socket.recv_string()
        data = json.loads(reply)
        return data, f"Fetched via ZeroMQ from tcp://{host}:{port}"
    except Exception as e:
        return None, f"ZeroMQ Error: {e}"
    finally:
        socket.close(linger=0)
        context.term()


def display_trades():
    """Check all bridges and display active trades table."""
    print("=" * 75)
    print(" 💼 MT5 ACTIVE TRADES & POSITIONS (macOS)")
    print("=" * 75)

    trades_data = None
    source_info = ""

    # 1. Try File Bridge first
    trades_data, source_info = fetch_trades_from_file()

    # 2. Try HTTP Bridge if File Bridge produced no result
    if not trades_data:
        t_http, info_http = fetch_trades_from_http()
        if t_http:
            trades_data, source_info = t_http, info_http

    # 3. Try ZeroMQ Bridge if still no result
    if not trades_data:
        t_zmq, info_zmq = fetch_trades_from_zmq()
        if t_zmq:
            trades_data, source_info = t_zmq, info_zmq

    if trades_data and isinstance(trades_data, list) and len(trades_data) > 0:
        print(f"  [SOURCE]: {source_info}\n")
        df = pd.DataFrame(trades_data)
        cols = ['ticket', 'symbol', 'type', 'volume', 'price_open', 'price_current', 'sl', 'tp', 'profit']
        existing_cols = [c for c in cols if c in df.columns]
        if existing_cols:
            print(df[existing_cols].to_string(index=False))
        else:
            print(df.to_string(index=False))
    elif trades_data == []:
        print(f"  [SOURCE]: {source_info}")
        print("  У вас нет открытых сделок на счёте MT5.")
    else:
        print("  [СТАТУС]: Ни один мост не подключен.")
        print("\n  ExportTrades.mq5 уже скопирован в вашу папку MT5!")
        print("  Для запуска:")
        print("  1. Откройте MT5")
        print("  2. В окне Навигатор скопируйте ExportTrades на график.")


def main():
    parser = argparse.ArgumentParser(description="Mac MT5 Trades Extractor")
    parser.add_argument("--file", help="Path to trades.json file")
    args = parser.parse_args()

    if args.file:
        data, info = fetch_trades_from_file(args.file)
        if data:
            df = pd.DataFrame(data)
            print(df.to_string(index=False))
        else:
            print(info)
    else:
        display_trades()


if __name__ == "__main__":
    main()
