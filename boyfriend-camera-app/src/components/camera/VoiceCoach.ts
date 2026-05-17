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
  // 新增边缘场景
  FACE_MOVING: '别动！脸不要晃来晃去的～',
  FACE_PARTIAL: '脸稍微侧了一点，正对镜头会更好看～',
  LOW_ANGLE_FACE: '抬头看镜头！低角度显下巴～',
  HIGH_ANGLE_FACE: '稍微低头一点点，眼睛更有神～',
  // 模板切换确认
  TEMPLATE_CHANGED: '已切换到新姿势！跟着指导摆好～',
  // 拍摄失败
  CAPTURE_FAILED: '拍照失败了，再试一次吧～',
  // 相册保存
  SAVED_TO_ALBUM: '已保存到相册！可以去相册里找找看～',
  // 拍照成功
  CLICK_SNAP: '咔嚓！拍好了～来看看效果吧！',
}

const STABILITY_TIPS = {
  STABLE: '手很稳，可以按快门了',
  STABLE_2: '稳如磐石！就是现在，拍！',
  STABLE_3: '稳得离谱！这姿势绝了，按快门！',
  STABLE_4: '双手稳住了！角度也好，按下去！',
  STABLE_5: '手不抖了！这光线这角度，绝了！',
  SHAKY: '稳住！手别抖',
  SHAKY_2: '手有点抖，深呼吸一下再拍～',
  SHAKY_3: '稍微稳住一点，憋住气按快门！',
  SHAKY_4: '手别晃！靠墙或找支撑会更稳～',
  SHAKY_5: '深呼吸～把手机拿稳了再拍！',
  EXTREME_SHAKE: '太抖了！深呼吸，憋住气再拍',
  EXTREME_SHAKE_2: '手机抖得厉害！先稳下来再拍～',
  EXTREME_SHAKE_3: '太晃了！找个东西靠着或者蹲下来拍～',
  EXTREME_SHAKE_4: '手在抖！深呼吸憋住，轻轻按快门～',
  TILTED: '手机有点歪，看一下水平仪',
  TILTED_2: '歪了！打开相机网格线对齐一下～',
  TILTED_3: '手机斜了，把水平仪对准再拍～',
  TILTED_4: '歪着拍像喝醉了一样哈哈，扶正再拍～',
  TILTED_5: '地平线歪了，打开九宫格对齐试试～',
  TILTED_6: '斜了斜了！稍微转一下手机就好～',
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
  // 新增表情提示
  WINK_POSE: '比个小心心或眨眨眼，俏皮感拉满！',
  PEACE_SIGN: '比个耶或比个剪刀手，活力满满！',
  HAND_WAVE: '轻轻挥手打招呼，自然又可爱～',
  NECK_STRETCH: '伸长脖子，下巴微微收紧，脸更显小～',
  SQUINT_SUN: '阳光刺眼眯眼时最自然！就是现在抓拍～',
  LAUGH_HALF: '半笑着最上镜，嘴角上扬一点点就好～',
  LIPS_POUT: '微微嘟嘴，超可爱！就是现在拍！',
  HAIR_TOSS: '轻轻甩一下头发，风感十足！',
  LOOK_AWAY_SLY: '假装看旁边，眼神更有戏～',
  SIDE_SMILE: '侧脸微笑最有感觉！就是现在～',
  FOCUS_BREATH: '深呼吸～放松肩膀，表情更自然～',
  LOOK_DOWN_THEN_UP: '先低头看地，再抬眼看向镜头，自然抓拍～',
  CHEEKS_PUFF: '鼓起腮帮子，超萌！可以抓拍～',
  SULKING_FACE: '假装嘟嘴生气，好可爱！就是现在～',
  SLEEPY_EYES: '睡眼惺忪也好美～就是现在拍！',
  TONGUE_KISS: '嘟嘴送吻pose，超甜！',
  STARING_INTENSE: '眼神放空看远方，更有故事感～',
  // 组合动作提示
  MOVE_CLOSER: '靠近一点拍特写！',
  MOVE_BACK: '退后一点，让背景更完整～',
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
  CAMPING_TENT: '露营帐篷前光线超美！靠近帐篷站着，背景超有感觉～',
  // 露台野餐
  ROOFTOP_PICNIC: '天台野餐光线绝绝子！坐着拍一张，背景是城市天际线～',
  // 樱花季
  CHERRY_BLOSSOM: '樱花树下光线斑驳！风吹过来的时候按下快门，绝美～',
  // 新增场景
  LAKE_SIDE: '湖边光线超柔！侧身站着让水面反光打在脸上～',
  MALL_DISPLAY: '商场橱窗灯光好美！靠在橱窗前，超有都市感～',
  BRIDGE_NIGHT: '桥上夜景璀璨！开闪光灯，人脸亮起来更美～',
  TERRACE_SUNSET: '露台夕阳余晖超浪漫！逆光拍剪影超有感觉～',
  LIBRARY_QUIET: '图书馆安静又文艺！靠在书架旁，低头看书或者看镜头都超美～',
  GARDEN_GREEN: '花园绿植背景超清新！站在花丛前面，自然地笑一个～',
  TENT_CAMP: '帐篷里光线暖暖的！掀开帐篷帘子，光从里面打出来超有感觉～',
  ROOFTOP_STARS: '天台星空好美！抬头看天空，让星星落在眼睛里～',
  BALCONY_MORNING: '清晨阳台光线好清新！捧着咖啡看向远方，笑一个～',
  POOL_SIDE: '泳池边光线充足！靠在泳池边，侧身站好～',
  // 闺蜜逛街场景
  BESTIE_SHOPPING: '和闺蜜逛街超有活力！靠在橱窗前，笑着拍一张～',
  // 雪景场景
  SNOW_SCENE: '雪地里光线超柔和！白茫茫的背景超浪漫，打开闪光灯补补光～',
  // 宠物互动场景
  PET_INTERACTION: '和宠物互动的时候抓拍，表情最自然可爱！',
  // 车内自拍场景（已有 CAR_SELFIE，保持唯一）
  // 雾霾天气场景
  FOGGY_WEATHER: '雾霾天光线很柔和，不用担心过曝，拍起来！',
  // 清晨晨光场景
  MORNING_SUNRISE: '清晨的光线最柔和！迎着阳光笑一个，整个人都在发光～',
  // 逆光剪影场景
  BACKLIGHT_SILHOUETTE: '逆光拍剪影超有感觉！转过身来，让光线打在侧脸上～',
  // 闺蜜合照场景
  BESTIE_PHOTO: '闺蜜照最重要的是互动！靠近一点，笑着抓拍～',
  // 夜市小吃场景
  NIGHT_MARKET: '夜市灯光超有氛围感！找个人少的角落，让灯光打在脸上～',
  // 滑雪场景
  SKI_RESORT: '雪地里光线反射强！站在雪道旁边，戴着墨镜也超酷～',
  // 海边栈道
  SEASIDE_BOARDWALK: '栈道上光线超通透！背对大海侧身站，让海风吹起头发～',
  // 家居绿植
  HOME_PLANTS: '绿植旁边光线好清新！靠在植物旁边，自然微笑看向镜头～',
  // 旋转飞椅
  AMUSEMENT_RIDE: '飞椅上的表情最自然！双手举起，笑得灿烂点～',
  // 海边礁石
  ROCKY_BEACH: '礁石上有浪花超浪漫！站稳了，侧身看向大海～',
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
  // 新增鼓励语
  '前景和背景层次好分明！',
  '色彩调得刚刚好！',
  '这个色调超有质感！',
  '表情捕捉得好生动～',
  '这张绝了，可以当头像！',
  '光线层次好丰富！',
  '构图比例好舒服！',
  '越拍越有感觉了！',
  '背景虚化得刚刚好！',
  '男友越来越会拍了！',
  '这pose好专业范儿～',
  '照片好有故事感！',
  '色调好治愈～',
  '这张太可了！',
]

