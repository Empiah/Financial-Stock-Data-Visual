/**
 * Ambient type declarations for JS-only dependencies used by the main process.
 */

declare module 'google-trends-api' {
  interface InterestOverTimeOptions {
    keyword: string | string[]
    startTime?: Date
    endTime?: Date
    geo?: string
    hl?: string
    timezone?: number
    category?: number
    granularTimeResolution?: boolean
  }

  const googleTrends: {
    interestOverTime(options: InterestOverTimeOptions): Promise<string>
    relatedQueries(options: InterestOverTimeOptions): Promise<string>
    relatedTopics(options: InterestOverTimeOptions): Promise<string>
    dailyTrends(options: InterestOverTimeOptions): Promise<string>
    realTimeTrends(options: InterestOverTimeOptions): Promise<string>
  }

  export default googleTrends
}
