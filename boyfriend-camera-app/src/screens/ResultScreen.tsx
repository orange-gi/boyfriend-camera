/**
 * ResultScreen - 结果页 v4
 * 改进：数字逐位滚动动画、打字机夸奖效果、撒花粒子、小红书分享按钮
 */
import React, { useEffect, useState, useRef, useMemo } from 'react'
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
  Easing,
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
import { COLORS } from '../theme/colors'
import voiceCoach from '../components/camera/VoiceCoach'
import { logger } from '../utils/logger'

const SCREEN_W = Dimensions.get('window').width

export default function ResultScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Result'>>()
  const { photoPath, templateCategory } = route.params || {}

  const [processedPath, setProcessedPath] = useState<string>('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [praiseList, setPraiseList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'landscape' | 'night' | 'sunset' | 'floral' | 'snow' | 'golden' | 'cinematic'>(
    (() => {
      // 根据模板分类智能推荐滤镜
      const catFilterMap: Record<string, 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'landscape' | 'night' | 'sunset' | 'floral' | 'snow' | 'golden' | 'cinematic'> = {
        '餐厅美食': 'food',
        '户外风景': 'golden',
        '城市街拍': 'cinematic',
        '室内场景': 'warm',
        '室内人像': 'portrait',
        '特殊风格': 'vivid',
        '情侣合照': 'portrait',
        '室内日常': 'soft',
        '自拍技巧': 'soft',
        '构图技巧': 'cinematic',
      }
      return templateCategory ? (catFilterMap[templateCategory] ?? 'warm') : 'warm'
    })()
  )

