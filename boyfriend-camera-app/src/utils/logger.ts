/**
 * logger.ts - 生产级日志模块
 *
 * 特性：
 * - DEBUG 模式可通过 __DEV__ 环境变量控制
 * - 生产环境只输出 warn/error，避免性能损耗
 * - 支持日志分类（模块前缀）
 * - 保留日志格式统一性
 */

// 生产环境关闭 debug 日志
const isDebug = __DEV__

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function formatMessage(level: LogLevel, module: string, message: string, data?: unknown): string {
  const safeData = data instanceof Error ? data.message : data
  const prefix = `[${level.toUpperCase()}] [${module}]`
  const dataStr = safeData !== undefined ? ` ${safeData instanceof Object ? JSON.stringify(safeData) : String(safeData)}` : ''
  return `${prefix} ${message}${dataStr}`
}

function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  if (level === 'debug' || level === 'info') {
    if (!isDebug) return
  }
  const formatted = formatMessage(level, module, message, data)
  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (module: string, message: string, data?: unknown) => log('debug', module, message, data),
  info: (module: string, message: string, data?: unknown) => log('info', module, message, data),
  warn: (module: string, message: string, data?: unknown) => log('warn', module, message, data),
  error: (module: string, message: string, data?: unknown) => log('error', module, message, data),
}
