/**
 * photoProcessor.ts - 图像处理流水线
 * 裁剪 + 滤镜，全部本地处理
 *
 * 核心流程：
 * 1. processPhoto - 图片元数据记录和裁剪参数计算
 * 2. saveToAlbum - 保存到系统相册
 * 3. getColorMatrix - 滤镜 ColorMatrix 参数计算（用于 Skia 实时滤镜渲染）
 */
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import { logger } from '../utils/logger'

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
  portrait: { brightness: 1.06, contrast: 1.12, saturation: 1.05 },
  food: { brightness: 1.1, contrast: 1.15, saturation: 1.3 },
  landscape: { brightness: 1.05, contrast: 1.18, saturation: 1.25 },
  night: { brightness: 0.95, contrast: 1.2, saturation: 0.9 },
  sunset: { brightness: 1.08, contrast: 1.15, saturation: 1.2 },
  floral: { brightness: 1.07, contrast: 1.08, saturation: 1.1 },
  snow: { brightness: 1.15, contrast: 1.05, saturation: 0.95 },
  golden: { brightness: 1.1, contrast: 1.08, saturation: 1.2 },
  cinematic: { brightness: 0.95, contrast: 1.12, saturation: 0.85 },
}

// 预设滤镜颜色叠加（RGBA 透明色，模拟色调）
const FILTER_OVERLAY: Record<string, string> = {
  warm: 'rgba(255, 200, 100, 0.12)',
  cool: 'rgba(100, 150, 255, 0.12)',
  vivid: 'rgba(255, 100, 150, 0.08)',
  soft: 'rgba(255, 220, 200, 0.1)',
  bw: 'rgba(180, 160, 140, 0.08)',
  golden: 'rgba(255, 180, 80, 0.15)',
  cinematic: 'rgba(80, 100, 160, 0.1)',
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
    cropHeight = imgHeight
    cropWidth = cropHeight * targetRatio
  } else {
    cropWidth = imgWidth
    cropHeight = cropWidth / targetRatio
  }

  let cropX: number
  let cropY: number

  if (faceCenter) {
    const facePxX = faceCenter.x * imgWidth
    const facePxY = faceCenter.y * imgHeight
    cropX = facePxX - cropWidth / 2
    cropY = facePxY - cropHeight / 2
  } else {
    cropX = (imgWidth - cropWidth) / 2
    cropY = (imgHeight - cropHeight) * 0.3
  }

  cropX = Math.max(0, Math.min(cropX, imgWidth - cropWidth))
  cropY = Math.max(0, Math.min(cropY, imgHeight - cropHeight))

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
}

/**
 * 处理单张图片（本地流水线）
 *
 * 核心流程：
 * 1. 读取图片并复制到缓存目录
 * 2. 记录处理元数据（裁剪参数、滤镜名称、人脸位置）
 * 3. 元数据写入缓存文件，ComparisonCard Skia 层读取渲染实时滤镜
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

  if (!imagePath || typeof imagePath !== 'string') {
    logger.warn('PhotoProcessor', '非法图片路径:', imagePath)
    throw new Error('INVALID_IMAGE_PATH')
  }

  const { cropRatio = 3 / 4, filterName = null, faceCenter } = options

  logger.debug('PhotoProcessor', '开始处理图片:', {
    path: imagePath,
    cropRatio,
    filterName,
    faceCenter: faceCenter ? `${faceCenter.x.toFixed(2)},${faceCenter.y.toFixed(2)}` : null,
    timestamp: new Date().toISOString(),
  })

  const timestamp = Date.now()
  const cacheDir = RNFS.CachesDirectoryPath || '/data/user/0/com.boyfriendcamera/cache'
  const outputPath = `${cacheDir}/processed_${timestamp}.jpg`

  try {
    const dirExists = await RNFS.exists(cacheDir)
    if (!dirExists) await RNFS.mkdir(cacheDir)
  } catch (e) {
    logger.error('PhotoProcessor', '创建缓存目录失败:', e)
    throw new Error('CACHE_DIR_CREATE_FAILED')
  }

  const cleanPath = imagePath.replace(/^file:\/\//, '').trim()

  let sourceExists = false
  try {
    sourceExists = await RNFS.exists(cleanPath)
  } catch (e) {
    logger.error('PhotoProcessor', '检查图片存在性失败:', e)
    throw new Error('IMAGE_READ_ERROR')
  }

  if (!sourceExists) {
    logger.error('PhotoProcessor', '图片文件不存在:', cleanPath)
    throw new Error('IMAGE_NOT_FOUND')
  }

  try {
    const stat = await RNFS.stat(cleanPath)
    const sizeMB = (stat.size || 0) / 1024 / 1024
    if (sizeMB > 20) {
      logger.warn('PhotoProcessor', `图片过大(${sizeMB.toFixed(1)}MB)，可能影响处理性能`)
    }
  } catch (e) {
    logger.warn('PhotoProcessor', '无法获取文件大小:', e)
  }

  try {
    await RNFS.copyFile(cleanPath, outputPath)
  } catch (e) {
    logger.error('PhotoProcessor', '图片复制失败:', e)
    throw new Error('IMAGE_COPY_FAILED')
  }

  const processedMeta = {
    originalPath: imagePath,
    outputPath,
    cropRatio,
    filterName,
    faceCenter,
    timestamp,
  }

  try {
    await RNFS.writeFile(
      `${cacheDir}/process_meta_${timestamp}.json`,
      JSON.stringify(processedMeta),
      'utf8'
    )
  } catch (e) {
    logger.warn('PhotoProcessor', '写入元数据失败:', e)
  }

  const duration = Date.now() - startTime
  logger.debug('PhotoProcessor', '图片处理完成:', {
    outputPath,
    durationMs: duration,
    filterName,
    cropRatio,
    timestamp: new Date().toISOString(),
  })
  return outputPath
}

/**
 * 保存到相册
 * Android: 使用 @react-native-camera-roll/camera-roll 写入相册
 * iOS: 保存到 Documents 目录（Photos App 可扫描到）
 */
