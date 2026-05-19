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

/** 分类色板（统一使用此处定义，各页面不再重复定义）
 * 所有颜色值来自 theme/index.ts 设计 tokens
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '室内日常': tokens.colors.categoryIndoor,
  '室内场景': tokens.colors.categoryIndoor,
  '室内人像': tokens.colors.categoryIndoor,
  '户外风景': tokens.colors.categoryOutdoor,
  '餐厅美食': tokens.colors.categoryFood,
  '特殊风格': tokens.colors.categoryStyle,
  '情侣合照': tokens.colors.categoryCouple,
  '城市街拍': tokens.colors.categoryStreet,
  '自拍技巧': tokens.colors.categoryPortrait,
  '构图技巧': tokens.colors.categoryComposition,
}
