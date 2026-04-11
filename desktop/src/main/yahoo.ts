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
) => Promise<unknown>

// The returned module namespace's shape varies across yahoo-finance2
// versions and CJS/ESM interop paths. In older versions the default export
// was `new YahooFinance()` (an instance with a `quote` method). In the
// newer ESM-only releases the default is either the class itself (needs
// `new`), a factory function, or a nested `{ default: instance }`. Probe
// every shape we can think of, and if none hit, throw with a detailed
// dump of what we actually got so we can fix it targeted.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
function hasQuote(x: Any): x is YahooFinanceInstance {
  return !!x && typeof x.quote === 'function'
}
function resolveInstance(mod: unknown): YahooFinanceInstance {
  const m = mod as Any

  // 1. Plain object with `quote` at the top level
  if (hasQuote(m)) return m

  // 2. ESM default export that is the instance directly
  if (hasQuote(m?.default)) return m.default

  // 3. Double-wrapped default (CJS-in-ESM interop)
  if (hasQuote(m?.default?.default)) return m.default.default

  // 4. Default export is a class constructor — `new` it
  if (typeof m?.default === 'function') {
    try {
      const inst = new m.default()
      if (hasQuote(inst)) return inst
    } catch {
      /* fall through to factory attempt */
    }
    // 5. Default export is a factory function — call it
    try {
      const inst = m.default()
      if (hasQuote(inst)) return inst
    } catch {
      /* fall through to diagnostic */
    }
  }

  // 6. Diagnostic: dump everything we can about the shape so we can fix it.
  const diag: Record<string, unknown> = {}
  try {
    diag.topKeys = m ? Object.keys(m).slice(0, 20) : typeof m
    diag.defaultType = typeof m?.default
    diag.defaultCtor = m?.default?.constructor?.name
    if (m?.default && typeof m.default === 'object') {
      diag.defaultKeys = Object.keys(m.default).slice(0, 20)
      const proto = Object.getPrototypeOf(m.default)
      if (proto && proto !== Object.prototype) {
        diag.defaultProtoKeys = Object.getOwnPropertyNames(proto).slice(0, 20)
      }
    }
  } catch (e) {
    diag.introspectionError = (e as Error).message
  }
  throw new Error(`yahoo-finance2 shape: ${JSON.stringify(diag)}`)
}

let yahooPromise: Promise<YahooFinanceInstance> | null = null
function getYahooFinance(): Promise<YahooFinanceInstance> {
  if (!yahooPromise) {
    yahooPromise = nativeImport('yahoo-finance2').then(resolveInstance)
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
