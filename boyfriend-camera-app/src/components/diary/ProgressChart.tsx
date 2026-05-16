/**
 * ProgressChart - 进步日记曲线
 * 显示历史评分趋势
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'

export interface DiaryEntry {
  date: string // ISO date string
  score: number
  suggestions: string[]
}

interface Props {
  entries: DiaryEntry[]
}

export default function ProgressChart({ entries }: Props) {
  // TODO: 使用 Skia 或 react-native-svg 绘制折线图
  // - X轴: 日期
  // - Y轴: 评分
  // - 标注每次的进步/退步
  console.log('[ProgressChart] entries:', entries.length)
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    backgroundColor: '#fff',
    padding: 16,
  },
})
