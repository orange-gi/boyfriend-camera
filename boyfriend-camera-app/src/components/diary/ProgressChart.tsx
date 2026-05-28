/**
 * ProgressChart - 进步日记曲线
 * 使用纯 React Native Animated API 绘制（兼容 React 19）
 * Skia 与 React 19 不兼容，已移除
 */
import React, { useMemo, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Animated } from 'react-native'
import { COLORS } from '../../theme/colors'
import type { DiaryRecord } from '../../services/diaryTypes'

interface Props {
  entries: DiaryRecord[]
  height?: number
}

const PAD = { L: 44, R: 12, T: 20, B: 36 }

export default function ProgressChart({ entries, height = 200 }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const width = screenWidth - 32
  const chartW = width - PAD.L - PAD.R
  const chartH = height - PAD.T - PAD.B

  const sorted = useMemo(
    (): DiaryRecord[] =>
      [...entries]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10),
    [entries],
  )

  if (sorted.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyTitle}>还没有进步记录</Text>
        <Text style={styles.emptySub}>拍几张照片，就能看到分数一点点变高啦</Text>
      </View>
    )
  }

  if (sorted.length === 1) {
    const score = sorted[0].score
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.singlePoint}>
          <Text
            style={[
              styles.singleScore,
              {
                color:
                  score >= 80
                    ? COLORS.scoreGreat
                    : score >= 60
                    ? COLORS.scoreOk
                    : COLORS.scoreBad,
              },
            ]}>
            {score}
          </Text>
          <Text style={styles.singleLabel}>首次得分</Text>
          <Text style={styles.singleDate}>
            {new Date(sorted[0].date).toLocaleDateString('zh-CN')}
          </Text>
        </View>
      </View>
    )
  }

  const maxScore = useMemo(
    () => (sorted.length > 0 ? sorted.reduce((m, e) => (e.score > m ? e.score : m), 0) : 0),
    [sorted],
  )
  const toX = (i: number) => PAD.L + (i / (sorted.length - 1)) * chartW
  const toY = (score: number) => PAD.T + (1 - score / 100) * chartH

  // 动画进度（0→1，触发入场动画）
  const animProgress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    animProgress.setValue(0)
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start()
  }, [entries.length])

  // Y 轴刻度
  const yTicks = [0, 25, 50, 75, 100]

  // 图例数据：max/min 用 useMemo 缓存，避免在 JSX 的 IIFE 中每次渲染重算
  const legendData = useMemo(() => {
    if (sorted.length === 0) return null
    const maxEntry = sorted.reduce((a, b) => (a.score > b.score ? a : b))
    const minEntry = sorted.reduce((a, b) => (a.score < b.score ? a : b))
    return { maxEntry, minEntry }
  }, [sorted])

  return (
    <View style={[styles.container, { height }]}>
      {/* Y 轴刻度标签 */}
      <View style={[styles.yAxis, { left: 0, top: 0, bottom: 0, width: PAD.L }]}>
        {yTicks.map((t) => (
          <Text key={t} style={[styles.yLabel, { top: toY(t) - 6 }]}>
            {t}
          </Text>
        ))}
      </View>

      {/* 水平参考线 */}
      {yTicks.map((t) => (
        <View
          key={t}
          style={[
            styles.gridLine,
            {
              left: PAD.L,
              right: PAD.R,
              top: toY(t),
            },
          ]}
        />
      ))}

      {/* 折线（用 View 段模拟，动画驱动 opacity） */}
      {sorted.map((entry, i) => {
        if (i === 0) return null
        const x1 = toX(i - 1)
        const y1 = toY(sorted[i - 1].score)
        const x2 = toX(i)
        const y2 = toY(entry.score)
        const isHigh = entry.score >= 80
        const color = isHigh ? COLORS.scoreGreat : entry.score >= 60 ? COLORS.scoreOk : COLORS.scoreBad

        return (
          <AnimatedLine
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            color={color}
            animProgress={animProgress}
            index={i}
          />
        )
      })}

      {/* 数据点 */}
      {sorted.map((entry, i) => {
        const x = toX(i)
        const y = toY(entry.score)
        const isMax = entry.score === maxScore
        const dotColor =
          entry.score >= 80
            ? COLORS.scoreGreat
            : entry.score >= 60
            ? COLORS.scoreOk
            : COLORS.scoreBad

        return (
          <AnimatedDot
            key={i}
            x={x}
            y={y}
            color={isMax ? COLORS.warning : dotColor}
            isMax={isMax}
            animProgress={animProgress}
            index={i}
          />
        )
      })}

      {/* X 轴日期标签 */}
      {sorted.map((entry, i) => {
        const show =
          sorted.length <= 5 ||
          i === 0 ||
          i === sorted.length - 1 ||
          i % Math.ceil(sorted.length / 4) === 0
        if (!show) return null
        return (
          <Text
            key={i}
            style={[
              styles.xLabel,
              { left: toX(i) - 20, bottom: 6 },
            ]}>
            {new Date(entry.date).toLocaleDateString('zh-CN', {
              month: 'numeric',
              day: 'numeric',
            })}
          </Text>
        )
      })}

      {/* 图例 — 使用 useMemo 缓存的 legendData */}
      {legendData && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.scoreGreat }]} />
            <Text style={styles.legendText}>最高 {legendData.maxEntry.score}分</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.scoreBad }]} />
            <Text style={styles.legendText}>最低 {legendData.minEntry.score}分</Text>
          </View>
          <Text style={styles.legendCount}>共 {sorted.length} 次拍摄</Text>
        </View>
      )}
    </View>
  )
}

/** 动画线条段 */
function AnimatedLine({
  x1, y1, x2, y2, color, animProgress, index,
}: {
  x1: number; y1: number; x2: number; y2: number
  color: string; animProgress: Animated.Value; index: number
}) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  const opacity = animProgress.interpolate({
    inputRange: [(index - 1) / 10, index / 10],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View
      style={[
        styles.lineSegment,
        {
          left: x1,
          top: y1,
          width: len,
          transform: [{ rotate: `${angle}deg` }],
          backgroundColor: color,
          opacity,
        },
      ]}
    />
  )
}

/** 动画数据点 */
function AnimatedDot({
  x, y, color, isMax, animProgress, index,
}: {
  x: number; y: number; color: string; isMax: boolean
  animProgress: Animated.Value; index: number
}) {
  const scale = animProgress.interpolate({
    inputRange: [index / 10, (index + 1) / 10],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const r = isMax ? 6 : 4

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: color,
          transform: [{ scale }],
        },
      ]}>
      {isMax && <View style={[styles.dotInner, { backgroundColor: '#fff' }]} />}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 4,
  },
  yAxis: { position: 'absolute' },
  yLabel: {
    position: 'absolute',
    right: 6,
    fontSize: 10,
    color: COLORS.textMuted,
    width: 28,
    textAlign: 'right',
  },
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
  },
  lineSegment: {
    position: 'absolute',
    height: 2.5,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  xLabel: {
    position: 'absolute',
    fontSize: 10,
    color: COLORS.textMuted,
    width: 40,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD.L,
    paddingBottom: 8,
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textMuted },
  legendCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 'auto',
  },
  empty: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  singlePoint: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  singleScore: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  singleLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  singleDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
})
