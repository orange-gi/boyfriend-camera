// 跨平台存储工具
// 在 Web 环境下使用 localStorage，在 React Native 环境下使用 AsyncStorage
// 延迟加载，避免在 bundle.js 加载时崩溃

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

// 空实现，用于构建时或错误情况
const emptyStorage: StorageAdapter = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
}

let storageAdapter: StorageAdapter | null = null

function getStorage(): StorageAdapter {
  // 如果已经初始化，直接返回
  if (storageAdapter) {
    return storageAdapter
  }

  try {
    // 检测环境
    const hasWindow = typeof window !== 'undefined'
    const hasDocument = typeof document !== 'undefined'
    const hasReactNativeBridge = typeof globalThis !== 'undefined' && (globalThis as any).__fbBatchedBridge

    // 构建时（Node.js 环境），使用空实现
    if (!hasWindow && !hasReactNativeBridge) {
      storageAdapter = emptyStorage
      return storageAdapter
    }

    // Web 环境：使用 localStorage
    if (hasWindow && hasDocument) {
      storageAdapter = {
        getItem: (key: string) => {
          try {
            return Promise.resolve(window.localStorage?.getItem(key) ?? null)
          } catch {
            return Promise.resolve(null)
          }
        },
        setItem: (key: string, value: string) => {
          try {
            window.localStorage?.setItem(key, value)
          } catch {
            // 忽略错误
          }
          return Promise.resolve()
        },
        removeItem: (key: string) => {
          try {
            window.localStorage?.removeItem(key)
          } catch {
            // 忽略错误
          }
          return Promise.resolve()
        },
      }
      return storageAdapter
    }

    // React Native 环境：延迟加载 AsyncStorage
    if (hasReactNativeBridge) {
      try {
        // 延迟 require，避免在 bundle.js 加载时崩溃
        const AsyncStorage = require('@react-native-async-storage/async-storage')
        storageAdapter = (AsyncStorage?.default || AsyncStorage) as StorageAdapter
        return storageAdapter
      } catch (error) {
        // 如果加载失败，使用空实现，避免崩溃
        console.warn('[storage] AsyncStorage 加载失败，使用空实现', error)
        storageAdapter = emptyStorage
        return storageAdapter
      }
    }

    // 默认使用空实现
    storageAdapter = emptyStorage
    return storageAdapter
  } catch (error) {
    // 如果整个初始化过程失败，使用空实现，避免崩溃
    console.warn('[storage] 存储初始化失败，使用空实现', error)
    storageAdapter = emptyStorage
    return storageAdapter
  }
}

// 导出统一的存储接口
export const storage: StorageAdapter = {
  getItem: (key: string) => {
    try {
      return getStorage().getItem(key)
    } catch (error) {
      console.warn('[storage] getItem 失败', error)
      return Promise.resolve(null)
    }
  },
  setItem: (key: string, value: string) => {
    try {
      return getStorage().setItem(key, value)
    } catch (error) {
      console.warn('[storage] setItem 失败', error)
      return Promise.resolve()
    }
  },
  removeItem: (key: string) => {
    try {
      return getStorage().removeItem(key)
    } catch (error) {
      console.warn('[storage] removeItem 失败', error)
      return Promise.resolve()
    }
  },
}
