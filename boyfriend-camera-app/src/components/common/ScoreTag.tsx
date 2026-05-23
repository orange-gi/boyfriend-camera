/**
 * ScoreTag - 评分标签
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { scoreColor, scoreLabel } from '../../theme/colors'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function ScoreTag({ score, size = 'md', showLabel = false }: Props) {
  const color = scoreColor(score)
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 28 : 20
  const paddingH = size === 'sm' ? 6 : size === 'lg' ? 14 : 10
  const paddingV = size === 'sm' ? 3 : size === 'lg' ? 6 : 4
  const borderRadius = size === 'sm' ? 6 : size === 'lg' ? 10 : 8

  return (
    <View style={[styles.tag, { backgroundColor: color + '20', borderRadius }]}>
      <Text style={[styles.score, { color, fontSize }]}>{score}</Text>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{scoreLabel(score)}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  score: { fontWeight: 'bold' },
  label: { fontSize: 12 },
})
