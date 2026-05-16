/**
 * DiaryScreen - 进步日记
 * 展示历史评分和进步曲线
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import ProgressChart from '../components/diary/ProgressChart'
import { getDiary, type DiaryRecord } from '../services/analyzer'

export default function DiaryScreen() {
  const [records, setRecords] = useState<DiaryRecord[]>([])

  useEffect(() => {
    loadDiary()
  }, [])

  async function loadDiary() {
    const diary = await getDiary()
    setRecords(diary.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
  }

  const avgScore = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length)
    : 0

  const entries = records.map(r => ({
    date: r.date,
    score: r.score,
    suggestions: r.suggestions,
  }))

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 进步日记</Text>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>还没有记录</Text>
          <Text style={styles.emptySubtext}>拍几张照片，开始记录进步吧～</Text>
        </View>
      ) : (
        <>
          {/* 统计概览 */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{records.length}</Text>
              <Text style={styles.statLabel}>拍照次数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{avgScore}</Text>
              <Text style={styles.statLabel}>平均分</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>
                {records.length >= 2
                  ? records[0].score - records[records.length - 1].score > 0
                    ? `+${records[0].score - records[records.length - 1].score}`
                    : records[0].score - records[records.length - 1].score
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>总进步</Text>
            </View>
          </View>

          {/* 进步曲线 */}
          <ProgressChart entries={entries} />

          {/* 历史列表 */}
          <FlatList
            data={records.slice(0, 10)}
            keyExtractor={item => item.date}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>
                    {new Date(item.date).toLocaleDateString('zh-CN')}
                  </Text>
                  <Text style={styles.recordScore}>{item.score}分</Text>
                </View>
                {item.suggestions.length > 0 && (
                  <Text style={styles.recordTip} numberOfLines={2}>
                    💡 {item.suggestions[0]}
                  </Text>
                )}
              </View>
            )}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 20,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
  },
  recordScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  recordTip: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
})
