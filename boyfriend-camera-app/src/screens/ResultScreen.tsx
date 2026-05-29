/** ResultScreen - 拍照结果页 */
import React, { useEffect, useState, useRef, useMemo } from 'react'

// VoiceCoach scene-specific TTS 方法类型（消除 as any  unsafe cast）
// 所有 SCENE_TTS_MAP 中的 method 均为无参数 async 方法
type SceneTtsMethod =
  | 'speakAmusementTip' | 'speakAquariumTip' | 'speakBacklitTip' | 'speakBakeryTip'
  | 'speakBeachSunsetTip' | 'speakBeachTip' | 'speakBestiePoseTip' | 'speakBookstoreTip'
  | 'speakCarnivalTip' | 'speakChapelTip' | 'speakChristmasTip' | 'speakCouplePhotoTip'
  | 'speakDancePerformanceTip' | 'speakFestivalLightsTip' | 'speakGraffitiTip' | 'speakGymTip'
  | 'speakHotspringTip' | 'speakIndoorPortraitTip' | 'speakLakeWaterTip' | 'speakLighthouseTip'
  | 'speakMirrorSelfieTip' | 'speakMorningTip' | 'speakNeonLightTip' | 'speakOldTownTip'
  | 'speakRainyTip' | 'speakRockyBeachTip' | 'speakSelfieTip' | 'speakSnowTip'
  | 'speakSpringFlowersTip' | 'speakSupermarketTip' | 'speakSwimmingPoolTip' | 'speakTentCampTip'
  | 'speakUrbanNightTip' | 'speakVintageFilmTip'
  | 'speakGoldenHourTip'
  | 'speakGraduationTip' | 'speakZooTip'
  | 'speakFarmTip' | 'speakAirportTip'
  | 'speakGoldenHourTip'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import { processPhoto, saveToAlbum, type FilterKey } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary, getDiary, getPeakScore, updatePeakScore, type AnalysisResult, type SceneType } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { COLORS, borderRadius } from '../theme'
import VoiceCoach from '../components/camera/VoiceCoach'
import { logger } from '../utils/logger'

/** 映射模板分类 → analyzer SceneType（精确分类让夜间/节庆等场景获得专属建议） */
function getSceneType(category: string | null | undefined): SceneType {
  if (!category) return 'other'
  const map: Record<string, SceneType> = {
    '夜景': 'rooftop_night',
    '户外风景': 'outdoor',
    '城市街拍': 'outdoor',
    '人文风景': 'outdoor',
    '构图技巧': 'other',
    '室内日常': 'indoor',
    '室内场景': 'indoor',
    '室内人像': 'indoor',
    '餐厅美食': 'cafe',
    '情侣合照': 'other',  // 情侣场景由 photoCount/isCouplePhoto 驱动
    '特殊风格': 'special_style',
    '自拍技巧': 'other',  // 自拍由 faceCount === 1 场景判断
    '节日限定': 'christmas',
    '运动健身': 'gym',
    '复古胶片': 'vintage_film',
    '户外海边': 'beach',
    '滑雪': 'ski_resort',
    '温泉': 'hotspring',
    '户外海边日落': 'beach_sunset',
    '雨天街头': 'rainy_street',
    '演唱会现场': 'dance_performance',
    '酒吧霓虹灯': 'neon_light',
    '阳台早餐': 'other',
    '艺术展馆': 'indoor',
    '电音节蹦迪': 'neon_light',
    '居家睡衣': 'indoor',
    '露营帐篷': 'tent_camp',
    '湖边水景': 'outdoor',
    '画廊博物馆': 'indoor',
    '商场橱窗': 'other',
    '桥上夜景': 'rooftop_night',
    '摩天轮': 'carnival',
    '星空夜景': 'rooftop_night',
    '公园长椅': 'outdoor',
    '车内自拍': 'other',
    '雪景拍照': 'snow',
    '闺蜜合照': 'carnival',
    '火锅美食': 'cafe',
    '超市便利店': 'supermarket',
    '泳池边': 'swimming_pool',
    '天台阳台': 'rooftop_daytime',
    '街头随拍': 'outdoor',
    '校园操场': 'outdoor',
    '植物园温室': 'greenhouse',
    '书店阅读': 'bookstore',
    '涂鸦墙': 'graffiti',
    '游乐园': 'carnival',
    '毕业照': 'graduation',
    '动物园': 'zoo',
    '面包房': 'bakery',
    '水族馆': 'aquarium',
    '火车站台': 'train',
    '天台派对': 'rooftop_party',
    '古镇': 'old_town',
    '灯塔': 'lighthouse',
    '农场牧场': 'farm',
    '蓝调时刻': 'outdoor',
    '赏樱': 'cherry_blossom',
    '红叶季': 'red_autumn_detail',
    '地铁站': 'subway',
    '电梯扶梯': 'subway_escalator',
    '机场车站': 'airport',
    '镜面自拍': 'mirror',
    '大合照': 'carnival',
  }
  return map[category] ?? 'other'
}

