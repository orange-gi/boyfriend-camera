// 简单的内存缓存工具
interface CacheItem<T> {
  data: T
  timestamp: number
  expiresIn: number // 毫秒
}

class SimpleCache {
  private cache: Map<string, CacheItem<any>> = new Map()

  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.expiresIn) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    const now = Date.now()
    if (now - item.timestamp > item.expiresIn) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

export const cache = new SimpleCache()








