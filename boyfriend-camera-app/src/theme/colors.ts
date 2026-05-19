/**
 * 主题色 - 统一管理全 app 颜色
 * @deprecated 请使用 src/theme/index.ts 中的设计系统 tokens
 * 新代码请从 'src/theme' 导入 colors/typography/spacing/shadows 等
 */
import * as tokens from './index'

export const COLORS = tokens.colors
export const typography = tokens.typography
export const spacing = tokens.spacing
export const borderRadius = tokens.borderRadius
export const shadows = tokens.shadows
export const componentTokens = tokens.componentTokens

/** 根据分数返回对应颜色 */
export function scoreColor(score: number): string {
  if (score >= 80) return tokens.colors.scoreGreat
  if (score >= 60) return tokens.colors.scoreOk
  return tokens.colors.scoreBad
}

/** 根据分数返回等级文案 */
export function scoreLabel(score: number): string {
  if (score >= 90) return '💯 完美'
  if (score >= 80) return '🌟 优秀'
  if (score >= 70) return '👍 良好'
  if (score >= 60) return '😊 及格'
  return '💪 加油'
}

/** 分类色板（统一使用此处定义，各页面不再重复定义） */
export const CATEGORY_COLORS: Record<string, string> = {
  '室内日常': '#FF6B6B',
  '室内场景': '#FF9F43',
  '室内人像': '#FF9F43',
  '户外风景': '#4CAF50',
  '餐厅美食': '#FFB347',
  '特殊风格': '#A29BFE',
  '情侣合照': '#FD79A8',
  '城市街拍': '#00BCD4',
  '自拍技巧': '#FF6B9D',
  '构图技巧': '#6C5CE7',
}
