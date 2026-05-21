/**
 * HomeScreen - 首页 v4 (Design Round 2)
 * 改进：设计系统 Token 化、Hero 区重设计、统计数据条强化、拍照按钮质感升级、功能卡片网格化
 */
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Modal } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDiary } from '../services/analyzer'
import { avgScore as calcAvgScore } from '../utils/scoring'
import { useTemplates } from '../hooks/useTemplates'
import { COLORS, scoreColor } from '../theme/colors'
import { shadows, borderRadius, spacing, typography } from '../theme/index'
import { logger } from '../utils/logger'
import { ONBOARD_STEPS, FIRST_TIME_POSE_TIPS, DAILY_TIPS } from '../constants/homeData'

const { width: SCREEN_W } = Dimensions.get('window')

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了还在拍照呀～'
  if (h < 9) return '早上好！今天也要美美的～'
  if (h < 12) return '上午好！光线正好～'
  if (h < 14) return '中午好！吃饱了来拍一张～'
  if (h < 17) return '下午好！阳光正好～'
  if (h < 19) return '傍晚好！夕阳超美的～'
  if (h < 22) return '晚上好！夜景模式开启～'
  return '夜深了还不睡？拍张照再睡～'
}


function getDailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

const ONBOARD_KEY = 'onboarded_v4'
const TIP_DISMISS_KEY = 'tip_dismissed_today_v4'

