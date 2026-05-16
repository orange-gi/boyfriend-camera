/**
 * 男友相机 - 分析结果页
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

interface AnalysisResult {
  score?: number
  highlights?: string[]
  suggestions?: { dimension: string; text: string }[]
  tip?: string
  analysis?: string
}

export default function ResultPage() {
  const { imageUri, analysis } = useLocalSearchParams<{
    imageUri: string
    analysis: string
  }>()
  const router = useRouter()
  const [data, setData] = useState<AnalysisResult>({})

  useEffect(() => {
    if (analysis) {
      try {
        setData(JSON.parse(analysis))
      } catch {
        // 如果解析失败，把原始文本当作 analysis
        setData({ analysis })
      }
    }
  }, [analysis])

  const handleShare = async () => {
    const text = buildShareText(data)
    try {
      await Share.share({ message: text })
    } catch (e) {
      // ignore
    }
  }

  const handleCopyTip = async () => {
    const tip = data.tip || ''
    await Clipboard.setStringAsync(tip)
    Alert.alert('已复制', '今日技巧已复制，可以发给男友啦～')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 照片预览 */}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      )}

      {/* 评分 */}
      {data.score != null && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>总体评分</Text>
          <Text style={styles.scoreValue}>{data.score.toFixed(1)}</Text>
          <Text style={styles.scoreMax}>/ 10</Text>
        </View>
      )}

      {/* 亮点夸夸 */}
      {data.highlights && data.highlights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🌟</Text>
            <Text style={styles.sectionTitle}>亮点夸夸</Text>
          </View>
          {data.highlights.map((item, i) => (
            <View key={i} style={styles.highlightItem}>
              <Text style={styles.highlightDot}>•</Text>
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 改进建议 */}
      {data.suggestions && data.suggestions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>📝</Text>
            <Text style={styles.sectionTitle}>改进建议</Text>
          </View>
          {data.suggestions.map((item, i) => (
            <View key={i} style={styles.suggestionItem}>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionTagText}>{item.dimension}</Text>
              </View>
              <Text style={styles.suggestionText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 今日技巧 */}
      {data.tip && (
        <View style={styles.tipCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>💡</Text>
            <Text style={styles.sectionTitle}>今日技巧</Text>
          </View>
          <Text style={styles.tipText}>{data.tip}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTip}>
            <Text style={styles.copyBtnText}>📋 复制技巧</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 原始分析文本（备用） */}
      {data.analysis && !data.highlights && !data.score && (
        <View style={styles.rawAnalysis}>
          <Text style={styles.rawAnalysisText}>{data.analysis}</Text>
        </View>
      )}

      {/* 操作按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 分享给闺蜜</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backBtnText}>再分析一张</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function buildShareText(data: AnalysisResult): string {
  let text = '📸 男友相机分析结果\n\n'
  if (data.score != null) {
    text += `⭐ 总体评分: ${data.score}/10\n\n`
  }
  if (data.highlights?.length) {
    text += '🌟 亮点夸夸\n' + data.highlights.map(h => `• ${h}`).join('\n') + '\n\n'
  }
  if (data.suggestions?.length) {
    text += '📝 改进建议\n' + data.suggestions.map(s => `• [${s.dimension}] ${s.text}`).join('\n') + '\n\n'
  }
  if (data.tip) {
    text += `💡 今日技巧\n${data.tip}\n\n`
  }
  text += '— 来自男友相机 📸'
  return text
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: '#FF8A9B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 20,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  highlightItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  highlightDot: {
    color: '#4CAF50',
    marginRight: 8,
    fontSize: 16,
  },
  highlightText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 22,
  },
  suggestionItem: {
    marginBottom: 10,
  },
  suggestionTag: {
    backgroundColor: '#FFF0F2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  suggestionTagText: {
    color: '#FF8A9B',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  copyBtn: {
    backgroundColor: '#FFE066',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  copyBtnText: {
    color: '#8B6914',
    fontSize: 13,
    fontWeight: '600',
  },
  rawAnalysis: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rawAnalysisText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 24,
  },
  actions: {
    marginTop: 8,
    gap: 12,
  },
  shareBtn: {
    backgroundColor: '#FF8A9B',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backBtn: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  backBtnText: {
    color: '#888',
    fontSize: 15,
  },
})
