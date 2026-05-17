/**
 * ResultScreen - 结果页 v4
 * 改进：数字逐位滚动动画、打字机夸奖效果、撒花粒子、小红书分享按钮
 */
import React, { useEffect, useState, useRef } from 'react'
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
} from 'react-native-reanimated'
import ViewShot from 'react-native-view-shot'
import ComparisonCard from '../components/result/ComparisonCard'
import ScoreBoard from '../components/result/ScoreBoard'
import type { ScoreResult } from '../components/result/ScoreBoard'
import { processPhoto, saveToAlbum } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary, getDiary, getPeakScore, updatePeakScore, type AnalysisResult } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { COLORS } from '../theme/colors'
import voiceCoach from '../components/camera/VoiceCoach'

const SCREEN_W = Dimensions.get('window').width

export default function ResultScreen({ route, navigation }: any) {
  const { photoPath, templateCategory } = route.params || {}

  const [processedPath, setProcessedPath] = useState<string>('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [praiseList, setPraiseList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'golden' | 'cinematic'>('warm')

const FILTER_OPTIONS: Array<{ key: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'golden' | 'cinematic'; label: string; emoji: string }> = [
  { key: 'warm', label: '暖黄', emoji: '🌅' },
  { key: 'cool', label: '冷调', emoji: '❄️' },
  { key: 'vivid', label: '生动', emoji: '🎨' },
  { key: 'soft', label: '柔和', emoji: '🌸' },
  { key: 'bw', label: '黑白', emoji: '🖤' },
  { key: 'golden', label: '金棕', emoji: '✨' },
  { key: 'cinematic', label: '电影', emoji: '🎬' },
]
  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scoreAnimationDone, setScoreAnimationDone] = useState(false)
  const [processStep, setProcessStep] = useState(1) // 1-3 动画步骤

  // 处理步骤对应的文案
  const processStepText = (() => {
    switch (processStep) {
      case 1: return '正在分析构图...'
      case 2: return '正在检测光线...'
      case 3: return '正在生成评分...'
      default: return '正在分析中...'
    }
  })()

  const viewShotRef = useRef<any>(null)
  const { faces } = useFaceDetection()
  const mountedRef = useRef(true)
  const screenshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 撒花粒子动画
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; x: number; delay: number; emoji: string }>>([])

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
    if (!processing) return
    setProcessStep(1)
    const t2 = setTimeout(() => { if (mountedRef.current) setProcessStep(2) }, 600)
    const t3 = setTimeout(() => { if (mountedRef.current) setProcessStep(3) }, 1200)
    return () => { clearTimeout(t2); clearTimeout(t3) }
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
    const emojis = ['🎉', '✨', '🌟', '🎊', '💖', '🏆', '👏', '💯']
    const particles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_W,
      delay: i * 60,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }))
    setConfettiParticles(particles)
    setTimeout(() => setConfettiParticles([]), 3000)
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
      await updatePeakScore(analysis.totalScore)

      // 启动入场动画
      cardSlide.value = withTiming(0, { duration: 400 })
      scoreReveal.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 90 }))

      // 90分以上撒花
      if (analysis.totalScore >= 90) {
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
          } catch (e) {
            console.warn('[ResultScreen] 截图失败:', e)
          }
        }
      }, 1200)
    } catch (e: any) {
      if (!mountedRef.current) return
      console.error('[ResultScreen] 处理失败:', e)
      // 根据错误类型给出更友好的提示
      const errMsg = String(e?.message || e || '')
      let friendlyError: string
      if (errMsg.includes('INVALID_IMAGE_PATH') || errMsg.includes('IMAGE_NOT_FOUND')) {
        friendlyError = '图片读取失败，请重新拍照'
      } else if (errMsg.includes('CACHE_DIR')) {
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

  useEffect(() => {
    if (photoPath && !processing) {
      processPhoto(photoPath, {
        cropRatio: 3 / 4,
        filterName: selectedFilter,
        autoRetouch: true,
      }).then(path => {
        if (mountedRef.current) setProcessedPath(path)
      })
    }
  }, [selectedFilter, photoPath])

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
    } catch {
      Alert.alert('保存失败', '请检查相册权限')
    } finally {
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
      const shareMessage = `${scoreEmoji} 用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片！${scoreResult && scoreResult.totalScore >= 80 ? '男朋友太会拍了！' : scoreResult && scoreResult.totalScore >= 60 ? '越拍越好了呢～' : '继续加油！'} ${praiseList[0] ? `「${praiseList[0].slice(0, 20)}...」` : ''}`
      const shareOptions = {
        title: '男友相机 - 拍照分析',
        message: shareMessage,
        url: pathToShare,
      } as const
      await Share.share(shareOptions)
    } catch (e: any) {
      const errorMsg = e?.message || ''
      if (errorMsg.includes('User did not share') || errorMsg.includes('cancelled')) return
      try {
        const fallbackMessage = `我用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片！快来看看～`
        await Share.share({ message: fallbackMessage })
      } catch {
        Alert.alert('分享失败', '请稍后重试')
      }
    }
  }

  async function handleShareXiaohongshu() {
    Alert.alert(
      '📸 分享到小红书',
      '截图保存后，打开小红书 App 发布你的照片～\n\n💡 建议配上文字：\n"男朋友用男友相机给我拍的照片，得分还不错！"\n\n一起让男友越拍越好吧 ❤️',
      [{ text: '好的！', style: 'default' }]
    )
  }

  function handleRetry() {
    // 直接跳转相机重拍，体验更流畅
    navigation.navigate('Camera')
  }

  function handleHome() {
    navigation.navigate('Home')
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
        <TouchableOpacity style={styles.errorBtn} onPress={handleHome} activeOpacity={0.72}>
          <Text style={styles.errorBtnText}>返回首页</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.errorRetryBtn, { marginTop: 12 }]} onPress={() => navigation.goBack()} activeOpacity={0.72}>
          <Text style={styles.errorRetryBtnText}>🔄 重新拍照</Text>
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

        {/* 小红书分享引导卡片 */}
        {!processing && scoreResult && (
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
        {!processing && (
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

        {/* 评分板 */}
        {!processing && scoreResult && (
          <ScoreBoard result={scoreResult} />
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
})
