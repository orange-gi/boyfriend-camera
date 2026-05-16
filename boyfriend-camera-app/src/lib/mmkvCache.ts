// MMKV 持久化缓存工具
// 使用 react-native-mmkv 进行本地数据缓存

// Web 端不支持 react-native-mmkv，提供空实现
// 使用 Platform.OS 检测，避免 window/navigator 在 RN Web 中的误判
let isWeb = false
try {
  const { Platform } = require('react-native')
  isWeb = Platform.OS === 'web'
} catch (e) {
  // 如果无法获取 Platform，回退到 DOM 检测
  isWeb = typeof window !== 'undefined' && typeof document !== 'undefined'
}

let MMKV: any
let storage: any = null

if (!isWeb) {
  try {
    const mmkv = require('react-native-mmkv')
    MMKV = mmkv.MMKV
    storage = new MMKV({ id: 'app-cache' })
  } catch (e) {
    console.warn('react-native-mmkv not available:', e)
  }
}

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresIn: number // 毫秒
}

const CACHE_PREFIX = 'cache_'

class MMKVCache {
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    if (!storage) return
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn,
    }
    storage.set(CACHE_PREFIX + key, JSON.stringify(item))
  }

  get<T>(key: string): T | null {
    if (!storage) return null
    const json = storage.getString(CACHE_PREFIX + key)
    if (!json) return null

    try {
      const item: CacheItem<T> = JSON.parse(json)
      const now = Date.now()
      if (now - item.timestamp > item.expiresIn) {
        storage.delete(CACHE_PREFIX + key)
        return null
      }
      return item.data
    } catch {
      storage.delete(CACHE_PREFIX + key)
      return null
    }
  }

  clear(key?: string): void {
    if (!storage) return
    if (key) {
      storage.delete(CACHE_PREFIX + key)
    } else {
      // 清除所有缓存
      const keys = storage.getAllKeys()
      keys.forEach((k: string) => {
        if (k.startsWith(CACHE_PREFIX)) {
          storage.delete(k)
        }
      })
    }
  }

  has(key: string): boolean {
    if (!storage) return false
    const json = storage.getString(CACHE_PREFIX + key)
    if (!json) return false

    try {
      const item: CacheItem<any> = JSON.parse(json)
      const now = Date.now()
      if (now - item.timestamp > item.expiresIn) {
        storage.delete(CACHE_PREFIX + key)
        return false
      }
      return true
    } catch {
      storage.delete(CACHE_PREFIX + key)
      return false
    }
  }
}

export const mmkvCache = new MMKVCache()
