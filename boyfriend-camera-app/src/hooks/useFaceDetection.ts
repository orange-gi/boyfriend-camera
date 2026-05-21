/**
 * useFaceDetection - 人脸检测 Hook
 *
 * 基于 react-native-vision-camera 的 FrameProcessorPlugin
 *
 * 接入 MLKit Face Detection 步骤:
 * 1. 安装: npm install @react-native-ml-kit/face-detection
 * 2. 在 CameraScreen 中获取 frame:
 *    const frame = ... // VisionCamera frame
 *    const { faces: detectedFaces } = useFaceDetection()
 *    const results = await detectedFaces(frame, 'front')
 * 3. 调用: const faces = await FaceDetection.processImage(frame)
 * 4. 映射到 FaceInfo 格式（见 processFrame 注释中的 MLKit 映射代码）
 * 5. 将 MLKit 的各维度的 probability > 0.5 转为布尔值
 *
 * Mock 模式（MLKit 未安装时）：
 * - 前置摄像头：模拟居中正脸，适当面积
 * - 后置摄像头：模拟较小面积（距离远）
 * - 随机表情数据（smiling/eyes），confidence 固定 0.85
 * - 适用于 VoiceCoach 和 ResultScreen 开发测试
 */
import { useState, useCallback, useRef } from 'react'

export interface FaceInfo {
  x: number // 归一化中心坐标 0-1
  y: number // 归一化中心坐标 0-1
  width: number // 归一化宽度 0-1
  height: number // 归一化高度 0-1
  area: number // 面积占比（width * height）
  yawAngle?: number // 头部左右旋转角度（-90~90），正值=面向右侧
  rollAngle?: number // 头部倾斜角度（-45~45）
  leftEyeOpen?: number // 0-1 概率，MLKit 返回
  rightEyeOpen?: number // 0-1 概率，MLKit 返回
  smiling?: number // 0-1 概率，MLKit 返回
  /** 检测置信度（MLKit 返回，Mock 模式固定 0.85） */
  confidence?: number
}

/** 模拟前置摄像头人脸（较大，居中），带渐进式变化避免 VoiceCoach 误报 */
let _mockFrontX = 0.5
let _mockFrontY = 0.4
let _mockFrontArea = 0.14
let _mockSmiling = false

function mockFrontCameraFace(): FaceInfo {
  // 渐进式变化（每次微调，模拟真实用户移动）
  _mockFrontX = Math.max(0.3, Math.min(0.7, _mockFrontX + (Math.random() - 0.5) * 0.04))
  _mockFrontY = Math.max(0.25, Math.min(0.6, _mockFrontY + (Math.random() - 0.5) * 0.04))
  _mockFrontArea = Math.max(0.06, Math.min(0.3, _mockFrontArea + (Math.random() - 0.5) * 0.01))
  // 笑容状态渐变
  if (Math.random() < 0.05) _mockSmiling = !_mockSmiling

  const area = _mockFrontArea
  const w = Math.sqrt(area * 0.85)
  const h = area / w

  return {
    x: _mockFrontX,
    y: _mockFrontY,
    width: w,
    height: h,
    area,
    yawAngle: (Math.random() - 0.5) * 20,
    rollAngle: (Math.random() - 0.5) * 10,
    leftEyeOpen: Math.random() * 0.25 + 0.7, // 眼睛睁开概率 0.70-0.95
    rightEyeOpen: Math.random() * 0.25 + 0.7, // 眼睛睁开概率 0.70-0.95
    smiling: _mockSmiling ? 0.78 : 0.22, // 笑=0.78，不笑=0.22
    confidence: 0.88,
  }
}

/** 模拟后置摄像头人脸（较小，居中偏上） */
let _mockBackX = 0.5
let _mockBackY = 0.38
let _mockBackArea = 0.05

