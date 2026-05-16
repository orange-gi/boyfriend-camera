/**
 * ResultScreen - 结果页
 * 拍照→处理→评分→展示完整流程
 */
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native'
import ViewShot from 'react-native-view-shot'
import ComparisonCard from '../components/result/ComparisonCard'
import ScoreBoard from '../components/result/ScoreBoard'
import type { ScoreResult } from '../components/result/ScoreBoard'
import { processPhoto, saveToAlbum, getFilterParams } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'

const { width: SCREEN_W } = Dimensions.get('window')

export default function ResultScreen({ route, navigation }: any) {
  const { photoPath, photoWidth, photoHeight } = route.params || {}

  const [processedPath, setProcessedPath] = useState<string>('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'warm' | 'cool' | 'vivid' | 'soft' | 'bw'>('warm')
  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewShotRef = React.createRef<typeof ViewShot>() as any
  const { faces } = useFaceDetection()

  // 主处理流程
  useEffect(() => {
    if (!photoPath) {
      setProcessing(false)
      return
    }
    runAnalysis()
  }, [photoPath])

  async function runAnalysis() {
    setProcessing(true)
    setError(null)

    try {
      // Step 1: 图像处理
      const processed = await processPhoto(photoPath, {
        cropRatio: 3 / 4,
        filterName: selectedFilter,
        autoRetouch: true,
        faceCenter: faces[0] ? { x: faces[0].x, y: faces[0].y } : undefined,
      })
      setProcessedPath(processed)

      // Step 2: 评分分析（使用模拟数据，实际从分析云函数获取）
      const faceData = faces[0] || { x: 0.5, y: 0.35, area: 0.1 }
      const analysis = await analyzePhoto({
        facePosition: faceData,
        faceCount: faces.length,
        brightness: 140, // 模拟亮度
        sharpness: 150,  // 模拟清晰度
        tiltAngle: 1.5, // 模拟水平角
      })
      setScoreResult({
        totalScore: analysis.totalScore,
        compositionScore: analysis.compositionScore,
        exposureScore: analysis.exposureScore,
        stabilityScore: analysis.stabilityScore,
        levelScore: analysis.levelScore,
        suggestions: analysis.suggestions,
      })

      // Step 3: 保存到进步日记
      await saveToDiary({
        date: new Date().toISOString(),
        score: analysis.totalScore,
        suggestions: analysis.suggestions,
        faceCount: faces.length,
      })

      // Step 4: 捕获对比卡片截图
      setTimeout(async () => {
        if (viewShotRef.current) {
          try {
            const uri = await (viewShotRef.current as any).capture()
            setComparisonUri(uri)
          } catch (e) {
            console.warn('[ResultScreen] 截图失败:', e)
          }
        }
      }, 300)
    } catch (e: any) {
      console.error('[ResultScreen] 处理失败:', e)
      setError(e.message || '处理失败')
      // 设置兜底数据
      setScoreResult({
        totalScore: 72,
        compositionScore: 35,
        exposureScore: 22,
        stabilityScore: 10,
        levelScore: 5,
        suggestions: ['构图不错，可以试试三分法把人脸放在交点上～'],
      })
    } finally {
      setProcessing(false)
    }
  }

  // 切换滤镜后重新处理
  useEffect(() => {
    if (photoPath && !processing) {
      processPhoto(photoPath, {
        cropRatio: 3 / 4,
        filterName: selectedFilter,
        autoRetouch: true,
      }).then(setProcessedPath)
    }
  }, [selectedFilter])

  async function handleSave() {
    setSaving(true)
    try {
      const pathToSave = comparisonUri || processedPath || photoPath
      const ok = await saveToAlbum(pathToSave)
      if (ok) {
        Alert.alert('✅ 保存成功', '照片已保存到相册，快去发朋友圈吧～')
      } else {
        Alert.alert('保存失败', '请检查相册权限')
      }
    } catch (e) {
      Alert.alert('保存失败', '请检查相册权限')
    } finally {
      setSaving(false)
    }
  }

  function handleRetry() {
    navigation.goBack()
  }

  function handleHome() {
    navigation.navigate('Home')
  }

  if (!photoPath) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>没有图片路径</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleHome}>
          <Text style={styles.retryBtnText}>返回首页</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 标题 */}
      <Text style={styles.title}>📸 拍照分析</Text>

      {/* 处理中状态 */}
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.processingText}>正在分析照片...</Text>
        </View>
      )}

      {/* 对比卡片（用于截图） */}
      <View style={processing ? styles.blurred : undefined}>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
          <ComparisonCard
            originalPath={photoPath}
            processedPath={processedPath || photoPath}
            filterName={selectedFilter}
          />
        </ViewShot>
      </View>

      {/* 评分板 */}
      {scoreResult && (
        <ScoreBoard result={scoreResult} />
      )}

      {/* 操作按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>🔄 重拍</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '保存中...' : '💾 保存到相册'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={handleHome}>
          <Text style={styles.homeBtnText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {/* 底部留白 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  blurred: {
    opacity: 0.4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  retryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  retryBtnText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
  homeBtn: {
    width: 50,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  homeBtnText: {
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
})
