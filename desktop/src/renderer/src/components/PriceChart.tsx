import { useEffect, useRef } from 'react'
import type { LineData, SeriesMarker, Time } from 'lightweight-charts'
import { LineStyle } from 'lightweight-charts'
import { createThemedChart } from './chartBase'
import type { Candle, Series } from '../analysis/indicators'
import type { SignalMarker } from '../analysis/signals'

interface Props {
  candles: Candle[]
  ema12: Series[]
  ema26: Series[]
  regression: Series[]
  dualBuy: SignalMarker[]
  dualSell: SignalMarker[]
  /** When index-relative mode is on, these are rebased series */
  benchmarkLine?: Series[]
  indexRelative?: boolean
}

const toLine = (s: Series[]): LineData<Time>[] =>
  s.map((p) => ({ time: p.date as Time, value: p.value }))

export function PriceChart(props: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createThemedChart(containerRef.current)

    if (props.indexRelative && props.benchmarkLine) {
      // Relative mode: show rebased stock vs benchmark
      const stockLine = chart.addLineSeries({ color: '#e6edf3', lineWidth: 2 })
      stockLine.setData(
        props.candles.map((c) => ({ time: c.date as Time, value: c.close }))
      )

      const benchLine = chart.addLineSeries({
        color: '#f0883e',
        lineWidth: 2,
        lineStyle: LineStyle.Solid
      })
      benchLine.setData(toLine(props.benchmarkLine))

      // 100 baseline
      stockLine.createPriceLine({
        price: 100,
        color: '#7d8590',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: ''
      })
    } else {
      // Absolute mode: price + EMAs + regression + signals
      const priceSeries = chart.addLineSeries({ color: '#e6edf3', lineWidth: 2 })
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
    }

    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [props])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
