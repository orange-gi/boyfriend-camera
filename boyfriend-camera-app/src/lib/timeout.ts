const DEFAULT_TIMEOUT = 10000

/**
 * Promise 超时保护，避免资源或 API 请求无期限挂起
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout = DEFAULT_TIMEOUT,
  timeoutMessage = '请求超时，请稍后重试'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeout)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export type NormalizedErrorCode =
  | 'timeout'
  | 'network'
  | 'auth'
  | 'forbidden'
  | 'rate_limit'
  | 'server'
  | 'unknown'

export type NormalizedError = {
  code: NormalizedErrorCode
  title: string
  message: string
  retriable: boolean
}

function safeString(v: any): string {
  return typeof v === 'string' ? v : ''
}

function isLikelyTechnicalMessage(message: string): boolean {
  const m = message.trim()
  if (!m) return false
  // 过长/包含堆栈痕迹：通常不适合直接展示给用户
  if (m.length > 200) return true
  if (/\n\s*at\s+\S+/.test(m)) return true
  if (/TypeError|ReferenceError|SyntaxError/.test(m)) return true
  // 常见后端/SQL/网关等技术细节
  if (/PGRST\d+|SQLSTATE|PostgREST|relation\s+"?\w+"?\s+does not exist|column\s+"?\w+"?\s+does not exist/i.test(m)) return true
  if (/HTTP\s*\d{3}\s*:/i.test(m)) return true
  // 常见泛化错误
  if (/Edge Function returned a non-2xx status code|Failed to send a request to the Edge Function/i.test(m)) return true
  return false
}

/**
 * 将各种 error（网络/超时/HTTP）归一化成“可读、可行动”的中文提示。
 * - 不依赖具体错误类型（避免 fetch / rn 平台差异）
 * - 默认倾向于给用户“可重试”的建议
 */
export function normalizeError(error: unknown, options?: { fallbackTitle?: string; fallbackMessage?: string }): NormalizedError {
  const fallbackTitle = options?.fallbackTitle ?? '出错了'
  const fallbackMessage = options?.fallbackMessage ?? '请求失败，请稍后重试'

  const e: any = error as any
  const rawMessage = safeString(e?.message) || safeString(e?.error_description) || safeString(e?.error) || ''
  const name = safeString(e?.name)
  const status = typeof e?.status === 'number' ? e.status : typeof e?.statusCode === 'number' ? e.statusCode : undefined

  // 1) 超时/Abort
  if (/超时/.test(rawMessage) || name === 'AbortError' || /aborted/i.test(rawMessage)) {
    return {
      code: 'timeout',
      title: '网络超时',
      message: '网络请求超时。请检查网络后重试；如刚切换 Wi‑Fi/蜂窝或从后台返回，建议稍等 1-2 秒再试。',
      retriable: true,
    }
  }

  // 2) 常见网络错误（不同平台文案不一致，做关键词兜底）
  if (
    /Network request failed/i.test(rawMessage) ||
    /Failed to fetch/i.test(rawMessage) ||
    /fetch failed/i.test(rawMessage) ||
    /ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(rawMessage)
  ) {
    return {
      code: 'network',
      title: '网络异常',
      message: '网络连接异常或不可用。请检查网络/VPN/代理后重试。',
      retriable: true,
    }
  }

  // 2b) cross-fetch / 网关常见：错误名为 FetchError，message 可能为 "undefined" 或空
  // 这与 401/JWT 无关，此前误归到「登录失效」会严重误导用户
  if (name === 'FetchError' || /^FetchError\b/i.test(rawMessage)) {
    return {
      code: 'network',
      title: '数据服务暂不可用',
      message:
        '无法完成数据请求（网络中断、DNS 或云服务网关异常都有可能）。请检查网络后重试；若已登录仍失败，可稍后再试或联系支持。',
      retriable: true,
    }
  }

  // 3) 登录态/权限类（勿再把泛化的 FetchError 算进来）
  if (
    /JWT|token|unauthorized|not authorized|invalid token|expired token|登录|鉴权/i.test(rawMessage) ||
    status === 401
  ) {
    console.warn('[normalizeError] treat as auth error', {
      rawMessage,
      status,
      name,
    })
    return {
      code: 'auth',
      title: '登录已失效',
      message: '登录状态可能已过期。请返回重新登录后再试。',
      retriable: false,
    }
  }
  if (status === 403) {
    return {
      code: 'forbidden',
      title: '权限不足',
      message: '当前账号没有执行该操作的权限。',
      retriable: false,
    }
  }

  // 4) 限流与服务端异常
  if (status === 429 || /rate limit/i.test(rawMessage)) {
    return {
      code: 'rate_limit',
      title: '请求过于频繁',
      message: '请求过于频繁，请稍后再试。',
      retriable: true,
    }
  }
  if ((typeof status === 'number' && status >= 500) || /internal server error|bad gateway|service unavailable/i.test(rawMessage)) {
    return {
      code: 'server',
      title: '服务暂时不可用',
      message: '服务端暂时不可用或繁忙。请稍后重试。',
      retriable: true,
    }
  }

  // 5) 兜底：默认不直接暴露疑似技术细节
  if (rawMessage) {
    if (isLikelyTechnicalMessage(rawMessage)) {
      return {
        code: 'unknown',
        title: fallbackTitle,
        message: fallbackMessage,
        retriable: true,
      }
    }
    return {
      code: 'unknown',
      title: fallbackTitle,
      message: rawMessage,
      retriable: true,
    }
  }

  return { code: 'unknown', title: fallbackTitle, message: fallbackMessage, retriable: true }
}


