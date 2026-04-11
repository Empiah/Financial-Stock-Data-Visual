import yahooFinance from 'yahoo-finance2'
import type { PricePoint, StockResult } from '../shared/types'

/**
 * Port of get_stock_information() in ../../../StockDataVisualiser.py (lines 34–60).
 * The Python original hard-codes start='2020-01-01' and end='-0D' (today), daily
 * frequency — we mirror that range.
 */
export async function fetchDailyPrices(ticker: string): Promise<StockResult> {
  const symbol = ticker.trim().toUpperCase()
  if (!symbol) throw new Error('Ticker is required')

  // yahoo-finance2 prints a notice to stdout on first call; silence it.
  yahooFinance.suppressNotices(['yahooSurvey'])

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
