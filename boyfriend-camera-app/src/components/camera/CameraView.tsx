/**
 * CameraView - 相机预览组件
 * 使用 react-native-vision-camera v5 实现实时相机预览
 *
 * v5 API 说明：
 * - usePhotoOutput() 创建 PhotoOutput 实例
 * - Camera 的 outputs prop 接收 PhotoOutput 实例
 * - capturePhotoToFile() 直接写文件，返回 PhotoFile { filePath }
 */
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useEffect } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  PhotoFile,
  CommonResolutions,
  CameraPhotoOutput,
  Photo,
  CameraRef,
} from 'react-native-vision-camera'

export interface CameraViewRef {
  takePhoto: (flashMode?: 'off' | 'on' | 'auto') => Promise<PhotoFile | null>
}

interface Props {
  flash?: 'off' | 'on' | 'auto'
  torchMode?: 'off' | 'on'
  isActive?: boolean
  facing?: 'front' | 'back'
  onError?: (error: string) => void
}

const CameraView = forwardRef<CameraViewRef, Props>(({
  flash = 'off',
  torchMode,
  isActive = true,
  facing = 'back',
  onError,
}, ref) => {
  const internalRef = useRef<CameraRef>(null)
  const photoOutputRef = useRef<CameraPhotoOutput | null>(null)

  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice(facing)

  // Photo output - v5 API
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.UHD_4_3,
    qualityPrioritization: 'quality',
  })

  // 存储 photoOutput 供 takePhoto 使用
  useEffect(() => {
    photoOutputRef.current = photoOutput
  }, [photoOutput])

  // 拍照方法 - v5 API 正确用法
  const takePhoto = useCallback(async (flashMode: 'off' | 'on' | 'auto' = 'off'): Promise<PhotoFile | null> => {
    const output = photoOutputRef.current
    if (!output) return null
    try {
      const photo: Photo = await output.capturePhoto(
        { flashMode: flashMode === 'auto' ? 'auto' : flashMode },
        {}
      )
      try {
        const filePath = await photo.saveToTemporaryFileAsync()
        photo.dispose()
        return { filePath }
      } catch {
        photo.dispose()
        return null
      }
    } catch (e) {
      console.error('[CameraView] 拍照失败:', e)
      return null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    takePhoto,
  }), [takePhoto])

  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }
  }, [hasPermission, requestPermission])

  useEffect(() => {
    if (!hasPermission) {
      onError?.('permission_denied')
    } else if (!device) {
      onError?.('no_device')
    }
  }, [hasPermission, device])

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>📷 需要相机权限</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>授权相机</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>❌ 未找到相机设备</Text>
        <Text style={styles.permissionSubText}>请确保相机可用</Text>
      </View>
    )
  }

  const actualTorch: 'on' | 'off' =
    torchMode === 'on' || flash === 'on' ? 'on' : 'off'

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={[photoOutput]}
        enableNativeZoomGesture={true}
        torchMode={actualTorch}
      />
    </View>
  )
})

CameraView.displayName = 'CameraView'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSubText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: '#FD79A8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default CameraView

// 导出兼容层 - 旧版 takePhoto 接口（deprecated，已废弃）
export async function takePhoto(
  cameraRef: React.RefObject<CameraViewRef>,
  flashMode: 'off' | 'on' | 'auto' = 'off'
): Promise<PhotoFile | null> {
  try {
    const cam = cameraRef?.current
    if (!cam) return null
    return await cam.takePhoto(flashMode)
  } catch (e) {
    console.error('[CameraView] takePhoto 失败:', e)
    return null
  }
}
