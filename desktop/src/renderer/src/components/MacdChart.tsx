import { useEffect, useRef } from 'react'
import type { LineData, SeriesMarker, Time } from 'lightweight-charts'
import { createThemedChart } from './chartBase'
import type { Series } from '../analysis/indicators'
import type { SignalMarker } from '../analysis/signals'

interface Props {
  macdFast: Series[]
  macdSlow: Series[]
  buy: SignalMarker[]
  sell: SignalMarker[]
}

const toLine = (s: Series[]): LineData<Time>[] =>
  s.map((p) => ({ time: p.date as Time, value: p.value }))

export function MacdChart(props: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createThemedChart(containerRef.current)

    const macdLine = chart.addLineSeries({ color: '#2f81f7', lineWidth: 1 })
    macdLine.setData(toLine(props.macdFast))

    const signalLine = chart.addLineSeries({ color: '#f0883e', lineWidth: 1 })
    signalLine.setData(toLine(props.macdSlow))

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
    macdLine.setMarkers(markers)

    chart.timeScale().fitContent()

    return () => chart.remove()
  }, [props])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
