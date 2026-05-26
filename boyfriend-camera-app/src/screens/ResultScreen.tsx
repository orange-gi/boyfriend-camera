/** ResultScreen - 拍照结果页 */
import React, { useEffect, useState, useRef } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native'

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import ViewShot, { ViewShotRef } from 'react-native-view-shot'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import type { RootStackParamList } from '../../App'
import ComparisonCard from '../components/result/ComparisonCard'
import ScoreBoard from '../components/result/ScoreBoard'
import type { ScoreResult } from '../components/result/ScoreBoard'
import { processPhoto, saveToAlbum } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary, getDiary, getPeakScore, updatePeakScore, type AnalysisResult, type SceneType } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { COLORS, typography, hexAlpha } from '../theme'
import VoiceCoach from '../components/camera/VoiceCoach'
import { logger } from '../utils/logger'

type CoreFilter = 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'cinematic'

/** 映射模板分类 → analyzer SceneType（精确分类让夜间/节庆等场景获得专属建议） */
function getSceneType(category: string | null | undefined): SceneType {
  if (!category) return 'other'
  const map: Record<string, SceneType> = {
    '夜景': 'rooftop_night',
    '户外风景': 'outdoor',
    '城市街拍': 'other',
    '人文风景': 'other',
    '构图技巧': 'other',
    '室内日常': 'indoor',
    '室内场景': 'indoor',
    '室内人像': 'indoor',
    '餐厅美食': 'cafe',
    '情侣合照': 'other',
    '特殊风格': 'other',
    '自拍技巧': 'other',
    '节日限定': 'christmas',
    '运动健身': 'gym',
    '温泉': 'hotspring',
    '复古胶片': 'vintage_film',
  }
  return map[category] ?? 'other'
}

