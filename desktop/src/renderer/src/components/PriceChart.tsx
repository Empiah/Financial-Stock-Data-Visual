import { useEffect, useRef } from 'react'
import type { ISeriesApi, LineData, SeriesMarker, Time } from 'lightweight-charts'
import { LineStyle } from 'lightweight-charts'
import { createThemedChart } from './chartBase'
import type { Candle, Series } from '../lib/indicators'
import type { SignalMarker } from '../lib/signals'

interface Props {
  candles: Candle[]
  ema12: Series[]
  ema26: Series[]
  regression: Series[]
  dualBuy: SignalMarker[]
  dualSell: SignalMarker[]
}

const toLine = (s: Series[]): LineData<Time>[] =>
  s.map((p) => ({ time: p.date as Time, value: p.value }))

export function PriceChart(props: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createThemedChart(containerRef.current)

    const priceSeries: ISeriesApi<'Line'> = chart.addLineSeries({
      color: '#e6edf3',
      lineWidth: 2
    })
    priceSeries.setData(
      props.candles.map((c) => ({ time: c.date as Time, value: c.close }))
    )

    const ema12Series = chart.addLineSeries({ color: '#2f81f7', lineWidth: 1 })
    ema12Series.setData(toLine(props.ema12))

    const ema26Series = chart.addLineSeries({ color: '#f0883e', lineWidth: 1 })
    ema26Series.setData(toLine(props.ema26))

    const regressionSeries = chart.addLineSeries({
      color: '#e5484d',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed
    })
    regressionSeries.setData(toLine(props.regression))

    // Dual-signal markers: the green '^' / red 'v' arrows on the price chart,
    // port of the `stock_up` / `stock_down` points in
    // StockDataVisualiser.py:182-183 and 195-196.
    const markers: SeriesMarker<Time>[] = [
      ...props.dualBuy.map(
        (m): SeriesMarker<Time> => ({
          time: m.date as Time,
          position: 'belowBar',
          color: '#26a269',
          shape: 'arrowUp',
          text: 'BUY'
        })
      ),
      ...props.dualSell.map(
        (m): SeriesMarker<Time> => ({
          time: m.date as Time,
          position: 'aboveBar',
          color: '#e5484d',
          shape: 'arrowDown',
          text: 'SELL'
        })
      )
    ].sort((a, b) => String(a.time).localeCompare(String(b.time)))
    priceSeries.setMarkers(markers)

    chart.timeScale().fitContent()

    return () => chart.remove()
  }, [props])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
