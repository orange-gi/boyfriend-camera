/**
 * StabilityIndicator - 稳定性指示器
 * 显示水平仪气泡 + 防抖提示
 * 使用陀螺仪/加速度计数据（来自 useStability hook）
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { COLORS } from '../../theme/colors'

interface Props {
  tiltX: number  // -90 to 90 degrees, 手机左右倾斜
  tiltY: number  // -90 to 90 degrees, 手机前后倾斜
  shakeLevel: number // 0-1, 0=很稳, 1=很抖
  onUnstable?: () => void  // 晃动超标回调
}

const BUBBLE_SIZE = 32  // 气泡直径
const WELL_SIZE = 44   // 容器直径
const MAX_OFFSET = (WELL_SIZE - BUBBLE_SIZE) / 2  // 最大偏移

const STABLE_THRESHOLD = 3   // 度，水平视为稳定
const SHAKE_WARNING = 0.65  // 晃动等级，>此值显示警告

export default function StabilityIndicator({
  tiltX,
  tiltY,
  shakeLevel,
  onUnstable,
}: Props) {
  const bubbleX = useRef(new Animated.Value(0)).current
  const bubbleY = useRef(new Animated.Value(0)).current
  const shakeOpacity = useRef(new Animated.Value(0)).current
  const shakeScale = useRef(new Animated.Value(1)).current

  const loopAnimRef = useRef<ReturnType<typeof Animated.loop> | null>(null)
  const prevShake = useRef(0)

  // 气泡跟随陀螺仪
  useEffect(() => {
    // tiltX/Y 是-90到90度，映射到气泡偏移
    // 手机向左倾斜(镜头低)，气泡向右
    const targetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, (tiltX / 45) * MAX_OFFSET))
    const targetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, (tiltY / 45) * MAX_OFFSET))

    const animX = Animated.spring(bubbleX, {
      toValue: targetX,
      useNativeDriver: true,
      friction: 8,
    })
    const animY = Animated.spring(bubbleY, {
      toValue: targetY,
      useNativeDriver: true,
      friction: 8,
    })
    animX.start()
    animY.start()
    return () => {
      animX.stop()
      animY.stop()
    }
  }, [tiltX, tiltY])

  // 晃动警告动画
  useEffect(() => {
    if (shakeLevel > SHAKE_WARNING) {
      // 快速闪烁
      loopAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(shakeOpacity, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      )
      loopAnimRef.current.start()
      Animated.spring(shakeScale, {
        toValue: 1.15,
        useNativeDriver: true,
      }).start()

      if (prevShake.current <= SHAKE_WARNING && onUnstable) {
        onUnstable()
      }
    } else {
      if (loopAnimRef.current) {
        loopAnimRef.current.stop()
        loopAnimRef.current = null
      }
      Animated.timing(shakeOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
      Animated.spring(shakeScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start()
    }
    prevShake.current = shakeLevel

    // 清理函数：组件卸载时停止动画，防止内存泄漏
    return () => {
      if (loopAnimRef.current) {
        loopAnimRef.current.stop()
        loopAnimRef.current = null
      }
    }
  }, [shakeLevel])

  const isStable = Math.abs(tiltX) < STABLE_THRESHOLD && Math.abs(tiltY) < STABLE_THRESHOLD
  const bubbleColor = isStable && shakeLevel < SHAKE_WARNING
    ? COLORS.success  // 绿色 - 稳定
    : shakeLevel > SHAKE_WARNING
    ? COLORS.danger  // 红色 - 抖动
    : COLORS.warning  // 黄色 - 倾斜

  return (
    <View style={styles.container}>
      {/* 水平仪本体 */}
      <View style={styles.well}>
        {/* 中心十字准星 */}
        <View style={[styles.crosshair, styles.crosshairH]} />
        <View style={[styles.crosshair, styles.crosshairV]} />

        {/* 气泡 */}
        <Animated.View
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleColor,
              transform: [
                { translateX: bubbleX },
                { translateY: bubbleY },
              ],
            },
          ]}
        />

        {/* 晃动警告遮罩 */}
        <Animated.View
          style={[
            styles.shakeOverlay,
            {
              opacity: shakeOpacity,
              transform: [{ scale: shakeScale }],
            },
          ]}
        >
          <Text style={styles.shakeText}>稳住!</Text>
        </Animated.View>
      </View>

      {/* 标签：去 emoji 装饰，简洁文字承载状态信息 */}
      <Text style={[styles.label, { color: bubbleColor }]}>
        {isStable && shakeLevel < SHAKE_WARNING ? '水平' : shakeLevel > SHAKE_WARNING ? '手抖' : '倾斜'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 110,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  well: {
    width: WELL_SIZE,
    height: WELL_SIZE,
    borderRadius: WELL_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    position: 'absolute',
  },
  crosshair: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  crosshairH: {
    width: WELL_SIZE,
    height: 0.5,
  },
  crosshairV: {
    width: 0.5,
    height: WELL_SIZE,
  },
  shakeOverlay: {
    position: 'absolute',
    width: WELL_SIZE,
    height: WELL_SIZE,
    borderRadius: WELL_SIZE / 2,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shakeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
})
