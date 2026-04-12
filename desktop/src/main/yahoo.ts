import type { PricePoint, StockResult } from '../shared/types'

/**
 * Port of get_stock_information() in ../../../StockDataVisualiser.py (lines 34–60).
 *
 * Originally we used the `yahoo-finance2` npm package, but it (a) ships
 * ESM-only so it can't be required from electron-vite's CJS main bundle,
 * (b) exposes `chart()` only in recent versions that don't resolve with
 * our pinned range, and (c) hits Yahoo's "crumb" anti-scraping endpoint
 * which is currently 429-rate-limited per
 * https://github.com/gadicc/node-yahoo-finance2/issues/764.
 *
 * All we actually need is the daily OHLC history and the company short
 * name — both come from one unauthenticated request to Yahoo's public
 * v8 chart endpoint, which doesn't require a crumb. Node 20 (which
 * Electron 31 uses) has fetch built in, so no dependencies at all.
 */
interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string
        shortName?: string
        longName?: string
        currency?: string
        exchangeName?: string
      }
      timestamp?: number[]
      indicators: {
        quote: Array<{
          open: (number | null)[]
          high: (number | null)[]
          low: (number | null)[]
          close: (number | null)[]
          volume: (number | null)[]
        }>
      }
    }> | null
    error: { code: string; description: string } | null
  }
}

export async function fetchDailyPrices(ticker: string): Promise<StockResult> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) throw new Error('Ticker is required')

  // Mirror the Python script's hard-coded 2020-01-01 → today window
  // (StockDataVisualiser.py:45-48). Yahoo's endpoint wants unix seconds.
  const period1 = Math.floor(new Date('2020-01-01T00:00:00Z').getTime() / 1000)
  const period2 = Math.floor(Date.now() / 1000)

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=history`

  // Yahoo returns 401 to the default node fetch User-Agent; pretend to be
  // a desktop browser so the request is served.
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      Accept: 'application/json'
    }
  })

  if (!res.ok) {
    throw new Error(`Yahoo Finance returned ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as YahooChartResponse

  if (data.chart.error) {
    throw new Error(
      `Yahoo Finance: ${data.chart.error.description || data.chart.error.code}`
    )
  }

  const result = data.chart.result?.[0]
  if (!result) {
    throw new Error(`No data returned for ${symbol}`)
  }

  const timestamps = result.timestamp ?? []
  const q = result.indicators.quote?.[0]
  if (!q || timestamps.length === 0) {
    throw new Error(`No price data returned for ${symbol}`)
  }

  const shortName =
    result.meta.shortName || result.meta.longName || result.meta.symbol || symbol

  const prices: PricePoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const close = q.close[i]
    if (close == null) continue
    const date = new Date(timestamps[i]! * 1000).toISOString().slice(0, 10)
    prices.push({
      date,
      open: q.open[i] ?? close,
      high: q.high[i] ?? close,
      low: q.low[i] ?? close,
      close,
      volume: q.volume[i] ?? 0
    })
  }

  if (prices.length === 0) {
    throw new Error(`No price data returned for ${symbol}`)
  }

  return { ticker: symbol, shortName, prices }
}
