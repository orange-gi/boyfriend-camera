/**
 * VoiceCoach - 语音教练
 * 基于人脸位置和陀螺仪数据的语音提示
 * 使用 react-native-tts 朗读
 */
import Tts from 'react-native-tts'

// 提示文案
const FACE_TIPS = {
  NOT_FOUND: '没看到你哦～轻轻挥挥手，让相机找到你',
  TOO_SMALL: '你离镜头有点远，往前走一点点',
  TOO_LARGE: '退后一点点，脸不要顶到边框',
  OFF_CENTER_LEFT: '往右边挪一点点，把你放中间',
  OFF_CENTER_RIGHT: '往左边挪一点点，把你放中间',
  OFF_CENTER_TOP: '镜头稍微下移一点',
  OFF_CENTER_BOTTOM: '镜头稍微上移一点',
  GOOD_POSITION: '位置刚刚好！笑一个～',
  MULTI_FACE: '哇，有好多人～对焦在你身上哦',
}

const STABILITY_TIPS = {
  STABLE: '手很稳，可以按快门了',
  SHAKY: '稳住！手别抖',
  EXTREME_SHAKE: '太抖了！深呼吸，憋住气再拍',
  TILTED: '手机有点歪，看一下水平仪',
}

// 表情检测提示
const EXPRESSION_TIPS = {
  BLURRY: '照片有点糊了，让他手拿稳一点～',
  CLOSED_EYES: '好像有人闭眼了，提醒他睁大眼睛！',
  NO_SMILE: '笑一个！自然一点更好看～',
  SMILING_GOOD: '这个笑容绝了！就是现在，按快门！',
  EYES_OPEN_GOOD: '眼神超有光，这表情太加分了！',
  YAW_LEFT: '脸稍微转过来一点，别侧太多',
  YAW_RIGHT: '脸稍微往这边转一点，别只露侧脸',
  ROLL_TILTED: '头稍微正一点，歪着显脸大哦～',
}

// 场景专项提示
const SCENE_TIPS = {
  BACKLIGHT: '背景太亮了！让人脸朝向光源，这样脸就不会黑黑的啦～',
  STRONG_SUNLIGHT: '太阳有点晒，让女朋友眯眼睛了！找个阴凉处试试～',
  DARK_SCENE: '这里光线有点暗，打开手机手电筒补补光～',
  REFLECTIVE_SCREEN: '手机屏幕反光太厉害了，换个角度试试～',
  BACKGROUNDS_CROWDED: '背景有点乱，让人站到简洁的地方会更好看～',
  GROUND_SHOOT: '仰拍显腿长！这个角度好棒！',
  CEILING_LIGHT: '头顶的光太硬了，脸上有阴影，往边上挪一挪～',
  WINDOW_LIGHT: '窗边光线超美的！让人脸朝向窗户，效果绝绝子～',
  SIDE_LIGHT: '侧光有立体感，但脸有一半是暗的，稍微转一下～',
  GROUP_TOO_FAR: '人太多了挤不下，往后退一步大家都入镜～',
  LOW_ANGLE: '这个低角度好特别！就是抬头有点累，舒服点吗？',
}

// 通用鼓励语
const ENCOURAGEMENT = [
  '这张构图超棒！',
  '光线拿捏得真好～',
  '进步好大呀！',
  '背景好干净，主体好突出！',
  '氛围感满满～',
  '色彩好好看～',
  '姿势好自然！',
  '背景和人都很和谐！',
  '男友摄影水平又提高了呢～',
  '这张我要存下来！',
]

type FaceTipKey = keyof typeof FACE_TIPS
type StabilityTipKey = keyof typeof STABILITY_TIPS

class VoiceCoach {
  private enabled: boolean = false
  private initialized: boolean = false
  private lastFaceTip: string = ''
  private lastStabilityTip: string = ''
  private cooldownMs: number = 3000  // 提示冷却时间
  private lastSpokeAt: number = 0

  async initialize(): Promise<void> {
    if (this.initialized) return
    try {
      await Tts.setDefaultLanguage('zh-CN')
      await Tts.setDefaultRate(0.5)  // 适中语速
      await Tts.setDefaultPitch(1.1) // 稍高音调，更温柔
      await Tts.setDucking(true)
      this.enabled = true
      this.initialized = true
      console.log('[VoiceCoach] TTS initialized')
    } catch (e) {
      console.error('[VoiceCoach] TTS init failed:', e)
    }
  }

  async speak(text: string, force: boolean = false): Promise<void> {
    if (!this.enabled || !text) return

    const now = Date.now()
    // 冷却检查（同一条提示 3 秒内不重复）
    if (!force && now - this.lastSpokeAt < this.cooldownMs) return

    this.lastSpokeAt = now
    this.lastFaceTip = text

    try {
      await Tts.stop()
      await Tts.speak(text)
    } catch (e) {
      console.error('[VoiceCoach] speak failed:', e)
    }
  }

