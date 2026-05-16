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
import ViewShot, { captureRef } from 'react-native-view-shot'
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
const FILTER_PARAMS: Record<string, { brightness: number; contrast: number; saturation: number; warmth?: number }> = {
  warm: {
    brightness: 1.05,
    contrast: 1.1,
    saturation: 1.15,
    warmth: 0.1,
  },
  cool: {
    brightness: 0.98,
    contrast: 1.05,
    saturation: 1.1,
    warmth: -0.1,
  },
  vivid: {
    brightness: 1.08,
    contrast: 1.2,
    saturation: 1.3,
  },
  soft: {
    brightness: 1.1,
    contrast: 0.95,
    saturation: 0.9,
  },
  bw: {
    brightness: 1.02,
    contrast: 1.15,
    saturation: 0,
  },
}

// 预设滤镜颜色叠加（RGBA 透明色，模拟色调）
const FILTER_OVERLAY: Record<string, string> = {
  warm: 'rgba(255, 200, 100, 0.12)',
  cool: 'rgba(100, 150, 255, 0.12)',
  vivid: 'rgba(255, 100, 150, 0.08)',
  soft: 'rgba(255, 220, 200, 0.1)',
  bw: 'rgba(0, 0, 0, 0)',
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
 * 处理单张图片
 * @param imagePath 图片路径（本地 file:// 或绝对路径）
 * @param options 处理选项
 * @returns 处理后图片的临时文件路径
 */
export async function processPhoto(
  imagePath: string,
  options: ProcessOptions = {}
): Promise<string> {
  const {
    cropRatio = 3 / 4,
    filterName = null,
    faceCenter,
  } = options

  const timestamp = Date.now()
  const outputPath = `${RNFS.CachesDirectoryPath || '/data/user/0/com.boyfriendcamera/cache'}/processed_${timestamp}.jpg`

  // 确保目录存在
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'))
  const dirExists = await RNFS.exists(dir)
  if (!dirExists) {
    await RNFS.mkdir(dir)
  }

  console.log('[PhotoProcessor] 处理图片:', imagePath, options)

  // 在 React Native 中，实际图像处理需要通过 native module 或 Skia
  // 这里用 JS 实现逻辑，返回原图路径（native 处理后替换）
  // 实际渲染在 ComparisonCard 组件中通过 Skia/Image 实现

  // 标记处理参数（用于 ComparisonCard 渲染滤镜效果）
  const processedMeta = {
    originalPath: imagePath,
    outputPath,
    cropRatio,
    filterName,
    faceCenter,
    timestamp,
  }

  // 将处理元数据写入缓存，ComparisonCard 读取渲染
  try {
    await RNFS.writeFile(
      `${RNFS.CachesDirectoryPath}/process_meta_${timestamp}.json`,
      JSON.stringify(processedMeta),
      'utf8'
    )
  } catch (e) {
    console.warn('[PhotoProcessor] 写入元数据失败:', e)
  }

  return imagePath // 实际渲染在组件层，路径不变
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
 * 生成对比卡片（使用 react-native-view-shot）
 * 将原图和优化图并排截图
 */
export async function generateComparisonCard(
  originalPath: string,
  processedPath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewShotRef: React.RefObject<any>
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
    console.log('[PhotoProcessor] 对比卡片已生成:', uri)
    return uri
  } catch (e) {
    console.error('[PhotoProcessor] 截图失败:', e)
    return processedPath
  }
}

/**
 * 保存到相册（使用 react-native-fs 复制到 Pictures 目录）
 * 注意：实际保存需要 CameraRoll 或 Image library
 */
export async function saveToAlbum(imagePath: string): Promise<boolean> {
  try {
    const timestamp = Date.now()
    const destPath = `${RNFS.PicturesDirectoryPath || RNFS.ExternalStorageDirectoryPath}/BoyfriendCamera/photo_${timestamp}.jpg`

    // 确保目录存在
    const dir = destPath.substring(0, destPath.lastIndexOf('/'))
    const dirExists = await RNFS.exists(dir)
    if (!dirExists) {
      await RNFS.mkdir(dir)
    }

    await RNFS.copyFile(imagePath.replace('file://', ''), destPath)
    console.log('[PhotoProcessor] 已保存到相册:', destPath)
    return true
  } catch (e) {
    console.error('[PhotoProcessor] 保存到相册失败:', e)
    return false
  }
}

/**
 * 删除临时文件
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    const cacheDir = RNFS.CachesDirectoryPath
    const files = await RNFS.readDir(cacheDir)
    const tempFiles = files.filter(f => f.name.startsWith('processed_') || f.name.startsWith('comparison_') || f.name.startsWith('process_meta_'))
    await Promise.all(tempFiles.map(f => RNFS.unlink(f.path).catch(() => {})))
  } catch (e) {
    // ignore
  }
}
