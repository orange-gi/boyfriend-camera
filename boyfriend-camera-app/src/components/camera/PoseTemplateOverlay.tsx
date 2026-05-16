/**
 * PoseTemplateOverlay - 姿势剪影模板
 * 可拖动、缩放的半透明剪影叠加
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'

export interface PoseTemplate {
  id: string
  name: string
  thumbnail: string
  overlayUrl: string
  guidePoints: {
    head: [number, number]
    body: [number, number]
  }
  voiceTip: string
}

interface Props {
  template: PoseTemplate | null
}

export default function PoseTemplateOverlay({ template }: Props) {
  // TODO: 实现可交互剪影
  // - PanResponder 支持拖动位置
  // - PinchGesture 支持缩放
  // - 绘制半透明 SVG 剪影
  if (!template) return null
  console.log('[PoseTemplateOverlay] template:', template.name)
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
})
