/**
 * PoseTemplateOverlay - 姿势剪影模板
 * 可拖动、缩放的半透明 SVG 剪影叠加
 * 使用 Image 加载 data URI，支持 PanResponder 拖动 + pinch 缩放
 */
import React, { useRef, useState, useEffect } from 'react'
import { colors } from '../../theme'
import {
  View,
  StyleSheet,
  Image,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native'

export interface PoseTemplate {
  id: string
  name: string
  description?: string
  thumbnail: string
  overlayUrl: string
  voiceTip: string
  category?: string
  version?: number
}

interface Props {
  template: PoseTemplate | null
  onTipPress?: (tip: string) => void
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

export default function PoseTemplateOverlay({ template, onTipPress }: Props) {
  const [scale, setScale] = useState(1.0)

  // 拖动状态
  const pan = useRef(new Animated.ValueXY()).current
  const lastScale = useRef(1.0)
  const lastOffset = useRef({ x: 0, y: 0 })
  const [panOffset] = useState({ x: 0, y: 0 })
  // 监听器 ID ref，用于清理
  const listenerId = useRef<string | null>(null)

  // listener cleanup：组件卸载时移除所有监听，防止内存泄漏
  useEffect(() => {
    return () => {
      pan.removeAllListeners()
      if (listenerId.current !== null) {
        pan.removeListener(listenerId.current)
      }
    }
  }, [])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        pan.setOffset({
          x: lastOffset.current.x,
          y: lastOffset.current.y,
        })
        pan.setValue({ x: 0, y: 0 })
      },

      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy })
      },

      onPanResponderRelease: () => {
        pan.flattenOffset()
        // flattenOffset 后，用一次性监听读取最终位置
        if (listenerId.current !== null) pan.removeListener(listenerId.current)
        listenerId.current = pan.addListener((v: { x?: unknown; y?: unknown }) => {
          lastOffset.current = { x: Number(v.x ?? 0), y: Number(v.y ?? 0) }
          setPanOffset(lastOffset.current)
          pan.removeListener(listenerId.current!)
          listenerId.current = null
        })
      },
    })
  ).current

  // 双击重置
  const handleDoubleTap = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start()
    setScale(1.0)
    lastScale.current = 1.0
  }

  // 缩放增量（通过改变宽度实现粗略缩放）
  const handlePinch = (direction: 'in' | 'out') => {
    const newScale = direction === 'in'
      ? Math.min(lastScale.current * 1.2, 2.5)
      : Math.max(lastScale.current * 0.8, 0.4)
    lastScale.current = newScale
    setScale(newScale)
  }

  if (!template) return null

  const imageSize = Math.min(SCREEN_W * 0.7, SCREEN_H * 0.5)
  const scaledWidth = imageSize * scale
  const scaledHeight = (imageSize * scale * 1.5) // 高宽比 2:3

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* 拖动手势区域 */}
      <Animated.View
        style={[
          styles.templateContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleDoubleTap}
          delayLongPress={300}
        >
          <Image
            source={{ uri: template.overlayUrl }}
            style={{
              width: scaledWidth,
              height: scaledHeight,
            }}
            resizeMode="contain"
            fadeDuration={200}
          />
        </TouchableOpacity>

        {/* 模板名称标签 */}
        <View style={styles.nameTag}>
          <Text style={styles.nameTagText}>{template.name}</Text>
        </View>
      </Animated.View>

      {/* 缩放控制 */}
      <View style={styles.scaleControls} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.scaleBtn}
          onPress={() => handlePinch('out')}
          activeOpacity={0.7}
        >
          <Text style={styles.scaleBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scaleBtn}
          onPress={() => handlePinch('in')}
          activeOpacity={0.7}
        >
          <Text style={styles.scaleBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 语音提示气泡 */}
      {template.voiceTip && (
        <View style={styles.voiceTipBubble} pointerEvents="box-none">
          <Text style={styles.voiceTipText}>💬 {template.voiceTip}</Text>
          {onTipPress && (
            <TouchableOpacity
              style={styles.voiceTipBtn}
              onPress={() => onTipPress(template.voiceTip)}
            >
              <Text style={styles.voiceTipBtnText}>朗读</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  templateContainer: {
    position: 'absolute',
    left: SCREEN_W * 0.15,
    top: SCREEN_H * 0.1,
    alignItems: 'center',
  },
  nameTag: {
    backgroundColor: 'rgba(255,107,107,0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'center',
  },
  nameTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scaleControls: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    gap: 8,
  },
  scaleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  voiceTipBubble: {
    position: 'absolute',
    bottom: 220,
    left: 16,
    right: 60,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceTipText: {
    flex: 1,
    color: '#333',
    fontSize: 13,
    lineHeight: 18,
  },
  voiceTipBtn: {
    marginLeft: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  voiceTipBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
})
