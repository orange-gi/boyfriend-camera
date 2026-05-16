/**
 * cloudbase.ts - CloudBase SDK 调用（参考知与行项目）
 * 需要 @cloudbase/adapter-rn 使 SDK 兼容 React Native
 */
import cloudbaseSDK from '@cloudbase/js-sdk'
import adapter from '@cloudbase/adapter-rn'

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
  } catch (e: any) {
    console.error(`[CloudBase] callFunction(${name}) failed:`, e?.message ?? e)
    return null
  }
}

/**
 * 打开云控制台（调试用）
 */
export function openCloudConsole(): void {
  // React Native Linking 在浏览器环境不可用
}
