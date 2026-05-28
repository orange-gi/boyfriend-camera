/**
 * HomeScreen - 首页
 */
import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDiary } from '../services/analyzer'
import { avgScore as calcAvgScore } from '../utils/scoring'
import { useTemplates } from '../hooks/useTemplates'
import { COLORS, scoreColor } from '../theme/colors'
import { borderRadius, spacing, typography } from '../theme/index'
import VoiceCoach from '../components/camera/VoiceCoach'
import { logger } from '../utils/logger'
import { ONBOARD_STEPS, FIRST_TIME_POSE_TIPS, DAILY_TIPS } from '../constants/homeData'



const ONBOARD_KEY = 'onboarded_v4'
const TIP_DISMISS_KEY = 'tip_dismissed_today_v4'

/** 模块层常量：日内每天固定，同一天内调用结果相同 */
function getDailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>()
  const [diaryCount, setDiaryCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [trend, setTrend] = useState<'up' | 'down' | 'stable' | null>(null)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [poseTipIndex, setPoseTipIndex] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [totalProgress, setTotalProgress] = useState<number | null>(null)
  const { templates, loading: templatesLoading, error: templatesError, refresh } = useTemplates()

  const enterAnim = useSharedValue(0)
  useEffect(() => {
    // TTS 初始化完成后播放欢迎语，避免初始化未完成时 speakDailyWelcome 被静默跳过
    VoiceCoach.initialize()
      .then(() => VoiceCoach.speakDailyWelcome(diaryCount === 0))
      .catch(() => {})
    loadStats(); checkOnboard(); checkTipDismissed()
    enterAnim.value = withTiming(1, { duration: 350 })
  }, [])

  const isNewUser = diaryCount === 0
  useEffect(() => {
    if (!isNewUser) return
    const iv = setInterval(() => { setPoseTipIndex(i => (i + 1) % FIRST_TIME_POSE_TIPS.length) }, 4000)
    return () => clearInterval(iv)
  }, [isNewUser])

  async function loadStats() {
    setStatsLoading(true)
    try {
      const diary = await getDiary()
      setDiaryCount(diary.length)
      const today = new Date().toDateString()
      setTodayCount(diary.filter(r => new Date(r.date).toDateString() === today).length)
      if (diary.length > 0) {
        const sortedByDate = [...diary].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const firstEntry = sortedByDate[0]
        const lastEntry = sortedByDate[sortedByDate.length - 1]
        const daysSince = Math.floor((Date.now() - new Date(lastEntry.date).getTime()) / 86400000)
        if (daysSince >= 2) VoiceCoach.speakStreakBroken().catch(() => {})
        const avg = calcAvgScore(diary)
        setAvgScore(avg)
        // 总进步 = 最新分 - 首张分（有正负值表示进步或退步）
        if (diary.length >= 2) {
          setTotalProgress(lastEntry.score - firstEntry.score)
        } else {
          setTotalProgress(null)
        }
      }
      if (diary.length >= 4) {
        const sorted = [...diary]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(r => r.score)
        const recentCount = Math.min(3, Math.floor(sorted.length / 2))
        const recentScores = sorted.slice(-recentCount)
        const olderScores = sorted.slice(-recentCount * 2, -recentCount)
        if (olderScores.length > 0) {
          const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
          const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length
          const diff = recentAvg - olderAvg
          if (diff > 3) setTrend('up')
          else if (diff < -3) setTrend('down')
          else setTrend('stable')
        } else {
          setTrend(null)
        }
      } else {
        setTrend(null)
      }
    } catch (e: unknown) { logger.warn('HomeScreen', '加载日记失败', e) }
    finally { setStatsLoading(false) }
  }

  async function checkOnboard() {
    try { const d = await AsyncStorage.getItem(ONBOARD_KEY); if (!d) setShowOnboard(true) }
    catch { setShowOnboard(true) }
  }

  async function checkTipDismissed() {
    try {
      const d = await AsyncStorage.getItem(TIP_DISMISS_KEY)
      if (d === new Date().toDateString()) setTipDismissed(true)
    } catch { /* ignore */ }
  }

  async function dismissTip() {
    await AsyncStorage.setItem(TIP_DISMISS_KEY, new Date().toDateString())
    setTipDismissed(true)
  }

  async function finishOnboard() {
    try { await AsyncStorage.setItem(ONBOARD_KEY, 'true') } catch { /* ignore */ }
    setShowOnboard(false)
  }

  function nextOnboardStep() {
    if (onboardStep < ONBOARD_STEPS.length - 1) setOnboardStep(onboardStep + 1)
    else finishOnboard()
  }

  const heroStyle = useAnimatedStyle(() => ({ opacity: enterAnim.value, transform: [{ translateY: 20 * (1 - enterAnim.value) }] }))
  const statsStyle = useAnimatedStyle(() => ({ opacity: enterAnim.value }))
  const cameraStyle = useAnimatedStyle(() => ({ opacity: enterAnim.value, transform: [{ scale: 0.7 + 0.3 * enterAnim.value }] }))
  const featuresStyle = useAnimatedStyle(() => ({ opacity: enterAnim.value, transform: [{ translateY: 30 * (1 - enterAnim.value) }] }))

  const totalTemplates = templates.length
  const avgScoreColor = scoreColor(avgScore)

  // 每日提示卡
  const dailyTipCard = !tipDismissed ? (
    <Animated.View style={[styles.dailyTipCard, heroStyle]}>
      <TouchableOpacity onPress={dismissTip} activeOpacity={0.85} style={{ flex: 1 }}>
        <Text style={styles.dailyTipText}>{getDailyTip().text}</Text>
      </TouchableOpacity>
    </Animated.View>
  ) : null

  // 简洁优雅：趋势行仅保留数字和方向，删除冗余进度条
  const trendRowEl = useMemo(() => {
    // 趋势需要至少 4 条数据（前后期各 2 条）才有意义；少于 4 条时隐藏趋势指标
    if (diaryCount < 4 || avgScore <= 0) return null
    const tc = trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.danger : COLORS.textMuted
    const tl = trend === 'up' ? '↑ 进步中' : trend === 'down' ? '↓ 下滑' : '→ 稳定'
    const lc = avgScore >= 80 ? COLORS.success : avgScore >= 60 ? COLORS.warning : COLORS.primary
    return (
      <View style={styles.trendRow}>
        <Text style={[styles.trendScore, { color: lc }]}>{avgScore}</Text>
        <Text style={[styles.trendLabel, { color: tc }]}>{tl}</Text>
      </View>
    )
  }, [diaryCount, avgScore, trend])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {dailyTipCard}

      {statsLoading ? (
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            {[{label:'已拍摄'},{label:'平均分'},{label:'姿势模板'}].map(({label}, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={styles.skeletonNum}>—</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : diaryCount > 0 ? (
        <Animated.View style={[styles.statsCard, statsStyle]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.textPrimary }]}>{diaryCount}</Text>
              <Text style={styles.statLabel}>已拍摄</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: avgScoreColor }]}>{avgScore}</Text>
              <Text style={styles.statLabel}>平均分</Text>
              {totalProgress !== null && (
                <Text style={[
                  styles.progressTag,
                  { color: totalProgress >= 0 ? COLORS.success : COLORS.primary },
                ]}>
                  {totalProgress >= 0 ? `+${totalProgress} ↑` : `${totalProgress} ↓`}
                </Text>
              )}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.textMuted, fontSize: 28, lineHeight: 36 }]}>{totalTemplates}</Text>
              <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>姿势模板</Text>
            </View>
          </View>
          {trendRowEl}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.cameraBtnWrapper, cameraStyle]}>
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
          activeOpacity={0.85}
          accessibilityLabel="开始拍照"
          accessibilityRole="button"
        >
          <Text style={[styles.cameraBtnText, { color: COLORS.textOnPrimary }]}>开始拍照</Text>
          {isNewUser && <View style={styles.newBadge}><Text style={styles.newBadgeText}>新</Text></View>}
        </TouchableOpacity>
        <View style={styles.cameraBtnSub}>
          {templatesLoading ? <Text style={styles.cameraBtnSubText}>正在加载姿势模板...</Text>
            : templatesError ? <TouchableOpacity onPress={refresh} activeOpacity={0.72}><Text style={[styles.cameraBtnSubText, { color: COLORS.primary }]}>加载失败，点击重试</Text></TouchableOpacity>
            : totalTemplates > 0 ? <Text style={styles.cameraBtnSubText}>{totalTemplates} 个姿势模板可用</Text>
            : <Text style={styles.cameraBtnSubText}>姿势模板加载中...</Text>}
        </View>
        {todayCount > 0 && (
          <Text style={styles.todayCountBadge}>{todayCount} 张 / 今日</Text>
        )}
        {todayCount === 0 && diaryCount > 0 && (
          <Text style={[styles.todayCountBadge, { color: COLORS.textMuted }]}>今日还未拍摄</Text>
        )}
      </Animated.View>

      {isNewUser && (
        <Animated.View style={[styles.poseTipCard, heroStyle]}>
          <Text style={styles.poseTipText}>{FIRST_TIME_POSE_TIPS[poseTipIndex].text}</Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.bottomNav, featuresStyle]}>
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate({ name: 'Diary' as const, params: undefined })} activeOpacity={0.72}>
          <Text style={styles.bottomNavText}>进步日记</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })} activeOpacity={0.72}>
          <Text style={styles.bottomNavText}>拍照</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={{ height: 40 }} />

      <Modal visible={showOnboard} transparent animationType="fade">
        <View style={styles.onboardOverlay}>
          <View style={styles.onboardCard}>
            <View style={styles.onboardStepIndicator}>
              {ONBOARD_STEPS.map((_, i) => (
                <View key={i} style={[styles.onboardDot, i === onboardStep && styles.onboardDotActive, i < onboardStep && styles.onboardDotDone]} />
              ))}
            </View>
            <Text style={styles.onboardStepLabel}>{onboardStep + 1} / {ONBOARD_STEPS.length}</Text>
            <Text style={styles.onboardTitle}>{ONBOARD_STEPS[onboardStep].title}</Text>
            <Text style={styles.onboardDesc}>{ONBOARD_STEPS[onboardStep].desc}</Text>
            <View style={styles.onboardBtns}>
              {onboardStep > 0 && <TouchableOpacity style={styles.onboardBackBtn} onPress={() => setOnboardStep(onboardStep - 1)} activeOpacity={0.72}><Text style={styles.onboardBackBtnText}>‹ 上一步</Text></TouchableOpacity>}
              <TouchableOpacity style={[styles.onboardNextBtn, onboardStep === 0 && styles.onboardNextBtnFull]} onPress={nextOnboardStep} activeOpacity={0.72}>
                <Text style={styles.onboardNextBtnText}>{onboardStep < ONBOARD_STEPS.length - 1 ? '下一步 →' : '开始使用'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingTop: 56, paddingHorizontal: spacing[5], paddingBottom: 0 },
  // 每日提示卡：去装饰化，纯文字留白
  dailyTipCard: {
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
  },
  dailyTipText: { fontSize: typography.fontSize.md, color: COLORS.textMuted, lineHeight: 22 },
  // 新用户姿势提示卡：去装饰化
  poseTipCard: {
    marginBottom: spacing[5],
    paddingVertical: spacing[2],
  },
  // 简洁优雅：去掉 backgroundColor 和 borderRadius — bg === bgCard 皆为白，
  // borderRadius 是装饰性噪音；留 padding 和 marginBottom 保持布局呼吸感
  statsCard: { padding: spacing[5], marginBottom: spacing[6] },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  skeletonNum: { fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.bold, lineHeight: 48, color: COLORS.divider, marginBottom: 4, textAlign: 'center' },
  statNumber: { fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.bold, lineHeight: 48 },
  statLabel: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: 2, fontWeight: typography.fontWeight.medium },
  // 简洁优雅：进步标签，无背景色，仅靠文字颜色传达方向
  progressTag: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, marginTop: 2 },
  statDivider: { width: 0.5, height: 36, backgroundColor: COLORS.divider, marginHorizontal: spacing[2] },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[4], paddingTop: spacing[4], gap: spacing[2] },
  trendLabel: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, flexShrink: 0 },
  trendScore: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: COLORS.textMuted, flexShrink: 0 },
  cameraBtnWrapper: { alignItems: 'center', marginBottom: spacing[6] },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, paddingVertical: 20, paddingHorizontal: 56, gap: spacing[2], backgroundColor: COLORS.primary },
  cameraBtnText: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, letterSpacing: 0.5, color: COLORS.textOnPrimary },
  // 简洁优雅：去掉背景色 — 新标签本身承载信息，无需装饰性背景
  newBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  newBadgeText: { color: COLORS.textOnPrimary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold },
  cameraBtnSub: { marginTop: spacing[3] },
  cameraBtnSubText: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, textAlign: 'center' },
  todayCountBadge: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: spacing[2], textAlign: 'center' },
  poseTipText: { fontSize: typography.fontSize.md, color: COLORS.textSecondary, lineHeight: 22 },
  bottomNav: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  bottomNavBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  bottomNavText: { fontSize: typography.fontSize.md, color: COLORS.textMuted, fontWeight: typography.fontWeight.medium },
  onboardOverlay: { flex: 1, backgroundColor: COLORS.blackAlpha50, justifyContent: 'center', alignItems: 'center', padding: 24 },
  // 简洁优雅：去掉 backgroundColor — bg === bgCard 皆为白，背景无意义；maxWidth 替代 100% 避免过大
  onboardCard: { borderRadius: borderRadius['2xl'], padding: 24, maxWidth: 340, width: '100%', alignItems: 'center' },
  onboardStepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  onboardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.divider },
  onboardDotActive: { backgroundColor: COLORS.primary, width: 20 },
  onboardDotDone: { backgroundColor: COLORS.primary },
  onboardStepLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, fontWeight: '600', letterSpacing: 1 },
  onboardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  onboardDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  onboardBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  onboardBackBtn: { flex: 1, paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  onboardBackBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  onboardNextBtn: { flex: 2, paddingVertical: 14, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: 'center' },
  onboardNextBtnFull: { flex: 1 },
  onboardNextBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textOnPrimary },
})
