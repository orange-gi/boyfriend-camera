/**
 * 主题色 - 向后兼容导出层
 * 新代码请直接从 'src/theme/index.ts' 导入
 *   import { COLORS, scoreColor, scoreLabel, scoreGrade } from '../theme'
 */
import { colors, scoreColor, scoreLabel, scoreGrade } from './index'

// 向后兼容别名
export const COLORS = colors

// 从 index.ts 统一导出，不再重复定义
// scoreColor / scoreLabel / scoreGrade 已移至 theme/index.ts

export { scoreColor, scoreLabel, scoreGrade }

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
  '复古胶片': colors.purple,
  '温泉': colors.categoryStyle,
  '滑雪': colors.categoryOutdoor,
}
