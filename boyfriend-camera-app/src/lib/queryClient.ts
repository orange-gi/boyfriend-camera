import { AppState, Platform } from 'react-native'
import { focusManager, QueryClient } from '@tanstack/react-query'

/**
 * React Query 在 RN 里默认不会“像浏览器一样”自动感知 focus。
 * 这里用 AppState 把“回到前台”映射为 focus=true，方便做后台静默刷新。
 */
export function setupReactQueryFocusHandling() {
  if (Platform.OS === 'web') return

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active')
    })
    return () => sub.remove()
  })
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 关键：切 tab 不要“白屏重拉”；用缓存先出内容，再后台刷新
        staleTime: 60 * 1000,
        gcTime: 20 * 60 * 1000,
        retry: 1,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        refetchOnMount: false,
      },
    },
  })
}

