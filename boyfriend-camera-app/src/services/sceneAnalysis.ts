/**
 * sceneAnalysis - 取景场景/光线分析
 *
 * MVP：时间 + 可选帧亮度启发式。
 * 后续：在 VisionCamera Frame Processor 中传入 frameBrightness 即可升级精度。
 */

export type SceneType = 'indoor' | 'outdoor' | 'night' | 'unknown'
export type LightingType = 'dark' | 'normal' | 'bright' | 'backlit' | 'unknown'

export interface SceneContext {
  scene: SceneType
  lighting: LightingType
  /** 帧平均亮度 0-255，来自 Frame Processor 时填入 */
  frameBrightness?: number
}

export interface SceneAnalysisInput {
  frameBrightness?: number
  hour?: number
}

/** 根据帧亮度推断光线（有帧数据时优先） */
function lightingFromBrightness(brightness: number): LightingType {
  if (brightness < 50) return 'dark'
  if (brightness > 200) return 'bright'
  if (brightness >= 120 && brightness <= 200) return 'normal'
  return 'backlit'
}

/** 无相机帧时的启发式（打开相机瞬间） */
function heuristicContext(hour: number): SceneContext {
  if (hour >= 19 || hour < 6) {
    return { scene: 'night', lighting: 'dark' }
  }
  if (hour >= 10 && hour < 16) {
    return { scene: 'outdoor', lighting: 'normal' }
  }
  return { scene: 'indoor', lighting: 'normal' }
}

export function detectSceneContext(input: SceneAnalysisInput = {}): SceneContext {
  const hour = input.hour ?? new Date().getHours()

  if (input.frameBrightness !== undefined) {
    const lighting = lightingFromBrightness(input.frameBrightness)
    let scene: SceneType = 'unknown'
    if (lighting === 'dark') scene = 'night'
    else if (lighting === 'bright') scene = 'outdoor'
    else scene = hour >= 8 && hour < 18 ? 'outdoor' : 'indoor'
    return { scene, lighting, frameBrightness: input.frameBrightness }
  }

  return heuristicContext(hour)
}
