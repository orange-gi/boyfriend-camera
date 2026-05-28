/**
 * ActionButton - 通用操作按钮
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 * size: 'sm' | 'md' | 'lg'
 */
import React from 'react'
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { COLORS } from '../../theme/colors'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  title: string
  variant?: Variant
  size?: Size
  icon?: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: COLORS.primary,
      borderWidth: 0,
    },
    text: { color: COLORS.textOnPrimary, fontWeight: 'bold' },
  },
  secondary: {
    container: {
      backgroundColor: COLORS.bgCard,
      borderWidth: 1.5,
      borderColor: COLORS.divider,
    },
    text: { color: COLORS.textSecondary, fontWeight: '600' },
  },
  danger: {
    container: {
      backgroundColor: COLORS.danger,
      borderWidth: 0,
    },
    text: { color: COLORS.textOnPrimary, fontWeight: 'bold' },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    text: { color: COLORS.primary, fontWeight: '600' },
  },
}

const sizeStyles: Record<Size, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
    text: { fontSize: 13 },
  },
  md: {
    container: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 },
    text: { fontSize: 15 },
  },
  lg: {
    container: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 24 },
    text: { fontSize: 17 },
  },
}

export default function ActionButton({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: Props) {
  const vStyle = variantStyles[variant]
  const sStyle = sizeStyles[size]

  const containerStyle: ViewStyle = {
    ...styles.container,
    ...vStyle.container,
    ...sStyle.container,
    ...(fullWidth ? { width: '100%' } : {}),
    ...(disabled ? { opacity: 0.5 } : {}),
    ...(style as ViewStyle),
  }

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vStyle.text.color as string} />
      ) : (
        <Text style={[styles.text, vStyle.text, sStyle.text]}>
          {icon ? `${icon} ${title}` : title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
  },
})
