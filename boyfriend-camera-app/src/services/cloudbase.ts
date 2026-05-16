/**
 * cloudbase.ts - CloudBase HTTP API 调用
 * 直接使用 fetch 调用云函数，无需 JS SDK（SDK 不兼容 React Native）
 *
 * 云函数 HTTP 调用格式：
 * POST https://{envId}.service.tcloudbase.com/{functionName}
 * Header: Content-Type: application/json
 *
 * 注意：未认证的 HTTP 调用有限流，生产环境应通过云接入配置认证
 */
import { Linking } from 'react-native'

const ENV_ID = 'jiulou-4gu5ljkpa1082b3c'
const REGION = 'ap-shanghai'

/**
 * 调用云函数（HTTP API 方式）
 * @param name 云函数名
 * @param data 请求参数
 * @returns 云函数返回值，失败返回 null
 */
export async function callFunction(name: string, data: object = {}): Promise<any> {
  const url = `https://${ENV_ID}.${REGION}.tcloudbase.com/tcb/${name}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TCB-EnvID': ENV_ID,
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      console.warn(`[CloudBase] HTTP ${res.status} for ${name}`)
      return null
    }

    const json = await res.json()
    // 云函数结果通常在 .data 字段
    return json.data ?? json
  } catch (e: any) {
    console.error(`[CloudBase] callFunction(${name}) failed:`, e.message)
    return null
  }
}

/**
 * 打开云控制台（调试用）
 */
export function openCloudConsole(): void {
  Linking.openURL(`https://console.cloud.tencent.com/tcb/env/${ENV_ID}`)
}
