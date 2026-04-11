# Stock Visualizer (desktop)

Lightweight Electron desktop app for Mac. TypeScript port of the 4-panel
matplotlib visualization in the root `StockDataVisualiser.py`: price chart with
EMA-12 / EMA-26 / regression trendline, MACD, RSI, and Google Trends, with
green / red arrows where the MACD and RSI signals agree within a 3-day window.

Unlike the Python script, this version pulls data from **Yahoo Finance**
(no API key) instead of Refinitiv Datastream, and computes the same indicators
using the `technicalindicators` npm package — same MACD `(12, 26, 9)` and
RSI `14` defaults that TA-Lib uses.

## Develop

```sh
cd desktop
npm install
npm run dev
```

A window opens with a ticker input. Type `AAPL`, press Enter.

## Build a Mac DMG

```sh
npm run dist:mac
```

Produces `dist/Stock Visualizer-<version>-arm64.dmg` and a `-x64.dmg` in the
same folder. The app is **not code-signed** in v1, so on first launch:

1. Drag the app from the DMG into `/Applications`.
2. Right-click the app → **Open** → click **Open** on the Gatekeeper warning.
3. After the first launch it will open normally from the Dock.

Code signing and notarization will need an Apple Developer account and is
explicitly deferred.

## Project layout

```
desktop/
├── src/
│   ├── main/          # Electron main process (Node) — IPC + data fetching
│   ├── preload/       # contextBridge → window.api
│   └── renderer/      # React + lightweight-charts UI
└── resources/         # app icon, packaging assets
```

All network calls (`yahoo-finance2`, `google-trends-api`) run in the main
process; the renderer only talks to them via IPC exposed through the preload
bridge.
