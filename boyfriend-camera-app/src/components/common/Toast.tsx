/**
 * Toast - 轻量级 Toast 通知组件
 * 用于操作反馈：保存成功、分享成功、网络错误等
 */
import React, { useEffect, useRef } from 'react'
import { Text, StyleSheet, Animated } from 'react-native'


interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  visible: boolean
  onHide: () => void
  duration?: number
}

export default function Toast({ message, type = 'info', visible, onHide, duration = 2000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 14, stiffness: 120, useNativeDriver: true }),
      ]).start()

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide())
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!visible) return null

  const bgMap = {
    success: 'rgba(40, 167, 69, 0.95)',
    error: 'rgba(220, 53, 69, 0.95)',
    info: 'rgba(33, 37, 41, 0.92)',
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgMap[type], opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 9999,
    // 简洁优雅极致：去阴影装饰，颜色对比已足够承载视觉层级
  },
  message: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
})

// 全局 Toast 调用接口（需配合 Context 使用）
// 在 App 中使用：<ToastContext.Consumer>{toast => toast?.show('保存成功', 'success')}</ToastContext.Consumer>
