import { EMA, MACD, RSI } from 'technicalindicators'

export interface Candle {
  date: string
  close: number
}

export interface Series<T = number> {
  date: string
  value: T
}

export interface IndicatorParams {
  macdFast: number
  macdSlow: number
  macdSignal: number
  rsiPeriod: number
}

export const DEFAULT_PARAMS: IndicatorParams = {
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  rsiPeriod: 14
}

export interface IndicatorResult {
  macdLine: Series[]
  macdSignalLine: Series[]
  macdHist: Series[]
  rsi: Series[]
  ema12: Series[]
  ema26: Series[]
  regression: Series[]
  /** Latest values for the metrics bar */
  latest: { price: number; macd: number | null; rsi: number | null }
}

export function computeIndicators(
  candles: Candle[],
  params: IndicatorParams = DEFAULT_PARAMS
): IndicatorResult {
  const closes = candles.map((c) => c.close)
  const dates = candles.map((c) => c.date)

  const macd = MACD.calculate({
    values: closes,
    fastPeriod: params.macdFast,
    slowPeriod: params.macdSlow,
    signalPeriod: params.macdSignal,
    SimpleMAOscillator: false,
    SimpleMASignalLine: false
  })
  const macdOffset = closes.length - macd.length
  const macdLine: Series[] = []
  const macdSignalLine: Series[] = []
  const macdHist: Series[] = []
  for (let i = 0; i < macd.length; i++) {
    const d = dates[macdOffset + i]!
    if (macd[i]!.MACD != null) macdLine.push({ date: d, value: macd[i]!.MACD! })
    if (macd[i]!.signal != null)
      macdSignalLine.push({ date: d, value: macd[i]!.signal! })
    if (macd[i]!.histogram != null)
      macdHist.push({ date: d, value: macd[i]!.histogram! })
  }

  const rsiValues = RSI.calculate({ values: closes, period: params.rsiPeriod })
  const rsiOffset = closes.length - rsiValues.length
  const rsi: Series[] = rsiValues.map((v, i) => ({
    date: dates[rsiOffset + i]!,
    value: v
  }))

  const ema12Raw = EMA.calculate({ values: closes, period: params.macdFast })
  const ema26Raw = EMA.calculate({ values: closes, period: params.macdSlow })
  const ema12: Series[] = ema12Raw.map((v, i) => ({
    date: dates[closes.length - ema12Raw.length + i]!,
    value: v
  }))
  const ema26: Series[] = ema26Raw.map((v, i) => ({
    date: dates[closes.length - ema26Raw.length + i]!,
    value: v
  }))

  const regression = linearRegression(dates, closes)

  const lastMacd = macdLine.length > 0 ? macdLine[macdLine.length - 1]!.value : null
  const lastRsi = rsi.length > 0 ? rsi[rsi.length - 1]!.value : null
  const lastPrice = closes.length > 0 ? closes[closes.length - 1]! : 0

  return {
    macdLine,
    macdSignalLine,
    macdHist,
    rsi,
    ema12,
    ema26,
    regression,
    latest: { price: lastPrice, macd: lastMacd, rsi: lastRsi }
  }
}

export function linearRegression(dates: string[], closes: number[]): Series[] {
  const n = closes.length
  if (n === 0) return []
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += closes[i]!
    sumXY += i * closes[i]!
    sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return closes.map((_, i) => ({
    date: dates[i]!,
    value: intercept + slope * i
  }))
}

/** Compute % change for various lookback windows from price array */
export function computePerformance(
  prices: { date: string; close: number }[]
): Record<string, number | null> {
  if (prices.length < 2) return {}
  const last = prices[prices.length - 1]!
  const periods: Record<string, number> = {
    '1D': 1,
    '1W': 5,
    '1M': 21,
    '3M': 63,
    '6M': 126,
    '1Y': 252
  }
  const result: Record<string, number | null> = {}
  for (const [label, days] of Object.entries(periods)) {
    const idx = prices.length - 1 - days
    if (idx >= 0) {
      const prev = prices[idx]!.close
      result[label] = ((last.close - prev) / prev) * 100
    } else {
      result[label] = null
    }
  }
  return result
}

/** Rebase two price series to 100 at their common start for relative comparison */
export function rebaseSeries(
  stock: Series[],
  benchmark: Series[]
): { stock: Series[]; benchmark: Series[] } {
  if (stock.length === 0 || benchmark.length === 0)
    return { stock: [], benchmark: [] }

  const benchByDate = new Map(benchmark.map((s) => [s.date, s.value]))
  // Find first date where both have data
  let startStock: number | null = null
  let startBench: number | null = null
  const alignedStock: Series[] = []
  const alignedBench: Series[] = []

  for (const s of stock) {
    const bv = benchByDate.get(s.date)
    if (bv == null) continue
    if (startStock == null) {
      startStock = s.value
      startBench = bv
    }
    alignedStock.push({ date: s.date, value: (s.value / startStock!) * 100 })
    alignedBench.push({ date: s.date, value: (bv / startBench!) * 100 })
  }
  return { stock: alignedStock, benchmark: alignedBench }
}
