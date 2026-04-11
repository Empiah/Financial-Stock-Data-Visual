import googleTrends from 'google-trends-api'
import type { TrendPoint } from '../shared/types'

/**
 * Port of get_google_trends_info() in ../../../StockDataVisualiser.py (lines 63–75).
 * The Python original uses timeframe='today 12-m'; we mirror that by asking for
 * the last 12 months.
 */
export async function fetchTrends(keyword: string): Promise<TrendPoint[]> {
  if (!keyword) return []

  const startTime = new Date()
  startTime.setMonth(startTime.getMonth() - 12)

  const raw = await googleTrends.interestOverTime({ keyword, startTime })
  const parsed = JSON.parse(raw) as {
    default?: {
      timelineData?: Array<{ time: string; value: number[] }>
    }
  }

  const timeline = parsed.default?.timelineData ?? []
  return timeline.map((row) => ({
    date: new Date(Number(row.time) * 1000).toISOString().slice(0, 10),
    value: row.value?.[0] ?? 0
  }))
}
