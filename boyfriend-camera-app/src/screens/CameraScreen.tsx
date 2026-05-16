/**
 * CameraScreen - 拍照页 v2
 * 使用 react-native-vision-camera v5 API
 * 改进：相机翻转、分类筛选模板选择器、闪光灯循环、更好的 UI
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import CompositionLines from '../components/camera/CompositionLines'
import PoseTemplateOverlay, { type PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import StabilityIndicator from '../components/camera/StabilityIndicator'
import VoiceCoach from '../components/camera/VoiceCoach'
import { useTemplates } from '../hooks/useTemplates'
import { useStability } from '../hooks/useStability'
import CameraView, { takePhoto } from '../components/camera/CameraView'

type CompositionMode = 'grid' | 'golden' | 'triangle'

const { width: SCREEN_W } = Dimensions.get('window')
const FLASH_MODES: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto']
const FLASH_ICONS: Record<string, string> = { off: '📷', on: '⚡', auto: '🔄' }

// 分类颜色
const CATEGORY_COLORS: Record<string, string> = {
  '室内日常': '#FF6B6B',
  '户外风景': '#4ECDC4',
  '餐厅美食': '#FFB347',
  '特殊风格': '#A29BFE',
  '情侣合照': '#FD79A8',
}

export default function CameraScreen({ navigation }: any) {
  const [mode, setMode] = useState<CompositionMode>('grid')
  const [activeTemplate, setActiveTemplate] = useState<PoseTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showVoiceTip, setShowVoiceTip] = useState(false)
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back')
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null)
  const { templates, loading: templatesLoading } = useTemplates()
  const stability = useStability()
  const voiceCoach = useRef(VoiceCoach).current

  // 页面聚焦/失焦
  useFocusEffect(
    useCallback(() => {
      setIsActive(true)
      return () => setIsActive(false)
    }, [])
  )

  // 初始化语音教练
  useEffect(() => {
    voiceCoach.initialize()
    return () => voiceCoach.stop()
  }, [])

  // 陀螺仪稳定性变化时语音提示
  useEffect(() => {
    voiceCoach.speakStabilityTip(stability.tiltX, stability.tiltY, stability.shakeLevel)
  }, [stability.tiltX, stability.tiltY, stability.shakeLevel])

  // 拍照
  const handleTakePhoto = useCallback(async () => {
    if (isCapturing) return
    setIsCapturing(true)

    try {
      const photo = await takePhoto(cameraRef, flash)

      if (photo) {
        navigation.navigate('Result', {
          photoPath: photo.filePath,
          photoWidth: undefined,
          photoHeight: undefined,
        })
      } else {
        Alert.alert('拍照失败', '请重试')
      }
    } catch (e: any) {
      Alert.alert('拍照失败', e.message || '请重试')
    } finally {
      setIsCapturing(false)
    }
  }, [flash, isCapturing, navigation])

  // 选择模板
  const handleSelectTemplate = useCallback((template: PoseTemplate) => {
    setActiveTemplate(template)
    setShowTemplateModal(false)
    if (template.voiceTip) {
      voiceCoach.speakTemplateTip(template.voiceTip)
    }
    setShowVoiceTip(true)
    setTimeout(() => setShowVoiceTip(false), 4000)
  }, [])

  const handleVoiceTipConfirm = useCallback(() => {
    if (activeTemplate?.voiceTip) {
      voiceCoach.speakTemplateTip(activeTemplate.voiceTip)
    }
    setShowVoiceTip(false)
  }, [activeTemplate])

  // 循环闪光灯
  const cycleFlash = useCallback(() => {
    const idx = (FLASH_MODES.indexOf(flash) + 1) % FLASH_MODES.length
    setFlash(FLASH_MODES[idx])
    const labels: Record<string, string> = { off: '闪光灯关闭', on: '闪光灯打开', auto: '闪光灯自动' }
    voiceCoach.speak(labels[FLASH_MODES[idx]], false)
  }, [flash])

  // 翻转相机
  const flipCamera = useCallback(() => {
    setCameraFacing((prev) => {
      const next = prev === 'back' ? 'front' : 'back'
      voiceCoach.speak(next === 'front' ? '切换前置摄像头，自拍模式～' : '切换后置摄像头', false)
      return next
    })
  }, [])

  // 清除模板
  const clearTemplate = useCallback(() => {
    setActiveTemplate(null)
    voiceCoach.stop()
  }, [])

  // 过滤模板
  const categories = useMemo(() => {
    const cats = new Set<string>(['全部'])
    templates.forEach((t) => { if (t.category) cats.add(t.category) })
    return Array.from(cats)
  }, [templates])

  const filteredTemplates = useMemo(
    () => (selectedCategory === '全部' ? templates : templates.filter((t) => t.category === selectedCategory)),
    [templates, selectedCategory]
  )

  return (
    <View style={styles.container}>
      {/* 相机预览 */}
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          cameraRef={cameraRef}
          flash={flash}
          isActive={isActive}
          torchMode={flash === 'on' ? 'on' : 'off'}
        />
      </View>

      {/* 构图线叠加 */}
      <CompositionLines mode={mode} />

      {/* 姿势模板 */}
      <PoseTemplateOverlay
        template={activeTemplate}
        onTipPress={handleVoiceTipConfirm}
      />

      {/* 稳定性指示 */}
      <StabilityIndicator
        tiltX={stability.tiltX}
        tiltY={stability.tiltY}
        shakeLevel={stability.shakeLevel}
        onUnstable={() => voiceCoach.speak('手稳住！', true)}
      />

      {/* 顶部控制栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={cycleFlash}
          activeOpacity={0.7}
        >
          <Text style={styles.topBtnText}>{FLASH_ICONS[flash]}</Text>
          <View style={styles.flashDot} />
        </TouchableOpacity>

        <View style={styles.modeGroup}>
          {(['grid', 'golden', 'triangle'] as CompositionMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'grid' ? '▦' : m === 'golden' ? '◎' : '△'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.topBtn, activeTemplate && styles.topBtnActive]}
          onPress={clearTemplate}
          activeOpacity={0.7}
        >
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 当前模板提示条 */}
      {activeTemplate && (
        <View style={styles.templateHintBar}>
          <Text style={styles.templateHintText}>📐 {activeTemplate.name}</Text>
          <TouchableOpacity onPress={handleVoiceTipConfirm}>
            <Text style={styles.templateHintVoice}>🔊 再听一遍</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 底部控制栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => setShowTemplateModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.sideBtnIcon}>📐</Text>
          <Text style={styles.sideBtnText}>姿势</Text>
          {templates.length > 0 && (
            <View style={styles.templateBadge}>
              <Text style={styles.templateBadgeText}>{templates.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutter, isCapturing && styles.shutterDisabled]}
          onPress={handleTakePhoto}
          disabled={isCapturing}
          activeOpacity={0.6}
        >
          <View style={styles.shutterOuter}>
            <View style={[styles.shutterInner, isCapturing && styles.shutterInnerCapturing]}>
              {isCapturing && <View style={styles.shutterPulsing} />}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={flipCamera}
          activeOpacity={0.7}
        >
          <Text style={styles.sideBtnIcon}>🔄</Text>
          <Text style={styles.sideBtnText}>翻转</Text>
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
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📐 选择姿势</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 分类标签 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {categories.map((cat) => {
                const color = CATEGORY_COLORS[cat] || '#FF6B6B'
                const isSelected = selectedCategory === cat
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryTab,
                      isSelected && { backgroundColor: color },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        isSelected && styles.categoryTabTextActive,
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
                <Text style={styles.loadingText}>加载模板中...</Text>
              </View>
            ) : filteredTemplates.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>该分类暂无模板～</Text>
              </View>
            ) : (
              <FlatList
                data={filteredTemplates}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.templateRow}
                contentContainerStyle={styles.templateList}
                renderItem={({ item }) => {
                  const catColor = CATEGORY_COLORS[item.category || ''] || '#FF6B6B'
                  const isActive = activeTemplate?.id === item.id
                  return (
                    <TouchableOpacity
                      style={[
                        styles.templateCard,
                        isActive && styles.templateCardActive,
                      ]}
                      onPress={() => handleSelectTemplate(item)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.templateThumb}
                        resizeMode="contain"
                      />
                      <Text style={styles.templateName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.category && (
                        <View style={[styles.templateCategory, { backgroundColor: catColor }]}>
                          <Text style={styles.templateCategoryText}>{item.category}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraWrapper: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.5)',
  },
  topBtnText: {
    color: '#fff',
    fontSize: 20,
  },
  flashDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  modeGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.85)',
  },
  modeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 17,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  templateHintBar: {
    position: 'absolute',
    top: 116,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,107,107,0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 20,
  },
  templateHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  templateHintVoice: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    zIndex: 20,
  },
  sideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  sideBtnIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sideBtnText: {
    color: '#fff',
    fontSize: 11,
  },
  templateBadge: {
    position: 'absolute',
    top: 0,
    right: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  templateBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shutter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerCapturing: {
    backgroundColor: '#FF6B6B',
  },
  shutterPulsing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 22,
    color: '#999',
    padding: 4,
  },
  categoryTabs: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
  },
  categoryTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardActive: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  templateThumb: {
    width: SCREEN_W / 2 - 52,
    height: 130,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  templateName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
    textAlign: 'center',
  },
  templateCategory: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  templateCategoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
})
