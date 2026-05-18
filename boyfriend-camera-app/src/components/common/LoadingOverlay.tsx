/**
 * LoadingOverlay - 加载遮罩通用组件 v2
 * 改进：进度百分比、步骤提示、子标题
 */
import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native'
import { COLORS } from '../../theme/colors'

interface Props {
  message?: string
  /** 步骤提示，如 "正在加载模板 3/80" */
  stepMessage?: string
  /** 进度百分比（0-100），显示进度条 */
  progress?: number
  visible?: boolean
  /** 可选取消回调 */
  onCancel?: () => void
  cancelLabel?: string
  /** 图标表情 */
  icon?: string
}

export default function LoadingOverlay({
  message = '加载中...',
  stepMessage,
  progress,
  visible = true,
  onCancel,
  cancelLabel = '取消',
  icon = '📸',
}: Props) {
  if (!visible) return null

  const hasProgress = progress !== undefined && progress >= 0

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>{icon}</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
        <Text style={styles.text}>{message}</Text>
        {stepMessage && <Text style={styles.step}>{stepMessage}</Text>}
        {hasProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  spinner: {
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  step: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    minWidth: 28,
    textAlign: 'right',
  },
  cancelBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  cancelBtnText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
})