export async function saveToAlbum(imagePath: string): Promise<boolean> {
  if (!imagePath || typeof imagePath !== 'string') {
    logger.warn('PhotoProcessor', 'saveToAlbum: 非法路径参数')
    return false
  }
  try {
    const cleanPath = imagePath.replace(/^file:\/\//, '').trim()
    if (!(await RNFS.exists(cleanPath))) {
      logger.warn('PhotoProcessor', 'saveToAlbum: 源文件不存在:', cleanPath)
      return false
    }
    const timestamp = Date.now()
    const subDir = '/BoyfriendCamera'
    const destDir = Platform.OS === 'ios'
      ? RNFS.DocumentDirectoryPath
      : RNFS.CachesDirectoryPath

    const targetDir = destDir + subDir
    const destPath = `${targetDir}/photo_${timestamp}.jpg`

    const dirExists = await RNFS.exists(targetDir)
    if (!dirExists) await RNFS.mkdir(targetDir)

    await RNFS.copyFile(cleanPath, destPath)

    try {
      const photoUri = `file://${destPath}`
      await CameraRoll.save(photoUri, { type: 'photo', album: 'BoyfriendCamera' })
      logger.debug('PhotoProcessor', '写入系统相册成功')
    } catch (crError) {
      logger.warn('PhotoProcessor', 'CameraRoll 保存失败，文件已保存到缓存:', crError)
    }

    return true
  } catch (e) {
    logger.error('PhotoProcessor', '保存失败:', e)
    return false
  }
}

/**
 * 获取 Skia ColorMatrix 参数
 * 用于 Skia.ColorFilter.MakeMatrix() 实时滤镜渲染
 * 格式: [r, g, b, a, t] 每通道乘数 + 偏移
 * 组合: 饱和度 → 对比度 → 亮度
 */
export function getColorMatrix(filterName: string | null): number[] {
  const identity = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]

  if (!filterName || !FILTER_PARAMS[filterName]) return identity

  const p = FILTER_PARAMS[filterName]
  const { brightness, contrast, saturation } = p

  const b = brightness
  const c = contrast
  const s = saturation

  const sr = 1 - s
  const lumR = 0.3086 * sr
  const lumG = 0.6094 * sr
  const lumB = 0.0820 * sr

  const satMatrix = [
    lumR + s, lumG, lumB, 0, 0,
    lumR, lumG + s, lumB, 0, 0,
    lumR, lumG, lumB + s, 0, 0,
    0, 0, 0, 1, 0,
  ]

  const t1 = (1 - c) / 2
  const contrastMatrix = [
    c, 0, 0, 0, t1,
    0, c, 0, 0, t1,
    0, 0, c, 0, t1,
    0, 0, 0, 1, 0,
  ]

  const brightnessOffset = (b - 1) * 0.5
  const brightnessMatrix = [
    1, 0, 0, 0, brightnessOffset,
    0, 1, 0, 0, brightnessOffset,
    0, 0, 1, 0, brightnessOffset,
    0, 0, 0, 1, 0,
  ]

  return multiplyMatrices(satMatrix, multiplyMatrices(contrastMatrix, brightnessMatrix))
}

/** 4x5 ColorMatrix 乘法: result = B × A */
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
    let offsetSum = b[row * 5 + 4]
    for (let k = 0; k < 4; k++) {
      offsetSum += b[row * 5 + k] * a[k * 5 + 4]
    }
    result[row * 5 + 4] = offsetSum
  }
  return result
}
