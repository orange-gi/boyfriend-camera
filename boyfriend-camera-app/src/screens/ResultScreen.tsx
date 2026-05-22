/** ResultScreen - 拍照结果页 */
import React, { useEffect, useState, useRef, useMemo, memo } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated'
import ViewShot, { ViewShotRef } from 'react-native-view-shot'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import type { RootStackParamList } from '../../App'
import ComparisonCard from '../components/result/ComparisonCard'
import ScoreBoard from '../components/result/ScoreBoard'
import type { ScoreResult } from '../components/result/ScoreBoard'
import { processPhoto, saveToAlbum } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary, getDiary, getPeakScore, updatePeakScore, type AnalysisResult } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { COLORS, colors } from '../theme'
import voiceCoach from '../components/camera/VoiceCoach'
import { logger } from '../utils/logger'

const SCREEN_W = Dimensions.get('window').width

type CoreFilter = 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'cinematic'

export default function ResultScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Result'>>()
  const { photoPath, templateCategory } = route.params || {}

  const [processedPath, setProcessedPath] = useState<string>('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [praiseList, setPraiseList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(true)
const [selectedFilter, setSelectedFilter] = useState<CoreFilter>(
  (() => {
    const catFilterMap: Record<string, CoreFilter> = {
      '餐厅美食': 'food',
      '户外风景': 'warm',
      '城市街拍': 'cinematic',
      '室内场景': 'warm',
      '室内人像': 'portrait',
      '特殊风格': 'vivid',
      '情侣合照': 'portrait',
      '室内日常': 'soft',
      '自拍技巧': 'soft',
      '构图技巧': 'cinematic',
      '人文风景': 'vivid',
      '夜景': 'cinematic',
      '节日限定': 'vivid',
      '运动健身': 'vivid',
    }
    return (templateCategory ? (catFilterMap[templateCategory] ?? 'warm') : 'warm') as CoreFilter
  })()
)

const FILTER_OPTIONS: Array<{ key: CoreFilter; label: string; color: string }> = [
  { key: 'warm', label: '暖黄', color: colors.filterWarm },
  { key: 'cool', label: '冷调', color: colors.filterCool },
  { key: 'vivid', label: '生动', color: colors.filterVivid },
  { key: 'soft', label: '柔和', color: colors.filterSoft },
  { key: 'bw', label: '黑白', color: colors.filterBw },
  { key: 'portrait', label: '人像', color: colors.filterPortrait },
  { key: 'food', label: '美食', color: colors.filterFood },
  { key: 'cinematic', label: '电影', color: colors.filterCinematic },
]
  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scoreAnimationDone, setScoreAnimationDone] = useState(false)
  // 滤镜滑动引导 TTS（分数动画完成后播报）
  useEffect(() => {
    if (!scoreAnimationDone) return
    const tid = setTimeout(() => {
      try {
        if (scoreResult) {
          voiceCoach.speakScoreReveal(scoreResult.totalScore)
          // 满分时追加满分专属庆祝 TTS（接在分数播报之后）
          if (scoreResult.totalScore === 100) {
            setTimeout(() => { try { voiceCoach.speakPerfectScore(100) } catch {} }, 2500)
          }
        }
      } catch {}
      setTimeout(() => { try { voiceCoach.speakFilterSwipeHint() } catch {} }, 1500)
    }, 500)
    return () => clearTimeout(tid)
  }, [scoreAnimationDone, scoreResult])
  const [newRecordBanner, setNewRecordBanner] = useState(false)
  const [processStep, setProcessStep] = useState(1) // 1-4 动画步骤

  // 处理步骤对应的文案
  const processStepText = useMemo(() => {
    switch (processStep) {
      case 1: return '正在分析构图...'
      case 2: return '正在检测光线...'
      case 3: return '正在生成评分...'
      case 4: return '完成！正在加载结果...'
      default: return '正在分析中...'
    }
  }, [processStep])

  const viewShotRef = useRef<ViewShotRef | null>(null)
  const { faces } = useFaceDetection()
  const mountedRef = useRef(true)
  const screenshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 打字机效果
  const [typedPraise, setTypedPraise] = useState('')
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scoreReveal = useSharedValue(0)
  const cardSlide = useSharedValue(50)

  // 初始化 VoiceCoach（TTS 引擎）
  useEffect(() => {
    voiceCoach.initialize().catch(() => { /* ignore init errors */ })
    return () => {
      voiceCoach.reset()
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!photoPath) {
      setError('没有找到图片，请重新拍照')
      setProcessing(false)
      return
    }
    runAnalysis()
    return () => {
      mountedRef.current = false
      if (screenshotTimerRef.current) clearTimeout(screenshotTimerRef.current)
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current)
    }
  }, [photoPath])

  // 处理步骤动画（每 600ms 切换一步）
  useEffect(() => {
    if (!processing) {
      // 处理完成时，确保显示第 4 步（完成）
      setProcessStep(4)
      return
    }
    setProcessStep(1)
    const t2 = setTimeout(() => { if (mountedRef.current) setProcessStep(2) }, 600)
    const t3 = setTimeout(() => { if (mountedRef.current) setProcessStep(3) }, 1200)
    const t4 = setTimeout(() => { if (mountedRef.current) setProcessStep(4) }, 1600)
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [processing])

  function typeText(text: string) {
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current)
    setTypedPraise('')
    let i = 0
    function typeNext() {
      if (i > text.length || !mountedRef.current) return
      setTypedPraise(text.slice(0, i))
      i++
      typeTimerRef.current = setTimeout(typeNext, 40)
    }
    typeNext()
  }


  async function runAnalysis() {
    if (!mountedRef.current) return
    setProcessing(true)
    setError(null)
    scoreReveal.value = 0
    cardSlide.value = 50

    try {
      const processed = await processPhoto(photoPath, {
        cropRatio: 3 / 4,
        filterName: selectedFilter,
        autoRetouch: true,
        faceCenter: faces[0] ? { x: faces[0].x, y: faces[0].y } : undefined,
      })
      if (!mountedRef.current) return
      setProcessedPath(processed)
    } catch (e: unknown) {
      if (!mountedRef.current) return
      if (__DEV__) logger.debug('ResultScreen', 'processPhoto failed:', e)
      const errMsg = e instanceof Error ? e.message : typeof e === 'string' ? e : String(e ?? '')
      if (errMsg.includes('INVALID_IMAGE_PATH') || errMsg.includes('IMAGE_NOT_FOUND')) {
        setError('图片读取失败，请重新拍照')
      } else if (errMsg.includes('CACHE_DIR') || errMsg.includes('space') || errMsg.includes('quota')) {
        setError('存储空间不足，请清理手机空间后重试')
      } else {
        setError('图片处理出了点小问题，请重新拍照试试')
      }
      setProcessing(false)
      return
    }
    try {
      const faceData = faces[0] || { x: 0.5, y: 0.35, area: 0.1 }
      const diary = await getDiary()
      const lastRecord = diary[diary.length - 1]
      const recentSlice = diary.slice(-5)
      const recentAvg = recentSlice.length > 0
        ? recentSlice.reduce((s, v) => s + v.score, 0) / recentSlice.length
        : undefined

      let streakCount = 0
      for (let i = diary.length - 1; i >= 0; i--) {
        if (diary[i].score >= 80) streakCount++
        else break
      }

      // 模拟分析参数（真实场景由 MLKit 人脸检测 + 亮度分析提供）
      // 使用 Date.now() 变化确保每次拍摄都有不同的模拟参数，增加多样性
      const ts = Date.now()
      const photoTimestamp = photoPath
        ? parseInt(photoPath.match(/\d+/g)?.join('') || '0', 10) % 255
        : 140
      // brightness: 模拟值 50-230，涵盖暗光、正常、过曝场景
      const brightness = Math.max(30, Math.min(230, 50 + ((ts + photoTimestamp * 7) % 180)))
      // sharpness: 模拟值 60-180，涵盖模糊到清晰
      const sharpness = 60 + ((ts * 13) % 120)
      // tiltAngle: 模拟值 -15° 到 +15°
      const tiltAngle = (((ts * 17 + photoTimestamp * 3) % 300) - 150) * 0.1

      // 根据模板分类推断场景类型
      const sceneTypeMap: Record<string, 'indoor' | 'outdoor' | 'other'> = {
        '室内日常': 'indoor',
        '室内场景': 'indoor',
        '室内人像': 'indoor',
        '餐厅美食': 'indoor',
        '户外风景': 'outdoor',
        '城市街拍': 'outdoor',
        '人文风景': 'outdoor',
        '特殊风格': 'other',
        '情侣合照': 'other',
        '自拍技巧': 'other',
        '构图技巧': 'other',
        '运动健身': 'other',
        '节日限定': 'other',
        '夜景': 'other',
      }
      const sceneType = templateCategory ? (sceneTypeMap[templateCategory] ?? 'other') : 'other'

      const analysis: AnalysisResult = await analyzePhoto(
        {
          facePosition: faceData,
          faceCount: faces.length,
          brightness,
          sharpness,
          tiltAngle,
          expression: faces[0] ? {
            smiling: faces[0].smiling,
            leftEyeOpen: faces[0].leftEyeOpen,
            rightEyeOpen: faces[0].rightEyeOpen,
            yawAngle: faces[0].yawAngle,
            rollAngle: faces[0].rollAngle,
          } : undefined,
        },
        {
          lastScore: lastRecord?.score,
          recentAvg,
          streakCount,
          totalShoots: diary.length + 1,  // 当前是第 N 张照片（diary 是之前 N-1 张）
          isFirstPhoto: diary.length === 0,
          sceneType,
          lastCompositionScore: lastRecord?.compositionScore,
          lastExpressionScore: lastRecord?.expressionScore,
          lastExposureScore: lastRecord?.exposureScore,
          lastStabilityScore: lastRecord?.stabilityScore,
          isCouplePhoto: faces.length >= 2,
          peakScore: await getPeakScore(),
        }
      )

      if (!mountedRef.current) return
      setPraiseList(analysis.praise || [])
      setScoreResult({
        totalScore: analysis.totalScore,
        compositionScore: analysis.compositionScore,
        exposureScore: analysis.exposureScore,
        stabilityScore: analysis.stabilityScore,
        levelScore: analysis.levelScore,
        expressionScore: analysis.expressionScore,
        suggestions: analysis.suggestions,
      })

      // ========== 本次迭代：VoiceCoach 实时 TTS 集成 — 根据分析结果触发对应语音提示 ==========
      // 仅在分数 < 80 时给出问题提示，避免啰嗦
      if (analysis.totalScore < 80) {
        const suggestCount = analysis.suggestions?.length || 0
        // 闭眼检测（expressionScore 低时触发）
        if (analysis.expressionScore < 12 && suggestCount > 0) {
          setTimeout(() => { try { voiceCoach.speakBlinkTip() } catch {} }, 3000)
        }
        // 表情僵硬（expressionScore 低且无笑容时）
        if (analysis.expressionScore < 10 && suggestCount > 0) {
          setTimeout(() => { try { voiceCoach.speakStiffExpressionTip() } catch {} }, 3200)
        }
        // 逆光/过曝
        if (analysis.problems?.includes('backlight') && suggestCount > 0) {
          setTimeout(() => { try { voiceCoach.speakBacklightTip() } catch {} }, 3400)
        }
        // 欠曝/低光
        if (analysis.exposureScore < 30) {
          setTimeout(() => { try { voiceCoach.speakLowLightWarning() } catch {} }, 3400)
        }
      }

      await saveToDiary({
        date: new Date().toISOString(),
        score: analysis.totalScore,
        suggestions: analysis.suggestions,
        faceCount: faces.length,
        compositionScore: analysis.compositionScore,
        exposureScore: analysis.exposureScore,
        stabilityScore: analysis.stabilityScore,
        levelScore: analysis.levelScore,
        expressionScore: analysis.expressionScore,
      })
      const isNewRecord = await updatePeakScore(analysis.totalScore)

      // 启动入场动画
      cardSlide.value = withTiming(0, { duration: 400 })
      scoreReveal.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 90 }))

      // 新纪录 + TTS 播报（撒花移除，用分数揭示动画替代庆祝反馈）
      if (isNewRecord) {
        setNewRecordBanner(true)
        setTimeout(async () => {
          try {
            await voiceCoach.speakNewRecord(0, analysis.totalScore)
          } catch { /* ignore TTS errors */ }
        }, 500)
      }

      // 打字机效果
      if (analysis.praise && analysis.praise.length > 0) {
        setTimeout(() => typeText(analysis.praise[0]), 600)
      }

      // TTS 朗读夸奖文案（分数 ≥ 90 时，截取前 50 字朗读）
      const praiseToSpeak = analysis.praise?.[0]?.slice(0, 50) || ''
      if (praiseToSpeak) {
        setTimeout(async () => {
          try {
            await voiceCoach.speak(praiseToSpeak, false)
          } catch { /* ignore TTS errors */ }
        }, 1500)
      }

      if (screenshotTimerRef.current) clearTimeout(screenshotTimerRef.current)
      screenshotTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return
        setScoreAnimationDone(true)
        if (viewShotRef.current) {
          try {
            const uri = await viewShotRef.current.capture()
            if (mountedRef.current) setComparisonUri(uri)
          } catch (e: unknown) {
            if (__DEV__) logger.debug('ResultScreen', '截图失败:', e)
          }
        }
      }, 1200)

      // 处理完成 TTS 提示
      setTimeout(async () => {
        try {
          await voiceCoach.speakProcessingDone()
        } catch { /* ignore TTS errors */ }
      }, 1800)
    } catch (e: unknown) {
      if (!mountedRef.current) return
      if (__DEV__) logger.debug('ResultScreen', '处理失败（用户友好提示已展示）:', e)
      const errMsg = e instanceof Error ? e.message : typeof e === 'string' ? e : String(e ?? '')
      let friendlyError: string
      if (errMsg.includes('INVALID_IMAGE_PATH') || errMsg.includes('IMAGE_NOT_FOUND')) {
        friendlyError = '图片读取失败，请重新拍照'
      } else if (errMsg.includes('CACHE_DIR') || errMsg.includes('space') || errMsg.includes('quota')) {
        friendlyError = '存储空间不足，请清理手机空间后重试'
      } else if (errMsg.includes('permission') || errMsg.includes('PERMISSION')) {
        friendlyError = '缺少必要权限，请在设置中开启相册权限'
      } else {
        friendlyError = '分析出了点小问题，请重新拍照试试'
      }
      setError(friendlyError)
      setScoreResult({
        totalScore: 72,
        compositionScore: 35,
        exposureScore: 22,
        stabilityScore: 10,
        levelScore: 5,
        expressionScore: 15,
        suggestions: ['构图不错，可以试试三分法把人脸放在交点上～'],
      })
      cardSlide.value = 0
      scoreReveal.value = 1
    } finally {
      if (mountedRef.current) setProcessing(false)
    }
  }

  // 仅在 filter 变化时重新处理（已在 runAnalysis 中处理过一次，photoPath 变化由 runAnalysis 内部处理）
  useEffect(() => {
    if (!photoPath || processing) return
    processPhoto(photoPath, {
      cropRatio: 3 / 4,
      filterName: selectedFilter,
      autoRetouch: true,
    }).then(path => {
      if (mountedRef.current) setProcessedPath(path)
    }).catch(() => { /* 静默降级 */ })
  }, [selectedFilter])

  async function handleSave() {
    setSaving(true)
    try {
      const pathToSave = comparisonUri || processedPath || photoPath
      const ok = await saveToAlbum(pathToSave)
      if (ok) {
        try { await voiceCoach.speakSavedToAlbum() } catch { /* ignore TTS errors */ }
        Alert.alert('保存成功', '照片已保存到相册，快去发朋友圈吧～')
      } else {
        Alert.alert('保存失败', '请检查相册权限')
      }
    } catch { /* ignore */ }
    finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    voiceCoach.speakShareTip()
    try {
      let pathToShare = comparisonUri || processedPath || photoPath
      if (!pathToShare) {
        Alert.alert('分享失败', '照片还没处理好，稍后再试～')
        return
      }
      if (!pathToShare.startsWith('file://') && !pathToShare.startsWith('http')) {
        pathToShare = `file://${pathToShare}`
      }
      const shareMessages = scoreResult && scoreResult.totalScore >= 80
        ? [
            `用「男友相机」拍了一张 ${scoreResult.totalScore} 分的照片，男朋友太会拍了！`,
            `${scoreResult.totalScore}分神作！男朋友摄影师天赋满点！`,
            `满分之作！这张 ${scoreResult.totalScore} 分的照片要永久保存！`,
            `${scoreResult.totalScore}分的男朋友视角，闺蜜看了都羡慕！`,
            `${scoreResult.totalScore}分的约会照，男朋友开窍了！`,
          ]
        : scoreResult && scoreResult.totalScore >= 60
        ? [
            `用「男友相机」拍了一张 ${scoreResult.totalScore} 分的照片，越拍越好了呢～`,
            `${scoreResult.totalScore}分！男朋友进步肉眼可见！`,
            `${scoreResult.totalScore}分，继续加油，下次冲满分！`,
          ]
        : [
            `用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片，继续加油！`,
            `${scoreResult?.totalScore ?? '--'}分起步，每拍一张都在进步～`,
          ]
      const baseMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)]
      const shareMessage = praiseList[0]
        ? `${baseMessage}\n「${praiseList[0].slice(0, 25)}...」`
        : baseMessage
      const shareOptions = {
        title: '男友相机 - 拍照分析',
        message: shareMessage,
        url: pathToShare,
      } as const
      await Share.share(shareOptions)
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
      if (errorMsg.includes('User did not share') || errorMsg.includes('cancelled')) return
      try {
        const fallbackMessages = [
          `我用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片！快来看看～`,
          `男友相机新照片 ${scoreResult?.totalScore ?? '--'} 分！男朋友在进步中～`,
        ]
        const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)]
        await Share.share({ message: fallbackMessage })
      } catch { /* ignore */ }
    }
  }

  function handleRetry() {
    // 直接跳转相机重拍，体验更流畅
    navigation.navigate({ name: 'Camera' as const, params: {} })
  }

  function handleHome() {
    navigation.navigate({ name: 'Home' as const, params: undefined })
  }

  function handleGoCamera() {
    voiceCoach.speakRetryTip(scoreResult?.totalScore ?? 0)
    navigation.navigate({ name: 'Camera' as const, params: { templateId: undefined } })
  }

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardSlide.value }],
    opacity: interpolate(cardSlide.value, [0, 50], [1, 0]),
  }))

  if (!photoPath) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>？</Text>
        <Text style={[styles.errorText, { color: COLORS.textMuted }]}>没有找到图片</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={handleGoCamera} activeOpacity={0.72}>
          <Text style={styles.errorBtnText}>去拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.errorBtn, { marginTop: 10 }]} onPress={handleHome} activeOpacity={0.72}>
          <Text style={styles.errorBtnText}>返回首页</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // 夸奖文案（分数段）
  const getPraiseBannerText = () => {
    if (!scoreResult) return ''
    if (scoreResult.totalScore >= 90) return `${scoreResult.totalScore}分，太厉害了，完美之作！`
    if (scoreResult.totalScore >= 80) return `${scoreResult.totalScore}分，优秀，男朋友进步好大！`
    if (scoreResult.totalScore >= 70) return `${scoreResult.totalScore}分，不错不错，继续保持！`
    if (scoreResult.totalScore >= 60) return `${scoreResult.totalScore}分，及格啦，下次会更好！`
    return `${scoreResult.totalScore}分，继续加油，一定能越拍越好！`
  }

  // 夸奖横幅背景/边框颜色（按分数段，使用设计系统 tokens）
  // 简洁优雅：背景使用极淡的透明度色，去除色块厚重感；border-left 保留分数档位标识
  const getPraiseBannerColors = (): { bg: string; border: string } => {
    if (!scoreResult) return { bg: 'transparent', border: colors.warning }
    if (scoreResult.totalScore >= 90) return { bg: 'rgba(76,175,80,0.06)', border: colors.scoreGreat }
    if (scoreResult.totalScore >= 80) return { bg: 'rgba(255,107,107,0.06)', border: colors.primary }
    if (scoreResult.totalScore >= 70) return { bg: 'rgba(76,175,80,0.05)', border: colors.success }
    if (scoreResult.totalScore >= 60) return { bg: 'rgba(255,179,71,0.07)', border: colors.warning }
    return { bg: 'rgba(255,107,107,0.05)', border: colors.danger }
  }
  const praiseColors = getPraiseBannerColors()

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 错误提示 + 重试 */}
        {error && !processing && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <View style={styles.errorBannerBtns}>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={runAnalysis}
                activeOpacity={0.72}
              >
                <Text style={styles.errorRetryBtnText}>重试</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={handleGoCamera}
                activeOpacity={0.72}
              >
                <Text style={styles.errorRetryBtnText}>再拍一张</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorRetryBtn, styles.errorSecondaryBtn]}
                onPress={handleHome}
                activeOpacity={0.72}
              >
                <Text style={styles.errorSecondaryBtnText}>返回首页</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 标题栏 */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: COLORS.textPrimary }]}>拍照分析</Text>
          <TouchableOpacity onPress={handleHome} activeOpacity={0.72}>
            <Text style={styles.homeTextLink}>返回</Text>
          </TouchableOpacity>
        </View>

        {/* 处理中 */}
        {processing && (
          <View style={styles.processingOverlay}>
            <Text style={styles.processingLabel}>正在分析...</Text>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 16 }} />
            {/* 精简进度条：步骤 + 连接线（与上方骨架卡配合，简洁明了） */}
            <View style={styles.processingStepsRow}>
              {[
                { n: 1, label: '构图分析' },
                { n: 2, label: '光线检测' },
                { n: 3, label: '生成评分' },
                { n: 4, label: '综合评分' },
              ].map(({ n, label }, idx) => {
                const isActive = processStep === n
                const isDone = processStep > n
                return (
                  <React.Fragment key={n}>
                    <View style={styles.processStepItem}>
                      <View style={[
                        styles.processStepCircle,
                        isActive && styles.processStepCircleActive,
                        isDone && styles.processStepCircleDone,
                      ]}>
                        {isDone
                          ? <Text style={styles.processStepCheck}>✓</Text>
                          : <Text style={[
                              styles.processStepNum,
                              isActive && styles.processStepNumActive,
                            ]}>{n}</Text>
                        }
                      </View>
                      <Text style={[
                        styles.processStepLabel,
                        isActive && styles.processStepLabelActive,
                        isDone && styles.processStepLabelDone,
                      ]}>{label}</Text>
                    </View>
                    {idx < 3 && (
                      <View style={[
                        styles.processStepConnector,
                        isDone && styles.processStepConnectorDone,
                      ]} />
                    )}
                  </React.Fragment>
                )
              })}
            </View>
          </View>
        )}

        {/* 夸奖横幅（打字机效果 + 渐变色背景） */}
        {!processing && (
          <Animated.View
            style={[
              styles.praiseBanner,
              {
                opacity: scoreAnimationDone ? 1 : 0,
                transform: [
                  { translateY: scoreAnimationDone ? 0 : -10 },
                ],
                backgroundColor: praiseColors.bg,
                borderLeftColor: praiseColors.border,
              },
            ]}
          >
              {/* praise banner */}
            <Text style={[styles.praiseBannerScore, { color: praiseColors.border }]}>
              {getPraiseBannerText()}
            </Text>
            {typedPraise.length > 0 && (
              <Text style={styles.praiseBannerSub}>{typedPraise}</Text>
            )}
          </Animated.View>
        )}

        {/* 下次改进提示 */}
        {!processing && scoreResult && scoreResult.suggestions && scoreResult.suggestions.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(200)} style={[styles.suggestionBanner, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.suggestionBannerTitle}>下次可以这样拍</Text>
            {scoreResult.suggestions.slice(0, 2).map((s: string, i: number) => (
              <Text key={i} style={styles.suggestionBannerText}>
                • {s}
              </Text>
            ))}
          </Animated.View>
        )}

        {/* 滤镜选择器 */}
        {!processing && (
          <View style={styles.filterPicker}>
            <Text style={styles.filterPickerTitle}>滤镜</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPickerList}>
              {FILTER_OPTIONS.map((f) => (
                <FilterItem
                  key={f.key}
                  filter={f}
                  isActive={selectedFilter === f.key}
                  onPress={() => {
                    setSelectedFilter(f.key)
                    voiceCoach.speakFilterApplied(f.key)
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 对比卡片 */}
        {!processing && photoPath && (
          <Animated.View style={cardStyle}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.9 }}
              style={styles.viewShot}
            >
              <ComparisonCard
                originalPath={photoPath}
                processedPath={processedPath || photoPath}
                filterName={selectedFilter}
              />
            </ViewShot>
          </Animated.View>
        )}

        {/* 新纪录横幅 */}
        {!processing && newRecordBanner && scoreResult && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.newRecordBanner}
          >
            <Text style={styles.newRecordBannerText}>破纪录了！历史最高分！</Text>
            <Text style={styles.newRecordBannerSub}>男朋友太强了，继续保持这个状态！</Text>
          </Animated.View>
        )}

        {/* 评分板 */}
        {!processing && scoreResult && (
          <ScoreBoard result={scoreResult} />
        )}

        {/* 无图片时的友好提示 */}
        {!processing && !photoPath && !scoreResult && (
          <View style={styles.noPhotoContainer}>
            <Text style={styles.noPhotoEmoji}>暂无照片</Text>
            <Text style={[styles.noPhotoTitle, { color: COLORS.textPrimary }]}>没有找到照片</Text>
            <Text style={[styles.noPhotoDesc, { color: COLORS.textMuted }]}>好像出了点小问题，试试重新拍一张吧～</Text>
            <TouchableOpacity style={styles.noPhotoBtn} onPress={() => navigation.goBack()} activeOpacity={0.72}>
              <Text style={styles.noPhotoBtnText}>重新拍照</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 操作按钮 */}
        {!processing && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={handleRetry}
              activeOpacity={0.72}
            >
              <Text style={styles.actionBtnSecondaryIcon}>↻</Text>
              <Text style={styles.actionBtnSecondaryText}>重拍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnShare}
              onPress={handleShare}
              activeOpacity={0.72}
            >
              <Text style={styles.actionBtnShareText}>分享</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnPrimary, saving && styles.actionBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.72}
            >
              <Text style={styles.actionBtnPrimaryText}>{saving ? '保存中...' : '保存到相册'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 查看进步日记入口 */}
        {!processing && (
          <TouchableOpacity
            style={styles.diaryEntryBtn}
            onPress={() => navigation.navigate({ name: 'Diary' as const, params: undefined })}
            activeOpacity={0.72}
          >
            <Text style={styles.diaryEntryBtnText}>查看进步日记</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

/** FilterItem - 带动画反馈的滤镜选项组件 */
const FilterItem = memo(function FilterItem({
  filter,
  isActive,
  onPress,
}: {
  filter: { key: string; label: string; color: string }
  isActive: boolean
  onPress: () => void
}) {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.12, { damping: 8, stiffness: 120 })
      setTimeout(() => {
        scale.value = withSpring(1.0, { damping: 10, stiffness: 100 })
      }, 150)
    }
  }, [isActive])

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.filterItem}
      accessibilityRole="button"
      accessibilityLabel={`滤镜: ${filter.label}${isActive ? '，已选中' : ''}`}
      accessibilityHint="单击切换滤镜"
    >
      <Animated.View style={[styles.filterCircleWrapper, animatedStyle]}>
        <View style={[
          styles.filterCircle,
          { backgroundColor: filter.color },
          isActive && styles.filterCircleActive,
        ]}>
          {isActive && (
            <View style={[styles.filterCircleSelectedRing, { borderColor: COLORS.primary }]} />
          )}
        </View>
      </Animated.View>
      <Text style={[
        styles.filterLabel,
        isActive && styles.filterLabelActive,
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  newRecordBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.warningLight,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    alignItems: 'center',
  },
  newRecordBannerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.statYellowText,
    marginBottom: 4,
  },
  newRecordBannerSub: {
    fontSize: 13,
    color: colors.statAmber,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  homeTextLink: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterPicker: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  filterPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  filterPickerList: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  filterItem: {
    alignItems: 'center',
    marginHorizontal: 5,
    width: 68,
    // 最小触摸区域 48px，达标
  },
  filterCircleWrapper: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  filterCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCircleActive: {
    // 简洁优雅：shadow 已移除，selectedRing 边框即为清晰的选中态标识
  },
  filterCircleSelectedRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 29,
    borderWidth: 3,
  },
  filterLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 5,
  },
  filterLabelActive: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  processingLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  processingStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  processStepItem: {
    alignItems: 'center',
  },
  processStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.skeletonBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  processStepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  processStepCircleDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    opacity: 0.7,
  },
  processStepCheck: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  processStepNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  processStepNumActive: {
    color: colors.textOnPrimary,
  },
  processStepLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  processStepLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  processStepLabelDone: {
    color: COLORS.primary,
    opacity: 0.7,
  },
  processStepConnector: {
    width: 20,
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  processStepConnectorDone: {
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },
  praiseBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
  },
  praiseBannerScore: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  praiseBannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  suggestionBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  suggestionBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  suggestionBannerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 3,
    lineHeight: 20,
  },
  viewShot: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  actionBtnSecondary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    backgroundColor: colors.bgCard,
    gap: 6,
  },
  actionBtnSecondaryIcon: {
    fontSize: 16,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionBtnShare: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: colors.cardCream,
  },
  actionBtnShareText: {
    fontSize: 14,
    color: COLORS.warning,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 2.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnPrimaryText: {
    fontSize: 15,
    color: COLORS.textOnPrimary,
    fontWeight: 'bold',
  },
  // 去背景化：diaryEntryBtn 仅保留底部分割线，无背景填充，留白充分
  diaryEntryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    borderTopWidth: 1,
    borderColor: colors.divider,
    backgroundColor: 'transparent',
  },
  diaryEntryBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  errorEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  errorBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  errorBannerBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorRetryBtn: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  errorRetryBtnText: {
    fontSize: 13,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  errorSecondaryBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorSecondaryBtnText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
  // 无图片时的友好提示
  noPhotoContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  noPhotoEmoji: { fontSize: 56, marginBottom: 8 },
  noPhotoTitle: { fontSize: 20, fontWeight: 'bold' },
  noPhotoDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  noPhotoBtn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 },
  noPhotoBtnText: { color: COLORS.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
})
