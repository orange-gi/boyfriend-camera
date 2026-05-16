/**
 * LoadingOverlay - 加载遮罩通用组件
 */
import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { COLORS } from '../../theme/colors'

interface Props {
  message?: string
  visible?: boolean
}

export default function LoadingOverlay({ message = '加载中...', visible = true }: Props) {
  if (!visible) return null
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
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
})
