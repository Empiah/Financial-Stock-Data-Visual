/**
 * Shared types used across main, preload, and renderer processes.
 * Keeping these here avoids cross-boundary imports and keeps each tsconfig
 * `include` honest about what it compiles.
 */

export interface PricePoint {
  date: string // ISO yyyy-mm-dd
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockResult {
  ticker: string
  shortName: string
  prices: PricePoint[]
}

export interface TrendPoint {
  date: string
  value: number
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
