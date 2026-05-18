/**
 * ScoreBoard - 评分板 v2
 * 改进：总分逐位滚动动画、各维度依次展开动画
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { COLORS, scoreColor, scoreLabel } from '../../theme/colors'

export interface ScoreResult {
  totalScore: number
  compositionScore: number
  exposureScore: number
  stabilityScore: number
  levelScore: number
  suggestions: string[]
}

interface Props {
  result: ScoreResult
}

interface DimensionProps {
  label: string
  icon: string
  score: number
  maxScore: number
  color: string
  delay: number
}

function AnimatedNumber({ value, style, color }: { value: number; style: import('react-native').StyleProp<import('react-native').TextStyle>; color?: string }) {
  const animValue = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = React.useState(0)
  // 防御性检查，防止 NaN
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

function DimensionBar({ label, icon, score, maxScore, color, delay }: DimensionProps) {
  const progress = useRef(new Animated.Value(0)).current
  // 防御性检查，防止 NaN 导致动画异常
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0

  useEffect(() => {
    Animated.spring(progress, {
      toValue: safeScore / maxScore,
      delay,
      damping: 16,
      useNativeDriver: false,
    }).start()
  }, [safeScore, maxScore, delay])

  const percentage = useMemo(() => Math.round((safeScore / maxScore) * 100), [safeScore, maxScore])

  return (
    <View style={styles.dimRow}>
      <Text style={styles.dimIcon}>{icon}</Text>
      <View style={styles.dimContent}>
        <View style={styles.dimHeader}>
          <Text style={styles.dimLabel}>{label}</Text>
          <Text style={[styles.dimScore, { color }]}>{score}分</Text>
        </View>
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
        <Text style={styles.dimPercent}>{percentage}%</Text>
      </View>
    </View>
  )
}

export default function ScoreBoard({ result }: Props) {
  // 防御性检查，防止 ResultScreen 还未设置 scoreResult 时崩溃
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
    { label: '构图', icon: '🎯', score: compositionScore, maxScore: 40, color: COLORS.primary },
    { label: '曝光', icon: '💡', score: exposureScore, maxScore: 30, color: COLORS.warning },
    { label: '稳定', icon: '🤚', score: stabilityScore, maxScore: 20, color: '#4ECDC4' },
    { label: '水平', icon: '📏', score: levelScore, maxScore: 10, color: '#9B8FE8' },
  ]

  return (
    <View style={styles.container}>
      {/* 总分卡片 */}
      <View style={styles.totalCard}>
        <View style={[styles.totalBadge, { backgroundColor: totalColor + '15' }]}>
          <AnimatedNumber value={totalScore} style={[styles.totalScore, { color: totalColor }]} />
          <Text style={[styles.totalLabel, { color: totalColor }]}>综合评分</Text>
        </View>
        <View style={styles.totalMeta}>
          <Text style={[styles.totalGrade, { color: totalColor }]}>{scoreLabel(totalScore)}</Text>
          <Text style={styles.totalSubtitle}>总分 100 · 构图40 · 曝光30 · 稳定20 · 水平10</Text>
        </View>
      </View>

      {/* 分维度条 */}
      <View style={styles.dimsCard}>
        <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>📊 详细评分</Text>
        {dimensions.map((d, i) => (
          <DimensionBar key={d.label} {...d} delay={i * 80} />
        ))}
      </View>

      {/* 改进建议 */}
      {suggestions.length > 0 && (
        <View style={styles.suggestCard}>
          <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>💡 改进建议</Text>
          {suggestions.map((s, i) => (
            <View key={i} style={styles.suggestRow}>
              <Text style={styles.suggestBullet}>•</Text>
              <Text style={[styles.suggestText, { color: COLORS.textSecondary }]}>{s}</Text>
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
    gap: 12,
  },
  totalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  totalBadge: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  totalScore: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  totalLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  totalMeta: { flex: 1, marginLeft: 16 },
  totalGrade: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  dimsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dimIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  dimContent: { flex: 1, marginLeft: 10 },
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dimLabel: { fontSize: 13, color: COLORS.textSecondary },
  dimScore: { fontSize: 13, fontWeight: '600' },
  barTrack: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  dimPercent: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  suggestCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  suggestBullet: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 8,
    marginTop: 1,
  },
  suggestText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
})
