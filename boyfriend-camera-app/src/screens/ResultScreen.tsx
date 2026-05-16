/**
 * ResultScreen - 结果页 v2
 * 拍照→处理→评分→展示完整流程
 * 改进：夸奖展示、更好看的对比卡片、整体评分动画
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
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
import { processPhoto, saveToAlbum } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary, type AnalysisResult } from '../services/analyzer'
import { useFaceDetection } from '../hooks/useFaceDetection'

const { width: SCREEN_W } = Dimensions.get('window')

export default function ResultScreen({ route, navigation }: any) {
  const { photoPath } = route.params || {}

  const [processedPath, setProcessedPath] = useState<string>('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [praiseList, setPraiseList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'warm' | 'cool' | 'vivid' | 'soft' | 'bw'>('warm')
  const [comparisonUri, setComparisonUri] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewShotRef = useRef<any>(null)
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

      // Step 2: 评分分析
      const faceData = faces[0] || { x: 0.5, y: 0.35, area: 0.1 }
      const analysis: AnalysisResult = await analyzePhoto({
        facePosition: faceData,
        faceCount: faces.length,
        brightness: 140,
        sharpness: 150,
        tiltAngle: 1.5,
      })

      // 分离夸奖和建议
      setPraiseList(analysis.praise || [])
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
            const uri = await viewShotRef.current.capture()
            setComparisonUri(uri)
          } catch (e) {
            console.warn('[ResultScreen] 截图失败:', e)
          }
        }
      }, 500)
    } catch (e: any) {
      console.error('[ResultScreen] 处理失败:', e)
      setError(e.message || '处理失败')
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
    } catch {
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
        <Text style={styles.errorEmoji}>🤔</Text>
        <Text style={styles.errorText}>没有找到图片</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={handleHome}>
          <Text style={styles.errorBtnText}>返回首页</Text>
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
      <View style={styles.titleRow}>
        <Text style={styles.title}>📸 拍照分析</Text>
        <TouchableOpacity onPress={handleHome} style={styles.homeTinyBtn}>
          <Text style={styles.homeTinyBtnText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {/* 处理中状态 */}
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.processingText}>正在分析照片...</Text>
          <Text style={styles.processingSubText}>稍等一下，马上就好～</Text>
        </View>
      )}

      {/* 夸奖横幅 */}
      {praiseList.length > 0 && !processing && (
        <View style={styles.praiseBanner}>
          {praiseList.slice(0, 2).map((p, i) => (
            <Text key={i} style={styles.praiseText}>🌟 {p}</Text>
          ))}
        </View>
      )}

      {/* 对比卡片（用于截图） */}
      <View style={processing ? styles.blurred : undefined}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 0.9 }}
          style={styles.viewShot}
        >
          <ComparisonCard
            originalPath={photoPath}
            processedPath={processedPath || photoPath}
            filterName={selectedFilter}
          />
        </ViewShot>
      </View>

      {/* 评分板 */}
      {scoreResult && !processing && (
        <ScoreBoard result={scoreResult} />
      )}

      {/* 操作按钮 */}
      {!processing && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.7}>
            <Text style={styles.retryBtnText}>🔄 重拍</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>{saving ? '保存中...' : '💾 保存'}</Text>
          </TouchableOpacity>
        </View>
      )}

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  homeTinyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTinyBtnText: {
    fontSize: 18,
  },
  processingOverlay: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  processingSubText: {
    marginTop: 4,
    fontSize: 13,
    color: '#999',
  },
  praiseBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB347',
  },
  praiseText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 2,
  },
  blurred: {
    opacity: 0.3,
  },
  viewShot: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  errorEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  errorBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
})
