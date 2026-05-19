/**
 * TemplateCard - 姿势模板卡片 v2
 * 改进：分类标签、选中高亮、voiceTip预览
 */
import React from 'react'
import { colors } from '../../theme'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { COLORS, CATEGORY_COLORS } from '../../theme/colors'
import type { PoseTemplate } from '../camera/PoseTemplateOverlay'

interface Props {
  template: PoseTemplate
  onPress: (t: PoseTemplate) => void
  size?: 'sm' | 'md'
  selected?: boolean
}

const CARD_W_SM = 100
const CARD_H_SM = 135
const CARD_W_MD = 112
const CARD_H_MD = 155

export default function TemplateCard({ template, onPress, size = 'md', selected = false }: Props) {
  const w = size === 'sm' ? CARD_W_SM : CARD_W_MD
  const h = size === 'sm' ? CARD_H_SM : CARD_H_MD
  const catColor = CATEGORY_COLORS[template.category ?? ''] ?? COLORS.primary

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: w, height: h },
        selected && styles.cardSelected,
      ]}
      onPress={() => onPress(template)}
      activeOpacity={0.75}
    >
      {/* 分类标签 */}
      {template.category && (
        <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
          <Text style={styles.categoryText} numberOfLines={1}>
            {template.category}
          </Text>
        </View>
      )}
      <Image
        source={{ uri: template.thumbnail }}
        style={[styles.image, { width: w - 12, height: h - 50 }]}
        resizeMode="contain"
      />
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
        {template.name}
      </Text>
      {size === 'md' && template.voiceTip && (
        <Text style={styles.voiceTip} numberOfLines={1}>
          {template.voiceTip.length > 12 ? template.voiceTip.slice(0, 12) + '...' : template.voiceTip}
        </Text>
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLORS.primary,
  },
  categoryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 1,
  },
  categoryText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '700',
  },
  image: {
    borderRadius: 6,
    backgroundColor: colors.bg,
    marginTop: 12,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  nameSelected: {
    color: COLORS.primary,
  },
  voiceTip: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
})
