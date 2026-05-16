/**
 * HomeScreen - 首页 v2
 * 引导用户进入拍照或查看历史，包含首次使用引导
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDiary } from '../services/analyzer'
import { useTemplates } from '../hooks/useTemplates'

const { width: SCREEN_W } = Dimensions.get('window')

// 每日小技巧（每天轮换一条）
const DAILY_TIPS = [
  { icon: '💡', text: '让男朋友蹲低一点，镜头仰拍更显瘦！' },
  { icon: '🌟', text: '九宫格构图：把人脸放在交叉点上，超有感觉！' },
  { icon: '📸', text: '逆光拍照时，开闪光灯可以补面部光线～' },
  { icon: '🎯', text: '让男友说"1、2、3茄子"，在"3"时抓拍最自然！' },
  { icon: '☀️', text: '下午3-5点的光线最柔和，拍出来皮肤超好～' },
  { icon: '🌈', text: '雨天在窗边拍照，氛围感拉满！' },
  { icon: '✨', text: '情侣照多拍背影，牵手、拥抱对视都很出片！' },
  { icon: '🍽️', text: '餐厅拍照时让男友从侧面打光，避免顶光显脸大～' },
  { icon: '🏖️', text: '海边拍照让男友蹲下，镜头朝上，超级显腿长！' },
  { icon: '🌸', text: '樱花季拍照时带个小道具，气氛立刻不一样～' },
  { icon: '🎨', text: '背景杂乱时开启人像模式，背景自动虚化！' },
  { icon: '🌙', text: '夜景拍摄让男友双手拿稳手机，或者靠在固定物体上～' },
  { icon: '💕', text: '笑容自然最重要，别让男友喊"茄子"喊太多遍，会僵！' },
  { icon: '📐', text: '用好姿势模板，让他跟着剪影站位，简单又有效～' },
  { icon: '☕', text: '咖啡厅选靠窗位置，自然光打在人脸上超好看！' },
]
function getDailyTip() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}
const ONBOARD_KEY = 'onboarded_v2'

// 功能介绍数据
const FEATURES: Array<{ icon: string; title: string; desc: string; color: string }> = [
  {
    icon: '📐',
    title: '构图辅助',
    desc: '九宫格/黄金螺旋/三角构图线实时叠加',
    color: '#FF6B6B',
  },
  {
    icon: '👗',
    title: '姿势模板',
    desc: '半透明剪影引导，让男友知道该怎么站',
    color: '#FFB347',
  },
  {
    icon: '🤳',
    title: '一键修图',
    desc: '智能裁剪到三分点，自动美颜+滤镜',
    color: '#4ECDC4',
  },
  {
    icon: '📈',
    title: '进步日记',
    desc: '记录每次评分和进步曲线，越拍越好',
    color: '#9B8FE8',
  },
]

const ONBOARD_STEPS = [
  {
    icon: '📸',
    title: '拍出更好的照片',
    desc: '男友相机帮你教男朋友拍出更好看的照片！上传他拍的照片，我给你分析和建议～',
  },
  {
    icon: '👗',
    title: '姿势模板引导',
    desc: '选择喜欢的姿势模板，它会显示半透明剪影，让男朋友知道该怎么站位～',
  },
  {
    icon: '🤳',
    title: '实时评分反馈',
    desc: '拍照后自动分析构图、曝光、稳定性，给出俏皮点评和具体改进建议！',
  },
  {
    icon: '💕',
    title: '一起变好吧！',
    desc: '记录每一次进步，看着分数一点点提高，男朋友摄影技术越来越好～',
  },
]

export default function HomeScreen({ navigation }: any) {
  const [diaryCount, setDiaryCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)
  const { templates, loading: templatesLoading, error: templatesError, refresh } = useTemplates()

  // 动画
  const titleY = useSharedValue(30)
  const titleOpacity = useSharedValue(0)
  const cameraScale = useSharedValue(0.8)
  const statsOpacity = useSharedValue(0)
  const featuresY = useSharedValue(20)

  useEffect(() => {
    loadStats()
    checkOnboard()

    // 标题入场动画
    titleY.value = withSpring(0, { damping: 16 })
    titleOpacity.value = withTiming(1, { duration: 500 })

    // 相机按钮脉冲
    cameraScale.value = withDelay(600, withSpring(1, { damping: 10 }))

    // 统计数据入场
    statsOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))

    // 功能特性列表
    featuresY.value = withDelay(700, withSpring(0, { damping: 14 }))
  }, [])

  async function loadStats() {
    try {
      const diary = await getDiary()
      setDiaryCount(diary.length)
      if (diary.length > 0) {
        const avg = Math.round(diary.reduce((s, r) => s + r.score, 0) / diary.length)
        setAvgScore(avg)
      }
    } catch (e) {
      console.warn('[HomeScreen] 加载日记失败:', e)
    }
  }

  async function checkOnboard() {
    try {
      const done = await AsyncStorage.getItem(ONBOARD_KEY)
      if (!done) {
        setShowOnboard(true)
      }
    } catch (e) {
      setShowOnboard(true)
    }
  }

  async function finishOnboard() {
    try {
      await AsyncStorage.setItem(ONBOARD_KEY, 'true')
    } catch {}
    setShowOnboard(false)
  }

  function nextOnboardStep() {
    if (onboardStep < ONBOARD_STEPS.length - 1) {
      setOnboardStep(onboardStep + 1)
    } else {
      finishOnboard()
    }
  }

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOpacity.value,
  }))

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cameraScale.value }],
  }))

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }))

  const featuresStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: featuresY.value }],
    opacity: statsOpacity.value,
  }))

  // 拍照按钮呼吸动画（未使用过的新用户）
  const [isNewUser, setIsNewUser] = useState(false)
  const pulseAnim = useSharedValue(1)

  useEffect(() => {
    if (diaryCount === 0) {
      setIsNewUser(true)
      // 呼吸动画
      const interval = setInterval(() => {
        pulseAnim.value = withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        )
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [diaryCount])

  const cameraBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cameraScale.value * pulseAnim.value }],
  }))

  const totalTemplates = templates.length

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 顶部品牌区 */}
      <Animated.View style={[styles.heroSection, titleStyle]}>
        <Text style={styles.heroIcon}>📸</Text>
        <Text style={styles.heroTitle}>男友相机</Text>
        <Text style={styles.heroSubtitle}>让男朋友越拍越好 ❤️</Text>
      </Animated.View>

      {/* 每日小技巧 */}
      {(() => {
        const tip = getDailyTip()
        return (
          <View style={styles.dailyTip}>
            <Text style={styles.dailyTipIcon}>{tip.icon}</Text>
            <Text style={styles.dailyTipText}>{tip.text}</Text>
          </View>
        )
      })()}

      {/* 统计数据条 */}
      {diaryCount > 0 && (
        <Animated.View style={[styles.statsBar, statsStyle]}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{diaryCount}</Text>
            <Text style={styles.statLabel}>已拍摄</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: avgScore >= 80 ? '#4CAF50' : avgScore >= 60 ? '#FFB347' : '#FF6B6B' }]}>
              {avgScore}
            </Text>
            <Text style={styles.statLabel}>平均分</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalTemplates}</Text>
            <Text style={styles.statLabel}>姿势模板</Text>
          </View>
        </Animated.View>
      )}

      {/* 拍照主按钮 */}
      <Animated.View style={[styles.cameraBtnWrapper, cameraBtnStyle]}>
        {isNewUser && <View style={styles.newBadge}><Text style={styles.newBadgeText}>新</Text></View>}
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.85}
        >
          <View style={styles.cameraBtnInner}>
            <Text style={styles.cameraBtnIcon}>📷</Text>
          </View>
          <Text style={styles.cameraBtnText}>开始拍照</Text>
        </TouchableOpacity>

        <View style={styles.cameraBtnSub}>
          {templatesLoading ? (
            <Text style={styles.cameraBtnSubText}>⏳ 正在加载姿势模板...</Text>
          ) : templatesError ? (
            <TouchableOpacity onPress={refresh}>
              <Text style={[styles.cameraBtnSubText, { color: '#FF6B6B' }]}>⚠️ 加载失败，点击重试</Text>
            </TouchableOpacity>
          ) : totalTemplates > 0 ? (
            <Text style={styles.cameraBtnSubText}>已有 {totalTemplates} 个姿势模板可用</Text>
          ) : (
            <Text style={styles.cameraBtnSubText}>姿势模板加载中...</Text>
          )}
        </View>
      </Animated.View>

      {/* 功能特性 */}
      <Animated.View style={[styles.featuresSection, featuresStyle]}>
        <Text style={styles.sectionTitle}>✨ 功能介绍</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureCard, { borderLeftColor: f.color }]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* 底部导航 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate('Diary')}>
          <Text style={styles.bottomNavIcon}>📊</Text>
          <Text style={styles.bottomNavText}>进步日记</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavBtn} onPress={() => navigation.navigate('Camera')}>
          <Text style={styles.bottomNavIcon}>📸</Text>
          <Text style={styles.bottomNavText}>拍照</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* 首次使用引导弹窗 */}
      <Modal visible={showOnboard} transparent animationType="fade">
        <View style={styles.onboardOverlay}>
          <View style={styles.onboardCard}>
            <View style={styles.onboardStepIndicator}>
              {ONBOARD_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.onboardDot,
                    i === onboardStep && styles.onboardDotActive,
                    i < onboardStep && styles.onboardDotDone,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.onboardIcon}>{ONBOARD_STEPS[onboardStep].icon}</Text>
            <Text style={styles.onboardTitle}>{ONBOARD_STEPS[onboardStep].title}</Text>
            <Text style={styles.onboardDesc}>{ONBOARD_STEPS[onboardStep].desc}</Text>

            <View style={styles.onboardBtns}>
              {onboardStep > 0 && (
                <TouchableOpacity
                  style={styles.onboardBackBtn}
                  onPress={() => setOnboardStep(onboardStep - 1)}
                >
                  <Text style={styles.onboardBackBtnText}>上一步</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.onboardNextBtn, onboardStep === 0 && styles.onboardNextBtnFull]}
                onPress={nextOnboardStep}
              >
                <Text style={styles.onboardNextBtnText}>
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
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  dailyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    marginHorizontal: 20,
    gap: 10,
  },
  dailyTipIcon: {
    fontSize: 20,
  },
  dailyTipText: {
    flex: 1,
    fontSize: 14,
    color: '#8B6914',
    lineHeight: 20,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  cameraBtnWrapper: {
    alignItems: 'center',
    marginBottom: 28,
  },
  cameraBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 32,
    paddingVertical: 20,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  cameraBtnInner: {
    marginBottom: 6,
  },
  cameraBtnIcon: {
    fontSize: 36,
  },
  cameraBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraBtnSub: {
    marginTop: 10,
  },
  cameraBtnSubText: {
    fontSize: 13,
    color: '#999',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  bottomNavIcon: {
    fontSize: 18,
  },
  bottomNavText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  // Onboarding
  onboardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  onboardCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  onboardStepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  onboardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  onboardDotActive: {
    backgroundColor: '#FF6B6B',
    width: 20,
  },
  onboardDotDone: {
    backgroundColor: '#FFB347',
  },
  onboardIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  onboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  onboardDesc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  onboardBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  onboardBackBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  onboardBackBtnText: {
    fontSize: 15,
    color: '#999',
  },
  onboardNextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  onboardNextBtnFull: {
    flex: 1,
  },
  onboardNextBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
})
