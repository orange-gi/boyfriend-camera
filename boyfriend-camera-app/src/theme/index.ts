/**
 * Design Tokens - 男友相机设计系统
 * 基于 ui-ux-pro-max 方法论，统一所有设计变量
 * 所有颜色、字体、间距、圆角、阴影均通过 tokens 引用，不再硬编码
 */
import { TextStyle } from 'react-native'

// ─────────────────────────────────────────────
// 1. 颜色 tokens
// ─────────────────────────────────────────────
export const colors = {
  // 品牌主色
  primary: '#FF6B6B',
  primaryLight: 'rgba(255,107,107,0.15)',
  primaryDark: '#E85555',

  // 背景
  bg: '#FAFAFA',
  bgCard: '#FFFFFF',
  bgMask: 'rgba(0,0,0,0.5)',
  bgOverlay: 'rgba(0,0,0,0.6)',
  bgOverlayLight: 'rgba(0,0,0,0.4)',
  bgOverlayDark: 'rgba(0,0,0,0.55)',
  bgOverlayXDark: 'rgba(0,0,0,0.8)',

  // 文字
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',
  textOnLight: '#333333',

  // 状态色
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FFB347',
  warningLight: '#FFF8E1',
  danger: '#FF6B6B',
  dangerLight: '#FFF3F3',
  info: '#4ECDC4',

  // 评分色
  scoreGreat: '#4CAF50',
  scoreOk: '#FFB347',
  scoreBad: '#FF6B6B',

  // 分割线 & 边框
  divider: '#EEEEEE',
  border: '#E8E8E8',
  borderLight: '#F0F0F0',

  // Skeleton
  skeletonBase: '#EBEBEB',
  skeletonHighlight: '#F5F5F5',

  // 趋势卡片渐变色（扩展）
  trendSuccessLight: '#C8E6C9',
  trendInfoLight: '#BBDEFB',
  trendWarningLight: '#FFECB3',
  trendDangerLight: '#FFE0E0',

  // 统计卡专用色
  statYellow: '#FFE066',
  statYellowText: '#D4A200',
  statAmber: '#E6A800',

  // 滤镜色（14种）
  filterWarm: '#FF8C00',
  filterCool: '#4A90D9',
  filterVivid: '#FF6B6B',
  filterSoft: '#FFB6C1',
  filterBw: '#888888',
  filterGolden: '#E8A838',
  filterCinematic: '#5B7FA6',
  filterPortrait: '#E8B4C8',
  filterFood: '#FF9A3C',
  filterLandscape: '#5BBF8A',
  filterNight: '#7B68EE',
  filterSunset: '#FF6B6B',
  filterFloral: '#FF69B4',
  filterSnow: '#B0E0FF',

  // 主题渐变色
  gradientWarm: '#FFF8F0',
  gradientPink: '#FFF0F5',
  gradientGold: '#FFF8E1',
  gradientBlue: '#E3F2FD',
  gradientGreen: '#E8F5E9',

  // 分类标签色
  categoryIndoor: '#FF9F43',
  categoryOutdoor: '#4ECDC4',
  categoryFood: '#FFB347',
  categoryStyle: '#A29BFE',
  categoryCouple: '#FD79A8',
  categoryStreet: '#00BCD4',
  categoryPortrait: '#FF6B9D',
  categoryComposition: '#6C5CE7',

  // 遮罩透明度
  blackAlpha10: 'rgba(0,0,0,0.1)',
  blackAlpha20: 'rgba(0,0,0,0.2)',
  blackAlpha30: 'rgba(0,0,0,0.3)',
  blackAlpha40: 'rgba(0,0,0,0.4)',
  blackAlpha50: 'rgba(0,0,0,0.5)',
  blackAlpha60: 'rgba(0,0,0,0.6)',
  blackAlpha65: 'rgba(0,0,0,0.65)',
  blackAlpha80: 'rgba(0,0,0,0.8)',

  whiteAlpha10: 'rgba(255,255,255,0.1)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha30: 'rgba(255,255,255,0.3)',
  whiteAlpha50: 'rgba(255,255,255,0.5)',
  whiteAlpha60: 'rgba(255,255,255,0.6)',
  whiteAlpha80: 'rgba(255,255,255,0.8)',
  whiteAlpha90: 'rgba(255,255,255,0.9)',
  whiteAlpha95: 'rgba(255,255,255,0.95)',
} as const

// ─────────────────────────────────────────────
// 2. 字体 tokens
// ─────────────────────────────────────────────
export const typography = {
  // 字号
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 22,
    '4xl': 24,
    '5xl': 28,
    '6xl': 30,
    '7xl': 36,
  } as const,

  // 行高
  lineHeight: {
    tight: 1.2,
    snug: 1.4,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  } as const,

  // 字重
  fontWeight: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extrabold: '800' as TextStyle['fontWeight'],
  },

  // 间距（基于字号计算）
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const

// ─────────────────────────────────────────────
// 3. 间距 tokens (4px base unit)
// ─────────────────────────────────────────────
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

// ─────────────────────────────────────────────
// 4. 圆角 tokens
// ─────────────────────────────────────────────
export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const

// ─────────────────────────────────────────────
// 5. 阴影 tokens
// ─────────────────────────────────────────────
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  glowSoft: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
} as const

// ─────────────────────────────────────────────
// 6. 组件级别 tokens
// ─────────────────────────────────────────────
export const componentTokens = {
  // 按钮
  button: {
    primary: {
      bg: colors.primary,
      text: colors.textOnPrimary,
      borderRadius: borderRadius.full,
      paddingH: spacing[6],
      paddingV: spacing[4],
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      ...shadows.glow,
    },
    secondary: {
      bg: colors.bgCard,
      text: colors.textSecondary,
      borderRadius: borderRadius['2xl'],
      paddingH: spacing[5],
      paddingV: spacing[3],
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      ...shadows.md,
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
      borderRadius: borderRadius.lg,
      paddingH: spacing[4],
      paddingV: spacing[2],
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
    },
    danger: {
      bg: '#FF4757',
      text: colors.textOnPrimary,
      borderRadius: borderRadius['2xl'],
      paddingH: spacing[5],
      paddingV: spacing[3],
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      ...shadows.md,
    },
  },

  // 卡片
  card: {
    bg: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    ...shadows.md,
  },

  // 输入框
  input: {
    bg: '#F0F0F0',
    borderRadius: borderRadius.md,
    paddingH: spacing[4],
    height: 44,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    placeholderColor: colors.textMuted,
  },

  // 顶部安全区
  safeAreaTop: 56,
  safeAreaBottom: 36,
  modalBorderRadius: borderRadius['3xl'],
} as const

// ─────────────────────────────────────────────
// 7. 动画 tokens
// ─────────────────────────────────────────────
export const animation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
    slowest: 1000,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const

// ─────────────────────────────────────────────
// 兼容旧 COLORS 导出（向后兼容）
// ─────────────────────────────────────────────
export const COLORS = colors
export const SPACING = spacing
export const RADIUS = borderRadius
export const SHADOWS = shadows
export const TYPO = typography