const FILTER_OPTIONS: Array<{ key: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'landscape' | 'night' | 'sunset' | 'floral' | 'snow' | 'golden' | 'cinematic'; label: string; emoji: string }> = [
  { key: 'warm', label: '暖黄', emoji: '🌅' },
  { key: 'cool', label: '冷调', emoji: '❄️' },
  { key: 'vivid', label: '生动', emoji: '🎨' },
  { key: 'soft', label: '柔和', emoji: '🌸' },
  { key: 'bw', label: '黑白', emoji: '🖤' },
  { key: 'portrait', label: '人像', emoji: '👩' },
  { key: 'food', label: '美食', emoji: '🍔' },
  { key: 'landscape', label: '风景', emoji: '🏞️' },
  { key: 'night', label: '夜景', emoji: '🌃' },
  { key: 'sunset', label: '日落', emoji: '🌇' },
  { key: 'floral', label: '花季', emoji: '🌺' },
  { key: 'snow', label: '雪景', emoji: '❄️' },
  { key: 'golden', label: '金棕', emoji: '✨' },
  { key: 'cinematic', label: '电影', emoji: '🎬' },
]
  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scoreAnimationDone, setScoreAnimationDone] = useState(false)
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

  // 撒花粒子动画
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; x: number; delay: number; emoji: string }>>([])
  const confettiClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 打字机效果
  const [typedPraise, setTypedPraise] = useState('')
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scoreReveal = useSharedValue(0)
  const cardSlide = useSharedValue(50)

  // 初始化 VoiceCoach（TTS 引擎）
  useEffect(() => {
    voiceCoach.initialize().catch(() => { /* ignore init errors */ })
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
      if (confettiClearTimerRef.current) clearTimeout(confettiClearTimerRef.current)
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

  function spawnConfetti() {
    if (confettiClearTimerRef.current) clearTimeout(confettiClearTimerRef.current)
    const emojis = ['🎉', '✨', '🌟', '🎊', '💖', '🏆', '👏', '💯']
    const particles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_W,
      delay: i * 60,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }))
    setConfettiParticles(particles)
    confettiClearTimerRef.current = setTimeout(() => setConfettiParticles([]), 3000)
  }

  /** 新纪录特浓撒花（粒子更多、emoji 更喜庆） */
  function spawnNewRecordConfetti() {
    if (confettiClearTimerRef.current) clearTimeout(confettiClearTimerRef.current)
    const newRecordEmojis = ['🏆', '🎉', '💯', '🌟', '✨', '🎊', '👑', '💖', '👏', '🏅']
    const particles = Array.from({ length: 40 }, (_, i) => ({
      id: 100 + i,
      x: Math.random() * SCREEN_W,
      delay: i * 40,
      emoji: newRecordEmojis[Math.floor(Math.random() * newRecordEmojis.length)],
    }))
    setConfettiParticles(particles)
    confettiClearTimerRef.current = setTimeout(() => setConfettiParticles([]), 5000)
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
        '餐厅美食': 'indoor',
        '户外风景': 'outdoor',
        '特殊风格': 'other',
        '情侣合照': 'other',
      }
      const sceneType = templateCategory ? (sceneTypeMap[templateCategory] ?? 'other') : 'other'

      const analysis: AnalysisResult = await analyzePhoto(
        {
          facePosition: faceData,
          faceCount: faces.length,
          brightness,
          sharpness,
          tiltAngle,
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
        suggestions: analysis.suggestions,
      })

      await saveToDiary({
        date: new Date().toISOString(),
        score: analysis.totalScore,
        suggestions: analysis.suggestions,
        faceCount: faces.length,
        compositionScore: analysis.compositionScore,
        exposureScore: analysis.exposureScore,
        stabilityScore: analysis.stabilityScore,
        levelScore: analysis.levelScore,
      })
      const isNewRecord = await updatePeakScore(analysis.totalScore)

      // 启动入场动画
      cardSlide.value = withTiming(0, { duration: 400 })
      scoreReveal.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 90 }))

      // 新纪录特浓撒花 + TTS 播报
      if (isNewRecord) {
        setNewRecordBanner(true)
        setTimeout(() => spawnNewRecordConfetti(), 500)
        setTimeout(async () => {
          try {
            await voiceCoach.speakNewRecord(0, analysis.totalScore)
          } catch { /* ignore TTS errors */ }
        }, 600)
      } else if (analysis.totalScore >= 90) {
        // 普通高分撒花
        setTimeout(() => spawnConfetti(), 800)
      }

      // 打字机效果
      if (analysis.praise && analysis.praise.length > 0) {
        setTimeout(() => typeText(analysis.praise[0]), 600)
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
        Alert.alert('✅ 保存成功', '照片已保存到相册，快去发朋友圈吧～')
      } else {
        Alert.alert('保存失败', '请检查相册权限')
      }
    } catch { /* ignore */ }
    finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    try {
      let pathToShare = comparisonUri || processedPath || photoPath
      if (!pathToShare) {
        Alert.alert('分享失败', '照片还没处理好，稍后再试～')
        return
      }
      if (!pathToShare.startsWith('file://') && !pathToShare.startsWith('http')) {
        pathToShare = `file://${pathToShare}`
      }
      const scoreEmoji = scoreResult && scoreResult.totalScore >= 80 ? '🌟' : scoreResult && scoreResult.totalScore >= 60 ? '✨' : '💪'
      const shareMessages = scoreResult && scoreResult.totalScore >= 80
        ? [
            `🌟 用「男友相机」拍了一张 ${scoreResult.totalScore} 分的照片！男朋友太会拍了！`,
            `🏆 ${scoreResult.totalScore}分神作！男朋友摄影师天赋满点！`,
            `💯 满分之作！这张 ${scoreResult.totalScore} 分的照片要永久保存！`,
            `✨ ${scoreResult.totalScore}分的男朋友视角！闺蜜看了都羡慕！`,
            `📸 ${scoreResult.totalScore}分的约会照！男朋友开窍了！`,
          ]
        : scoreResult && scoreResult.totalScore >= 60
        ? [
            `✨ 用「男友相机」拍了一张 ${scoreResult.totalScore} 分的照片！越拍越好了呢～`,
            `👍 ${scoreResult.totalScore}分！男朋友进步肉眼可见！`,
            `🌱 ${scoreResult.totalScore}分！继续加油，下次冲满分！`,
          ]
        : [
            `💪 用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片！继续加油！`,
            `🌱 ${scoreResult?.totalScore ?? '--'}分起步！每拍一张都在进步～`,
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
          `📸 男友相机新照片 ${scoreResult?.totalScore ?? '--'} 分！男朋友在进步中～`,
        ]
        const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)]
        await Share.share({ message: fallbackMessage })
      } catch { /* ignore */ }
    }
  }

  async function handleShareXiaohongshu() {
    try {
      let pathToShare = comparisonUri || processedPath || photoPath
      if (!pathToShare) {
        Alert.alert('分享失败', '照片还没处理好，稍后再试～')
        return
      }
      if (!pathToShare.startsWith('file://') && !pathToShare.startsWith('http')) {
        pathToShare = `file://${pathToShare}`
      }
      const scoreText = scoreResult?.totalScore != null ? `${scoreResult.totalScore}分` : '还不错'
      const shareMessage = `📸 用「男友相机」给女朋友拍的照片，得分 ${scoreText}！${scoreResult && scoreResult.totalScore >= 80 ? '男朋友太会拍了！' : scoreResult && scoreResult.totalScore >= 60 ? '越拍越好了呢～' : '继续加油！'}\n\n💡 建议配文：男朋友用「男友相机」给我拍照，越拍越好了！❤️\n#拍照教程 #情侣日常 #手机摄影`

      const shareOptions = {
        title: '分享到小红书',
        message: shareMessage,
        url: pathToShare,
      } as const
      await Share.share(shareOptions)
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
      if (errorMsg.includes('User did not share') || errorMsg.includes('cancelled')) return
      // fallback: 仅发文字
      const scoreText = scoreResult?.totalScore != null ? `${scoreResult.totalScore}分` : '还不错'
      const fallbackMsg = `📸 用「男友相机」给女朋友拍照，得分 ${scoreText}！越拍越好了～❤️ #拍照教程 #情侣日常`
      try {
        await Share.share({ message: fallbackMsg })
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
    navigation.navigate({ name: 'Camera' as const, params: { templateId: undefined } })
  }

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardSlide.value }],
    opacity: interpolate(cardSlide.value, [0, 50], [1, 0]),
  }))

  if (!photoPath) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>🤔</Text>
        <Text style={[styles.errorText, { color: COLORS.textMuted }]}>没有找到图片</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={handleGoCamera} activeOpacity={0.72}>
          <Text style={styles.errorBtnText}>📷 去拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.errorBtn, { marginTop: 10 }]} onPress={handleHome} activeOpacity={0.72}>
          <Text style={styles.errorBtnText}>🏠 返回首页</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // 夸奖文案（分数段）
  const getPraiseBannerText = () => {
    if (!scoreResult) return ''
    if (scoreResult.totalScore >= 90) return '💯 太厉害了！完美之作！'
    if (scoreResult.totalScore >= 80) return '🌟 优秀！男朋友进步好大！'
    if (scoreResult.totalScore >= 70) return '👍 不错不错，继续保持！'
    if (scoreResult.totalScore >= 60) return '😊 及格啦，下次会更好！'
    return '💪 继续加油！一定能越拍越好！'
  }

  return (
    <View style={styles.container}>
      {/* 撒花粒子 */}
      {confettiParticles.map(p => (
        <ConfettiParticle key={p.id} x={p.x} delay={p.delay} emoji={p.emoji} />
      ))}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 错误提示 + 重试 */}
        {error && !processing && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error}</Text>
            <View style={styles.errorBannerBtns}>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={runAnalysis}
                activeOpacity={0.72}
              >
                <Text style={styles.errorRetryBtnText}>🔄 重试</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={handleGoCamera}
                activeOpacity={0.72}
              >
                <Text style={styles.errorRetryBtnText}>📷 再拍一张</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorRetryBtn, styles.errorSecondaryBtn]}
                onPress={handleHome}
                activeOpacity={0.72}
              >
                <Text style={styles.errorSecondaryBtnText}>🏠 首页</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 标题栏 */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: COLORS.textPrimary }]}>📸 拍照分析</Text>
          <TouchableOpacity onPress={handleHome} style={styles.homeTinyBtn} activeOpacity={0.72}>
            <Text style={styles.homeTinyBtnText}>🏠</Text>
          </TouchableOpacity>
        </View>

        {/* 处理中 */}
        {processing && (
          <View style={styles.processingOverlay}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonCardImage} />
              <View style={styles.skeletonCardRow}>
                <View style={styles.skeletonBadge} />
                <View style={styles.skeletonBadge} />
                <View style={styles.skeletonBadge} />
              </View>
            </View>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            <Text style={[styles.processingText, { color: COLORS.textPrimary }]}>{processStepText}</Text>
            <Text style={[styles.processingSubText, { color: COLORS.textMuted }]}>稍等一下，马上就好～</Text>
            {/* 进度点指示器 */}
            <View style={styles.progressDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={styles.progressDotWrapper}>
                  <View
                    style={[
                      styles.progressDot,
                      processStep > i + 1 ? styles.progressDotDone
                        : processStep === i + 1 ? styles.progressDotActive
                        : styles.progressDotPending,
                    ]}
                  />
                  {i < 2 && (
                    <View style={[
                      styles.progressDotLine,
                      processStep > i + 1 && styles.progressDotLineDone,
                    ]} />
                  )}
                </View>
              ))}
            </View>
            <View style={styles.processingSteps}>
              <View style={[styles.processStep, processStep >= 1 ? styles.processStepActive : styles.processStepPending]}>
                <Text style={styles.processStepDot}>1</Text>
                <Text style={styles.processStepLabel}>构图分析</Text>
              </View>
              <View style={styles.processStepLine} />
              <View style={[styles.processStep, processStep >= 2 ? styles.processStepActive : styles.processStepPending]}>
                <Text style={styles.processStepDot}>2</Text>
                <Text style={styles.processStepLabel}>光线检测</Text>
              </View>
              <View style={styles.processStepLine} />
              <View style={[styles.processStep, processStep >= 3 ? styles.processStepActive : styles.processStepPending]}>
                <Text style={styles.processStepDot}>3</Text>
                <Text style={styles.processStepLabel}>生成评分</Text>
              </View>
            </View>
          </View>
        )}

        {/* 夸奖横幅（打字机效果） */}
        {!processing && (
          <Animated.View
            style={[
              styles.praiseBanner,
              {
                opacity: scoreAnimationDone ? 1 : 0,
                transform: [{ translateY: scoreAnimationDone ? 0 : -10 }],
              },
            ]}
          >
            <Text style={styles.praiseBannerScore}>{getPraiseBannerText()}</Text>
            {typedPraise.length > 0 && (
              <Text style={styles.praiseBannerSub}>🌟 {typedPraise}<Text style={styles.cursorBlink}>|</Text></Text>
            )}
          </Animated.View>
        )}

        {/* 下次改进提示 */}
        {!processing && scoreResult && scoreResult.suggestions && scoreResult.suggestions.length > 0 && (
          <Animated.View style={[styles.suggestionBanner, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.suggestionBannerTitle}>💡 下次可以这样拍</Text>
            {scoreResult.suggestions.slice(0, 2).map((s: string, i: number) => (
              <Text key={i} style={styles.suggestionBannerText}>
                • {s}
              </Text>
            ))}
          </Animated.View>
        )}

        {/* 小红书分享引导卡片 */}
        {!processing && scoreResult && photoPath && (
          <TouchableOpacity
            style={styles.xiaohongshuCard}
            onPress={handleShareXiaohongshu}
            activeOpacity={0.72}
          >
            <Text style={styles.xiaohongshuIcon}>📕</Text>
            <View style={styles.xiaohongshuText}>
              <Text style={styles.xiaohongshuTitle}>分享到小红书</Text>
              <Text style={styles.xiaohongshuDesc}>让闺蜜们羡慕你们的进步～</Text>
            </View>
            <Text style={styles.xiaohongshuArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* 滤镜选择器 */}
        {!processing && (
          <View style={styles.filterPicker}>
            <Text style={styles.filterPickerTitle}>🎨 滤镜</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPickerList}>
              {FILTER_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setSelectedFilter(f.key)}
                  style={[styles.filterChip, selectedFilter === f.key && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterChipEmoji}>{f.emoji}</Text>
                  <Text style={[styles.filterChipLabel, selectedFilter === f.key && styles.filterChipLabelActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
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
            <Text style={styles.newRecordBannerText}>🏆 破纪录了！历史最高分！</Text>
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
            <Text style={styles.noPhotoEmoji}>📷</Text>
            <Text style={[styles.noPhotoTitle, { color: COLORS.textPrimary }]}>没有找到照片</Text>
            <Text style={[styles.noPhotoDesc, { color: COLORS.textMuted }]}>好像出了点小问题，试试重新拍一张吧～</Text>
            <TouchableOpacity style={styles.noPhotoBtn} onPress={() => navigation.goBack()} activeOpacity={0.72}>
              <Text style={styles.noPhotoBtnText}>🔄 重新拍照</Text>
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
              <Text style={styles.actionBtnSecondaryIcon}>🔄</Text>
              <Text style={styles.actionBtnSecondaryText}>重拍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnShare}
              onPress={handleShare}
              activeOpacity={0.72}
            >
              <Text style={styles.actionBtnShareIcon}>📤</Text>
              <Text style={styles.actionBtnShareText}>分享</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnPrimary, saving && styles.actionBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.72}
            >
              <Text style={styles.actionBtnPrimaryText}>{saving ? '保存中...' : '💾 保存到相册'}</Text>
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
            <Text style={styles.diaryEntryBtnText}>📖 查看进步日记</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

/** 撒花粒子组件 */
function ConfettiParticle({ x, delay, emoji }: { x: number; delay: number; emoji: string }) {
  const translateY = useSharedValue(-20)
  const opacity = useSharedValue(0)
  const rotate = useSharedValue(0)

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(700, { duration: 2500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    )
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }))
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 })
    }, delay + 2200)
    rotate.value = withDelay(delay, withTiming(360, { duration: 800 }))
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.confettiParticle, { left: x }, animatedStyle]}>
      <Text style={styles.confettiEmoji}>{emoji}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  newRecordBannerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B8860B',
    marginBottom: 4,
  },
  newRecordBannerSub: {
    fontSize: 13,
    color: '#8B6914',
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
  homeTinyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTinyBtnText: {
    fontSize: 18,
  },
  filterPicker: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  filterPickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterPickerList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    minWidth: 56,
  },
  filterChipActive: {
    backgroundColor: '#FFE4EC',
    borderWidth: 1.5,
    borderColor: '#FD79A8',
  },
  filterChipEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  filterChipLabel: {
    fontSize: 11,
    color: '#999',
  },
  filterChipLabelActive: {
    color: '#FD79A8',
    fontWeight: '600',
  },
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  skeletonCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    height: 260,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  skeletonCardImage: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  skeletonCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d0d0d0',
  },
  processingSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  processStep: {
    alignItems: 'center',
  },
  processStepActive: {
    opacity: 1,
  },
  processStepPending: {
    opacity: 0.4,
  },
  processStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  processStepLine: {
    width: 24,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  processStepLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  processingSubText: {
    marginTop: 4,
    fontSize: 13,
  },
  praiseBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    shadowColor: COLORS.warning,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  praiseBannerScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  praiseBannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cursorBlink: {
    color: COLORS.primary,
  },
  // ========== Round 8 新增：下次改进提示 ==========
  suggestionBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
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
  xiaohongshuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  xiaohongshuIcon: {
    fontSize: 28,
  },
  xiaohongshuText: {
    flex: 1,
  },
  xiaohongshuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  xiaohongshuDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  xiaohongshuArrow: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
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
    backgroundColor: '#fff',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
    borderColor: COLORS.warning,
    backgroundColor: '#FFFBF5',
    gap: 6,
    shadowColor: COLORS.warning,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnShareIcon: {
    fontSize: 16,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnPrimaryText: {
    fontSize: 15,
    color: COLORS.textOnPrimary,
    fontWeight: 'bold',
  },
  diaryEntryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0F5',
  },
  diaryEntryBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
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
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
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
    color: '#856404',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorRetryBtn: {
    backgroundColor: '#856404',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  errorRetryBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  errorSecondaryBtn: {
    backgroundColor: '#f0e6c8',
    borderWidth: 1,
    borderColor: '#c9a84c',
  },
  errorSecondaryBtnText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
  },
  // 撒花粒子
  confettiParticle: {
    position: 'absolute',
    top: 0,
    zIndex: 999,
  },
  confettiEmoji: {
    fontSize: 24,
  },
  // 无图片时的友好提示
  noPhotoContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  noPhotoEmoji: { fontSize: 56, marginBottom: 8 },
  noPhotoTitle: { fontSize: 20, fontWeight: 'bold' },
  noPhotoDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  noPhotoBtn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 },
  noPhotoBtnText: { color: COLORS.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  // 进度点指示器样式
  progressDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 8 },
  progressDotWrapper: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressDotActive: { backgroundColor: COLORS.primary, transform: [{ scale: 1.3 }] },
  progressDotDone: { backgroundColor: COLORS.primary, opacity: 0.7 },
  progressDotPending: { backgroundColor: '#E0E0E0' },
  progressDotLine: { width: 32, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  progressDotLineDone: { backgroundColor: COLORS.primary, opacity: 0.7 },
})
