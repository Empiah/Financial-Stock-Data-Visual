import { EMA, MACD, RSI } from 'technicalindicators'

export interface Candle {
  date: string
  close: number
}

export interface Series<T = number> {
  date: string
  value: T
}

export interface IndicatorResult {
  /** MACD fast EMA (close ema-12) */
  macdFast: Series[]
  /** MACD slow EMA (close ema-26) */
  macdSlow: Series[]
  /** MACD histogram */
  macdHist: Series[]
  rsi: Series[]
  ema12: Series[]
  ema26: Series[]
  regression: Series[]
}

/**
 * Ports tech_indicator_calc() + stock_regression() from
 * ../../../../StockDataVisualiser.py (lines 78–142).
 *
 * Python uses talib.MACD(close, 12, 26, 9) and talib.RSI(close, 14);
 * the `technicalindicators` npm package uses the same defaults.
 *
 * One small behavioural note: Python's pandas `ewm(com=12).mean()` on
 * lines 116–117 uses the "center-of-mass" form (alpha = 1/(1+com)), which
 * is NOT the same as a standard N-period EMA. We deliberately switch to
 * a standard EMA here (period=12 / period=26) because (a) the purpose in
 * the original is just to draw two smoothed lines over price, (b) standard
 * EMAs are what traders expect when they see "ema12 / ema26" in a legend,
 * and (c) it keeps the implementation consistent with the MACD fast/slow
 * EMAs we compute on the same price series.
 */
export function computeIndicators(candles: Candle[]): IndicatorResult {
  const closes = candles.map((c) => c.close)
  const dates = candles.map((c) => c.date)

  // MACD(12, 26, 9). The package returns one entry per fully-formed window,
  // so it's shorter than `closes` — pad from the right to align on dates.
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignalLine: false
  })
  const macdOffset = closes.length - macd.length
  const macdFast: Series[] = []
  const macdSlow: Series[] = []
  const macdHist: Series[] = []
  for (let i = 0; i < macd.length; i++) {
    const d = dates[macdOffset + i]!
    // The Python script plots "macd" (the MACD line) as `macd_12` and
    // the signal line as `macd_26`. We reuse those names in the UI.
    if (macd[i]!.MACD != null) macdFast.push({ date: d, value: macd[i]!.MACD! })
    if (macd[i]!.signal != null) macdSlow.push({ date: d, value: macd[i]!.signal! })
    if (macd[i]!.histogram != null)
      macdHist.push({ date: d, value: macd[i]!.histogram! })
  }

  // RSI(14)
  const rsiValues = RSI.calculate({ values: closes, period: 14 })
  const rsiOffset = closes.length - rsiValues.length
  const rsi: Series[] = rsiValues.map((v, i) => ({
    date: dates[rsiOffset + i]!,
    value: v
  }))

  // EMA-12, EMA-26 on the price (for the top panel overlay)
  const ema12Raw = EMA.calculate({ values: closes, period: 12 })
  const ema26Raw = EMA.calculate({ values: closes, period: 26 })
  const ema12: Series[] = ema12Raw.map((v, i) => ({
    date: dates[closes.length - ema12Raw.length + i]!,
    value: v
  }))
  const ema26: Series[] = ema26Raw.map((v, i) => ({
    date: dates[closes.length - ema26Raw.length + i]!,
    value: v
  }))

  const regression = linearRegression(dates, closes)

  return { macdFast, macdSlow, macdHist, rsi, ema12, ema26, regression }
}

/**
 * Plain least-squares fit replacing statsmodels.OLS in stock_regression()
 * (StockDataVisualiser.py:138-139). x = index, y = close.
 */
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
