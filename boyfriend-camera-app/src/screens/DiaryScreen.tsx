/** DiaryScreen - 进步日记 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import ProgressChart from '../components/diary/ProgressChart'
import { getDiary, writeDiary, getPeakScore, recalcPeakScore } from '../services/analyzer'
import type { DiaryRecord } from '../services/diaryTypes'
import { avgScore as calcAvgScore } from '../utils/scoring'
import EmptyState from '../components/common/EmptyState'
import { COLORS, borderRadius, scoreGrade as getScoreGrade, scoreColor } from '../theme'
import VoiceCoach from '../components/camera/VoiceCoach'

export default function DiaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Diary'>>()
  const [records, setRecords] = useState<DiaryRecord[]>([])
  const [peakScore, setPeakScore] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [clearAllVisible, setClearAllVisible] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const deleteSheetY = useRef(new Animated.Value(300)).current
  useEffect(() => {
    VoiceCoach.initialize().catch(() => {}) // TTS 引擎初始化，失败静默降级
  }, [])

  const loadDiaryData = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [diary, score] = await Promise.all([getDiary(), getPeakScore()])
      // [...diary] 避免 sort() 变异原始数组（diary 来自 getDiary() 返回值，安全做法）
      setRecords([...diary].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setPeakScore(score)
      // 加载完成后 TTS 播报（fire-and-forget，TTS 失败不影响 UI）
      if (diary.length > 0) {
        VoiceCoach.speakDiaryLoaded(diary.length)
        const highScoreCount = diary.filter(r => r.score >= 80).length
        const milestone: 'first' | 'streak3' | 'streak7' | 'week10' =
          diary.length >= 10 ? 'week10' : highScoreCount >= 7 ? 'streak7' : highScoreCount >= 3 ? 'streak3' : 'first'
        VoiceCoach.speakDiaryMilestone(milestone)
        // 照片数量里程碑 TTS（>= 25 时额外播报，避免与 week10 重复）
        if (diary.length >= 25) VoiceCoach.speakPhotoCountMilestone(diary.length)
      }
    } catch {
      setLoadError(true)
    }
    finally {
      setLoading(false)
    }
  }, [])

  // 日记为空时 TTS 引导（fire-and-forget）
  useEffect(() => {
    if (!loading && !loadError && records.length === 0) {
      VoiceCoach.speakDiaryEmpty().catch(() => {})
    }
  }, [loading, loadError, records.length])

  useFocusEffect(useCallback(() => {
    loadDiaryData()
  }, []))

  const showDeleteSheet = useCallback((date: string) => {
    setDeleteTarget(date)
    Animated.timing(deleteSheetY, { toValue: 0, duration: 220, useNativeDriver: true }).start()
  }, [deleteSheetY])

  const hideDeleteSheet = useCallback(() => {
    Animated.timing(deleteSheetY, { toValue: 300, duration: 250, useNativeDriver: true }).start(() => setDeleteTarget(null))
  }, [deleteSheetY])

  const handleDeleteRecord = useCallback(async () => {
    const date = deleteTarget
    if (!date) return
    hideDeleteSheet()
    try {
      const updated = records.filter((r) => r.date !== date)
      await writeDiary(updated)
      await recalcPeakScore(updated)
      setRecords(updated)
      setPeakScore(updated.length > 0 ? Math.max(...updated.map(r => r.score)) : 0)
      try { VoiceCoach.speakDiaryDeleted() } catch {}
    } catch (e: unknown) {
      Alert.alert('删除失败', '请稍后重试')
    }
  }, [deleteTarget, records, hideDeleteSheet])

  function showClearAllSheet() {
    setClearAllVisible(true)
  }

  async function handleClearAll() {
    setClearAllVisible(false)
    try {
      await writeDiary([])
      await recalcPeakScore([])
      setRecords([])
      setPeakScore(0)
      try { VoiceCoach.speakDiaryCleared() } catch {}
    } catch (e: unknown) {
      Alert.alert('清空失败', '请稍后重试')
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const [diary, score] = await Promise.all([getDiary(), getPeakScore()])
      setRecords([...diary].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setPeakScore(score)
    } catch { /* ignore */ }
    finally {
      setRefreshing(false)
    }
  }

  // 统计数据
  const totalCount = records.length
  const avgScore = calcAvgScore(records)

  // 最高分：优先使用存储的巅峰分，兼顾日记内最高
  const maxScore = peakScore > 0 ? peakScore : (totalCount > 0 ? records.reduce((max, r) => (r.score > max ? r.score : max), 0) : 0)

  // 成就徽章文案（useMemo 缓存，避免每次渲染重算）
  const achievementBadge = useMemo(() => {
    const label =
      maxScore === 100 ? '满分达成' :
      avgScore >= 90 ? '大师级' :
      avgScore >= 80 ? '专业级' :
      avgScore >= 70 ? '进阶中' :
      avgScore >= 60 ? '成长中' :
      '新手期'
    const color =
      maxScore === 100 ? COLORS.warning :
      avgScore >= 80 ? COLORS.success :
      avgScore >= 60 ? COLORS.info :
      COLORS.textMuted
    return { label, color }
  }, [maxScore, avgScore])

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

  // FlatList 数据（保留完整 DiaryRecord 以支持 ProgressChart 和 diff 计算）
  // entries 直接使用 records；ProgressChart 内部切片取最近 10 条
  const entries: DiaryRecord[] = records

  const renderRecord = ({ item, index }: { item: DiaryRecord; index: number }) => {
    const date = new Date(item.date)
    const isValidDate = !isNaN(date.getTime())
    const dateStr = isValidDate
      ? date.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        })
      : '未知日期'
    const timeStr = isValidDate
      ? date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''

    const sc = scoreColor(item.score)
    const grade = getScoreGrade(item.score)
    const prevRecord = records[index + 1]
    const scoreDiff = prevRecord ? item.score - prevRecord.score : null

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onLongPress={() => showDeleteSheet(item.date)}
        delayLongPress={600}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={`${dateStr} 得分 ${item.score} 分${index === 0 ? '，最新' : ''}。长按删除`}
      >
        {/* 左侧分数 — 无背景色：分数本身有颜色，无需色块衬底 */}
        <View style={styles.scoreBadge}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: sc }]}>{item.score}</Text>
            {scoreDiff !== null && (
              <Text style={[styles.scoreDiff, { color: scoreDiff >= 0 ? COLORS.success : COLORS.primary }]}>
                {scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`}
              </Text>
            )}
          </View>
          <Text style={styles.scoreGrade}>{grade}</Text>
        </View>

        {/* 右侧内容 */}
        <View style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{dateStr} {timeStr}</Text>
            <View style={styles.recordRight}>
              {item.templateCategory && (
                <Text style={styles.templateCategoryBadge}>{item.templateCategory}</Text>
              )}
              {index === 0 && <View style={[styles.newTagDot]} />}
            </View>
          </View>

          {item.faceCount > 1 && (
            <Text style={styles.faceCount}>{item.faceCount}人合照</Text>
          )}

          {item.suggestions.length > 0 && (
            <Text style={styles.recordTip} numberOfLines={2}>
              {item.suggestions[0]}
            </Text>
          )}

        </View>
      </TouchableOpacity>
    )
  }

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        {loading ? (
          // 加载中：居中 ActivityIndicator，符合简洁优雅极致原则
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : loadError ? (
          <>
            <View style={styles.emptyErrorCard}>
              <Text style={styles.emptyErrorTitle}>加载失败了</Text>
              <Text style={styles.emptyErrorSubtitle}>别担心，可能是网络小波动</Text>
            </View>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={loadDiaryData}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="重新加载"
              accessibilityHint="点击重新加载进步日记"
            >
              <Text style={styles.retryBtnText}>重新加载</Text>
            </TouchableOpacity>
          </>
        ) : (
          <EmptyState
            type="diary"
            onAction={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
          />
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records.slice(0, 20)}
        keyExtractor={(item) => item.date}
        renderItem={renderRecord}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: COLORS.textPrimary }]}>进步日记</Text>
              <View style={styles.headerActions}>
                {totalCount > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllBtn}
                    onPress={showClearAllSheet}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityLabel="清空所有日记记录"
                  >
                    <Text style={styles.clearAllBtnText}>清空</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel="去拍照"
                >
                  <Text style={styles.cameraBtnText}>拍照</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 简洁优雅：单行横排 3 核心指标，无背景卡片，无阴影，数字靠颜色和字重承载层级 */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: COLORS.textPrimary }]}>{totalCount}</Text>
                <Text style={styles.statLabel}>张</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statNumRow}>
                  <Text style={[styles.statNum, { color: achievementBadge.color }]}>{avgScore}</Text>
                  <Text style={[styles.statLabel, { color: achievementBadge.color }]}>{achievementBadge.label}</Text>
                </View>
                <Text style={styles.statLabel}>平均分</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: COLORS.warning }]}>{maxScore}</Text>
                <Text style={styles.statLabel}>最高分</Text>
              </View>
            </View>

            {/* 本周动态：单独一行，无背景，靠文字颜色区分 */}
            <View style={styles.weekRow}>
              <Text style={styles.weekLabel}>本周</Text>
              <Text style={[styles.weekNum, { color: weeklyStats.weekAvg >= 80 ? COLORS.success : weeklyStats.weekAvg >= 60 ? COLORS.warning : COLORS.textMuted }]}>
                {weeklyStats.weekAvg > 0 ? `均分${weeklyStats.weekAvg}` : '-'}
              </Text>
              <Text style={[styles.weekNum, { color: COLORS.textPrimary }]}>
                {weeklyStats.weekCount > 0 ? `${weeklyStats.weekCount}张` : '暂无'}
              </Text>
              {weeklyStats.streak > 0 && (
                <Text style={[styles.weekNum, { color: COLORS.primary }]}>{weeklyStats.streak}天连续</Text>
              )}
            </View>

            <ProgressChart entries={entries} height={200} />
          </>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={hideDeleteSheet}>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={hideDeleteSheet}
        >
          <Animated.View
            style={[
              styles.sheetContainer,
              { transform: [{ translateY: deleteSheetY }] },
            ]}
          >
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetCancelBtn]}
                onPress={hideDeleteSheet}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="取消"
              >
                <Text style={styles.sheetCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetDeleteBtn]}
                onPress={handleDeleteRecord}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="删除"
                accessibilityHint="确认删除这条进步记录"
              >
                <Text style={styles.sheetDeleteBtnText}>删除</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={clearAllVisible} transparent animationType="fade" onRequestClose={() => setClearAllVisible(false)}>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setClearAllVisible(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetCancelBtn]}
                onPress={() => setClearAllVisible(false)}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="取消"
              >
                <Text style={styles.sheetCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetDeleteBtn]}
                onPress={handleClearAll}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="清空全部"
                accessibilityHint="确认清空所有进步记录，此操作不可恢复"
              >
                <Text style={styles.sheetDeleteBtnText}>清空全部</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  cameraBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cameraBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearAllBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  // 简洁优雅：去掉 statDivider，靠数字颜色/字重承载层级，视觉更通透
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statNum: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // 去装饰化：移除 statDivider — 数字靠颜色和字重承载层级，无需额外分割线
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  weekLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  weekNum: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: borderRadius.xl,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  scoreBadge: {
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
    paddingVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  scoreGrade: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
  },

  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateCategoryBadge: {
    fontSize: 11,
    color: COLORS.textMuted,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    maxWidth: 80,
  },
  recordDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  newTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  recordTip: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  faceCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  scoreDiff: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    padding: 40,
  },
  loadingCenter: {
    paddingVertical: 60,
  },
  // 去装饰化：移除 emptyErrorCard 的 bgCard 背景——错误状态不需要额外视觉层级，颜色本身已传达信息
  emptyErrorCard: {
    borderRadius: borderRadius.xl,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyErrorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyErrorSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginBottom: 16,
  },
  retryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: COLORS.blackAlpha50,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  sheetBtn: {
    flex: 1,
    // 无障碍：确保按钮至少 44px 高
    paddingVertical: 22,
    borderRadius: 25,
    alignItems: 'center',
  },
  sheetCancelBtn: {},
  sheetCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sheetDeleteBtn: {
    backgroundColor: COLORS.danger,
  },
  sheetDeleteBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textOnPrimary,
  },
})
