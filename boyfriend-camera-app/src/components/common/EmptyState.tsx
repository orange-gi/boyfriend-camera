/**
 * EmptyState - 空状态通用组件
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { COLORS } from '../../theme/colors'

interface Props {
  icon?: string
  title: string
  subtitle?: string
  action?: { label: string; onPress: () => void }
}

export default function EmptyState({ icon = '📭', title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={styles.btn} onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.btnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  btnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
})
