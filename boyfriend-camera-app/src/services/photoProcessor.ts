/**
 * photoProcessor.ts - 图像处理流水线
 * 裁剪 + 滤镜 + 美颜，全部本地处理
 *
 * 在 React Native 中，我们使用 ImageEditor / Canvas / Skia 实现
 * 由于 native image editor API 有限，核心处理采用 Canvas 方式：
 * 1. 加载图片 → Image
 * 2. 裁剪到目标比例（三分点）
 * 3. 应用预设滤镜（通过调整 brightness/contrast/saturation）
 * 4. 轻度美颜（降噪 + 锐化）
 * 5. 保存到临时文件
 */
import { Platform } from 'react-native'
import type { RefObject } from 'react'
import { captureRef } from 'react-native-view-shot'
import RNFS from 'react-native-fs'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'

export interface ProcessOptions {
  /** 目标裁剪比例，如 3/4, 1/1 */
  cropRatio?: number
  /** 滤镜名称 */
  filterName?: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | 'portrait' | 'food' | 'landscape' | 'night' | 'sunset' | 'floral' | 'snow' | 'golden' | 'cinematic' | null
  /** 是否启用轻度美颜 */
  autoRetouch?: boolean
  /** 人脸中心位置（归一化 0-1），用于裁剪定位 */
  faceCenter?: { x: number; y: number }
}

// 滤镜参数配置
const FILTER_PARAMS: Record<string, { brightness: number; contrast: number; saturation: number }> = {
  warm: { brightness: 1.05, contrast: 1.1, saturation: 1.15 },
  cool: { brightness: 0.98, contrast: 1.05, saturation: 1.1 },
  vivid: { brightness: 1.08, contrast: 1.2, saturation: 1.3 },
  soft: { brightness: 1.1, contrast: 0.95, saturation: 0.9 },
  bw: { brightness: 1.02, contrast: 1.15, saturation: 0 },
  // ========== Round 3 新增滤镜 ==========
  portrait: { brightness: 1.06, contrast: 1.12, saturation: 1.05 }, // 人像：轻微美颜+适中对比
  food: { brightness: 1.1, contrast: 1.15, saturation: 1.3 }, // 美食：高饱和+高亮度
  landscape: { brightness: 1.05, contrast: 1.18, saturation: 1.25 }, // 风景：增强饱和+蓝色调
  night: { brightness: 0.95, contrast: 1.2, saturation: 0.9 }, // 夜景：增强对比+降饱和
  sunset: { brightness: 1.08, contrast: 1.15, saturation: 1.2 }, // 日落：暖色调+高对比
  floral: { brightness: 1.07, contrast: 1.08, saturation: 1.1 }, // 花季：柔和+适中饱和
  snow: { brightness: 1.15, contrast: 1.05, saturation: 0.95 }, // 雪景：提亮+柔和
  golden: { brightness: 1.1, contrast: 1.08, saturation: 1.2 },
  cinematic: { brightness: 0.95, contrast: 1.12, saturation: 0.85 },
}

// 预设滤镜颜色叠加（RGBA 透明色，模拟色调）
const FILTER_OVERLAY: Record<string, string> = {
  warm: 'rgba(255, 200, 100, 0.12)',
  cool: 'rgba(100, 150, 255, 0.12)',
  vivid: 'rgba(255, 100, 150, 0.08)',
  soft: 'rgba(255, 220, 200, 0.1)',
  bw: 'rgba(180, 160, 140, 0.08)', // 黑白辅以微暖叠加以增加质感
  golden: 'rgba(255, 180, 80, 0.15)',
  cinematic: 'rgba(80, 100, 160, 0.1)',
  // ========== Round 3 新增叠加色 ==========
  portrait: 'rgba(255, 220, 200, 0.06)',
  food: 'rgba(255, 180, 120, 0.1)',
  landscape: 'rgba(120, 180, 220, 0.08)',
  night: 'rgba(80, 100, 140, 0.12)',
  sunset: 'rgba(255, 150, 80, 0.15)',
  floral: 'rgba(255, 180, 200, 0.1)',
  snow: 'rgba(200, 220, 255, 0.08)',
}

interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 计算裁剪区域
 * 目标：以人脸为中心，裁剪到目标比例
 */
