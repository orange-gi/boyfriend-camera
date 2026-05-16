/**
 * StabilityIndicator - 稳定性指示器
 * 显示水平仪和防抖提示
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'

interface Props {
  tiltX: number
  tiltY: number
  shakeLevel: number // 0-1, 0=很稳, 1=很抖
}

export default function StabilityIndicator({ tiltX, tiltY, shakeLevel }: Props) {
  // TODO: 使用陀螺仪数据绘制水平仪
  // - tiltX/Y 显示水平气泡位置
  // - shakeLevel > 0.7 时显示"手稳住！"提示
  console.log('[StabilityIndicator] tilt:', tiltX, tiltY, 'shake:', shakeLevel)
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
})