// 模块层常量：避免 useState initializer 每次渲染重建
const CAT_FILTER_MAP: Record<string, FilterKey> = {
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
  '户外海边': 'warm',
  '滑雪': 'cool',
}

/** 将 analyzer SceneType 映射到 speakFilterTip 的合法类型（避免 as any） */
// 场景 → TTS 方法映射表（简洁优雅：数据驱动替代 30+ if 语句，新增场景只需加一行）
// 格式：templateCategory → { method: speakMethodName, minScore, extraMethod? }
const SCENE_TTS_MAP: Record<string, { method: SceneTtsMethod; minScore?: number; extraMethod?: SceneTtsMethod; extraMinScore?: number; exposureMin?: number }> = {
  '户外海边日落': { method: 'speakBeachSunsetTip', minScore: 60, extraMethod: 'speakGoldenHourTip', extraMinScore: 60 },
  '户外海边': { method: 'speakBeachTip', minScore: 65 },
  '泳池边': { method: 'speakSwimmingPoolTip', minScore: 60 },
  '赏樱': { method: 'speakSpringFlowersTip', minScore: 65 },
  '灯塔': { method: 'speakLighthouseTip', minScore: 65 },
  '运动健身': { method: 'speakGymTip', minScore: 60 },
  '雨天街头': { method: 'speakRainyTip', minScore: 60 },
  '镜面自拍': { method: 'speakMirrorSelfieTip', minScore: 60 },
  '街头随拍': { method: 'speakBacklitTip', minScore: 75, exposureMin: 22 },
  '城市街拍': { method: 'speakBacklitTip', minScore: 75, exposureMin: 22 },
  '情侣合照': { method: 'speakCouplePhotoTip', minScore: 65 },
  '节日限定': { method: 'speakFestivalLightsTip', minScore: 60 },
  '室内人像': { method: 'speakIndoorPortraitTip', minScore: 65 },
  '自拍技巧': { method: 'speakSelfieTip', minScore: 60 },
  '夜景': { method: 'speakUrbanNightTip', minScore: 60 },
  '星空夜景': { method: 'speakUrbanNightTip', minScore: 60 },
  '桥上夜景': { method: 'speakUrbanNightTip', minScore: 60 },
  '酒吧霓虹灯': { method: 'speakNeonLightTip', minScore: 60 },
  '演唱会现场': { method: 'speakDancePerformanceTip', minScore: 60 },
  '闺蜜合照': { method: 'speakBestiePoseTip', minScore: 60 },
  '大合照': { method: 'speakBestiePoseTip', minScore: 60 },
  '书店阅读': { method: 'speakBookstoreTip', minScore: 65 },
  '涂鸦墙': { method: 'speakGraffitiTip', minScore: 65 },
  '复古胶片': { method: 'speakVintageFilmTip', minScore: 60 },
  '古镇': { method: 'speakOldTownTip', minScore: 60 },
  '餐厅美食': { method: 'speakIndoorPortraitTip', minScore: 60 },
  '阳台早餐': { method: 'speakMorningTip', minScore: 65 },
  '雪景拍照': { method: 'speakSnowTip', minScore: 60 },
  '滑雪': { method: 'speakSnowTip', minScore: 60 },
  '水族馆': { method: 'speakAquariumTip', minScore: 60 },
  '游乐园': { method: 'speakAmusementTip', minScore: 60 },
  '摩天轮': { method: 'speakAmusementTip', minScore: 60 },
  '旋转木马': { method: 'speakAmusementTip', minScore: 60 },
  '天台派对': { method: 'speakUrbanNightTip', minScore: 60 },
  '面包房': { method: 'speakBakeryTip', minScore: 65 },
  '画廊博物馆': { method: 'speakChapelTip', minScore: 60 },
  '艺术展馆': { method: 'speakChapelTip', minScore: 60 },
  '露营帐篷': { method: 'speakTentCampTip', minScore: 60 },
  '湖边水景': { method: 'speakLakeWaterTip', minScore: 60 },
  '圣诞氛围': { method: 'speakChristmasTip', minScore: 60 },
  '温泉泡汤': { method: 'speakHotspringTip', minScore: 60 },
  '超市便利店': { method: 'speakSupermarketTip', minScore: 60 },
  '礁石海浪': { method: 'speakRockyBeachTip', minScore: 60 },
  '游乐园嘉年华': { method: 'speakCarnivalTip', minScore: 60 },
  '毕业照': { method: 'speakGraduationTip', minScore: 60 },
  '动物园': { method: 'speakZooTip', minScore: 60 },
  '农场牧场': { method: 'speakFarmTip', minScore: 60 },
  '机场车站': { method: 'speakAirportTip', minScore: 60 },
}

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

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string; color: string }> = [
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
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>(
    (templateCategory ? (CAT_FILTER_MAP[templateCategory] ?? 'warm') : 'warm') as FilterKey
  )

  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  // 滤镜滑动引导 TTS（分数动画完成后播报）
  // scoreAnimationDone 移至 useEffect 内部 ref 追踪，无需独立状态
  // TTS 评分播报：用 scoreResultRef 追踪当前已播报的分数，避免重复触发
  const scoreResultRef = useRef<ScoreResult | null>(null)
  // scoreAnimationRef: 动画完成后标记为 true，驱动 TTS 播报
  const scoreAnimationRef = useRef(false)
  useEffect(() => {
    // 仅在有分数且动画完成时触发 TTS
    if (!scoreResult || !scoreAnimationRef.current) return
    // 防止同一分数重复播报（ResultScreen 重渲染时）
    if (scoreResultRef.current === scoreResult) return
    scoreResultRef.current = scoreResult
    const tid = setTimeout(() => {
      try {
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
        // 低分温柔鼓励（总分 < 50）
        if (scoreResult.totalScore < 50) {
          track(() => { try { VoiceCoach.speakLowScore(scoreResult.totalScore) } catch {} }, 4000)
        }
      } catch {}
      track(() => { try { VoiceCoach.speakFilterSwipeHint() } catch {} }, 1500)
    }, 500)
    return () => clearTimeout(tid)
  }, [scoreResult, templateCategory])

  // 场景专属 TTS（在结果页展示后播报，不干扰分数播报）
  useEffect(() => {
    if (!templateCategory || !scoreResult) return
    const tid = setTimeout(() => {
      try {
        // 简洁优雅：数据驱动播报 — SCENE_TTS_MAP 中一个 lookup 替代 30+ if 语句
        const sceneConfig = SCENE_TTS_MAP[templateCategory]
        if (sceneConfig) {
          const { method, minScore, extraMethod, extraMinScore, exposureMin } = sceneConfig
          const mainOk = !minScore || scoreResult.totalScore >= minScore
          const exposureOk = !exposureMin || scoreResult.exposureScore >= exposureMin
          if (mainOk && exposureOk) {
            const speak = (m: SceneTtsMethod, delay: number) => track(() => { try { (VoiceCoach as Record<SceneTtsMethod, () => void>)[m]() } catch {} }, delay)
            speak(method, 2500)
            if (extraMethod && (!extraMinScore || scoreResult.totalScore >= extraMinScore)) {
              speak(extraMethod, 3500)
            }
          }
        }
      } catch {}
    }, 800)
    return () => clearTimeout(tid)
  }, [templateCategory, scoreResult])
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

      // 基于人脸检测结果计算真实参数
      // tiltAngle: 使用人脸 rollAngle（头部倾斜）作为照片倾斜角，MLKit 检测失败时回退到 0
      const tiltAngle = (faceData.rollAngle !== undefined) ? faceData.rollAngle : 0
      // sharpness: 人脸检测置信度转 sharpness（confidence 0.8-0.95 → sharpness 130-200），检测本身就说明图像足够清晰
      const confidence = faceData.confidence ?? 0.85
      const sharpness = Math.round(100 + confidence * 100)
      // brightness: 使用 faceData 的 area 作为亮度推断（脸大=近=可能更亮），兼顾 faceCount（人多=场景亮）
      // area 0.02-0.3 → brightness 100-160；faceCount >= 2 时额外加 20
      const baseBrightness = Math.round(100 + (faceData.area ?? 0.1) * 300)
      const brightness = Math.min(230, Math.max(80, baseBrightness + (faces.length >= 2 ? 20 : 0)))

      const sceneType = getSceneType(templateCategory)

      let analysis: AnalysisResult | null = null
      try {
        analysis = await analyzePhoto(
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
            totalShoots: diary.length + 1,
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
      } catch (e: unknown) {
        if (__DEV__) logger.debug('ResultScreen', 'analyzePhoto failed:', e)
        // 分析失败时显示默认结果，不阻塞用户流程
        analysis = {
          totalScore: 50,
          compositionScore: 12,
          exposureScore: 12,
          stabilityScore: 12,
          levelScore: 7,
          expressionScore: 7,
          suggestions: ['这张照片看起来有点难分析，试试换个光线或角度～'],
          praise: ['男朋友有在认真拍！'],
          problems: [],
        }
      }

      if (!mountedRef.current || !analysis) return
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

      // 日记写入（分析结果必定存在，fallback 保证）
      try {
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
          templateCategory: templateCategory ?? undefined,
        })
      } catch (e: unknown) {
        if (__DEV__) logger.debug('ResultScreen', 'saveToDiary failed:', e)
      }
      // 提前获取当前 peakScore（用于临近高分检测）
      let currentPeak = 0
      try { currentPeak = await getPeakScore() } catch {}

      let isNewRecord = false
      try {
        isNewRecord = await updatePeakScore(analysis.totalScore)
      } catch (e: unknown) {
        if (__DEV__) logger.debug('ResultScreen', 'updatePeakScore failed:', e)
      }

      // 临近历史高分 TTS（未破纪录但分数接近峰值，激励用户继续）
      if (!isNewRecord && currentPeak > 0 && analysis.totalScore >= currentPeak - 5 && analysis.totalScore < currentPeak) {
        track(() => { try { VoiceCoach.speakNearHighScore() } catch {} }, 2000)
      }

      // 日记里程碑 TTS（第 5 张照片触发首次里程碑）
      const totalPhotos = diary.length + 1
      if (totalPhotos === 5) {
        track(() => { try { VoiceCoach.speakDiaryMilestone('first') } catch {} }, 1800)
      }

      // 日记写入确认 + 连续好评播报
      try { VoiceCoach.speakDiaryWritten(analysis.totalScore) } catch {}
      // 场景完成鼓励（新 TTS 方法）
      track(() => { try { VoiceCoach.speakSceneComplete() } catch {} }, 600)
      if (streakCount >= 3) {
        track(() => { try { VoiceCoach.speakStreak(streakCount) } catch {} }, 1200)
      }

      // 启动入场动画 + 标记动画完成（TTS 播报触发）
      cardSlide.value = withTiming(0, { duration: 400 })
      scoreAnimationRef.current = true

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

      // 背景/体态/侧颜/角度专项提示（根据建议内容关键字触发）
      if (analysis.suggestions) {
        const suggText = analysis.suggestions.join('')
        if (suggText.includes('背景') && analysis.suggestions.length > 0) {
          track(() => { try { VoiceCoach.speakBackgroundTip() } catch {} }, 5000)
        }
        if (suggText.includes('站姿') || suggText.includes('坐姿') || suggText.includes('收腹') || suggText.includes('双肩') || suggText.includes('天鹅颈')) {
          track(() => { try { VoiceCoach.speakPostureTip() } catch {} }, 5200)
        }
        if (suggText.includes('侧脸') || suggText.includes('侧颜') || suggText.includes('侧身')) {
          track(() => { try { VoiceCoach.speakSideProfileTip() } catch {} }, 5200)
        }
        if (suggText.includes('角度') || suggText.includes('仰拍') || suggText.includes('俯拍') || suggText.includes('蹲低')) {
          track(() => { try { VoiceCoach.speakAngleTip() } catch {} }, 5400)
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
      // TTS 语音提示分析失败，鼓励重试
      VoiceCoach.speakAnalysisError().catch(() => {})
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

  function handleRetry() {
    // 直接跳转相机重拍，体验更流畅
    navigation.navigate({ name: 'Camera' as const, params: {} })
  }

  function handleHome() {
    navigation.navigate({ name: 'Home' as const, params: undefined })
  }

  function handleGoCamera() {
    // 没有找到图片时：鼓励重试，而非播放「下次再试」Tips
    try { VoiceCoach.speakRetryEncourage() } catch {}
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

  // 夸奖横幅文字颜色（按分数段）— 避免每次渲染重新计算
  const praiseInfo = useMemo(() => {
    const score = scoreResult?.totalScore ?? 0
    const color = score >= 90 ? COLORS.scoreGreat
      : score >= 80 ? COLORS.primary
      : score >= 70 ? COLORS.success
      : score >= 60 ? COLORS.warning
      : COLORS.danger
    if (scoreResult && praiseList.length > 0) {
      return { score, text: praiseList[0], color }
    }
    if (!scoreResult) return { score: 0, text: '', color: COLORS.warning }
    if (score >= 90) return { score, text: '完美之作！', color }
    if (score >= 80) return { score, text: '男朋友进步好大！', color }
    if (score >= 70) return { score, text: '继续保持！', color }
    if (score >= 60) return { score, text: '下次会更好！', color }
    return { score, text: '继续加油！', color }
  }, [scoreResult, praiseList])

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 错误提示 — 简洁两按钮：重试 + 返回 */}
        {error && !processing && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <View style={styles.errorBannerBtns}>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={runAnalysis}
                activeOpacity={0.72}
              >
                <Text style={styles.errorRetryBtnText}>重试分析</Text>
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
          <Text style={styles.title}>拍照分析</Text>
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

        {/* 夸奖横幅 — 简洁优雅：分数数字与描述合并为一行，数字用强调色，描述用次级色，层级靠字重区分 */}
        {!processing && (
          <View style={styles.praiseBanner}>
            <Text style={styles.praiseBannerScore}>
              <Text style={{ color: praiseInfo.color, fontWeight: '800' }}>{praiseInfo.score}</Text>
              <Text style={{ color: COLORS.textSecondary, fontWeight: '400' }}> 分 {praiseInfo.text}</Text>
            </Text>
          </View>
        )}

        {/* 分数维度分解 — 简洁优雅：4条细横条承载构图/光线/表情/稳定四维分数
            设计理由：总分只是一个数字，四维分解让用户知道进步方向
            无边框/无背景色/无阴影 — 条本身用文字颜色深浅区分活跃度
        */}
        {!processing && scoreResult && (
          <View style={styles.scoreBreakdown}>
            {[
              { label: '构图', score: scoreResult.compositionScore, max: 40 },
              { label: '光线', score: scoreResult.exposureScore, max: 30 },
              { label: '表情', score: scoreResult.expressionScore, max: 20 },
              { label: '稳定', score: scoreResult.stabilityScore, max: 20 },
            ].map(({ label, score, max }) => (
              <View key={label} style={styles.scoreBreakdownRow}>
                <Text style={styles.scoreBreakdownLabel}>{label}</Text>
                <View style={styles.scoreBreakdownTrack}>
                  <View
                    style={[
                      styles.scoreBreakdownFill,
                      { width: `${Math.round((score / max) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.scoreBreakdownNum}>{score}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 滤镜选择器 */}
        {!processing && (
          <View style={styles.filterPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPickerList} showsVerticalScrollIndicator={false}>
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

        {/* 操作按钮 — 简洁两按钮：重拍 + 保存到相册 */}
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

        {/* 查看进步日记入口 — 简洁文字链，克制不抢主操作注意力 */}
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
      <Text style={[styles.filterLabel, isActive ? styles.filterLabelActive : null]}>{filter.label}</Text>
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
  // 破纪录提示：纯文字，简洁优雅极致 — 成功色文字本身承载信息，无需背景色块装饰
  newRecordBanner: {
    // 简洁优雅极致：去除不必要的 paddingVertical 和 alignSelf
    // 仅靠文字颜色承载信息层级，无需背景色装饰
    marginHorizontal: 20,
    marginTop: 6,
  },
  newRecordBannerText: {
    fontSize: 15,
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
    color: COLORS.textPrimary,
  },
  homeTextLink: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterPicker: {
    marginHorizontal: 20,
    marginTop: 4,
  },
  filterPickerList: {
    flexDirection: 'row',
    paddingRight: 16,
    paddingVertical: 6,
  },
  filterItem: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  filterLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 5,
    fontWeight: '500',
  },
  filterLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  // 滤镜色块：40px 直径，简洁克制，克制不用阴影
  // 设计理由：40px 相比 36px 提供更大的触摸目标（≥ 44px 包括 label），同时保持视觉克制
  // 无阴影/渐变 — 颜色本身承载视觉层级，无需额外装饰
  filterCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 选中态：2px 白色圆环
  // 设计理由：白色圆环在暖/冷/明/暗各色圆上都形成清晰对比，是最通用的选中指示器
  // 不选主色是因为暖色调滤镜（暖黄/美食）上主色不够突出；白色形成自然"发光"效果
  filterCircleActive: {
    borderWidth: 2,
    borderColor: COLORS.textOnPrimary,
  },
  processingLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  processingSpinner: {
    marginBottom: 12,
  },
  // praiseBanner 与 ScoreBoard 留呼吸空间
  // praiseBanner 分数文字合并为单行内联样式，靠 Text 组件内嵌控制颜色层级
  praiseBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 6,
  },
  praiseBannerScore: {
    fontSize: 17,
    lineHeight: 24,
  },
  // 分数维度分解 — 简洁优雅极致：4条极细横条，文字色彩承载信息
  scoreBreakdown: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  scoreBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  scoreBreakdownLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    width: 28,
  },
  scoreBreakdownTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBreakdownFill: {
    height: '100%',
    backgroundColor: COLORS.textSecondary,
    borderRadius: 2,
  },
  scoreBreakdownNum: {
    fontSize: 11,
    color: COLORS.textSecondary,
    width: 20,
    textAlign: 'right',
  },
  viewShot: {
    alignItems: 'center',
  },
  // 操作按钮行
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  // 简洁优雅：去掉 borderWidth — secondary 按钮靠文字颜色承载层级，无需装饰性边框
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius['2xl'],
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  // 简洁优雅：borderRadius 20（与 actionBtnSecondary/actionBtnPrimary 统一）
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius['2xl'],
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
  // diaryEntryBtn 左对齐
  diaryEntryBtn: {
    marginHorizontal: 20,
    paddingVertical: 12,
    // 无障碍：文字链接至少 44px 高
    minHeight: 44,
    // 上方留白分隔，避免 border-top 装饰线
    marginTop: 12,
  },
  diaryEntryBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // 去装饰化：errorContainer 移除 bgCard 背景，错误状态不需要额外视觉层级
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
  },
  errorBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  // 去装饰化：去掉 bgCard 背景和 borderRadius，danger 色文字已足够传达错误层级
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  // 重试按钮：语义上非危险操作，用 primary 替代 danger
  // 无障碍：paddingVertical ≥ 22 确保触摸目标 ≥ 44px
  errorRetryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 20,
    paddingVertical: 11,
    minHeight: 44,
  },
  errorRetryBtnText: {
    fontSize: 13,
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  // 无障碍：确保触摸目标 ≥ 44px
  errorSecondaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 11,
    minHeight: 44,
    paddingHorizontal: 20,
  },
  errorSecondaryBtnText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  noPhotoContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  noPhotoTitle: { fontSize: 20, fontWeight: 'bold' },
  noPhotoDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  noPhotoBtn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: borderRadius['2xl'], paddingHorizontal: 28, paddingVertical: 11, minHeight: 44 },
  noPhotoBtnText: { color: COLORS.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
})