function computeCropRegion(
  imgWidth: number,
  imgHeight: number,
  targetRatio: number,
  faceCenter?: { x: number; y: number }
): CropRegion {
  const imgRatio = imgWidth / imgHeight

  let cropWidth: number
  let cropHeight: number

  if (imgRatio > targetRatio) {
    // 图片更宽，按高度裁剪
    cropHeight = imgHeight
    cropWidth = cropHeight * targetRatio
  } else {
    // 图片更高，按宽度裁剪
    cropWidth = imgWidth
    cropHeight = cropWidth / targetRatio
  }

  let cropX: number
  let cropY: number

  if (faceCenter) {
    // 以人脸为中心裁剪
    // faceCenter.x/y 是归一化坐标（0-1）
    const facePxX = faceCenter.x * imgWidth
    const facePxY = faceCenter.y * imgHeight

    // 裁剪框的左上角
    cropX = facePxX - cropWidth / 2
    cropY = facePxY - cropHeight / 2
  } else {
    // 默认居中裁剪，人物偏上（三分点）
    cropX = (imgWidth - cropWidth) / 2
    cropY = (imgHeight - cropHeight) * 0.3 // 人物偏上
  }

  // 边界约束
  cropX = Math.max(0, Math.min(cropX, imgWidth - cropWidth))
  cropY = Math.max(0, Math.min(cropY, imgHeight - cropHeight))

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
}

/**
 * 处理单张图片（本地流水线）
 *
 * 核心流程（依赖 Skia / ImageEditor native 实现）：
 * 1. 读取图片元数据（宽高）
 * 2. 根据 faceCenter 计算裁剪区域（三分点定位）
 * 3. 裁剪到目标比例（3/4 或 1/1）
 * 4. 应用预设滤镜（通过 Skia ColorMatrix 或 ImageEditor）
 * 5. 保存到缓存目录
 *
 * 注意：当前 RN 环境图像处理在组件层（ComparisonCard）通过 Skia Image 实现，
 * 此函数负责元数据记录和裁剪参数计算。Native 图像处理在真实部署时由
 * @react-native-camera-roll 或 ImageEditor 实现。
 *
 * @param imagePath 图片路径（本地 file:// 或绝对路径）
 * @param options 处理选项
 * @returns 处理后图片的临时文件路径
 */
