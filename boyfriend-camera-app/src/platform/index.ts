/**
 * 平台抽象层：所有 Platform.OS 判断统一收敛到这里。
 * 组件按需引入，不做全局注入。
 */
import { Platform } from 'react-native'

export const isWeb = Platform.OS === 'web'
export const isIOS = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'

export function useIsWeb() {
  return isWeb
}

export function useIsIOS() {
  return isIOS
}
