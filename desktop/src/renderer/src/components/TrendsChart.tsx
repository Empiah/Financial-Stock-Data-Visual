import { useEffect, useRef } from 'react'
import type { Time } from 'lightweight-charts'
import { createThemedChart } from './chartBase'
import type { TrendPoint } from '../../../shared/types'

interface Props {
  trends: TrendPoint[]
}

export function TrendsChart({ trends }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createThemedChart(containerRef.current)

    const line = chart.addLineSeries({ color: '#58a6ff', lineWidth: 1 })
    line.setData(trends.map((t) => ({ time: t.date as Time, value: t.value })))

    chart.timeScale().fitContent()

    return () => chart.remove()
  }, [trends])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
