/**
 * ComparisonCard - 原图/优化对比卡片
 * 纯 React Native 实现，兼容 Expo managed workflow
 * 左右并排展示原图 vs 优化图，点击切换原图模式
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
import type { FilterKey } from '../../services/photoProcessor'

interface Props {
  originalPath: string
  processedPath: string
  filterName?: FilterKey | null
}

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_GAP = 8
const CARD_WIDTH = (SCREEN_W - 32 - CARD_GAP) / 2
const CARD_HEIGHT = Math.round(CARD_WIDTH * (4 / 3))

const FILTER_LABELS: Record<string, string> = {
  warm: '暖黄',
  cool: '冷调',
  vivid: '生动',
  soft: '柔和',
  bw: '黑白',
  portrait: '人像',
  food: '美食',
  cinematic: '电影',
}

// 滤镜叠加层颜色（模拟滤镜氛围，非真实色彩处理）
const FILTER_OVERLAY: Record<string, string> = {
  warm: 'rgba(255, 180, 80, 0.12)',
  cool: 'rgba(80, 160, 255, 0.12)',
  vivid: 'rgba(255, 100, 80, 0.08)',
  soft: 'rgba(200, 180, 255, 0.1)',
  bw: 'rgba(0, 0, 0, 0.0)',
  portrait: 'rgba(255, 200, 160, 0.08)',
  food: 'rgba(255, 120, 60, 0.1)',
  cinematic: 'rgba(60, 80, 120, 0.15)',
}

function PlaceholderCard({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.card, { backgroundColor: color }]}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  )
}

export default function ComparisonCard({
  originalPath,
  processedPath,
  filterName = 'warm',
}: Props) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>(
    (filterName ?? 'warm') as FilterKey
  )

  useEffect(() => {
    if (filterName && filterName !== activeFilter) {
      setActiveFilter(filterName)
    }
  }, [filterName])

  const effectivePath = processedPath || originalPath
  const overlayColor = showOriginal ? 'transparent' : (FILTER_OVERLAY[activeFilter] ?? 'transparent')

  return (
    <View style={styles.container}>
      {/* 对比图 */}
      <View style={styles.comparisonRow}>
        {/* 原图 */}
        <View style={styles.card}>
          {originalPath ? (
            <Image
              source={{ uri: originalPath }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <PlaceholderCard label="原图" color={COLORS.skeletonBase} />
          )}
          <View style={[styles.cardLabel, styles.cardLabelLeft]}>
            <Text style={styles.cardLabelText}>原图</Text>
          </View>
        </View>

        {/* 优化图 */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => setShowOriginal((v) => !v)}
        >
          {effectivePath ? (
            <>
              <Image
                source={{ uri: effectivePath }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              {/* 滤镜氛围层 */}
              {!showOriginal && (
                <View
                  style={[
                    styles.filterOverlay,
                    { backgroundColor: overlayColor },
                  ]}
                />
              )}
            </>
          ) : (
            <PlaceholderCard label="优化图" color={COLORS.primary} />
          )}
          <View style={[styles.cardLabel, styles.cardLabelRight, showOriginal && styles.cardLabelActive]}>
            <Text style={styles.cardLabelText}>
              {showOriginal
                ? '原图模式'
                : `滤镜：${FILTER_LABELS[activeFilter] ?? activeFilter}`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 操作提示 */}
      <Text style={styles.compareHint}>
        {showOriginal
          ? '点击「优化图」查看滤镜效果'
          : '点击可切换原图模式对比'}
      </Text>
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
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: CARD_HEIGHT / 2 - 10,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
  },
  cardLabel: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardLabelLeft: {
    left: 8,
  },
  cardLabelRight: {
    right: 8,
  },
  // 激活态：改为 primary 色，与 danger 语义区分（激活=选中，非危险）
  cardLabelActive: {
    backgroundColor: COLORS.primary,
  },
  cardLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  compareHint: {
    textAlign: 'center',
    marginTop: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.textMuted,
  },
})
