/**
 * CameraScreen - 拍照页 v3
 * 改进：顶部悬浮姿势引导卡、拍照闪白动画、模板选择弹窗优化
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
  TextInput,
  Animated,
  Vibration,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import CompositionLines from '../components/camera/CompositionLines'
import PoseTemplateOverlay, { type PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import StabilityIndicator from '../components/camera/StabilityIndicator'
import VoiceCoach from '../components/camera/VoiceCoach'
import { useTemplates } from '../hooks/useTemplates'
import { useStability } from '../hooks/useStability'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { useSceneRecommendation } from '../hooks/useSceneRecommendation'
import { useBatteryMonitor } from '../hooks/useBatteryMonitor'
import CameraView, { CameraViewRef } from '../components/camera/CameraView'
import { COLORS, CATEGORY_COLORS } from '../theme/colors'
import { hexAlpha } from '../theme'

type CompositionMode = 'grid' | 'golden' | 'triangle'

const { width: SCREEN_W } = Dimensions.get('window')
const FLASH_MODES: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto']
const FLASH_ICONS: Record<string, string> = { off: '📷', on: '⚡', auto: '🔄' }

const RECENT_KEY = 'recent_templates'
const FAVORITE_KEY = 'favorite_templates'

async function saveRecentTemplate(templateId: string) {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY)
    const ids: string[] = raw ? JSON.parse(raw) : []
    const filtered = ids.filter((id) => id !== templateId)
    const updated = [templateId, ...filtered].slice(0, 5)
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch (_e) { /* 忽略权限拒绝 */ }
}

async function getRecentTemplateIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_e) { return [] }
}

async function getFavoriteTemplateIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_e) { return [] }
}

async function toggleFavoriteTemplate(templateId: string): Promise<boolean> {
  const ids = await getFavoriteTemplateIds()
  const isFav = ids.includes(templateId)
  if (isFav) {
    await AsyncStorage.setItem(FAVORITE_KEY, JSON.stringify(ids.filter(id => id !== templateId)))
    return false
  } else {
    await AsyncStorage.setItem(FAVORITE_KEY, JSON.stringify([templateId, ...ids]))
    return true
  }
}

