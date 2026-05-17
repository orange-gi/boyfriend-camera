/**
 * useSceneRecommendation - 进入相机页时智能推荐模板（可手动覆盖）
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type { PoseTemplate } from '../components/camera/PoseTemplateOverlay'
import { detectSceneContext, type SceneContext } from '../services/sceneAnalysis'
import { recommendTemplate } from '../services/recommendTemplate'

interface Options {
  templates: PoseTemplate[]
  enabled?: boolean
  onRecommended?: (template: PoseTemplate, context: SceneContext) => void
}

export function useSceneRecommendation({
  templates,
  enabled = true,
  onRecommended,
}: Options) {
  const [recommended, setRecommended] = useState<PoseTemplate | null>(null)
  const [context, setContext] = useState<SceneContext | null>(null)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const manualOverride = useRef(false)
  const didAutoRecommend = useRef(false)

  useEffect(() => {
    if (!enabled || templates.length === 0) return
    if (manualOverride.current || didAutoRecommend.current) return
    setRecommendationError(null)

    try {
      const ctx = detectSceneContext()
      const pick = recommendTemplate(templates, ctx)
      if (!pick) {
        // 推荐结果为空时记录兜底提示，不崩溃
        setRecommendationError('暂无合适模板，手动选择吧～')
        return
      }

      didAutoRecommend.current = true
      setContext(ctx)
      setRecommended(pick)
      onRecommended?.(pick, ctx)
    } catch (e) {
      // 场景分析或推荐异常不传播，优雅降级
      setRecommendationError('场景分析失败，手动选择模板吧～')
    }
  }, [templates, enabled, onRecommended])

  const markManual = useCallback(() => {
    manualOverride.current = true
  }, [])

  const resetAuto = useCallback(() => {
    manualOverride.current = false
    didAutoRecommend.current = false
    setRecommended(null)
    setContext(null)
    setRecommendationError(null)
  }, [])

  const recommendNow = useCallback(() => {
    if (templates.length === 0) return null
    try {
      const ctx = detectSceneContext()
      const pick = recommendTemplate(templates, ctx)
      if (!pick) {
        setRecommendationError('暂无合适模板，手动选择吧～')
        return null
      }
      didAutoRecommend.current = true
      setContext(ctx)
      setRecommended(pick)
      onRecommended?.(pick, ctx)
      return pick
    } catch (e) {
      setRecommendationError('推荐失败，手动选择模板吧～')
      return null
    }
  }, [templates, onRecommended])

  const updateFromFrame = useCallback(
    (frameBrightness: number) => {
      if (manualOverride.current || templates.length === 0) return
      try {
        const ctx = detectSceneContext({ frameBrightness })
        const pick = recommendTemplate(templates, ctx)
        if (!pick) return
        setContext(ctx)
        setRecommended(pick)
        onRecommended?.(pick, ctx)
      } catch {
        // 帧更新时静默降级，不打扰用户
      }
    },
    [templates, onRecommended]
  )

  return {
    recommended,
    context,
    recommendationError,
    markManual,
    resetAuto,
    recommendNow,
    updateFromFrame,
    isAutoRecommended: recommended !== null && !manualOverride.current,
  }
}
