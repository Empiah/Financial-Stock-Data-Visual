import { createChart, type IChartApi } from 'lightweight-charts'

/**
 * Shared chart theme matching the dark app shell. Inlined at each call site
 * so we don't pull in lightweight-charts' `DeepPartial<ChartOptions>` type,
 * which isn't always exported across versions.
 */
export function createThemedChart(container: HTMLElement): IChartApi {
  return createChart(container, {
    autoSize: true,
    layout: {
      background: { color: '#161b22' },
      textColor: '#7d8590',
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
    },
    grid: {
      vertLines: { color: '#21262d' },
      horzLines: { color: '#21262d' }
    },
    crosshair: { mode: 0 },
    rightPriceScale: { borderColor: '#21262d' },
    timeScale: { borderColor: '#21262d', timeVisible: false }
  })
}
