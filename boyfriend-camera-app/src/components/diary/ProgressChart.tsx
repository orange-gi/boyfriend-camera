/**
 * ProgressChart - 进步日记曲线
 * 使用 @shopify/react-native-skia 绘制折线图
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import {
  Canvas,
  Path,
  Skia,
  Line,
  Text as SkiaText,
  vec,
  Circle,
  matchFont,
} from '@shopify/react-native-skia'
import { COLORS } from '../../theme/colors'
import { colors } from '../../theme/index'
import type { DiaryRecord } from '../../services/analyzer'

interface Props {
  entries: DiaryRecord[]
  height?: number
}

const PADDING = { L: 44, R: 12, T: 20, B: 36 }

export default function ProgressChart({ entries, height = 200 }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const width = screenWidth - 32

  // 排序：按时间升序
  const sorted = useMemo((): DiaryRecord[] =>
    [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10),
    [entries]
  )

  const chartW = width - PADDING.L - PADDING.R
  const chartH = height - PADDING.T - PADDING.B

  // 空状态
  if (sorted.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyIcon}>📈</Text>
        <Text style={styles.emptyTitle}>还没有进步记录</Text>
        <Text style={styles.emptySub}>拍几张照片，就能看到分数一点点变高啦</Text>
      </View>
    )
  }

  // 单点：展示分数圆环
  if (sorted.length === 1) {
    const score = sorted[0].score
    const cx = width / 2
    const cy = height / 2 - 10
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.singlePoint}>
          <Text style={[styles.singleScore, { color: score >= 80 ? COLORS.scoreGreat : score >= 60 ? COLORS.scoreOk : COLORS.scoreBad }]}>
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

  // 坐标转换
  const toX = (i: number) => PADDING.L + (i / (sorted.length - 1)) * chartW
  const toY = (score: number) => PADDING.T + (1 - score / 100) * chartH

  // Y 轴刻度
  const yTicks = [0, 25, 50, 75, 100]

  // 渐变色区域 path
  const areaPath = useMemo(() => {
    const path = Skia.Path.Make()
    const firstX = toX(0)
    const lastX = toX(sorted.length - 1)
    path.moveTo(firstX, PADDING.T + chartH)
    sorted.forEach((e, i) => path.lineTo(toX(i), toY(e.score)))
    path.lineTo(lastX, PADDING.T + chartH)
    path.close()
    return path
  }, [sorted])

  // 折线 path
  const linePath = useMemo(() => {
    const path = Skia.Path.Make()
    sorted.forEach((e, i) => {
      const x = toX(i)
      const y = toY(e.score)
      i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)
    })
    return path
  }, [sorted])

  return (
    <View style={[styles.container, { height }]}>
      {/* Y 轴刻度标签 */}
      <View style={[styles.yAxis, { left: 0, top: 0, bottom: 0, width: PADDING.L }]}>
        {yTicks.map((t) => (
          <Text key={t} style={[styles.yLabel, { top: toY(t) - 6 }]}>
            {t}
          </Text>
        ))}
      </View>

      <Canvas style={{ width, height }}>
        {/* 水平参考线 */}
        {yTicks.map((t) => (
          <Line
            key={t}
            p1={vec(PADDING.L, toY(t))}
            p2={vec(width - PADDING.R, toY(t))}
            color={t === 0 || t === 100 ? COLORS.divider : 'rgba(0,0,0,0.06)'}
            strokeWidth={t === 0 || t === 100 ? 1 : 0.5}
          />
        ))}

        {/* 渐变区域填充 */}
        {sorted.length >= 2 && (
          <Path
            path={areaPath}
            color={colors.primaryLight}
          />
        )}

        {/* 折线 */}
        <Path
          path={linePath}
          color={COLORS.primary}
          strokeWidth={2.5}
          style="stroke"
          strokeCap="round"
          strokeJoin="round"
        />

        {/* 数据点 */}
        {sorted.map((e, i) => {
          const x = toX(i)
          const y = toY(e.score)
          const dotColor = e.score >= 80 ? COLORS.scoreGreat : e.score >= 60 ? COLORS.scoreOk : COLORS.scoreBad
          const isMax = sorted.length > 0 && e.score === Math.max(...sorted.map(s => s.score))
          return (
            <React.Fragment key={i}>
              {/* 最高分特殊标记：金色光晕 */}
              {isMax && <Circle cx={x} cy={y} r={9} color={colors.warningLight} />}
              <Circle cx={x} cy={y} r={isMax ? 6 : 4} color={isMax ? colors.warning : dotColor} />
              <Circle cx={x} cy={y} r={isMax ? 3 : 2} color="#fff" />
            </React.Fragment>
          )
        })}

        {/* X 轴日期标签（稀疏显示） */}
        {sorted.map((e, i) => {
          const show = sorted.length <= 5 || i === 0 || i === sorted.length - 1 || i % Math.ceil(sorted.length / 4) === 0
          if (!show) return null
          return (
            <SkiaText
              key={i}
              text={new Date(e.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              x={toX(i) - 20}
              y={height - 8}
              font={matchFont({ fontSize: 10, fontFamily: 'System' })}
              color={COLORS.textMuted}
            />
          )
        })}
      </Canvas>

      {/* 最高/最低分标签 */}
      {sorted.length > 0 && (() => {
        const maxEntry = sorted.reduce((a, b) => a.score > b.score ? a : b)
        const minEntry = sorted.reduce((a, b) => a.score < b.score ? a : b)
        return (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.scoreGreat }]} />
              <Text style={styles.legendText}>最高 {maxEntry.score}分</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.scoreBad }]} />
              <Text style={styles.legendText}>最低 {minEntry.score}分</Text>
            </View>
            <Text style={styles.legendCount}>共 {sorted.length} 次拍摄</Text>
          </View>
        )
      })()}
    </View>
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING.L,
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
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
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
