/**
 * analyzer.ts - 规则引擎评分与分析 v2
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
  problems: string[]
  praise: string[] // 夸奖文案
}

// 夸奖文案池
const PRAISE_POOL: Record<string, string[]> = {
  composition_great: [
    '哇！这个构图也太专业了吧，三分法则稳稳拿捏！',
    '男朋友这次开窍了！主体位置刚刚好，看起来超舒服～',
    '这张构图绝了！专业摄影师看了都要点头认可！',
    '好家伙，这构图水平突飞猛进啊，是偷偷看了教程吗？',
  ],
  exposure_great: [
    '光线刚刚好，皮肤看起来通透又自然！',
    '亮度满分！这光线简直是老天爷帮忙打的～',
    '这张的光打得也太温柔了吧，看起来皮肤状态超好！',
    '光线完美！有种杂志封面的质感了～',
  ],
  stability_great: [
    '稳如老狗！这张照片清晰到连发丝都数得清！',
    '清晰度满分！男朋友的手终于不抖了，值得表扬！',
    '这张太清晰了，可以直接当头像用！',
    '马步扎得稳！这清晰度，一看就是练过的～',
  ],
  level_great: [
    '地平线笔直！男朋友终于学会看水平仪了，感动！',
    '这张端得超稳，强迫症看了都说舒服！',
    '歪？是谁把照片扶正的？是我男朋友！（骄傲）',
  ],
  face_great: [
    '正脸怼镜头，表情超自然，男朋友这次抓得真好！',
    '笑容满分！这表情一看就是发自内心的开心～',
    '男朋友终于拍到正脸了，这表情太甜了吧！',
    '眼神杀！这张照片让人看了心动～',
  ],
}

// 建议文案池
const SUGGESTION_POOL: Record<string, string[]> = {
  composition: [
    '头顶留白太多，显得我像被压扁了，下次镜头下移一丢丢～',
    '我被挤到边边了！把我放中间或三分点会更好看哦',
    '构图有点奇怪，试着让我处在画面的视觉焦点上',
    '背景太满了，下次让男朋友后退一步试试～',
    '边缘裁切到我了！稍微拉远一点点就完美了',
    '画面有点失衡，整体往这边挪一挪会更好看～',
  ],
  exposure: [
    '我是藏在阴影里的神秘女友吗？打开闪光灯或靠近光源！',
    '过曝了！我是来拍照的不是来当灯泡的～',
    '光线有点硬，自然光或柔光箱效果更好',
    '脸上有点暗，下次让人脸朝向光源方向～',
    '背景太亮人脸太暗，开个屏幕补光试试？',
    '光线有点乱，脸上的阴影好奇怪……换个角度试试',
  ],
  stability: [
    '这张照片自带马赛克滤镜，手稳住！深呼吸再按快门',
    '有点糊了，男朋友手抖得像在跳舞 💃',
    '模糊朦胧不是美，除非你要走印象派路线',
    '糊了糊了！建议让男朋友双手握手机，深呼吸后拍',
    '这张有点糊，下次让他靠墙或找个支撑点～',
    '动起来的照片更模糊，建议先让他站稳再拍',
  ],
  level: [
    '地平线都歪了，我俩要倒啦！拍照时看下水平仪',
    '这张照片喝醉了吧哈哈，歪成这样也是种风格（不是）',
    '把手机放稳再拍，别像端着酒杯一样拍照',
    '斜了斜了！打开相机网格线，参照着拍～',
    '歪了！但歪得很有艺术感……开玩笑的，下次注意哦',
  ],
  face: [
    '脸被切掉了一部分！下次拍完整一点哦～',
    '又是半张脸！男朋友你是要玩抽象艺术吗？',
    '我的脸呢？我的脸去哪了？下次让我在画面里～',
    '拍到了！就是只有一点点……多拍几张总有一张完整～',
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
  const praise: string[] = []

  // 构图分 0-40
  let compositionScore = 40
  if (faceCount === 0) {
    compositionScore -= 20
    problems.push('composition')
    suggestions.push(pickRandom(SUGGESTION_POOL.composition))
  } else if (facePosition) {
    // 人脸是否在三分区
    const inThird =
      facePosition.x > 0.25 &&
      facePosition.x < 0.75 &&
      facePosition.y > 0.2 &&
      facePosition.y < 0.8
    if (!inThird) {
      compositionScore -= 10
      problems.push('composition')
      suggestions.push(pickRandom(SUGGESTION_POOL.composition))
    }
    // 人脸面积占比
    if (facePosition.area < 0.05) {
      compositionScore -= 5
      suggestions.push('离镜头远了些，显得脸有点小～')
    } else if (facePosition.area > 0.5) {
      compositionScore -= 5
      suggestions.push('脸太大了！稍微退后一步，别贴那么近～')
    }
  }
  if (compositionScore >= 35) praise.push(pickRandom(PRAISE_POOL.composition_great))
  if (compositionScore >= 35 && faceCount > 0) praise.push(pickRandom(PRAISE_POOL.face_great))

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
  if (exposureScore >= 28) praise.push(pickRandom(PRAISE_POOL.exposure_great))

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
  if (stabilityScore >= 18) praise.push(pickRandom(PRAISE_POOL.stability_great))

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
  if (levelScore >= 9) praise.push(pickRandom(PRAISE_POOL.level_great))

  const totalScore = compositionScore + exposureScore + stabilityScore + levelScore

  // 确保至少有夸奖
  if (praise.length === 0) {
    if (totalScore >= 80) {
      praise.push('整体表现不错！男朋友进步明显，继续保持～')
    } else if (totalScore >= 60) {
      praise.push('比上次好多了！男朋友在进步呢～')
    } else {
      praise.push('加油！多拍几张，摄影师也是练出来的～')
    }
  }

  return {
    totalScore,
    compositionScore,
    exposureScore,
    stabilityScore,
    levelScore,
    suggestions,
    problems,
    praise,
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
    // 只保留最近 30 条
    const trimmed = existing.slice(-30)
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(trimmed))
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
