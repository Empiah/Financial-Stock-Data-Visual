import { contextBridge, ipcRenderer } from 'electron'
import type { IpcResult, StockResult, TrendPoint } from '../shared/types'

const api = {
  fetchStock: (ticker: string): Promise<IpcResult<StockResult>> =>
    ipcRenderer.invoke('fetch-stock', ticker),
  fetchTrends: (keyword: string): Promise<IpcResult<TrendPoint[]>> =>
    ipcRenderer.invoke('fetch-trends', keyword)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
