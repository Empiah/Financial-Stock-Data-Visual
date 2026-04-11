import type YahooFinanceInstance from 'yahoo-finance2'
import type { PricePoint, StockResult } from '../shared/types'

// yahoo-finance2 v2+ is ESM-only. electron-vite bundles the main process as
// CommonJS (externalizeDepsPlugin -> runtime require), so a static
// `import yahooFinance from 'yahoo-finance2'` trips
// ERR_PACKAGE_PATH_NOT_EXPORTED at runtime. We dodge the bundler by hiding
// the import specifier behind `new Function(...)`, which leaves the call as
// a native Node `import()` that resolves the ESM package at runtime.
const nativeImport = new Function('m', 'return import(m)') as (
  m: string
) => Promise<{ default: YahooFinanceInstance }>

let yahooPromise: Promise<YahooFinanceInstance> | null = null
function getYahooFinance(): Promise<YahooFinanceInstance> {
  if (!yahooPromise) {
    yahooPromise = nativeImport('yahoo-finance2').then((m) => m.default)
  }
  return yahooPromise
}

/**
 * Port of get_stock_information() in ../../../StockDataVisualiser.py (lines 34–60).
 * The Python original hard-codes start='2020-01-01' and end='-0D' (today), daily
 * frequency — we mirror that range.
 */
export async function fetchDailyPrices(ticker: string): Promise<StockResult> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) throw new Error('Ticker is required')

  const yahooFinance = await getYahooFinance()

  const period1 = '2020-01-01'
  const period2 = new Date()

  const [quote, rows] = await Promise.all([
    yahooFinance.quote(symbol),
    yahooFinance.chart(symbol, { period1, period2, interval: '1d' })
  ])

  const shortName =
    (quote && (quote.shortName || quote.longName || quote.symbol)) || symbol

  const prices: PricePoint[] = (rows.quotes ?? [])
    .filter((r) => r.close != null && r.date != null)
    .map((r) => ({
      date: new Date(r.date as Date).toISOString().slice(0, 10),
      open: (r.open ?? r.close) as number,
      high: (r.high ?? r.close) as number,
      low: (r.low ?? r.close) as number,
      close: r.close as number,
      volume: (r.volume ?? 0) as number
    }))

  if (prices.length === 0) {
    throw new Error(`No price data returned for ${symbol}`)
  }

  return { ticker: symbol, shortName, prices }
}
