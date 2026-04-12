import type { PricePoint, StockResult } from '../shared/types'

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

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

async function fetchYahooChart(symbol: string): Promise<YahooChartResponse> {
  const period1 = Math.floor(new Date('2020-01-01T00:00:00Z').getTime() / 1000)
  const period2 = Math.floor(Date.now() / 1000)
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=history`

  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' }
  })
  if (!res.ok) {
    throw new Error(`Yahoo Finance returned ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as YahooChartResponse
}

function parseChartResponse(
  data: YahooChartResponse,
  fallbackSymbol: string
): StockResult {
  if (data.chart.error) {
    throw new Error(
      `Yahoo Finance: ${data.chart.error.description || data.chart.error.code}`
    )
  }
  const result = data.chart.result?.[0]
  if (!result) throw new Error(`No data returned for ${fallbackSymbol}`)

  const timestamps = result.timestamp ?? []
  const q = result.indicators.quote?.[0]
  if (!q || timestamps.length === 0) {
    throw new Error(`No price data returned for ${fallbackSymbol}`)
  }

  const shortName =
    result.meta.shortName || result.meta.longName || result.meta.symbol || fallbackSymbol

  const prices: PricePoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const close = q.close[i]
    if (close == null) continue
    prices.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      open: q.open[i] ?? close,
      high: q.high[i] ?? close,
      low: q.low[i] ?? close,
      close,
      volume: q.volume[i] ?? 0
    })
  }
  if (prices.length === 0) {
    throw new Error(`No price data returned for ${fallbackSymbol}`)
  }
  return { ticker: fallbackSymbol, shortName, prices }
}

export async function fetchDailyPrices(ticker: string): Promise<StockResult> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) throw new Error('Ticker is required')
  const data = await fetchYahooChart(symbol)
  return parseChartResponse(data, symbol)
}

/** Fetch S&P 500 (^GSPC) for index-relative comparison */
export async function fetchBenchmark(): Promise<StockResult> {
  const data = await fetchYahooChart('%5EGSPC')
  return parseChartResponse(data, '^GSPC')
}
