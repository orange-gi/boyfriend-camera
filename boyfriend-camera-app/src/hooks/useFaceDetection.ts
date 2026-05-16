/**
 * useFaceDetection - 人脸检测 Hook
 *
 * 基于 react-native-vision-camera 的 FrameProcessorPlugin
 *
 * 接入 MLKit Face Detection 步骤:
 * 1. 安装: npm install @react-native-ml-kit/face-detection
 * 2. 在 CameraScreen 中获取 frame
 * 3. 调用: const faces = await FaceDetection.processImage(frame)
 * 4. 映射到 FaceInfo 格式
 *
 * 如果未安装 MLKit，此 Hook 提供 Mock 模式：
 * 返回模拟人脸数据，用于 VoiceCoach 语音提示演示
 */
import { useState, useCallback } from 'react'

export interface FaceInfo {
  x: number // 归一化中心坐标 0-1
  y: number // 归一化中心坐标 0-1
  width: number // 归一化宽度 0-1
  height: number // 归一化高度 0-1
  area: number // 面积占比（width * height）
  yawAngle?: number // 头部左右旋转角度
  rollAngle?: number // 头部倾斜角度
  leftEyeOpen?: boolean
  rightEyeOpen?: boolean
  smiling?: boolean
}

export function useFaceDetection() {
  const [faces, setFaces] = useState<FaceInfo[]>([])
  const [isDetecting, setIsDetecting] = useState(false)

  /**
   * 处理单帧图像，检测人脸
   * @param frame VisionCamera 的 Frame 对象
   * @returns 检测到的人脸列表
   */
  const processFrame = useCallback(async (frame: { width: number; height: number }): Promise<FaceInfo[]> => {
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

      // Mock 模式：未接入 MLKit 时返回空（避免 VoiceCoach 误报）
      setFaces([])
      return []
    } finally {
      setIsDetecting(false)
    }
  }, [])

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
  }, [])

  return {
    faces,
    isDetecting,
    processFrame,
    setManualFaces,
    clearFaces,
  }
}