type FaceTipKey = keyof typeof FACE_TIPS
type StabilityTipKey = keyof typeof STABILITY_TIPS

/** 从稳定性提示池中随机选取同类提示 */
function pickStabilityTip(category: 'STABLE' | 'SHAKY' | 'EXTREME_SHAKE' | 'TILTED'): string {
  const variants: Record<string, string[]> = {
    STABLE: [STABILITY_TIPS.STABLE, STABILITY_TIPS.STABLE_2, STABILITY_TIPS.STABLE_3, STABILITY_TIPS.STABLE_4, STABILITY_TIPS.STABLE_5],
    SHAKY: [STABILITY_TIPS.SHAKY, STABILITY_TIPS.SHAKY_2, STABILITY_TIPS.SHAKY_3, STABILITY_TIPS.SHAKY_4, STABILITY_TIPS.SHAKY_5],
    EXTREME_SHAKE: [STABILITY_TIPS.EXTREME_SHAKE, STABILITY_TIPS.EXTREME_SHAKE_2, STABILITY_TIPS.EXTREME_SHAKE_3, STABILITY_TIPS.EXTREME_SHAKE_4],
    TILTED: [STABILITY_TIPS.TILTED, STABILITY_TIPS.TILTED_2, STABILITY_TIPS.TILTED_3, STABILITY_TIPS.TILTED_4, STABILITY_TIPS.TILTED_5, STABILITY_TIPS.TILTED_6],
  }
  const pool = variants[category] || [STABILITY_TIPS.STABLE]
  return pool[Math.floor(Math.random() * pool.length)]
}

