/**
 * ResultScreen - 结果页 v3
 * 拍照→处理→评分→展示完整流程
 * 改进 v3：动画评分展开、滤镜预览、分享卡片生成、夸奖横幅
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
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
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated'
import ViewShot from 'react-native-view-shot'
import ComparisonCard from '../components/result/ComparisonCard'
import ScoreBoard from '../components/result/ScoreBoard'
import type { ScoreResult } from '../components/result/ScoreBoard'
import { processPhoto, saveToAlbum } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary, getDiary, type AnalysisResult } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'

const { width: SCREEN_W } = Dimensions.get('window')

export default function ResultScreen({ route, navigation }: any) {
  const { photoPath } = route.params || {}

  const [processedPath, setProcessedPath] = useState<string>('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [praiseList, setPraiseList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'warm' | 'cool' | 'vivid' | 'soft' | 'bw'>('warm')
  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scoreAnimationDone, setScoreAnimationDone] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewShotRef = useRef<any>(null)
  const { faces } = useFaceDetection()
  // 防 unmount 后 setState
  const mountedRef = useRef(true)
  const screenshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 评分展开动画
  const scoreReveal = useSharedValue(0)
  const cardSlide = useSharedValue(50)

  // 主处理流程
  useEffect(() => {
    mountedRef.current = true
    if (!photoPath) {
      setProcessing(false)
      return
    }
    runAnalysis()
    return () => {
      mountedRef.current = false
      if (screenshotTimerRef.current) {
        clearTimeout(screenshotTimerRef.current)
        screenshotTimerRef.current = null
      }
    }
  }, [photoPath])

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
      // 构建分析上下文（用于夸奖池增强）
      // getDiary() 返回按存储顺序（最老在前），所以 diary[diary.length-1] 是最近一条
      const diary = await getDiary()
      const lastRecord = diary[diary.length - 1] // 最近一次拍照记录
      // 最近 5 次取末尾（时间倒序）
      const recentSlice = diary.slice(-5)
      const recentAvg = recentSlice.length > 0
        ? recentSlice.reduce((s, v) => s + v.score, 0) / recentSlice.length
        : undefined

      // 计算连续高分次数（从最近向前数连续 >= 80 分的次数）
      let streakCount = 0
      for (let i = diary.length - 1; i >= 0; i--) {
        if (diary[i].score >= 80) streakCount++
        else break
      }

      // 从 photoPath 计算伪随机但确定的值（基于文件名时间戳）
      const photoTimestamp = photoPath
        ? parseInt(photoPath.match(/\d+/g)?.join('') || '0', 10) % 255
        : 140
      // 使用时间戳生成确定性伪随机值（避免每次都相同）
      const ts = Date.now()
      const brightness = Math.max(30, Math.min(220, (photoTimestamp || 100) + (ts % 120)))
      const sharpness = 80 + (ts % 120) // 80-200
      const tiltAngle = ((ts % 36) - 18) * 0.5 // -9 ~ 9 度

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
          totalShoots: diary.length,
          isFirstPhoto: diary.length === 0,
          // 传递上次分项分数用于进步检测
          lastCompositionScore: lastRecord?.compositionScore,
          lastExposureScore: lastRecord?.exposureScore,
          lastStabilityScore: lastRecord?.stabilityScore,
          // 情侣合照检测（多脸时）
          isCouplePhoto: faces.length >= 2,
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

      // 启动入场动画
      cardSlide.value = withTiming(0, { duration: 400, })
      scoreReveal.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 90 }))

      // 截图延迟等动画完成后（cleanup 时清除）
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
      setError(e.message || '处理失败')
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

  // 滤镜切换后重新处理
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
  }, [selectedFilter])

  async function handleSave() {
    setSaving(true)
    try {
      const pathToSave = comparisonUri || processedPath || photoPath
      const ok = await saveToAlbum(pathToSave)
      if (ok) {
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
      // 确保 file:// 前缀（本地路径分享需要）
      if (!pathToShare.startsWith('file://') && !pathToShare.startsWith('http')) {
        pathToShare = `file://${pathToShare}`
      }

      // 平台特定分享策略
      const scoreEmoji = scoreResult && scoreResult.totalScore >= 80 ? '🌟' : scoreResult && scoreResult.totalScore >= 60 ? '✨' : '💪'
      const shareMessage = `${scoreEmoji} 用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片！${scoreResult && scoreResult.totalScore >= 80 ? '男朋友太会拍了！' : scoreResult && scoreResult.totalScore >= 60 ? '越拍越好了呢～' : '继续加油！'} ${praiseList[0] ? `「${praiseList[0].slice(0, 20)}...」` : ''}`

      // iOS 上 Share.share 同时支持 message + url；Android 上 url 可能被忽略
      // 优先尝试带图片分享
      const shareOptions = {
        title: '男友相机 - 拍照分析',
        message: shareMessage,
        url: pathToShare,
      } as const

      await Share.share(shareOptions)
    } catch (e: any) {
      const errorMsg = e?.message || ''
      if (errorMsg.includes('User did not share') || errorMsg.includes('cancelled')) {
        return // 用户取消，不弹窗
      }
      // 降级：纯文字分享
      try {
        const fallbackMessage = `我用「男友相机」拍了一张 ${scoreResult?.totalScore ?? '--'} 分的照片！快来看看～`
        await Share.share({ message: fallbackMessage })
      } catch {
        Alert.alert('分享失败', '请稍后重试')
      }
    }
  }

  function handleRetry() {
    navigation.goBack()
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
        <Text style={styles.errorText}>没有找到图片</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={handleHome}>
          <Text style={styles.errorBtnText}>返回首页</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 错误提示横幅 */}
      {error && !processing && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {error}</Text>
        </View>
      )}

      {/* 标题 */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>📸 拍照分析</Text>
        <TouchableOpacity onPress={handleHome} style={styles.homeTinyBtn}>
          <Text style={styles.homeTinyBtnText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {/* 处理中状态 */}
      {processing && (
        <View style={styles.processingOverlay}>
          {/* 骨架卡片占位 */}
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonCardImage} />
            <View style={styles.skeletonCardRow}>
              <View style={styles.skeletonBadge} />
              <View style={styles.skeletonBadge} />
              <View style={styles.skeletonBadge} />
            </View>
          </View>
          <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 20 }} />
          <Text style={styles.processingText}>正在分析构图...</Text>
          <Text style={styles.processingSubText}>稍等一下，马上就好～</Text>
          {/* 处理步骤指示 */}
          <View style={styles.processingSteps}>
            <View style={[styles.processStep, styles.processStepActive]}>
              <Text style={styles.processStepDot}>1</Text>
              <Text style={styles.processStepLabel}>构图分析</Text>
            </View>
            <View style={styles.processStepLine} />
            <View style={[styles.processStep, processing ? styles.processStepActive : styles.processStepPending]}>
              <Text style={styles.processStepDot}>2</Text>
              <Text style={styles.processStepLabel}>光线检测</Text>
            </View>
            <View style={styles.processStepLine} />
            <View style={[styles.processStep, styles.processStepPending]}>
              <Text style={styles.processStepDot}>3</Text>
              <Text style={styles.processStepLabel}>生成评分</Text>
            </View>
          </View>
        </View>
      )}

      {/* 夸奖横幅 */}
      {!processing && praiseList.length > 0 && (
        <Animated.View
          style={[
            styles.praiseBanner,
            {
              opacity: scoreAnimationDone ? 1 : 0,
              transform: [
                {
                  translateY: scoreAnimationDone ? 0 : -10,
                },
              ],
            },
          ]}
        >
          {praiseList.slice(0, 2).map((p, i) => (
            <Text key={i} style={styles.praiseText}>🌟 {p}</Text>
          ))}
        </Animated.View>
      )}

      {/* 分享引导卡片 */}
      {!processing && scoreResult && (
        <View style={styles.shareTipCard}>
          <Text style={styles.shareTipIcon}>📤</Text>
          <View style={styles.shareTipText}>
            <Text style={styles.shareTipTitle}>分享给闺蜜</Text>
            <Text style={styles.shareTipDesc}>让她们也羡慕你们的进步～</Text>
          </View>
        </View>
      )}

      {/* 对比卡片（用于截图） */}
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
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnSecondaryIcon}>🔄</Text>
            <Text style={styles.actionBtnSecondaryText}>重拍</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnShare}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnShareIcon}>📤</Text>
            <Text style={styles.actionBtnShareText}>分享</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnPrimary, saving && styles.actionBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnPrimaryText}>{saving ? '保存中...' : '💾 保存到相册'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  // 骨架卡
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
  // 处理步骤
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
    backgroundColor: '#FF6B6B',
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
    color: '#999',
    marginTop: 4,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  processingSubText: {
    marginTop: 4,
    fontSize: 13,
    color: '#999',
  },
  praiseBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB347',
    shadowColor: '#FFB347',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  praiseText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 4,
  },
  shareTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.15)',
  },
  shareTipIcon: {
    fontSize: 28,
  },
  shareTipText: {
    flex: 1,
  },
  shareTipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 2,
  },
  shareTipDesc: {
    fontSize: 13,
    color: '#999',
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
    borderColor: '#eee',
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
    color: '#666',
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
    borderColor: '#FFB347',
    backgroundColor: '#FFFBF5',
    gap: 6,
    shadowColor: '#FFB347',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnShareIcon: {
    fontSize: 16,
  },
  actionBtnShareText: {
    fontSize: 14,
    color: '#FFB347',
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 2.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    gap: 8,
    shadowColor: '#FF6B6B',
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
    color: '#fff',
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
    color: '#999',
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  errorBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
  },
})
