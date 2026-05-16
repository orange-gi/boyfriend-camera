/**
 * ScoreBoard - 评分板
 * 展示总分 + 各维度分条 + 俏皮建议文案
 */
import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'

export interface ScoreResult {
  totalScore: number      // 0-100
  compositionScore: number // 构图 0-40
  exposureScore: number   // 曝光 0-30
  stabilityScore: number  // 稳定 0-20
  levelScore: number      // 水平 0-10
  suggestions: string[]   // 改进建议文案
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

function DimensionBar({ label, icon, score, maxScore, color, delay }: DimensionProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(score / maxScore, { damping: 16 }))
  }, [score, maxScore])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  const percentage = Math.round((score / maxScore) * 100)

  return (
    <View style={styles.dimRow}>
      <Text style={styles.dimIcon}>{icon}</Text>
      <View style={styles.dimContent}>
        <View style={styles.dimHeader}>
          <Text style={styles.dimLabel}>{label}</Text>
          <Text style={[styles.dimScore, { color }]}>
            {score}/{maxScore}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { backgroundColor: color }, animatedStyle]}
          />
        </View>
      </View>
    </View>
  )
}

const DIMENSIONS: Array<Omit<DimensionProps, 'delay'>> = [
  { label: '构图', icon: '🎯', score: 0, maxScore: 40, color: '#FF6B6B' },
  { label: '曝光', icon: '💡', score: 0, maxScore: 30, color: '#FFB347' },
  { label: '稳定', icon: '🤚', score: 0, maxScore: 20, color: '#4ECDC4' },
  { label: '水平', icon: '📏', score: 0, maxScore: 10, color: '#9B8FE8' },
]

// 总分评语
function getTotalComment(score: number): string {
  if (score >= 90) return '💯 完美男友镜头！太会拍了吧！'
  if (score >= 80) return '🌟 非常棒！男朋友潜力无限！'
  if (score >= 70) return '👍 不错不错，已经比大多数男友强了！'
  if (score >= 60) return '💪 有点感觉了，继续加油！'
  if (score >= 50) return '😅 还需要调教一下～'
  return '🤦‍♂️ 男朋友摄影课开课啦！'
}

export default function ScoreBoard({ result }: Props) {
  const { totalScore, compositionScore, exposureScore, stabilityScore, levelScore, suggestions } = result

  const scoreScale = useSharedValue(0.5)
  const scoreOpacity = useSharedValue(0)

  useEffect(() => {
    scoreOpacity.value = withTiming(1, { duration: 300 })
    scoreScale.value = withSequence(
      withSpring(1.08, { damping: 10 }),
      withSpring(1, { damping: 12 })
    )
  }, [])

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
    opacity: scoreOpacity.value,
  }))

  const scoreColor = totalScore >= 80 ? '#4CAF50' : totalScore >= 60 ? '#FFB347' : '#FF6B6B'

  return (
    <View style={styles.container}>
      {/* 总分展示 */}
      <Animated.View style={[styles.totalSection, scoreAnimatedStyle]}>
        <Text style={styles.totalLabel}>综合评分</Text>
        <Text style={[styles.totalScore, { color: scoreColor }]}>{totalScore}</Text>
        <Text style={styles.totalSuffix}>分</Text>
        <Text style={styles.totalComment}>{getTotalComment(totalScore)}</Text>
      </Animated.View>

      {/* 维度分条 */}
      <View style={styles.dimensionsSection}>
        {([
          { ...DIMENSIONS[0], score: compositionScore, delay: 100 },
          { ...DIMENSIONS[1], score: exposureScore, delay: 200 },
          { ...DIMENSIONS[2], score: stabilityScore, delay: 300 },
          { ...DIMENSIONS[3], score: levelScore, delay: 400 },
        ] as DimensionProps[]).map((dim, i) => (
          <DimensionBar key={i} {...dim} />
        ))}
      </View>

      {/* 俏皮建议 */}
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>💬 今日点评</Text>
          {suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionItem}>
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 小技巧 */}
      <View style={styles.tipSection}>
        <Text style={styles.tipLabel}>💡 今日技巧</Text>
        <Text style={styles.tipText}>
          拍照前让男友说"1、2、3茄子"，在"3"的时候按下快门，比直接拍更自然！
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  totalSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  totalLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  totalScore: {
    fontSize: 80,
    fontWeight: 'bold',
    lineHeight: 90,
  },
  totalSuffix: {
    fontSize: 20,
    color: '#999',
    marginTop: -8,
  },
  totalComment: {
    fontSize: 15,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
  dimensionsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dimIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  dimContent: {
    flex: 1,
  },
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dimLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  dimScore: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  suggestionsSection: {
    marginTop: 16,
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    padding: 14,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  suggestionBullet: {
    color: '#FF8C00',
    fontSize: 14,
    lineHeight: 20,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  tipSection: {
    marginTop: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4A90D9',
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
})
