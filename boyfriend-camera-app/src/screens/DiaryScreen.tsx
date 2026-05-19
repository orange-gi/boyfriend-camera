/**
 * DiaryScreen - 进步日记 v3
 * 改进：卡片网格统计、渐变趋势横幅、紧凑迷你进度条、动画数字
 */
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
  Easing,
  Modal,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import ProgressChart from '../components/diary/ProgressChart'
import { getDiary, writeDiary, getPeakScore, recalcPeakScore, type DiaryRecord } from '../services/analyzer'
import EmptyState from '../components/common/EmptyState'
import { COLORS, colors } from '../theme'

/** Shimmer 动画背景：使用 design token 的 skeleton 色 */
const shimmerBg = (anim: Animated.Value) => ({
  backgroundColor: anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeletonBase, colors.skeletonHighlight],
  }),
})

export default function DiaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Diary'>>()
  const [records, setRecords] = useState<DiaryRecord[]>([])
  const [peakScore, setPeakScore] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const shimmerAnim = useRef(new Animated.Value(0)).current
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [clearAllVisible, setClearAllVisible] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const deleteSheetY = useRef(new Animated.Value(300)).current

  const loadDiaryData = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [diary, score] = await Promise.all([getDiary(), getPeakScore()])
      setRecords(diary.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setPeakScore(score)
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

  // Shimmer 动画
  useEffect(() => {
    if (!loading) return
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    )
    shimmer.start()
    return () => shimmer.stop()
  }, [loading])

  function showDeleteSheet(date: string) {
    setDeleteTarget(date)
    Animated.spring(deleteSheetY, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start()
  }

  function hideDeleteSheet() {
    Animated.timing(deleteSheetY, { toValue: 300, duration: 250, useNativeDriver: true }).start(() => setDeleteTarget(null))
  }

  async function handleDeleteRecord() {
    const date = deleteTarget
    if (!date) return
    hideDeleteSheet()
    try {
      const updated = records.filter((r) => r.date !== date)
      await writeDiary(updated)
      await recalcPeakScore(updated)
      setRecords(updated)
      setPeakScore(updated.length > 0 ? Math.max(...updated.map(r => r.score)) : 0)
    } catch (e: unknown) {
      Alert.alert('删除失败', '请稍后重试')
    }
  }

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
    } catch (e: unknown) {
      Alert.alert('清空失败', '请稍后重试')
    }
  }



  async function handleRefresh() {
    setRefreshing(true)
    try {
      const [diary, score] = await Promise.all([getDiary(), getPeakScore()])
      setRecords(diary.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setPeakScore(score)
    } catch { /* ignore */ }
    finally {
      setRefreshing(false)
    }
  }

  // 统计数据
  const totalCount = records.length
  const avgScore = totalCount > 0
    ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalCount)
    : 0

  // 总进步（第一条=最旧 - 最后一条=最新）：进步为正说明越拍越好
  const totalProgress = totalCount >= 2
    ? records[records.length - 1].score - records[0].score
    : 0

  // 最高分：优先使用存储的巅峰分，兼顾日记内最高
  const maxScore = peakScore > 0 ? peakScore : (totalCount > 0 ? Math.max(...records.map((r) => r.score)) : 0)
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

  // 进步趋势文案
  const trendInfo = useMemo(() => {
    if (totalCount < 3) return { text: '继续加油！', color: COLORS.textMuted, gradient: [COLORS.skeletonHighlight, COLORS.skeletonBase] }
    const recent5 = records.slice(0, Math.min(5, totalCount))
    const avg = recent5.reduce((s, r) => s + r.score, 0) / recent5.length
    if (avg >= 80) return { text: '📸 男友进化中！', color: COLORS.success, gradient: [COLORS.successLight, COLORS.trendSuccessLight] }
    if (avg >= 65) return { text: '📈 稳步提升中', color: COLORS.success, gradient: [COLORS.gradientBlue, COLORS.trendInfoLight] }
    if (avg >= 50) return { text: '💪 还需要多练习', color: COLORS.warning, gradient: [COLORS.warningLight, COLORS.trendWarningLight] }
    return { text: '😅 革命尚未成功', color: COLORS.primary, gradient: [COLORS.dangerLight, COLORS.trendDangerLight] }
  }, [totalCount, records])

  // 进度动画 ref
  const progressAnimRef = useRef(new Animated.Value(0)).current

  // FlatList 数据（保留完整 DiaryRecord 以支持 ProgressChart 和 diff 计算）
  const entries: DiaryRecord[] = records.map((r) => ({
    date: r.date,
    score: r.score,
    suggestions: r.suggestions,
    faceCount: r.faceCount,
    compositionScore: r.compositionScore,
    exposureScore: r.exposureScore,
    stabilityScore: r.stabilityScore,
    levelScore: r.levelScore,
  }))

  // 迷你进度条颜色
  const miniBarColors = [COLORS.primary, COLORS.warning, COLORS.info, COLORS.categoryStyle]
  const miniBarMaxScores = [40, 30, 20, 10]

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

    // 紧凑迷你进度条
    const hasBreakdown = item.compositionScore !== undefined
    const dims = [
      { label: '构图', score: item.compositionScore ?? 0, max: 40 },
      { label: '曝光', score: item.exposureScore ?? 0, max: 30 },
      { label: '稳定', score: item.stabilityScore ?? 0, max: 20 },
      { label: '水平', score: item.levelScore ?? 0, max: 10 },
    ].filter(d => d.score > 0 || item.compositionScore !== undefined)

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onLongPress={() => showDeleteSheet(item.date)}
        delayLongPress={600}
        activeOpacity={0.72}
      >
        {/* 左侧分数 */}
        <View style={[styles.scoreBadge, { backgroundColor: sc + '18' }]}>
          <Text style={[styles.scoreNum, { color: sc }]}>{item.score}</Text>
          <Text style={[styles.scoreGrade, { color: sc }]}>{scoreGrade}</Text>
          {scoreDiff !== null && (
            <Text style={[styles.scoreDiff, { color: scoreDiff >= 0 ? COLORS.success : COLORS.primary }]}>
              {scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`}
            </Text>
          )}
        </View>

        {/* 右侧内容 */}
        <View style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{dateStr} {timeStr}</Text>
            <View style={styles.recordRight}>
              {index === 0 && (
                <View style={[styles.newTag, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.newTagText}>NEW</Text>
                </View>
              )}
              {totalCount >= 3 && (
                <Text style={styles.deleteHint}>长按删除</Text>
              )}
            </View>
          </View>

          {item.suggestions.length > 0 && (
            <Text style={styles.recordTip} numberOfLines={2}>
              💡 {item.suggestions[0]}
            </Text>
          )}

          {item.faceCount > 0 && (
            <Text style={styles.faceCount}>👤 {item.faceCount}人</Text>
          )}

          {/* 紧凑迷你进度条 - 横向一行 */}
          {hasBreakdown && (
            <View style={styles.miniBarRow}>
              {dims.map((d, i) => {
                const pct = Math.min(100, (d.score / d.max) * 100)
                return (
                  <View key={d.label} style={styles.miniBarItem}>
                    <View style={styles.miniBarTrack}>
                      <View
                        style={[
                          styles.miniBarFill,
                          { width: `${pct}%`, backgroundColor: miniBarColors[i] },
                        ]}
                      />
                    </View>
                    <Text style={styles.miniBarLabel}>{d.label}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        {loading ? (
          <View style={styles.skeletonWrapper}>
            <Animated.View style={[styles.skeletonEmoji, shimmerBg(shimmerAnim)]} />
            <Animated.View style={[styles.skeletonTitle, shimmerBg(shimmerAnim)]} />
            <Animated.View style={[styles.skeletonSubtitle, shimmerBg(shimmerAnim)]} />
            <Animated.View style={[styles.skeletonBtn, shimmerBg(shimmerAnim)]} />
          </View>
        ) : loadError ? (
          <>
            <View style={styles.emptyErrorCard}>
              <Text style={styles.emptyErrorEmoji}>😢</Text>
              <Text style={styles.emptyErrorTitle}>加载失败了</Text>
              <Text style={styles.emptyErrorSubtitle}>别担心，可能是网络小波动</Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={loadDiaryData} activeOpacity={0.7}>
              <Text style={styles.retryBtnText}>重新加载</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* 预览进度图表（给用户展示效果） */}
            <View style={styles.emptyPreviewCard}>
              <Text style={styles.emptyPreviewTitle}>📊 你的进步轨迹</Text>
              <View style={styles.emptyChartPlaceholder}>
                <Text style={styles.emptyChartPlaceholderText}>📈</Text>
                <Text style={styles.emptyChartPlaceholderSubtext}>开始拍照后，这里会显示你的进步曲线</Text>
              </View>
            </View>

            {/* 拍照小贴士 */}
            <View style={styles.emptyTipCard}>
              <Text style={styles.emptyTipTitle}>💡 拍照小贴士</Text>
              <Text style={styles.emptyTipText}>
                第一张照片不要有压力！男朋友可以先从「侧身回眸」这种简单的姿势开始，
                三分法构图 + 光线均匀，基本就能拿到 75 分以上～
              </Text>
            </View>

            {/* 情感化引导语 */}
            <View style={styles.emptyMotivationCard}>
              <Text style={styles.emptyMotivationEmoji}>🌟</Text>
              <Text style={styles.emptyMotivationTitle}>每一次拍照都是进步的开始</Text>
              <Text style={styles.emptyMotivationText}>
                不管第一张拍成什么样，记录本身就是一件超酷的事！
                男友相机会在每张照片里找到亮点，然后一起慢慢变好 💕
              </Text>
            </View>

            {/* 里程碑预览 */}
            <View style={styles.emptyMilestoneCard}>
              <Text style={styles.emptyMilestoneTitle}>🏆 里程碑预览</Text>
              <View style={styles.emptyMilestoneList}>
                <View style={styles.emptyMilestoneItem}>
                  <Text style={styles.emptyMilestoneEmoji}>🥉</Text>
                  <Text style={styles.emptyMilestoneLabel}>第一张记录</Text>
                </View>
                <View style={styles.emptyMilestoneItem}>
                  <Text style={styles.emptyMilestoneEmoji}>🥈</Text>
                  <Text style={styles.emptyMilestoneLabel}>首次突破80分</Text>
                </View>
                <View style={styles.emptyMilestoneItem}>
                  <Text style={styles.emptyMilestoneEmoji}>🥇</Text>
                  <Text style={styles.emptyMilestoneLabel}>首次满分100</Text>
                </View>
                <View style={styles.emptyMilestoneItem}>
                  <Text style={styles.emptyMilestoneEmoji}>🏅</Text>
                  <Text style={styles.emptyMilestoneLabel}>连续5次高分</Text>
                </View>
              </View>
              <Text style={styles.emptyMilestoneSubtext}>拍得越多，解锁越多成就！✨</Text>
            </View>

            <EmptyState
              type="diary"
              onAction={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
            />
          </>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records.slice(0, 20)}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        renderItem={renderRecord}
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
            {/* 标题栏 */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: COLORS.textPrimary }]}>📈 进步日记</Text>
              <View style={styles.headerActions}>
                {totalCount > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllBtn}
                    onPress={showClearAllSheet}
                    activeOpacity={0.72}
                  >
                    <Text style={styles.clearAllBtnText}>🗑️ 清空</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() => navigation.navigate({ name: 'Camera' as const, params: {} })}
                  activeOpacity={0.72}
                >
                  <Text style={styles.cameraBtnText}>📸 拍照</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 统计卡片 */}
            <View style={styles.statsCard}>
              {/* 顶部标题 */}
              <Text style={styles.statsCardTitle}>📊 综合数据</Text>
              {/* 4 格统计卡片网格 */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: COLORS.primary + '10' }]}>
                  <Text style={styles.statCardEmoji}>📸</Text>
                  <AnimatedCountUp value={totalCount} style={[styles.statCardNum, { color: COLORS.primary }]} />
                  <Text style={styles.statCardLabel}>拍照次数</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: COLORS.warning + '12' }]}>
                  <Text style={styles.statCardEmoji}>⭐</Text>
                  <AnimatedCountUp value={avgScore} style={[styles.statCardNum, { color: COLORS.warning }]} suffix="分" />
                  <Text style={styles.statCardLabel}>平均分</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: totalProgress >= 0 ? COLORS.success + '10' : COLORS.primary + '10' }]}>
                  <Text style={styles.statCardEmoji}>{totalProgress >= 0 ? '📈' : '📉'}</Text>
                  <AnimatedProgressNum value={totalProgress} style={[styles.statCardNum, { color: totalProgress >= 0 ? COLORS.success : COLORS.primary }]} />
                  <Text style={styles.statCardLabel}>总进步</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: COLORS.statYellow + '20' }]}>
                  <Text style={styles.statCardEmoji}>🏆</Text>
                  <AnimatedCountUp value={maxScore} style={[styles.statCardNum, { color: COLORS.statYellowText }]} suffix="分" />
                  <Text style={styles.statCardLabel}>最高分</Text>
                </View>
              </View>

              {/* 周统计卡片网格 */}
              {totalCount > 0 && (
                <>
                  <Text style={styles.statsCardTitle}>📅 本周数据</Text>
                  <View style={styles.weeklyGrid}>
                  {/* 本周平均分 */}
                  <View style={[styles.weeklyCard, { backgroundColor: COLORS.primary + '12' }]}>
                    <Text style={styles.weeklyCardIcon}>📊</Text>
                    <Text style={[styles.weeklyCardNum, { color: weeklyStats.weekAvg >= 80 ? COLORS.success : weeklyStats.weekAvg >= 60 ? COLORS.warning : COLORS.primary }]}>
                      {weeklyStats.weekAvg > 0 ? weeklyStats.weekAvg : '-'}
                    </Text>
                    <Text style={styles.weeklyCardLabel}>本周均分</Text>
                  </View>

                  {/* 本周拍摄次数 */}
                  <View style={[styles.weeklyCard, { backgroundColor: COLORS.warningLight }]}>
                    <Text style={styles.weeklyCardIcon}>📸</Text>
                    <Text style={[styles.weeklyCardNum, { color: COLORS.warning }]}>
                      {weeklyStats.weekCount}
                    </Text>
                    <Text style={styles.weeklyCardLabel}>本周拍摄</Text>
                  </View>

                  {/* 连续天数 */}
                  <View style={[
                    styles.weeklyCard,
                    weeklyStats.streak >= 7
                      ? { backgroundColor: COLORS.warningLight, borderWidth: 2, borderColor: COLORS.warning }
                      : { backgroundColor: COLORS.primaryLight },
                  ]}>
                    <Text style={styles.weeklyCardIcon}>{weeklyStats.streak >= 7 ? '🔥' : '📅'}</Text>
                    <Text style={[styles.weeklyCardNum, { color: weeklyStats.streak >= 7 ? COLORS.statAmber : COLORS.primary }]}>
                      {weeklyStats.streak}
                    </Text>
                    <Text style={styles.weeklyCardLabel}>连续天数</Text>
                  </View>

                  {/* 最近一次 */}
                  <View style={[styles.weeklyCard, { backgroundColor: COLORS.success + '12' }]}>
                    <Text style={styles.weeklyCardIcon}>🏆</Text>
                    <Text style={[styles.weeklyCardNum, { color: COLORS.success }]}>
                      {recentScore > 0 ? recentScore : '-'}
                    </Text>
                    <Text style={styles.weeklyCardLabel}>最近得分</Text>
                  </View>
                </View>
                </>
              )}

              {/* 渐变色趋势横幅 — 动态文案 */}
              <View style={[styles.trendBanner, { backgroundColor: trendInfo.gradient[0] }]}>
                <View style={[styles.trendBannerInner, { backgroundColor: trendInfo.gradient[1] }]}>
                  {/* 左侧：图标 + 文案 */}
                  <View style={styles.trendBannerLeft}>
                    <Text style={styles.trendBannerIcon}>
                      {avgScore >= 80 ? '🚀' : avgScore >= 65 ? '📈' : avgScore >= 50 ? '💪' : '🌱'}
                    </Text>
                    <Text style={[styles.trendBannerText, { color: trendInfo.color }]}>
                      {trendInfo.text}
                    </Text>
                  </View>
                  {/* 右侧：分数变化 */}
                  {totalProgress !== 0 && (
                    <View style={styles.trendBannerRight}>
                      <Text style={[styles.trendBannerNum, { color: totalProgress >= 0 ? COLORS.success : COLORS.primary }]}>
                        {totalProgress >= 0 ? `+${totalProgress}` : totalProgress}
                      </Text>
                      <Text style={styles.trendBannerNumLabel}>分</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* 打卡徽章栏 */}
            {totalCount > 0 && (
              <View style={styles.badgeRow}>
                {/* 男朋友等级徽章 */}
                {avgScore >= 90 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>👑 大师级摄影师</Text>
                  </View>
                )}
                {avgScore >= 80 && avgScore < 90 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>⭐ 专业摄影师</Text>
                  </View>
                )}
                {avgScore >= 70 && avgScore < 80 && (
                  <View style={[styles.badge, { backgroundColor: COLORS.info + '30', borderColor: COLORS.info }]}>
                    <Text style={[styles.badgeText, { color: COLORS.info }]}>📸 进阶摄影师</Text>
                  </View>
                )}
                {avgScore >= 60 && avgScore < 70 && (
                  <View style={[styles.badge, { backgroundColor: COLORS.warning + '30', borderColor: COLORS.warning }]}>
                    <Text style={[styles.badgeText, { color: COLORS.warning }]}>📷 成长中摄影师</Text>
                  </View>
                )}
                {avgScore < 60 && avgScore > 0 && (
                  <View style={[styles.badge, styles.badgeBronze]}>
                    <Text style={styles.badgeText}>🌱 摄影新手</Text>
                  </View>
                )}
                {/* 拍摄次数里程碑 */}
                {totalCount >= 100 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>💎 百次快门</Text>
                  </View>
                )}
                {totalCount >= 50 && totalCount < 100 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>👑 五十次快门</Text>
                  </View>
                )}
                {totalCount >= 30 && totalCount < 50 && (
                  <View style={[styles.badge, { backgroundColor: COLORS.categoryStyle + '30', borderColor: COLORS.categoryStyle }]}>
                    <Text style={[styles.badgeText, { color: COLORS.categoryStyle }]}>🔥 三十次快门</Text>
                  </View>
                )}
                {totalCount >= 20 && totalCount < 30 && (
                  <View style={[styles.badge, { backgroundColor: COLORS.categoryStyle + '30', borderColor: COLORS.categoryStyle }]}>
                    <Text style={[styles.badgeText, { color: COLORS.categoryStyle }]}>🌟 二十次快门</Text>
                  </View>
                )}
                {totalCount >= 10 && totalCount < 20 && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={styles.badgeText}>🌟 十次快门</Text>
                  </View>
                )}
                {/* 连续打卡 */}
                {weeklyStats.streak >= 3 && (
                  <View style={[styles.badge, styles.badgeBronze]}>
                    <Text style={styles.badgeText}>🔥 连续{weeklyStats.streak}天</Text>
                  </View>
                )}
                {weeklyStats.streak >= 7 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>🏆 连续打卡一周</Text>
                  </View>
                )}
                {/* 月度成就 */}
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
                {/* 首次突破90分 */}
                {maxScore >= 90 && totalCount >= 3 && avgScore >= 75 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>🎯 突破90分</Text>
                  </View>
                )}
                {/* 满分达成 */}
                {maxScore === 100 && (
                  <View style={[styles.badge, styles.badgeGold]}>
                    <Text style={styles.badgeText}>💯 满分达成</Text>
                  </View>
                )}
                {/* 进步之星：连续3次比上次分数高 */}
                {totalCount >= 3 && (() => {
                  const recent3 = records.slice(0, 3)
                  const improved = recent3.length >= 2 && recent3[0].score > recent3[1].score
                  return improved ? (
                    <View style={[styles.badge, { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary }]}>
                      <Text style={[styles.badgeText, { color: COLORS.primary }]}>📸 进步之星</Text>
                    </View>
                  ) : null
                })()}
                {/* 首次拍照鼓励 */}
                {totalCount === 1 && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={styles.badgeText}>🌱 第一次！继续加油</Text>
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
                  <Text style={[styles.monthDiffText, { color: monthlyStats.monthDiff >= 0 ? COLORS.success : COLORS.primary }]}>
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
            <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>📊 进步曲线</Text>
            <ProgressChart entries={entries} height={200} />

            {/* 历史记录标题 */}
            <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>📋 历史记录</Text>
          </>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* 删除确认底部弹窗 */}
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
            {/* 拖动条 */}
            <View style={styles.sheetHandle} />
            {/* 标题 */}
            <Text style={styles.sheetTitle}>🗑️ 删除记录</Text>
            <Text style={styles.sheetSubtitle}>确定要删除这条进步记录吗？删除后不可恢复哦～</Text>
            {/* 操作按钮 */}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetCancelBtn]}
                onPress={hideDeleteSheet}
                activeOpacity={0.72}
              >
                <Text style={styles.sheetCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetDeleteBtn]}
                onPress={handleDeleteRecord}
                activeOpacity={0.72}
              >
                <Text style={styles.sheetDeleteBtnText}>删除</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 清空全部确认底部弹窗 */}
      <Modal visible={clearAllVisible} transparent animationType="fade" onRequestClose={() => setClearAllVisible(false)}>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setClearAllVisible(false)}
        >
          <View style={styles.sheetContainer}>
            {/* 拖动条 */}
            <View style={styles.sheetHandle} />
            {/* 图标 */}
            <Text style={styles.sheetDangerIcon}>⚠️</Text>
            {/* 标题 */}
            <Text style={styles.sheetTitle}>清空全部记录</Text>
            <Text style={styles.sheetSubtitle}>确定要清空所有进步记录吗？此操作不可恢复哦～</Text>
            {/* 操作按钮 */}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetCancelBtn]}
                onPress={() => setClearAllVisible(false)}
                activeOpacity={0.72}
              >
                <Text style={styles.sheetCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetDeleteBtn]}
                onPress={handleClearAll}
                activeOpacity={0.72}
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

  useEffect(() => {
    animValue.setValue(0)
    Animated.timing(animValue, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start()
    const listener = animValue.addListener((v) => setDisplay(Math.round(v.value)))
    return () => animValue.removeListener(listener)
  }, [value])

  return (
    <Animated.Text style={[style, color ? { color } : {}]}>
      {display}{suffix}
    </Animated.Text>
  )
}

/** 进步数字动画（带箭头+颜色） */
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
  const arrow = value >= 0 ? '📈' : '📉'

  return (
    <Animated.Text style={[style, { color }]}>
      {display >= 0 ? `+${display}` : display} {arrow}
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  clearAllBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    overflow: 'hidden',
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  // 4 格统计卡片网格
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statCardEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  statCardNum: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statCardLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
  },
  statNum: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 14,
    marginTop: 8,
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    overflow: 'hidden',
    gap: 14,
  },
  scoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
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
    marginBottom: 4,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteHint: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  weeklyItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
  },
  weeklyLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  weeklyNum: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  weeklySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  recordDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  newTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  newTagText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
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
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    width: 26,
  },
  breakdownBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownScore: {
    fontSize: 10,
    color: COLORS.textSecondary,
    width: 16,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    padding: 40,
  },
  skeletonWrapper: {
    alignItems: 'center',
  },
  skeletonEmoji: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.skeletonBase,
    marginBottom: 16,
  },
  skeletonTitle: {
    width: 160,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.skeletonBase,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 240,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.skeletonBase,
    marginBottom: 24,
  },
  skeletonBtn: {
    width: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.skeletonBase,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeBronze: {
    backgroundColor: COLORS.gradientWarm,
    borderColor: COLORS.warning,
  },
  badgeGold: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  badgeGreen: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
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
    color: COLORS.textMuted,
  },
  monthDiffText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  monthLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  monthNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  monthSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // 周统计卡片网格
  weeklyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  weeklyCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  weeklyCardIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  weeklyCardNum: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  weeklyCardLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // 渐变趋势横幅
  trendBanner: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  trendBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  trendBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  trendBannerIcon: {
    fontSize: 20,
  },
  trendBannerText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  trendBannerRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  trendBannerNum: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  trendBannerNumLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // 迷你进度条
  miniBarRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  miniBarItem: {
    alignItems: 'center',
    flex: 1,
  },
  miniBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  miniBarLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // 空状态错误卡片
  emptyErrorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyErrorEmoji: { fontSize: 48, marginBottom: 12 },
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
  // 空状态预览卡片
  emptyPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  emptyChartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 20,
    opacity: 0.5,
  },
  emptyChartPlaceholderText: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyChartPlaceholderSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  // 空状态小贴士
  emptyTipCard: {
    backgroundColor: colors.warningLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  emptyTipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.statAmber,
    marginBottom: 6,
  },
  emptyTipText: {
    fontSize: 13,
    color: colors.statYellowText,
    lineHeight: 20,
  },
  // 情感化引导卡片
  emptyMotivationCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
  },
  emptyMotivationEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyMotivationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMotivationText: {
    fontSize: 13,
    color: '#C0607A',
    lineHeight: 20,
    textAlign: 'center',
  },
  // 里程碑预览卡片
  emptyMilestoneCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.purpleLight,
  },
  emptyMilestoneTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  emptyMilestoneList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  emptyMilestoneItem: {
    alignItems: 'center',
    gap: 4,
  },
  emptyMilestoneEmoji: {
    fontSize: 28,
  },
  emptyMilestoneLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyMilestoneSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  // 底部弹窗样式
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.skeletonBase,
    marginBottom: 16,
  },
  sheetDangerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
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
  sheetCancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  sheetCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sheetDeleteBtn: {
    backgroundColor: '#FF4757',
  },
  sheetDeleteBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
})