const FEATURES = [
  { label: '构图辅助', desc: '九宫格 / 黄金螺旋 / 三角构图线实时叠加' },
  { label: '姿势模板', desc: '半透明剪影引导，让男友知道该怎么站' },
  { label: '智能修图', desc: '智能裁剪到三分点，自动滤镜美化' },
  { label: '进步日记', desc: '记录每次评分和进步曲线，越拍越好' },
] as const

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>()
  const [diaryCount, setDiaryCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  // 趋势状态：'up' | 'down' | 'stable' | null
  const [trend, setTrend] = useState<'up' | 'down' | 'stable' | null>(null)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [expandedTip, setExpandedTip] = useState(false)
  const [displayDiaryCount, setDisplayDiaryCount] = useState(0)
  const [displayAvgScore, setDisplayAvgScore] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [poseTipIndex, setPoseTipIndex] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const { templates, loading: templatesLoading, error: templatesError, refresh } = useTemplates()

  // 统一入场动画
  const enterAnim = useSharedValue(0)
  useEffect(() => {
    loadStats(); checkOnboard(); checkTipDismissed()
    enterAnim.value = withTiming(1, { duration: 350 })
  }, [])

  // 数字动画：直接使用目标值，不再做缓动计数
  useEffect(() => {
    setDisplayDiaryCount(diaryCount)
    setDisplayAvgScore(Math.round(avgScore))
  }, [diaryCount, avgScore])

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
        setDisplayDiaryCount(diary.length)
        setDisplayAvgScore(avg)
      }
      // 计算真实趋势：比较最近 3 次 vs 更早的 3 次
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
  const avgScoreColor = scoreColor(displayAvgScore || avgScore)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hero 区 */}
      <Animated.View style={[styles.heroSection, heroStyle]}>
        <Text style={styles.timeGreeting}>{getTimeGreeting()}</Text>
        <View style={styles.heroTitleRow}>
          <Text style={styles.heroIcon}>📸</Text>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>男友相机</Text>
            <Text style={styles.heroSubtitle}>让男朋友越拍越好</Text>
          </View>
        </View>
      </Animated.View>

      {/* 每日小技巧 */}
      {!tipDismissed && (() => {
        const tip = getDailyTip()
        const moreTip = DAILY_TIPS[(Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000) + 1) % DAILY_TIPS.length]
        return (
          <Animated.View style={[styles.dailyTipCard, heroStyle]}>
            <TouchableOpacity
              style={styles.dailyTipTouchable}
              onPress={() => setExpandedTip(v => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.dailyTipLeft}><Text style={styles.dailyTipIcon}>{tip.icon}</Text></View>
              <View style={styles.dailyTipContent}>
                <View style={styles.dailyTipHeaderRow}>
                  <Text style={styles.dailyTipLabel}>💡 今日拍照技巧</Text>
                  <Text style={styles.dailyTipExpandIcon}>{expandedTip ? '▲' : '▼'}</Text>
                </View>
                <Text style={styles.dailyTipText}>{tip.text}</Text>
                {expandedTip && (
                  <View style={styles.dailyTipExpandedContent}>
                    <View style={styles.dailyTipDivider} />
                    <View style={styles.dailyTipMoreRow}>
                      <Text style={styles.dailyTipMoreIcon}>{moreTip.icon}</Text>
                      <Text style={styles.dailyTipMoreText}>{moreTip.text}</Text>
                    </View>
                    <Text style={styles.dailyTipMoreHint}>点击收起</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dailyTipClose} onPress={dismissTip} activeOpacity={0.72} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dailyTipCloseText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )
      })()}

      {/* 统计数据条 */}
      {statsLoading ? (
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={[styles.statItem, styles.statItemSkeleton]}>
              <View style={styles.skeletonNum} />
              <Text style={styles.statsLoadingText}>已拍摄</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={[styles.statItem, styles.statItemSkeleton]}>
              <View style={styles.skeletonNum} />
              <Text style={styles.statsLoadingText}>平均分</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={[styles.statItem, styles.statItemSkeleton]}>
              <View style={styles.skeletonNum} />
              <Text style={styles.statsLoadingText}>模板</Text>
            </View>
          </View>
        </View>
      ) : diaryCount > 0 ? (
        <Animated.View style={[styles.statsCard, statsStyle]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.textPrimary }]}>{displayDiaryCount}</Text>
              <Text style={styles.statLabel}>已拍摄</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: avgScoreColor }]}>{displayAvgScore}</Text>
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
            const trendEmoji = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'
            const trendLabel = trend === 'up' ? '在进步！继续加油' : trend === 'down' ? '有点下滑，多拍几张找感觉' : '表现稳定'
            const scoreColor = avgScore >= 80 ? COLORS.success : avgScore >= 60 ? COLORS.warning : COLORS.primary
            return (
              <View style={styles.trendRow}>
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {trendEmoji} {trendLabel}
                </Text>
                <View style={[styles.trendBar, { backgroundColor: COLORS.divider }]}>
                  <View style={[styles.trendBarFill, { width: `${avgScore}%` as const, backgroundColor: scoreColor }]} />
                </View>
                <Text style={[styles.trendPercent, { color: scoreColor }]}>{avgScore}分</Text>
              </View>
            )
          })()}
        </Animated.View>
      ) : null}

      {/* 拍照主按钮 */}
      <Animated.View style={[styles.cameraBtnWrapper, cameraStyle]}>
        <TouchableOpacity
          style={[styles.cameraBtn, isNewUser ? styles.cameraBtnNewUser : styles.cameraBtnRegular]}
          onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
          activeOpacity={0.85}
        >
          <View style={styles.cameraBtnInner}><Text style={styles.cameraBtnIcon}>📷</Text></View>
          <View style={styles.cameraBtnTextRow}>
            <Text style={[styles.cameraBtnText, { color: COLORS.textOnPrimary }]}>开始拍照</Text>
            {isNewUser && <View style={styles.newBadge}><Text style={styles.newBadgeText}>新</Text></View>}
          </View>
        </TouchableOpacity>
        <View style={styles.cameraBtnSub}>
          {templatesLoading ? <Text style={styles.cameraBtnSubText}>⏳ 正在加载姿势模板...</Text>
            : templatesError ? <TouchableOpacity onPress={refresh} activeOpacity={0.72}><Text style={[styles.cameraBtnSubText, { color: COLORS.primary }]}>⚠️ 加载失败，点击重试</Text></TouchableOpacity>
            : totalTemplates > 0 ? <Text style={styles.cameraBtnSubText}>🌟 已有 <Text style={{ fontWeight: '700', color: COLORS.primary }}>{totalTemplates}</Text> 个姿势模板可用</Text>
            : <Text style={styles.cameraBtnSubText}>姿势模板加载中...</Text>}
        </View>
        {todayCount > 0 && <View style={styles.todayCountBadge}><Text style={styles.todayCountIcon}>📸</Text><Text style={styles.todayCountText}>今日已拍 <Text style={styles.todayCountNum}>{todayCount}</Text> 张</Text></View>}
        {todayCount === 0 && diaryCount > 0 && <View style={[styles.todayCountBadge, { backgroundColor: COLORS.warningLight }]}><Text style={styles.todayCountIcon}>🌟</Text><Text style={styles.todayCountText}>今天还没拍！去拍一张吧～</Text></View>}
      </Animated.View>

      {/* 姿势提示卡 */}
      {isNewUser && (
        <Animated.View style={[styles.poseTipCard, heroStyle]}>
          <Text style={styles.poseTipIcon}>{FIRST_TIME_POSE_TIPS[poseTipIndex].icon}</Text>
          <Text style={styles.poseTipText}>{FIRST_TIME_POSE_TIPS[poseTipIndex].text}</Text>
        </Animated.View>
      )}

      {/* 功能特性区 */}
      <Animated.View style={[styles.featuresSection, featuresStyle]}>
        <Text style={styles.sectionTitle}>功能介绍</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <TouchableOpacity key={i} style={styles.featureCard} activeOpacity={0.72}
              onPress={() => { if (f.label === '姿势模板') navigation.navigate({ name: 'Camera' as const, params: {} }); else if (f.label === '进步日记') navigation.navigate({ name: 'Diary' as const, params: undefined }) }}>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* 底部导航 */}
      <Animated.View style={[styles.bottomNav, featuresStyle]}>
        <TouchableOpacity style={[styles.bottomNavBtn, styles.bottomNavBtnActive]} onPress={() => navigation.navigate({ name: 'Home' as const, params: undefined })} activeOpacity={0.72}>
          <Text style={styles.bottomNavIcon}>🏠</Text>
          <Text style={[styles.bottomNavText, { color: COLORS.primary, fontWeight: '700' }]}>首页</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate({ name: 'Diary' as const, params: undefined })} activeOpacity={0.72}>
          <Text style={styles.bottomNavIcon}>📊</Text>
          <Text style={[styles.bottomNavText, { color: COLORS.textMuted }]}>进步日记</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })} activeOpacity={0.72}>
          <Text style={styles.bottomNavIcon}>📸</Text>
          <Text style={[styles.bottomNavText, { color: COLORS.textMuted }]}>拍照</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={{ height: 40 }} />

      {/* 引导弹窗 */}
      <Modal visible={showOnboard} transparent animationType="fade">
        <View style={styles.onboardOverlay}>
          <View style={styles.onboardCard}>
            <View style={styles.onboardStepIndicator}>
              {ONBOARD_STEPS.map((_, i) => (
                <View key={i} style={[styles.onboardDot, i === onboardStep && styles.onboardDotActive, i < onboardStep && styles.onboardDotDone]} />
              ))}
            </View>
            <Text style={styles.onboardIcon}>{ONBOARD_STEPS[onboardStep].icon}</Text>
            <Text style={styles.onboardTitle}>{ONBOARD_STEPS[onboardStep].title}</Text>
            <Text style={styles.onboardDesc}>{ONBOARD_STEPS[onboardStep].desc}</Text>
            <View style={styles.onboardBtns}>
              {onboardStep > 0 && <TouchableOpacity style={styles.onboardBackBtn} onPress={() => setOnboardStep(onboardStep - 1)} activeOpacity={0.72}><Text style={styles.onboardBackBtnText}>‹ 上一步</Text></TouchableOpacity>}
              <TouchableOpacity style={[styles.onboardNextBtn, onboardStep === 0 && styles.onboardNextBtnFull]} onPress={nextOnboardStep} activeOpacity={0.72}>
                <Text style={styles.onboardNextBtnText}>{onboardStep < ONBOARD_STEPS.length - 1 ? '下一步 →' : '开始使用 🎉'}</Text>
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

  // Hero
  heroSection: { alignItems: 'center', marginBottom: spacing[6], paddingTop: spacing[3] },
  timeGreeting: { fontSize: typography.fontSize.md, color: COLORS.textMuted, marginBottom: spacing[3], letterSpacing: typography.letterSpacing.wide },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  heroIcon: { fontSize: 56 },
  heroTextBlock: { alignItems: 'flex-start' },
  heroTitle: { fontSize: typography.fontSize['7xl'], fontWeight: typography.fontWeight.bold, color: COLORS.textPrimary, letterSpacing: 0.5, marginBottom: spacing[2] },
  heroSubtitle: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: COLORS.primary },

  // 每日技巧
  // 简洁优雅极致：移除 dailyTipCard 的 overflow:hidden——次要提示卡片无子元素溢出
  dailyTipCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.bgCard, borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[4], ...shadows.sm },
  dailyTipTouchable: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  dailyTipHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dailyTipExpandIcon: { fontSize: 10, color: COLORS.textMuted, opacity: 0.7 },
  dailyTipExpandedContent: { marginTop: 10 },
  dailyTipDivider: { height: 1, backgroundColor: COLORS.divider, marginBottom: 8 },
  dailyTipMoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dailyTipMoreIcon: { fontSize: 20, flexShrink: 0, marginTop: 1 },
  dailyTipMoreText: { flex: 1, fontSize: typography.fontSize.sm, color: COLORS.textSecondary, lineHeight: 20 },
  dailyTipMoreHint: { fontSize: 10, color: COLORS.textMuted, opacity: 0.6, marginTop: 6, textAlign: 'right' },
  poseTipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: borderRadius.xl, paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginBottom: spacing[5], gap: spacing[3], ...shadows.sm },
  dailyTipLeft: { flexShrink: 0 },
  dailyTipIcon: { fontSize: 28 },
  dailyTipContent: { flex: 1 },
  dailyTipLabel: { fontSize: typography.fontSize.xs, color: COLORS.textSecondary, fontWeight: typography.fontWeight.semibold, marginBottom: 2, letterSpacing: 0.5 },
  dailyTipText: { fontSize: typography.fontSize.md, color: COLORS.textSecondary, lineHeight: 22 },
  dailyTipClose: { width: 28, height: 28, borderRadius: borderRadius.full, backgroundColor: COLORS.divider, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dailyTipCloseText: { color: COLORS.textMuted, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold },

  // 统计卡片
  statsCard: { backgroundColor: COLORS.bgCard, borderRadius: borderRadius['2xl'], padding: spacing[5], marginBottom: spacing[6], ...shadows.md },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statItemSkeleton: { alignItems: 'center' },
  skeletonNum: { width: 48, height: 44, borderRadius: 8, backgroundColor: COLORS.divider, marginBottom: 4 },
  statNumber: { fontSize: typography.fontSize['5xl'], fontWeight: typography.fontWeight.bold, lineHeight: 52 },
  statLabel: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: 2, fontWeight: typography.fontWeight.medium },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.divider, marginHorizontal: spacing[2] },
  statsLoadingText: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, marginTop: 4, alignSelf: 'center' },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: COLORS.divider, gap: spacing[3] },
  trendText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, flexShrink: 0 },
  trendBar: { flex: 1, height: 6, borderRadius: borderRadius.sm, overflow: 'hidden' },
  trendBarFill: { height: '100%', borderRadius: borderRadius.sm },
  trendPercent: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, width: 36, textAlign: 'right', flexShrink: 0 },

  // 拍照按钮
  cameraBtnWrapper: { alignItems: 'center', marginBottom: spacing[7] },
  cameraBtn: { position: 'relative', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, overflow: 'visible' },
  cameraBtnNewUser: { backgroundColor: COLORS.primary, paddingVertical: 24, paddingHorizontal: 64 },
  cameraBtnRegular: { backgroundColor: COLORS.primary, paddingVertical: 20, paddingHorizontal: 56 },
  cameraBtnInner: { marginBottom: spacing[2] },
  cameraBtnIcon: { fontSize: 40 },
  cameraBtnTextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cameraBtnText: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, letterSpacing: 0.5 },
  newBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: borderRadius.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  newBadgeText: { color: COLORS.textOnPrimary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold },
  cameraBtnSub: { marginTop: spacing[3] },
  cameraBtnSubText: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, textAlign: 'center' },
  todayCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, borderRadius: borderRadius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], marginTop: spacing[3], gap: spacing[2] },
  todayCountIcon: { fontSize: 16 },
  todayCountText: { fontSize: typography.fontSize.sm, color: COLORS.textMuted },
  todayCountNum: { color: COLORS.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },

  // 姿势提示卡
  poseTipIcon: { fontSize: 22, flexShrink: 0 },
  poseTipText: { flex: 1, fontSize: typography.fontSize.md, color: COLORS.textSecondary, lineHeight: 22 },

  // 功能特性
  featuresSection: { marginBottom: spacing[5] },
  sectionTitle: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: COLORS.textPrimary, marginBottom: spacing[4] },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  featureCard: {
    width: (SCREEN_W - spacing[5] * 2 - spacing[3]) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    // 简洁优雅极致：featureCard 与 dailyTipCard、poseTipCard 同级，降低阴影权重
    ...shadows.sm,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: COLORS.textPrimary, marginBottom: 4 },
  featureDesc: { fontSize: typography.fontSize.sm, color: COLORS.textMuted, lineHeight: 20 },

  // 底部导航
  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: borderRadius['2xl'], padding: 6, gap: 6, ...shadows.sm },
  bottomNavBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: borderRadius.xl, gap: 8 },
  bottomNavBtnActive: { backgroundColor: COLORS.primaryLight },
  bottomNavIcon: { fontSize: 20 },
  bottomNavText: { fontSize: typography.fontSize.md },

  // 引导弹窗
  onboardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  onboardCard: { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', ...shadows.md },
  onboardStepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  onboardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.divider },
  onboardDotActive: { backgroundColor: COLORS.primary, width: 20 },
  onboardDotDone: { backgroundColor: COLORS.warning },
  onboardIcon: { fontSize: 52, marginBottom: 16 },
  onboardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  onboardDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  onboardBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  onboardBackBtn: { flex: 1, paddingVertical: 14, borderRadius: 25, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', backgroundColor: 'transparent' },
  onboardBackBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  onboardNextBtn: { flex: 2, paddingVertical: 14, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: 'center' },
  onboardNextBtnFull: { flex: 1 },
  onboardNextBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textOnPrimary },
})
