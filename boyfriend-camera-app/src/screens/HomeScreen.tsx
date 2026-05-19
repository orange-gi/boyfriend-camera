/**
 * HomeScreen - 首页 v3
 * 改进：每日提示关闭按钮（AsyncStorage）、双重呼吸动画、数字递增动画
 */
import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDiary } from '../services/analyzer'
import { useTemplates } from '../hooks/useTemplates'
import { COLORS, scoreColor } from '../theme/colors'
import { logger } from '../utils/logger'

const { width: SCREEN_W } = Dimensions.get('window')

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了还在拍照呀～'
  if (hour < 9) return '早上好！今天也要美美的～'
  if (hour < 12) return '上午好！光线正好～'
  if (hour < 14) return '中午好！吃饱了来拍一张～'
  if (hour < 17) return '下午好！阳光正好～'
  if (hour < 19) return '傍晚好！夕阳超美的～'
  if (hour < 22) return '晚上好！夜景模式开启～'
  return '夜深了还不睡？拍张照再睡～'
}

const ONBOARD_STEPS = [
  { icon: '📸', title: '让男友拍出好照片', desc: '上传他拍的照片，我来帮你分析哪里拍得好、哪里可以改进，让男友越拍越好看💖' },
  { icon: '👗', title: '姿势模板超好用', desc: '选择一个喜欢的姿势，屏幕上会出现半透明剪影——让男朋友直接照着站，简单又有效！' },
  { icon: '📈', title: '实时评分&俏皮点评', desc: '拍完自动分析构图、光线、稳定性，给出俏皮又有用的改进建议，还能记录进步日记📒' },
  { icon: '🤳', title: '一起变好吧！', desc: '每次拍照都是进步机会，看着分数一点点涨，男友从青铜变王者不是梦！快去拍一张吧～' },
]

// 首次使用拍照姿势引导提示
const FIRST_TIME_POSE_TIPS = [
  { icon: '👀', text: '先让他拍一张试试，不管好不好看都是进步的起点！' },
  { icon: '🧍‍♀️', text: '教他站到你的对面，保持一臂左右的距离～' },
  { icon: '📐', text: '提醒他打开九宫格辅助线，构图会好很多！' },
  { icon: '✨', text: '第一次可以选一个简单的姿势模板，照着剪影站就行～' },
  { icon: '💪', text: '夸一夸他的第一张！鼓励比批评更有用哦～' },
]

const DAILY_TIPS = [
  { icon: '💡', text: '让男朋友蹲低一点，镜头仰拍更显瘦！这招绝了！' },
  { icon: '🌟', text: '九宫格构图：把人脸放在交叉点上，超有感觉！' },
  { icon: '📸', text: '逆光拍照时，开闪光灯可以补面部光线～脸不会黑黑的啦！' },
  { icon: '🎯', text: '让男友说"1、2、3茄子"，在"3"时抓拍表情最自然！' },
  { icon: '☀️', text: '下午3-5点的光线最柔和，拍出来皮肤像开了滤镜～' },
  { icon: '🌈', text: '雨天在窗边拍照，氛围感拉满！超有电影感！' },
  { icon: '✨', text: '情侣照多拍背影！牵手、拥抱、对视，每一张都超甜～' },
  { icon: '🍽️', text: '餐厅拍照选靠窗位置！自然光打在脸上超好看～' },
  { icon: '🏖️', text: '海边拍照让男友蹲下，镜头朝上，超级显腿长！' },
  { icon: '🌸', text: '樱花季拍照带个小道具！气球、书本、咖啡杯都可以～' },
  { icon: '🎨', text: '背景杂乱时开启人像模式，背景自动虚化，主体超突出！' },
  { icon: '🌙', text: '夜景拍摄让男友双手拿稳手机，或者靠在固定物体上～' },
  { icon: '💕', text: '笑容自然最重要！别让男友喊"茄子"太多遍，会僵住哈哈哈' },
  { icon: '📐', text: '用好姿势模板！让他跟着剪影站位，简单有效不费脑子～' },
  { icon: '☕', text: '咖啡厅选靠窗位置！自然光打在人脸上超柔和～' },
  { icon: '🦵', text: '坐姿拍照时让男友稍微高一点拍，俯拍显脸小！' },
  { icon: '🎬', text: '假装在看远处的风景被抓拍，比直接看镜头自然一百倍！' },
  { icon: '💨', text: '让头发自然垂落或者轻轻甩起来，发丝在阳光下发光绝了！' },
  { icon: '🌤️', text: '阴天的云就是天然柔光箱！光线均匀柔和，拍人像超棒～' },
  { icon: '🍃', text: '找树叶/花丛做前景，虚化后超有氛围感！' },
  { icon: '🪞', text: '对着镜子自拍时，手机稍微侧一点拍，避免镜面反光～' },
  { icon: '🏠', text: '家里拍照找窗边或白墙做背景，简单干净又好看！' },
  { icon: '👠', text: '站着拍照时一只脚微微往前伸，腿看起来更长！' },
  { icon: '🌂', text: '阳光下拍照用手在额头前挡一下光，眼神更清晰～' },
  { icon: '🎧', text: '让男友从下往上拍，45度俯角是显瘦黄金角度！' },
  { icon: '📱', text: '夜晚在路灯下拍照，光线暖暖的超有感觉～' },
  { icon: '🍂', text: '秋天落叶地上随便一站都好看！金黄色的背景绝了～' },
  { icon: '🧣', text: '冬天围巾是天然反光板！把脸衬得红润通透～' },
  { icon: '🌆', text: '城市街拍找个干净的墙或涂鸦墙当背景，超有范儿！' },
  { icon: '🛋️', text: '沙发/床上拍照时多扔几个抱枕在周围，温馨感拉满！' },
]

