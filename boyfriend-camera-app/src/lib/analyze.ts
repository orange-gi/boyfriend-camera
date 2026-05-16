/**
 * 男友相机 - 照片分析客户端
 */
import { invokeFunctionSafe } from './invokeFunction'

export interface AnalyzeResult {
  score?: number
  highlights?: string[]
  suggestions?: { dimension: string; text: string }[]
  tip?: string
  analysis?: string
}

export async function analyzePhoto(
  imageBase64: string
): Promise<{ data?: AnalyzeResult; error?: string }> {
  try {
    const res = await invokeFunctionSafe('boyfriend-camera-analyze-photo', {
      body: { image_base64: imageBase64 },
    })

    if (res.code === 0 || res.code === '0') {
      return { data: res.data as AnalyzeResult }
    } else {
      return { error: res.error || '分析失败，请重试' }
    }
  } catch (e: any) {
    console.error('[analyze] 调用失败:', e)
    return { error: e?.message || '网络错误，请检查网络后重试' }
  }
}
