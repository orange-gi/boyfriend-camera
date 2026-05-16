/**
 * CameraView - 相机预览组件
 * 组合相机预览 + Skia 叠加层
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'

export default function CameraView() {
  // TODO: 实现相机预览
  // - 使用 react-native-vision-camera 获取相机流
  // - 上层叠加 Skia 构图线和剪影
  console.log('[CameraView] 相机预览组件')
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
})
