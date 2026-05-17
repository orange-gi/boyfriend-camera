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
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import ProgressChart from '../components/diary/ProgressChart'
import { getDiary, writeDiary, getPeakScore, type DiaryRecord } from '../services/analyzer'
import EmptyState from '../components/common/EmptyState'
import { COLORS } from '../theme/colors'

export default function DiaryScreen({ navigation }: any) {
  const [records, setRecords] = useState<DiaryRecord[]>([])
  const [peakScore, setPeakScore] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadDiaryData = useCallback(() => {
    let cancelled = false
    getDiary().then(diary => {
      if (cancelled) return
      setRecords(diary.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      getPeakScore().then(score => {
        if (!cancelled) setPeakScore(score)
      })
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useFocusEffect(loadDiaryData)

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

  async function handleClearAll() {
    Alert.alert(
      '清空全部记录',
      '确定要清空所有进步记录吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空全部',
          style: 'destructive',
          onPress: async () => {
            await writeDiary([])
            setRecords([])
          },
        },
      ]
    )
  }

  async function handleRefresh() {
    setRefreshing(true)
    const diary = await getDiary()
    setRecords(diary.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    setPeakScore(await getPeakScore())
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
    if (totalCount < 3) return { text: '继续加油！', color: COLORS.textMuted, gradient: ['#f0f0f0', '#e8e8e8'] }
    const recent5 = records.slice(0, Math.min(5, totalCount))
    const avg = recent5.reduce((s, r) => s + r.score, 0) / recent5.length
    if (avg >= 80) return { text: '📸 男友进化中！', color: COLORS.success, gradient: ['#E8F5E9', '#C8E6C9'] }
    if (avg >= 65) return { text: '📈 稳步提升中', color: COLORS.success, gradient: ['#E3F2FD', '#BBDEFB'] }
    if (avg >= 50) return { text: '💪 还需要多练习', color: COLORS.warning, gradient: ['#FFF8E1', '#FFECB3'] }
    return { text: '😅 革命尚未成功', color: COLORS.primary, gradient: ['#FFF3F3', '#FFE0E0'] }
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
  const miniBarColors = ['#FF6B6B', '#FFB347', '#4ECDC4', '#A29BFE']
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
        onLongPress={() => handleDeleteRecord(item.date)}
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
    const hour = new Date().getHours()
    const scenarioTip = hour < 12
      ? '出门约会前先练几张开胃拍～'
      : hour < 17
      ? '周末出游时让男朋友多练练，每一张都是进步！'
      : hour < 20
      ? '晚餐约会最适合拍出氛围感大片～'
      : '夜晚约会也别错过，开启夜景模式试试！'

    return (
      <View style={styles.emptyContainer}>
        {loading ? (
          <View style={styles.skeletonWrapper}>
            <View style={styles.skeletonEmoji} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
            <View style={styles.skeletonBtn} />
          </View>
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

            <EmptyState
              icon="📈"
              title="还没有进步记录"
              subtitle={`${scenarioTip} 第一次约会、周末出游、节日礼物…每拍一张都会悄悄记录成长哦～`}
              action={{ label: '📸 去拍照', onPress: () => navigation.navigate('Camera') }}
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
        keyExtractor={(item) => item.date}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* 标题栏 */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: COLORS.textPrimary }]}>📈 进步日记</Text>
              <View style={styles.headerActions}>
                {totalCount > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllBtn}
                    onPress={handleClearAll}
                    activeOpacity={0.72}
                  >
                    <Text style={styles.clearAllBtnText}>🗑️ 清空</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() => navigation.navigate('Camera')}
                  activeOpacity={0.72}
                >
                  <Text style={styles.cameraBtnText}>📸 拍照</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 统计卡片 */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <AnimatedCountUp value={totalCount} style={styles.statNum} color={COLORS.textPrimary} />
                  <Text style={styles.statLabel}>拍照次数</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <AnimatedCountUp value={avgScore} style={styles.statNum} color={COLORS.textPrimary} suffix="分" />
                  <Text style={styles.statLabel}>平均分</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <AnimatedProgressNum value={totalProgress} style={styles.statNum} />
                  <Text style={styles.statLabel}>总进步</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <AnimatedCountUp value={maxScore} style={styles.statNum} color={COLORS.warning} suffix="分" />
                  <Text style={styles.statLabel}>最高分</Text>
                </View>
              </View>

              {/* 周统计卡片网格 */}
              {totalCount > 0 && (
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
                  <View style={[styles.weeklyCard, { backgroundColor: '#FFF8E1' }]}>
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
                      ? { backgroundColor: '#FFF8E1', borderWidth: 2, borderColor: '#FFD700' }
                      : { backgroundColor: COLORS.primaryLight },
                  ]}>
                    <Text style={styles.weeklyCardIcon}>{weeklyStats.streak >= 7 ? '🔥' : '📅'}</Text>
                    <Text style={[styles.weeklyCardNum, { color: weeklyStats.streak >= 7 ? '#E6A800' : COLORS.primary }]}>
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
              )}

              {/* 渐变色趋势横幅 */}
              <View style={[styles.trendBanner, { backgroundColor: trendInfo.gradient[0] }]}>
                <View style={[styles.trendBannerInner, { backgroundColor: trendInfo.gradient[1] }]}>
                  <Text style={[styles.trendBannerText, { color: trendInfo.color }]}>
                    {trendInfo.text}
                  </Text>
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
                  <View style={[styles.badge, { backgroundColor: '#4ECDC4' + '20', borderColor: '#4ECDC4' }]}>
                    <Text style={[styles.badgeText, { color: '#4ECDC4' }]}>📸 进阶摄影师</Text>
                  </View>
                )}
                {avgScore >= 60 && avgScore < 70 && (
                  <View style={[styles.badge, { backgroundColor: '#FFB347' + '20', borderColor: '#FFB347' }]}>
                    <Text style={[styles.badgeText, { color: '#FFB347' }]}>📷 成长中摄影师</Text>
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
                  <View style={[styles.badge, { backgroundColor: '#A29BFE' + '20', borderColor: '#A29BFE' }]}>
                    <Text style={[styles.badgeText, { color: '#A29BFE' }]}>🔥 三十次快门</Text>
                  </View>
                )}
                {totalCount >= 20 && totalCount < 30 && (
                  <View style={[styles.badge, { backgroundColor: '#A29BFE' + '20', borderColor: '#A29BFE' }]}>
                    <Text style={[styles.badgeText, { color: '#A29BFE' }]}>🌟 二十次快门</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

/** 数字递增动画组件 */
function AnimatedCountUp({ value, style, color, suffix = '' }: {
  value: number; style: any; color?: string; suffix?: string
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
function AnimatedProgressNum({ value, style }: { value: number; style: any }) {
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
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  skeletonTitle: {
    width: 160,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 240,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginBottom: 24,
  },
  skeletonBtn: {
    width: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
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
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB347',
  },
  badgeGold: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD700',
  },
  badgeGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
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
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB347',
  },
  emptyTipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6914',
    marginBottom: 6,
  },
  emptyTipText: {
    fontSize: 13,
    color: '#6B5310',
    lineHeight: 20,
  },
})
