/**
 * 「知·自我」与报告页相关的导航降级（理论 / 报告路由在 /zhi 下）
 */

import type { Router } from 'expo-router'
import type { NavigationProp } from '@react-navigation/native'
import { CommonActions } from '@react-navigation/native'

const SELF_ROUTE_NAME = 'self'
const REPORT_ROUTE_NAME = 'report'
const SELF_PATH = '/zhi/self'

/** 判定父级是否为「self→theory→report」类栈（避免对 Tabs 整树误 reset） */
function isSelfTheoryReportStack(routes: { name?: string }[]): boolean {
  if (!Array.isArray(routes) || routes.length < 2 || routes.length > 6) return false
  const names = new Set(routes.map((r) => r.name))
  return names.has(SELF_ROUTE_NAME) && names.has(REPORT_ROUTE_NAME)
}

/**
 * 从报告页退出到探索自我（Native 端使用）
 * Web 端建议直接使用 Context + router.replace
 */
export function exitReportToSelf(
  router: Router,
  navigation: NavigationProp<Record<string, object>>
): void {
  // Native 端使用栈操作
  try {
    const parent = navigation.getParent()
    const state = parent?.getState?.() as { routes?: { name?: string }[] } | undefined
    const routes = state?.routes
    if (parent && routes && isSelfTheoryReportStack(routes)) {
      parent.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: SELF_ROUTE_NAME } as { name: string; params?: object }],
        })
      )
      return
    }
  } catch {
    // 降级：仅 replace
  }
  router.replace(SELF_PATH)
}
