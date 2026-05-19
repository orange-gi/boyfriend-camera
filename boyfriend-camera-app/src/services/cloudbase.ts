/**
 * cloudbase.ts - CloudBase SDK 调用（参考知与行项目）
 * 需要 @cloudbase/adapter-rn 使 SDK 兼容 React Native
 */
import cloudbaseSDK from '@cloudbase/js-sdk'
import adapter from '@cloudbase/adapter-rn'
import { logger } from '../utils/logger'

cloudbaseSDK.useAdapters(adapter)

const ENV_ID = 'jiulou-4gu5ljkpa1082b3c'
const REGION = 'ap-shanghai'

const app = cloudbaseSDK.init({
  env: ENV_ID,
  region: REGION,
})

/**
 * 调用云函数
 * @param name 云函数名
 * @param data 请求参数
 * @returns 云函数返回值，失败返回 null
 */
export async function callFunction(name: string, data: object = {}): Promise<any> {
  try {
    const res = await app.callFunction({ name, data })
    return res.result ?? res
  } catch (e: unknown) {
    // 细化错误类型，便于模板同步服务判断失败原因
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
      logger.warn('CloudBase', `callFunction(${name}) 认证失败，请检查 CloudBase 配置`)
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
