/**
 * ScoreTag - 评分标签
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { scoreColor, scoreLabel } from '../../theme/colors'
import { borderRadius as r } from '../../theme/index'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function ScoreTag({ score, size = 'md', showLabel = false }: Props) {
  const color = scoreColor(score)
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 28 : 20

  const radius = size === 'sm' ? r.sm : size === 'lg' ? r.md : r.md

  return (
    <View style={[styles.tag, { backgroundColor: color + '20', borderRadius: radius }]}>
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