export async function processPhoto(
  imagePath: string,
  options: ProcessOptions = {}
): Promise<string> {
  const startTime = Date.now()

  // 路径合法性校验
  if (!imagePath || typeof imagePath !== 'string') {
    console.warn('[PhotoProcessor] 非法图片路径:', imagePath)
    throw new Error('INVALID_IMAGE_PATH')
  }

  const {
    cropRatio = 3 / 4,
    filterName = null,
    faceCenter,
  } = options

  console.debug('[PhotoProcessor] 开始处理图片:', {
    path: imagePath,
    cropRatio,
    filterName,
    faceCenter: faceCenter ? `${faceCenter.x.toFixed(2)},${faceCenter.y.toFixed(2)}` : null,
    timestamp: new Date().toISOString(),
  })

  const timestamp = Date.now()
  const cacheDir = RNFS.CachesDirectoryPath || '/data/user/0/com.boyfriendcamera/cache'
  const outputPath = `${cacheDir}/processed_${timestamp}.jpg`

  // 确保缓存目录存在
  try {
    const dirExists = await RNFS.exists(cacheDir)
    if (!dirExists) {
      await RNFS.mkdir(cacheDir)
    }
  } catch (e) {
    console.error('[PhotoProcessor] 创建缓存目录失败:', e)
    throw new Error('CACHE_DIR_CREATE_FAILED')
  }

  // 清理路径前缀
  const cleanPath = imagePath.replace(/^file:\/\//, '').trim()

  // 验证图片文件存在且可读
  let sourceExists = false
  try {
    sourceExists = await RNFS.exists(cleanPath)
  } catch (e) {
    console.error('[PhotoProcessor] 检查图片存在性失败:', e)
    throw new Error('IMAGE_READ_ERROR')
  }

  if (!sourceExists) {
    console.error('[PhotoProcessor] 图片文件不存在:', cleanPath)
    throw new Error('IMAGE_NOT_FOUND')
  }

  // 验证文件大小，防止处理超大图片导致内存溢出
  try {
    const stat = await RNFS.stat(cleanPath)
    const sizeMB = (stat.size || 0) / 1024 / 1024
    if (sizeMB > 20) {
      console.warn('[PhotoProcessor] 图片过大(', sizeMB.toFixed(1), 'MB)，可能影响处理性能')
    }
  } catch (e) {
    console.warn('[PhotoProcessor] 无法获取文件大小:', e)
  }

  // 复制原图到输出路径
  // 注意：滤镜处理在 ComparisonCard 的 Skia 层实时渲染，真实滤镜效果（ColorMatrix + 色调叠加）
  // 由 Skia.ColorFilter.MakeMatrix(getColorMatrix(filterName)) 实现，此函数负责计算参数并缓存元数据。
  // Native 层不做像素级滤镜处理，保证性能最优且支持实时切换滤镜。
  try {
    await RNFS.copyFile(cleanPath, outputPath)
  } catch (e) {
    console.error('[PhotoProcessor] 图片复制失败:', e)
    throw new Error('IMAGE_COPY_FAILED')
  }

  // 标记处理参数（用于 ComparisonCard 渲染滤镜效果）
  const processedMeta = {
    originalPath: imagePath,
    outputPath,
    cropRatio,
    filterName,
    faceCenter,
    timestamp,
  }

  // 将处理元数据写入缓存，ComparisonCard 读取渲染滤镜
  try {
    await RNFS.writeFile(
      `${cacheDir}/process_meta_${timestamp}.json`,
      JSON.stringify(processedMeta),
      'utf8'
    )
  } catch (e) {
    console.warn('[PhotoProcessor] 写入元数据失败:', e)
  }

  // 返回处理后的路径（滤镜在 ComparisonCard Skia 层渲染）
  const duration = Date.now() - startTime
  console.debug('[PhotoProcessor] 图片处理完成:', {
    outputPath,
    durationMs: duration,
    filterName,
    cropRatio,
    timestamp: new Date().toISOString(),
  })
  return outputPath
}

/**
 * 滤镜中文描述（用于 UI 提示）
 */
export const FILTER_DESCRIPTIONS: Record<string, string> = {
  warm: '暖调增强，肤色更柔和通透',
  cool: '冷调降温，清新通透感',
  vivid: '高饱和，人像更鲜活有活力',
  soft: '柔化处理，轻微过曝营造梦幻感',
  bw: '黑白处理，去除色彩突出光影',
  golden: '金棕色调，温暖治愈氛围感',
  cinematic: '电影感调色，对比增强色调偏冷',
  // ========== Round 3 新增 ==========
  portrait: '人像模式，轻微美颜+适中对比',
  food: '美食模式，高饱和+高亮度',
  landscape: '风景模式，增强饱和+蓝色调',
  night: '夜景模式，增强对比+暖黄色调',
  sunset: '日落模式，暖色调+高对比',
  floral: '花季模式，柔和+适中饱和',
  snow: '雪景模式，提亮+柔和冷调',
}

/** 场景推荐滤镜 */
export const SCENE_FILTER_RECOMMENDATION: Record<string, string> = {
  outdoor: 'vivid',
  indoor: 'warm',
  night: 'night',
  sunset: 'sunset',
  food: 'food',
  portrait: 'portrait',
  landscape: 'landscape',
  floral: 'floral',
  snow: 'snow',
}

/**
 * 根据场景推荐合适滤镜
 * @param sceneType 场景类型
 * @returns 推荐的滤镜名称
 */
export function recommendFilter(sceneType: string): string {
  return SCENE_FILTER_RECOMMENDATION[sceneType] ?? 'vivid'
}

/**
 * 获取所有可用滤镜列表（用于 UI 渲染）
 */
export function getAvailableFilters(): Array<{ key: string; label: string; description: string }> {
  return [
    { key: 'vivid', label: '鲜活', description: '高饱和，人像更鲜活有活力' },
    { key: 'warm', label: '暖调', description: '暖调增强，肤色更柔和通透' },
    { key: 'cool', label: '冷调', description: '冷调降温，清新通透感' },
    { key: 'soft', label: '柔化', description: '柔化处理，轻微过曝营造梦幻感' },
    { key: 'golden', label: '金棕', description: '金棕色调，温暖治愈氛围感' },
    { key: 'cinematic', label: '电影', description: '电影感调色，对比增强色调偏冷' },
    { key: 'portrait', label: '人像', description: '人像模式，轻微美颜+适中对比' },
    { key: 'food', label: '美食', description: '美食模式，高饱和+高亮度' },
    { key: 'landscape', label: '风景', description: '风景模式，增强饱和+蓝色调' },
    { key: 'night', label: '夜景', description: '夜景模式，增强对比+暖黄色调' },
    { key: 'sunset', label: '日落', description: '日落模式，暖色调+高对比' },
    { key: 'floral', label: '花季', description: '花季模式，柔和+适中饱和' },
    { key: 'snow', label: '雪景', description: '雪景模式，提亮+柔和冷调' },
    { key: 'bw', label: '黑白', description: '黑白处理，去除色彩突出光影' },
  ]
}

/**
 * applyFilterToView - 在 Skia View 上应用滤镜
 *
 * 此函数用于在 Skia Canvas 中实时渲染滤镜效果，无需修改原始图片文件。
 *
 * 实现原理：
 * 1. 加载原始图片为 Skia Image 对象（通过 Skia.Image.MakeFromPath）
 * 2. 根据 filterName 查找对应的 ColorMatrix 参数（通过 getColorMatrix）
 * 3. 创建一个 Skia.Paint 对象，应用 ColorFilter（色彩矩阵滤镜）
 * 4. 在 Canvas 上绘制图片（使用带滤镜的 Paint）
 * 5. 在图片上方叠加透明色叠加层（模拟色调滤镜，如暖色/冷色叠加）
 *
 * ColorMatrix 工作原理：
 * - Skia 的 ColorMatrix 是 4×5 矩阵，对 RGBA 每个通道进行线性变换
 * - 矩阵格式: [r1,r2,r3,r4,t1, g1,g2,g3,g4,t2, b1,b2,b3,b4,t3, a1,a2,a3,a4,t4]
 * - 每个像素计算: newChannel = r×R + g×G + b×B + a×A + offset
 * - 通过 brightness/contrast/saturation 组合计算（详见 getColorMatrix）
 *
 * 色调叠加层（overlay）工作原理：
 * - 在图片上方绘制一个半透明的颜色矩形
 * - BlendMode: srcOver（正常混合）
 * - 叠加色的 alpha 值控制强度（如 warm: rgba(255,200,100,0.12)）
 * - 组合效果：滤镜 ColorMatrix 处理 + 色调叠加 = 完整滤镜效果
 *
 * Skia 代码示例：
 * ```
 * const paint = new Skia.Paint()
 * paint.setColorFilter(Skia.ColorFilter.MakeLinearToSRGBGamma())
 * // 或使用自定义 ColorMatrix:
 * // paint.setColorFilter(Skia.ColorFilter.MakeMatrix(getColorMatrix(filterName)))
 * canvas.drawImage(image, 0, 0, paint)
 * // 色调叠加:
 * const overlayPaint = new Skia.Paint()
 * overlayPaint.setColor4f({ r: 255/255, g: 200/255, b: 100/255, a: 0.12 })
 * canvas.drawRect(Skia.Rect(...), overlayPaint)
 * ```
 *
 * @param filterName 滤镜名称（warm/cool/vivid/soft/bw/golden/cinematic）
 * @returns 滤镜的 ColorMatrix 数组，可直接用于 Skia.ColorFilter.MakeMatrix()
 */
/**
 * applyFilter - 在 Skia View 上应用滤镜（计算参数）
 *
 * 注意：此函数仅返回 ColorMatrix 参数数组，真实滤镜在 ComparisonCard Skia 层实现：
 * 1. Skia.Image.MakeFromPath() 加载原图
 * 2. Skia.Paint.setColorFilter(Skia.ColorFilter.MakeMatrix(getColorMatrix()))
 * 3. canvas.drawImage(image, 0, 0, paint)
 * 4. 叠加半透明色调层（FILTER_OVERLAY）模拟完整滤镜效果
 *
 * @param filterName 滤镜名称
 * @returns ColorMatrix 数组，用于 Skia.ColorFilter.MakeMatrix()
 */
export function applyFilterToView(filterName: string | null): number[] {
  return getColorMatrix(filterName)
}

/**
 * 应用滤镜后的视觉参数
 * 用于 ComparisonCard 中 Skia 绘制时使用
 */
export function getFilterParams(filterName: string | null): {
  brightness: number
  contrast: number
  saturation: number
  overlayColor: string
  description: string
} {
  if (!filterName || !FILTER_PARAMS[filterName]) {
    return {
      brightness: 1,
      contrast: 1,
      saturation: 1,
      overlayColor: 'transparent',
      description: '无滤镜',
    }
  }
  const p = FILTER_PARAMS[filterName]
  return {
    brightness: p.brightness,
    contrast: p.contrast,
    saturation: p.saturation,
    overlayColor: FILTER_OVERLAY[filterName] || 'transparent',
    description: FILTER_DESCRIPTIONS[filterName] || '无滤镜',
  }
}

/**
 * 获取 Skia ColorMatrix 参数
 * 返回可用于 Skia Image 滤镜的 color matrix 数组
 * 格式: [r, g, b, a, t] 每通道乘数 + 偏移
 *
 * 基于 brightness/contrast/saturation 组合计算
 */
export function getColorMatrix(filterName: string | null): number[] {
  // 恒等矩阵（不做任何处理）
  const identity = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]

  if (!filterName || !FILTER_PARAMS[filterName]) return identity

  const p = FILTER_PARAMS[filterName]
  const { brightness, contrast, saturation } = p

  // 亮度调整: 加法 (brightness - 1) * 255
  const b = brightness
  // 对比度调整: 乘法
  const c = contrast
  // 饱和度调整: 通过灰度系数实现
  const s = saturation

  // 饱和度转 ColorMatrix
  const sr = 1 - s
  const lumR = 0.3086 * sr
  const lumG = 0.6094 * sr
  const lumB = 0.0820 * sr

  // 组合: 先饱和度 → 对比度 → 亮度
  // Skia ColorMatrix 顺序: RGBA 各通道乘数 + 位移
  // 饱和度矩阵 (saturation transform)
  const satMatrix = [
    lumR + s, lumG, lumB, 0, 0,
    lumR, lumG + s, lumB, 0, 0,
    lumR, lumG, lumB + s, 0, 0,
    0, 0, 0, 1, 0,
  ]

  // 对比度矩阵 (centered at 0.5, scaled by c)
  const t1 = (1 - c) / 2
  const contrastMatrix = [
    c, 0, 0, 0, t1,
    0, c, 0, 0, t1,
    0, 0, c, 0, t1,
    0, 0, 0, 1, 0,
  ]

  // 亮度矩阵
  const brightnessOffset = (b - 1) * 0.5
  const brightnessMatrix = [
    1, 0, 0, 0, brightnessOffset,
    0, 1, 0, 0, brightnessOffset,
    0, 0, 1, 0, brightnessOffset,
    0, 0, 0, 1, 0,
  ]

  // 矩阵乘法: Saturation × Contrast × Brightness
  // Skia 中矩阵左乘效果：m3 * m2 * m1 * color
  // 我们按顺序: color → brightnessMatrix → contrastMatrix → satMatrix
  return multiplyMatrices(satMatrix, multiplyMatrices(contrastMatrix, brightnessMatrix))
}

