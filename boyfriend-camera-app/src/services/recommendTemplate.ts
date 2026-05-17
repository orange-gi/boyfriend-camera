/**
 * recommendTemplate - 根据场景/光线推荐姿势模板
 */
import type { PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import type { SceneContext } from './sceneAnalysis'

/** 场景 → 优先匹配的模板分类 */
const SCENE_CATEGORY_MAP: Record<string, string[]> = {
  indoor: ['室内日常', '室内场景', '餐厅美食', '情侣合照'],
  outdoor: ['户外风景', '特殊风格'],
  night: ['室内日常', '室内场景', '特殊风格'],
  unknown: ['室内日常', '户外风景'],
}

/** 光线 → 优先匹配的模板分类（光线适配分类） */
const LIGHTING_CATEGORY_MAP: Record<string, string[]> = {
  dark: ['特殊风格', '室内场景'],    // 暗光环境适合夜景/室内氛围
  normal: ['室内日常', '户外风景'],   // 正常光线下各类都适合
  bright: ['户外风景', '特殊风格'],  // 明亮户外适合风景
  backlit: ['室内日常', '室内场景'], // 逆光场景适合室内
  unknown: [],
}

function scoreTemplate(template: PoseTemplate, ctx: SceneContext): number {
  let score = 0
  // 场景匹配基础分
  const sceneCategories = SCENE_CATEGORY_MAP[ctx.scene] ?? SCENE_CATEGORY_MAP.unknown
  if (template.category && sceneCategories.includes(template.category)) {
    score += 10
  }
  // 光线匹配额外加分
  const lightingCategories = LIGHTING_CATEGORY_MAP[ctx.lighting] ?? []
  if (template.category && lightingCategories.includes(template.category)) {
    score += 5
  }
  return score
}

/**
 * 从模板列表中选出最匹配当前场景的一个
 */
export function recommendTemplate(
  templates: PoseTemplate[],
  context: SceneContext
): PoseTemplate | null {
  if (templates.length === 0) return null

  const ranked = [...templates]
    .map((t) => ({ template: t, score: scoreTemplate(t, context) }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (!best || best.score <= 0) {
    return templates[0]
  }
  return best.template
}
