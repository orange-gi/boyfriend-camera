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
 * 留空则不会初始化 CloudBase 请求，模板走内置离线数据。
 */
const ACCESS_KEY =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL2ppdWxvdS00Z3U1bGprcGExMDgyYjNjLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJqaXVsb3UtNGd1NWxqa3BhMTA4MmIzYyIsImV4cCI6NDA3NDc0MDQ2NiwiaWF0IjoxNzcxMDU3MjY2LCJub25jZSI6Ii1kVUk2SXlmUzFDa3RqYmNhdFJreEEiLCJhdF9oYXNoIjoiLWRVSTZJeWZTMUNrdGpiY2F0Umt4QSIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJqaXVsb3UtNGd1NWxqa3BhMTA4MmIzYyIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.VrM9iw5UknDhZPKlefu-80EbSdgtNS3Ko1LCbit4ZxnV9NKP2yDm_rhUdevRFc8-FLv7zSNyODHcPqwLrZ4FZpxxYnGq8ytXavOTPEGaRk5_-DWGsdErUFMhjGI_gKdBmIheAAzKt-QLebae4iFQZAbF9iNZq9xVrs7ip2nD9qIEaUvshtpU9NXWDy2KPLUM8ZnmxaHxNGwhS2Yy7wnP8F8-UGzCU0IbUIt_Q6IdxgLtp0q4OR4GT5OAYaMV6MAZGR3iQcwmNFBoKNqvkSvTheUPgrxzmGGJUezSRC2gs9T1x8V0EsPmUX8ju3Gq-LepwpKGDnKFNcu47dA5j7dW3Q'

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
export async function callFunction(name: string, data: object = {}): Promise<any> {
  if (!app) return null

  try {
    const res = await app.callFunction({ name, data })
    return res.result ?? res
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
