/**
 * ComparisonCard - 原图/优化对比卡片
 * 左右并排展示原图和优化图，支持滤镜切换
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import { COLORS } from '../../theme/colors'

interface Props {
  originalPath: string
  processedPath: string
  filterName?: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'golden' | 'cinematic' | null
  onFilterChange?: (f: string) => void
}

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_GAP = 8
const CARD_WIDTH = (SCREEN_W - 32 - CARD_GAP) / 2
const CARD_HEIGHT = Math.round(CARD_WIDTH * (4 / 3))

const FILTERS: Array<{ key: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'golden' | 'cinematic'; label: string; color: string }> = [
  { key: 'warm', label: '暖色', color: COLORS.filterWarm },
  { key: 'cool', label: '冷色', color: COLORS.filterCool },
  { key: 'vivid', label: '鲜艳', color: COLORS.filterVivid },
  { key: 'soft', label: '柔美', color: COLORS.filterSoft },
  { key: 'bw', label: '黑白', color: COLORS.filterBw },
  { key: 'golden', label: '金棕', color: COLORS.filterGolden },
  { key: 'cinematic', label: '电影', color: COLORS.filterCinematic },
]

const OVERLAY_COLORS: Record<string, string> = {
  warm: 'rgba(255, 140, 0, 0.15)',
  cool: 'rgba(74, 144, 217, 0.15)',
  vivid: 'rgba(255, 80, 130, 0.1)',
  soft: 'rgba(255, 182, 193, 0.12)',
  bw: 'rgba(0, 0, 0, 0.45)',
  golden: 'rgba(255, 160, 60, 0.18)',
  cinematic: 'rgba(80, 100, 160, 0.15)',
}

// 内嵌纯色 placeholder（无需网络）
function PlaceholderImage({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: color }]}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  )
}

export default function ComparisonCard({
  originalPath,
  processedPath,
  filterName = 'warm',
  onFilterChange,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<string>(filterName ?? 'warm')
  const overlayColor = activeFilter ? (OVERLAY_COLORS[activeFilter] || 'transparent') : 'transparent'

  // 同步外部 filterName 变化（避免 prop 变了但本地 state 没更新的情况）
  useEffect(() => {
    if (filterName && filterName !== activeFilter) {
      setActiveFilter(filterName)
    }
  }, [filterName])

  const handleFilterPress = (f: string) => {
    setActiveFilter(f)
    onFilterChange?.(f)
  }

  return (
    <View style={styles.container}>
      {/* 对比图 */}
      <View style={styles.comparisonRow}>
        {/* 原图 */}
        <View style={styles.card}>
          {originalPath ? (
            <Image
              source={{ uri: originalPath }}
              style={[styles.cardImage, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
              resizeMode="cover"
            />
          ) : (
            <PlaceholderImage label="📷 原图" color="#333" />
          )}
          <View style={[styles.cardOverlay, { width: CARD_WIDTH, height: CARD_HEIGHT }]} />
          <View style={styles.cardLabel}>
            <Text style={styles.cardLabelText}>📷 原图</Text>
          </View>
        </View>

        {/* 优化图 */}
        <View style={styles.card}>
          {processedPath || originalPath ? (
            <Image
              source={{ uri: processedPath || originalPath }}
              style={[styles.cardImage, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
              resizeMode="cover"
            />
          ) : (
            <PlaceholderImage label="✨ 优化图" color={COLORS.primary} />
          )}
          {activeFilter !== 'bw' && (
            <View style={[styles.filterOverlay, { backgroundColor: overlayColor as string, width: CARD_WIDTH, height: CARD_HEIGHT }]} />
          )}
          {activeFilter === 'bw' && (
            <View style={[styles.filterOverlayBW, { width: CARD_WIDTH, height: CARD_HEIGHT }]} />
          )}
          <View style={styles.cardLabel}>
            <Text style={styles.cardLabelText}>✨ 优化图</Text>
          </View>
        </View>
      </View>

      {/* 滤镜选择器 */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>滤镜：</Text>
        <View style={styles.filterBtns}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                activeFilter === f.key && { backgroundColor: f.color + '30', borderColor: f.color },
              ]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.filterDot, { backgroundColor: f.color }]} />
              <Text style={[
                styles.filterBtnText,
                activeFilter === f.key && { color: f.color, fontWeight: '600' },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    borderRadius: 12,
  },
  placeholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
  },
  filterOverlayBW: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    width: 36,
  },
  filterBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.bgCard,
    gap: 4,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
})
