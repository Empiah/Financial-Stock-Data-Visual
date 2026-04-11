import { useEffect, useRef } from 'react'
import type { LineData, SeriesMarker, Time } from 'lightweight-charts'
import { createThemedChart } from './chartBase'
import type { Series } from '../analysis/indicators'
import type { SignalMarker } from '../analysis/signals'

interface Props {
  rsi: Series[]
  buy: SignalMarker[]
  sell: SignalMarker[]
}

const toLine = (s: Series[]): LineData<Time>[] =>
  s.map((p) => ({ time: p.date as Time, value: p.value }))

export function RsiChart(props: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createThemedChart(containerRef.current)

    const rsiLine = chart.addLineSeries({ color: '#8957e5', lineWidth: 1 })
    rsiLine.setData(toLine(props.rsi))

    // Reference lines at 30 / 70 — ports of axarr[2].axhline(30/70) in
    // StockDataVisualiser.py:221-222
    rsiLine.createPriceLine({
      price: 30,
      color: '#26a269',
      lineWidth: 1,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: '30'
    })
    rsiLine.createPriceLine({
      price: 70,
      color: '#e5484d',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '70'
    })

    const markers: SeriesMarker<Time>[] = [
      ...props.buy.map(
        (m): SeriesMarker<Time> => ({
          time: m.date as Time,
          position: 'belowBar',
          color: '#26a269',
          shape: 'arrowUp'
        })
      ),
      ...props.sell.map(
        (m): SeriesMarker<Time> => ({
          time: m.date as Time,
          position: 'aboveBar',
          color: '#e5484d',
          shape: 'arrowDown'
        })
      )
    ].sort((a, b) => String(a.time).localeCompare(String(b.time)))
    rsiLine.setMarkers(markers)

    chart.timeScale().fitContent()

    return () => chart.remove()
  }, [props])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
