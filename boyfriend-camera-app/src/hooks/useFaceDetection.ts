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
  leftEyeOpen?: boolean
  rightEyeOpen?: boolean
  smiling?: boolean
  /** 检测置信度（MLKit 返回，Mock 模式固定 0.85） */
  confidence?: number
}

/** 模拟前置摄像头人脸（较大，居中） */
function mockFrontCameraFace(): FaceInfo {
  return {
    x: 0.48 + (Math.random() - 0.5) * 0.08,
    y: 0.38 + (Math.random() - 0.5) * 0.1,
    width: 0.32 + Math.random() * 0.06,
    height: 0.42 + Math.random() * 0.06,
    area: 0.13 + Math.random() * 0.04,
    yawAngle: (Math.random() - 0.5) * 20, // -10 ~ 10 度
    rollAngle: (Math.random() - 0.5) * 10, // -5 ~ 5 度
    leftEyeOpen: Math.random() > 0.08,
    rightEyeOpen: Math.random() > 0.08,
    smiling: Math.random() > 0.3,
  }
}

/** 模拟后置摄像头人脸（较小，居中偏上） */
function mockBackCameraFace(): FaceInfo {
  return {
    x: 0.5 + (Math.random() - 0.5) * 0.06,
    y: 0.35 + (Math.random() - 0.5) * 0.08,
    width: 0.18 + Math.random() * 0.06,
    height: 0.24 + Math.random() * 0.08,
    area: 0.04 + Math.random() * 0.03,
    yawAngle: (Math.random() - 0.5) * 15,
    rollAngle: (Math.random() - 0.5) * 8,
    leftEyeOpen: true,
    rightEyeOpen: true,
    smiling: Math.random() > 0.4,
  }
}

export function useFaceDetection() {
  const [faces, setFaces] = useState<FaceInfo[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const frameCountRef = useRef(0)

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
    setIsDetecting(true)
    try {
      // TODO: 接入 MLKit Face Detection
      // import FaceDetection from '@react-native-ml-kit/face-detection'
      // const result = await FaceDetection.processImage(frame)
      // const detected = result.map(f => ({
      //   x: f.frame.x / frame.width,
      //   y: f.frame.y / frame.height,
      //   width: f.frame.width / frame.width,
      //   height: f.frame.height / frame.height,
      //   area: (f.frame.width * f.frame.height) / (frame.width * frame.height),
      //   yawAngle: f.yawAngle,
      //   rollAngle: f.rollAngle,
      //   leftEyeOpen: f.leftEyeOpenProbability > 0.5,
      //   rightEyeOpen: f.rightEyeOpenProbability > 0.5,
      //   smiling: f.smilingProbability > 0.6,
      // }))
      // setFaces(detected)
      // return detected

      // Mock 模式：每 3 帧生成一次模拟人脸（避免 VoiceCoach 误报）
      frameCountRef.current += 1
      if (frameCountRef.current % 3 === 0) {
        const mock = cameraFacing === 'front' ? mockFrontCameraFace() : mockBackCameraFace()
        const withConfidence = { ...mock, confidence: 0.85 }
        setFaces([withConfidence])
        return [withConfidence]
      }
      return faces // 返回上一次结果
    } finally {
      setIsDetecting(false)
    }
  }, [faces])

  /**
   * 手动设置人脸信息（用于测试或手动标注场景）
   */
  const setManualFaces = useCallback((faceList: FaceInfo[]) => {
    setFaces(faceList)
  }, [])

  /**
   * 清除检测结果
   */
  const clearFaces = useCallback(() => {
    setFaces([])
    frameCountRef.current = 0
  }, [])

  return {
    faces,
    isDetecting,
    processFrame,
    setManualFaces,
    clearFaces,
  }
}
