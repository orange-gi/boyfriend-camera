/**
 * HomeScreen - 首页
 * 引导用户进入拍照或查看历史
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated'
import { getDiary } from '../services/analyzer'
import { useTemplates } from '../hooks/useTemplates'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// 功能介绍数据
const FEATURES: Array<{icon: string; title: string; desc: string; color: string}> = [
  {
    icon: '📐',
    title: '构图辅助',
    desc: '九宫格/黄金螺旋/三角构图线实时叠加',
    color: '#FF6B6B',
  },
  {
    icon: '👗',
    title: '姿势模板',
    desc: '半透明剪影引导，让男友知道该怎么站',
    color: '#FFB347',
  },
  {
    icon: '🤳',
    title: '一键修图',
    desc: '智能裁剪到三分点，自动美颜+滤镜',
    color: '#4ECDC4',
  },
  {
    icon: '📈',
    title: '进步日记',
    desc: '记录每次评分和进步曲线，越拍越好',
    color: '#9B8FE8',
  },
]

export default function HomeScreen({ navigation }: any) {
  const [diaryCount, setDiaryCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const { templates } = useTemplates()

  // 动画
  const titleY = useSharedValue(30)
  const titleOpacity = useSharedValue(0)
  const cameraScale = useSharedValue(0.8)

  useEffect(() => {
    // 加载日记数据
    loadStats()

    // 标题入场动画
    titleY.value = withSpring(0, { damping: 16 })
    titleOpacity.value = withTiming(1, { duration: 500 })

    // 相机按钮脉冲
    cameraScale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withSpring(1.05, { damping: 10 }),
          withSpring(1, { damping: 10 })
        ),
        -1,
        true
      )
    )
  }, [])

  async function loadStats() {
    try {
      const diary = await getDiary()
      setDiaryCount(diary.length)
      if (diary.length > 0) {
        const avg = Math.round(diary.reduce((s, r) => s + r.score, 0) / diary.length)
        setAvgScore(avg)
      }
    } catch (e) {
      // ignore
    }
  }

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOpacity.value,
  }))

  const cameraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cameraScale.value }],
  }))

  const hasProgress = diaryCount > 0

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero 区域 */}
      <Animated.View style={[styles.hero, titleAnimatedStyle]}>
        <View style={styles.avatarRow}>
          <Text style={styles.avatarEmoji}>📸</Text>
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>男友相机</Text>
          </View>
        </View>
        <Text style={styles.title}>让男友镜头下的你</Text>
        <Text style={styles.titleAccent}>更美一点</Text>

        {/* 进度提示 */}
        {hasProgress && (
          <View style={styles.progressHint}>
            <Text style={styles.progressHintText}>
              📊 已拍 {diaryCount} 张 · 平均分 {avgScore}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* 拍照主按钮 */}
      <Animated.View style={[styles.cameraSection, cameraAnimatedStyle]}>
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.85}
        >
          <View style={styles.cameraBtnInner}>
            <Text style={styles.cameraBtnEmoji}>📷</Text>
          </View>
          <View style={styles.cameraBtnRing} />
          <View style={[styles.cameraBtnRing, styles.cameraBtnRing2]} />
        </TouchableOpacity>
        <Text style={styles.cameraBtnLabel}>开始拍照</Text>
        <Text style={styles.cameraBtnSubLabel}>教男友拍出更好的照片</Text>
      </Animated.View>

      {/* 功能介绍 */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>✨ 功能亮点</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[styles.featureCard, { borderLeftColor: f.color }]}
            >
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 底部操作 */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.diaryBtn}
          onPress={() => navigation.navigate('Diary')}
        >
          <Text style={styles.diaryBtnIcon}>📈</Text>
          <Text style={styles.diaryBtnText}>
            {hasProgress ? `进步日记 (${diaryCount})` : '进步日记'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 提示语 */}
      <Text style={styles.bottomTip}>
        💡 拍照后保存到相册，评分会自动记录哦
      </Text>

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
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  avatarBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  avatarBadgeText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
  },
  progressHint: {
    marginTop: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  progressHintText: {
    fontSize: 13,
    color: '#888',
  },
  cameraSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  cameraBtn: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cameraBtnInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  cameraBtnEmoji: {
    fontSize: 30,
  },
  cameraBtnRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  cameraBtnRing2: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: 'rgba(255,107,107,0.15)',
  },
  cameraBtnLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  cameraBtnSubLabel: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 14,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    gap: 12,
  },
  featureIcon: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },
  bottomActions: {
    marginBottom: 12,
  },
  diaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 25,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
  },
  diaryBtnIcon: {
    fontSize: 18,
  },
  diaryBtnText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  bottomTip: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
  },
})