// 模块层常量：避免 useState initializer 每次渲染重建
const CAT_FILTER_MAP: Record<string, CoreFilter> = {
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

/** 将 analyzer SceneType 映射到 speakFilterTip 的合法类型（避免 as any） */
const SCENE_TO_FILTER_TIP: Partial<Record<SceneType, 'indoor' | 'outdoor' | 'food' | 'night' | 'street' | 'sunset' | 'natural_light'>> = {
  indoor: 'indoor',
  outdoor: 'outdoor',
  cafe: 'food',
  supermarket: 'food',
  bakery: 'food',
  rooftop_night: 'night',
  subway: 'night',
  rooftop_daytime: 'street',
  beach: 'street',
  beach_sunset: 'sunset',
  sunset: 'sunset',
  hotspring: 'natural_light',
}

const FILTER_OPTIONS: Array<{ key: CoreFilter; label: string; color: string }> = [
  { key: 'warm', label: '暖黄', color: COLORS.filterWarm },
  { key: 'cool', label: '冷调', color: COLORS.filterCool },
  { key: 'vivid', label: '生动', color: COLORS.filterVivid },
  { key: 'soft', label: '柔和', color: COLORS.filterSoft },
  { key: 'bw', label: '黑白', color: COLORS.filterBw },
  { key: 'portrait', label: '人像', color: COLORS.filterPortrait },
  { key: 'food', label: '美食', color: COLORS.filterFood },
  { key: 'cinematic', label: '电影', color: COLORS.filterCinematic },
]

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
    (templateCategory ? (CAT_FILTER_MAP[templateCategory] ?? 'warm') : 'warm') as CoreFilter
  )

  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [scoreAnimationDone, setScoreAnimationDone] = useState(false)
  // 滤镜滑动引导 TTS（分数动画完成后播报）
  // 修复：scoreResult 作为依赖，同时在 setTimeout 内用 captured 变量捕获最新值避免闭包过期
  useEffect(() => {
    if (!scoreAnimationDone) return
    const tid = setTimeout(() => {
      try {
        if (scoreResult) {
          VoiceCoach.speakScoreReveal(scoreResult.totalScore)
          // 满分时追加满分专属庆祝 TTS（接在分数播报之后）
          if (scoreResult.totalScore === 100) {
            track(() => { try { VoiceCoach.speakPerfectScore(scoreResult.totalScore) } catch {} }, 2500)
          }
          // 夜景场景（曝光分低+总分低）时追加夜景氛围提示
          if (scoreResult.exposureScore < 20 && scoreResult.totalScore < 75) {
            track(() => { try { VoiceCoach.speakNightAmbianceTip() } catch {} }, 3500)
          }
          // 表情优秀夸奖（expressionScore >= 18 时触发）
          if (scoreResult.expressionScore >= 18 && scoreResult.totalScore >= 75) {
            track(() => { try { VoiceCoach.speakExpressionGreat() } catch {} }, 4000)
          }
          // 完美拍摄夸奖（总分 >= 90）
          if (scoreResult.totalScore >= 90) {
            track(() => { try { VoiceCoach.speakPerfectShotTip() } catch {} }, 3500)
          }
          // 接近满分夸奖（总分 80-89）
          if (scoreResult.totalScore >= 80 && scoreResult.totalScore < 90) {
            track(() => { try { VoiceCoach.speakAlmostGreat(scoreResult.totalScore) } catch {} }, 3500)
          }
        }
      } catch {}
      track(() => { try { VoiceCoach.speakFilterSwipeHint() } catch {} }, 1500)
    }, 500)
    return () => clearTimeout(tid)
  }, [scoreAnimationDone, scoreResult])
  const [newRecordBanner, setNewRecordBanner] = useState(false)
  const viewShotRef = useRef<ViewShotRef | null>(null)
  const { faces } = useFaceDetection()
  const mountedRef = useRef(true)
  const screenshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 跟踪所有 TTS setTimeout，便于组件卸载时统一清理，防止用户在分析完成前离开页面导致 TTS 错乱
  const ttsTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  // 统一 setTimeout 追踪，避免多处 setTimeout 泄露
  const track = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    ttsTimerRefs.current.push(id)
    return id
  }

  const cardSlide = useSharedValue(50)

  // 初始化 VoiceCoach（TTS 引擎，只初始化一次）
  useEffect(() => {
    VoiceCoach.initialize().catch(() => { /* ignore init errors */ })
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
      // 清理所有 TTS 定时器，防止用户离开页面后 TTS 仍乱触发
      ttsTimerRefs.current.forEach(clearTimeout)
      ttsTimerRefs.current = []
    }
  }, [photoPath])

  async function runAnalysis() {
    if (!mountedRef.current) return
    setProcessing(true)
    setError(null)
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

      const sceneType = getSceneType(templateCategory)

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

      // VoiceCoach 实时 TTS 集成 — 低分时给出问题诊断语音提示
      // 注意：高分（>=80）的分数播报已在 useEffect(scoreAnimationDone) 中处理
      if (analysis.totalScore < 80) {
        const suggestCount = analysis.suggestions?.length || 0
        if (analysis.expressionScore < 12 && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakBlinkTip() } catch {} }, 3000)
        }
        if (analysis.expressionScore < 10 && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakStiffExpressionTip() } catch {} }, 3200)
        }
        // 抬头角度过大时触发 chin angle TTS
        if (analysis.expressionScore < 12 && faces[0]?.rollAngle !== undefined && Math.abs(faces[0].rollAngle) > 20) {
          track(() => { try { VoiceCoach.speakChinAngleTip() } catch {} }, 3400)
        }
        if (analysis.problems?.includes('backlight') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakBacklightTip() } catch {} }, 3400)
        }
        if (analysis.exposureScore < 30) {
          track(() => { try { VoiceCoach.speakLowLightWarning() } catch {} }, 3400)
        }
        if (analysis.problems?.includes('washed_out') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakWashedOutTip() } catch {} }, 3600)
        }
        if (analysis.problems?.includes('over_saturated') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakOverSaturatedTip() } catch {} }, 3600)
        }
        if (analysis.problems?.includes('skin_tone_cast') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakSkinToneTip() } catch {} }, 3800)
        }
        if (analysis.problems?.includes('careful_framing') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakFramingTip() } catch {} }, 3800)
        }
        if (analysis.problems?.includes('too_crowded') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakTooFullTip() } catch {} }, 4000)
        }
        if (analysis.problems?.includes('hair_occlusion_tips') && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakHairOcclusionTip() } catch {} }, 4200)
        }
        // 模糊：safeSharpness < 80（已在 SUGGESTION_POOL.blurry 中触发）
        if (analysis.stabilityScore < 14 && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakBlurryTip() } catch {} }, 4200)
        }

        // v6 新增：情侣/闺蜜合照专属提示（faceCount >= 2）
        if (faces.length >= 2) {
          track(() => { try { VoiceCoach.speakCouplePhotoTip() } catch {} }, 4500)
        }

        // v6 新增：构图偏了专属提示（compositionScore 低，且非 careful_framing 问题）
        if (analysis.compositionScore < 28 && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakCompositionOffTip() } catch {} }, 4500)
        }

        // v6 新增：眼神引导提示（expressionScore 低时，在眨眼/僵硬之后）
        if (analysis.expressionScore < 12 && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakEyeContactTip() } catch {} }, 4600)
        }

        // v6 新增：表情夸张引导（expressionScore 极低时）
        if (analysis.expressionScore < 8 && suggestCount > 0) {
          track(() => { try { VoiceCoach.speakExpressionExaggerateTip() } catch {} }, 4800)
        }
      }

      // v6 新增：滤镜推荐 TTS（根据场景类型，在分数揭示后播报）
      // sceneType 在上方已声明（line ~236），此处直接复用
      const filterTipType = SCENE_TO_FILTER_TIP[sceneType]
      if (filterTipType) {
        track(() => { try { VoiceCoach.speakFilterTip(filterTipType) } catch {} }, 5500)
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

      // 日记写入确认 + 连续好评播报
      try { VoiceCoach.speakDiaryWritten(analysis.totalScore) } catch {}
      if (streakCount >= 3) {
        track(() => { try { VoiceCoach.speakStreak(streakCount) } catch {} }, 1200)
      }

      // 启动入场动画
      cardSlide.value = withTiming(0, { duration: 400 })

      // 稳定分低时的 TTS 提示（照片歪斜或手抖）
      if (analysis.stabilityScore < 16) {
        track(() => { try { VoiceCoach.speakStabilityIssue(tiltAngle) } catch {} }, 4000)
      }

      // 新纪录 + TTS 播报（撒花移除，用分数揭示动画替代庆祝反馈）
      if (isNewRecord) {
        setNewRecordBanner(true)
        track(async () => {
          try {
            await VoiceCoach.speakNewRecord(0, analysis.totalScore)
          } catch { /* ignore TTS errors */ }
        }, 500)
      }

      // 首次拍照专属 TTS 鼓励（与分数无关，独立触发）
      if (diary.length === 0) {
        track(() => { try { VoiceCoach.speakFirstPhotoTip() } catch { /* ignore */ } }, 1500)
      }

      // 稳定完美时的 TTS 表扬（与低分时的 speakStabilityIssue 互补）
      if (analysis.stabilityScore === 20 && analysis.totalScore < 80) {
        track(() => { try { VoiceCoach.speakStabilityPerfect() } catch {} }, 4000)
      }

      // 构图优秀时的 TTS 表扬
      if (analysis.compositionScore >= 18 && analysis.totalScore < 80) {
        track(() => { try { VoiceCoach.speakCompositionGreat() } catch {} }, 4200)
      }

      // 维度进步检测 TTS（对比上一张照片的各维度分）
      if (lastRecord && analysis.totalScore < 80) {
        if (analysis.compositionScore > (lastRecord.compositionScore || 0) + 3) {
          track(() => { try { VoiceCoach.speakImprovementDetected('composition') } catch {} }, 4500)
        } else if (analysis.exposureScore > (lastRecord.exposureScore || 0) + 3) {
          track(() => { try { VoiceCoach.speakImprovementDetected('exposure') } catch {} }, 4500)
        } else if (analysis.stabilityScore > (lastRecord.stabilityScore || 0) + 3) {
          track(() => { try { VoiceCoach.speakImprovementDetected('stability') } catch {} }, 4500)
        } else if (analysis.expressionScore > (lastRecord.expressionScore || 0) + 3) {
          track(() => { try { VoiceCoach.speakImprovementDetected('expression') } catch {} }, 4500)
        } else if (analysis.levelScore > (lastRecord.levelScore || 0) + 3) {
          track(() => { try { VoiceCoach.speakImprovementDetected('level') } catch {} }, 4500)
        }
      }

      // TTS 朗读夸奖文案（分数 ≥ 90 时，截取前 50 字朗读）
      const praiseToSpeak = analysis.praise?.[0]?.slice(0, 50) || ''
      if (praiseToSpeak) {
        track(async () => {
          try {
            await VoiceCoach.speak(praiseToSpeak, false)
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
      track(async () => {
        try {
          await VoiceCoach.speakProcessingDone()
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
        try { await VoiceCoach.speakSavedToAlbum() } catch { /* ignore TTS errors */ }
        Alert.alert('保存成功', '照片已保存到相册，快去发朋友圈吧～')
      } else {
        try { await VoiceCoach.speakSaveFailed() } catch { /* ignore TTS errors */ }
        Alert.alert('保存失败', '请检查相册权限')
      }
    } catch { /* ignore */ }
    finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    VoiceCoach.speakShareTip()
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
      }
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
    VoiceCoach.speakRetryTip(scoreResult?.totalScore ?? 0)
    navigation.navigate({ name: 'Camera' as const, params: { templateId: undefined } })
  }

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardSlide.value }],
    opacity: interpolate(cardSlide.value, [0, 50], [1, 0]),
  }))

  if (!photoPath) {
    return (
      <View style={styles.errorContainer}>
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

  // 夸奖横幅文字颜色（按分数段）— 用于个性化 praise 文本的视觉色彩
  // 合并PraiseBanner颜色与文本为单一计算，避免重复条件判断
  const getPraiseInfo = (): { text: string; color: string } => {
    if (scoreResult && praiseList.length > 0) {
      const color = scoreResult.totalScore >= 90 ? COLORS.scoreGreat
        : scoreResult.totalScore >= 80 ? COLORS.primary
        : scoreResult.totalScore >= 70 ? COLORS.success
        : scoreResult.totalScore >= 60 ? COLORS.warning
        : COLORS.danger
      return { text: praiseList[0], color }
    }
    if (!scoreResult) return { text: '', color: COLORS.warning }
    if (scoreResult.totalScore >= 90) return { text: `${scoreResult.totalScore}分，完美之作！`, color: COLORS.scoreGreat }
    if (scoreResult.totalScore >= 80) return { text: `${scoreResult.totalScore}分，男朋友进步好大！`, color: COLORS.primary }
    if (scoreResult.totalScore >= 70) return { text: `${scoreResult.totalScore}分，继续保持！`, color: COLORS.success }
    if (scoreResult.totalScore >= 60) return { text: `${scoreResult.totalScore}分，下次会更好！`, color: COLORS.warning }
    return { text: `${scoreResult.totalScore}分，继续加油！`, color: COLORS.danger }
  }
  const praiseInfo = getPraiseInfo()

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

        {/* 处理中 — 极简加载指示器 */}
        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.processingSpinner} />
            <Text style={styles.processingLabel}>正在分析...</Text>
          </View>
        )}

        {/* 夸奖横幅 — 无背景卡片：文字直接承载信息，极简留白 */}
        {!processing && (
          <View style={styles.praiseBanner}>
            <Text style={[styles.praiseBannerScore, { color: praiseInfo.color }]}>
              {praiseInfo.text}
            </Text>
          </View>
        )}

        {/* 滤镜选择器 */}
        {!processing && (
          <View style={styles.filterPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPickerList}>
              {FILTER_OPTIONS.map((f) => (
                <FilterItem
                  key={f.key}
                  filter={f}
                  isActive={selectedFilter === f.key}
                  onPress={() => {
                    setSelectedFilter(f.key)
                    VoiceCoach.speakFilterApplied(f.key)
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
          <View style={styles.newRecordBanner}>
            <Text style={styles.newRecordBannerText}>破纪录了！历史最高分！</Text>
          </View>
        )}

        {/* 评分板 */}
        {!processing && scoreResult && (
          <ScoreBoard result={scoreResult} />
        )}

        {/* 无图片时的友好提示 */}
        {!processing && !photoPath && !scoreResult && (
          <View style={styles.noPhotoContainer}>
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
              accessibilityRole="button"
              accessibilityLabel="重拍"
              accessibilityHint="返回相机重新拍摄"
            >
              <Text style={styles.actionBtnSecondaryText}>重拍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnShare}
              onPress={handleShare}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel="分享"
              accessibilityHint="将照片分享给好友"
            >
              <Text style={styles.actionBtnShareText}>分享</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnPrimary, saving && styles.actionBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={saving ? '保存中' : '保存到相册'}
              accessibilityHint="将照片保存到手机相册"
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
            accessibilityRole="button"
            accessibilityLabel="查看进步日记"
            accessibilityHint="查看历史拍照记录和进步轨迹"
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
const FilterItem = React.memo(function FilterItem({
  filter,
  isActive,
  onPress,
}: {
  filter: { key: string; label: string; color: string }
  isActive: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.filterItem}
      accessibilityRole="button"
      accessibilityLabel={`滤镜: ${filter.label}${isActive ? '，已选中' : ''}`}
      accessibilityHint="单击切换滤镜"
    >
      <View style={[styles.filterCircle, { backgroundColor: filter.color }, isActive ? styles.filterCircleActive : null]} />
      <Text style={[
        styles.filterLabel,
        isActive ? styles.filterLabelActive : null,
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  // 破纪录横幅：克制的 success 色文字 + 淡背景 pill，庆祝但不俗气
  // 简洁优雅：去掉 successLight 背景——纯色文字已有足够视觉冲击
  newRecordBanner: {
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 4,
  },
  newRecordBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
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
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
  },
  filterPickerList: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  filterItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    width: 58,
  },
  filterCircle: {
    width: 46,
    height: 46,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 选中态：3px 白色实线环（兼容所有滤镜颜色，包括深色滤镜）
  // 删 primary 色边框：深色滤镜上不可见，视觉欺骗
  // 用白色环：任何滤镜底色上都有清晰对比，简洁克制
  filterCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  filterLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 5,
  },
  filterLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  processingLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  processingSpinner: {
    marginBottom: 12,
  },
  praiseBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 4,
    // 简洁优雅：无背景色——文字直接承载信息，极简留白
  },
  praiseBannerScore: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 24,
    // 简洁优雅：去掉 bgCard 包裹，文字直接呈现更轻盈
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
  // 简洁优雅：borderRadius 20（统一按钮层级，与 HomeScreen/其他屏幕一致）
  // 次级按钮改为透明底 + 浅灰边框（去 alpha 装饰，保留功能层级）
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  // 简洁优雅：borderRadius 20（与 actionBtnSecondary/actionBtnPrimary 统一）
  // 分享按钮改为透明底 + primary 边框，视觉更轻盈克制
  actionBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionBtnShareText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // 简洁优雅：borderRadius 20（与次级按钮统一，primary 按钮视觉已足够突出）
  actionBtnPrimary: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
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
  diaryEntryBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
  },
  diaryEntryBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
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
  // 简洁优雅：去掉左竖线装饰，仅用文字和浅色背景传达信息层级
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
  },
  errorBannerBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  // 重试按钮：语义上非危险操作，用 primary 替代 danger
  errorRetryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  errorRetryBtnText: {
    fontSize: 13,
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  errorSecondaryBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorSecondaryBtnText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  noPhotoContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  noPhotoTitle: { fontSize: 20, fontWeight: 'bold' },
  noPhotoDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  noPhotoBtn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 },
  noPhotoBtnText: { color: COLORS.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
})
