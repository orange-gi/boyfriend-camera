/**
 * ComparisonCard - 原图/优化对比卡片
 * 左右滑动对比或并排展示
 */
import React from 'react'
import { View, StyleSheet, Image } from 'react-native'

interface Props {
  originalPath: string
  processedPath: string
}

export default function ComparisonCard({ originalPath, processedPath }: Props) {
  // TODO: 实现对比卡片
  // - 左右滑动对比
  // - 或并排展示
  // - 使用 react-native-view-shot 截图
  console.log('[ComparisonCard] original:', originalPath)
  return (
    <View style={styles.container}>
      {/* TODO: 左侧原图，右侧优化图 */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
})
