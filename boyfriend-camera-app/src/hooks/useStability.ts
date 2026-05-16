/**
 * useStability - 陀螺仪稳定性 Hook
 */
import { useState, useEffect, useRef } from 'react'
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors'

export interface StabilityData {
  tiltX: number // -90 to 90 degrees
  tiltY: number // -90 to 90 degrees
  shakeLevel: number // 0-1
}

const SHAKE_THRESHOLD = 1.5 // m/s² 加速度阈值

export function useStability() {
  const [data, setData] = useState<StabilityData>({ tiltX: 0, tiltY: 0, shakeLevel: 0 })
  const historyRef = useRef<number[]>([])

  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 100)
    
    const sub = accelerometer.subscribe(({ x, y, z }) => {
      const tiltX = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI)
      const tiltY = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI)
      
      // 计算加速度幅值判断抖动
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const history = historyRef.current
      history.push(magnitude)
      if (history.length > 10) history.shift()
      
      const avg = history.reduce((a, b) => a + b, 0) / history.length
      const deviation = Math.abs(magnitude - avg)
      const shakeLevel = Math.min(1, deviation / 2)
      
      setData({ tiltX, tiltY, shakeLevel })
    })

    return () => sub.unsubscribe()
  }, [])

  return data
}
