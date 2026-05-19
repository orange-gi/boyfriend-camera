/**
 * cloudbase.ts - CloudBase SDK 调用（参考知与行项目）
 * 需要 @cloudbase/adapter-rn 使 SDK 兼容 React Native
 *
 * 默认不启用云端调用（无需任何登录）。
 * 若需从云函数拉取模板，在下方填入 Publishable API Key（控制台 → ApiKey 管理）。
 */
import cloudbaseSDK from '@cloudbase/js-sdk'
import adapter from '@cloudbase/adapter-rn'
import { logger } from '../utils/logger'

cloudbaseSDK.useAdapters(adapter)

const ENV_ID = 'jiulou-4gu5ljkpa1082b3c'
const REGION = 'ap-shanghai'

/**
 * Publishable API Key：应用级凭证，不是用户登录。
 * 优先从 process.env.ACCESS_KEY 读取（由 metro.config.js 从 .env 文件加载）。
 * .env 文件已加入 .gitignore，不会提交到 GitHub。
 * 留空则不会初始化 CloudBase 请求，模板走内置离线数据。
 */
const ACCESS_KEY: string = process.env.ACCESS_KEY ?? ''

/** 是否启用云端 API（需配置 ACCESS_KEY） */
export const isCloudEnabled = (): boolean => ACCESS_KEY.length > 0

const app = isCloudEnabled()
  ? cloudbaseSDK.init({
      env: ENV_ID,
      region: REGION,
      accessKey: ACCESS_KEY,
    })
  : null

/**
 * 调用云函数
 * @param name 云函数名
 * @param data 请求参数
 * @returns 云函数返回值，未启用云端或失败时返回 null
 */
/** CloudBase 云函数响应包装 */
interface CloudBaseResponse<R> {
  result?: R
  requestId?: string
}

export async function callFunction<R = unknown>(name: string, data: object = {}): Promise<R | null> {
  if (!app) return null

  try {
    const res = await app.callFunction({ name, data }) as CloudBaseResponse<R>
    return res.result ?? null
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
      logger.warn('CloudBase', `callFunction(${name}) 认证失败，请检查 ACCESS_KEY`)
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('network')) {
      logger.warn('CloudBase', `callFunction(${name}) 网络超时，将使用离线模板`)
    } else if (msg.includes('function not found') || msg.includes('FunctionNotFound')) {
      logger.warn('CloudBase', `callFunction(${name}) 云函数不存在`)
    } else {
      logger.warn('CloudBase', `callFunction(${name}) 调用失败: ${msg}`)
    }
    return null
  }
}

/**
 * 打开云控制台（调试用）
 */
export function openCloudConsole(): void {
  // React Native Linking 在浏览器环境不可用，生产环境可通过 scheme 跳转
}
