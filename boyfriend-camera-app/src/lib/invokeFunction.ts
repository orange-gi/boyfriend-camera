/**
 * Edge Function 调用工具
 * 
 * 云函数调用（CloudBase）
 * 迁移时间: 2024-02
 */

import { cloudbaseClient } from './cloudbase'

function safeJsonParse(input: unknown): any | null {
  try {
    if (typeof input !== 'string') return input && typeof input === 'object' ? input : null
    return JSON.parse(input)
  } catch {
    return null
  }
}

function pickFirstString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c
  }
  return ''
}

function extractFromErrorContext(error: any): string {
  const ctx = error?.context
  if (!ctx) return ''
  const body = safeJsonParse(ctx?.body)
  const resp = safeJsonParse(ctx?.response)
  return pickFirstString(
    body?.error,
    body?.message,
    body?.details,
    resp?.error,
    resp?.message,
    resp?.details
  )
}

function extractFromData(data: any): string {
  if (!data) return ''

  // 常见形态 1：{ success: false, error/details/message }
  if (data?.success === false) {
    // data.error 可能是字符串，也可能是 { code, message } 对象
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.error === 'object' && data?.error) {
      return pickFirstString(
        data.error?.message,
        data.error?.details,
        data.error?.code,
        data.error?.hint,
      )
    }
    return pickFirstString(data?.details, data?.message, data?.hint)
  }

  // 常见形态 2：{ error: "xxx" } 或 { error: { message/details } }
  if (data?.error) {
    if (typeof data.error === 'string') return data.error
    return pickFirstString(data.error?.message, data.error?.details, data.error?.hint)
  }

  return ''
}

export type InvokeFunctionSafeOptions = {
  body?: Record<string, any>
  /**
   * 兜底文案：当无法从 error/context/data 提取可读错误时使用。
   */
  fallbackMessage?: string
}

/**
 * 统一调用 Cloudbase Function：
 * - 兼容各种错误格式
 * - 尽量抛出"可给用户看"的 message
 * - INVALID_APP_SIGN 错误触发 waitForAuthToken 后重试一次（race condition 兜底）
 */
export async function invokeFunctionSafe<T = any>(name: string, options?: InvokeFunctionSafeOptions): Promise<T> {
  const invoke = () => cloudbaseClient.functions.invoke(name, { body: options?.body ?? {} })

  let result = await invoke()

  // INVALID_APP_SIGN：SDK token 尚未同步到 callFunction 请求头，触发一次 waitForAuthToken 后重试
  if (result.error) {
    const rawMsg = (result.error as any)?.message ?? ''
    const ctxMsg = extractFromErrorContext(result.error)
    const combinedMsg = rawMsg || ctxMsg
    if (combinedMsg.includes('INVALID_APP_SIGN')) {
      console.warn('[invokeFunctionSafe] 检测到 INVALID_APP_SIGN，等待 token 就绪后重试...')
      const { waitForAuthToken } = await import('./cloudbase')
      await waitForAuthToken()
      result = await invoke()
    }
  }

  if (result.error) {
    const extracted =
      extractFromErrorContext(result.error) ||
      pickFirstString((result.error as any)?.details, (result.error as any)?.message) ||
      ''

    const isGenericInvokeError =
      extracted === 'Function returned a non-2xx status code' ||
      extracted === 'Failed to send a request to the Function'

    const message = !isGenericInvokeError && extracted ? extracted : options?.fallbackMessage || '请求失败，请稍后重试'
    const e: any = new Error(message)
    throw e
  }

  // application-level error in body
  const dataMsg = extractFromData(result.data)
  if (dataMsg) {
    throw new Error(dataMsg)
  }

  // 兜底：明确检查 success: false 但无有效错误信息的情况
  if (result.data?.success === false) {
    throw new Error(options?.fallbackMessage || '请求失败，请稍后重试')
  }

  return result.data as T
}

