/**
 * ProgressChart - 进步日记曲线
 * 使用 @shopify/react-native-skia 绘制折线图
 * 优化：useMemo 缓存 Skia Path 对象，避免每帧重建
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

export interface DiaryEntry {
  date: string   // ISO date string
  score: number  // 0-100
  suggestions?: string[]
}

interface Props {
  entries: DiaryEntry[]
  height?: number
}

const PADDING_LEFT = 40
const PADDING_RIGHT = 16
const PADDING_TOP = 16
const PADDING_BOTTOM = 32

export default function ProgressChart({ entries, height = 180 }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const width = useMemo(() => screenWidth - 32, [screenWidth])

  // 创建字体（只在字号变化时重建）
  const labelFont = useMemo(() => matchFont({ fontFamily: 'System', fontSize: 10 }), [])

  // 排序：按时间升序
  const sorted = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)  // 最多显示最近10条

  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM

  if (sorted.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>📈 拍几张照片就能看到进步曲线啦</Text>
        </View>
      </View>
    )
  }

  const minScore = 0
  const maxScore = 100

  // 坐标转换
  const toX = (i: number) =>
    PADDING_LEFT + (i / (sorted.length - 1)) * chartWidth

  const toY = (score: number) =>
    PADDING_TOP + (1 - (score - minScore) / (maxScore - minScore)) * chartHeight

  // 绘制折线 Path（useMemo 缓存，避免每次 render 重建）
  const linePath = useMemo(() => {
    const path = Skia.Path.Make()
    sorted.forEach((entry, i) => {
      const x = toX(i)
      const y = toY(entry.score)
      if (i === 0) {
        path.moveTo(x, y)
      } else {
        path.lineTo(x, y)
      }
    })
    return path
  }, [sorted])

  // 渐变填充 Path
  const fillPath = useMemo(() => {
    const path = Skia.Path.Make()
    path.addPath(linePath)
    const lastX = toX(sorted.length - 1)
    path.lineTo(lastX, PADDING_TOP + chartHeight)
    path.lineTo(PADDING_LEFT, PADDING_TOP + chartHeight)
    path.close()
    return path
  }, [linePath, sorted])

  // Y轴网格线
  const gridScores = [0, 25, 50, 75, 100]
  const gridLines = useMemo(() =>
    gridScores.map((score) => ({
      score,
      y: toY(score),
    })),
    [chartHeight]
  )

  // 数据点
  const dataPoints = useMemo(() =>
    sorted.map((entry, i) => ({
      entry,
      x: toX(i),
      y: toY(entry.score),
    })),
    [sorted]
  )

  // 进步/退步标注
  const annotations = useMemo(() =>
    sorted.slice(1).map((entry, i) => {
      const diff = entry.score - sorted[i].score
      return { diff, x: toX(i + 1), y: toY(entry.score) }
    }),
    [sorted]
  )

  // 进步趋势颜色
  const lastScore = sorted[sorted.length - 1].score
  const firstScore = sorted[0].score
  const isImproving = lastScore >= firstScore
  const lineColor = isImproving ? '#FF6B6B' : '#6495ED'

  return (
    <View style={[styles.container, { height }]}>
      <Canvas style={{ width, height }}>
        {/* Y轴网格 */}
        {gridLines.map((g, i) => (
          <Line
            key={i}
            p1={vec(PADDING_LEFT, g.y)}
            p2={vec(PADDING_LEFT + chartWidth, g.y)}
            color={i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}
            strokeWidth={1}
          />
        ))}

        {/* Y轴标签 */}
        {gridLines.filter((_, i) => i % 2 === 0).map((g, i) => (
          <SkiaText
            key={`y-${i}`}
            text={String(g.score)}
            x={4}
            y={g.y + 4}
            font={labelFont}
            color="rgba(0,0,0,0.3)"
          />
        ))}

        {/* 渐变填充 */}
        <Path
          path={fillPath}
          style="fill"
          color={isImproving ? 'rgba(255,107,107,0.08)' : 'rgba(100,149,237,0.08)'}
        />

        {/* 折线 */}
        <Path
          path={linePath}
          style="stroke"
          strokeWidth={2.5}
          color={lineColor}
          strokeCap="round"
          strokeJoin="round"
        />

        {/* 数据点 */}
        {dataPoints.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === dataPoints.length - 1 ? 6 : 4}
            color={lineColor}
          />
        ))}

        {/* 进步标注 */}
        {annotations.map((a, i) => {
          if (Math.abs(a.diff) < 3) return null
          return (
            <SkiaText
              key={`ann-${i}`}
              text={a.diff > 0 ? `+${a.diff}` : `${a.diff}`}
              x={a.x + 6}
              y={a.y - 6}
              font={labelFont}
              color={a.diff > 0 ? '#4CAF50' : '#FF5722'}
            />
          )
        })}

        {/* X轴日期标签 */}
        {sorted.filter((_, i) => i === 0 || i === sorted.length - 1 || sorted.length <= 5 || i % Math.ceil(sorted.length / 4) === 0).map((entry, i, arr) => {
          const origIndex = sorted.indexOf(entry)
          const x = toX(origIndex)
          const date = new Date(entry.date)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          return (
            <SkiaText
              key={`x-${origIndex}`}
              text={label}
              x={x - 10}
              y={PADDING_TOP + chartHeight + 16}
              font={labelFont}
              color="rgba(0,0,0,0.35)"
            />
          )
        })}
      </Canvas>

      {/* 趋势标签 */}
      <View style={[styles.trendTag, { backgroundColor: isImproving ? 'rgba(76,175,80,0.1)' : 'rgba(100,149,237,0.1)' }]}>
        <Text style={[styles.trendText, { color: isImproving ? '#4CAF50' : '#6495ED' }]}>
          {isImproving ? '📈 整体进步中' : '📉 需要多练习'}
          {' · '}
          共 {sorted.length} 次拍照
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  emptyChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#bbb',
    fontSize: 13,
  },
  trendTag: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
})
