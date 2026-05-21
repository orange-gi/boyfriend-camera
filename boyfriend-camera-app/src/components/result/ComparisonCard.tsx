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
import { getColorMatrix, type FilterKey } from '../../services/photoProcessor'
import { COLORS } from '../../theme/colors'

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
  warm: '暖黄', cool: '冷调', vivid: '生动', soft: '柔和',
  bw: '黑白', portrait: '人像', food: '美食', cinematic: '电影',
}

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
function FilteredImage({ uri, filter, width, height }: { uri: string; filter: FilterKey | null; width: number; height: number }) {
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
}: Props) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>((filterName ?? 'warm') as FilterKey)

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
              filter={showOriginal ? null : activeFilter}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
            />
          ) : (
            <PlaceholderImage label="✨ 优化图" color={COLORS.primary} />
          )}
          <TouchableOpacity
            style={[styles.cardLabel, styles.cardLabelRight, showOriginal && styles.cardLabelActive]}
            onPress={() => setShowOriginal(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardLabelText}>
              {showOriginal ? '👁 原图模式' : '✨ 滤镜：' + (FILTER_LABELS[activeFilter] || activeFilter)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 原图切换提示 */}
      <View style={styles.compareHint}>
        <Text style={styles.compareHintText}>
          💡 {showOriginal ? '点击「原图模式」可查看滤镜效果' : '点击右侧标签可对比原图'}
        </Text>
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
  cardLabelActive: {
    backgroundColor: 'rgba(255,107,107,0.7)',
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
  compareHint: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  compareHintText: {
    fontSize: 12,
    color: COLORS.textMuted,
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