function mockBackCameraFace(): FaceInfo {
  _mockBackX = Math.max(0.35, Math.min(0.65, _mockBackX + (Math.random() - 0.5) * 0.03))
  _mockBackY = Math.max(0.28, Math.min(0.55, _mockBackY + (Math.random() - 0.5) * 0.03))
  _mockBackArea = Math.max(0.02, Math.min(0.15, _mockBackArea + (Math.random() - 0.5) * 0.005))

  const area = _mockBackArea
  const w = Math.sqrt(area * 0.85)
  const h = area / w

  return {
    x: _mockBackX,
    y: _mockBackY,
    width: w,
    height: h,
    area,
    yawAngle: (Math.random() - 0.5) * 15,
    rollAngle: (Math.random() - 0.5) * 8,
    leftEyeOpen: 0.95, // 后置镜头人脸较大，眼睛通常可见
    rightEyeOpen: 0.95, // 后置镜头人脸较大，眼睛通常可见
    smiling: Math.random() * 0.45 + 0.30, //笑容概率 0.30-0.75
    confidence: 0.82,
  }
}

export function useFaceDetection() {
  const [faces, setFaces] = useState<FaceInfo[]>([])
  const frameCountRef = useRef(0)
  // 保存最新人脸结果（避免闭包陈旧）
  const latestFacesRef = useRef<FaceInfo[]>([])

  /**
   * 处理单帧图像，检测人脸
   * @param frame VisionCamera 的 Frame 对象
   * @param cameraFacing 'front' | 'back' — 用于 Mock 模式生成合理人脸
   * @returns 检测到的人脸列表
   */
  const processFrame = useCallback(async (
    frame: { width: number; height: number },
    cameraFacing: 'front' | 'back' = 'front'
  ): Promise<FaceInfo[]> => {
    // === MLKit 集成说明（接入时取消注释以下代码）===
    // 安装: npm install @react-native-ml-kit/face-detection
    // import FaceDetection from '@react-native-ml-kit/face-detection'
    //
    // const result = await FaceDetection.processImage(frame as android.graphics.Bitmap)
    // const detected: FaceInfo[] = (Array.isArray(result) ? result : [result]).map(f => ({
    //   x: f.frame?.x ? f.frame.x / frame.width : 0.5,
    //   y: f.frame?.y ? f.frame.y / frame.height : 0.4,
    //   width: f.frame?.width ? f.frame.width / frame.width : 0.3,
    //   height: f.frame?.height ? f.frame.height / frame.height : 0.4,
    //   area: f.frame
    //     ? (f.frame.width * f.frame.height) / (frame.width * frame.height)
    //     : 0.12,
    //   yawAngle: f.yawAngle ?? 0,
    //   rollAngle: f.rollAngle ?? 0,
    //   leftEyeOpen: (f.leftEyeOpenProbability ?? 0) > 0.5,
    //   rightEyeOpen: (f.rightEyeOpenProbability ?? 0) > 0.5,
    //   smiling: (f.smilingProbability ?? 0) > 0.6,
    //   confidence: f.probability ?? 0.85,
    // }))
    // setFaces(detected)
    // return detected

    // Mock 模式：每 3 帧生成一次模拟人脸（避免 VoiceCoach 频繁误报）
    frameCountRef.current += 1
    if (frameCountRef.current % 3 === 0) {
      const mockFace = cameraFacing === 'front' ? mockFrontCameraFace() : mockBackCameraFace()
      setFaces([mockFace])
      latestFacesRef.current = [mockFace]
      return [mockFace]
    }
    // 返回最新结果而非闭包中的 faces
    return latestFacesRef.current
  }, [])

  /**
   * 清除检测结果
   */
  const clearFaces = useCallback(() => {
    setFaces([])
    frameCountRef.current = 0
    latestFacesRef.current = []
    // 重置 Mock 状态（每次拍照后重新开始）
    _mockFrontX = 0.5
    _mockFrontY = 0.4
    _mockFrontArea = 0.14
    _mockSmiling = false
    _mockBackX = 0.5
    _mockBackY = 0.38
    _mockBackArea = 0.05
  }, [])

  return {
    faces,
    processFrame,
    clearFaces,
  }
}