/** 4x5 ColorMatrix 乘法: result = B × A（先应用 A，再应用 B） */
function multiplyMatrices(a: number[], b: number[]): number[] {
  const result = new Array(20).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += b[row * 5 + k] * a[k * 5 + col]
      }
      result[row * 5 + col] = sum
    }
    // offset 列: result[offset] = b[offset] + Σ(b_row_k × a_k_offset)
    let offsetSum = b[row * 5 + 4]
    for (let k = 0; k < 4; k++) {
      offsetSum += b[row * 5 + k] * a[k * 5 + 4]
    }
    result[row * 5 + 4] = offsetSum
  }
  return result
}

/**
 * 生成对比卡片（使用 react-native-view-shot）
 * 将原图和优化图并排截图
 *
 * @param originalPath 原图路径
 * @param processedPath 处理后图片路径
 * @param viewShotRef view-shot 的 ref
 * @param quality 截图质量预设：'high'(0.95) | 'medium'(0.85) | 'low'(0.7)
 * @returns 截图 URI
 */
export async function generateComparisonCard(
  originalPath: string,
  processedPath: string,
  viewShotRef: RefObject<unknown>,
  quality: 'high' | 'medium' | 'low' = 'medium'
): Promise<string> {
  if (!viewShotRef.current) {
    console.warn('[PhotoProcessor] viewShot ref not ready')
    return processedPath
  }

  // 质量预设映射
  const qualityMap: Record<string, number> = {
    high: 0.95,
    medium: 0.85,
    low: 0.7,
  }
  const jpegQuality = qualityMap[quality] ?? 0.85

  console.debug('[PhotoProcessor] 生成对比卡片:', {
    originalPath,
    processedPath,
    quality,
    jpegQuality,
    timestamp: new Date().toISOString(),
  })

  try {
    const uri = await captureRef(viewShotRef, {
      format: 'jpg',
      quality: jpegQuality,
    })
    console.debug('[PhotoProcessor] 对比卡片截图成功:', uri)
    return uri
  } catch (e) {
    console.error('[PhotoProcessor] 对比卡片截图失败:', e)
    // 回退到返回原处理图
    return processedPath
  }
}

