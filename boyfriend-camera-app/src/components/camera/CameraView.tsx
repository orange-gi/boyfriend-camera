/**
 * CameraView - 相机预览组件
 * 使用 react-native-vision-camera v5 实现实时相机预览
 *
 * v5 API 说明：
 * - usePhotoOutput() 创建 PhotoOutput 实例
 * - Camera 的 outputs prop 接收 PhotoOutput 实例
 * - capturePhotoToFile() 直接写文件，返回 PhotoFile { filePath }
 */
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useEffect, useState } from 'react'
import { View, StyleSheet, Text, TouchableOpacity, Linking, Platform } from 'react-native'
import { colors } from '../../theme'
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
import { logger } from '../../utils/logger'

export interface CameraViewRef {
  takePhoto: (flashMode?: 'off' | 'on' | 'auto') => Promise<PhotoFile | null>
  /** 连拍（返回最后一张照片） */
  takeBurstPhoto: (count: number, flashMode?: 'off' | 'on' | 'auto') => Promise<PhotoFile | null>
}

interface Props {
  flash?: 'off' | 'on' | 'auto'
  torchMode?: 'off' | 'on'
  isActive?: boolean
  facing?: 'front' | 'back'
  /** 传 null 表示相机已就绪，清除误报 */
  onError?: (error: string | null) => void
  /** 连拍完成时回调（传入拍摄数量） */
  onBurstDone?: (count: number) => void
}

const CameraView = forwardRef<CameraViewRef, Props>(({
  flash = 'off',
  torchMode,
  isActive = true,
  facing = 'back',
  onError,
  onBurstDone,
}, ref) => {
  const photoOutputRef = useRef<CameraPhotoOutput | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice(facing)
  const [requestedPermission, setRequestedPermission] = useState(false)

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
      } catch (_e) {
        photo.dispose()
        return null
      }
    } catch (e) {
      logger.error('CameraView', '拍照失败', e)
      return null
    }
  }, [])

  // 连拍方法 - 快速连拍多张，返回最后一张
  const takeBurstPhoto = useCallback(async (
    count: number,
    flashMode: 'off' | 'on' | 'auto' = 'off'
  ): Promise<PhotoFile | null> => {
    const output = photoOutputRef.current
    if (!output) return null
    let lastPhoto: PhotoFile | null = null
    for (let i = 0; i < count; i++) {
      try {
        const photo: Photo = await output.capturePhoto(
          { flashMode: flashMode === 'auto' ? 'auto' : flashMode },
          {}
        )
        try {
          const filePath = await photo.saveToTemporaryFileAsync()
          lastPhoto = { filePath }
        } catch (_e) {
          // 忽略保存错误，继续拍下一张
        }
        photo.dispose()
      } catch (_e) {
        // 单张失败，继续下一张
      }
    }
    // 连拍完成后通知
    onBurstDone?.(count)
    return lastPhoto
  }, [onBurstDone])

  useImperativeHandle(ref, () => ({
    takePhoto,
    takeBurstPhoto,
  }), [takePhoto, takeBurstPhoto])

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then(() => setRequestedPermission(true))
    }
  }, [hasPermission, requestPermission])

  // 仅在确认失败时上报；就绪时传 null 清除挂载/切换镜头时的误报
  useEffect(() => {
    const report = onErrorRef.current
    if (hasPermission && device) {
      report?.(null)
      return
    }

    if (!hasPermission) {
      if (requestedPermission) {
        report?.('permission_denied')
      }
      return
    }

    const timer = setTimeout(() => {
      report?.('no_device')
    }, 1000)

    return () => clearTimeout(timer)
  }, [hasPermission, device, requestedPermission])

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:')
    } else {
      Linking.openSettings()
    }
  }

  const handleRetry = () => {
    setRequestedPermission(false)
    setRetryKey((k) => k + 1)
    requestPermission().then(() => setRequestedPermission(true))
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>📷 需要相机权限</Text>
        {requestedPermission ? (
          <>
            <Text style={styles.permissionSubText}>好像被拒绝了🥲</Text>
            <Text style={styles.permissionSubText}>去设置里开启权限就能拍照啦～</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={handleOpenSettings}>
              <Text style={styles.permissionBtnText}>去设置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>重试</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.permissionBtn} onPress={handleRetry}>
            <Text style={styles.permissionBtnText}>授权相机</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>❌ 未找到相机设备</Text>
        <Text style={styles.permissionSubText}>请确保相机可用</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>重试</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.categoryCouple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retryBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
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
    logger.error('CameraView', 'takePhoto 失败', e)
    return null
  }
}