function getDailyTip() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

const ONBOARD_KEY = 'onboarded_v3'
const TIP_DISMISS_KEY = 'tip_dismissed_today'

const FEATURES: Array<{ icon: string; title: string; desc: string; color: string }> = [
  { icon: '📐', title: '构图辅助', desc: '九宫格/黄金螺旋/三角构图线实时叠加', color: COLORS.primary },
  { icon: '👗', title: '姿势模板', desc: '半透明剪影引导，让男友知道该怎么站', color: COLORS.warning },
  { icon: '🤳', title: '一键修图', desc: '智能裁剪到三分点，自动美颜+滤镜', color: '#4ECDC4' },
  { icon: '📈', title: '进步日记', desc: '记录每次评分和进步曲线，越拍越好', color: '#9B8FE8' },
]

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>()
  const [diaryCount, setDiaryCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [displayDiaryCount, setDisplayDiaryCount] = useState(0)
  const [displayAvgScore, setDisplayAvgScore] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [poseTipIndex, setPoseTipIndex] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const { templates, loading: templatesLoading, error: templatesError, refresh } = useTemplates()

  // 动画 shared values
  const titleY = useSharedValue(30)
  const titleOpacity = useSharedValue(0)
  const cameraScale = useSharedValue(0.8)
  const statsOpacity = useSharedValue(0)
  const featuresY = useSharedValue(20)

  // 呼吸光晕动画
  const glowScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0)

  // 数字递增动画 shared values
  const countAnim = useSharedValue(0)
  const scoreAnim = useSharedValue(0)

  useEffect(() => {
    loadStats()
    checkOnboard()
    checkTipDismissed()

    // 入场动画
    titleY.value = withSpring(0, { damping: 16 })
    titleOpacity.value = withTiming(1, { duration: 500 })
    cameraScale.value = withDelay(600, withSpring(1, { damping: 10 }))
    statsOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))
    featuresY.value = withDelay(700, withSpring(0, { damping: 14 }))

    // 呼吸光晕动画（持续）
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    )
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    )
  }, [])

  // 数字递增动画
  useEffect(() => {
    if (diaryCount > 0 || avgScore > 0) {
      countAnim.value = withTiming(diaryCount, { duration: 1000, easing: Easing.out(Easing.ease) })
      scoreAnim.value = withTiming(avgScore, { duration: 1000, easing: Easing.out(Easing.ease) })

      // 用 interval 模拟数字滚动
      const startTime = Date.now()
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / 1000, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3) // easeOut
        setDisplayDiaryCount(Math.round(diaryCount * easeProgress))
        setDisplayAvgScore(Math.round(avgScore * easeProgress))
        if (progress >= 1) clearInterval(interval)
      }, 16)
      return () => clearInterval(interval)
    }
  }, [diaryCount, avgScore])

  const isNewUser = diaryCount === 0

  // 首次用户：轮换拍照姿势小贴士
  useEffect(() => {
    if (!isNewUser) return
    const interval = setInterval(() => {
      setPoseTipIndex(i => (i + 1) % FIRST_TIME_POSE_TIPS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isNewUser])

  async function loadStats() {
    setStatsLoading(true)
    try {
      const diary = await getDiary()
      setDiaryCount(diary.length)
      // 计算今日拍摄数
      const today = new Date().toDateString()
      const todayCnt = diary.filter(r => new Date(r.date).toDateString() === today).length
      setTodayCount(todayCnt)
      if (diary.length > 0) {
        const avg = Math.round(diary.reduce((s, r) => s + r.score, 0) / diary.length)
        setAvgScore(avg)
        setDisplayDiaryCount(diary.length)
        setDisplayAvgScore(avg)
      }
    } catch (e: unknown) {
      logger.warn('HomeScreen', '加载日记失败', e)
    } finally {
      setStatsLoading(false)
    }
  }

  async function checkOnboard() {
    try {
      const done = await AsyncStorage.getItem(ONBOARD_KEY)
      if (!done) setShowOnboard(true)
    } catch { setShowOnboard(true) /* ignore */ }
  }

  async function checkTipDismissed() {
    try {
      const dismissed = await AsyncStorage.getItem(TIP_DISMISS_KEY)
      const today = new Date().toDateString()
      if (dismissed === today) setTipDismissed(true)
    } catch (_e) { /* ignore */ }
  }

  async function dismissTip() {
    const today = new Date().toDateString()
    await AsyncStorage.setItem(TIP_DISMISS_KEY, today)
    setTipDismissed(true)
  }

  async function finishOnboard() {
    try { await AsyncStorage.setItem(ONBOARD_KEY, 'true') } catch (_e) { /* ignore */ }
    setShowOnboard(false)
  }

  function nextOnboardStep() {
    if (onboardStep < ONBOARD_STEPS.length - 1) {
      setOnboardStep(onboardStep + 1)
    } else {
      finishOnboard()
    }
  }

  // 动画样式
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: titleY.value }], opacity: titleOpacity.value }))
  const cameraStyle = useAnimatedStyle(() => ({ transform: [{ scale: cameraScale.value }] }))
  const statsStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value }))
  const featuresStyle = useAnimatedStyle(() => ({ transform: [{ translateY: featuresY.value }], opacity: statsOpacity.value }))
  const tipStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }))

  const totalTemplates = templates.length

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 顶部品牌区 */}
      <Animated.View style={[styles.heroSection, titleStyle]}>
        <Text style={[styles.timeGreeting, { color: COLORS.textMuted }]}>{getTimeGreeting()}</Text>
        <Text style={styles.heroIcon}>📸</Text>
        <Text style={[styles.heroTitle, { color: COLORS.textPrimary }]}>男友相机</Text>
        <Text style={[styles.heroSubtitle, { color: COLORS.primary }]}>{'让男朋友越拍越好 ❤️'}</Text>
      </Animated.View>

      {/* 每日小技巧 - 带关闭按钮 */}
      {!tipDismissed && (() => {
        const tip = getDailyTip()
        return (
          <Animated.View style={[styles.dailyTip, tipStyle]}>
            <View style={styles.dailyTipContent}>
              <Text style={styles.dailyTipIcon}>{tip.icon}</Text>
              <Text style={styles.dailyTipText}>{tip.text}</Text>
            </View>
            <TouchableOpacity style={styles.dailyTipClose} onPress={dismissTip} activeOpacity={0.72}>
              <Text style={styles.dailyTipCloseText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )
      })()}

      {/* 统计数据条 */}
      {statsLoading ? (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={styles.statNumberSkeleton} />
            <View style={styles.statLabelSkeleton} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statNumberSkeleton} />
            <View style={styles.statLabelSkeleton} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statNumberSkeleton} />
            <View style={styles.statLabelSkeleton} />
          </View>
        </View>
      ) : (diaryCount > 0 ? (
        <Animated.View style={[styles.statsBar, statsStyle]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.textPrimary }]}>{displayDiaryCount}</Text>
            <Text style={styles.statLabel}>已拍摄</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: scoreColor(displayAvgScore) }]}>{displayAvgScore}</Text>
            <Text style={styles.statLabel}>平均分</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.textPrimary }]}>{totalTemplates}</Text>
            <Text style={styles.statLabel}>姿势模板</Text>
          </View>
        </Animated.View>
      ) : null)}

      {/* 拍照主按钮 */}
      <Animated.View style={[styles.cameraBtnWrapper, cameraStyle]}>
        {isNewUser && (
          <View style={[styles.newBadge, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.newBadgeText}>新</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.cameraBtn, isNewUser && styles.cameraBtnNewUser]}
          onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
          activeOpacity={0.72}
        >
          {/* 双重呼吸光晕 */}
          {isNewUser && (
            <Animated.View
              style={[
                styles.cameraGlowRing,
                {
                  transform: [{ scale: glowScale }],
                  opacity: glowOpacity,
                },
              ]}
            />
          )}
          <View style={styles.cameraBtnInner}>
            <Text style={styles.cameraBtnIcon}>📷</Text>
          </View>
          <Text style={[styles.cameraBtnText, { color: COLORS.textOnPrimary }]}>开始拍照</Text>
        </TouchableOpacity>

        <View style={styles.cameraBtnSub}>
          {templatesLoading ? (
            <Text style={styles.cameraBtnSubText}>⏳ 正在加载姿势模板...</Text>
          ) : templatesError ? (
            <TouchableOpacity onPress={refresh} activeOpacity={0.72}>
              <Text style={[styles.cameraBtnSubText, { color: COLORS.primary }]}>⚠️ 加载失败，点击重试</Text>
            </TouchableOpacity>
          ) : totalTemplates > 0 ? (
            <Text style={styles.cameraBtnSubText}>已有 {totalTemplates} 个姿势模板可用</Text>
          ) : (
            <Text style={styles.cameraBtnSubText}>姿势模板加载中...</Text>
          )}
        </View>

        {/* 今日已拍动态提示 */}
        {todayCount > 0 && (
          <View style={styles.todayCountBadge}>
            <Text style={styles.todayCountIcon}>📸</Text>
            <Text style={styles.todayCountText}>今日已拍 <Text style={styles.todayCountNum}>{todayCount}</Text> 张</Text>
          </View>
        )}
        {todayCount === 0 && diaryCount > 0 && (
          <View style={styles.todayCountBadge}>
            <Text style={styles.todayCountIcon}>🌟</Text>
            <Text style={styles.todayCountText}>今天还没拍！去拍一张吧～</Text>
          </View>
        )}
      </Animated.View>

      {/* 首次用户拍照姿势引导提示 */}
      {isNewUser && (
        <Animated.View style={styles.poseTipCard}>
          <Text style={styles.poseTipIcon}>{FIRST_TIME_POSE_TIPS[poseTipIndex].icon}</Text>
          <Text style={styles.poseTipText}>{FIRST_TIME_POSE_TIPS[poseTipIndex].text}</Text>
        </Animated.View>
      )}

      {/* 功能特性 */}
      <Animated.View style={[styles.featuresSection, featuresStyle]}>
        <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>✨ 功能介绍</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.featureCard, { borderLeftColor: f.color }]}
              activeOpacity={0.72}
              onPress={() => {
                if (f.title === '姿势模板') navigation.navigate({ name: 'Camera' as const, params: {} })
                if (f.title === '进步日记') navigation.navigate({ name: 'Diary' as const, params: undefined })
              }}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: f.color + '18' }]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: COLORS.textPrimary }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: COLORS.textMuted }]}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* 底部导航 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.bottomNavBtn, styles.bottomNavBtnActive]} onPress={() => navigation.navigate({ name: 'Diary' as const, params: undefined })} activeOpacity={0.72}>
          <Text style={styles.bottomNavIcon}>📊</Text>
          <Text style={[styles.bottomNavText, { color: COLORS.primary, fontWeight: '700' }]}>进步日记</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomNavBtn, styles.bottomNavBtnActive]} onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })} activeOpacity={0.72}>
          <Text style={styles.bottomNavIcon}>📸</Text>
          <Text style={[styles.bottomNavText, { color: COLORS.primary, fontWeight: '700' }]}>拍照</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* 首次引导弹窗 */}
      <Modal visible={showOnboard} transparent animationType="fade">
        <View style={styles.onboardOverlay}>
          <View style={styles.onboardCard}>
            <View style={styles.onboardStepIndicator}>
              {ONBOARD_STEPS.map((_, i) => (
                <View key={i} style={[styles.onboardDot, i === onboardStep && styles.onboardDotActive, i < onboardStep && styles.onboardDotDone]} />
              ))}
            </View>
            <Text style={styles.onboardIcon}>{ONBOARD_STEPS[onboardStep].icon}</Text>
            <Text style={[styles.onboardTitle, { color: COLORS.textPrimary }]}>{ONBOARD_STEPS[onboardStep].title}</Text>
            <Text style={[styles.onboardDesc, { color: COLORS.textSecondary }]}>{ONBOARD_STEPS[onboardStep].desc}</Text>
            <View style={styles.onboardBtns}>
              {onboardStep > 0 && (
                <TouchableOpacity style={styles.onboardBackBtn} onPress={() => setOnboardStep(onboardStep - 1)} activeOpacity={0.72}>
                  <Text style={[styles.onboardBackBtnText, { color: COLORS.primary }]}>‹ 上一步</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.onboardNextBtn, onboardStep === 0 && styles.onboardNextBtnFull]} onPress={nextOnboardStep} activeOpacity={0.72}>
                <Text style={[styles.onboardNextBtnText, { color: COLORS.textOnPrimary }]}>
                  {onboardStep < ONBOARD_STEPS.length - 1 ? '下一步 →' : '开始使用 🎉'}
                </Text>
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
  content: { paddingTop: 60, paddingHorizontal: 20 },
  heroSection: { alignItems: 'center', marginBottom: 28, paddingTop: 20 },
  timeGreeting: { fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  heroIcon: { fontSize: 64, marginBottom: 12 },
  heroTitle: { fontSize: 36, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  heroSubtitle: { fontSize: 17, fontWeight: '600', backgroundColor: COLORS.primaryLight, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
  dailyTip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', borderRadius: 14, paddingLeft: 16, paddingRight: 8, paddingVertical: 10, marginBottom: 16, gap: 8, shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  dailyTipContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailyTipIcon: { fontSize: 20, flexShrink: 0 },
  dailyTipText: { flex: 1, fontSize: 14, color: '#8B6914', lineHeight: 20 },
  dailyTipClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139,105,20,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dailyTipCloseText: { color: '#8B6914', fontSize: 12, fontWeight: 'bold' },
  statsBar: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: 'bold' },
  statNumberSkeleton: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#e8e8e8', marginBottom: 4 },
  statLabelSkeleton: { width: 36, height: 12, borderRadius: 6, backgroundColor: '#eeeeee' },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.divider },
  cameraBtnWrapper: { alignItems: 'center', marginBottom: 28 },
  cameraBtn: { backgroundColor: COLORS.primary, borderRadius: 36, paddingVertical: 22, paddingHorizontal: 56, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6, overflow: 'visible', position: 'relative' },
  cameraBtnNewUser: { paddingVertical: 24, paddingHorizontal: 60 },
  cameraGlowRing: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 46, borderWidth: 2, borderColor: 'rgba(255,107,107,0.35)', backgroundColor: 'rgba(255,107,107,0.08)' },
  cameraBtnInner: { marginBottom: 6 },
  cameraBtnIcon: { fontSize: 42 },
  cameraBtnText: { fontSize: 18, fontWeight: 'bold' },
  cameraBtnSub: { marginTop: 10 },
  cameraBtnSubText: { fontSize: 13, color: COLORS.textMuted },
  newBadge: { position: 'absolute', top: -4, right: -4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, zIndex: 10 },
  newBadgeText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: 'bold' },
  poseTipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F5', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, gap: 10, borderWidth: 1, borderColor: '#FFD6E0' },
  poseTipIcon: { fontSize: 22, flexShrink: 0 },
  poseTipText: { flex: 1, fontSize: 14, color: '#C0607A', lineHeight: 20 },
  featuresSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  featuresGrid: { gap: 12 },
  featureCard: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, alignItems: 'flex-start', borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  featureIcon: { fontSize: 28, marginRight: 14, marginTop: 2 },
  featureIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 0 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  featureDesc: { fontSize: 14, lineHeight: 20 },
  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 6, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  bottomNavBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, gap: 8 },
  bottomNavBtnActive: { backgroundColor: COLORS.primaryLight },
  bottomNavIcon: { fontSize: 20 },
  bottomNavText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  onboardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  onboardCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 340, alignItems: 'center' },
  onboardStepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  onboardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.divider },
  onboardDotActive: { backgroundColor: COLORS.primary, width: 20 },
  onboardDotDone: { backgroundColor: COLORS.warning },
  onboardIcon: { fontSize: 52, marginBottom: 16 },
  onboardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  onboardDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  onboardBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  onboardBackBtn: { flex: 1, paddingVertical: 14, borderRadius: 25, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', backgroundColor: 'transparent' },
  onboardBackBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  onboardNextBtn: { flex: 2, paddingVertical: 14, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: 'center' },
  onboardNextBtnFull: { flex: 1 },
  onboardNextBtnText: { fontSize: 15, fontWeight: 'bold' },
  todayCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  todayCountIcon: { fontSize: 16 },
  todayCountText: { fontSize: 13, color: COLORS.textMuted },
  todayCountNum: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
})
