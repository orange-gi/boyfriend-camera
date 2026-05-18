/**
 * templateSync.ts - 模板同步服务
 * 从云函数获取模板增量包，缓存到 AsyncStorage
 * 云函数不可用时 fallback 到内置默认模板
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { callFunction } from './cloudbase'
import { DEFAULT_TEMPLATES } from './defaultTemplates'
import type { PoseTemplate } from '../components/camera/PoseTemplateOverlay'

const TEMPLATE_CACHE_PREFIX = 'template_cache_v'
const LOCAL_VERSION_KEY = 'template_version'

export interface TemplateUpdate {
  latestVersion: number
  update: PoseTemplate[]
}

export async function getLocalVersion(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(LOCAL_VERSION_KEY)
    if (!v) return 0
    const parsed = parseInt(v, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  } catch {
    return 0
  }
}

export async function setLocalVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(LOCAL_VERSION_KEY, String(version))
}

export async function syncTemplates(): Promise<PoseTemplate[]> {
  const localVersion = await getLocalVersion()

  try {
    // 调用云函数检查更新
    const res = await callFunction('getTemplates', { localVersion })
    if (!res) throw new Error('云函数返回为空')

    // CloudBase 云函数结果可能在 res 或 res.result 中
    const data: TemplateUpdate = res.result ?? res

    // 如果没有有效数据
    if (!data || !Array.isArray(data.update)) {
      throw new Error('云函数返回数据格式异常')
    }

    // 云端无更新
    if (data.latestVersion <= localVersion) {
      // 无更新，当前版本: 
      return getCachedTemplates()
    }

    // 云端返回完整模板集，缓存并返回
    const templates = data.update
    await AsyncStorage.setItem(
      TEMPLATE_CACHE_PREFIX + data.latestVersion,
      JSON.stringify(templates)
    )
    await setLocalVersion(data.latestVersion)
    // 已更新到新版本，共 
    return templates
  } catch (e) {
    console.warn('[TemplateSync] 云函数不可用，使用离线模板:', (e as Error).message)
    // 无缓存且云函数不可用 → 返回内置默认模板
    const cached = await getCachedTemplates()
    if (cached.length > 0) return cached
    return DEFAULT_TEMPLATES
  }
}

export async function getCachedTemplates(): Promise<PoseTemplate[]> {
  const localVersion = await getLocalVersion()
  if (localVersion === 0) return []
  try {
    const cached = await AsyncStorage.getItem(TEMPLATE_CACHE_PREFIX + localVersion)
    if (cached) {
      const templates = JSON.parse(cached) as PoseTemplate[]
      if (templates.length > 0) return templates
    }
  } catch {
    // ignore
  }
  // 缓存为空，返回默认模板
  return DEFAULT_TEMPLATES
}
