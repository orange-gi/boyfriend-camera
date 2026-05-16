/**
 * ComparisonCard - 原图/优化对比卡片 v2
 * 左右并排展示原图和优化图，支持滤镜切换
 * 注意：不包含 ViewShot，由父组件管理截图
 */
import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import { getFilterParams } from '../../services/photoProcessor'

interface Props {
  originalPath: string
  processedPath: string
  filterName?: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | null
}

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_GAP = 8
const CARD_WIDTH = (SCREEN_W - 32 - CARD_GAP) / 2
const CARD_HEIGHT = Math.round(CARD_WIDTH * (4 / 3))

const FILTER_LABELS: Record<string, string> = {
  warm: '暖色调',
  cool: '冷色调',
  vivid: '鲜艳',
  soft: '柔美',
  bw: '黑白',
}

const FILTER_COLORS: Record<string, string> = {
  warm: '#FF8C00',
  cool: '#4A90D9',
  vivid: '#FF6B6B',
  soft: '#FFB6C1',
  bw: '#888888',
}

function getOverlayColor(filter: string | null): string {
  if (!filter) return 'transparent'
  const colors: Record<string, string> = {
    warm: 'rgba(255, 180, 80, 0.18)',
    cool: 'rgba(80, 140, 255, 0.18)',
    vivid: 'rgba(255, 80, 130, 0.12)',
    soft: 'rgba(255, 210, 190, 0.15)',
    bw: 'rgba(0, 0, 0, 0.5)',
  }
  return colors[filter] || 'transparent'
}

const PLACEHOLDER_ORIGINAL = 'https://placehold.co/' + Math.round(CARD_WIDTH) + 'x' + Math.round(CARD_HEIGHT) + '/222/fff?text=原图'
const PLACEHOLDER_PROCESSED = 'https://placehold.co/' + Math.round(CARD_WIDTH) + 'x' + Math.round(CARD_HEIGHT) + '/FF6B6B/fff?text=优化图'

export default function ComparisonCard({
  originalPath,
  processedPath,
  filterName = 'warm',
}: Props) {
  const [activeFilter, setActiveFilter] = useState(filterName)

  const filters: Array<'warm' | 'cool' | 'vivid' | 'soft' | 'bw'> = ['warm', 'cool', 'vivid', 'soft', 'bw']
  const overlayColor = getOverlayColor(activeFilter)

  return (
    <View style={styles.container}>
      {/* 对比图 */}
      <View style={styles.comparisonRow}>
        {/* 原图 */}
        <View style={styles.card}>
          <Image
            source={{ uri: originalPath || PLACEHOLDER_ORIGINAL }}
            style={[styles.cardImage, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
            resizeMode="cover"
          />
          <View style={styles.cardLabel}>
            <Text style={styles.cardLabelText}>📷 原图</Text>
          </View>
        </View>

        {/* 优化图 */}
        <View style={styles.card}>
          <Image
            source={{ uri: processedPath || originalPath || PLACEHOLDER_PROCESSED }}
            style={[styles.cardImage, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
            resizeMode="cover"
          />
          {/* 滤镜色调叠加 */}
          <View
            style={[
              styles.filterOverlay,
              { backgroundColor: overlayColor, width: CARD_WIDTH, height: CARD_HEIGHT },
            ]}
          />
          <View style={styles.cardLabel}>
            <Text style={styles.cardLabelText}>
              ✨ {activeFilter ? FILTER_LABELS[activeFilter] : '优化'}
            </Text>
          </View>
        </View>
      </View>

      {/* 效果说明 */}
      <View style={styles.effectRow}>
        <Text style={styles.effectIcon}>🎯</Text>
        <Text style={styles.effectText}>
          智能裁剪至三分点 · {activeFilter ? FILTER_LABELS[activeFilter] : '原色'}滤镜 · 轻度美颜
        </Text>
      </View>

      {/* 滤镜选择栏 */}
      <View style={styles.filterBar}>
        {filters.map((f) => {
          const isActive = activeFilter === f
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: FILTER_COLORS[f] },
              ]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingHorizontal: 16,
  },
  card: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  cardImage: {
    borderRadius: 12,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
  },
  cardLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  cardLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginHorizontal: 16,
    gap: 6,
  },
  effectIcon: {
    fontSize: 14,
  },
  effectText: {
    fontSize: 12,
    color: '#888',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
