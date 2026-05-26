/**
 * ScoreBoard - 评分板 v4
 * 简洁优雅极致：去 emoji 标题、删冗余百分比、纯文字维度标签、克制的留白
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { COLORS, scoreColor, scoreLabel } from '../../theme/colors'

export interface ScoreResult {
  totalScore: number
  compositionScore: number
  exposureScore: number
  stabilityScore: number
  levelScore: number
  expressionScore: number
  suggestions: string[]
}

interface Props {
  result: ScoreResult
}

interface DimensionProps {
  label: string
  score: number
  maxScore: number
  color: string
  delay: number
}

function AnimatedNumber({ value, style, color }: { value: number; style: import('react-native').StyleProp<import('react-native').TextStyle>; color?: string }) {
  const animValue = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = React.useState(0)
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0

  useEffect(() => {
    animValue.setValue(0)
    Animated.timing(animValue, {
      toValue: safeValue,
      duration: 1500,
      useNativeDriver: false,
    }).start()
    const listener = animValue.addListener((v) => setDisplay(Math.round(v.value)))
    return () => animValue.removeListener(listener)
  }, [safeValue])

  return (
    <Animated.Text style={[style, color ? { color } : {}]}>
      {display}
    </Animated.Text>
  )
}

function DimensionBar({ label, score, maxScore, color, delay }: DimensionProps) {
  const progress = useRef(new Animated.Value(0)).current
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0

  useEffect(() => {
    Animated.spring(progress, {
      toValue: safeScore / maxScore,
      delay,
      damping: 16,
      useNativeDriver: false,
    }).start()
  }, [safeScore, maxScore, delay])

  return (
    <View style={styles.dimRow}>
      {/* 纯文字标签，克制无 emoji */}
      <Text style={[styles.dimLabel, { color }]}>{label}</Text>
      <View style={styles.dimBarWrap}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              { backgroundColor: color },
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        {/* 分数右对齐，不再显示冗余百分比 */}
        <Text style={[styles.dimScore, { color }]}>{safeScore}<Text style={styles.dimMax}>/{maxScore}</Text></Text>
      </View>
    </View>
  )
}

export default function ScoreBoard({ result }: Props) {
  if (!result) {
    return null
  }
  const {
    totalScore,
    compositionScore,
    exposureScore,
    stabilityScore,
    levelScore,
    suggestions,
  } = result

  const totalColor = scoreColor(totalScore)

  const dimensions = [
    { label: '构图', score: compositionScore, maxScore: 40, color: COLORS.primary },
    { label: '曝光', score: exposureScore, maxScore: 30, color: COLORS.warning },
    { label: '稳定', score: stabilityScore, maxScore: 20, color: COLORS.info },
    { label: '表情', score: result.expressionScore, maxScore: 20, color: COLORS.success },
    { label: '水平', score: levelScore, maxScore: 10, color: COLORS.purple },
  ]

  return (
    <View style={styles.container}>
      {/* 总分卡片 — 简洁落地，无阴影 */}
      <View style={styles.totalCard}>
        {/* 极简设计：分数数字本身已带颜色，去掉 badge 背景装饰，视觉更轻盈 */}
        <AnimatedNumber value={totalScore} style={[styles.totalScore, { color: totalColor }]} />
        <Text style={[styles.totalLabel, { color: totalColor }]}>分</Text>
        <View style={styles.totalMeta}>
          <Text style={[styles.totalGrade, { color: totalColor }]}>{scoreLabel(totalScore)}</Text>
        </View>
      </View>

      {/* 分维度 */}
      <View style={styles.dimsCard}>
        {dimensions.map((d, i) => (
          <DimensionBar key={d.label} {...d} delay={i * 80} />
        ))}
      </View>

      {/* 建议 */}
      {suggestions.length > 0 && (
        <View style={styles.suggestCard}>
          <View style={styles.suggestBubble}>
            <Text style={styles.suggestBubbleText}>{suggestions[0]}</Text>
          </View>
          {suggestions.slice(1).map((s, i) => (
            <View key={i} style={styles.suggestRow}>
              <Text style={styles.suggestText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  // 总分卡片 — 简洁落地，无阴影无边框
  totalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // totalBadge 已删除 — 分数数字直接作为焦点，去掉装饰性容器背景
  totalScore: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: -1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  totalMeta: { flex: 1, marginLeft: 16 },
  totalGrade: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  // 维度区
  dimsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
  },
  // 维度行 — 标签左 + bar+分数右
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dimLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 36,
  },
  dimBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  dimScore: {
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  dimMax: {
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  // 建议区
  suggestCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
  },
  suggestBubble: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  suggestBubbleText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  // 去装饰化：删掉无意义的圆点符号，纯缩进传达列表层级
  suggestRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 4,
  },
  // suggestBullet 已删除 — 不需要装饰符号
  suggestText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    // 缩进 20 替代圆点占位，视觉更干净
    paddingLeft: 4,
  },
})