  /** 根据人脸位置判断并播报提示 */
  async speakFaceTip(
    faceX: number | null,   // 0-1 归一化
    faceY: number | null,  // 0-1 归一化
    faceArea: number | null // 面积占比
  ): Promise<void> {
    if (faceX === null || faceY === null) {
      await this.speak(FACE_TIPS.NOT_FOUND)
      return
    }

    // 中心点
    const centerX = 0.5
    const centerY = 0.4 // 三分点偏上

    // 面积极小（<3%）
    if (faceArea !== null && faceArea < 0.03) {
      await this.speak(FACE_TIPS.TOO_SMALL)
      return
    }

    // 面部过大（>40%），超出安全范围
    if (faceArea !== null && faceArea > 0.4) {
      await this.speak(FACE_TIPS.TOO_LARGE)
      return
    }

    // 偏左/偏右
    if (faceX < 0.3) {
      await this.speak(FACE_TIPS.OFF_CENTER_RIGHT)
      return
    }
    if (faceX > 0.7) {
      await this.speak(FACE_TIPS.OFF_CENTER_LEFT)
      return
    }

    // 偏上/偏下
    if (faceY < 0.2) {
      await this.speak(FACE_TIPS.OFF_CENTER_BOTTOM)
      return
    }
    if (faceY > 0.75) {
      await this.speak(FACE_TIPS.OFF_CENTER_TOP)
      return
    }

    // 好位置
    await this.speak(FACE_TIPS.GOOD_POSITION)
  }

  /** 根据稳定性状态播报提示 */
  async speakStabilityTip(
    tiltX: number,
    tiltY: number,
    shakeLevel: number
  ): Promise<void> {
    if (shakeLevel > 0.8) {
      await this.speak(STABILITY_TIPS.EXTREME_SHAKE)
      return
    }
    if (shakeLevel > 0.65) {
      await this.speak(STABILITY_TIPS.SHAKY)
      return
    }
    if (Math.abs(tiltX) > 8 || Math.abs(tiltY) > 8) {
      await this.speak(STABILITY_TIPS.TILTED)
      return
    }
    if (shakeLevel < 0.3 && Math.abs(tiltX) < 5 && Math.abs(tiltY) < 5) {
      await this.speak(STABILITY_TIPS.STABLE, true) // 强制播报（状态好）
    }
  }

  /** 朗读模板的语音提示 */
  async speakTemplateTip(tip: string): Promise<void> {
    await this.speak(tip, true) // 强制朗读
  }

  /** 多脸检测提示 */
  async speakMultiFaceTip(faceCount: number): Promise<void> {
    if (faceCount > 1) {
      await this.speak(FACE_TIPS.MULTI_FACE)
    }
  }

  /** 场景光线提示 */
  async speakSceneTip(scene: keyof typeof SCENE_TIPS): Promise<void> {
    await this.speak(SCENE_TIPS[scene], true)
  }

  /** 推荐下一步动作（拍照后） */
  async speakNextTip(previousScore: number): Promise<void> {
    if (previousScore < 60) {
      const tips = [
        '换个角度试试，让女朋友站到窗边～',
        '光线不好的时候，靠近一点开闪光灯试试～',
        '试试让人把手举起来，和背景形成高低差～',
        '换个位置试试，背景干净更显高级感～',
      ]
      const tip = tips[Math.floor(Math.random() * tips.length)]
      await this.speak(tip, true)
    } else if (previousScore < 80) {
      const tips = [
        '这张不错！再试一个角度，找到最美的光线～',
        '动作可以再丰富一点，比如歪头或者托腮～',
        '换个姿势试试，和背景互动一下会更有趣～',
        '再来一张！光线刚好的时候多拍几张选最好的～',
      ]
      const tip = tips[Math.floor(Math.random() * tips.length)]
      await this.speak(tip, true)
    } else {
      const tips = [
        '哇塞！这张绝了！可以直接发朋友圈！',
        '男朋友你是开挂了吗？这张太美了吧！',
        '这张我要存下来当头像！继续这个感觉！',
      ]
      const tip = tips[Math.floor(Math.random() * tips.length)]
      await this.speak(tip, true)
    }
  }

  /** 表情分析提示（基于 MLKit 检测结果） */
  async speakExpressionTip(params: {
    smiling?: boolean
    leftEyeOpen?: boolean
    rightEyeOpen?: boolean
    yawAngle?: number
    rollAngle?: number
    sharpness?: number
  }): Promise<void> {
    const { smiling, leftEyeOpen, rightEyeOpen, yawAngle, rollAngle, sharpness } = params

    // 模糊检测
    if (sharpness !== undefined && sharpness < 60) {
      await this.speak(EXPRESSION_TIPS.BLURRY)
      return
    }

    // 闭眼检测
    if ((leftEyeOpen === false || rightEyeOpen === false) && smiling !== true) {
      await this.speak(EXPRESSION_TIPS.CLOSED_EYES)
      return
    }

    // 头部偏转检测
    if (yawAngle !== undefined) {
      if (yawAngle < -20) {
        await this.speak(EXPRESSION_TIPS.YAW_RIGHT)
        return
      }
      if (yawAngle > 20) {
        await this.speak(EXPRESSION_TIPS.YAW_LEFT)
        return
      }
    }

    // 头部倾斜检测
    if (rollAngle !== undefined && Math.abs(rollAngle) > 15) {
      await this.speak(EXPRESSION_TIPS.ROLL_TILTED)
      return
    }

    // 笑容检测
    if (smiling === true) {
      await this.speak(EXPRESSION_TIPS.SMILING_GOOD)
      return
    }

    // 眼睛状态
    if (leftEyeOpen && rightEyeOpen && smiling === undefined) {
      await this.speak(EXPRESSION_TIPS.EYES_OPEN_GOOD)
    }
  }

  /** 鼓励语播报 */
  async speakEncouragement(): Promise<void> {
    const tip = ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)]
    await this.speak(tip, true)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.initialized) {
      Tts.stop()
    }
  }

  stop(): void {
    if (this.initialized) {
      Tts.stop()
    }
  }
}

export { FACE_TIPS, STABILITY_TIPS, EXPRESSION_TIPS, SCENE_TIPS }
export default new VoiceCoach()
