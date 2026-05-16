/**
 * CameraScreen - 拍照页
 * 使用 react-native-vision-camera v5 API
 */
import React, { useState, useCallback, useRef, useEffect } from 'react'
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
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import CompositionLines from '../components/camera/CompositionLines'
import PoseTemplateOverlay, { type PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import StabilityIndicator from '../components/camera/StabilityIndicator'
import VoiceCoach from '../components/camera/VoiceCoach'
import { useTemplates } from '../hooks/useTemplates'
import { useStability } from '../hooks/useStability'
import { takePhoto } from '../components/camera/CameraView'

type CompositionMode = 'grid' | 'golden' | 'triangle'

const { width: SCREEN_W } = Dimensions.get('window')

export default function CameraScreen({ navigation }: any) {
  const [mode, setMode] = useState<CompositionMode>('grid')
  const [activeTemplate, setActiveTemplate] = useState<PoseTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showVoiceTip, setShowVoiceTip] = useState(false)
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isActive, setIsActive] = useState(true)

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

  const cycleFlash = useCallback(() => {
    const modes: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto']
    const idx = (modes.indexOf(flash) + 1) % modes.length
    setFlash(modes[idx])
  }, [flash])

  const flashLabel = flash === 'off' ? '📷' : flash === 'on' ? '⚡' : '🔄'

  return (
    <View style={styles.container}>
      {/* 相机预览 */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.cameraWrapper}>
          {/* CameraView is used as a component in the stack */}
        </View>
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
        <TouchableOpacity style={styles.topBtn} onPress={cycleFlash}>
          <Text style={styles.topBtnText}>{flashLabel}</Text>
        </TouchableOpacity>

        <View style={styles.modeGroup}>
          {(['grid', 'golden', 'triangle'] as CompositionMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'grid' ? '▦' : m === 'golden' ? '◎' : '△'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setActiveTemplate(null)}
        >
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 底部控制栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => setShowTemplateModal(true)}
        >
          <Text style={styles.sideBtnIcon}>📐</Text>
          <Text style={styles.sideBtnText}>姿势</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutter, isCapturing && styles.shutterDisabled]}
          onPress={handleTakePhoto}
          disabled={isCapturing}
          activeOpacity={0.7}
        >
          <View style={[styles.shutterInner, isCapturing && styles.shutterInnerCapturing]} />
        </TouchableOpacity>

        <View style={styles.sideBtn}>
          <Text style={styles.sideBtnIcon}>🖼️</Text>
          <Text style={styles.sideBtnText}>相册</Text>
        </View>
      </View>

      {/* 姿势模板选择弹窗 */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📐 选择姿势</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {templatesLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>加载模板中...</Text>
              </View>
            ) : templates.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>暂无模板，请检查网络</Text>
              </View>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.templateRow}
                contentContainerStyle={styles.templateList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.templateCard,
                      activeTemplate?.id === item.id && styles.templateCardActive,
                    ]}
                    onPress={() => handleSelectTemplate(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.templateThumb}
                      resizeMode="contain"
                    />
                    <Text style={styles.templateName}>{item.name}</Text>
                    {item.category && (
                      <View style={styles.templateCategory}>
                        <Text style={styles.templateCategoryText}>{item.category}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnText: {
    color: '#fff',
    fontSize: 18,
  },
  modeGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.85)',
  },
  modeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  modeBtnTextActive: {
    color: '#fff',
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
    width: 60,
  },
  sideBtnIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sideBtnText: {
    color: '#fff',
    fontSize: 11,
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  shutterInnerCapturing: {
    backgroundColor: '#FF6B6B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 20,
    color: '#999',
  },
  templateList: {
    padding: 16,
  },
  templateRow: {
    gap: 12,
    marginBottom: 12,
  },
  templateCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardActive: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  templateThumb: {
    width: SCREEN_W / 2 - 48,
    height: 140,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  templateName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
  },
  templateCategory: {
    backgroundColor: '#FF6B6B',
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