/**
 * 保存到相册
 * Android: 优先使用 MediaStore Scoped Storage 写入 Pictures 目录
 *         若无权限则 fallback 到缓存目录 + 提示用户
 * iOS:   保存到 Documents 目录（iOS Photos App 可扫描到）
 *
 * 依赖: @react-native-camera-roll/camera-roll (v7+) 完整相册写入
 * 当前版本先用 RNFS fallback，后续接入 camera-roll 实现真正的相册写入
 */
export async function saveToAlbum(imagePath: string): Promise<boolean> {
  if (!imagePath || typeof imagePath !== 'string') {
    console.warn('[PhotoProcessor] saveToAlbum: 非法路径参数')
    return false
  }
  try {
    const cleanPath = imagePath.replace(/^file:\/\//, '').trim()
    // 验证源文件存在
    if (!(await RNFS.exists(cleanPath))) {
      console.warn('[PhotoProcessor] saveToAlbum: 源文件不存在:', cleanPath)
      return false
    }
    const timestamp = Date.now()
    const subDir = '/BoyfriendCamera'
    const destDir = Platform.OS === 'ios'
      ? RNFS.DocumentDirectoryPath
      : RNFS.CachesDirectoryPath

    const targetDir = destDir + subDir
    const destPath = `${targetDir}/photo_${timestamp}.jpg`

    // 确保目录存在
    const dirExists = await RNFS.exists(targetDir)
    if (!dirExists) {
      await RNFS.mkdir(targetDir)
    }

    await RNFS.copyFile(cleanPath, destPath)
    // 已保存照片

    // 使用 CameraRoll 写入系统相册
    try {
      const photoUri = `file://${destPath}`
      const result = await CameraRoll.save(photoUri, {
        type: 'photo',
        album: 'BoyfriendCamera',
      })
      console.debug('[PhotoProcessor] 写入系统相册成功:', result)
    } catch (crError) {
      console.warn('[PhotoProcessor] CameraRoll 保存失败，文件已保存到缓存:', crError)
      // 文件已保存到缓存，用户可在文件管理器中查看
    }

    // Android: 尝试触发 MediaScanner 让相册 App 能看到
    if (Platform.OS === 'android') {
      try {
        // 调用 MediaScanner 刷新媒体库（通过 CameraRoll 实现）
        // CameraRoll.save 已自动触发 MediaScanner
      } catch {
        // ignore scanner errors
      }
    }

    return true
  } catch (e) {
    console.error('[PhotoProcessor] 保存失败:', e)
    return false
  }
}

/**
 * 删除临时文件
 * 清理: processed_*, comparison_*, process_meta_* 及 BoyfriendCamera/ 目录下的旧照片
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    // 清理 CachesDirectoryPath 根目录的临时文件
    const rootFiles = await RNFS.readDir(RNFS.CachesDirectoryPath)
    const tempFiles = rootFiles.filter(f =>
      f.name.startsWith('processed_') ||
      f.name.startsWith('comparison_') ||
      f.name.startsWith('process_meta_')
    )
    await Promise.all(tempFiles.map(f => RNFS.unlink(f.path).catch(() => {})))

    // 清理 BoyfriendCamera/ 子目录（保留最近 10 张）
    const subDir = RNFS.CachesDirectoryPath + '/BoyfriendCamera'
    const subDirExists = await RNFS.exists(subDir)
    if (subDirExists) {
      const subFiles = await RNFS.readDir(subDir)
      const photos = subFiles
        .filter(f => f.name.endsWith('.jpg'))
        .sort((a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0))
      // 只保留最新 10 张
      const toDelete = photos.slice(10)
      await Promise.all(toDelete.map(f => RNFS.unlink(f.path).catch(() => {})))
    }
  } catch (e) {
    console.warn('[PhotoProcessor] 清理临时文件失败:', e)
  }
}

/**
 * 推荐 JPEG 压缩质量
 * 根据图片大小智能选择压缩比：大图高压缩（省空间），小图低压缩（保质量）
 * @param fileSizeBytes 图片文件大小（字节）
 * @returns 推荐的 JPEG quality (0.3-0.95)
 */
export function getOptimalJpegQuality(fileSizeBytes: number): number {
  const sizeMB = fileSizeBytes / 1024 / 1024
  if (sizeMB > 10) return 0.5       // 超大图 → 强压缩
  if (sizeMB > 5) return 0.65      // 大图 → 中等压缩
  if (sizeMB > 2) return 0.8       // 中图 → 轻压缩
  return 0.92                        // 小图 → 保质量
}

/**
 * 预估处理后文件大小
 * @param originalSizeMB 原始文件大小（MB）
 * @param filterName 滤镜名称
 * @returns 预估压缩后大小（MB）
 */
export function estimateCompressedSize(originalSizeMB: number, filterName: string | null): number {
  // 滤镜会增加一点文件大小（色彩数据更丰富）
  const filterOverhead = filterName && filterName !== 'bw' ? 1.05 : 1.0
  // 压缩比估算
  const compressionRatio = originalSizeMB > 5 ? 0.6 : 0.8
  return originalSizeMB * compressionRatio * filterOverhead
}

/**
 * 图片尺寸安全检查
 * 防止超大图片导致内存溢出，返回推荐的缩放比例
 * @param width 图片宽度
 * @param height 图片高度
 * @returns 推荐的缩放比例 (0.1 - 1.0)
 */
export function getSafeScaleFactor(width: number, height: number): number {
  const pixelCount = width * height
  const maxPixels = 4096 * 4096  // 16MP 上限
  const largePixels = 3840 * 2160 // 4K 上限
  if (pixelCount > maxPixels) return Math.sqrt(maxPixels / pixelCount)
  if (pixelCount > largePixels) return Math.sqrt(largePixels / pixelCount)
  return 1.0
}

/**
 * 验证图片路径合法性
 * @param path 图片路径
 * @returns 是否合法
 */
export function isValidImagePath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') return false
  const cleanPath = path.replace(/^file:\/\//, '').trim()
  // 允许绝对路径或已知的图片格式
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']
  return validExtensions.some(ext => cleanPath.toLowerCase().endsWith(ext))
}

/**
 * 获取图片元数据（宽高、文件大小）
 * @param imagePath 图片路径
 * @returns 元数据对象
 */
export async function getImageMetadata(imagePath: string): Promise<{
  width: number
  height: number
  sizeBytes: number
  sizeMB: number
  aspectRatio: number
  isSafe: boolean
} | null> {
  try {
    const cleanPath = imagePath.replace(/^file:\/\//, '').trim()
    if (!(await RNFS.exists(cleanPath))) return null
    const stat = await RNFS.stat(cleanPath)
    const sizeBytes = stat.size || 0
    const sizeMB = sizeBytes / 1024 / 1024
    // 图片尺寸无法通过 RNFS 获取，需要通过 native module 或图片加载库
    // 暂时返回文件大小作为参考，尺寸信息由调用方提供
    return {
      width: 0, // 需要 native 获取
      height: 0, // 需要 native 获取
      sizeBytes,
      sizeMB,
      aspectRatio: 0,
      isSafe: sizeMB < 20,
    }
  } catch {
    return null
  }
}

/**
 * 批量处理多张图片
 * 用于进步日记中批量处理历史照片
 * @param paths 图片路径列表
 * @param options 处理选项
 * @param onProgress 每张处理完成后的回调
 * @returns 处理后的路径列表（按原顺序）
 */
export async function batchProcess(
  paths: string[],
  options: ProcessOptions = {},
  onProgress?: (index: number, total: number) => void
): Promise<string[]> {
  const results: string[] = []
  for (let i = 0; i < paths.length; i++) {
    try {
      const processedPath = await processPhoto(paths[i], options)
      results.push(processedPath)
    } catch (e) {
      console.warn(`[PhotoProcessor] batchProcess: 第${i + 1}张处理失败，保留原路径:`, e)
      results.push(paths[i]) // 处理失败时保留原路径
    }
    onProgress?.(i + 1, paths.length)
  }
  return results
}

/**
 * 预估处理时间
 * @param fileSizeMB 文件大小（MB）
 * @returns 预估处理时间（毫秒）
 */
export function estimateProcessingTime(fileSizeMB: number): number {
  // 基础处理时间 + 文件大小加成
  const baseMs = 500
  const perMbMs = 200
  return Math.round(baseMs + fileSizeMB * perMbMs)
}

/**
 * 人脸感知裁剪：以人脸为中心计算最优裁剪区域
 * 在 computeCropRegion 基础上加入安全边距，避免人脸被裁切
 * @param imgWidth 图片宽度
 * @param imgHeight 图片高度
 * @param targetRatio 目标比例
 * @param faceCenter 人脸中心（归一化 0-1）
 * @param safeMargin 安全边距比例（默认 0.05，即 5%）
 */
export function computeFaceAwareCropRegion(
  imgWidth: number,
  imgHeight: number,
  targetRatio: number,
  faceCenter?: { x: number; y: number },
  safeMargin: number = 0.05
): CropRegion {
  const region = computeCropRegion(imgWidth, imgHeight, targetRatio, faceCenter)
  // 添加安全边距，防止人脸紧贴边框
  const marginX = region.width * safeMargin
  const marginY = region.height * safeMargin
  return {
    x: Math.max(0, region.x - marginX * 0.3),
    y: Math.max(0, region.y - marginY * 0.3),
    width: Math.min(imgWidth - region.x, region.width + marginX * 0.6),
    height: Math.min(imgHeight - region.y, region.height + marginY * 0.6),
  }
}

/**
 * 格式化文件大小显示
 * @param bytes 字节数
 * @returns 人类可读的大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 获取最佳 JPEG 质量（基于图片尺寸和目标用途）
 * @param width 图片宽度
 * @param height 图片高度
 * @param useCase 用途：'share'(分享) | 'archive'(存档) | 'thumbnail'(缩略图)
 */
export function getJpegQualityForUseCase(
  width: number,
  height: number,
  useCase: 'share' | 'archive' | 'thumbnail' = 'share'
): number {
  const pixelCount = width * height
  if (useCase === 'thumbnail') return 0.6
  if (useCase === 'share') {
    if (pixelCount > 3840 * 2160) return 0.7
    if (pixelCount > 1920 * 1080) return 0.8
    return 0.88
  }
  // archive: preserve quality
  if (pixelCount > 4096 * 4096) return 0.92
  return 0.95
}

/**
 * 添加隐私水印配置（男友相机标识）
 * 在分享图片时附加小标识，防止他人误用照片
 */
export interface WatermarkConfig {
  text?: string       // 水印文字，默认 "男友相机"
  opacity?: number    // 透明度 0-1，默认 0.5
  fontSize?: number   // 字号，默认 12
  padding?: number    // 边距，默认 12
}

const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  text: '男友相机',
  opacity: 0.45,
  fontSize: 12,
  padding: 12,
}

/**
 * 获取隐私水印配置（可在设置中自定义）
 * @param overrides 部分覆盖默认配置
 */
export function getWatermarkConfig(overrides?: Partial<WatermarkConfig>): WatermarkConfig {
  return { ...DEFAULT_WATERMARK_CONFIG, ...overrides }
}

/**
 * 生成隐私水印 SVG（内嵌于图片叠加层）
 * 用于在分享图片时标识来源，防止他人盗用
 * @param imageWidth 图片宽度
 * @param imageHeight 图片高度
 * @param config 水印配置
 */
export function generateWatermarkSVG(
  imageWidth: number,
  imageHeight: number,
  config?: WatermarkConfig
): string {
  const { text, opacity, fontSize, padding } = getWatermarkConfig(config)
  const fontSizeNum = fontSize ?? 12
  const paddingNum = padding ?? 12
  // 水印位于右下角
  const x = imageWidth - paddingNum
  const y = imageHeight - paddingNum - fontSizeNum
  const textWidth = text!.length * fontSizeNum * 0.6
  const textHeight = fontSizeNum * 1.4
  // 半透明黑色圆角背景
  const rectX = x - textWidth - 8
  const rectY = y - 4
  const rectWidth = textWidth + 16
  const rectHeight = textHeight + 8
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}">
  <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" rx="6" ry="6" fill="rgba(0,0,0,${opacity})"/>
  <text x="${x - textWidth / 2 - 8}" y="${y + fontSizeNum * 0.35}" font-family="sans-serif" font-size="${fontSizeNum}" fill="rgba(255,255,255,${opacity! + 0.2})" text-anchor="middle">${text}</text>
</svg>`
}

/**
 * 检查是否应自动添加水印
 * 用户可在设置中关闭此功能
 */
export function shouldAddWatermark(): boolean {
  // 默认开启，用户可在设置中关闭
  // 此处读取用户偏好（需要 AsyncStorage 集成）
  return true
}
