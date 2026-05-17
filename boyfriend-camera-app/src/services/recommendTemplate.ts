/**
 * recommendTemplate - 根据场景/光线推荐姿势模板
 */
import type { PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import type { SceneContext } from './sceneAnalysis'

/** 场景 → 优先匹配的模板分类 */
const SCENE_CATEGORY_MAP: Record<string, string[]> = {
  indoor: ['室内日常', '餐厅美食', '情侣合照'],
  outdoor: ['户外风景', '特殊风格'],
  night: ['室内日常', '餐厅美食'],
  unknown: ['室内日常', '户外风景'],
}

/** 光线 → 优先模板 id（内置 fallback） */
const LIGHTING_TEMPLATE_IDS: Record<string, string[]> = {
  dark: ['local_003', 'local_006'],
  normal: ['local_001', 'local_002'],
  bright: ['local_005', 'local_006'],
  backlit: ['local_004', 'local_001'],
  unknown: ['local_001'],
}

function scoreTemplate(template: PoseTemplate, ctx: SceneContext): number {
  let score = 0
  const categories = SCENE_CATEGORY_MAP[ctx.scene] ?? SCENE_CATEGORY_MAP.unknown
  if (template.category && categories.includes(template.category)) {
    score += 10
  }
  const preferredIds = LIGHTING_TEMPLATE_IDS[ctx.lighting] ?? LIGHTING_TEMPLATE_IDS.unknown
  const idRank = preferredIds.indexOf(template.id)
  if (idRank >= 0) score += 8 - idRank
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
