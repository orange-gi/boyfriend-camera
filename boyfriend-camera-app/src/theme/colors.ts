/**
 * 主题色 - 向后兼容导出层
 * 新代码请直接从 'src/theme/index.ts' 导入
 *   import { colors, typography, spacing, borderRadius, shadows } from '../theme'
 */
import { colors } from './index'

// 向后兼容别名
export const COLORS = colors

/** 根据分数返回对应颜色 */
export function scoreColor(score: number): string {
  if (score >= 80) return colors.scoreGreat
  if (score >= 60) return colors.scoreOk
  return colors.scoreBad
}

/** 根据分数返回等级文案（无 emoji，简洁克制） */
export function scoreLabel(score: number): string {
  if (score >= 90) return '完美'
  if (score >= 80) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 60) return '及格'
  return '继续加油'
}

/** 分类色板（统一使用此处定义，各页面不再重复定义）
 * 所有颜色值来自 theme/index.ts 设计 tokens
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '室内日常': colors.categoryIndoor,
  '室内场景': colors.categoryIndoor,
  '室内人像': colors.categoryIndoor,
  '户外风景': colors.categoryOutdoor,
  '人文风景': colors.categoryOutdoor,
  '夜景': colors.purple,
  '餐厅美食': colors.categoryFood,
  '特殊风格': colors.categoryStyle,
  '情侣合照': colors.categoryCouple,
  '城市街拍': colors.categoryStreet,
  '自拍技巧': colors.categoryPortrait,
  '构图技巧': colors.categoryComposition,
  '节日限定': colors.warning,
  '运动健身': colors.success,
}
