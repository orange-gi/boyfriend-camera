/**
 * TemplateCard - 姿势模板卡片
 */
import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { COLORS } from '../../theme/colors'
import type { PoseTemplate } from '../camera/PoseTemplateOverlay'

interface Props {
  template: PoseTemplate
  onPress: (t: PoseTemplate) => void
  size?: 'sm' | 'md'
}

const CARD_W_SM = 100
const CARD_H_SM = 130
const CARD_W_MD = 110
const CARD_H_MD = 150

export default function TemplateCard({ template, onPress, size = 'md' }: Props) {
  const w = size === 'sm' ? CARD_W_SM : CARD_W_MD
  const h = size === 'sm' ? CARD_H_SM : CARD_H_MD

  return (
    <TouchableOpacity
      style={[styles.card, { width: w, height: h }]}
      onPress={() => onPress(template)}
      activeOpacity={0.75}
    >
      <Image
        source={{ uri: template.thumbnail }}
        style={[styles.image, { width: w - 12, height: h - 48 }]}
        resizeMode="contain"
      />
      <Text style={styles.name} numberOfLines={1}>{template.name}</Text>
      {size === 'md' && template.category && (
        <Text style={styles.category}>{template.category}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginRight: 8,
    marginBottom: 8,
  },
  image: { borderRadius: 6 },
  name: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  category: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },
})
