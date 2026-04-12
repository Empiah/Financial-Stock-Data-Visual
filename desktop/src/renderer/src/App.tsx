import { useCallback, useMemo, useState } from 'react'
import { TickerInput } from './components/TickerInput'
import { MetricsBar } from './components/MetricsBar'
import { PriceChart } from './components/PriceChart'
import { MacdChart } from './components/MacdChart'
import { RsiChart } from './components/RsiChart'
import { TrendsChart } from './components/TrendsChart'
import { PeriodSelector, periodStartDate, type Period } from './components/PeriodSelector'
import { SettingsPanel } from './components/SettingsPanel'
import { BacktestResults } from './components/BacktestResults'
import {
  computeIndicators,
  computePerformance,
  rebaseSeries,
  DEFAULT_PARAMS,
  type Candle,
  type IndicatorParams,
  type Series
} from './analysis/indicators'
import { detectSignals, backtestTrades } from './analysis/signals'
import type { StockResult, TrendPoint } from '../../shared/types'

interface LoadedState {
  stock: StockResult
  benchmark: StockResult | null
  trends: TrendPoint[] | null
}

export function App(): JSX.Element {
  const [loaded, setLoaded] = useState<LoadedState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('ALL')
  const [params, setParams] = useState<IndicatorParams>(DEFAULT_PARAMS)
  const [toleranceDays, setToleranceDays] = useState(3)
  const [indexRelative, setIndexRelative] = useState(false)

  const onSubmit = useCallback(async (ticker: string) => {
    setLoading(true)
    setError(null)
    try {
      const [stockRes, benchRes, trendsDeferred] = await Promise.all([
        window.api.fetchStock(ticker),
        window.api.fetchBenchmark(),
        null // start trends after we know the name
      ])
      void trendsDeferred
      if (!stockRes.ok) {
        setError(stockRes.error)
        setLoaded(null)
        return
      }
      const stock = stockRes.data
      const benchmark = benchRes.ok ? benchRes.data : null

      const trendsRes = await window.api.fetchTrends(stock.shortName)
      const trends = trendsRes.ok ? trendsRes.data : null

      setLoaded({ stock, benchmark, trends })
    } catch (err) {
      setError((err as Error).message)
      setLoaded(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const derived = useMemo(() => {
    if (!loaded) return null

    // Build candles from full history
    const allCandles: Candle[] = loaded.stock.prices.map((p) => ({
      date: p.date,
      close: p.close
    }))

    // Filter to visible period
    const startDate = periodStartDate(period)
    const candles = startDate
      ? allCandles.filter((c) => c.date >= startDate)
      : allCandles

    if (candles.length === 0) return null

    // Compute indicators on the VISIBLE candles (so regression fits the visible range)
    // but for MACD/RSI accuracy with warmup, compute on full then slice
    const fullIndicators = computeIndicators(allCandles, params)

    // Slice indicator series to the visible date range
    const sliceVisible = (series: Series[]): Series[] =>
      startDate ? series.filter((s) => s.date >= startDate) : series

    const indicators = {
      ...fullIndicators,
      macdLine: sliceVisible(fullIndicators.macdLine),
      macdSignalLine: sliceVisible(fullIndicators.macdSignalLine),
      macdHist: sliceVisible(fullIndicators.macdHist),
      rsi: sliceVisible(fullIndicators.rsi),
      ema12: sliceVisible(fullIndicators.ema12),
      ema26: sliceVisible(fullIndicators.ema26),
      regression: sliceVisible(fullIndicators.regression)
    }

    // Recompute regression for the visible window
    const visDates = candles.map((c) => c.date)
    const visCloses = candles.map((c) => c.close)
    indicators.regression = visDates.map((d, i) => {
      const n = visCloses.length
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
      for (let j = 0; j < n; j++) {
        sumX += j; sumY += visCloses[j]!
        sumXY += j * visCloses[j]!; sumXX += j * j
      }
      const denom = n * sumXX - sumX * sumX
      const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
      const intercept = (sumY - slope * sumX) / n
      return { date: d, value: intercept + slope * i }
    })

    const closeByDate = new Map(allCandles.map((c) => [c.date, c.close]))
    const signals = detectSignals(
      closeByDate,
      fullIndicators.macdLine,
      fullIndicators.macdSignalLine,
      fullIndicators.rsi,
      toleranceDays
    )

    // Filter signals to visible range for display
    const filterMarkers = (markers: { date: string; price: number }[]) =>
      startDate ? markers.filter((m) => m.date >= startDate) : markers

    const visibleSignals = {
      ...signals,
      macdBuy: filterMarkers(signals.macdBuy),
      macdSell: filterMarkers(signals.macdSell),
      rsiBuy: filterMarkers(signals.rsiBuy),
      rsiSell: filterMarkers(signals.rsiSell),
      dualBuy: filterMarkers(signals.dualBuy),
      dualSell: filterMarkers(signals.dualSell)
    }

    const trades = backtestTrades(visibleSignals.dualBuy, visibleSignals.dualSell)
    const performance = computePerformance(loaded.stock.prices)

    // Index-relative data
    let benchmarkLine: Series[] | undefined
    let relativeCandles: Candle[] | undefined
    if (indexRelative && loaded.benchmark) {
      const stockSeries: Series[] = candles.map((c) => ({
        date: c.date,
        value: c.close
      }))
      const benchSeries: Series[] = loaded.benchmark.prices.map((p) => ({
        date: p.date,
        value: p.close
      }))
      const filtered = startDate
        ? benchSeries.filter((s) => s.date >= startDate)
        : benchSeries
      const rebased = rebaseSeries(stockSeries, filtered)
      benchmarkLine = rebased.benchmark
      relativeCandles = rebased.stock.map((s) => ({
        date: s.date,
        close: s.value
      }))
    }

    return {
      candles: relativeCandles ?? candles,
      indicators,
      signals: visibleSignals,
      trades,
      performance,
      benchmarkLine
    }
  }, [loaded, period, params, toleranceDays, indexRelative])

  const hasTrends = !!(loaded?.trends && loaded.trends.length > 0)

  return (
    <div className="app">
      <div className="titlebar">Stock Visualizer</div>
      <div className="toolbar">
        <h1>
          {loaded
            ? `${loaded.stock.shortName} (${loaded.stock.ticker})`
            : 'Stock Visualizer'}
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
        <>
          <MetricsBar
            price={derived.indicators.latest.price}
            macd={derived.indicators.latest.macd}
            rsi={derived.indicators.latest.rsi}
            performance={derived.performance}
          />
          <SettingsPanel
            params={params}
            toleranceDays={toleranceDays}
            indexRelative={indexRelative}
            onParamsChange={setParams}
            onToleranceChange={setToleranceDays}
            onIndexRelativeChange={setIndexRelative}
          />
          <div className={`charts ${hasTrends ? '' : 'no-trends'}`}>
            <div className="panel">
              <h2>
                {indexRelative
                  ? 'Performance vs S&P 500 (rebased to 100)'
                  : 'Stock Price'}
              </h2>
              <div className="chart">
                <PriceChart
                  candles={derived.candles}
                  ema12={derived.indicators.ema12}
                  ema26={derived.indicators.ema26}
                  regression={derived.indicators.regression}
                  dualBuy={derived.signals.dualBuy}
                  dualSell={derived.signals.dualSell}
                  benchmarkLine={derived.benchmarkLine}
                  indexRelative={indexRelative}
                />
              </div>
            </div>
            <div className="panel">
              <h2>MACD ({params.macdFast}, {params.macdSlow}, {params.macdSignal})</h2>
              <div className="chart">
                <MacdChart
                  macdLine={derived.indicators.macdLine}
                  macdSignalLine={derived.indicators.macdSignalLine}
                  macdHist={derived.indicators.macdHist}
                  buy={derived.signals.macdBuy}
                  sell={derived.signals.macdSell}
                />
              </div>
            </div>
            <div className="panel">
              <h2>RSI ({params.rsiPeriod})</h2>
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
          <PeriodSelector value={period} onChange={setPeriod} />
          {derived.trades.length > 0 && (
            <BacktestResults trades={derived.trades} />
          )}
        </>
      )}
    </div>
  )
}
