/**
 * ResultScreen - 结果页
 * 展示对比图和评分
 */
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import ComparisonCard from '../components/result/ComparisonCard'
import ScoreBoard from '../components/result/ScoreBoard'
import type { ScoreResult } from '../components/result/ScoreBoard'
import { processPhoto, saveToAlbum } from '../services/photoProcessor'
import { analyzePhoto, saveToDiary } from '../services/analyzer'

const PLACEHOLDER_RESULT: ScoreResult = {
  totalScore: 72,
  compositionScore: 35,
  exposureScore: 22,
  stabilityScore: 10,
  levelScore: 5,
  suggestions: ['头顶留白有点多，下次镜头下移一丢丢～'],
}

export default function ResultScreen({ route, navigation }: any) {
  const { photoPath } = route.params || {}
  const [processedPath, setProcessedPath] = useState(photoPath)
  const [scoreResult, setScoreResult] = useState<ScoreResult>(PLACEHOLDER_RESULT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (photoPath) {
      processAndAnalyze()
    }
  }, [photoPath])

  async function processAndAnalyze() {
    // TODO: 实际处理图片
    // const processed = await processPhoto(photoPath, { cropRatio: 3/4, autoRetouch: true })
    // const analysis = await analyzePhoto({ ... })
    // setProcessedPath(processed)
    // setScoreResult(analysis)
    // await saveToDiary({ date: new Date().toISOString(), score: analysis.totalScore, suggestions: analysis.suggestions, faceCount: 1 })
    console.log('[ResultScreen] 处理中...')
  }

  async function handleSave() {
    setSaving(true)
    try {
      // await saveToAlbum(processedPath)
      Alert.alert('保存成功', '已保存到相册')
    } catch (e) {
      Alert.alert('保存失败', '请检查相册权限')
    } finally {
      setSaving(false)
    }
  }

  function handleRetry() {
    navigation.goBack()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📸 拍照分析</Text>

      {/* 对比卡片 */}
      <ComparisonCard
        originalPath={photoPath || ''}
        processedPath={processedPath || ''}
      />

      {/* 评分 */}
      <ScoreBoard result={scoreResult} />

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
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  retryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  retryBtnText: {
    fontSize: 16,
    color: '#666',
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
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
})
