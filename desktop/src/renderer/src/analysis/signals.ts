import type { Series } from './indicators'

export interface SignalMarker {
  date: string
  price: number
}

export interface SignalSet {
  macdBuy: SignalMarker[]
  macdSell: SignalMarker[]
  rsiBuy: SignalMarker[]
  rsiSell: SignalMarker[]
  dualBuy: SignalMarker[]
  dualSell: SignalMarker[]
}

export interface Trade {
  buyDate: string
  buyPrice: number
  sellDate: string
  sellPrice: number
  returnPct: number
  days: number
}

export function detectSignals(
  closeByDate: Map<string, number>,
  macdLine: Series[],
  macdSignalLine: Series[],
  rsi: Series[],
  toleranceDays = 3
): SignalSet {
  const macdBuy: SignalMarker[] = []
  const macdSell: SignalMarker[] = []
  const rsiBuy: SignalMarker[] = []
  const rsiSell: SignalMarker[] = []

  const slowByDate = new Map(macdSignalLine.map((s) => [s.date, s.value]))
  const macdDiff: Series[] = []
  for (const f of macdLine) {
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

  for (let i = 1; i < rsi.length; i++) {
    const prev = rsi[i - 1]!.value
    const curr = rsi[i]!.value
    const date = rsi[i]!.date
    const price = closeByDate.get(date)
    if (price == null) continue
    if (prev < 30 && curr >= 30) rsiBuy.push({ date, price })
    else if (prev > 70 && curr <= 70) rsiSell.push({ date, price })
  }

  const dualBuy = coincident(macdBuy, rsiBuy, toleranceDays)
  const dualSell = coincident(macdSell, rsiSell, toleranceDays)

  return { macdBuy, macdSell, rsiBuy, rsiSell, dualBuy, dualSell }
}

/** Pair consecutive Buy→Sell dual signals and compute backtested performance */
export function backtestTrades(
  dualBuy: SignalMarker[],
  dualSell: SignalMarker[]
): Trade[] {
  // Merge buy/sell into a single timeline sorted by date
  type Event = { date: string; type: 'buy' | 'sell'; price: number }
  const events: Event[] = [
    ...dualBuy.map((m) => ({ date: m.date, type: 'buy' as const, price: m.price })),
    ...dualSell.map((m) => ({ date: m.date, type: 'sell' as const, price: m.price }))
  ].sort((a, b) => a.date.localeCompare(b.date))

  const trades: Trade[] = []
  let openBuy: Event | null = null

  for (const e of events) {
    if (e.type === 'buy') {
      // Always take the latest buy (overwrites previous unmatched buy)
      openBuy = e
    } else if (e.type === 'sell' && openBuy) {
      const days = Math.round(
        (Date.parse(e.date) - Date.parse(openBuy.date)) / (24 * 60 * 60 * 1000)
      )
      trades.push({
        buyDate: openBuy.date,
        buyPrice: openBuy.price,
        sellDate: e.date,
        sellPrice: e.price,
        returnPct: ((e.price - openBuy.price) / openBuy.price) * 100,
        days
      })
      openBuy = null
    }
  }
  return trades
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
