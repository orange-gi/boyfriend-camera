/**
 * analyzer.ts - 规则引擎评分与分析
 * 纯本地分析，无需 AI
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const DIARY_KEY = 'progress_diary'

export interface AnalysisResult {
  totalScore: number // 0-100
  compositionScore: number // 0-40
  exposureScore: number // 0-30
  stabilityScore: number // 0-20
  levelScore: number // 0-10
  suggestions: string[]
  problems: string[] // 问题代码列表
}

// 俏皮文案池
const SUGGESTION_POOL: Record<string, string[]> = {
  composition: [
    '头顶留白太多，显得我像被压扁了，下次镜头下移一丢丢～',
    '我被挤到边边了！把我放中间或三分点会更好看哦',
    '构图有点奇怪，试着让我处在画面的视觉焦点上',
  ],
  exposure: [
    '我是藏在阴影里的神秘女友吗？打开闪光灯或靠近光源！',
    '过曝了！我是来拍照的不是来当灯泡的～',
    '光线有点硬，自然光或柔光箱效果更好',
  ],
  stability: [
    '这张照片自带马赛克滤镜，手稳住！深呼吸再按快门',
    '有点糊了，男友手抖得像在跳舞 💃',
    '模糊朦胧不是美，除非你要走印象派路线',
  ],
  level: [
    '地平线都歪了，我俩要倒啦！拍照时看下水平仪',
    '这张照片喝醉了吧哈哈，歪成这样也是种风格（不是）',
    '把手机放稳再拍，别像端着酒杯一样拍照',
  ],
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function analyzePhoto(params: {
  facePosition: { x: number; y: number; area: number } | null
  faceCount: number
  brightness: number // 0-255
  sharpness: number // 拉普拉斯方差，>100 为清晰
  tiltAngle: number // 倾斜角度度数
}): Promise<AnalysisResult> {
  const { facePosition, faceCount, brightness, sharpness, tiltAngle } = params
  const problems: string[] = []
  const suggestions: string[] = []

  // 构图分 0-40
  let compositionScore = 40
  if (faceCount === 0) {
    compositionScore -= 20
    problems.push('composition')
    suggestions.push(pickRandom(SUGGESTION_POOL.composition))
  } else if (facePosition) {
    // 人脸是否在三分区
    const inThird = facePosition.x > 0.25 && facePosition.x < 0.75 &&
                    facePosition.y > 0.2 && facePosition.y < 0.8
    if (!inThird) {
      compositionScore -= 10
      problems.push('composition')
      suggestions.push(pickRandom(SUGGESTION_POOL.composition))
    }
    // 人脸面积占比
    if (facePosition.area < 0.05) {
      compositionScore -= 5
      suggestions.push('离镜头远了些，显得脸有点小～')
    }
  }

  // 曝光分 0-30
  let exposureScore = 30
  if (brightness < 40) {
    exposureScore -= 20
    problems.push('exposure')
    suggestions.push(pickRandom(SUGGESTION_POOL.exposure))
  } else if (brightness > 220) {
    exposureScore -= 15
    problems.push('exposure')
    suggestions.push(pickRandom(SUGGESTION_POOL.exposure))
  } else if (brightness < 60 || brightness > 200) {
    exposureScore -= 8
    problems.push('exposure')
    suggestions.push(pickRandom(SUGGESTION_POOL.exposure))
  }

  // 稳定分 0-20
  let stabilityScore = 20
  if (sharpness < 50) {
    stabilityScore -= 15
    problems.push('stability')
    suggestions.push(pickRandom(SUGGESTION_POOL.stability))
  } else if (sharpness < 100) {
    stabilityScore -= 5
    problems.push('stability')
    suggestions.push(pickRandom(SUGGESTION_POOL.stability))
  }

  // 水平分 0-10
  let levelScore = 10
  const absTilt = Math.abs(tiltAngle)
  if (absTilt > 10) {
    levelScore -= 8
    problems.push('level')
    suggestions.push(pickRandom(SUGGESTION_POOL.level))
  } else if (absTilt > 5) {
    levelScore -= 4
    problems.push('level')
    suggestions.push(pickRandom(SUGGESTION_POOL.level))
  } else if (absTilt > 2) {
    levelScore -= 2
  }

  const totalScore = compositionScore + exposureScore + stabilityScore + levelScore

  return {
    totalScore,
    compositionScore,
    exposureScore,
    stabilityScore,
    levelScore,
    suggestions,
    problems,
  }
}

// 进步日记存储
export interface DiaryRecord {
  date: string
  score: number
  suggestions: string[]
  faceCount: number
}

export async function saveToDiary(record: DiaryRecord): Promise<void> {
  try {
    const existing = await getDiary()
    existing.push(record)
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(existing))
  } catch (e) {
    console.error('[Analyzer] 保存日记失败:', e)
  }
}

export async function getDiary(): Promise<DiaryRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(DIARY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