class VoiceCoach {
  private enabled: boolean = false
  private initialized: boolean = false
  private lastFaceTip: string = ''
  private lastStabilityTip: string = ''
  private cooldownMs: number = 3000  // 提示冷却时间
  private lastSpokeAt: number = 0
  // 去重：记录最近 3 条提示文本，用于避免相似提示连续重复
  private recentTips: string[] = []
  private readonly MAX_RECENT_TIPS = 3

  async initialize(): Promise<void> {
    if (this.initialized) return
    try {
      // 优先使用中文，失败时回退到普通话
      try {
        await Tts.setDefaultLanguage('zh-CN')
      } catch {
        await Tts.setDefaultLanguage('zh')
      }
      await Tts.setDefaultRate(0.5)  // 适中语速
      await Tts.setDefaultPitch(1.1) // 稍高音调，更温柔
      await Tts.setDucking(true)
      this.enabled = true
      this.initialized = true
      // TTS ready
    } catch (e) {
      console.warn('[VoiceCoach] TTS init failed (voice tips disabled):', e)
      // 不阻塞流程，语音提示静默降级
    }
  }

  async speak(text: string, force: boolean = false): Promise<void> {
    if (!this.enabled || !text) return

    const now = Date.now()
    // 冷却检查（同一条提示 3 秒内不重复）
    if (!force && now - this.lastSpokeAt < this.cooldownMs) return

    // 去重：检查最近 3 条提示，如果文本相似度超过 80% 则跳过
    if (!force) {
      const similarity = this.recentTips.filter(recent =>
        text.length > 3 && recent.length > 3 && (
          text.includes(recent.substring(0, Math.min(6, recent.length))) ||
          recent.includes(text.substring(0, Math.min(6, text.length)))
        )
      ).length
      if (similarity > 0) return // 避免连续相似提示
    }

    this.lastSpokeAt = now
    this.lastFaceTip = text
    // 记录最近提示（去重用）
    this.recentTips.push(text)
    if (this.recentTips.length > this.MAX_RECENT_TIPS) {
      this.recentTips.shift()
    }

    try {
      await Tts.stop()
      await Tts.speak(text)
    } catch (e: any) {
      // 忽略 TTS 播报异常（用户静音/系统繁忙/无语音引擎）
      const errStr = String(e ?? '')
      if (
        errStr.includes('not bound') ||
        errStr.includes('not initialized') ||
        errStr.includes('TTS engine') ||
        errStr.includes('no language') ||
        errStr.includes('Engine error')
      ) {
        console.warn('[VoiceCoach] TTS engine issue (non-critical):', e)
      } else {
        console.error('[VoiceCoach] speak failed:', e)
      }
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
    const shakeTip = shakeLevel > 0.8
      ? pickStabilityTip('EXTREME_SHAKE')
      : shakeLevel > 0.65
      ? pickStabilityTip('SHAKY')
      : null

    const tiltTip = (Math.abs(tiltX) > 8 || Math.abs(tiltY) > 8)
      ? pickStabilityTip('TILTED')
      : null

    const stableTip = (shakeLevel < 0.3 && Math.abs(tiltX) < 5 && Math.abs(tiltY) < 5)
      ? pickStabilityTip('STABLE')
      : null

    const selectedTip = shakeTip || tiltTip || stableTip
    if (selectedTip) {
      await this.speak(selectedTip, !!stableTip)
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

  /** 模板分类专属提示 */
  async speakCategoryTip(category: string): Promise<void> {
    const tips: Record<string, string[]> = {
      '室内日常': [
        '室内日常最重要的是光线！靠近窗户站，皮肤会看起来更好～',
        '室内拍照让人靠近窗户，光线更柔和～',
        '家里光线不够的话，打开手机闪光灯补一下～',
      ],
      '室内场景': [
        '找个有趣的背景，和道具互动一下会更有趣～',
        '室内场景要有层次感，试试前景背景搭配～',
        '书店、咖啡馆的光线都很柔和，靠窗站准没错～',
      ],
      '户外风景': [
        '户外拍照注意背景！让人站在简洁的背景前更显气质～',
        '户外光线好的时候，正面或侧光都很出片～',
        '天晴户外逆光拍剪影超有感觉！试试看～',
        '户外场景试试三分法，把人放在黄金分割点上～',
        '背景太乱就靠近一点，主体清晰背景自然会虚化～',
      ],
      '餐厅美食': [
        '餐厅暖光下皮肤超好！让女友靠近台灯或窗边～',
        '美食照让人捧着食物或举杯，画面更生动～',
        '餐厅里找窗边位置，光线绝绝子！',
      ],
      '特殊风格': [
        '风格照最重要的是表情！自然放松最好看～',
        '特殊风格要有氛围感，让女友沉浸在场景里～',
        '风格照可以多试几个角度，找到最美的视角～',
      ],
      '校园操场': [
        '操场跑道当背景超有活力！让人站在跑道上笑一个～',
        '校园风最重要的是青春感，笑容灿烂最加分～',
        '操场光线充足，开闪光灯拍出来皮肤超好！',
      ],
      '温泉泡汤': [
        '温泉水汽缭绕超有氛围！表情放松自然最好看～',
        '泡汤场景要注意光线不要太暗，让脸朝向光源～',
        '温泉场景适合侧身或回眸，慵懒感十足～',
      ],
      '旋转木马': [
        '旋转木马超梦幻！坐在木马上侧身看镜头最上镜～',
        '游乐场光线复杂，找个不逆光的角度～',
        '木马转起来的时候抓拍，表情自然又灵动～',
      ],
      '植物园温室': [
        '温室里光线超柔和！绿植背景清新又自然～',
        '站在花丛前面，侧身微笑最上镜～',
        '温室光线均匀，不用担心过曝，放开笑～',
      ],
      '演唱会现场': [
        '演唱会现场灯光超有氛围！表情夸张一点更上镜～',
        '跟着节奏举起双手，表情灿烂抓拍～',
        '现场光线变化快，连拍几张选最好的～',
      ],
      '酒吧霓虹灯': [
        '霓虹灯光超有都市感！让灯光打在脸上会很有氛围～',
        '酒吧光线偏暗，打开手机闪光灯补光～',
        '侧身站好让霓虹灯勾勒轮廓，超有感觉～',
      ],
      '阳台早餐': [
        '阳台早餐超有小资情调！捧着咖啡笑一个～',
        '早晨阳台光线柔和，拍出来皮肤超好～',
        '靠在栏杆上看向远方，表情自然又惬意～',
      ],
      '艺术展馆': [
        '艺术展馆光线设计感十足！站在作品旁边侧身超有文艺感～',
        '画廊光线偏暗，打开闪光灯补光～',
        '和艺术作品互动一下，构图会更有层次～',
      ],
      '电音节蹦迪': [
        '电音节灯光超炫酷！跟着节奏动起来，表情夸张抓拍～',
        '蹦迪场景光线闪烁，连拍几张选最清晰～',
        '双手举起来跟着节奏，表情灿烂最加分～',
      ],
      '居家睡衣': [
        '居家睡衣照最重要的是温馨感！表情放松自然最好看～',
        '卧室靠窗光线最柔和，拍出来皮肤超好～',
        '居家照可以歪头笑一个，自然又可爱～',
      ],
      '情侣合照': [
        '情侣照最重要的是互动！靠近一点，自然的表情最好看～',
        '两人牵手、对视、拥抱，试试不同的互动方式～',
        '情侣照背景要干净，这样两个人才最突出～',
      ],
      // 新增户外场景
      '户外海边': [
        '海风吹起头发超浪漫！侧身迎风最上镜～',
        '海边光线强，逆光或侧逆光拍出来最有感觉！',
        '沙滩当背景干净开阔，人物居中或三分都好拍～',
      ],
      '城市街拍': [
        '街头背景要干净！找面纯色墙或简洁背景～',
        '街拍最重要的是自然感，边走边拍最生动～',
        '城市灯光下可以拍夜景人像，光斑超有氛围～',
      ],
      // 新增夜景专属
      '夜景灯光': [
        '夜景光线复杂，找个光源在背后或侧面的位置～',
        '霓虹灯下皮肤会显得更白净，让女友靠近光源～',
        '夜拍时手要稳，憋住呼吸再按快门～',
      ],
      '露营帐篷': [
        '露营帐篷前光线超美！靠近帐篷站着，背景超有户外感～',
        '露营场景要选干净的背景，让人和帐篷成为主体～',
        '帐篷前的篝火灯光打在脸上超有感觉，但别太靠近火源～',
      ],
      '湖边水景': [
        '湖边光线超柔和！侧身站着让水面反光打在脸上～',
        '湖边风大拍的时候让女友站稳，头发乱的瞬间抓拍～',
        '湖边拍摄选个无风的时间段，水平如镜效果最好～',
      ],
      '画廊博物馆': [
        '画廊里不要开闪光灯，会影响其他观众，靠窗边站～',
        '博物馆里站在画作旁边侧身，构图会更有层次感～',
        '画廊光线偏暗，靠近灯光展示区域脸会更亮～',
      ],
      '商场橱窗': [
        '商场橱窗玻璃会反光，让女友稍微侧身躲开反光～',
        '橱窗灯光偏白/偏蓝，可以用手机屏幕补光让脸更自然～',
        '商场人多背景乱，找个没人的时间段或角度会更好～',
      ],
      '桥上夜景': [
        '桥上风大，拍摄时让手机拿稳，防止风吹晃动～',
        '桥上夜景要开闪光灯或找光源补光，桥灯往往打在桥体而不是人脸上～',
        '桥上人多找好角度，让灯光成为背景而不是干扰～',
      ],
      '摩天轮': [
        '摩天轮在转动的时候拍摄，可以捕捉到不同高度的视角～',
        '摩天轮包厢里空间小，男朋友拿手机伸出去拍效果更好～',
        '摩天轮里光线偏暗，可以打开屏幕补光让脸亮起来～',
      ],
      '星空夜景': [
        '星空夜景要长曝光，手机拿稳了不要动～',
        '星空拍摄背景很暗，男朋友要站在灯光下或打开闪光灯补光～',
        '星空夜景后期可以稍微提亮人脸，让主体更突出～',
      ],
      '公园长椅': [
        '公园长椅上坐好，一条腿蜷起来一条腿伸直，显腿长～',
        '长椅背景要干净，避开旁边乱入的行人～',
        '公园里树叶斑驳的光影很美，让女朋友坐在光影里～',
      ],
      '车内自拍': [
        '车里自拍开点窗让自然光进来，脸上的光会更自然～',
        '车里后视镜前自拍可以拍到全脸，但注意别挡视线～',
        '车窗外有好看风景时，侧身看向窗外构图更有故事感～',
      ],
      '雪景拍照': [
        '雪地光线反射很强，脸上的阴影不好控制，稍微仰头让雪反射到脸上～',
        '雪天拍完赶紧回室内暖和，别让女朋友冻太久～',
        '雪景背景白茫茫，开闪光灯补光让脸和背景平衡～',
      ],
      '闺蜜合照': [
        '闺蜜照最重要的是互动！靠近一点，做同样的表情或动作～',
        '两人合照时视线方向要留白，别把画面撑太满～',
        '闺蜜照可以一正一侧，构图有层次感～',
      ],
      '火锅美食': [
        '火锅热气腾腾超有氛围感！让热气稍微模糊一点脸庞～',
        '火锅场景暖色调，用暖色滤镜更好看～',
        '火锅旁边光线偏暗，打开手机手电筒补补光～',
      ],
      '超市便利店': [
        '超市道具互动超可爱！拿个零食或水果做道具～',
        '超市货架前光线均匀，但背景比较杂乱，靠近镜头让背景虚化～',
        '超市便利店的冰柜灯光超有氛围感，站在旁边拍～',
      ],
      '泳池边': [
        '泳池边光线充足！靠在泳池边侧身站好，皮肤通透～',
        '泳池边水汽会模糊镜头，保持镜头干净再拍～',
        '泳池边仰拍显腿长，男朋友趴低一点超有感觉～',
      ],
      '天台阳台': [
        '天台光线超通透！靠在栏杆上看向远方～',
        '天台风大时表情容易被吹乱，选好时机再拍～',
        '天台夕阳超浪漫！背光拍剪影也超有感觉～',
      ],
      '街头随拍': [
        '街头背景要干净！找面纯色墙或简洁背景～',
        '街拍最重要的是自然感，边走边拍最生动～',
        '城市灯光下可以拍夜景人像，光斑超有氛围～',
      ],
    }
    const arr = tips[category] || []
    if (arr.length > 0) {
      const tip = arr[Math.floor(Math.random() * arr.length)]
      await this.speak(tip, true)
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

  /** 模板切换确认 */
  async speakTemplateChanged(): Promise<void> {
    await this.speak(FACE_TIPS.TEMPLATE_CHANGED, true)
  }

  /** 拍照失败提示 */
  async speakCaptureFailed(): Promise<void> {
    await this.speak(FACE_TIPS.CAPTURE_FAILED, true)
  }

  /** 相册保存成功提示 */
  async speakSavedToAlbum(): Promise<void> {
    await this.speak(FACE_TIPS.SAVED_TO_ALBUM, true)
  }

  /** 脸在移动提示 */
  async speakFaceMoving(): Promise<void> {
    await this.speak(FACE_TIPS.FACE_MOVING)
  }

  /** 脸部分出镜提示 */
  async speakFacePartial(): Promise<void> {
    await this.speak(FACE_TIPS.FACE_PARTIAL)
  }

  /** 低角度提示 */
  async speakLowAngle(): Promise<void> {
    await this.speak(FACE_TIPS.LOW_ANGLE_FACE)
  }

  /** 高角度提示 */
  async speakHighAngle(): Promise<void> {
    await this.speak(FACE_TIPS.HIGH_ANGLE_FACE)
  }

  /** 鼓励语播报 */
  async speakEncouragement(): Promise<void> {
    const tip = ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)]
    await this.speak(tip, true)
  }

  /** 新纪录达成提示 */
  async speakNewRecord(previousScore: number, newScore: number): Promise<void> {
    const tips = [
      `新纪录达成！从${previousScore}分到${newScore}分，太厉害了！`,
      `破纪录啦！男朋友你又进步了，继续保持！`,
      `${newScore}分！历史新高！男朋友你是最棒的！`,
      `哇塞！${newScore}分！男朋友拍照技术又进化了！`,
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, true)
  }

  /** 进步日记里程碑提示 */
  async speakDiaryMilestone(type: 'first' | 'streak3' | 'streak7' | 'week10'): Promise<void> {
    const tips: Record<string, string[]> = {
      first: ['第一次记日记！这是成长的开始，继续加油～'],
      streak3: ['连续拍了三天！男朋友越来越有摄影师的感觉了～'],
      streak7: ['一周连续拍照！坚持就是胜利，进步肉眼可见！'],
      week10: ['十周啦！男朋友已经成了半个摄影师！'],
    }
    const arr = tips[type] || []
    if (arr.length > 0) await this.speak(arr[0], true)
  }

  /** 比拼模式提示（对比两张照片时） */
  async speakComparisonTip(isImproved: boolean, diff: number): Promise<void> {
    if (isImproved) {
      const tips = [
        `进步了${diff}分！这张比上次好多了，继续保持～`,
        `比上次高了${diff}分！男朋友越拍越好了！`,
        `${diff}分的进步！这张构图/光线更棒了～`,
      ]
      await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
    } else {
      const tips = [
        '这张和上次差不多，男朋友继续保持～',
        '分数差不多，但每张都在进步！',
        '再来一张试试，找找更好的角度～',
      ]
      await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
    }
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

  /** 姿势动作提示（引导摆姿势） */
  async speakPoseTip(poseType: 'hand_hip' | 'lean_wall' | 'sit_down' | 'lie_down' | 'wave_hand' | 'neck_stretch'): Promise<void> {
    const tips: Record<string, string[]> = {
      hand_hip: ['一只手叉腰，另一只手自然垂下，歪头笑一个～', '手放腰上，下巴微微抬起，这个角度超显瘦！'],
      lean_wall: ['靠在墙上，一条腿弯曲，重心在另一条腿上，超有感觉～', '找个墙靠着，一只手撑墙，另一只手撩头发～'],
      sit_down: ['坐好了！双脚并拢或者一前一后，坐姿显腿长～', '坐下来，一只手撑在身后，看镜头笑一个～'],
      lie_down: ['躺下来试试！仰拍显脸小，光线也超柔和～', '躺在沙发或床上，头微微抬起，这个角度绝了！'],
      wave_hand: ['轻轻挥手打招呼，自然又可爱！就是现在按快门～', '挥挥手活动一下，在最自然的时候抓拍～'],
      neck_stretch: ['伸长脖子，下巴微微收紧，这样显脸小！', '下巴收紧一点，脖子拉长，视觉效果超显瘦～'],
    }
    const arr = tips[poseType] || []
    if (arr.length > 0) {
      const tip = arr[Math.floor(Math.random() * arr.length)]
      await this.speak(tip, true)
    }
  }

  /** 强烈日光建议提示 */
  async speakSunnyTip(): Promise<void> {
    const tips = [
      '阳光好刺眼！找个阴凉处或者背光站～',
      '光线太晒了！换个角度或者等云来～',
      '让女朋友眯眼睛了！找个柔和的光线更好看～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, true)
  }

  /** 对焦确认提示（告诉用户相机已对焦到正确位置） */
  async speakFocusConfirmed(): Promise<void> {
    const tips = [
      '对焦好了！就是现在，按快门～',
      '找到你了！笑一个，咔嚓！',
      '锁定！准备好就拍～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, true)
  }

  /** 构图完美时机提示 */
  async speakPerfectComposition(): Promise<void> {
    const tips = [
      '构图完美！光线也棒，这是最佳拍摄时机！',
      '位置刚刚好！就是现在，拍！',
      '一切就绪！男朋友按快门的最佳时机！',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, true)
  }

  /** 过曝警告提示 */
  async speakOverexposed(): Promise<void> {
    const tips = [
      '光线太亮了！换个位置或者让女朋友背光站～',
      '脸有点过曝，往阴影处挪一点点～',
      '背景太亮脸黑了！调整一下角度，让脸朝向光源～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip)
  }

  /** 欠曝（太暗）提示 */
  async speakUnderexposed(): Promise<void> {
    const tips = [
      '有点暗了！往窗边或者光源处靠一点～',
      '脸有点黑，让女朋友面向光源站～',
      '光线不够，找个亮一点的地方试试～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip)
  }

  /** 进步表扬提示 */
  async speakProgressPraise(diff: number): Promise<void> {
    const tips = [
      `进步了${diff}分！男朋友越拍越好了！`,
      `比上次高了${diff}分！这张构图/光线更棒了～`,
      `${diff}分的进步！男朋友开窍了！`,
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, true)
  }
}

export { FACE_TIPS, STABILITY_TIPS, EXPRESSION_TIPS, SCENE_TIPS }
export default new VoiceCoach()
