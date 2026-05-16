/**
 * useStability - 陀螺仪稳定性 Hook v2
 * 改进：卡尔曼滤波降噪、双轴稳定、更平滑的输出
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors'

export interface StabilityData {
  tiltX: number // -90 to 90 degrees
  tiltY: number // -90 to 90 degrees
  shakeLevel: number // 0-1
  isStable: boolean // 是否稳定
}

// 卡尔曼滤波器
class KalmanFilter {
  private q: number // 过程噪声
  private r: number // 测量噪声
  private x: number // 估计值
  private p: number // 估计误差协方差
  private initialized = false

  constructor(q = 0.1, r = 1.0) {
    this.q = q
    this.r = r
    this.x = 0
    this.p = 1
  }

  update(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement
      this.initialized = true
      return this.x
    }
    // 预测
    this.p = this.p + this.q
    // 更新
    const k = this.p / (this.p + this.r)
    this.x = this.x + k * (measurement - this.x)
    this.p = (1 - k) * this.p
    return this.x
  }

  reset() {
    this.initialized = false
    this.x = 0
    this.p = 1
  }
}

const SHAKE_THRESHOLD = 2.0 // m/s² 加速度阈值
const STABILITY_THRESHOLD = 0.15 // 稳定判定阈值

export function useStability() {
  const [data, setData] = useState<StabilityData>({
    tiltX: 0,
    tiltY: 0,
    shakeLevel: 0,
    isStable: true,
  })

  // 卡尔曼滤波器实例
  const kfX = useRef(new KalmanFilter(0.05, 0.5))
  const kfY = useRef(new KalmanFilter(0.05, 0.5))
  const kfShake = useRef(new KalmanFilter(0.1, 1.0))

  // 滑动窗口历史
  const historyRef = useRef<number[]>([])
  const lastStableRef = useRef(true)

  // 节流控制，避免频繁更新
  const lastUpdateRef = useRef(0)
  const UPDATE_INTERVAL = 150 // ms

  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 80) // 80ms 采样

    const sub = accelerometer.subscribe(({ x, y, z }) => {
      const now = Date.now()
      if (now - lastUpdateRef.current < UPDATE_INTERVAL) return
      lastUpdateRef.current = now

      // 应用卡尔曼滤波
      const filteredX = kfX.current.update(x)
      const filteredY = kfY.current.update(y)

      // 计算倾斜角度
      const tiltX = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI)
      const tiltY = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI)

      // 计算加速度幅值
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const history = historyRef.current
      history.push(magnitude)
      if (history.length > 15) history.shift()

      // 标准差判断抖动
      const avg = history.reduce((a, b) => a + b, 0) / history.length
      const variance = history.reduce((s, v) => s + (v - avg) ** 2, 0) / history.length
      const deviation = Math.sqrt(variance)
      const rawShake = Math.min(1, deviation / 3)

      const shakeLevel = kfShake.current.update(rawShake)
      const isStable = shakeLevel < STABILITY_THRESHOLD && lastStableRef.current

      if (isStable !== lastStableRef.current) {
        lastStableRef.current = isStable
      }

      setData({
        tiltX: Math.round(tiltX * 10) / 10,
        tiltY: Math.round(tiltY * 10) / 10,
        shakeLevel: Math.round(shakeLevel * 100) / 100,
        isStable,
      })
    })

    return () => {
      sub.unsubscribe()
      kfX.current.reset()
      kfY.current.reset()
      kfShake.current.reset()
    }
  }, [])

  return data
}
