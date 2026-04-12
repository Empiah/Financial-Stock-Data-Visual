import { useEffect, useRef } from 'react'
import type { HistogramData, LineData, SeriesMarker, Time } from 'lightweight-charts'
import { createThemedChart } from './chartBase'
import type { Series } from '../analysis/indicators'
import type { SignalMarker } from '../analysis/signals'

interface Props {
  macdLine: Series[]
  macdSignalLine: Series[]
  macdHist: Series[]
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

    // Histogram bars — green when positive, red when negative
    const histSeries = chart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false
    })
    histSeries.setData(
      props.macdHist.map(
        (p): HistogramData<Time> => ({
          time: p.date as Time,
          value: p.value,
          color: p.value >= 0 ? 'rgba(38,162,105,0.5)' : 'rgba(229,72,77,0.5)'
        })
      )
    )

    const macdLine = chart.addLineSeries({ color: '#2f81f7', lineWidth: 2 })
    macdLine.setData(toLine(props.macdLine))

    const signalLine = chart.addLineSeries({ color: '#f0883e', lineWidth: 2 })
    signalLine.setData(toLine(props.macdSignalLine))

    // Zero line
    macdLine.createPriceLine({
      price: 0,
      color: '#7d8590',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: ''
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
    macdLine.setMarkers(markers)

    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [props])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
