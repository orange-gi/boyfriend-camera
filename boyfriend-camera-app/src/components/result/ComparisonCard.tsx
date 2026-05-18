/**
 * ComparisonCard - 原图/优化对比卡片 v2
 * 升级：使用 Skia Canvas + ColorMatrix 实现真正的滤镜效果
 * (brightness/contrast/saturation 而非简单颜色叠加)
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
import { Canvas, Image as SkiaImage, ColorMatrix, useImage } from '@shopify/react-native-skia'
import { getColorMatrix } from '../../services/photoProcessor'
import { COLORS } from '../../theme/colors'

interface Props {
  originalPath: string
  processedPath: string
  filterName?: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'landscape' | 'night' | 'sunset' | 'floral' | 'snow' | 'golden' | 'cinematic' | null
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

// 内嵌纯色 placeholder（无需网络）
function PlaceholderImage({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: color }]}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  )
}

/**
 * 使用 Skia Canvas + ColorMatrix 实现真正的滤镜效果
 * ColorMatrix child 对 SkiaImage 应用 brightness/contrast/saturation 调整
 */
function FilteredImage({ uri, filter, width, height }: { uri: string; filter: string | null; width: number; height: number }) {
  const image = useImage(uri)
  const matrix = getColorMatrix(filter)

  if (!image) {
    return (
      <Image
        source={{ uri }}
        style={{ width, height }}
        resizeMode="cover"
      />
    )
  }

  return (
    <Canvas style={{ width, height }}>
      <SkiaImage
        image={image}
        width={width}
        height={height}
        fit="cover"
      >
        <ColorMatrix matrix={matrix} />
      </SkiaImage>
    </Canvas>
  )
}

export default function ComparisonCard({
  originalPath,
  processedPath,
  filterName = 'warm',
  onFilterChange,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<string>(filterName ?? 'warm')

  // 同步外部 filterName 变化
  useEffect(() => {
    if (filterName && filterName !== activeFilter) {
      setActiveFilter(filterName)
    }
  }, [filterName])

  const effectivePath = processedPath || originalPath

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
          <View style={[styles.cardLabel, styles.cardLabelLeft]}>
            <Text style={styles.cardLabelText}>📷 原图</Text>
          </View>
        </View>

        {/* 优化图（使用 Skia ColorMatrix 滤镜） */}
        <View style={styles.card}>
          {effectivePath ? (
            <FilteredImage
              uri={effectivePath}
              filter={activeFilter}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
            />
          ) : (
            <PlaceholderImage label="✨ 优化图" color={COLORS.primary} />
          )}
          <View style={[styles.cardLabel, styles.cardLabelRight]}>
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
              onPress={() => {
                setActiveFilter(f.key)
                onFilterChange?.(f.key)
              }}
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
