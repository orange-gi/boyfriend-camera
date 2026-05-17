/**
 * EmptyState - 空状态通用组件
 * 支持预设类型（网络错误、拍照失败、无结果等），也可完全自定义
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { COLORS } from '../../theme/colors'

/** 预设空状态类型 */
export type EmptyStateType =
  | 'default'    // 默认空状态
  | 'network'    // 网络错误
  | 'capture'   // 拍照失败
  | 'noResult'   // 无推荐结果
  | 'template'   // 模板加载失败

/** 各预设类型的默认内容 */
const PRESETS: Record<EmptyStateType, { icon: string; title: string; subtitle?: string; actionLabel?: string }> = {
  default: {
    icon: '📭',
    title: '这里空空如也',
    subtitle: '暂无内容',
  },
  network: {
    icon: '📶',
    title: '网络不给力',
    subtitle: '请检查网络连接后重试',
    actionLabel: '重新加载',
  },
  capture: {
    icon: '📷',
    title: '拍照遇到点小状况',
    subtitle: '可以试试重启相机或换个角度',
    actionLabel: '重新拍照',
  },
  noResult: {
    icon: '🔍',
    title: '没有找到合适的模板',
    subtitle: '试试换个场景或手动选择一个模板',
    actionLabel: '查看全部模板',
  },
  template: {
    icon: '📋',
    title: '模板加载失败',
    subtitle: '请检查网络后重新加载',
    actionLabel: '重试',
  },
}

interface PresetProps {
  type: EmptyStateType
  onAction?: () => void
  /** 覆盖预设操作按钮文字 */
  actionLabel?: string
}

interface CustomProps {
  icon?: string
  title: string
  subtitle?: string
  action?: { label: string; onPress: () => void }
  type?: never
}

type Props = PresetProps | CustomProps

function isPreset(props: Props): props is PresetProps {
  return 'type' in props && props.type !== undefined
}

export default function EmptyState(props: Props) {
  let icon: string
  let title: string
  let subtitle: string | undefined
  let action: { label: string; onPress: () => void } | undefined

  if (isPreset(props)) {
    const preset = PRESETS[props.type] ?? PRESETS.default
    icon = preset.icon
    title = preset.title
    subtitle = preset.subtitle
    if (props.onAction) {
      action = {
        label: props.actionLabel ?? preset.actionLabel ?? '重试',
        onPress: props.onAction,
      }
    }
  } else {
    icon = props.icon ?? '📭'
    title = props.title
    subtitle = props.subtitle
    action = props.action
  }

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
