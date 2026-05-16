/**
 * templateSync.ts - 模板同步服务
 * 从云函数获取模板增量包，缓存到 AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { callFunction } from './cloudbase'
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
    return v ? parseInt(v, 10) : 0
  } catch {
    return 0
  }
}

export async function setLocalVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(LOCAL_VERSION_KEY, String(version))
}

export async function syncTemplates(): Promise<PoseTemplate[]> {
  const localVersion = await getLocalVersion()
  
  // 调用云函数检查更新
  const res = await callFunction('getTemplates', { localVersion })
  if (!res) {
    // 网络不可用，返回缓存
    return getCachedTemplates()
  }
  
  const data = res.result as TemplateUpdate
  if (data.latestVersion <= localVersion) {
    console.log('[TemplateSync] 无更新，当前版本:', localVersion)
    return getCachedTemplates()
  }
  
  // 有更新，合并到缓存
  const cached = await getCachedTemplates()
  const merged = [...cached, ...data.update]
  await AsyncStorage.setItem(
    TEMPLATE_CACHE_PREFIX + data.latestVersion,
    JSON.stringify(merged)
  )
  await setLocalVersion(data.latestVersion)
  console.log('[TemplateSync] 已更新到 v' + data.latestVersion)
  
  return merged
}

export async function getCachedTemplates(): Promise<PoseTemplate[]> {
  const localVersion = await getLocalVersion()
  if (localVersion === 0) return []
  try {
    const cached = await AsyncStorage.getItem(TEMPLATE_CACHE_PREFIX + localVersion)
    return cached ? JSON.parse(cached) : []
  } catch {
    return []
  }
}
