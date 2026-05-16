/**
 * CompositionLines - 构图线组件
 * 支持九宫格/黄金螺旋/三角构图
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'

type CompositionMode = 'grid' | 'golden' | 'triangle'

interface Props {
  mode: CompositionMode
}

export default function CompositionLines({ mode }: Props) {
  // TODO: 使用 Skia 绘制构图线
  // - 九宫格: 三等分横竖线
  // - 黄金螺旋: 对数螺旋辅助线
  // - 三角构图: 三角形引导线
  console.log('[CompositionLines] mode:', mode)
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
  },
})
