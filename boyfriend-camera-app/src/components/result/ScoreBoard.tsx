/**
 * ScoreBoard - 评分板
 * 展示评分和俏皮建议
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export interface ScoreResult {
  totalScore: number // 0-100
  compositionScore: number // 构图 0-40
  exposureScore: number // 曝光 0-30
  stabilityScore: number // 稳定 0-20
  levelScore: number // 水平 0-10
  suggestions: string[] // 改进建议文案
}

interface Props {
  result: ScoreResult
}

export default function ScoreBoard({ result }: Props) {
  // TODO: 展示评分和文案
  // - 大字显示总分
  // - 各维度小分条
  // - 俏皮建议列表
  console.log('[ScoreBoard] total:', result.totalScore)
  return (
    <View style={styles.container}>
      <Text style={styles.totalScore}>{result.totalScore}</Text>
      <Text style={styles.label}>分</Text>
      {/* TODO: 各维度分条和文案 */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  totalScore: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 20,
    color: '#888',
  },
})
