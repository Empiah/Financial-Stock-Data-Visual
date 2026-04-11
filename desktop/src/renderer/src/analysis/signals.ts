import type { Series } from './indicators'

export interface SignalMarker {
  date: string
  /** price at the signal day, used for placing the marker on the price chart */
  price: number
}

export interface SignalSet {
  /** MACD line crosses the signal line upward — bullish */
  macdBuy: SignalMarker[]
  /** MACD line crosses the signal line downward — bearish */
  macdSell: SignalMarker[]
  /** RSI crosses back above 30 — buy */
  rsiBuy: SignalMarker[]
  /** RSI crosses back below 70 — sell */
  rsiSell: SignalMarker[]
  /** MACD buy AND RSI buy within TOLERANCE_DAYS — strong buy on the price chart */
  dualBuy: SignalMarker[]
  /** MACD sell AND RSI sell within TOLERANCE_DAYS — strong sell on the price chart */
  dualSell: SignalMarker[]
}

/**
 * Tolerance used by the dual-signal detector. Mirrors the shift(-2) / shift(-1)
 * / shift(1) combine_first pattern in StockDataVisualiser.py:158-183, which
 * effectively treats signals landing within ~3 days of each other as coincident.
 */
const TOLERANCE_DAYS = 3

/**
 * Ports the MACD/RSI crossover detection from
 * ../../../../StockDataVisualiser.py (lines 89-106) and the dual-signal
 * "stock_up / stock_down" combining from lines 158-183.
 *
 * Python logic, paraphrased:
 *   macd_buy  where (macd_12 - macd_26) turns from negative to positive
 *   macd_sell where (macd_12 - macd_26) turns from positive to negative
 *   rsi_buy   where RSI crosses upward through 30
 *   rsi_sell  where RSI crosses downward through 70
 *   stock_up   where a MACD buy AND an RSI buy happen within the tolerance window
 *   stock_down where a MACD sell AND an RSI sell happen within the tolerance window
 */
export function detectSignals(
  closeByDate: Map<string, number>,
  macdFast: Series[],
  macdSlow: Series[],
  rsi: Series[]
): SignalSet {
  const macdBuy: SignalMarker[] = []
  const macdSell: SignalMarker[] = []
  const rsiBuy: SignalMarker[] = []
  const rsiSell: SignalMarker[] = []

  // MACD crossovers: fast - slow changes sign.
  // Align the two series on date (they share an offset in practice, but be safe).
  const slowByDate = new Map(macdSlow.map((s) => [s.date, s.value]))
  const macdDiff: Series[] = []
  for (const f of macdFast) {
    const slow = slowByDate.get(f.date)
    if (slow != null) macdDiff.push({ date: f.date, value: f.value - slow })
  }
  for (let i = 1; i < macdDiff.length; i++) {
    const prev = macdDiff[i - 1]!.value
    const curr = macdDiff[i]!.value
    const date = macdDiff[i]!.date
    const price = closeByDate.get(date)
    if (price == null) continue
    if (prev <= 0 && curr > 0) macdBuy.push({ date, price })
    else if (prev >= 0 && curr < 0) macdSell.push({ date, price })
  }

  // RSI threshold crossings (30 / 70).
  for (let i = 1; i < rsi.length; i++) {
    const prev = rsi[i - 1]!.value
    const curr = rsi[i]!.value
    const date = rsi[i]!.date
    const price = closeByDate.get(date)
    if (price == null) continue
    if (prev < 30 && curr >= 30) rsiBuy.push({ date, price })
    else if (prev > 70 && curr <= 70) rsiSell.push({ date, price })
  }

  const dualBuy = coincident(macdBuy, rsiBuy, TOLERANCE_DAYS)
  const dualSell = coincident(macdSell, rsiSell, TOLERANCE_DAYS)

  return { macdBuy, macdSell, rsiBuy, rsiSell, dualBuy, dualSell }
}

function coincident(
  a: SignalMarker[],
  b: SignalMarker[],
  toleranceDays: number
): SignalMarker[] {
  if (a.length === 0 || b.length === 0) return []
  const bTimes = b.map((m) => ({ t: Date.parse(m.date), marker: m }))
  const out: SignalMarker[] = []
  const toleranceMs = toleranceDays * 24 * 60 * 60 * 1000
  for (const ma of a) {
    const ta = Date.parse(ma.date)
    for (const { t: tb } of bTimes) {
      if (Math.abs(ta - tb) <= toleranceMs) {
        out.push(ma)
        break
      }
    }
  }
  return out
}
