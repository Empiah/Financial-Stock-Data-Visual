import { useCallback, useMemo, useState } from 'react'
import { TickerInput } from './components/TickerInput'
import { PriceChart } from './components/PriceChart'
import { MacdChart } from './components/MacdChart'
import { RsiChart } from './components/RsiChart'
import { TrendsChart } from './components/TrendsChart'
import { computeIndicators, type Candle } from './analysis/indicators'
import { detectSignals } from './analysis/signals'
import type { StockResult, TrendPoint } from '../../shared/types'

interface LoadedState {
  stock: StockResult
  trends: TrendPoint[] | null
}

export function App(): JSX.Element {
  const [loaded, setLoaded] = useState<LoadedState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = useCallback(async (ticker: string) => {
    setLoading(true)
    setError(null)
    try {
      const stockRes = await window.api.fetchStock(ticker)
      if (!stockRes.ok) {
        setError(stockRes.error)
        setLoaded(null)
        return
      }
      const stock = stockRes.data

      // Best-effort Google Trends — hidden if it fails, matching
      // StockDataVisualiser.py:225-229
      const trendsRes = await window.api.fetchTrends(stock.shortName)
      const trends = trendsRes.ok ? trendsRes.data : null

      setLoaded({ stock, trends })
    } catch (err) {
      setError((err as Error).message)
      setLoaded(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const derived = useMemo(() => {
    if (!loaded) return null
    const candles: Candle[] = loaded.stock.prices.map((p) => ({
      date: p.date,
      close: p.close
    }))
    const indicators = computeIndicators(candles)
    const closeByDate = new Map(candles.map((c) => [c.date, c.close]))
    const signals = detectSignals(
      closeByDate,
      indicators.macdFast,
      indicators.macdSlow,
      indicators.rsi
    )
    return { candles, indicators, signals }
  }, [loaded])

  const hasTrends = !!(loaded?.trends && loaded.trends.length > 0)

  return (
    <div className="app">
      <div className="titlebar">Stock Visualizer</div>
      <div className="toolbar">
        <h1>
          {loaded ? `${loaded.stock.shortName} (${loaded.stock.ticker})` : 'Stock Visualizer'}
        </h1>
        <TickerInput onSubmit={onSubmit} disabled={loading} />
        <div className="status">
          {loading && 'Loading…'}
          {error && <span className="error">{error}</span>}
        </div>
      </div>

      {!loaded || !derived ? (
        <div className="empty">
          {loading
            ? 'Fetching data…'
            : error
              ? `Could not load: ${error}`
              : 'Type a ticker (e.g. AAPL, MSFT, TSLA) and press Enter.'}
        </div>
      ) : (
        <div className={`charts ${hasTrends ? '' : 'no-trends'}`}>
          <div className="panel">
            <h2>Stock Price</h2>
            <div className="chart">
              <PriceChart
                candles={derived.candles}
                ema12={derived.indicators.ema12}
                ema26={derived.indicators.ema26}
                regression={derived.indicators.regression}
                dualBuy={derived.signals.dualBuy}
                dualSell={derived.signals.dualSell}
              />
            </div>
          </div>
          <div className="panel">
            <h2>MACD</h2>
            <div className="chart">
              <MacdChart
                macdFast={derived.indicators.macdFast}
                macdSlow={derived.indicators.macdSlow}
                buy={derived.signals.macdBuy}
                sell={derived.signals.macdSell}
              />
            </div>
          </div>
          <div className="panel">
            <h2>RSI</h2>
            <div className="chart">
              <RsiChart
                rsi={derived.indicators.rsi}
                buy={derived.signals.rsiBuy}
                sell={derived.signals.rsiSell}
              />
            </div>
          </div>
          {hasTrends && (
            <div className="panel">
              <h2>Google Trends — {loaded.stock.shortName}</h2>
              <div className="chart">
                <TrendsChart trends={loaded.trends!} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
