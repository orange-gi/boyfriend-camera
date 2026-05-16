/**
 * 男友相机 - 首页
 * 上传照片入口
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../src/contexts/AuthContext'
import { analyzePhoto } from '../src/lib/analyze'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('需要权限', '请允许访问相册')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setSelectedImage(asset.uri)
      await handleAnalyze(asset.base64 || '', asset.uri)
    }
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('需要权限', '请允许访问相机')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setSelectedImage(asset.uri)
      await handleAnalyze(asset.base64 || '', asset.uri)
    }
  }

  const handleAnalyze = async (base64: string, uri: string) => {
    if (!base64) {
      Alert.alert('图片读取失败', '请重试')
      return
    }

    setLoading(true)
    try {
      const result = await analyzePhoto(base64)
      if (result.error) {
        Alert.alert('分析失败', result.error)
        return
      }
      // 跳转到结果页，传递分析结果
      router.push({
        pathname: '/result',
        params: {
          imageUri: uri,
          analysis: JSON.stringify(result.data),
        },
      })
    } catch (e: any) {
      Alert.alert('分析失败', e?.message || '请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.emoji}>📸</Text>
        <Text style={styles.title}>男友相机</Text>
        <Text style={styles.subtitle}>让男友镜头下的你更美</Text>
      </View>

      {/* 示例展示 */}
      <View style={styles.example}>
        <Text style={styles.exampleTitle}>上传一张男友拍的照片</Text>
        <Text style={styles.exampleDesc}>
          AI 会从构图、用光、角度等维度分析
          <br />
          给出评分和改进建议
        </Text>
      </View>

      {/* 上传按钮 */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FF8A9B" />
          <Text style={styles.loadingText}>正在分析照片...</Text>
        </View>
      ) : selectedImage ? (
        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
      ) : (
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
            <Text style={styles.primaryBtnText}>📷 从相册选择</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto}>
            <Text style={styles.secondaryBtnText}>📸 拍照上传</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 使用说明 */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 使用提示</Text>
        <Text style={styles.tipsItem}>• 选择光线充足的照片效果更好</Text>
        <Text style={styles.tipsItem}>• 包含人物的照片会得到更详细的建议</Text>
        <Text style={styles.tipsItem}>• 把分析结果分享给男友，一起进步！</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F6',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  example: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  exampleDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#FF8A9B',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8A9B',
  },
  secondaryBtnText: {
    color: '#FF8A9B',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
  },
  tips: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  tipsItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
  },
})
