/**
 * CameraScreen - 拍照页 v3
 * 改进：顶部悬浮姿势引导卡、拍照闪白动画、模板选择弹窗优化
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
  TextInput,
  Animated,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import CompositionLines from '../components/camera/CompositionLines'
import PoseTemplateOverlay, { type PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import StabilityIndicator from '../components/camera/StabilityIndicator'
import VoiceCoach from '../components/camera/VoiceCoach'
import { useTemplates } from '../hooks/useTemplates'
import { useStability } from '../hooks/useStability'
import { useSceneRecommendation } from '../hooks/useSceneRecommendation'
import CameraView, { CameraViewRef } from '../components/camera/CameraView'
import { COLORS } from '../theme/colors'

type CompositionMode = 'grid' | 'golden' | 'triangle'

const { width: SCREEN_W } = Dimensions.get('window')
const FLASH_MODES: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto']
const FLASH_ICONS: Record<string, string> = { off: '📷', on: '⚡', auto: '🔄' }

const CATEGORY_COLORS: Record<string, string> = {
  '室内日常': '#FF6B6B',
  '户外风景': '#4ECDC4',
  '餐厅美食': '#FFB347',
  '特殊风格': '#A29BFE',
  '情侣合照': '#FD79A8',
}

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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
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
  const focusAnim = useRef(new Animated.Value(0)).current
  // 姿势引导条滚动
  const marqueeScrollX = useRef(new Animated.Value(0)).current

  const cameraRef = useRef<CameraViewRef>(null)
  const { templates, loading: templatesLoading, error: templatesError, refresh, markUsed } = useTemplates()
  const stability = useStability()
  const voiceCoach = useRef(VoiceCoach).current

  const handleAutoRecommended = useCallback((template: PoseTemplate) => {
    setActiveTemplate(template)
    setShowVoiceTip(true)
    voiceCoach.speak(`已为你推荐「${template.name}」姿势，跟着半透明剪影站位～`, true)
    if (template.voiceTip) {
      setTimeout(() => voiceCoach.speakTemplateTip(template.voiceTip), 2800)
    }
    setTimeout(() => setShowVoiceTip(false), 6000)
  }, [voiceCoach])

  const {
    recommended: autoRecommended,
    markManual: markManualTemplate,
    resetAuto: resetAutoTemplate,
    recommendNow,
    isAutoRecommended,
  } = useSceneRecommendation({
    templates,
    enabled: !templatesLoading,
    onRecommended: handleAutoRecommended,
  })

  useFocusEffect(
    useCallback(() => {
      setIsActive(true)
      return () => setIsActive(false)
    }, [])
  )

  useEffect(() => {
    voiceCoach.initialize()
    return () => voiceCoach.stop()
  }, [])

  useEffect(() => {
    voiceCoach.speakStabilityTip(stability.tiltX, stability.tiltY, stability.shakeLevel)
  }, [stability.tiltX, stability.tiltY, stability.shakeLevel, voiceCoach])

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

  // 拍照
  const handleTakePhoto = useCallback(async () => {
    if (isCapturing) return
    setIsCapturing(true)

    // 闪白动画
    flashAnim.setValue(0)
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.35, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start()

    try {
      const photo = await cameraRef.current?.takePhoto(flash)
      if (photo) {
        navigation.navigate('Result', {
          photoPath: photo.filePath,
          photoWidth: undefined,
          photoHeight: undefined,
          templateCategory: activeTemplate?.category ?? null,
        })
        voiceCoach.speakCaptureSuccess()
      } else {
        Alert.alert('拍照失败', '请重试')
      }
    } catch (e: any) {
      Alert.alert('拍照失败', e.message || '请重试')
    } finally {
      setIsCapturing(false)
    }
  }, [flash, isCapturing, navigation])

  const handleSelectTemplate = useCallback(async (template: PoseTemplate) => {
    markManualTemplate()
    setActiveTemplate(template)
    setShowTemplateModal(false)
    setTemplateSearch('')
    if (template.voiceTip) {
      voiceCoach.speakTemplateTip(template.voiceTip)
    }
    // 模板分类专属提示
    if (template.category) {
      voiceCoach.speakCategoryTip(template.category)
    }
    setShowVoiceTip(true)
    setTimeout(() => setShowVoiceTip(false), 4000)
    await saveRecentTemplate(template.id)
    setRecentIds(await getRecentTemplateIds())
    await markUsed(template.id)
  }, [markUsed, markManualTemplate])

  const handleVoiceTipConfirm = useCallback(() => {
    if (activeTemplate?.voiceTip) {
      voiceCoach.speakTemplateTip(activeTemplate.voiceTip)
    }
    setShowVoiceTip(false)
  }, [activeTemplate, voiceCoach])

  const cycleFlash = useCallback(() => {
    const idx = (FLASH_MODES.indexOf(flash) + 1) % FLASH_MODES.length
    setFlash(FLASH_MODES[idx])
    const labels: Record<string, string> = { off: '闪光灯关闭', on: '闪光灯打开', auto: '闪光灯自动' }
    voiceCoach.speak(labels[FLASH_MODES[idx]], false)
  }, [flash])

  const flipCamera = useCallback(() => {
    setCameraFacing((prev) => {
      const next = prev === 'back' ? 'front' : 'back'
      voiceCoach.speak(next === 'front' ? '切换前置摄像头，自拍模式～' : '切换后置摄像头', false)
      return next
    })
  }, [])

  const clearTemplate = useCallback(() => {
    setActiveTemplate(null)
    voiceCoach.stop()
    resetAutoTemplate()
    recommendNow()
  }, [resetAutoTemplate, recommendNow, voiceCoach])

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

  function handleScreenTap(e: { nativeEvent: { locationX: number; locationY: number } }) {
    const { locationX, locationY } = e.nativeEvent
    setFocusPoint({ x: locationX, y: locationY })
    focusAnim.setValue(0)
    Animated.sequence([
      Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(focusAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start(() => setFocusPoint(null))
    voiceCoach.speak('已对焦', false)
  }

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
          onError={(err) => setCameraError(err)}
        />
        {cameraError && (
          <View style={styles.cameraErrorBanner}>
            <Text style={styles.cameraErrorText}>
              {cameraError === 'permission_denied' ? '📷 相机权限未授权，请去设置中开启' : '📷 相机设备不可用'}
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

      {/* 点击聚焦指示 */}
      {focusPoint && (
        <Animated.View
          style={[
            styles.focusRing,
            {
              left: focusPoint.x - 30,
              top: focusPoint.y - 30,
              opacity: focusAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
              transform: [
                {
                  scale: focusAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.2, 1] }),
                },
              ],
            },
          ]}
        />
      )}

      {/* 姿势模板 */}
      <PoseTemplateOverlay
        template={activeTemplate}
        onTipPress={handleVoiceTipConfirm}
      />

      {/* 顶部悬浮姿势引导卡 */}
      {activeTemplate && (
        <View style={styles.poseTipCard}>
          {isAutoRecommended && autoRecommended?.id === activeTemplate.id && (
            <Text style={styles.autoRecommendBadge}>✨ 智能推荐</Text>
          )}
          <Text style={styles.poseTipIcon}>💡</Text>
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
        </View>
      )}

      {/* 顶部控制栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={cycleFlash}
          activeOpacity={0.72}
        >
          <Text style={styles.topBtnText}>{FLASH_ICONS[flash]}</Text>
          <View style={flash === 'on' ? styles.flashDotOn : styles.flashDotOff} />
        </TouchableOpacity>

        <View style={styles.modeGroup}>
          {(['grid', 'golden', 'triangle'] as CompositionMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.72}
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
          activeOpacity={0.72}
        >
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 稳定性指示 */}
      <StabilityIndicator
        tiltX={stability.tiltX}
        tiltY={stability.tiltY}
        shakeLevel={stability.shakeLevel}
        onUnstable={() => voiceCoach.speak('手稳住！', true)}
      />

      {/* 底部控制栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => setShowTemplateModal(true)}
          activeOpacity={0.72}
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
          activeOpacity={0.72}
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
          activeOpacity={0.72}
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
              <Text style={styles.modalTitle}>📐 姿势模板</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.randomBtn}
                  onPress={() => {
                    const randomIdx = Math.floor(Math.random() * filteredTemplates.length)
                    if (filteredTemplates[randomIdx]) {
                      handleSelectTemplate(filteredTemplates[randomIdx])
                      setShowTemplateModal(false)
                    }
                  }}
                  activeOpacity={0.72}
                >
                  <Text style={styles.randomBtnText}>🎲 随机</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowTemplateModal(false)}
                  activeOpacity={0.72}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 搜索框 */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="搜索姿势、场景..."
                placeholderTextColor="#aaa"
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
                <Text style={styles.recentTitle}>⏱ 最近使用</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
                  {recentTemplates.map((t) => {
                    const color = CATEGORY_COLORS[t.category || ''] || COLORS.primary
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.recentCard, { borderColor: color }]}
                        onPress={() => handleSelectTemplate(t)}
                        activeOpacity={0.72}
                      >
                        <Image source={{ uri: t.thumbnail }} style={styles.recentThumb} resizeMode="contain" />
                        <Text style={styles.recentName} numberOfLines={1}>{t.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* 分类标签 */}
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
                      isSelected && { backgroundColor: color },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.72}
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
              <View style={styles.templateSkeletonGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={styles.templateSkeletonCard}>
                    <View style={styles.templateSkeletonIcon} />
                    <View style={styles.templateSkeletonLabel} />
                  </View>
                ))}
              </View>
            ) : templatesError ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>⚠️ {templatesError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.72}>
                  <Text style={styles.retryBtnText}>点击重试</Text>
                </TouchableOpacity>
              </View>
            ) : filteredTemplates.length === 0 ? (
              <View style={styles.loadingContainer}>
                {selectedCategory === '收藏' ? (
                  <>
                    <Text style={styles.loadingText}>💛 还没有收藏任何模板</Text>
                    <Text style={[styles.loadingText, { fontSize: 12, marginTop: 6, color: '#888' }]}>长按模板可收藏，下次快速找到～</Text>
                  </>
                ) : templateSearch ? (
                  <>
                    <Text style={styles.loadingText}>没有找到「{templateSearch}」相关模板</Text>
                    <Text style={[styles.loadingText, { fontSize: 12, marginTop: 6, color: '#888' }]}>试试其他关键词或切换分类～</Text>
                  </>
                ) : (
                  <Text style={styles.loadingText}>该分类暂无模板～</Text>
                )}
              </View>
            ) : (
              <>
                {(templateSearch || selectedCategory !== '全部') && filteredTemplates.length > 0 && (
                  <Text style={{ paddingHorizontal: 16, paddingVertical: 6, fontSize: 12, color: '#888' }}>
                    {templateSearch
                      ? `🔍 找到 ${filteredTemplates.length} 个「${templateSearch}」相关模板`
                      : `📋 ${selectedCategory} 共 ${filteredTemplates.length} 个模板`}
                  </Text>
                )}
                <FlatList
                data={filteredTemplates}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.templateRow}
                contentContainerStyle={styles.templateList}
                renderItem={({ item }) => {
                  const catColor = CATEGORY_COLORS[item.category || ''] || COLORS.primary
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
                    >
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.templateThumb}
                        resizeMode="contain"
                      />
                      <Text style={styles.templateName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.voiceTip && (
                        <Text style={styles.templateVoiceTip} numberOfLines={1}>💬 {item.voiceTip.slice(0, 15)}...</Text>
                      )}
                      {item.category && (
                        <View style={[styles.templateCategory, { backgroundColor: catColor }]}>
                          <Text style={styles.templateCategoryText}>{item.category}</Text>
                        </View>
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
              <Text style={styles.previewTip}>💬 {longPressTemplate.voiceTip}</Text>
            )}
            {/* 收藏姿势按钮 */}
            <TouchableOpacity
              style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
              onPress={async () => {
                if (!longPressTemplate) return
                const nowFav = await toggleFavoriteTemplate(longPressTemplate.id)
                setIsFavorite(nowFav)
                if (nowFav) {
                  Alert.alert('❤️ 收藏成功', `"${longPressTemplate.name}" 已添加到收藏～`)
                } else {
                  Alert.alert('💔 取消收藏', `"${longPressTemplate.name}" 已从收藏移除`)
                }
              }}
              activeOpacity={0.72}
            >
              <Text style={[styles.favoriteBtnText, isFavorite && styles.favoriteBtnTextActive]}>
                {isFavorite ? '❤️ 已收藏' : '🤍 收藏姿势'}
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
    backgroundColor: 'rgba(255, 80, 80, 0.95)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  cameraErrorText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  cameraErrorClose: {
    color: '#fff',
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
  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  topBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.6)',
  },
  topBtnText: {
    color: '#fff',
    fontSize: 22,
  },
  flashDotOn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFD700',
  },
  flashDotOff: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  modeGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.9)',
  },
  modeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 17,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  // 顶部悬浮姿势引导卡
  autoRecommendBadge: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: COLORS.primary,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  poseTipCard: {
    position: 'absolute',
    top: 116,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  poseTipIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  poseTipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
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
  bottomBar: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    zIndex: 20,
  },
  sideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 32,
  },
  sideBtnIcon: {
    fontSize: 28,
    marginBottom: 3,
  },
  sideBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '500',
  },
  templateBadge: {
    position: 'absolute',
    top: 0,
    right: 8,
    backgroundColor: COLORS.primary,
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
    position: 'relative',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerCapturing: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 0.95 }],
  },
  shutterPulsing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  randomBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  randomBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  categoryTabs: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryTabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  templateCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F5',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  templateThumb: {
    width: SCREEN_W / 2 - 58,
    height: 130,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  templateName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  templateCategory: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  templateCategoryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  templateVoiceTip: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  templateSkeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  templateSkeletonCard: {
    width: '23%',
    margin: '1%',
    aspectRatio: 0.75,
    backgroundColor: COLORS.skeletonBase,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateSkeletonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.skeletonHighlight,
    marginBottom: 6,
  },
  templateSkeletonLabel: {
    width: 40,
    height: 10,
    borderRadius: 4,
    backgroundColor: COLORS.skeletonHighlight,
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
  focusRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.1)',
    zIndex: 50,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    height: 38,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    padding: 0,
  },
  searchClear: {
    color: '#aaa',
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
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '88%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  favoriteBtn: {
    borderWidth: 1.5,
    borderColor: '#FD79A8',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  favoriteBtnActive: {
    backgroundColor: '#FD79A8',
  },
  favoriteBtnText: {
    color: '#FD79A8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  favoriteBtnTextActive: {
    color: '#fff',
  },
  previewUseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  previewUseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
})
