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
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import ProgressChart from '../components/diary/ProgressChart'
import { getDiary, writeDiary, getPeakScore, recalcPeakScore } from '../services/analyzer'
import type { DiaryRecord } from '../services/diaryTypes'
import { avgScore as calcAvgScore } from '../utils/scoring'
import EmptyState from '../components/common/EmptyState'
import { COLORS, borderRadius } from '../theme'
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
  // 骨架屏 shimmer 动画
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    VoiceCoach.initialize().catch(() => {}) // TTS 引擎初始化，失败静默降级
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(skeletonOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  const skeletonOpacityStyle = { opacity: skeletonOpacity }

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

  // 总进步 = 最新得分 - 初始得分（正数代表进步，负数代表退步）
  // records 按日期降序排列：records[0] = 最新，records[last] = 最旧
  // 用 oldest - newest = improvement，正数代表进步
  const totalProgress = totalCount >= 2
    ? records[records.length - 1].score - records[0].score
    : 0

  // 最高分：优先使用存储的巅峰分，兼顾日记内最高
  const maxScore = peakScore > 0 ? peakScore : (totalCount > 0 ? records.reduce((max, r) => (r.score > max ? r.score : max), 0) : 0)
  // recentScore available as records[0]?.score when needed

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

  // 进步趋势文案
  // trendInfo computed inline when needed via calcAvgScore

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

    const sc = item.score >= 80 ? COLORS.scoreGreat : item.score >= 60 ? COLORS.scoreOk : COLORS.scoreBad
    const scoreGrade = item.score >= 90 ? 'S' : item.score >= 80 ? 'A' : item.score >= 70 ? 'B' : item.score >= 60 ? 'C' : 'D'
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
          <Text style={styles.scoreGrade}>{scoreGrade}</Text>
        </View>

        {/* 右侧内容 */}
        <View style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{dateStr} {timeStr}</Text>
            <View style={styles.recordRight}>
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
          // 骨架屏左对齐，模拟真实内容布局；shimmer 动画让加载状态更自然
          <Animated.View style={[styles.skeletonContent, skeletonOpacityStyle]}>
            <View style={[styles.skeletonAvatar, { backgroundColor: COLORS.skeletonBase }]} />
            <View style={[styles.skeletonTitle, { backgroundColor: COLORS.skeletonBase }]} />
            <View style={[styles.skeletonBtn, { backgroundColor: COLORS.skeletonBase }]} />
          </Animated.View>
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

            <View style={styles.statsCard}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <AnimatedCountUp value={totalCount} style={[styles.statCardNum, { color: COLORS.textPrimary }]} />
                  <Text style={styles.statCardLabel}>拍照次数</Text>
                </View>
                <View style={styles.statCard}>
                  <AnimatedCountUp value={avgScore} style={[styles.statCardNum, { color: COLORS.primary }]} suffix="分" />
                  <Text style={styles.statCardLabel}>平均分</Text>
                </View>
                <View style={styles.statCard}>
                  <AnimatedProgressNum value={totalProgress} style={[styles.statCardNum, { color: totalProgress >= 0 ? COLORS.success : COLORS.textMuted }]} />
                  <Text style={styles.statCardLabel}>总进步</Text>
                </View>
                <View style={styles.statCard}>
                  <AnimatedCountUp value={maxScore} style={[styles.statCardNum, { color: COLORS.warning }]} suffix="分" />
                  <Text style={styles.statCardLabel}>最高分</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statCardNum, { color: weeklyStats.weekAvg >= 80 ? COLORS.success : weeklyStats.weekAvg >= 60 ? COLORS.warning : COLORS.textMuted }]}>
                    {weeklyStats.weekAvg > 0 ? weeklyStats.weekAvg : '-'}
                  </Text>
                  <Text style={styles.statCardLabel}>本周均分</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statCardNum, { color: COLORS.textPrimary }]}>{weeklyStats.weekCount}</Text>
                  <Text style={styles.statCardLabel}>本周拍摄</Text>
                </View>
              </View>
            </View>

            {totalCount > 0 && (() => {
              const badgeLabel =
                maxScore === 100 ? '满分达成' :
                avgScore >= 90 ? '大师级' :
                avgScore >= 80 ? '专业级' :
                avgScore >= 70 ? '进阶中' :
                avgScore >= 60 ? '成长中' :
                '新手期'
              const badgeColor =
                maxScore === 100 ? COLORS.warning :
                avgScore >= 80 ? COLORS.success :
                avgScore >= 60 ? COLORS.info :
                COLORS.textMuted
              return (
                <View style={styles.achievementBadge}>
                  <Text style={[styles.achievementBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                  {totalCount > 0 && (
                    <Text style={styles.achievementCount}> · {totalCount}张照片 · 最高{peakScore}分</Text>
                  )}
                </View>
              )
            })()}

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

/** 数字递增动画组件 */
function AnimatedCountUp({ value, style, color, suffix = '' }: {
  value: number; style: import('react-native').StyleProp<import('react-native').TextStyle>; color?: string; suffix?: string
}) {
  const animValue = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = React.useState(0)
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0

  useEffect(() => {
    animValue.setValue(0)
    Animated.timing(animValue, {
      toValue: safeValue,
      duration: 800,
      useNativeDriver: false,
    }).start()
    const listener = animValue.addListener((v) => setDisplay(Math.round(v.value)))
    return () => animValue.removeListener(listener)
  }, [safeValue])

  return (
    <Animated.Text style={[style, color ? { color } : {}]}>
      {display}{suffix}
    </Animated.Text>
  )
}

/** 进步数字动画（纯数字+颜色，无箭头装饰） */
function AnimatedProgressNum({ value, style }: { value: number; style: import('react-native').StyleProp<import('react-native').TextStyle> }) {
  const animValue = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = React.useState(0)

  useEffect(() => {
    animValue.setValue(0)
    Animated.timing(animValue, {
      toValue: value,
      duration: 600,
      useNativeDriver: false,
    }).start()
    const listener = animValue.addListener((v) => setDisplay(Math.round(v.value)))
    return () => animValue.removeListener(listener)
  }, [value])

  const color = value >= 0 ? COLORS.success : COLORS.primary
  // 简洁优雅：去掉箭头，颜色+符号已足够传达方向信息

  return (
    <Animated.Text style={[style, { color }]}>
      {display >= 0 ? `+${display}` : display}
    </Animated.Text>
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
    borderRadius: 20,
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
  statsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  // 3×2 统计卡片网格：每行3卡，33.33% 配合 justifyContent:space-between 均分，无溢出风险
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  statCard: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statCardNum: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statCardLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  // 去装饰化：分数主数字 + diff 同行，grade 作为下标注；视觉更舒展
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
  // grade 作为下标注（小字 muted 色），与主分数形成层级
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
  recordDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  // 简洁圆点指示器替代实心标签（去装饰化）
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
  // 骨架屏左对齐，模拟真实记录卡片布局，不再居中显得刻意
  skeletonContent: {
    alignSelf: 'stretch',
  },
  // 骨架屏头像圆 — 语义化命名（不是 emoji）
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.skeletonBase,
    marginBottom: 12,
  },
  skeletonTitle: {
    width: 160,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.skeletonBase,
    marginBottom: 8,
  },

  skeletonBtn: {
    width: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.skeletonBase,
  },
  // 成就徽章 — 简洁文字设计：等级色文字 + 副标题用 muted 色
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
    gap: 0,
  },
  achievementBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  achievementCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  emptyErrorCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  // 空错误状态用横杠占位 — 语义化命名（不是 emoji）
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
    borderRadius: 20,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingVertical: 14,
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
