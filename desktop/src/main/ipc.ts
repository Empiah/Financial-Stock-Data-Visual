import { ipcMain } from 'electron'
import { fetchDailyPrices, fetchBenchmark } from './yahoo'
import { fetchTrends } from './trends'

export function registerIpcHandlers(): void {
  ipcMain.handle('fetch-stock', async (_evt, ticker: string) => {
    try {
      const data = await fetchDailyPrices(ticker)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: (err as Error).message ?? String(err) }
    }
  })

  ipcMain.handle('fetch-benchmark', async () => {
    try {
      const data = await fetchBenchmark()
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: (err as Error).message ?? String(err) }
    }
  })

  ipcMain.handle('fetch-trends', async (_evt, keyword: string) => {
    try {
      const data = await fetchTrends(keyword)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: (err as Error).message ?? String(err) }
    }
  })
}
