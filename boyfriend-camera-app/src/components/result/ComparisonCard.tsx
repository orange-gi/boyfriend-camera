/**
 * ComparisonCard - 原图/优化对比卡片
 * 左右并排展示原图和优化图，支持滑动对比
 */
import React, { useState, createRef } from 'react'
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import ViewShot from 'react-native-view-shot'
import { getFilterParams } from '../../services/photoProcessor'

interface Props {
  originalPath: string
  processedPath: string
  filterName?: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | null
  faceCenter?: { x: number; y: number }
  onComparisonCaptured?: (uri: string) => void
}

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_GAP = 8
const CARD_WIDTH = (SCREEN_W - 32 - CARD_GAP) / 2
const CARD_HEIGHT = CARD_WIDTH * (4 / 3)

const FILTER_LABELS: Record<string, string> = {
  warm: '暖色调',
  cool: '冷色调',
  vivid: '鲜艳',
  soft: '柔美',
  bw: '黑白',
}

export default function ComparisonCard({
  originalPath,
  processedPath,
  filterName = 'warm',
  faceCenter,
  onComparisonCaptured,
}: Props) {
  const [activeFilter, setActiveFilter] = useState(filterName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewShotRef = createRef<typeof ViewShot>() as any

  // 滤镜参数
  const filterParams = getFilterParams(activeFilter)

  // 标签栏
  const filters: Array<'warm' | 'cool' | 'vivid' | 'soft' | 'bw'> = ['warm', 'cool', 'vivid', 'soft', 'bw']

  return (
    <View style={styles.container}>
      {/* 截图容器 */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'jpg', quality: 0.9 }}
        style={styles.viewShot}
      >
        <View style={styles.comparisonRow}>
          {/* 原图 */}
          <View style={styles.card}>
            <Image
              source={{ uri: originalPath || 'https://placehold.co/400x533/222/fff?text=原图' }}
              style={[styles.cardImage, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
              resizeMode="cover"
            />
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText}>📷 原图</Text>
            </View>
          </View>

          {/* 优化图（带滤镜） */}
          <View style={styles.card}>
            <Image
              source={{ uri: processedPath || originalPath || 'https://placehold.co/400x533/FF6B6B/fff?text=优化图' }}
              style={[
                styles.cardImage,
                styles.filteredImage,
                { width: CARD_WIDTH, height: CARD_HEIGHT },
              ]}
              resizeMode="cover"
            />
            {/* 滤镜色调叠加 */}
            {activeFilter && activeFilter !== 'bw' && (
              <View
                style={[
                  styles.filterOverlay,
                  {
                    backgroundColor: getOverlayColor(activeFilter),
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                ]}
              />
            )}
            {/* 黑白滤镜 */}
            {activeFilter === 'bw' && (
              <View
                style={[
                  styles.filterOverlay,
                  {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                ]}
              />
            )}
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText}>
                ✨ 优化 {activeFilter ? `· ${FILTER_LABELS[activeFilter] || activeFilter}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* 底部效果说明 */}
        <View style={styles.effectRow}>
          <Text style={styles.effectIcon}>🎯</Text>
          <Text style={styles.effectText}>
            智能裁剪至三分点 · {activeFilter ? FILTER_LABELS[activeFilter] : '原色'}滤镜 · 轻度美颜
          </Text>
        </View>
      </ViewShot>

      {/* 滤镜选择栏 */}
      <View style={styles.filterBar}>
        <Text style={styles.filterBarTitle}>切换滤镜：</Text>
        <View style={styles.filterChips}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                activeFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === f && styles.filterChipTextActive,
                ]}
              >
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.filterChip,
              !activeFilter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(null as any)}
          >
            <Text style={[styles.filterChipText, !activeFilter && styles.filterChipTextActive]}>
              原图
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function getOverlayColor(filter: string): string {
  const colors: Record<string, string> = {
    warm: 'rgba(255, 180, 80, 0.2)',
    cool: 'rgba(80, 140, 255, 0.2)',
    vivid: 'rgba(255, 80, 130, 0.15)',
    soft: 'rgba(255, 210, 190, 0.18)',
  }
  return colors[filter] || 'transparent'
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  viewShot: {
    paddingHorizontal: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
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
  filteredImage: {
    // 滤镜效果通过叠加层实现
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
    mixBlendMode: 'multiply',
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
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  filterBarTitle: {
    fontSize: 13,
    color: '#888',
    flexShrink: 0,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
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
