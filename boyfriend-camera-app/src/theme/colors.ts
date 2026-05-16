/**
 * 主题色 - 统一管理全 app 颜色
 */
export const COLORS = {
  // 主色
  primary: '#FF6B6B',
  primaryLight: 'rgba(255,107,107,0.15)',
  primaryDark: '#E85555',

  // 背景
  bg: '#FAFAFA',
  bgCard: '#FFFFFF',
  bgMask: 'rgba(0,0,0,0.5)',

  // 文字
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  textOnPrimary: '#FFFFFF',

  // 状态
  success: '#4CAF50',
  warning: '#FFB347',
  danger: '#FF6B6B',

  // 评分色
  scoreGreat: '#4CAF50',   // >= 80
  scoreOk: '#FFB347',      // 60-79
  scoreBad: '#FF6B6B',     // < 60

  // 分割
  divider: '#EEEEEE',

  // 滤镜
  filterWarm: '#FF8C00',
  filterCool: '#4A90D9',
  filterVivid: '#FF6B6B',
  filterSoft: '#FFB6C1',
  filterBw: '#888888',
} as const

/** 根据分数返回对应颜色 */
export function scoreColor(score: number): string {
  if (score >= 80) return COLORS.scoreGreat
  if (score >= 60) return COLORS.scoreOk
  return COLORS.scoreBad
}

/** 根据分数返回等级文案 */
export function scoreLabel(score: number): string {
  if (score >= 90) return '💯 完美'
  if (score >= 80) return '🌟 优秀'
  if (score >= 70) return '👍 良好'
  if (score >= 60) return '😊 及格'
  return '💪 加油'
}
