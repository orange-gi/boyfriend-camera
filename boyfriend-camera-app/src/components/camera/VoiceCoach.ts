/**
 * VoiceCoach - 语音教练
 * 基于人脸位置和陀螺仪数据的语音提示
 * 使用 react-native-tts 朗读
 */
import Tts from 'react-native-tts'
import { type EmotionDetection } from '../../services/analyzer'

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
  // 新增
  GOOD_SIZE: '大小刚刚好！就是现在，按快门！',
  FACE_TOO_EDGE: '往中间站一点点，脸有点靠边了～',
  LOOK_AT_CAMERA: '看镜头！眼神更有神～',
  BLINK_PROMPT: '眨眨眼活动一下，准备好再拍～',
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
  // 新增表情提示
  NERVOUS_FACE: '放松～别僵着，自然一点更好看～',
  TILTED_HEAD_GOOD: '歪头好可爱！就是现在按快门～',
  BOTH_EYES_CLOSED: '两只眼睛都闭了，提醒她睁开～',
  TONGUE_OUT: '哈哈表情太搞怪了！这个也可以抓拍～',
  SURPRISED_FACE: '这惊讶表情好生动！就是现在！',
  SERIOUS_FACE: '表情太严肃了，笑一个试试～',
  PERFECT_FACE: '表情完美！光线也棒，按快门的最佳时机！',
  TALKING_FACE: '在说话的时候抓拍，自然又生动～',
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
  // 新增场景提示
  RAINY_WINDOW: '雨天的窗边光线好柔和，在这拍超有感觉～',
  NIGHT_LIGHTS: '夜景灯光氛围感绝了！打开闪光灯补补光～',
  SUNSET_GLOW: '夕阳光线好温柔！逆光拍剪影超美的～',
  OVERCAST_SOFT: '阴天的光线超柔和，不用担心过曝，拍起来！',
  RESTAURANT_WARM: '餐厅暖光下皮肤好通透，这光线绝了！',
  BEACH_BRIGHT: '海边阳光太强烈了，找个阴凉处或用闪光灯～',
  FOREST_FILTERED: '树荫下的光线像加了滤镜，超适合拍照！',
  STREET_NEON: '街头的霓虹灯光超有感觉，让她在灯光下站好～',
  GYM_SPORTS: '运动风来一张！动作舒展一点，笑得灿烂～',
  BIRTHDAY_CAKE: '生日蛋糕前光线暖暖的，转过来面向光源～',
  MUSEUM_LIGHT: '博物馆灯光适合拍照，让人站在灯光正下方～',
  // 新场景提示（模板扩展）
  CAFE_DATE: '咖啡馆光线暖暖的！让人靠近窗户或者台灯～',
  BOOKSTORE: '书店里的光线很柔和，靠书架站着超有文艺感！',
  KITCHEN_COOKING: '厨房里灶台前光线暖暖的，笑着拍一张～',
  SUBWAY_STATION: '地铁站灯光冷调很有都市感！靠着栏杆随意一点～',
  BEACH_SUNSET: '海边日落光线超美！侧身站着让夕阳打在侧脸上～',
  BALCONY_VIEW: '阳台光线超通透！靠在栏杆上看向远方～',
  BEDROOM_COZY: '卧室里靠窗光线最柔和，歪头笑一个～',
  CAR_SELFIE: '车里拍照也超有感觉！侧身看向窗外，光影绝绝子～',
  GARDEN_FLOWERS: '花丛里光线斑驳，蹲下来仰拍超好看！',
  BALCONY_NIGHT: '夜景阳台好浪漫！打开闪光灯补补光～',
  BATHROOM_MIRROR: '浴室镜子自拍光线好均匀，笑一个～',
  ROOFTOP_CITY: '天台夜景璀璨！开闪光灯让人脸亮起来～',
  SNOW_WINTER: '雪地里光线反射很强，戴上墨镜或找阴影～',
  STADIUM_STAND: '体育场灯光超足！抬头笑一个抓拍～',
  // 野餐场景
  PICNIC: '野餐垫上光线好温柔！躺下来仰拍，超有氛围感～',
  // 健身房场景
  GYM: '健身房镜前光线均匀！侧身站着，笑着拍一张超有活力～',
  // 露营场景
  CAMPING: '露营帐篷前光线超美！靠近帐篷站着，背景超有感觉～',
  // 露台野餐
  ROOFTOP_PICNIC: '天台野餐光线绝绝子！坐着拍一张，背景是城市天际线～',
  // 樱花季
  CHERRY_BLOSSOM: '樱花树下光线斑驳！风吹过来的时候按下快门，绝美～',
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
  // 新增鼓励语
  '眼神好亮！',
  '表情好生动～',
  '这个角度绝了！',
  '背景和衣服颜色好搭！',
  '越拍越自然了！',
  '姿势好优雅！',
  '笑得好甜！',
  '这光线把皮肤拍得好通透～',
  '动作再大一点更好看～',
  '情侣照甜度拉满了！',
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
      // TTS ready
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
  async speakExpressionTip(params: EmotionDetection): Promise<void> {
    const { smiling, leftEyeOpen, rightEyeOpen, yawAngle, rollAngle, sharpness, mouthOpen } = params

    // 模糊检测
    if (sharpness !== undefined && sharpness < 60) {
      await this.speak(EXPRESSION_TIPS.BLURRY)
      return
    }

    // 惊讶表情（张嘴）
    if (mouthOpen !== undefined && mouthOpen > 0.4 && smiling !== true) {
      await this.speak(EXPRESSION_TIPS.SURPRISED_FACE)
      return
    }

    // 两只眼睛都闭了
    if (leftEyeOpen === false && rightEyeOpen === false) {
      await this.speak(EXPRESSION_TIPS.BOTH_EYES_CLOSED)
      return
    }

    // 闭眼检测（单眼闭）
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

    // 头部倾斜检测（有意图的歪头 - 10-20度之间）
    if (rollAngle !== undefined && Math.abs(rollAngle) > 10 && Math.abs(rollAngle) <= 20) {
      await this.speak(EXPRESSION_TIPS.TILTED_HEAD_GOOD)
      return
    }
    if (rollAngle !== undefined && Math.abs(rollAngle) > 20) {
      await this.speak(EXPRESSION_TIPS.ROLL_TILTED)
      return
    }

    // 笑容检测
    if (smiling === true) {
      await this.speak(EXPRESSION_TIPS.SMILING_GOOD)
      return
    }

    // 无笑容且无表情
    if (smiling === false) {
      await this.speak(EXPRESSION_TIPS.SERIOUS_FACE)
      return
    }

    // 眼睛状态好
    if (leftEyeOpen && rightEyeOpen && smiling === undefined) {
      await this.speak(EXPRESSION_TIPS.EYES_OPEN_GOOD)
    }
  }

  /** 滤镜推荐提示（基于场景类型） */
  async speakFilterTip(sceneType: 'warm_light' | 'cool_light' | 'night' | 'sunset' | 'indoor' | 'outdoor' | 'portrait' | 'food' | 'street' | 'night_photo' | 'cloudy' | 'golden_hour' | 'natural_light'): Promise<void> {
    const tips: Record<string, string[]> = {
      warm_light: ['暖色调照片用暖色滤镜更好看～试试「暖阳」滤镜', '这种自然光用暖色滤镜超搭！'],
      cool_light: ['冷色调光线配冷色滤镜，氛围感绝绝子～', '这种光线下冷色滤镜很有质感！'],
      night: ['夜景配「胶片」或「电影」滤镜超有感觉！', '晚上拍照「电影」滤镜氛围感拉满！'],
      sunset: ['夕阳配「黄金」滤镜，颜色会更浓郁～', '这种暖色调用「暖阳」滤镜更好看！'],
      indoor: ['室内用「柔光」滤镜，皮肤看起来更细腻～', '室内光线「柔光」滤镜超适合！'],
      outdoor: ['户外用「生动」滤镜，颜色会更鲜活～', '外景拍照「生动」滤镜绝绝子！'],
      portrait: ['人像照用「人像」滤镜，皮肤通透又自然～', '人像皮肤用「柔光」滤镜看起来更细腻！'],
      food: ['美食照用「生动」或「暖阳」滤镜，食欲感拉满！', '食物拍照「暖阳」滤镜让颜色更诱人～'],
      street: ['街头风配「胶片」滤镜，质感瞬间提升！', '街拍用「电影」滤镜超有故事感！'],
      night_photo: ['夜景用「电影」或「胶片」滤镜，氛围感绝绝子！', '夜晚拍照「电影」滤镜让灯光更有层次～'],
      cloudy: ['阴天光线柔和，用「生动」滤镜增加色彩感～', '阴天拍照「柔光」滤镜让皮肤看起来更通透！'],
      golden_hour: ['黄金时段用「黄金」滤镜，光线更温暖浓郁～', '这个时间段的光配「暖阳」滤镜绝了！'],
      natural_light: ['自然光拍照「柔光」滤镜最适合，还原真实肤色～', '自然光下「柔和」滤镜，皮肤质感超好！'],
    }
    const arr = tips[sceneType] || []
    if (arr.length > 0) {
      await this.speak(arr[Math.floor(Math.random() * arr.length)], true)
    }
  }

  /** 拍照成功确认 */
  async speakCaptureSuccess(): Promise<void> {
    const tips = [
      '咔嚓！拍好啦～',
      '拍到了！来看看效果吧～',
      '完美！就是这张！',
      '好漂亮！男朋友你真棒～',
      '咔嚓！等不及看照片了！',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, true)
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
