/**
 * DiaryScreen - 进步日记
 * 展示历史评分和进步曲线
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import ProgressChart, { type DiaryEntry } from '../components/diary/ProgressChart'
import { getDiary, writeDiary, type DiaryRecord } from '../services/analyzer'

export default function DiaryScreen({ navigation }: any) {
  const [records, setRecords] = useState<DiaryRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadDiary()
    }, [])
  )

  async function loadDiary() {
    const diary = await getDiary()
    // 按时间倒序
    setRecords(diary.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
  }

  async function handleDeleteRecord(date: string) {
    Alert.alert('删除记录', '确定要删除这条进步记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const updated = records.filter((r) => r.date !== date)
          await writeDiary(updated)
          setRecords(updated)
        },
      },
    ])
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadDiary()
    setRefreshing(false)
  }

  // 统计数据
  const totalCount = records.length
  const avgScore = totalCount > 0
    ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalCount)
    : 0

  // 总进步（第一条 - 最后一条）
  const totalProgress = totalCount >= 2
    ? records[0].score - records[records.length - 1].score
    : 0

  // 最高分和最近分
  const maxScore = totalCount > 0 ? Math.max(...records.map((r) => r.score)) : 0
  const recentScore = totalCount > 0 ? records[0].score : 0

  // 周统计数据
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekRecords = records.filter((r) => new Date(r.date) >= weekAgo)
    const weekAvg =
      weekRecords.length > 0
        ? Math.round(weekRecords.reduce((s, r) => s + r.score, 0) / weekRecords.length)
        : 0
    const weekCount = weekRecords.length
    // 计算连续拍照天数
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sortedAsc = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const checkDate = new Date(today)
    for (let i = 0; i < 30; i++) {
      const dayStr = checkDate.toISOString().split('T')[0]
      const hasRecord = sortedAsc.some((r) => r.date.split('T')[0] === dayStr)
      if (hasRecord) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    return { weekAvg, weekCount, streak }
  }, [records])

  // 月度统计数据
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthRecords = records.filter((r) => new Date(r.date) >= monthStart)
    const monthAvg = monthRecords.length > 0
      ? Math.round(monthRecords.reduce((s, r) => s + r.score, 0) / monthRecords.length)
      : 0
    const monthCount = monthRecords.length
    const monthBest = monthRecords.length > 0
      ? Math.max(...monthRecords.map((r) => r.score))
      : 0
    // 上月数据
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const prevMonthRecords = records.filter((r) => {
      const d = new Date(r.date)
      return d >= prevMonthStart && d <= prevMonthEnd
    })
    const prevMonthAvg = prevMonthRecords.length > 0
      ? Math.round(prevMonthRecords.reduce((s, r) => s + r.score, 0) / prevMonthRecords.length)
      : 0
    const monthDiff = monthAvg - prevMonthAvg
    return { monthAvg, monthCount, monthBest, monthDiff, prevMonthAvg }
  }, [records])

  // 进步趋势
  const trendText = () => {
    if (totalCount < 3) return '继续加油！'
    const recent5 = records.slice(0, Math.min(5, totalCount))
    const avg = recent5.reduce((s, r) => s + r.score, 0) / recent5.length
    if (avg >= 80) return '📸 男友进化中！'
    if (avg >= 65) return '📈 稳步提升中'
    if (avg >= 50) return '💪 还需要多练习'
    return '😅 革命尚未成功'
  }

  // FlatList 数据（只显示有记录的日期）
  const entries: DiaryEntry[] = records.map((r) => ({
    date: r.date,
    score: r.score,
    suggestions: r.suggestions,
  }))

  const renderRecord = ({ item, index }: { item: DiaryRecord; index: number }) => {
    const date = new Date(item.date)
    const dateStr = date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
    const timeStr = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const scoreColor = item.score >= 80 ? '#4CAF50' : item.score >= 60 ? '#FFB347' : '#FF6B6B'
    const scoreGrade = item.score >= 90 ? 'S' : item.score >= 80 ? 'A' : item.score >= 70 ? 'B' : item.score >= 60 ? 'C' : 'D'

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onLongPress={() => handleDeleteRecord(item.date)}
        delayLongPress={600}
        activeOpacity={0.8}
      >
        {/* 左侧分数 */}
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '18' }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{item.score}</Text>
          <Text style={[styles.scoreGrade, { color: scoreColor }]}>{scoreGrade}</Text>
        </View>

        {/* 右侧内容 */}
        <View style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{dateStr} {timeStr}</Text>
            <View style={styles.recordRight}>
              {index === 0 && (
                <View style={styles.newTag}>
                  <Text style={styles.newTagText}>NEW</Text>
                </View>
              )}
              {totalCount >= 3 && (
                <Text style={styles.deleteHint}>长按删除</Text>
              )}
            </View>
          </View>

          {/* 维度小分 */}
          {item.suggestions.length > 0 && (
            <Text style={styles.recordTip} numberOfLines={2}>
              💡 {item.suggestions[0]}
            </Text>
          )}

          {/* 人脸数 */}
          {item.faceCount > 0 && (
            <Text style={styles.faceCount}>👤 {item.faceCount}人</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📈</Text>
        <Text style={styles.emptyTitle}>还没有进步记录</Text>
        <Text style={styles.emptySubtitle}>拍几张照片，开始记录你们的拍照进步吧～</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.emptyBtnText}>📸 去拍照</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records.slice(0, 20)}
        keyExtractor={(item) => item.date}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* 标题栏 */}
            <View style={styles.header}>
              <Text style={styles.title}>📈 进步日记</Text>
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={() => navigation.navigate('Camera')}
              >
                <Text style={styles.cameraBtnText}>📸 拍照</Text>
              </TouchableOpacity>
            </View>

            {/* 统计卡片 */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{totalCount}</Text>
                  <Text style={styles.statLabel}>拍照次数</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{avgScore}</Text>
                  <Text style={styles.statLabel}>平均分</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: totalProgress >= 0 ? '#4CAF50' : '#FF6B6B' }]}>
                    {totalProgress >= 0 ? `+${totalProgress}` : totalProgress}
                  </Text>
                  <Text style={styles.statLabel}>总进步</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: '#FFB347' }]}>{maxScore}</Text>
                  <Text style={styles.statLabel}>最高分</Text>
                </View>
              </View>

              {/* 周统计条 */}
              {totalCount > 0 && (
                <View style={styles.weeklyRow}>
                  <View style={styles.weeklyItem}>
                    <Text style={styles.weeklyLabel}>本周</Text>
                    <Text style={[styles.weeklyNum, { color: weeklyStats.weekAvg >= 80 ? '#4CAF50' : weeklyStats.weekAvg >= 60 ? '#FFB347' : '#FF6B6B' }]}>
                      {weeklyStats.weekAvg > 0 ? weeklyStats.weekAvg + '分' : '-'}
                    </Text>
                    <Text style={styles.weeklySub}>{weeklyStats.weekCount}次</Text>
                  </View>
                  <View style={styles.weeklyDivider} />
                  <View style={styles.weeklyItem}>
                    <Text style={styles.weeklyLabel}>连续拍照</Text>
                    <Text style={[styles.weeklyNum, { color: weeklyStats.streak >= 3 ? '#4CAF50' : '#FFB347' }]}>
                      {weeklyStats.streak}天 🔥
                    </Text>
                    <Text style={styles.weeklySub}>{weeklyStats.streak >= 7 ? '太厉害了！' : weeklyStats.streak >= 3 ? '继续加油' : '每天拍一张'}</Text>
                  </View>
                  <View style={styles.weeklyDivider} />
                  <View style={styles.weeklyItem}>
                    <Text style={styles.weeklyLabel}>最近一次</Text>
                    <Text style={[styles.weeklyNum, { color: recentScore >= 80 ? '#4CAF50' : recentScore >= 60 ? '#FFB347' : '#FF6B6B' }]}>
                      {recentScore > 0 ? recentScore + '分' : '-'}
                    </Text>
                    <Text style={styles.weeklySub}>{totalCount}次总计</Text>
                  </View>
                </View>
              )}

              {/* 趋势 */}
              <View style={styles.trendRow}>
                <Text style={styles.trendText}>{trendText()}</Text>
              </View>
            </View>

            {/* 打卡徽章栏 */}
            {totalCount > 0 && (
              <View style={styles.badgeRow}>
                {weeklyStats.streak >= 3 && (
                  <View style={[styles.badge, styles.badgeBronze]}>
                    <Text style={styles.badgeText}>🔥 连续{weeklyStats.streak}天</Text>
                  </View>
                )}
                {weeklyStats.streak >= 7 && (
                  <View style={[styles.badge, styles.badgeSilver]}>
                    <Text style={styles.badgeText}>🏆 连续打卡一周</Text>
                  </View>
                )}
                {monthlyStats.monthBest >= 90 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>🌟 月度最佳{monthlyStats.monthBest}分</Text>
                  </View>
                )}
                {monthlyStats.monthDiff > 5 && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={styles.badgeText}>📈 比上月+{monthlyStats.monthDiff}分</Text>
                  </View>
                )}
              </View>
            )}

            {/* 本月 vs 上月对比 */}
            {monthlyStats.monthCount > 0 && (
              <View style={styles.monthCompareRow}>
                <View style={styles.monthItem}>
                  <Text style={styles.monthLabel}>本月</Text>
                  <Text style={styles.monthNum}>{monthlyStats.monthAvg}分</Text>
                  <Text style={styles.monthSub}>{monthlyStats.monthCount}次</Text>
                </View>
                <View style={styles.monthDivider}>
                  <Text style={styles.monthVs}>vs</Text>
                  <Text style={[styles.monthDiffText, { color: monthlyStats.monthDiff >= 0 ? '#4CAF50' : '#FF6B6B' }]}>
                    {monthlyStats.monthDiff >= 0 ? '+' : ''}{monthlyStats.monthDiff}分
                  </Text>
                </View>
                <View style={styles.monthItem}>
                  <Text style={styles.monthLabel}>上月</Text>
                  <Text style={styles.monthNum}>{monthlyStats.prevMonthAvg > 0 ? monthlyStats.prevMonthAvg + '分' : '-'}</Text>
                  <Text style={styles.monthSub}>{monthlyStats.monthDiff === 0 ? '持平' : monthlyStats.monthDiff > 0 ? '有进步' : '继续加油'}</Text>
                </View>
              </View>
            )}

            {/* 进步曲线 */}
            <Text style={styles.sectionTitle}>📊 进步曲线</Text>
            <ProgressChart entries={entries} height={200} />

            {/* 历史记录标题 */}
            <Text style={styles.sectionTitle}>📋 历史记录</Text>
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B6B" />
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  cameraBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cameraBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#eee',
  },
  statNum: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  trendRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 4,
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    gap: 12,
  },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  scoreGrade: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: -2,
  },
  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteHint: {
    fontSize: 10,
    color: '#ccc',
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  weeklyItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#eee',
  },
  weeklyLabel: {
    fontSize: 10,
    color: '#aaa',
    marginBottom: 2,
  },
  weeklyNum: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weeklySub: {
    fontSize: 10,
    color: '#bbb',
    marginTop: 1,
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  newTag: {
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recordTip: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    lineHeight: 18,
  },
  faceCount: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 打卡徽章
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeBronze: {
    backgroundColor: '#FFF3E0',
  },
  badgeSilver: {
    backgroundColor: '#F0F0F0',
  },
  badgeGold: {
    backgroundColor: '#FFF8E1',
  },
  badgeGreen: {
    backgroundColor: '#E8F5E9',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 月度对比
  monthCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  monthItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthDivider: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  monthVs: {
    fontSize: 11,
    color: '#aaa',
  },
  monthDiffText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  monthLabel: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 2,
  },
  monthNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  monthSub: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
})
