/**
 * useFaceDetection - 人脸检测 Hook
 * 基于 VisionCamera frame processor
 */
import { useState, useCallback } from 'react'

export interface FaceInfo {
  x: number // 归一化坐标 0-1
  y: number
  width: number
  height: number
  area: number // 面积占比
}

export function useFaceDetection() {
  const [faces, setFaces] = useState<FaceInfo[]>([])

  // TODO: 实现 frame processor
  // 使用 react-native-vision-camera 的 FrameProcessorPlugin
  // 调用 MLKit Face Detection
  const processFrame = useCallback((frame: any) => {
    // frame.processFaces() → 提取人脸信息
    console.log('[useFaceDetection] processFrame')
    // setFaces(detectedFaces)
  }, [])

  return { faces, processFrame }
}
