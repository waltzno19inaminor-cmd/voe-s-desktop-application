import { invoke } from '@tauri-apps/api/core'

export interface Mt5Connection {
  mode?: 'local'
  /** Optional path to terminal64.exe. */
  path?: string
  login?: number
  password?: string
  server?: string
  timeout?: number
  portable?: boolean
}

export type Mt5Action =
  | 'connect'
  | 'status'
  | 'shutdown'
  | 'version'
  | 'terminal_info'
  | 'account_info'
  | 'symbols_total'
  | 'symbols_get'
  | 'symbol_info'
  | 'symbol_info_tick'
  | 'symbol_select'
  | 'copy_rates_from_pos'
  | 'copy_rates_from'
  | 'copy_rates_range'
  | 'copy_ticks_from'
  | 'copy_ticks_range'
  | 'positions_get'
  | 'orders_get'
  | 'history_orders_get'
  | 'history_deals_get'
  | 'order_calc_margin'
  | 'order_calc_profit'
  | 'order_check'
  | 'order_send'

export interface Mt5Request {
  action: Mt5Action
  connection: Mt5Connection
  params?: Record<string, unknown>
  /** Optional path to a Python executable with MetaTrader5 installed. */
  pythonPath?: string
}

export const mt5Request = async <T = unknown>(request: Mt5Request): Promise<T> => {
  try {
    return await invoke<T>('mt5_request', { request })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message || 'MetaTrader 5 request failed.')
  }
}

export const testMt5Connection = (connection: Mt5Connection) =>
  mt5Request<{
    connected: boolean
    terminalInfo: Record<string, unknown> | null
    version: unknown
    accountInfo: Record<string, unknown> | null
  }>({ action: 'connect', connection })

export const getMt5Rates = (
  connection: Mt5Connection,
  params: {
    symbol: string
    timeframe: string | number
    startPos?: number
    count?: number
  }
) => mt5Request({
  action: 'copy_rates_from_pos',
  connection,
  params
})

export const getMt5Positions = (connection: Mt5Connection, symbol?: string) =>
  mt5Request({
    action: 'positions_get',
    connection,
    params: symbol ? { symbol } : undefined
  })

export const sendMt5Order = (
  connection: Mt5Connection,
  request: Record<string, unknown>
) => mt5Request({
  action: 'order_send',
  connection,
  params: { request }
})
