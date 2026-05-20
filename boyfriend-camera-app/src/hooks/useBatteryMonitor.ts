/**
 * useBatteryMonitor - 电量监控 Hook
 * 电量低于 20% 时触发回调提醒用户抓紧拍照
 */
import { useEffect, useRef } from 'react'

// 动态导入 DeviceInfo（未安装时不报错）
let getBatteryLevel: (() => Promise<number>) | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DeviceInfo = require('react-native-device-info')
  getBatteryLevel = () => DeviceInfo.getBatteryLevel().catch(() => -1)
} catch (_e) {
  // DeviceInfo 未安装，电量监控不生效
}

const BATTERY_CHECK_INTERVAL = 60_000 // 每分钟检查一次
const LOW_BATTERY_THRESHOLD = 0.20 // 低于 20% 提醒

export function useBatteryMonitor(onLowBattery: () => void) {
  const onLowBatteryRef = useRef(onLowBattery)
  onLowBatteryRef.current = onLowBattery
  const alertedRef = useRef(false) // 只提醒一次，避免重复烦扰

  useEffect(() => {
    if (!getBatteryLevel) return

    const checkBattery = async () => {
      if (alertedRef.current) return
      try {
        const level = await getBatteryLevel()
        if (level >= 0 && level <= 1 && level < LOW_BATTERY_THRESHOLD) {
          alertedRef.current = true
          onLowBatteryRef.current()
        }
      } catch (_e) {
        // 静默忽略检查错误
      }
    }

    // 立即检查一次，然后定时检查
    checkBattery()
    const interval = setInterval(checkBattery, BATTERY_CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [])
}
