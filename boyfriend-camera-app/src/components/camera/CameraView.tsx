/**
 * CameraView - 相机预览组件
 * 使用 react-native-vision-camera v5 实现实时相机预览
 */
import React, { useCallback, useRef, useEffect } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  PhotoFile,
  CommonResolutions,
  CameraPhotoOutput,
} from 'react-native-vision-camera'

interface Props {
  onPhotoTaken?: (photoFile: PhotoFile) => void
  flash?: 'off' | 'on' | 'auto'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cameraRef?: React.RefObject<any>
  torchMode?: 'off' | 'on'
  isActive?: boolean
}

// 拍照辅助函数 - v5 API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function takePhoto(cameraRef: any, flashMode: 'off' | 'on' | 'auto'): Promise<PhotoFile | null> {
  try {
    const cam = cameraRef?.current
    if (!cam) return null

    const photoOutput = cam?.controller?.outputs?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o?.capturePhotoToFile
    )
    if (photoOutput) {
      const settings = {
        flashMode: flashMode === 'auto' ? ('auto' as const) : flashMode,
      }
      const photo = await photoOutput.capturePhotoToFile(settings, {})
      return photo
    }
    return null
  } catch (e) {
    console.error('[CameraView] 拍照失败:', e)
    return null
  }
}

export default function CameraView({
  flash = 'off',
  cameraRef: externalRef,
  torchMode,
  isActive = true,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = externalRef ?? internalRef

  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice('back')

  // Photo output - v5 API
  const photoOutput: CameraPhotoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.UHD_4_3,
    qualityPrioritization: 'quality',
  })

  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }
  }, [hasPermission, requestPermission])

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
      </View>
    )
  }

  const actualTorch: 'on' | 'off' =
    torchMode === 'on' || flash === 'on' ? 'on' : 'off'

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={[photoOutput]}
        enableNativeZoomGesture={true}
        torchMode={actualTorch}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
