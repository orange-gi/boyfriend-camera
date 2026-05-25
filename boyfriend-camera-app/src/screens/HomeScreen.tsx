/**
 * HomeScreen - 首页
 */
import React, { useEffect, useState } from 'react'
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
import { borderRadius, spacing, typography, hexAlpha } from '../theme/index'
import VoiceCoach from '../components/camera/VoiceCoach'
import { logger } from '../utils/logger'
import { ONBOARD_STEPS, FIRST_TIME_POSE_TIPS, DAILY_TIPS } from '../constants/homeData'

function getDailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

const ONBOARD_KEY = 'onboarded_v4'
const TIP_DISMISS_KEY = 'tip_dismissed_today_v4'

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
  const { templates, loading: templatesLoading, error: templatesError, refresh } = useTemplates()

  const enterAnim = useSharedValue(0)
  useEffect(() => {
    loadStats(); checkOnboard(); checkTipDismissed()
    enterAnim.value = withTiming(1, { duration: 350 })
  }, [])

  useEffect(() => {
    if (!statsLoading) VoiceCoach.speakDailyWelcome(diaryCount === 0)
  }, [statsLoading])

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
        const avg = calcAvgScore(diary)
        setAvgScore(avg)
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {!tipDismissed && (() => {
        const tip = getDailyTip()
        return (
          <Animated.View style={[styles.dailyTipCard, heroStyle]}>
            <TouchableOpacity
              style={styles.dailyTipTouchable}
              onPress={dismissTip}
              activeOpacity={0.85}
            >
              <View style={styles.dailyTipContent}>
                <Text style={styles.dailyTipLabel}>今日技巧</Text>
                <Text style={styles.dailyTipText}>{tip.text}</Text>
              </View>
              <Text style={styles.dailyTipCloseIcon}>×</Text>
            </TouchableOpacity>
          </Animated.View>
        )
      })()}

      {statsLoading ? (
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            {[0,1,2].map(i => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <View style={styles.skeletonNum} />
                  <Text style={styles.statsLoadingText}>{i === 0 ? '已拍摄' : i === 1 ? '平均分' : '姿势模板'}</Text>
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
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.textPrimary }]}>{totalTemplates}</Text>
              <Text style={styles.statLabel}>姿势模板</Text>
            </View>
          </View>
          {diaryCount >= 2 && avgScore > 0 && (() => {
            const trendColor = trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.danger : COLORS.textMuted
            const trendLabel = trend === 'up' ? '在进步，继续加油' : trend === 'down' ? '有点下滑，多拍几张' : '表现稳定'
            const scoreLevelColor = avgScore >= 80 ? COLORS.success : avgScore >= 60 ? COLORS.warning : COLORS.primary
            return (
              <View style={styles.trendRow}>
                <Text style={styles.trendText}>{trendLabel}</Text>
                <View style={[styles.trendBar, { backgroundColor: COLORS.divider }]}>
                  <View style={[styles.trendBarFill, { width: `${avgScore}%` as const, backgroundColor: scoreLevelColor }]} />
                </View>
                <Text style={[styles.trendPercent, { color: scoreLevelColor }]}>{avgScore}分</Text>
              </View>
            )
          })()}
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
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate({ name: 'Home' as const, params: undefined })} activeOpacity={0.72}>
          <View style={styles.bottomNavPillActive}><Text style={styles.bottomNavTextActive}>首页</Text></View>
        </TouchableOpacity>
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
  dailyTipCard: { marginBottom: spacing[4] },
  dailyTipTouchable: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], paddingRight: spacing[2] },
  dailyTipContent: { flex: 1 },
  dailyTipLabel: { fontSize: typography.fontSize.xs, color: COLORS.textMuted, fontWeight: typography.fontWeight.medium, marginBottom: 4 },
  dailyTipText: { fontSize: typography.fontSize.md, color: COLORS.textSecondary, lineHeight: 22 },
  dailyTipCloseIcon: { fontSize: 20, color: COLORS.textMuted, marginLeft: spacing[3], lineHeight: 20 },
  poseTipCard: { paddingLeft: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[5] },
  statsCard: { backgroundColor: COLORS.bgCard, borderRadius: borderRadius.lg, padding: spacing[5], marginBottom: spacing[6] },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  skeletonNum: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.divider, marginBottom: 4 },
  statNumber: { fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.bold, lineHeight: 48 },
  statLabel: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: 2, fontWeight: typography.fontWeight.medium },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.divider, marginHorizontal: spacing[2] },
  statsLoadingText: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: 4, alignSelf: 'center' },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[5], paddingTop: spacing[4], gap: spacing[3] },
  trendText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, flexShrink: 0 },
  trendBar: { flex: 1, height: 6, borderRadius: borderRadius.sm, overflow: 'hidden' },
  trendBarFill: { height: '100%', borderRadius: borderRadius.sm },
  trendPercent: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, width: 36, textAlign: 'right', flexShrink: 0 },
  cameraBtnWrapper: { alignItems: 'center', marginBottom: spacing[7] },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, paddingVertical: 20, paddingHorizontal: 56, gap: spacing[2], backgroundColor: COLORS.primary },
  cameraBtnText: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, letterSpacing: 0.5, color: COLORS.textOnPrimary },
  newBadge: { backgroundColor: hexAlpha(COLORS.bgCard, 0.25), borderRadius: borderRadius.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  newBadgeText: { color: COLORS.textOnPrimary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold },
  cameraBtnSub: { marginTop: spacing[3] },
  cameraBtnSubText: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, textAlign: 'center' },
  todayCountBadge: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: spacing[2], textAlign: 'center' },
  poseTipText: { fontSize: typography.fontSize.md, color: COLORS.textSecondary, lineHeight: 22 },
  bottomNav: { flexDirection: 'row', paddingVertical: 6, gap: 6 },
  bottomNavBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: borderRadius.xl },
  bottomNavPillActive: { backgroundColor: hexAlpha(COLORS.primary, 0.12), borderRadius: borderRadius.xl, paddingVertical: 8, paddingHorizontal: 16 },
  bottomNavTextActive: { fontSize: typography.fontSize.md, color: COLORS.primary, fontWeight: '700' },
  bottomNavText: { fontSize: typography.fontSize.md, color: COLORS.textMuted },
  onboardOverlay: { flex: 1, backgroundColor: COLORS.blackAlpha50, justifyContent: 'center', alignItems: 'center', padding: 24 },
  // 简洁优雅：borderRadius 20（与 diaryCard 一致）；padding 24（收紧留白）
  onboardCard: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
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
