/**
 * LoadingOverlay - 加载遮罩通用组件
 */
import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { COLORS } from '../../theme/colors'

interface Props {
  message?: string
  visible?: boolean
  /** 可选取消回调，例如加载太久时让用户主动取消 */
  onCancel?: () => void
  cancelLabel?: string
}

export default function LoadingOverlay({ message = '加载中...', visible = true, onCancel, cancelLabel = '取消' }: Props) {
  if (!visible) return null
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    padding: 40,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  cancelBtn: {
    marginTop: 20,
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
