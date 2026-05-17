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
  const manualOverride = useRef(false)
  const didAutoRecommend = useRef(false)

  useEffect(() => {
    if (!enabled || templates.length === 0) return
    if (manualOverride.current || didAutoRecommend.current) return

    const ctx = detectSceneContext()
    const pick = recommendTemplate(templates, ctx)
    if (!pick) return

    didAutoRecommend.current = true
    setContext(ctx)
    setRecommended(pick)
    onRecommended?.(pick, ctx)
  }, [templates, enabled, onRecommended])

  const markManual = useCallback(() => {
    manualOverride.current = true
  }, [])

  const resetAuto = useCallback(() => {
    manualOverride.current = false
    didAutoRecommend.current = false
    setRecommended(null)
    setContext(null)
  }, [])

  const recommendNow = useCallback(() => {
    if (templates.length === 0) return null
    const ctx = detectSceneContext()
    const pick = recommendTemplate(templates, ctx)
    if (!pick) return null
    didAutoRecommend.current = true
    setContext(ctx)
    setRecommended(pick)
    onRecommended?.(pick, ctx)
    return pick
  }, [templates, onRecommended])

  const updateFromFrame = useCallback(
    (frameBrightness: number) => {
      if (manualOverride.current || templates.length === 0) return
      const ctx = detectSceneContext({ frameBrightness })
      const pick = recommendTemplate(templates, ctx)
      if (!pick) return
      setContext(ctx)
      setRecommended(pick)
      onRecommended?.(pick, ctx)
    },
    [templates, onRecommended]
  )

  return {
    recommended,
    context,
    markManual,
    resetAuto,
    recommendNow,
    updateFromFrame,
    isAutoRecommended: recommended !== null && !manualOverride.current,
  }
}
