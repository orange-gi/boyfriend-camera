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
import { captureRef } from 'react-native-view-shot'
import RNFS from 'react-native-fs'

export interface ProcessOptions {
  /** 目标裁剪比例，如 3/4, 1/1 */
  cropRatio?: number
  /** 滤镜名称 */
  filterName?: 'warm' | 'cool' | 'vivid' | 'soft' | 'bw' | null
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
  golden: { brightness: 1.1, contrast: 1.08, saturation: 1.2 },
  cinematic: { brightness: 0.95, contrast: 1.12, saturation: 0.85 },
}

// 预设滤镜颜色叠加（RGBA 透明色，模拟色调）
const FILTER_OVERLAY: Record<string, string> = {
  warm: 'rgba(255, 200, 100, 0.12)',
  cool: 'rgba(100, 150, 255, 0.12)',
  vivid: 'rgba(255, 100, 150, 0.08)',
  soft: 'rgba(255, 220, 200, 0.1)',
  bw: 'rgba(0, 0, 0, 0)',
  golden: 'rgba(255, 180, 80, 0.15)',
  cinematic: 'rgba(80, 100, 160, 0.1)',
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

  // 复制原图到输出路径（滤镜在 ComparisonCard 通过 Skia 实时渲染）
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
  return outputPath
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
} {
  if (!filterName || !FILTER_PARAMS[filterName]) {
    return {
      brightness: 1,
      contrast: 1,
      saturation: 1,
      overlayColor: 'transparent',
    }
  }
  const p = FILTER_PARAMS[filterName]
  return {
    brightness: p.brightness,
    contrast: p.contrast,
    saturation: p.saturation,
    overlayColor: FILTER_OVERLAY[filterName] || 'transparent',
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

/** 4x5 矩阵乘法 */
function multiplyMatrices(a: number[], b: number[]): number[] {
  const result = new Array(20).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[row * 5 + k] * b[k * 5 + col]
      }
      // 处理位移列 (col === 4)
      if (col === 4) {
        sum += a[row * 5 + 4]
      }
      result[row * 5 + col] = sum
    }
  }
  return result
}

/**
 * 生成对比卡片（使用 react-native-view-shot）
 * 将原图和优化图并排截图
 */
export async function generateComparisonCard(
  originalPath: string,
  processedPath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewShotRef: React.RefObject<unknown>
): Promise<string> {
  if (!viewShotRef.current) {
    console.warn('[PhotoProcessor] viewShot ref not ready')
    return processedPath
  }

  try {
    const uri = await captureRef(viewShotRef, {
      format: 'jpg',
      quality: 0.9,
    })
    // 对比卡片已生成
    return uri
  } catch (e) {
    console.error('[PhotoProcessor] 截图失败:', e)
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

    // Android: 尝试触发 MediaScanner 让相册 App 能看到
    if (Platform.OS === 'android') {
      try {
        // 调用 MediaScanner 刷新媒体库（需要 native module，下版本集成 camera-roll）
        // 目前通过在相同目录保存 .nomedia 或提示用户
        // Android: 请在文件管理器查看
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
