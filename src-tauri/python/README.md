# MetaTrader 5 Python bridge

The desktop app calls `mt5_service.py` through the Tauri command
`mt5_request`. Install the official Python package in the Python environment
used by the app:

```bash
python -m pip install -r src-tauri/python/requirements.txt
```

The official `MetaTrader5` package is distributed for Windows x64. On Windows,
start MetaTrader 5 and log in to the required account before calling the
bridge. The Python package communicates with the local MT5 terminal; it does
not connect to a broker directly. If Python is not on PATH,
set `MT5_PYTHON` to the executable path or pass `pythonPath` in the TypeScript
request.

## macOS / remote Windows mode

### Local MT5.app on the same Mac

The Mac build can use the open local MT5.app through the Wine/Rosetta bridge:

```bash
python3 -m pip install -r src-tauri/python/requirements-mac.txt
```

The `mt5-mac-bridge` package requires a one-time native bridge setup. Follow
its native Mac bridge setup, then run the service on port `18813` after opening
MT5 and logging in:

```bash
./scripts/mt5_native_bridge.sh provision
./scripts/mt5_native_bridge.sh serve
```

In the app select `Mac / Local Bridge`, keep host `127.0.0.1` and port
`18813`, and choose the same Python executable where
`mt5-mac-bridge[bridge]` was installed.

### Remote Windows MT5

Alternatively, the Mac build can use the `mt5-remote` client and connect to a
bridge running on the Windows machine where MT5 is installed:

```bash
python -m pip install -r src-tauri/python/requirements-remote.txt
```

On Windows, install both `MetaTrader5` and `mt5-remote`, then start the bridge
from its virtual environment. The bridge package exposes the same API over
the network:

```powershell
python -m pip install MetaTrader5 mt5-remote
python -m mt5_remote .venv\Scripts\python.exe --mt5path "C:\Program Files\MetaTrader 5\terminal64.exe" --host 0.0.0.0 --port 18812
```

In the app select `Remote Windows Bridge`, enter the Windows IP address and
port `18812`, and use the Mac Python environment where `mt5-remote` is
installed. Keep the bridge behind a trusted LAN/VPN; the protocol should not
be exposed directly to the public internet.

The bridge accepts JSON on stdin and returns one JSON object on stdout. It
supports connection/account/terminal information, symbols, ticks, rates,
positions, orders, history, margin/profit calculation, `order_check`, and the
explicit `order_send` operation.