export default function CameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Camera'>>()
  const [mode, setMode] = useState<CompositionMode>('grid')
  const [activeTemplate, setActiveTemplate] = useState<PoseTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back')
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const photoCountRef = useRef(0)
  const [templateSearch, setTemplateSearch] = useState('')
  const [longPressTemplate, setLongPressTemplate] = useState<PoseTemplate | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  // 加载收藏列表
  useEffect(() => {
    getFavoriteTemplateIds().then(setFavoriteIds)
  }, [])
  useFocusEffect(useCallback(() => {
    getRecentTemplateIds().then(setRecentIds)
    getFavoriteTemplateIds().then(setFavoriteIds)
  }, []))

  // 拍照闪白动画
  const flashAnim = useRef(new Animated.Value(0)).current

  // captureRetryRef 指向重试函数；doCapture 读取这些 ref 拿到最新状态
  const flashRef = useRef(flash)
  const activeTemplateRef = useRef(activeTemplate)
  const captureRetryRef = useRef<() => void>(() => {})

  const cameraRef = useRef<CameraViewRef>(null)
  const { templates, loading: templatesLoading, error: templatesError, refresh, markUsed } = useTemplates()
  const stability = useStability()
  const { faces, processFrame } = useFaceDetection()
  // 节流自拍距离 TTS（避免频繁播报）
  const lastSelfieWarningRef = useRef<number>(0)
  const lastHairTipRef = useRef<number>(0)
  const lastMultiFaceWarningRef = useRef<number>(0)
  const lastExpressionTipRef = useRef<number>(0)
  // 节流正视镜头和多人合照不看镜头 TTS
  const lastLookAtCameraRef = useRef<number>(0)
  const lastGroupLookAtCameraRef = useRef<number>(0)
  // 节流人脸位置 TTS
  const lastFaceTipRef = useRef<number>(0)
  // ========== Round 3 新增：节流微笑检测 TTS（检测到笑脸时确认） ==========
  const lastSmileDetectedRef = useRef<number>(0)
  // ========== Round 3 新增：节流自拍姿势提示 TTS ==========
  const lastSelfiePoseTipRef = useRef<number>(0)
  // ========== Round 3 新增：节流逆光检测 TTS ==========
  const lastBacklightRef = useRef<number>(0)
  // ========== Round 3 新增：节流低光检测 TTS ==========
  const lastLowLightRef = useRef<number>(0)
  // VoiceCoach 是默认导出的实例，直接引用即可
  // 跟踪 handleAutoRecommended 产生的 setTimeout，组件卸载时清理
  const autoRecTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const handleAutoRecommended = useCallback((template: PoseTemplate) => {
    // 先清除之前的 timeout
    autoRecTimeoutRef.current.forEach(clearTimeout)
    autoRecTimeoutRef.current = []
    setActiveTemplate(template)
    VoiceCoach.speakTemplateSelected(template.name)
    VoiceCoach.speak(`跟着半透明剪影站位～`, true)
    if (template.voiceTip) {
      const t1 = setTimeout(() => VoiceCoach.speakTemplateTip(template.voiceTip), 2800)
      autoRecTimeoutRef.current.push(t1)
    }

    // 自动推荐的模板也记录到历史
    saveRecentTemplate(template.id)
    markUsed(template.id)
  }, [markUsed])

  // 组件卸载时清理所有 timeout
  useEffect(() => {
    return () => {
      autoRecTimeoutRef.current.forEach(clearTimeout)
      autoRecTimeoutRef.current = []
    }
  }, [])

  const {
    recommended: autoRecommended,
    markManual: markManualTemplate,
    resetAuto: resetAutoTemplate,
    isAutoRecommended,
  } = useSceneRecommendation({
    templates,
    enabled: !templatesLoading,
    onRecommended: handleAutoRecommended,
  })

  useFocusEffect(
    useCallback(() => {
      setIsActive(true)
      // 每日首次打开欢迎语
      ;(async () => {
        try {
          const today = new Date().toDateString()
          const stored = await AsyncStorage.getItem('last_open_date')
          if (stored !== today) {
            await AsyncStorage.setItem('last_open_date', today)
            VoiceCoach.speakDailyWelcome(true)
          } else {
            // 非首次打开也给一个相机设置提示
            VoiceCoach.speakCameraSetupTip()
          }
        } catch { /* ignore */ }
      })()
      return () => setIsActive(false)
    }, [])
  )

  useEffect(() => {
    VoiceCoach.initialize()
    return () => VoiceCoach.destroy()
  }, [])

  // ========== Round 3 新增：闲置计时器（45秒无操作则提醒） ==========
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      VoiceCoach.speakIdleTooLong()
      // 30秒后再给一个随机姿势提示
      setTimeout(() => {
        if (!activeTemplate) {
          VoiceCoach.speakRandomPoseTip()
        } else {
          VoiceCoach.speakQuickPoseTip()
        }
      }, 30000)
    }, 45000) // 45秒无操作则提醒
  }, [activeTemplate])

  useEffect(() => {
    resetIdleTimer()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  // ========== Round 3 新增：电量监控（低于 20% 时 TTS 提醒） ==========
  useBatteryMonitor(() => VoiceCoach.speak('手机快没电了！抓紧时间多拍几张～', true))

  useEffect(() => {
    VoiceCoach.speakStabilityTip(stability.tiltX, stability.tiltY, stability.shakeLevel)
  }, [stability.tiltX, stability.tiltY, stability.shakeLevel])

  // 人脸位置 TTS 提示（归一化坐标 + 面积，6s 节流）
  useEffect(() => {
    if (faces.length !== 1) return
    const now = Date.now()
    if (now - lastFaceTipRef.current < 6000) return
    lastFaceTipRef.current = now
    const face = faces[0]
    VoiceCoach.speakFaceTip(face.x, face.y, face.area).catch(() => {})
  }, [faces])

  // ========== Round 3 新增：低光检测 TTS（后置摄像头+人脸面积较小） ==========
  // 低光 Proxy：后置摄像头且人脸面积很小(<0.04)，说明光线不足
  useEffect(() => {
    if (cameraFacing !== 'back') return
    if (faces.length !== 1) return
    const now = Date.now()
    if (now - lastLowLightRef.current < 8000) return
    if (faces[0].area < 0.04) {
      lastLowLightRef.current = now
      VoiceCoach.speakLowLightWarning().catch(() => {})
    }
  }, [faces, cameraFacing])

  // 自拍距离 TTS 检查（前置摄像头下，Face 面积 > 0.22 时提示退远）
  useEffect(() => {
    if (cameraFacing !== 'front') return
    const now = Date.now()
    if (now - lastSelfieWarningRef.current < 4000) return // 4s 节流
    if (faces.length > 0 && faces[0].area > 0.22) {
      lastSelfieWarningRef.current = now
      VoiceCoach.speak('手机拿远一点！自拍离太近会变形～', false)
    }
    // 头发遮挡检测：前置自拍时人脸靠上（可能被刘海遮挡），节流 10s
    if (cameraFacing === 'front' && faces.length === 1) {
      const face = faces[0]
      if (face.y < 0.25 && face.area > 0.05 && face.area < 0.2) {
        if (now - lastHairTipRef.current >= 10000) {
          lastHairTipRef.current = now
          VoiceCoach.speakFaceOccluded('hair')
        }
      }
    }
    // 多脸检测 TTS（检测到多人时提醒构图）
    if (faces.length > 1) {
      if (now - lastMultiFaceWarningRef.current < 6000) return // 6s 节流
      lastMultiFaceWarningRef.current = now
      VoiceCoach.speakMultiFaceTip(faces.length)
      // 多人合照专属姿势提示（节流独立于上面）
      if (faces.length === 2) {
        VoiceCoach.speakCoupleInteractionTipV2().catch(() => {})
      } else if (faces.length > 2) {
        VoiceCoach.speakGroupPhotoTipV2().catch(() => {})
      }
    }
    // 表情实时分析 TTS（前置摄像头+单人脸+8s 节流）
    if (faces.length === 1 && cameraFacing === 'front') {
      if (now - lastExpressionTipRef.current < 8000) return
      lastExpressionTipRef.current = now
      // 自拍姿势提示（前置摄像头+无模板+12s 节流）
      if (!activeTemplate && now - lastSelfiePoseTipRef.current >= 12000) {
        lastSelfiePoseTipRef.current = now
        VoiceCoach.speakSelfiePoseTip().catch(() => {})
      }
      const face = faces[0]
      VoiceCoach.speakExpressionTip({
        smiling: face.smiling,
        leftEyeOpen: face.leftEyeOpen,
        rightEyeOpen: face.rightEyeOpen,
        yawAngle: face.yawAngle,
        rollAngle: face.rollAngle,
        sharpness: undefined,
        mouthOpen: undefined,
      }).catch(() => {})
      // 正视镜头检测（yaw 角接近 0 且在 6s 内未提醒）
      if (face.yawAngle !== undefined && Math.abs(face.yawAngle) < 12) {
        if (now - lastLookAtCameraRef.current >= 6000) {
          lastLookAtCameraRef.current = now
          VoiceCoach.speakFaceLookAtCamera().catch(() => {})
        }
      }
    }

    // ========== Round 3 新增：笑脸检测 TTS（笑容概率 >= 0.65 时确认） ==========
    if (faces.length === 1 && cameraFacing === 'front') {
      const smileProb = typeof faces[0].smiling === 'number' ? faces[0].smiling : 0
      if (smileProb >= 0.65 && now - lastSmileDetectedRef.current >= 5000) {
        lastSmileDetectedRef.current = now
        VoiceCoach.speakSmileDetected().catch(() => {})
      }
    }

    // ========== Round 3 新增：逆光/背光检测 TTS（前置摄像头+人脸面积正常但亮度偏低） ==========
    // 逆光 Proxy：人脸面积正常(0.05-0.25)但笑容概率低(<0.35)，说明可能脸太暗导致笑容检测不到
    if (faces.length === 1 && cameraFacing === 'front' && now - lastBacklightRef.current >= 8000) {
      const face = faces[0]
      const smileProb = typeof face.smiling === 'number' ? face.smiling : 0.5
      const isNormalSize = face.area >= 0.05 && face.area <= 0.25
      if (isNormalSize && smileProb < 0.35) {
        // 可能是逆光导致脸暗，笑容检测不到
        lastBacklightRef.current = now
        VoiceCoach.speakBacklightGuide().catch(() => {})
      }
    }

    // 多人合照中有人不看镜头（yaw 角偏大）
    if (faces.length > 1) {
      const notLooking = faces.filter(f => f.yawAngle !== undefined && Math.abs(f.yawAngle) > 25)
      if (notLooking.length > 0 && now - lastGroupLookAtCameraRef.current >= 6000) {
        lastGroupLookAtCameraRef.current = now
        VoiceCoach.speakGroupLookAtCamera().catch(() => {})
      }
    }
  }, [faces, cameraFacing])

  // 定期触发 mock 人脸检测（让自拍距离 TTS 有数据可用）
  useEffect(() => {
    const id = setInterval(() => {
      processFrame({ width: 1080, height: 1920 }, cameraFacing).catch(() => {})
    }, 300)
    return () => clearInterval(id)
  }, [cameraFacing, processFrame])

  useEffect(() => {
    getRecentTemplateIds().then(setRecentIds)
  }, [showTemplateModal])

  // 长按模板时检查收藏状态
  useEffect(() => {
    if (!longPressTemplate) return
    getFavoriteTemplateIds().then(ids => {
      setIsFavorite(ids.includes(longPressTemplate.id))
    })
  }, [longPressTemplate])

  // 同步 ref（让 doCapture 在任意时刻都能读到最新状态）
  useEffect(() => {
    flashRef.current = flash
  }, [flash])
  useEffect(() => {
    activeTemplateRef.current = activeTemplate
  }, [activeTemplate])

  // 实际执行拍照的内部函数（读取 ref 保证闭包新鲜）
  const doCapture = async () => {
    captureRetryRef.current = doCapture // 让 Alert 重试按钮能调用最新闭包的 doCapture
    // 闪白动画
    flashAnim.setValue(0)
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.35, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start()

    try {
      const photo = await cameraRef.current?.takePhoto(flashRef.current)
      if (photo) {
        setCameraError(null)
        navigation.navigate({ name: 'Result' as const, params: {
          photoPath: photo.filePath,
          templateCategory: activeTemplateRef.current?.category ?? null,
        }})
        VoiceCoach.speakCaptureSuccess()
        photoCountRef.current++
        const count = photoCountRef.current
        if (count === 5) VoiceCoach.speakProgressEncouragement(count)
        else if (count === 10) VoiceCoach.speakProgressEncouragement(count)
        else if (count === 20) VoiceCoach.speakProgressEncouragement(count)
        else if (count === 50) VoiceCoach.speakProgressEncouragement(count)
        else if (count === 100) VoiceCoach.speakMilestone(count)
      } else {
        VoiceCoach.speakCaptureFailed()
        Alert.alert('拍照遇到点小状况', '可以换个角度重试一下～', [
          { text: '算了', style: 'cancel' },
          { text: '重试', onPress: () => captureRetryRef.current() },
        ])
      }
    } catch (e: unknown) {
      VoiceCoach.speakCaptureFailed()
      const errMsg = e instanceof Error ? e.message : String(e)
      Alert.alert('拍照失败', errMsg || '请检查相机是否可用', [
        { text: '算了', style: 'cancel' },
        { text: '重试', onPress: () => captureRetryRef.current() },
      ])
    }
  }

  // 拍照
  const handleTakePhoto = useCallback(async () => {
    if (isCapturing) return
    VoiceCoach.speakPerfectTiming()
    setIsCapturing(true)
    // 拍照时轻震反馈（50ms 短震，给用户确认感）
    Vibration.vibrate(50)
    // 重置闲置计时器
    resetIdleTimer()
    try {
      await doCapture()
    } finally {
      setIsCapturing(false)
    }
  }, [isCapturing, resetIdleTimer])

  const handleSelectTemplate = useCallback(async (template: PoseTemplate) => {
    resetIdleTimer()
    markManualTemplate()
    setActiveTemplate(template)
    setShowTemplateModal(false)
    setTemplateSearch('')
    // 模板选中确认语
    VoiceCoach.speakTemplateSelected(template.name)
    // 随后朗读具体动作指导
    if (template.voiceTip) {
      setTimeout(() => VoiceCoach.speakTemplateTip(template.voiceTip), 1500)
    }
    // 模板分类专属提示
    if (template.category) {
      VoiceCoach.speakCategoryTip(template.category)
    }
    await saveRecentTemplate(template.id)
    setRecentIds(await getRecentTemplateIds())
    await markUsed(template.id)
  }, [markUsed, markManualTemplate, resetIdleTimer])

  const handleVoiceTipConfirm = useCallback(() => {
    if (activeTemplate?.voiceTip) {
      VoiceCoach.speakTemplateTip(activeTemplate.voiceTip)
    }
  }, [activeTemplate])

  const cycleFlash = useCallback(() => {
    const idx = (FLASH_MODES.indexOf(flash) + 1) % FLASH_MODES.length
    setFlash(FLASH_MODES[idx])
    VoiceCoach.speakFlashChanged(FLASH_MODES[idx])
  }, [flash])

  const handleStabilityUnstable = useCallback(() => {
    const tiltMag = Math.sqrt(stability.tiltX ** 2 + stability.tiltY ** 2)
    if (stability.shakeLevel > 0.65) {
      VoiceCoach.speak('手稳住！', true)
    } else if (tiltMag > 10) {
      VoiceCoach.speak('手机歪了，扶正再拍～', true)
    } else {
      VoiceCoach.speak('稳住！别动！', true)
    }
  }, [stability.tiltX, stability.tiltY, stability.shakeLevel])

  const flipCamera = useCallback(() => {
    resetIdleTimer()
    setCameraFacing((prev) => {
      const next = prev === 'back' ? 'front' : 'back'
      if (next === 'front') {
        VoiceCoach.speakCameraSwitchedFront()
      } else {
        VoiceCoach.speakCameraSwitchedBack()
      }
      return next
    })
  }, [resetIdleTimer])

  const clearTemplate = useCallback(() => {
    setActiveTemplate(null)
    VoiceCoach.stop()
    VoiceCoach.speakTemplateCleared()
    resetAutoTemplate()
  }, [resetAutoTemplate])

  const handleClose = useCallback(() => {
    VoiceCoach.stop()
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate({ name: 'Home' as const, params: undefined })
    }
  }, [navigation])

  const categories = useMemo(() => {
    const cats = new Set<string>(['全部'])
    if (favoriteIds.length > 0) cats.add('收藏')
    templates.forEach((t) => { if (t.category) cats.add(t.category) })
    return Array.from(cats)
  }, [templates, favoriteIds])

  const filteredTemplates = useMemo(() => {
    let list: PoseTemplate[]
    if (selectedCategory === '收藏') {
      list = favoriteIds.map((id) => templates.find((t) => t.id === id)).filter(Boolean) as PoseTemplate[]
    } else {
      list = selectedCategory === '全部' ? templates : templates.filter((t) => t.category === selectedCategory)
    }
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [templates, selectedCategory, templateSearch, favoriteIds])

  const recentTemplates = useMemo(() => {
    return recentIds
      .map((id) => templates.find((t) => t.id === id))
      .filter(Boolean)
      .slice(0, 3) as PoseTemplate[]
  }, [recentIds, templates])

  return (
    <View style={styles.container}>
      {/* 相机预览 */}
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          ref={cameraRef}
          facing={cameraFacing}
          flash={flash}
          isActive={isActive}
          torchMode={flash === 'on' ? 'on' : 'off'}
          onError={(err) => {
            setCameraError(err)
            if (err === 'permission_denied') {
              VoiceCoach.speakCameraPermissionDenied()
            } else {
              VoiceCoach.speak('相机设备不可用，请检查摄像头是否正常', true)
            }
          }}
          onBurstDone={(count) => {
            VoiceCoach.speakBurstCaptureDone(count)
            resetIdleTimer()
          }}
        />
        {cameraError && (
          <View style={styles.cameraErrorBanner}>
            <Text style={styles.cameraErrorText}>
              {cameraError === 'permission_denied' ? '相机权限未授权，请去设置中开启' : '相机设备不可用'}
            </Text>
            <TouchableOpacity onPress={() => setCameraError(null)} activeOpacity={0.72}>
              <Text style={styles.cameraErrorClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 闪白动画层 */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      {/* 构图线 */}
      <CompositionLines mode={mode} />


      {/* 姿势模板 */}
      <PoseTemplateOverlay
        template={activeTemplate}
        onTipPress={handleVoiceTipConfirm}
      />

      {/* 顶部悬浮姿势引导卡 — 毛玻璃风格 */}
      {activeTemplate && (
        <View style={styles.poseTipCardFrosted}>
          {(isAutoRecommended && autoRecommended?.id === activeTemplate.id) && (
            <Text style={styles.autoRecommendBadge}>智能推荐</Text>
          )}
          <Text style={styles.poseTipText} numberOfLines={1}>
            {activeTemplate.voiceTip || activeTemplate.name}
          </Text>
          <TouchableOpacity
            style={styles.poseTipVoiceBtn}
            onPress={handleVoiceTipConfirm}
            activeOpacity={0.72}
          >
            <Text style={styles.poseTipVoiceBtnText}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.poseTipClearBtn}
            onPress={clearTemplate}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="清除姿势模板"
          >
            <Text style={styles.poseTipClearBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 顶部控制栏 - 玻璃毛玻璃风格 */}
      <View style={styles.topBarGlass}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={cycleFlash}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={`闪光灯: ${flash === 'off' ? '关闭' : flash === 'on' ? '开启' : '自动'}`}
          accessibilityHint="单击切换闪光灯模式"
        >
          <Text style={styles.topBtnText}>{FLASH_ICONS[flash]}</Text>
        </TouchableOpacity>

        <View style={styles.modeGroupGlass}>
          {(['grid', 'golden', 'triangle'] as CompositionMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActiveGlass]}
              onPress={() => {
                VoiceCoach.speakGridModeChanged(m)
                setMode(m)
              }}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={`构图模式: ${m === 'grid' ? '九宫格' : m === 'golden' ? '黄金螺旋' : '三角构图'}${mode === m ? '，已选中' : ''}`}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'grid' ? '▦' : m === 'golden' ? '◎' : '△'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.topBtn}
          onPress={handleClose}
          activeOpacity={0.72}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="关闭拍照"
        >
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 稳定性指示 */}
      <StabilityIndicator
        tiltX={stability.tiltX}
        tiltY={stability.tiltY}
        shakeLevel={stability.shakeLevel}
        onUnstable={handleStabilityUnstable}
      />

      {/* 底部控制栏 - 玻璃毛玻璃风格 */}
      <View style={styles.bottomBarGlass}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            VoiceCoach.speak('打开姿势模板', false)
            setShowTemplateModal(true)
          }}
          activeOpacity={0.72}
        >
          <Text style={styles.sideBtnIcon}>📋</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutter, isCapturing && styles.shutterDisabled]}
          onPress={handleTakePhoto}
          disabled={isCapturing}
          activeOpacity={0.72}
        >
          <View style={[styles.shutterOuter, isCapturing && styles.shutterOuterCapturing]}>
            <View style={[styles.shutterInner, isCapturing && styles.shutterInnerCapturing]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={flipCamera}
          activeOpacity={0.72}
        >
          <Text style={styles.sideBtnIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* 姿势模板选择弹窗 */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowTemplateModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>姿势模板</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowTemplateModal(false)}
                activeOpacity={0.72}
              >
                <Text style={styles.modalClose}>完成</Text>
              </TouchableOpacity>
            </View>

            {/* 搜索框 */}
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="搜索姿势、场景..."
                placeholderTextColor={COLORS.textMuted}
                value={templateSearch}
                onChangeText={setTemplateSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {templateSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTemplateSearch('')} activeOpacity={0.72}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 最近使用 */}
            {!templateSearch && recentTemplates.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>最近使用</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
                  {recentTemplates.map((t) => {
                    const color = CATEGORY_COLORS[t.category || ''] || COLORS.primary
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.recentCard, { borderColor: color }]}
                        onPress={() => handleSelectTemplate(t)}
                        activeOpacity={0.72}
                        accessibilityRole="button"
                        accessibilityLabel={`最近使用: ${t.name}`}
                      >
                        <Image source={{ uri: t.thumbnail }} style={styles.recentThumb} resizeMode="contain" />
                        <Text style={styles.recentName} numberOfLines={1}>{t.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* 分类标签 — 去背景色：色文字承载分类信息，简洁不抢镜 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {categories.map((cat) => {
                const color = CATEGORY_COLORS[cat] || COLORS.primary
                const isSelected = selectedCategory === cat
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryTab,
                      isSelected && styles.categoryTabActive,
                    ]}
                    onPress={() => {
                      if (selectedCategory !== cat) {
                        VoiceCoach.speakTemplateCategorySwitched(cat)
                      }
                      setSelectedCategory(cat)
                    }}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityLabel={`分类: ${cat}${isSelected ? '，已选中' : ''}`}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        isSelected && { color },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {templatesLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>正在加载姿势模板...</Text>
              </View>
            ) : templatesError ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.emptyStateIcon}>📡</Text>
                <Text style={styles.emptyStateTitle}>网络不给力～</Text>
                <Text style={styles.loadingText}>{templatesError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.72}>
                  <Text style={styles.retryBtnText}>重新加载模板</Text>
                </TouchableOpacity>
              </View>
            ) : filteredTemplates.length === 0 ? (
              <View style={styles.loadingContainer}>
                {selectedCategory === '收藏' ? (
                  <>
                    <Text style={styles.loadingText}>💛 还没有收藏任何模板</Text>
                    <Text style={[styles.loadingText, { fontSize: 12, marginTop: 6, color: COLORS.textMuted }]}>长按模板可收藏，下次快速找到～</Text>
                  </>
                ) : templateSearch ? (
                  <>
                    <Text style={styles.loadingText}>没有找到「{templateSearch}」相关模板</Text>
                    <Text style={[styles.loadingText, { fontSize: 12, marginTop: 6, color: COLORS.textMuted }]}>试试其他关键词或切换分类～</Text>
                  </>
                ) : (
                  <Text style={styles.loadingText}>该分类暂无模板～</Text>
                )}
              </View>
            ) : (
              <>
                {(templateSearch || selectedCategory !== '全部') && filteredTemplates.length > 0 && (
                  <Text style={{ paddingHorizontal: 16, paddingVertical: 6, fontSize: 12, color: COLORS.textMuted }}>
                    {templateSearch
                      ? `找到 ${filteredTemplates.length} 个「${templateSearch}」相关模板`
                      : `${selectedCategory} 共 ${filteredTemplates.length} 个模板`}
                  </Text>
                )}
                <FlatList
                data={filteredTemplates}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.templateRow}
                contentContainerStyle={styles.templateList}
                // ========== Round 36 UI/UX 优化：FlatList 性能优化 ==========
                getItemLayout={(_, index) => ({
                  length: 205,
                  offset: 205 * Math.floor(index / 2),
                  index,
                })}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={8}
                renderItem={({ item }) => {
                  const isActive = activeTemplate?.id === item.id
                  return (
                    <TouchableOpacity
                      style={[
                        styles.templateCard,
                        isActive && styles.templateCardActive,
                      ]}
                      onPress={() => handleSelectTemplate(item)}
                      onLongPress={() => setLongPressTemplate(item)}
                      delayLongPress={500}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityLabel={`姿势模板: ${item.name}${isActive ? '，已选中' : ''}`}
                      accessibilityHint="单击选择此姿势模板"
                    >
                      {/* 选中态角标已移除 — 选择态由 borderColor + backgroundColor 承载，
                          无需额外角标，避免角落装饰元素干扰模板缩略图 */}
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.templateThumb}
                        resizeMode="contain"
                      />
                      <Text style={styles.templateName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.voiceTip && (
                        <Text style={styles.templateVoiceTip} numberOfLines={1}>{item.voiceTip}</Text>
                      )}
                    </TouchableOpacity>
                  )
                }}
              />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 长按模板预览（支持缩放手势） */}
      <Modal visible={!!longPressTemplate} transparent animationType="fade" onRequestClose={() => setLongPressTemplate(null)}>
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setLongPressTemplate(null)}
        >
          <View style={styles.previewCard}>
            <Image
              source={{ uri: longPressTemplate?.thumbnail || '' }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <Text style={styles.previewName}>{longPressTemplate?.name}</Text>
            <Text style={styles.previewDesc}>{longPressTemplate?.description}</Text>
            {longPressTemplate?.voiceTip && (
              <Text style={styles.previewTip}>{longPressTemplate.voiceTip}</Text>
            )}
            {/* 收藏姿势按钮 */}
            <TouchableOpacity
              style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
              onPress={async () => {
                if (!longPressTemplate) return
                const nowFav = await toggleFavoriteTemplate(longPressTemplate.id)
                setIsFavorite(nowFav)
                if (nowFav) {
                  Alert.alert('收藏成功', `"${longPressTemplate.name}" 已添加到收藏～`)
                } else {
                  Alert.alert('取消收藏', `"${longPressTemplate.name}" 已从收藏移除`)
                }
              }}
              activeOpacity={0.72}
            >
              <Text style={[styles.favoriteBtnText, isFavorite && styles.favoriteBtnTextActive]}>
                {isFavorite ? '已收藏' : '收藏姿势'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewUseBtn}
              onPress={() => {
                if (longPressTemplate) handleSelectTemplate(longPressTemplate)
                setLongPressTemplate(null)
              }}
              activeOpacity={0.72}
            >
              <Text style={styles.previewUseBtnText}>使用这个姿势 →</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraErrorBanner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: COLORS.blackAlpha40,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  cameraErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  cameraErrorClose: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    padding: 4,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#fff',
    zIndex: 200,
    pointerEvents: 'none',
  },
  // 顶部控制栏 — 透明背景 + 轻量遮罩，避免花哨毛玻璃
  topBarGlass: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  // 关闭/闪光灯按钮 — 无背景色，纯图标+点击热区
  topBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnText: {
    color: '#fff',
    fontSize: 22,
  },
  // 构图模式切换 — 极简透明按钮组，active态用主色
  modeGroupGlass: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActiveGlass: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 17,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  // 顶部悬浮姿势引导卡 — 简洁遮罩，轻量文字
  autoRecommendBadge: {
    backgroundColor: COLORS.primary,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 4,
    flexShrink: 0,
  },
  poseTipCardFrosted: {
    position: 'absolute',
    top: 108,
    left: 16,
    right: 88,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  poseTipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textOnDark,
    fontWeight: '600',
    lineHeight: 20,
  },
  poseTipVoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  poseTipVoiceBtnText: {
    fontSize: 16,
  },
  poseTipClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.blackAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  poseTipClearBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  // 底部控制栏 — 简洁遮罩，不喧宾夺主
  bottomBarGlass: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  // 侧边按钮 — 纯图标文字，无背景
  sideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  sideBtnIcon: {
    fontSize: 28,
    marginBottom: 3,
  },
  sideBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  shutter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: COLORS.whiteAlpha80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterCapturing: {
    borderColor: COLORS.primary,
    transform: [{ scale: 0.95 }],
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerCapturing: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 0.95 }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  // modalHeaderActions 已移除（从未在 JSX 中使用）
  // modalHandle 已移除（从未在 JSX 中使用）
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalClose: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
    flexDirection: 'row',
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginHorizontal: 2,
  },
  categoryTabActive: {
    backgroundColor: hexAlpha(COLORS.primary, 0.1),
  },
  categoryTabText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  templateList: {
    padding: 12,
  },
  templateRow: {
    gap: 12,
    marginBottom: 12,
  },
  templateCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  templateCardActive: {
    borderColor: COLORS.primary,
  },
  templateThumb: {
    width: SCREEN_W / 2 - 60,
    height: 120,
    borderRadius: 10,
  },
  templateName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  templateVoiceTip: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  // 搜索框：无边框无背景，白色底自然区隔，视觉更轻
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    padding: 0,
  },
  searchClear: {
    color: COLORS.textMuted,
    fontSize: 14,
    padding: 2,
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  recentCard: {
    width: 64,
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 6,
    overflow: 'hidden',
  },
  recentThumb: {
    width: 48,
    height: 64,
  },
  recentName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: hexAlpha('#000', 0.65),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    width: '88%',
    maxWidth: 320,
    alignItems: 'center',
  },
  previewImage: {
    width: 160,
    height: 220,
    marginBottom: 18,
  },
  previewName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  previewDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  previewTip: {
    fontSize: 12,
    color: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  favoriteBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  favoriteBtnActive: {
    backgroundColor: COLORS.categoryCouple,
  },
  favoriteBtnText: {
    color: COLORS.categoryCouple,
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteBtnTextActive: {
    color: COLORS.textOnPrimary,
  },
  previewUseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  previewUseBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
})
