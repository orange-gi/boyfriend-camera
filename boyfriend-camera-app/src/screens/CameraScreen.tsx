/**
 * CameraScreen - 拍照页
 * 整合所有拍照辅助功能
 */
import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import CameraView from '../components/camera/CameraView'
import CompositionLines from '../components/camera/CompositionLines'
import PoseTemplateOverlay from '../components/camera/PoseTemplateOverlay'
import StabilityIndicator from '../components/camera/StabilityIndicator'
import { useTemplates } from '../hooks/useTemplates'
import { useStability } from '../hooks/useStability'

type CompositionMode = 'grid' | 'golden' | 'triangle'

export default function CameraScreen({ navigation }: any) {
  const [mode, setMode] = useState<CompositionMode>('grid')
  const [activeTemplate, setActiveTemplate] = useState<any>(null)
  const { templates } = useTemplates()
  const stability = useStability()

  const handleTakePhoto = useCallback(() => {
    // TODO: 拍照 → 处理 → 跳转结果页
    console.log('[CameraScreen] 拍照', stability)
    navigation.navigate('Result', {
      photoPath: '/tmp/photo.jpg',
    })
  }, [stability])

  const handleSelectTemplate = useCallback(() => {
    // TODO: 弹出模板选择卡片
    if (templates.length > 0) {
      setActiveTemplate(templates[0])
    } else {
      Alert.alert('提示', '暂无模板，请检查网络连接')
    }
  }, [templates])

  return (
    <View style={styles.container}>
      {/* 相机预览 */}
      <CameraView />

      {/* 构图线 */}
      <CompositionLines mode={mode} />

      {/* 姿势模板 */}
      <PoseTemplateOverlay template={activeTemplate} />

      {/* 稳定性指示 */}
      <StabilityIndicator
        tiltX={stability.tiltX}
        tiltY={stability.tiltY}
        shakeLevel={stability.shakeLevel}
      />

      {/* 顶部: 构图模式切换 */}
      <View style={styles.topBar}>
        {(['grid', 'golden', 'triangle'] as CompositionMode[]).map(m => (
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

      {/* 底部控制栏 */}
      <View style={styles.bottomBar}>
        {/* 姿势模板按钮 */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleSelectTemplate}>
          <Text style={styles.sideBtnText}>📐 姿势</Text>
        </TouchableOpacity>

        {/* 拍照按钮 */}
        <TouchableOpacity style={styles.shutter} onPress={handleTakePhoto}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* 占位 */}
        <View style={styles.sideBtn} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.8)',
  },
  modeBtnText: {
    color: '#fff',
    fontSize: 20,
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
  },
  sideBtn: {
    width: 60,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnText: {
    color: '#fff',
    fontSize: 14,
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
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
})
