/**
 * VoiceCoach - 语音教练
 * 基于人脸位置和陀螺仪数据的语音提示
 * 使用 react-native-tts 朗读
 */
import Tts from 'react-native-tts'
import { type EmotionDetection } from '../../services/analyzer'
import { logger } from '../../utils/logger'
import { pickRandom } from '../../utils/scoring'

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
  // 新增场景提示
  TOO_DARK: '脸有点暗了，往光源方向靠近一点点～',

  // 新增边缘场景
  FACE_MOVING: '别动！脸不要晃来晃去的～',

  ALMOST_PERFECT: '就差一点点！稳住，按下去就是大片！',
  TRY_SIDE_FACE: '试试侧脸！轮廓感会更强～',
  TRY_BACK_VIEW: '背对镜头也超有感觉！转过去试试～',
  TRY_HALF_BODY: '试试拍半身照！比特写更有故事感～',
  TRY_FULL_BODY: '试试全身照！背景和人都要完整～',
  TRY_CLOSE_UP: '走近一点！怼脸拍更有冲击力～',
  TRY_WIDER: '退后一点！让背景更完整～',
  CHECK_LIGHTING: '先看一下光线方向！脸要朝向光源～',
  FIND_WINDOW: '找个窗户边站！自然光最柔和～',

  GOLDEN_HOUR_NOW: '现在是黄金时段！赶紧拍，光线超美～',
  OVERCAST_PERFECT_TIME: '阴天光线好柔！随便拍都好看～',

  FACE_PARTIAL: '脸稍微侧了一点，正对镜头会更好看～',
  LOW_ANGLE_FACE: '抬头看镜头！低角度显下巴～',
  HIGH_ANGLE_FACE: '稍微低头一点点，眼睛更有神～',
  // 模板切换确认
  TEMPLATE_CHANGED: '已切换到新姿势！跟着指导摆好～',
  // 新增：手势引导
  HAND_NATURAL: '手自然垂下就好！别紧贴身体，侧面更显瘦～',
  HAND_HIP_POSE: '双手叉腰！这个姿势显瘦又有气场～',

  // 新增：表情场景
  RELAX_SHOULDER_TIP: '肩膀放松一下！别端着，自然最美～',
  BREATH_RELAX: '深呼吸～放松再笑，这个表情最自然～',

  // 拍摄成功
  SHOOT_GOOD: '姿势很棒！就是现在，按快门！',
  // 拍摄失败
  CAPTURE_FAILED: '拍照失败了，再试一次吧～',
  // 相册保存
  SAVED_TO_ALBUM: '已保存到相册！可以去相册里找找看～',
  SAVE_FAILED: '保存失败了，去设置里看看相册权限开了没～',
  // 拍照成功
  CLICK_SNAP: '咔嚓！拍好了～来看看效果吧！',
  // 闭眼检测
  BLINK_DETECTED: '看到有人闭眼了！提醒她睁开大眼睛～',
  BLINK_DETECTED_2: '闭眼了！睁大眼睛再拍～',
  BOTH_EYES_CLOSED_TIP: '两只眼睛都闭了！睁开眼睛，就是现在～',
  // 人脸过远
  FACE_TOO_FAR: '人离镜头太远了，往前走两步会更清晰～',
  FACE_TOO_FAR_2: '再靠近一点点！脸大一点更好看～',
  FACE_TOO_NEAR: '太近了！稍微退后一点，不然脸会变形哦～',
  FACE_TOO_NEAR_2: '手机拿远一点点，脸才不会挤在一起～',
  // 逆光场景
  BACKLIGHT_DETECTED: '逆光！脸有点黑，侧身转过来让光打在脸上～',
  BACKLIGHT_DETECTED_2: '背光场景！打开闪光灯补光，或者转过来面对光源～',

  // 成功抓拍倒计时
  COUNTDOWN_3: '三～',
  COUNTDOWN_2: '二～',
  COUNTDOWN_1: '一～',
  COUNTDOWN_GO: '拍！',

  // 表情僵硬
  EXPRESSION_STIFF: '表情放松一点～嘴角微微上扬，自然最美～',
  EXPRESSION_STIFF_2: '别僵着！想想开心的事，笑一个试试～',
  EXPRESSION_STIFF_3: '表情有点紧，肩膀放松，深呼吸～',
  // 抬头角度 / 双下巴预防
  CHIN_ANGLE: '下巴稍微抬一点，收紧脖颈，脸部轮廓会更好看～',
  CHIN_ANGLE_2: '头微微上抬！挺直脖颈，气质立刻不一样～',
  CHIN_ANGLE_3: '别低头！抬起下巴，让下巴和脖子呈一条线～',
  // 头发遮挡
  HAIR_OCCLUSION: '头发挡到脸了！把头发撩到耳后，露出完整的脸部～',
  HAIR_OCCLUSION_2: '刘海遮住眼睛了！拨开头发，眼神更有神～',
  // 模糊 / 抖动
  BLURRY_PHOTO: '照片有点糊了！拿稳手机，或者站近一点～',
  BLURRY_PHOTO_2: '这张有点模糊，下一张拿稳试试～',
  // 多人合照提示
  MULTI_FACE_TWO: '两个人的合照！靠近一点贴贴～',
  MULTI_FACE_THREE: '三个人的合照！大家站整齐一点～',
  MULTI_FACE_SQUEEZE: '人多挤不下！往后站一点大家都能入镜～',
  // 鼓励换姿势
  TRY_DIFFERENT_ANGLE: '试试换个角度拍！侧面也很美～',
  CLOSE_ONE_EYE: '试试闭一只眼！俏皮又可爱，活泼感拉满～',

  // 眼镜反光检测
  GLASSES_REFLECTION: '眼镜反光了！稍微侧一下头躲开反光～',
  GLASSES_REFLECTION_2: '镜片反光有点强！换个角度让眼镜不反光～',

  // 肩膀位置
  SHOULDERS_CROOKED: '肩膀稍微端平一点，这样气质更好～',

  // 仰拍大长腿专属确认
  LOW_ANGLE_CONFIRM: '仰拍角度绝了！腿看起来超长，就是现在！',

  // 俯拍显脸小专属确认
  HIGH_ANGLE_CONFIRM: '俯拍角度超显脸小！就是这个角度，按下去！',

  // 侧颜确认
  SIDE_PROFILE_GOOD: '侧颜超美！这个角度绝了，按下去！',

  // 逆光确认
  BACKLIGHT_SILHOUETTE: '逆光剪影好有意境！转过来让脸也亮起来试试～',

  // 全身照确认
  FULL_BODY_CONFIRM: '全身照构图超棒！背景也完整，按下去就是大片～',

  // 半身照确认
  HALF_BODY_CONFIRM: '半身照角度绝了！人景比例刚刚好～',

  SHOOT_NOW_LIGHT: '光线刚刚好！就是现在，按快门！',
  SHOOT_NOW_POSE: '姿势超棒！表情到位！按下去就是大片！',
  SHOOT_NOW_PERFECT: '完美时刻！这光线这角度，按下去！',

  // HDR 模式提示
  HDR_HINT: '这个场景明暗对比大！打开 HDR 模式，高光阴影都能保留～',
  HDR_HINT_2: 'HDR 模式可以让亮部和暗部都清晰，打开试试～',
  // 人像模式提示
  PORTRAIT_MODE: '开人像模式！背景自动虚化，主体超突出～',
  PORTRAIT_MODE_2: '人像模式最适合拍近景！打开它，背景会变柔和～',
  // 全景模式提示
  PANORAMA_HINT: '试试全景模式！左右扫一下，大场景都能收进来～',
  PANORAMA_HINT_2: '全景模式要慢速移动！手稳一点，照片才不会糊～',
  PANORAMA_HINT_3: '拍全景时让女朋友站在中间，这样不会被切掉～',
  // 专业模式提示
  PRO_MODE_HINT: '专业模式下 ISO 调低一点，画面会更干净～',
  PRO_MODE_HINT_2: '专业模式拍夜景！快门调慢，手要拿稳哦～',
  // 连拍提示
  BURST_MODE: '按住快门连拍！动起来抓拍的瞬间最自然～',
  BURST_MODE_2: '连拍模式开起来！多拍几张总有一张完美的～',
  // 定时拍照提示
  TIMER_HINT: '用定时拍照！放在稳定的地方，自己也能入镜～',
  TIMER_HINT_2: '定时拍照设置三秒就够！给自己留出摆pose的时间～',
  TIMER_HINT_3: '定时拍照放在桌面或书架上！自己和男朋友都能入镜～',

  // 抓拍提示
  // 逆光 HDR 提示
  BACKLIGHT_HDR: '逆光场景！打开 HDR 让脸和背景都清晰～',
  // 表情夸张提示
  BIGGER_SMILE: '笑容再大一点！这样更上镜～',
  RELAX_FACE: '表情放松一点～别僵着，自然最美～',
  // 表情与动作提示
  // 构图提醒
  USE_GRID: '打开九宫格！构图会好很多～',
  TRY_LOW_ANGLE: '蹲低一点！仰拍超级显腿长！',
  TRY_HIGH_ANGLE: '稍微高一点拍！俯拍显脸小～',
  // 防抖提醒
  USE_BOTH_HANDS: '双手握稳手机！会更清晰～',
  REST_ON_WALL: '靠在墙上拍！会更稳～',
  HOLD_BREATH: '拍照时屏住呼吸！会更清晰～',
  // 表情提示
  TRY_WINK: '试试眨眼！活泼可爱～',
  TRY_POUT: '嘟嘴卖萌！也很上镜～',
  TRY_CONFIDENT: '试试酷酷的表情！超级有范儿～',
  TRY_SURPRISED: '惊讶表情！眼睛睁大超可爱～',

  CHECK_BACKGROUND: '背景检查一下！太乱会抢戏～',
  // 表情与动作提示
  BLOW_BUBBLES_FUN: '吹泡泡！这个画面好梦幻～',

  WINK_CUTE: '眨一只眼！俏皮可爱～',

  PEACE_SIGN: '比个耶！经典又可爱～',
  HEART_HAND_SIGN: '比心！爱心手势超甜～',

  // 构图与光线提示
  CHEESE_HINT: '说"田七"！嘴型最自然～',

  EXPRESSION_SAY_YUM: '说"好吃"！表情最自然～',

  CAMERA_SWITCHED_FRONT: '切换到前置摄像头啦～找好角度，笑一个～',
  CAMERA_SWITCHED_FRONT_2: '自拍模式开启！侧脸也超好看，试试看～',
  CAMERA_SWITCHED_FRONT_3: '前置镜头就位！对着镜子找找最好的角度～',
  CAMERA_SWITCHED_BACK: '切换到后置摄像头！画质更清晰，让男朋友拿稳手机～',
  CAMERA_SWITCHED_BACK_2: '后置镜头更专业！男朋友准备好了吗～',
  CAMERA_SWITCHED_BACK_3: '后置镜头画质更好！站好位置，准备开拍～',
  BURST_CAPTURE_DONE: '连拍完成！拍了X张，挑一张最好的吧～',
  BURST_CAPTURE_DONE_2: '拍了好多张！选一张最喜欢的吧～',
  BURST_CAPTURE_DONE_3: '连拍结束！动起来的瞬间最自然，选最自然的那张～',
  IDLE_TOO_LONG: '等了好一会儿了～动起来！换个姿势试试～',
  IDLE_TOO_LONG_2: '站太久了！换个角度或者走几步，照片会更有活力～',
  IDLE_TOO_LONG_3: '好安静呀～笑一个，逗逗她，让男朋友抓拍～',

  FACE_FOUND_CONFIRM: '找到脸了！就是现在，笑一个～',
  STORAGE_NEAR_FULL: '手机存储快满了！先清理一下再继续拍吧～',
  LOW_BATTERY_WARNING: '手机电量低了！抓紧时间拍几张～',

  HAIR_WIND_MESSY: '风把头发吹乱了！先理一下再拍，或者让风吹着也很有氛围～',

  POSE_READY_HINT: '姿势摆好了！就是现在，按下去！',
  LIGHT_PERFECT_NOW: '光线完美！这个时刻拍出来一定超好看！',

  HAIR_WIND_BLOW: '风把头发吹起来好美！就是现在抓拍～',

  GOOD_COMPOSITION_DETECTED: '构图很棒！就是这个位置，按下去！',
  PERFECT_MOMENT_NOW: '就是现在！这光这角度，绝了！',

  READY_TO_CAPTURE: '一切就绪！这个瞬间绝美，按快门！',
  CLICK_MOMENT: '现在光线好美！位置也对！赶紧按下去！',
  // 笑脸被检测到时的即时确认
  SMILE_DETECTED: '看到你在笑！就是这个表情，别动，按下去！',
  NATURAL_SMILE_DETECTED: '自然的笑容！好生动，按下去！',

  SMILE_CUTE_NOW: '这个表情好可爱！就是现在，按下去！',
  EXPRESSION_READY: '表情准备好了！笑一个，按快门！',
  POSE_PERFECT_TRY: '姿势超棒！就是现在，按下去就是大片！',

  NOW_PERFECT: '现在光线完美！姿势也对！就是现在拍～',

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
  // 新增稳定性提示
  STABLE_SUPER: '稳如泰山！这张拍出来一定超清晰！',
  STABLE_CAMERA: '手稳手机稳，按下去就是大片！',
  BREATHE_STEADY: '深呼吸～稳住手，这光线不会再来！',
  WALL_SUPPORT: '靠墙拍更稳！找个支撑按快门～',
  WIDE_STANCE: '双脚分开站稳，像练功一样哈哈～',

  STABLE_READY: '稳稳的！可以按快门了～',
  STEADY_AND_GOOD: '手稳了！光线也棒，现在拍正好～',
  HOLD_FOR_MOMENT: '稳住！就这个瞬间，按下去！',

  // v6 新增稳定性提示

}

// 表情检测提示
const EXPRESSION_TIPS = {
  // 表情提示
  COUNT_SHEEP: '说"田七"！嘴型刚刚好，表情最自然～',
  BLURRY: '照片有点糊了，让他手拿稳一点～',
  CLOSED_EYES: '好像有人闭眼了，提醒他睁大眼睛！',
  SMILING_GOOD: '这个笑容绝了！就是现在，按快门！',
  EYES_OPEN_GOOD: '眼神超有光，这表情太加分了！',
  YAW_LEFT: '脸稍微转过来一点，别侧太多',
  YAW_RIGHT: '脸稍微往这边转一点，别只露侧脸',
  ROLL_TILTED: '头稍微正一点，歪着显脸大哦～',
  TILTED_HEAD_GOOD: '歪头好可爱！就是现在按快门～',
  BOTH_EYES_CLOSED: '两只眼睛都闭了，提醒她睁开～',
  SURPRISED_FACE: '这惊讶表情好生动！就是现在！',
  SERIOUS_FACE: '表情太严肃了，笑一个试试～',
}

// 每日首次打开欢迎语
const WELCOME_TIPS = [
  '欢迎回来！今天让男朋友拍几张美美的照片吧～',
  '男朋友准备好拍照了吗？准备好就开始吧！',
  '约会拍照开始啦～让男朋友拿出最佳状态！',
  '今天也要拍出好看的照片哦！男朋友准备好了吗～',
  '男朋友相机上线！今天拍几张好看的～',
  '开工啦！男朋友准备好拍摄最佳角度了吗～',
  '男友相机为您服务！今天多拍几张，选最好的～',
  '拍照时间到！男朋友摆好姿势，开始拍～',
  '今天想拍什么风格？男朋友准备好了就开始～',
  '男友相机已上线！摆好姿势，今天多拍几张～',
  '约会怎么能少了合影！男朋友准备开拍吧～',
  '来啦！男朋友准备好拍照咯，今天多留下几张美好回忆～',
  '男朋友准备好了吗？开始拍美美的照片吧～',
  '男友相机为你服务！今天想拍几张好看的？',
  '约起来拍照吧～男朋友拿出最佳状态，开始咯！',
  '新的一天，新的照片！男朋友准备好开始拍了吗～',
  '男友摄影师上线咯～今天想留下什么回忆？开始拍！',
  '开拍啦！男朋友准备好捕捉最美的瞬间了吗～',
  '咔嚓时间到！男朋友准备好了就开始拍吧～',
  '约会写真开始咯～男朋友准备好当最佳摄影师了吗～',
  '男友相机启动！今天多拍几张，选最满意的一张～',
  '光线刚好，姿势到位，男朋友开始拍吧～',
  '拍照模式启动！男朋友准备好了就开始咯～',
]

// 模板选中确认语（用于选中新模板时的语音确认）
const TEMPLATE_SELECT_TIPS = [
  '已选择这个姿势！跟着指导站好～',
  '姿势已更新！按照模板调整站位～',
  '新姿势选好了！跟着模板试试看～',
  '已切换姿势！调整好站位，准备好就拍～',
  '这个姿势好美！调整好站位，开始拍～',
  '姿势选中啦！看看模板，摆好姿势就开始～',
  '换了个新姿势！跟着模板调整一下，准备拍～',
  '这个角度绝了！男朋友调整好就可以拍啦～',
  '姿势选好了！先对好位置，然后喊一二三～',
  '新姿势已加载！男朋友按模板站好就拍～',
  '完美姿势已选！跟着轮廓调整好，一起来拍～',
  '这个姿势很有感觉！站好之后告诉我哦～',
  '姿势切换成功！男朋友准备好就可以拍啦～',
  '选了一个好姿势！调整好站位就可以开始拍～',
  '姿势已选！男朋友按着模板来，摆好就开始～',
  '跟着模板调整站位！准备好了我们就开拍～',
  '模板已更新！男朋友跟着剪影调整好位置，开始拍～',
  '姿势切换成功！调整站位后告诉我，就是现在～',
  '新姿势选中！男朋友按模板调整好就可以按快门啦～',
  '跟着人像剪影调整！准备好了我们就拍～',
]
/** 从稳定性提示池中随机选取同类提示 */
function pickStabilityTip(category: 'STABLE' | 'SHAKY' | 'EXTREME_SHAKE' | 'TILTED'): string {
  const variants: Record<string, string[]> = {
    STABLE: [STABILITY_TIPS.STABLE, STABILITY_TIPS.STABLE_2, STABILITY_TIPS.STABLE_3, STABILITY_TIPS.STABLE_4, STABILITY_TIPS.STABLE_5, STABILITY_TIPS.STABLE_SUPER, STABILITY_TIPS.STABLE_CAMERA, STABILITY_TIPS.BREATHE_STEADY, STABILITY_TIPS.WALL_SUPPORT, STABILITY_TIPS.WIDE_STANCE, STABILITY_TIPS.STABLE_READY, STABILITY_TIPS.STEADY_AND_GOOD, STABILITY_TIPS.HOLD_FOR_MOMENT],
    SHAKY: [STABILITY_TIPS.SHAKY, STABILITY_TIPS.SHAKY_2, STABILITY_TIPS.SHAKY_3, STABILITY_TIPS.SHAKY_4, STABILITY_TIPS.SHAKY_5],
    EXTREME_SHAKE: [STABILITY_TIPS.EXTREME_SHAKE, STABILITY_TIPS.EXTREME_SHAKE_2, STABILITY_TIPS.EXTREME_SHAKE_3, STABILITY_TIPS.EXTREME_SHAKE_4],
    TILTED: [STABILITY_TIPS.TILTED, STABILITY_TIPS.TILTED_2, STABILITY_TIPS.TILTED_3, STABILITY_TIPS.TILTED_4, STABILITY_TIPS.TILTED_5, STABILITY_TIPS.TILTED_6],
  }
  const pool = variants[category] || [STABILITY_TIPS.STABLE]
  return pickRandom(pool)
}

class VoiceCoach {
  private enabled: boolean = false
  private initialized: boolean = false
  private cooldownMs: number = 3000  // 提示冷却时间
  private lastSpokeAt: number = 0
  private speaking: boolean = false  // 防止并发 TTS 调用
  // 去重：记录最近 3 条提示文本，用于避免相似提示连续重复
  private recentTips: string[] = []
  private readonly MAX_RECENT_TIPS = 3
  // TTS 事件监听器引用（用于 cleanup）
  private _finishHandler: (() => void) | null = null
  private _cancelHandler: (() => void) | null = null

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

      // 注册 TTS 完成/取消事件，确保 speaking 标志正确复位
      this._finishHandler = () => { this.speaking = false }
      this._cancelHandler = () => { this.speaking = false }
      Tts.addEventListener('tts-finish', this._finishHandler)
      Tts.addEventListener('tts-cancel', this._cancelHandler)

      this.enabled = true
      this.initialized = true
    } catch (e) {
      logger.warn('VoiceCoach', 'TTS init failed (voice tips disabled):', e)
      // 不阻塞流程，语音提示静默降级
    }
  }

  /** 清理 TTS 事件监听器（组件卸载时调用） */
  destroy(): void {
    if (this._finishHandler) {
      Tts.removeEventListener('tts-finish', this._finishHandler)
      this._finishHandler = null
    }
    if (this._cancelHandler) {
      Tts.removeEventListener('tts-cancel', this._cancelHandler)
      this._cancelHandler = null
    }
    this.initialized = false
    this.enabled = false
  }

  async speak(text: string, force: boolean = false): Promise<void> {
    if (!this.enabled || !text || this.speaking) return
    if (!this.initialized) return // TTS 未就绪，静默跳过

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
    // 记录最近提示（去重用）
    this.recentTips.push(text)
    if (this.recentTips.length > this.MAX_RECENT_TIPS) {
      this.recentTips.shift()
    }

    try {
      this.speaking = true
      await Tts.stop()
      await Tts.speak(text)
      this.speaking = false
    } catch (e: unknown) {
      this.speaking = false
      // 忽略 TTS 播报异常（用户静音/系统繁忙/无语音引擎）
      const errStr = e instanceof Error ? e.message : typeof e === 'string' ? e : String(e ?? '')
      if (
        errStr.includes('not bound') ||
        errStr.includes('not initialized') ||
        errStr.includes('TTS engine') ||
        errStr.includes('no language') ||
        errStr.includes('Engine error')
      ) {
        logger.warn('VoiceCoach', 'TTS engine issue (non-critical):', e)
      } else {
        logger.error('VoiceCoach', 'speak failed:', e)
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

  /** 最佳拍摄时机提示（光线+位置都到位） */
  async speakPerfectTiming(): Promise<void> {
    const tips = [
      FACE_TIPS.SHOOT_NOW_PERFECT,
      FACE_TIPS.SHOOT_NOW_LIGHT,
      FACE_TIPS.SHOOT_NOW_POSE,
      FACE_TIPS.ALMOST_PERFECT,
      FACE_TIPS.SHOOT_GOOD,
      FACE_TIPS.CLICK_SNAP,
      FACE_TIPS.PERFECT_MOMENT_NOW,
      FACE_TIPS.CLICK_MOMENT,
      FACE_TIPS.NOW_PERFECT,
      FACE_TIPS.POSE_READY_HINT,
      FACE_TIPS.LIGHT_PERFECT_NOW,
      FACE_TIPS.GOOD_COMPOSITION_DETECTED,
      FACE_TIPS.READY_TO_CAPTURE,
    ]
    await this.speak(pickRandom(tips), true)
  }

  async speakRandomPoseTip(): Promise<void> {
    const tips = [
      FACE_TIPS.BIGGER_SMILE,
      FACE_TIPS.RELAX_FACE,
      FACE_TIPS.TRY_WINK,
      FACE_TIPS.TRY_POUT,
      FACE_TIPS.TRY_CONFIDENT,
      FACE_TIPS.TRY_SURPRISED,
      FACE_TIPS.TRY_SIDE_FACE,
      FACE_TIPS.TRY_BACK_VIEW,
      FACE_TIPS.TRY_LOW_ANGLE,
      FACE_TIPS.TRY_HIGH_ANGLE,
      FACE_TIPS.TRY_HALF_BODY,
      FACE_TIPS.TRY_FULL_BODY,
      FACE_TIPS.TRY_CLOSE_UP,
      FACE_TIPS.TRY_WIDER,
      FACE_TIPS.HAND_NATURAL,
      FACE_TIPS.HAND_HIP_POSE,
      FACE_TIPS.CLOSE_ONE_EYE,
      FACE_TIPS.RELAX_SHOULDER_TIP,
      FACE_TIPS.BREATH_RELAX,
      FACE_TIPS.BLOW_BUBBLES_FUN,
      FACE_TIPS.WINK_CUTE,
      FACE_TIPS.PEACE_SIGN,
      FACE_TIPS.HEART_HAND_SIGN,
      FACE_TIPS.CHEESE_HINT,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 相机设置提示 */
  async speakCameraSetupTip(): Promise<void> {
    const tips = [
      FACE_TIPS.USE_GRID,
      FACE_TIPS.USE_BOTH_HANDS,
      FACE_TIPS.REST_ON_WALL,
      FACE_TIPS.HOLD_BREATH,
      FACE_TIPS.CHECK_LIGHTING,
      FACE_TIPS.FIND_WINDOW,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 多脸检测提示（根据人数不同提示不同） */
  async speakMultiFaceTip(faceCount: number): Promise<void> {
    if (faceCount === 2) {
      await this.speak(FACE_TIPS.MULTI_FACE_TWO)
    } else if (faceCount === 3) {
      await this.speak(FACE_TIPS.MULTI_FACE_THREE)
    } else if (faceCount > 3) {
      await this.speak(FACE_TIPS.MULTI_FACE_SQUEEZE)
    } else {
      await this.speak(FACE_TIPS.MULTI_FACE)
    }
  }



  async speakQuickPoseTip(): Promise<void> {
    const pool = [
      FACE_TIPS.TRY_SIDE_FACE,
      FACE_TIPS.TRY_BACK_VIEW,
      FACE_TIPS.TRY_HALF_BODY,
      FACE_TIPS.TRY_FULL_BODY,
      FACE_TIPS.TRY_CLOSE_UP,
      FACE_TIPS.TRY_WIDER,
      FACE_TIPS.LOW_ANGLE_FACE,
      FACE_TIPS.HIGH_ANGLE_FACE,
      FACE_TIPS.HAND_NATURAL,
      FACE_TIPS.HAND_HIP_POSE,
      FACE_TIPS.CLOSE_ONE_EYE,
      FACE_TIPS.RELAX_SHOULDER_TIP,
      FACE_TIPS.HAIR_WIND_MESSY,
      FACE_TIPS.HAIR_WIND_BLOW,
      FACE_TIPS.SMILE_CUTE_NOW,
      FACE_TIPS.EXPRESSION_READY,
      FACE_TIPS.POSE_PERFECT_TRY,
    ]
    await this.speak(pickRandom(pool), true)
  }

  async speakExpressionTip(params: EmotionDetection): Promise<void> {
    const { smiling, leftEyeOpen, rightEyeOpen, yawAngle, rollAngle, sharpness, mouthOpen } = params

    // 模糊检测
    if (sharpness !== undefined && sharpness < 60) {
      await this.speak(EXPRESSION_TIPS.BLURRY)
      return
    }

    // MLKit 返回 0-1 概率值
    const smileProb = typeof smiling === 'number' ? smiling : (smiling ? 1 : 0)
    const leftEyeProb = typeof leftEyeOpen === 'number' ? leftEyeOpen : (leftEyeOpen ? 1 : 0)
    const rightEyeProb = typeof rightEyeOpen === 'number' ? rightEyeOpen : (rightEyeOpen ? 1 : 0)

    // 惊讶表情（张嘴）
    if (mouthOpen !== undefined && mouthOpen > 0.4 && smileProb < 0.4) {
      await this.speak(EXPRESSION_TIPS.SURPRISED_FACE)
      return
    }

    // 两只眼睛都闭了（概率 < 0.5 视为闭合）
    if (leftEyeProb < 0.5 && rightEyeProb < 0.5) {
      await this.speak(EXPRESSION_TIPS.BOTH_EYES_CLOSED)
      return
    }

    // 闭眼检测（单眼闭）
    if ((leftEyeProb < 0.5 || rightEyeProb < 0.5) && smileProb < 0.4) {
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

    // 笑容检测（概率 >= 0.5 视为有笑容）
    if (smileProb >= 0.5) {
      await this.speak(EXPRESSION_TIPS.SMILING_GOOD)
      return
    }

    // 无笑容且无表情（概率 < 0.4）
    if (smileProb < 0.4) {
      await this.speak(EXPRESSION_TIPS.SERIOUS_FACE)
      return
    }

    // 眼睛状态好
    if (leftEyeProb >= 0.5 && rightEyeProb >= 0.5 && smileProb < 0.4) {
      await this.speak(EXPRESSION_TIPS.EYES_OPEN_GOOD)
    }
  }

  /** 滤镜推荐提示（基于场景类型） */
  async speakFilterTip(sceneType: 'warm_light' | 'cool_light' | 'night' | 'sunset' | 'indoor' | 'outdoor' | 'portrait' | 'food' | 'street' | 'night_photo' | 'cloudy' | 'golden_hour' | 'natural_light' | 'aquarium' | 'concert' | 'neon_light'): Promise<void> {
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
      aquarium: ['水族馆蓝色光影配「电影」或「蓝调」滤镜，梦幻感拉满～', '水族馆用「冷色」滤镜，让蓝色鱼光更通透！'],
      concert: ['演唱会灯光闪烁配「电影」滤镜，氛围感绝绝子～', '演唱会用「胶片」滤镜，霓虹灯光更有质感！'],
      neon_light: ['霓虹灯光配「电影」滤镜赛博感拉满！', '霓虹灯下「冷色」滤镜让光线更有赛博朋克感～'],
    }
    const arr = tips[sceneType] || []
    if (arr.length > 0) {
      await this.speak(pickRandom(arr), true)
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
      '自拍技巧': [
        '自拍最重要的是光线！找好角度，让光打在脸上～',
        '举起手机微微仰角，显脸小眼睛更有神～',
        '侧脸自拍超显气质！试试 45 度角微微低头～',
        '对着镜子自拍时，手机稍微侧一点躲开镜面反光～',
        '自然光下自拍最通透！靠近窗户皮肤状态最好～',
        '45 度俯角自拍是黄金角度，显脸小的秘密～',
      ],
      '室内人像': [
        '室内人像靠近窗户！柔和的自然光皮肤看起来超好～',
        '室内人像找个干净的背景，道具互动更自然～',
        '室内人像侧光最有立体感，别让光正面对着镜头～',
      ],
      '构图技巧': [
        '构图最重要的是主体位置！试试把人放在三分点上～',
        '构图要简洁！背景越干净主体越突出～',
        '构图要有留白！头顶留白三分之一，画面更舒适～',
        '打开九宫格辅助线，把脸放在交叉点上，立刻变专业～',
        '留白让画面有呼吸感，不要把人顶到边框上～',
        '背景简洁干净，主体自然就突出了～',
      ],
      '运动健身': [
        '健身房光线均匀！侧身站着笑着拍一张超有活力～',
        '运动后脸红润通透，这个状态超适合拍照！',
        '健身房镜子自拍要斜着拍，避免镜面反光～',
        '动作舒展一点，笑得灿烂点，活力满满！',
      ],
      '舞蹈表演': [
        '舞蹈动作最灵动！抓住最舒展的瞬间按下快门～',
        '舞台灯光打在侧脸上，表情和动作同时到位！',
        '运动中的表情最自然，笑着抓拍最灵动～',
        '全身照要展示完整动作，侧身或回眸都超有气场！',
      ],
      '全部': [
        '模板全都展示出来啦！找一个最喜欢的开始拍吧～',
        '海量模板任你选！找到一个适合当下场景的，事半功倍哦～',
        '全部模板都在这里！慢慢挑，找到最搭的那个～',
        '不用纠结，往下滑一定有适合你们的pose！',
      ],
      '毕业照': [
        '毕业照最重要的是学士服要平整，帽子戴正！',
        '抛帽瞬间超有感染力！多拍几张选表情最好的～',
        '和同学一起合照，笑容灿烂最加分！',
      ],
      '樱花季': [
        '樱花树下光线柔和！让女友站在花丛前侧身微笑～',
        '樱花季人多背景杂，开大光圈虚化人群更干净～',
        '樱花花瓣当道具，捧着脸笑超有春日感～',
        '樱花树下的侧逆光超美！稍微过曝一点点也好看～',
      ],
      '圣诞氛围': [
        '圣诞灯串当背景超有氛围感！让女友靠近灯串站着～',
        '圣诞树前侧身站好，灯光打脸上超温暖～',
        '圣诞氛围最重要的是暖调光线，让脸靠近光源～',
        '双手捧脸或抱膝坐好，圣诞感十足！',
      ],
      '海滩日落': [
        '日落逆光拍剪影超浪漫！让女友站在海边看夕阳～',
        '海边日落光线温柔，拍侧脸最有感觉！',
        '沙滩当背景干净开阔，人物居中或三分都好看～',
        '日落前半小时是黄金时间，抓紧拍！',
      ],
      '水族馆': [
        '水族馆里光线偏蓝，让女友靠近玻璃站，鱼群当背景～',
        '水族馆隧道超有氛围！侧身站在鱼群中，表情自然～',
        '蓝色水光打在脸上超梦幻，多拍几张选最美的～',
        '水族馆光线暗，打开闪光灯补光，让脸更亮～',
      ],
      '游乐园嘉年华': [
        '游乐园光线复杂，找个不逆光的角度～',
        '旋转木马、摩天轮前拍照，超有童话感！',
        '游乐园的背景很丰富，让人站在前面笑一个～',
        '跟着游乐设施的节奏动起来，表情夸张抓拍～',
      ],
      '古镇老街': [
        '古镇老街背景有历史感！站在石板路上侧身微笑～',
        '老街光线柔和，避开正午直射光，早晚更有氛围～',
        '古镇的砖墙、老门当背景，文艺感十足～',
        '老街人如果多，开大光圈虚化人群更干净～',
      ],
      '教堂': [
        '教堂建筑庄重大气！让女友站在光影中侧身～',
        '教堂彩色玻璃窗光超美！让光线打在脸上～',
        '教堂内部光线偏暗，靠近窗户让脸亮起来～',
        '建筑线条感强，用手机九宫格构图拍全身超有气场～',
      ],
      '农场牧场': [
        '农场牧场背景开阔！让人站在草原或动物旁笑一个～',
        '田园风最重要的是自然感，不要太刻意摆拍～',
        '农场光线充足，正面或侧光都很出片～',
        '和动物互动超有活力，男朋友在旁边逗她笑～',
      ],
      '灯塔海边': [
        '灯塔海边超有电影感！侧身站着让灯塔成为背景～',
        '海边风大头发容易乱，男朋友要抓紧时机抓拍～',
        '灯塔旁的礁石当道具，自然靠上去表情放松～',
        '海风吹起头发超浪漫，这个瞬间最上镜！',
      ],
      '市集摊位': [
        '市集摊位超有生活感！捧着蔬果或小吃笑一个～',
        '市集背景色彩丰富，让人站前面当主体更突出～',
        '摊位前找好角度，避开杂乱背景让画面更干净～',
        '市集光线自然散射，打开闪光灯补光让脸更亮～',
      ],
      '早安晨跑': [
        '晨跑后皮肤红润通透！这个状态超适合拍照～',
        '晨光柔和拍侧脸最有感觉！让女友靠近窗户～',
        '早起拍照光线最温柔，不要错过这个黄金时间～',
        '跑完步的笑容最自然，男朋友在旁边抓拍～',
      ],
      '雨天街拍': [
        '雨天街拍超有氛围感！找个有积水的地方拍倒影～',
        '雨伞当道具超可爱！侧身站在伞下表情放松～',
        '雨天光线均匀柔和，脸部不会有强烈阴影～',
        '雨滴落在玻璃上超有感觉，车内自拍也很有氛围～',
      ],
      '逆光剪影': [
        '逆光拍剪影超有艺术感！让女友背对光源站着～',
        '剪影最重要的是轮廓，侧身站好最上镜～',
        '太阳在身后时，脸会变黑，开闪光灯补一下～',
        '日落时逆光拍剪影，光线最温柔最美～',
      ],
    }
    const arr = tips[category]
    if (arr && arr.length > 0) {
      await this.speak(pickRandom(arr), true)
    } else {
      // 通用场景提示（未知分类兜底）
      await this.speak('这个场景光线要注意！找好角度，自然光最美丽～', true)
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
    await this.speak(pickRandom(tips), true)
  }

  /** 模板切换确认 */
  async speakTemplateChanged(): Promise<void> {
    await this.speak(FACE_TIPS.TEMPLATE_CHANGED, true)
  }

  /** 选中新模板时的语音确认（比切换确认更具体） */
  async speakTemplateSelected(templateName: string): Promise<void> {
    const tip = pickRandom(TEMPLATE_SELECT_TIPS)
    await this.speak(`${templateName}～${tip}`, true)
  }

  /** 模板选中后站位引导 */
  async speakTemplateStandBy(): Promise<void> {
    const tips = [
      '跟着半透明剪影站位～',
      '看着半透明轮廓站好～',
      '参照剪影摆好姿势～',
      '跟着虚影位置站好～',
      '看看屏幕上虚线轮廓，站到对应位置就好～',
      '半透明模板出现了！照着摆，效果更佳～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 建议尝试新模板（同一模板用过多次时） */
  async speakTryNewTemplate(): Promise<void> {
    const tips = [
      '这个姿势拍了好几张了！换个新姿势试试吧～',
      '试试其他模板！换个姿势照片会更有变化～',
      '这个姿势用得差不多了！往左滑看看有没有新模板～',
      '多尝试不同的姿势！往下滑还有更多选择～',
      '换个新姿势会有惊喜！男朋友跟着模板拍，效果更好～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 每日首次打开欢迎语（判断是否今日首次使用）
   *  @param isFirstToday 今天是否首次打开（由调用方传入判断逻辑）
   */
  async speakDailyWelcome(isFirstToday: boolean): Promise<void> {
    if (!isFirstToday) return
    const tip = pickRandom(WELCOME_TIPS)
    await this.speak(tip, false)
  }

  /** 拍照失败提示 */
  async speakCaptureFailed(): Promise<void> {
    await this.speak(FACE_TIPS.CAPTURE_FAILED, true)
  }

  /** 相机权限被拒绝时提示 */
  async speakCameraPermissionDenied(): Promise<void> {
    const tips = [
      '相机权限被拒绝了～在设置里打开相机权限就可以拍照啦',
      '需要相机权限才能拍照哦，去设置里开启一下～',
      '相机用不了是因为没开权限！去设置-隐私-相机里打开就好～',
    ]
    await this.speak(pickRandom(tips), true)
  }


  async speakDiaryDeleted(): Promise<void> {
    const tips = [
      '删除成功！这张照片的记录已经从日记里移除了～',
      '删掉啦～这张照片不在日记里了～',
      '记录已删除！重新拍一张更好的吧～',
      '日记里这张已移除！再拍一张更满意的～',
    ]
    await this.speak(pickRandom(tips), true)
  }


  async speakBlinkTip(): Promise<void> {
    const tips = [
      FACE_TIPS.BLINK_DETECTED,
      FACE_TIPS.BLINK_DETECTED_2,
      FACE_TIPS.BOTH_EYES_CLOSED_TIP,
    ]
    await this.speak(pickRandom(tips))
  }




  async speakStiffExpressionTip(): Promise<void> {
    const tips = [
      FACE_TIPS.EXPRESSION_STIFF,
      FACE_TIPS.EXPRESSION_STIFF_2,
      FACE_TIPS.EXPRESSION_STIFF_3,
      FACE_TIPS.EXPRESSION_SAY_YUM,
      EXPRESSION_TIPS.COUNT_SHEEP,
      '表情稍微放松一点！想想开心的事，笑得更自然～',
      '别僵着！深呼吸一下，嘴角微微上扬，这个表情最好看～',
      '试试说"田七"！口型刚刚好，表情最自然～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 抬头角度提示（rollAngle 过大时触发） */
  async speakChinAngleTip(): Promise<void> {
    const tips = [
      FACE_TIPS.CHIN_ANGLE,
      FACE_TIPS.CHIN_ANGLE_2,
      FACE_TIPS.CHIN_ANGLE_3,
      '下巴稍微抬起来一点，脸部轮廓会更清晰～',
      '头微微上抬！下巴收紧，仪态会好很多～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 头发遮挡提示 */
  async speakHairOcclusionTip(): Promise<void> {
    const tips = [
      FACE_TIPS.HAIR_OCCLUSION,
      FACE_TIPS.HAIR_OCCLUSION_2,
      '头发遮住脸了！把头发撩到耳后，露出完整的脸部～',
      '刘海太长挡住眼睛了，轻轻拨开一点～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 照片模糊提示（sharpness < 80 时触发） */
  async speakBlurryTip(): Promise<void> {
    const tips = [
      FACE_TIPS.BLURRY_PHOTO,
      FACE_TIPS.BLURRY_PHOTO_2,
      '照片有点糊了！对焦清楚再拍，或者站近一点～',
      '这张有点模糊，拿稳手机再拍一张试试～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 表情优秀夸奖（expressionScore >= 18 时触发） */
  async speakExpressionGreat(): Promise<void> {
    const tips = [
      '这表情太灵动！笑得灿烂又自然，男朋友抓到了最完美的一刻！',
      '眼睛里有光！表情满分，男朋友简直是天生的摄影师！',
      '这笑容绝了！生动有感染力，眼睛都在发光～',
      '表情满分！眼神灵动笑容灿烂，这张可以直接上杂志封面！',
      '这笑容好生动！每一个角度都好看，男朋友太会抓了～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 低对比度（灰蒙蒙）提示 */
  async speakWashedOutTip(): Promise<void> {
    const tips = [
      '这张照片有点灰蒙蒙的，下次让对比度强一点试试～',
      '画面有点平，稍微加点对比度会更立体～',
      '男朋友试试找更亮的地方拍，光线对比会更分明～',
      '灰蒙蒙的！找个光线对比更明显的地方试试～',
      '对比度不够，试试换个角度让光线更有层次～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 饱和度过高提示 */
  async speakOverSaturatedTip(): Promise<void> {
    const tips = [
      '颜色稍微浓了点，稍微淡雅一点会更自然～',
      '饱和度拉太满了，稍微降降会更耐看～',
      '这张颜色有点过了，换个柔和点的滤镜试试～',
      '颜色太艳了！试试降低饱和度或者换个清淡的滤镜～',
      '强光下颜色容易过饱和，试试找个阴凉处或打开闪光灯补光～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 肤色偏色提示 */
  async speakSkinToneTip(): Promise<void> {
    const tips = [
      '肤色稍微有点偏，下次换个角度躲开有色光～',
      '脸上有点发黄或发绿，试试侧身躲开环境光～',
      '光源颜色影响了肤色，换个地方重新拍会更好看～',
      '室内暖黄灯容易让肤色偏黄，靠近窗户用自然光～',
      '有色光源照在脸上会有色偏，让男朋友用闪光灯正面补光～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 构图裁切/留白提示 */
  async speakFramingTip(): Promise<void> {
    const tips = [
      '构图稍微紧了一点，多留点边距会更舒服～',
      '稍微退后一步，让背景更完整人也更舒服～',
      '人不要紧贴边缘，多留点呼吸空间会更好看～',
    ]
    await this.speak(pickRandom(tips))
  }


  async speakTooFullTip(): Promise<void> {
    const tips = [
      '画面有点挤，退后一点让背景多一点～',
      '男朋友稍微退后，画面会更通透～',
      '背景留少一点，人会更突出更好看～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 构图偏了提示 */
  async speakCompositionOffTip(): Promise<void> {
    const tips = [
      '构图稍微偏了点，稍微移动一下位置会更好看～',
      '男朋友稍微调整一下站位，让主体更居中或按三分法摆放～',
      '构图跑偏了，打开九宫格辅助线，对齐再拍～',
    ]
    await this.speak(pickRandom(tips))
  }



  async speakSavedToAlbum(): Promise<void> {
    await this.speak(FACE_TIPS.SAVED_TO_ALBUM, true)
  }

  /** 保存失败提示 */
  async speakSaveFailed(): Promise<void> {
    await this.speak(FACE_TIPS.SAVE_FAILED)
  }

  /** 日记清空提示 */
  async speakDiaryCleared(): Promise<void> {
    const tips = [
      '进步日记已清空，一切从新开始，继续加油！',
      '日记已清空，男朋友继续加油，每次拍摄都是新起点！',
      '从零开始！男朋友的拍照之旅还在继续，冲冲冲～',
    ]
    await this.speak(pickRandom(tips))
  }





  async speakFaceFoundReady(): Promise<void> {
    await this.speak(FACE_TIPS.FACE_FOUND_CONFIRM, false)
  }

  /** 构图完美时的确认提示 */
  async speakCompositionGreat(): Promise<void> {
    await this.speak(FACE_TIPS.GOOD_COMPOSITION_DETECTED, true)
  }

  /** 稳定性完美时的表扬 */
  async speakStabilityPerfect(): Promise<void> {
    const tips = [
      '手好稳！稳住这个状态，按下去就是大片！',
      '手机稳如泰山！这个角度绝了，拍！',
      '超级稳！男朋友你是练过的吗，按！',
      '超稳！深呼吸，慢慢按下快门就是一张好片！',
      '好稳！这个角度光线都完美，拍吧！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 拍摄后稳定分低时的语音提示（tiltAngle 来自分析结果） */
  async speakStabilityIssue(tiltAngle: number): Promise<void> {
    const absTilt = Math.abs(tiltAngle)
    let tips: string[]
    if (absTilt > 20) {
      tips = [
        '这张照片歪了！下次拍照时把手机放正，别着急按～',
        '拍歪了！手机和地面保持垂直，照片会更正～',
        '角度有点歪！拍照前看一眼九宫格线，让手机保持水平～',
      ]
    } else {
      tips = [
        '稍微有点歪，下次把手机端平会更好看～',
        '端稳一点！这张有点歪，但不影响整体～',
        '手稍微抖了一下，下次稳住再按快门～',
      ]
    }
    await this.speak(pickRandom(tips), true)
  }


  async speakAlmostGreat(score: number): Promise<void> {
    const tips = [
      `${score}分！差一点就完美了！男朋友继续加油！`,
      `${score}分，已经很棒了！再拍一张挑战满分！`,
      `就差一点到优秀！${score}分，距离大片只差一点点！`,
    ]
    await this.speak(pickRandom(tips), true)
  }



  async speakNewRecord(previousScore: number, newScore: number): Promise<void> {
    const tips = [
      `新纪录达成！从${previousScore}分到${newScore}分，太厉害了！`,
      `破纪录啦！男朋友你又进步了，继续保持！`,
      `${newScore}分！历史新高！男朋友你是最棒的！`,
      `哇塞！${newScore}分！男朋友拍照技术又进化了！`,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 进步日记里程碑提示 */
  async speakDiaryMilestone(type: 'first' | 'streak3' | 'streak7' | 'week10'): Promise<void> {
    const tips: Record<string, string[]> = {
      first: [
        '第一次记日记！这是成长的开始，继续加油～',
        '第一张照片入库啦！男朋友正式开启摄影之旅～',
        '记录从第一张开始！每张照片都是进步的证明～',
      ],
      streak3: [
        '连续拍了三天！男朋友越来越有摄影师的感觉了～',
        '三天连续打卡！男朋友的拍照热情在燃烧～',
        '坚持三天了！男朋友已经开始有拍照习惯了～',
      ],
      streak7: [
        '一周连续拍照！坚持就是胜利，进步肉眼可见！',
        '一周啦！男朋友已经养成了拍照习惯，超棒！',
        '连续七天！这毅力太强了，进步肯定不少～',
      ],
      week10: [
        '十周啦！男朋友已经成了半个摄影师！',
        '十周里程碑！男朋友的摄影水平突飞猛进了！',
        '拍了十周！男朋友已经掌握了拍照的精髓～',
      ],
    }
    const arr = tips[type] || []
    if (arr.length > 0) await this.speak(pickRandom(arr), true)
  }

  /** 比拼模式提示（对比两张照片时） */

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.initialized) {
      Tts.stop()
    }
  }

  /** 停止当前语音（不清除 enabled 状态，确保后续 speak() 调用仍可工作） */
  stop(): void {
    this.speaking = false
    try {
      Tts.stop()
    } catch {
      // 静默处理 stop 失败
    }
  }

  /** 完全禁用 TTS（清理时使用，stop 后不再允许 speak） */
  disable(): void {
    this.enabled = false
    this.stop()
  }

  /** 重置 TTS 状态（在页面跳转时安全清理） */
  reset(): void {
    this.speaking = false
    this.recentTips = []
    this.lastSpokeAt = 0
    try {
      Tts.stop()
    } catch {
      // 静默处理
    }
  }










  async speakLowScore(score: number): Promise<void> {
    const tips = [
      `这张只有${score}分，没关系！多拍几张就好啦～`,
      `${score}分不是终点！男朋友继续加油！`,
      `${score}分只是开始！再来一张，肯定会更好！`,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 满分/接近满分庆祝 */
  async speakPerfectScore(score: number): Promise<void> {
    const tips = [
      `满分！${score}分！男朋友你是开挂了吗！这张太绝了！`,
      `${score}分！男朋友摄影师天赋觉醒！这张要存档一万年！`,
      `${score}分大片！这张照片可以直接上杂志封面了！`,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 连续好评播报 */
  async speakStreak(count: number): Promise<void> {
    const tips = [
      `连续${count}次高分！男朋友这稳定发挥太厉害了！`,
      `${count}连拍都是好片！男朋友你是专业的吗！`,
      `${count}次都这么高分，这摄影师养成了！`,
    ]
    await this.speak(pickRandom(tips), true)
  }


  async speakMorningTip(): Promise<void> {
    const tips = [
      '早上的光线好柔和，现在拍照超适合！',
      '晨光时光光线超美！趁现在多拍几张～',
      '早起的福利！这种光线拍照最好看了～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 夜景拍摄提示 */
  async speakNightTip(): Promise<void> {
    const tips = [
      '夜景拍摄要注意稳定手机，男朋友尽量端稳一点～',
      '晚上光线暗，男朋友尽量找光源让脸亮起来～',
      '夜晚拍照有氛围感！找霓虹灯或路灯当背景超好看～',
      '夜景模式！让脸上的光均匀一点，出来的照片会很美～',
      '晚上拍照要稳住！男朋友尽量让手机正对着脸～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 酒吧霓虹灯场景提示 */
  async speakNeonLightTip(): Promise<void> {
    const tips = [
      '酒吧霓虹灯超有氛围！侧脸对着光源，灯光打在侧脸上超美～',
      '霓虹灯下拍剪影也很酷！背对灯光让轮廓发光～',
      '酒吧灯光五彩斑斓，衣服选深色或纯色更出片～',
      '霓虹灯做背景虚化超有氛围感！人像模式开起来～',
      '酒吧光线复杂，找一处光源正对或侧对脸，别让脸完全在暗处～',
      '霓虹灯下可以靠近光源拍特写，光线打在皮肤上很柔～',
      '酒吧拍的话靠近窗户或者霓虹灯牌，光会更干净～',
    ]
    await this.speak(pickRandom(tips), true)
  }


  async speakScoreReveal(score: number): Promise<void> {
    if (score >= 90) {
      await this.speak(`${score}分！满分之作！男朋友你太强了！`, true)
    } else if (score >= 80) {
      await this.speak(`${score}分！高分！男朋友表现很棒！`, false)
    } else if (score >= 70) {
      await this.speak(`${score}分！不错不错，继续保持！`, false)
    } else if (score >= 60) {
      await this.speak(`${score}分！及格啦，下次会更好！`, false)
    } else {
      await this.speak(`${score}分，继续加油！多拍几张一定会越拍越好！`, false)
    }
  }



  async speakMilestone(count: number): Promise<void> {
    const msgs: Record<number, string> = {
      10: '十连拍达成！男朋友进步肉眼可见！',
      20: '二十连拍里程碑！摄影师已在线！',
      50: '五十次快门！男朋友你是被拍照耽误的摄影师！',
      100: '百次快门达成！男朋友已经是拍照达人了！',
    }
    const msg = msgs[count] || `${count}次拍摄达成！继续加油！`
    await this.speak(msg, true)
  }








  async speakProgressEncouragement(totalPhotos: number): Promise<void> {
    if (totalPhotos === 0) {
      await this.speak('开启你的拍照之旅吧！第一张永远是最好的开始～', true)
      return
    }
    if (totalPhotos < 5) {
      const tips = [
        '才拍了几张就这么有感觉，男朋友潜力无限！',
        '继续加油！每拍一张都在进步～',
        '男朋友正在飞速成长，继续保持这个势头！',
      ]
      await this.speak(pickRandom(tips), true)
      return
    }
    if (totalPhotos < 20) {
      const tips = [
        '男朋友已经是老手了！继续保持这个状态～',
        '拍了这么多张，进步肉眼可见！',
        '男朋友越来越会拍了，继续保持！',
      ]
      await this.speak(pickRandom(tips), true)
      return
    }
    const tips = [
      '男友摄影师认证！拍了这么多张，每张都越来越好了！',
      '男朋友已经从新手进化成高手，继续探索更多姿势吧～',
      '哇！已经拍了这么多！男朋友的拍照水平简直开挂了！',
    ]
    await this.speak(pickRandom(tips), true)
  }


  async speakFaceTooSmall(): Promise<void> {
    await this.speak(FACE_TIPS.TOO_SMALL, true)
  }

  async speakFaceTooLarge(): Promise<void> {
    await this.speak(FACE_TIPS.TOO_LARGE, true)
  }


  async speakRainyTip(): Promise<void> {
    const tips = [
      '雨天的光线超柔和！找个窗户边，光影绝绝子～',
      '雨天窗边拍照最有氛围感！水珠做前景超有感觉～',
      '雨后的地面有倒影，找个水洼试试俯拍，超有意境～',
      '撑把透明伞！雨丝落下来的时候抓拍，超有意境～',
      '积水倒影超美！蹲下来拍一张，别有洞天～',
      '打开闪光灯补补光，雨天脸容易暗～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 逆光拍摄提示 */
  async speakBacklightTip(): Promise<void> {
    const tips = [
      '逆光超有感觉！转过身让光打在侧脸上，绝绝子～',
      '背光拍摄剪影超浪漫！整个人都在发光的感觉～',
      '逆光的时候让女朋友稍微侧身，光线勾勒轮廓超美～',
      '逆光太强了！打开闪光灯补光，不然脸会黑黑的～',
      '换个角度！让光源打在脸的侧面或后方，轮廓会更清晰～',
      '逆光检测到！试试打开 HDR 模式，或者让女友侧身躲开强光～',
    ]
    await this.speak(pickRandom(tips), true)
  }












  async speakExpressionExaggerateTip(): Promise<void> {
    const tips = [
      '笑容再大一点！这样更上镜～',
      '表情放松一点～别僵着，自然最美～',
      '表情夸张一点！生动活泼更有感染力～',
    ]
    await this.speak(pickRandom(tips), true)
  }



  async speakEveningTip(): Promise<void> {
    const tips = [
      '傍晚光线好温柔！这时间段拍人像绝了～',
      'Golden Hour 光线好美，男朋友抓到了！',
      '夕阳余晖把人拍得好温柔！男朋友这光用绝了～',
    ]
    await this.speak(pickRandom(tips), true)
  }









  async speakTemplateCleared(): Promise<void> {
    const tips = [
      '模板已关闭，自由发挥吧～',
      '没有模板限制啦，自由拍摄更自然～',
      '模板去除，跟着感觉拍就好～',
      '关闭模板引导，随心所欲拍～',
      '自由模式开启！男朋友自由发挥吧～',
    ]
    await this.speak(pickRandom(tips), false)
  }



  async speakFilterSwipeHint(): Promise<void> {
    const tips = [
      '滤镜可以左右滑动切换，找到最喜欢的那一款～',
      '试试不同的滤镜，每种风格都不一样哦～',
      '向左滑动查看更多滤镜，找到最适合这张照片的风格～',
      '试试不同的滤镜，找到最适合这张照片的感觉～',
      '滤镜区可以滑动切换，选一个最喜欢的风格～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakFilterApplied(filterName: string): Promise<void> {
    const filterLabels: Record<string, string> = {
      warm: '暖黄',
      cool: '冷调',
      vivid: '生动',
      soft: '柔和',
      bw: '黑白',
      portrait: '人像',
      food: '美食',
      cinematic: '电影',
    }
    const label = filterLabels[filterName] || filterName
    const tips = [
      `${label}滤镜已应用！这个色调好有感觉～`,
      `滤镜切换成${label}了！整体氛围感更强了～`,
      `${label}色调好搭！男朋友这张绝了～`,
      `试试这个${label}滤镜！色调刚刚好～`,
    ]
    await this.speak(pickRandom(tips), false)
  }



  async speakProcessingDone(): Promise<void> {
    const tips = [
      '分析完成！来看看这张表现怎么样～',
      '这张拍得怎么样呢？男朋友准备好接受评分了吗～',
      '结果出来了！男朋友的摄影水平公开处刑时间到～',
    ]
    await this.speak(pickRandom(tips), false)
  }






  async speakBeachTip(): Promise<void> {
    const tips = [
      '海边阳光强烈容易过曝！找岩石阴影处拍，光线更柔和～',
      '正午海边顶光太强，让女朋友找阳伞下或侧身躲开直射光～',
      '海风吹起头发超浪漫！等一阵风来时按下快门～',
      '海水反射会让肤色偏蓝，稍微加一点暖色调后期更好看～',
      '海浪拍岸时抓拍，超有动感！',
      '海边拍逆光剪影效果最好！让轮廓发光～',
      '沙滩做背景干净开阔，人居中或三分都好看～',
      '紫外线强！让女朋友涂好防晒再出去拍～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 镜子自拍提示 */
  async speakMirrorSelfieTip(): Promise<void> {
    const tips = [
      '对着镜子侧身站！45 度角轮廓最立体，别正面怼镜子会有反光～',
      '浴室镜子有雾气时皮肤超柔和！趁雾还没散赶紧拍～',
      '镜子反光太强了，稍微侧一点躲开强光点～',
      '镜子里的你和本人都入镜，画面层次感绝了！',
      '手举到镜子前互动一下，比呆呆站着更有趣～',
      '选择干净的镜子背景，脏镜子会让画面打折～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 泳池边拍照提示 */
  async speakSwimmingPoolTip(): Promise<void> {
    const tips = [
      '泳池边逆光超有氛围！转过身让光打在脸上，肤色通透～',
      '水面反光会让肤色偏蓝，稍微仰头躲开水面强反光～',
      '水汽缭绕时皮肤显得超柔和！这个湿度感绝了，抓紧拍～',
      '避开泳池瓷砖边线，背景干净主体才更突出～',
      '泳池边的蓝色调配「清凉」滤镜更配，夏日感拉满～',
      '有水珠时皮肤更有光泽！趁身上还有水珠时拍～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 雪景拍照提示 */
  async speakSnowTip(): Promise<void> {
    const tips = [
      '雪地光线反射强！戴墨镜或找阴影，避免眯眼～',
      '围巾是天然的暖色反光板，把脸衬得红润通透～',
      '白茫茫的背景超浪漫！稍微过曝一点白雪才不灰～',
      '雪景里的彩色围巾超好看，是加分项哦～',
    ]
    await this.speak(pickRandom(tips), true)
  }




  async speakGymTip(): Promise<void> {
    const tips = [
      '健身房找镜子拍！镜子里外都能入镜，构图超丰富～',
      '器械区背景有层次感，侧身对着镜子站好～',
      '运动后好气色超上镜！汗水让皮肤有光泽～',
      '跑步机背景超有动感，让女朋友站在跑道上笑一个～',
      '瑜伽垫上动作舒展，抓拍最自然的瞬间～',
      '健身房找一面干净的镜子，构图会更有层次～',
    ]
    await this.speak(pickRandom(tips), true)
  }







  async speakDancePerformanceTip(): Promise<void> {
    const tips = [
      '舞台灯光变化快，连拍几张选最清晰的那张～',
      '表演中表情夸张一点更有感染力！活力感拉满～',
      '舞台逆光超有感觉！转过身让轮廓发光，绝了～',
      '表演现场光线复杂，开闪光灯补光效果更好～',
      '跟着节奏动起来的时候抓拍，表情最生动～',
    ]
    await this.speak(pickRandom(tips), true)
  }


  async speakFestivalLightsTip(): Promise<void> {
    const tips = [
      '灯展场景色彩斑斓！侧身站着让灯光打侧脸上，超有氛围～',
      '灯展人多背景杂，找个空隙蹲低仰拍，背景更干净～',
      '灯展光线复杂，打开手机闪光灯补补光～',
      '灯展逆光超浪漫！转过来让脸朝向光源试试～',
      '灯展背景五彩缤纷，衣服选纯色更突出主体～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  async speakAmusementTip(): Promise<void> {
    const tips = [
      '游乐园灯光超梦幻！找个项目做背景，笑着拍一张～',
      '旋转木马前超浪漫！侧身站着，光线超温柔～',
      '游乐园大摆臂超有活力！动起来抓拍最自然～',
      '摩天轮里光线柔和，这个角度超浪漫～',
      '过山车尖叫瞬间超生动！抓拍表情最自然～',
    ]
    await this.speak(pickRandom(tips), true)
  }



  // 拍摄前引导

  // 拍摄中实时指导

  // 拍完后自动播报

  // 场景切换提醒

  /** 切换到前置摄像头 */
  async speakCameraSwitchedFront(): Promise<void> {
    const tips = [FACE_TIPS.CAMERA_SWITCHED_FRONT, FACE_TIPS.CAMERA_SWITCHED_FRONT_2, FACE_TIPS.CAMERA_SWITCHED_FRONT_3]
    await this.speak(pickRandom(tips), true)
  }

  /** 切换到后置摄像头 */
  async speakCameraSwitchedBack(): Promise<void> {
    const tips = [FACE_TIPS.CAMERA_SWITCHED_BACK, FACE_TIPS.CAMERA_SWITCHED_BACK_2, FACE_TIPS.CAMERA_SWITCHED_BACK_3]
    await this.speak(pickRandom(tips), true)
  }


  async speakIdleTooLong(): Promise<void> {
    const tips = [FACE_TIPS.IDLE_TOO_LONG, FACE_TIPS.IDLE_TOO_LONG_2, FACE_TIPS.IDLE_TOO_LONG_3]
    await this.speak(pickRandom(tips), true)
  }





  async speakGridModeChanged(mode: 'grid' | 'golden' | 'triangle'): Promise<void> {
    const labels: Record<string, string> = {
      grid: '九宫格',
      golden: '黄金螺旋',
      triangle: '三角构图',
    }
    await this.speak(`已切换到${labels[mode] || mode}模式`, false)
  }

  /** 闪光灯切换成功提示 */
  async speakFlashChanged(mode: 'off' | 'on' | 'auto'): Promise<void> {
    const labels: Record<string, string> = {
      off: '闪光灯关闭',
      on: '闪光灯打开',
      auto: '闪光灯自动模式',
    }
    await this.speak(labels[mode] || mode, false)
  }

  /** 情侣合照专属提示 */
  async speakCouplePhotoTip(): Promise<void> {
    const tips = [
      '情侣照！靠近一点贴贴，表情自然一点～',
      '两个人对视一下！这个瞬间抓拍超甜～',
      '男生从后面抱！经典的甜蜜姿势～',
      '牵手背对镜头，超有氛围感！',
      '两人并排站好，头靠在一起！这个姿势超甜～',
      '公主抱姿势！男生把女生抱起来抓拍，甜蜜爆棚～',
      '转圈圈抓拍！两人牵手转圈，动态瞬间最生动～',
    ]
    await this.speak(pickRandom(tips), true)
  }








  async speakTemplateCategorySwitched(category: string): Promise<void> {
    // 完整覆盖云函数 getTemplates 所有分类
    const catLabels: Record<string, string> = {
      '室内日常': '室内日常',
      '室内场景': '室内场景',
      '室内人像': '室内人像',
      '户外风景': '户外风景',
      '餐厅美食': '餐厅美食',
      '特殊风格': '特殊风格',
      '情侣合照': '情侣合照',
      '城市街拍': '城市街拍',
      '自拍技巧': '自拍技巧',
      '构图技巧': '构图技巧',
      '人文风景': '人文风景',
      '夜景': '夜景',
      '节日限定': '节日限定',
      '运动健身': '运动健身',
    }
    const label = catLabels[category] || category
    await this.speak(`已切换到${label}模板，找个好位置开始拍吧～`, false)
  }





  async speakSmileDetected(): Promise<void> {
    const tips = [
      FACE_TIPS.SMILE_DETECTED,
      FACE_TIPS.NATURAL_SMILE_DETECTED,
      '看到笑容了！这个表情好生动，就是现在！',
      '她在笑！就是这张，按下去！',
      '表情超自然！就是这个瞬间，咔嚓！',
      '笑容满分！按下快门就是大片～',
    ]
    await this.speak(pickRandom(tips), false)
  }












  async speakDiaryLoaded(count: number): Promise<void> {
    if (count === 0) {
      await this.speak('进步日记是空的！先去拍一张吧～', true)
    } else {
      await this.speak(`已加载${count}条进步记录，继续加油！`, true)
    }
  }

  /** 日记写入确认（拍完照保存后，简要播报，不重复分数） */
  async speakDiaryWritten(score: number): Promise<void> {
    const tips = [
      '已收录到日记～坚持记录，进步看得见！',
      '日记更新！这张拍得不错哦～',
      '记录成功，继续保持这个节奏！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 极低光警告 */
  async speakLowLightWarning(): Promise<void> {
    const tips = [
      '光线太暗了！找个亮一点的地方，或者打开闪光灯～',
      '周围好黑，打开闪光灯或找个光源，脸会更亮～',
      '暗光环境下照片容易糊，打开手机手电筒补补光～',
      '晚上拍照记得靠近光源，或者打开闪光灯补光～',
      '光线不足！靠近窗户或打开闪光灯补补光～',
      '暗光拍摄容易糊！找个光源或者打开补光灯试试～',
    ]
    await this.speak(pickRandom(tips), true)
  }










  async speakBestiePoseTip(): Promise<void> {
    const tips = [
      '两个人靠近一点！闺蜜照就是要贴贴才好看～',
      '对视一下或者一起看镜头！两个人默契感绝了～',
      '做相同的搞怪表情！这个角度超可爱～',
      '背对镜头比耶！自然又有趣，比正对镜头自然多了～',
      '错开站位！一个人稍微往前一点，层次感立刻出来了～',
    ]
    await this.speak(pickRandom(tips), true)
  }





  async speakFaceLost(): Promise<void> {
    const tips = [
      '看不到脸了！再靠近一点，让相机找到你～',
      '脸丢了！稍微站近一点，让镜头找到你～',
      '相机找不到你的脸了，往前一点点～',
      '检测不到人脸了！稍微站近一点，或者让脸正对镜头～',
      '脸跑出画面了！稍微调整一下位置让脸回到画面中央～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  async speakNoFaceLongTip(): Promise<void> {
    const tips = [
      '镜头里看不到人脸，试一下对着相机站近一点～',
      '找不到人脸，可以点一下屏幕对焦～',
      '让女朋友站到画面中间，这样人脸识别更容易找到～',
      '光线太暗也会影响人脸识别，找个亮一点的地方试试～',
      '如果想拍背影或剪影，可以关掉人脸识别～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 人脸重新检测到提示 — faceLost 后重新找回 */
  async speakFaceRegained(): Promise<void> {
    const tips = [
      '找到你了！',
      '看到你了！',
      '识别成功！',
      '好棒！脸回来了，继续保持这个位置～',
      '检测到人脸了！这个角度很好，可以拍了～',
    ]
    await this.speak(pickRandom(tips), false)
  }




  async speakBacklightGuide(): Promise<void> {
    const tips = [
      '检测到逆光！脸有点暗，侧身转过来让光打在脸上～',
      '背光场景！脸太黑了，打开闪光灯补光试试～',
      '逆光情况下打开闪光灯，让脸亮起来～',
      '背光了！转过来面对光源，或者打开闪光灯补光～',
      '逆光照片脸是黑的！打开 HDR 模式或者转过来面对光源～',
      '背光检测到！打开闪光灯正面补光，或者侧身躲开逆光～',
    ]
    await this.speak(pickRandom(tips), false)
  }




  async speakSelfieTip(): Promise<void> {
    const tips = [
      '自拍稍微侧一点脸！45度是最显瘦的黄金角度～',
      '手机稍微抬高一点俯拍，自拍显脸小的秘密～',
      '对着镜子用后置镜头自拍，画质比前置好很多～',
      '下巴稍微收紧一点点，下颌线会更清晰～',
      '稍微张嘴笑比抿嘴更自然～',
      '打开九宫格辅助线，把脸放在上横线交叉点～',
      '对着镜子自拍时手机稍微斜一点，避免镜面反光～',
      '举高手机从上往下拍，自拍最显脸小的角度！',
    ]
    await this.speak(pickRandom(tips), false)
  }



  async speakBurstSuccessTip(count: number): Promise<void> {
    const tips = [
      `连拍完成！拍了${count}张，挑一张最喜欢的吧～`,
      `抓到了${count}张！选一张最好的吧～`,
      `连拍结束！${count}张里肯定有一张完美的～`,
      `${count}张连拍完成！动起来的瞬间最自然，选最自然的那张～`,
      `拍了${count}张！多拍多选，好的总在其中～`,
    ]
    await this.speak(pickRandom(tips), false)
  }




    /** 强日光户外建议 — 正午/夏季户外亮度高直射 */
  async speakHarshSunlightTip(): Promise<void> {
    const tips = [
      '阳光太晒了！找树荫或建筑阴影处，光线更柔和～',
      '正午顶光太强！站在阴影里，脸上的光会更均匀～',
      '强光下容易过曝，侧身躲开太阳直射会好很多～',
      '阳光太烈了！稍微等云遮一下，或者找阴影拍～',
      '户外太晒了！靠近建筑物站，让它挡住强光～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 雾霾天/沙尘天建议 */
  async speakFoggyWeatherTip(): Promise<void> {
    const tips = [
      '今天有点雾霾，光线比较柔和反而适合拍照～',
      '雾蒙蒙的光线拍出来很柔和，找个前景虚化一下会很有层次～',
      '灰蒙蒙的天气光线均匀！拍逆光剪影效果会很好～',
      '雾霾天光线偏冷白，后期可以加一点暖色调让照片更有氛围～',
      '这个天气适合拍柔光人像，找个干净的背景就很好看～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 地铁/地下空间暗光建议 */
  async speakSubwayDarkTip(): Promise<void> {
    const tips = [
      '地铁里光线暗！靠近站台灯或出口光再拍～',
      '地下空间光线不足，找扶梯口或出口的光源～',
      '地铁站里开闪光灯试试，不然脸会太暗～',
      '地下空间光线偏冷白，开屏幕补光效果最好～',
      '地下站比较暗，让女朋友靠近灯箱或广告牌站～',
    ]
    await this.speak(pickRandom(tips), false)
  }



  async speakDiaryEmpty(): Promise<void> {
    const tips = [
      '日记还是空的！先去拍一张吧～',
      '还没有记录呢！去拍照看看男朋友进步了没有～',
      '日记等着你来填满！先拍一张试试～',
      '进步日记还没开始呢～去拍一张，记录男朋友的成长～',
      '第一张照片还没拍呢！去拍一张开启你的进步日记吧～',
      '日记里还是空白～去拍几张，让男朋友的进步有迹可循～',
    ]
    await this.speak(pickRandom(tips), false)
  }


  async speakStreakBroken(): Promise<void> {
    const tips = [
      '连续拍照断了～没关系，今天重新开始！',
      '打卡断了一天！明天继续加油～',
      '连续记录暂时休息了一下，新的一天重新开始吧～',
    ]
    await this.speak(pickRandom(tips), false)
  }


  async speakFaceLookAtCamera(): Promise<void> {
    const tips = [
      '眼神到位了！就是现在，笑一个按下去～',
      '眼睛看着镜头，这个角度绝了！',
      '眼神定住了！就是现在，按快门！',
      '眼睛有神！姿势也对，按下去就是大片！',
      '对视镜头，眼神满分！就是现在拍～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 脸部被遮挡检测（头发/手/眼镜反光） */
  async speakFaceOccluded(occluder: 'hair' | 'hand' | 'glasses' | 'other'): Promise<void> {
    const tips: Record<string, string[]> = {
      hair: [
        '头发挡住脸了！轻轻拨到耳后，轮廓会更清晰～',
        '头发有点遮眼睛，拨开一下拍出来会更好看～',
      ],
      hand: [
        '手离脸太近了！稍微拿开一点，显脸小效果更好～',
        '手挡住脸的一部分，挪开再拍会更完整～',
      ],
      glasses: [
        '眼镜反光太亮了！稍微侧一下躲开光源～',
        '镜片反光挡住眼睛了，抬头或低头一点点～',
      ],
      other: [
        '脸上有东西挡住了，稍微调整一下角度～',
        '有东西挡住脸了，挪开再拍～',
      ],
    }
    const pool = tips[occluder] || tips.other
    await this.speak(pickRandom(pool), false)
  }


  async speakGroupLookAtCamera(): Promise<void> {
    const tips = [
      '大家都在看镜头吗？提醒一下还没看过来的人～',
      '有人没看镜头哦！让大家一起看镜头笑一个～',
      '后排的也要看镜头！提醒一下～',
      '合照大家要一起看镜头哦～准备，一二三茄子！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  // ===== 场景专属 TTS 方法（保留定义，暂无调用方） =====
  // 计划: 通过统一的 scene-type → speak method 路由调用
  // 场景类型: indoor | outdoor | cafe | rooftop_night | camping_campfire | snow |
  // ski_resort | cherry_blossom | christmas | gym | zoo | train | subway | supermarket |
  // rooftop_party | farm | graffiti | aquarium | chapel | market_stall | bakery |
  // carousel | greenhouse | tent_camp | graduation | old_town | beach_sunset |
  // rainy_street | morning_run | bookstore | beach | airport_station | meadow_ranch



  async speakGraffitiTip(): Promise<void> {
    const tips = [
      '涂鸦墙前超酷！侧身站着，超有态度～',
      '街头涂鸦做背景超有范儿！找个干净的角落，表情酷一点～',
      '涂鸦墙是绝佳背景！让灯光打在脸上，表情自信一点～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 水族馆蓝色场景 */
  async speakAquariumTip(): Promise<void> {
    const tips = [
      '水族馆蓝色光线超梦幻！侧身站着让鱼群做背景，超浪漫～',
      '水族馆的光线超柔和！表情放松，笑容甜美一点～',
      '蓝色水下世界超有氛围！靠近鱼缸，让光影打在脸上～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 教堂婚礼场景 */
  async speakChapelTip(): Promise<void> {
    const tips = [
      '教堂里光线超神圣！正对镜头笑一个，表情庄重又甜美～',
      '教堂建筑超有层次！找个拱门做框架，构图会超美～',
      '神圣时刻超有意义！表情自然放松，这张值得永久保存～',
    ]
    await this.speak(pickRandom(tips), false)
  }





  async speakBeachSunsetTip(): Promise<void> {
    const tips = [
      '海边夕阳余晖超浪漫！侧身站着让光打在侧脸上，轮廓绝了～',
      '夕阳倒映在海面上超美！蹲低一点拍出倒影，角度绝了～',
      '海边夕阳光线最温柔！表情放松，笑容自然，这张值得永久保存～',
    ]
    await this.speak(pickRandom(tips), false)
  }



  async speakBookstoreTip(): Promise<void> {
    const tips = [
      '书店里的光线超有质感！靠在书架旁边，文艺感拉满～',
      '书香气质超适合拍照！侧身站着，表情知性一点～',
      '书架前超有氛围感！找个光线好的角落，表情自然～',
    ]
    await this.speak(pickRandom(tips), false)
  }







  async speakFirstPhotoTip(): Promise<void> {
    const tips = [
      '第一次拍！不用紧张，随便找个好看的角度按下去就是进步～',
      '新手第一天！找个光线好的地方，随便拍两张练练手～',
      '第一次玩这个！不用追求完美，先熟悉一下怎么用～',
    ]
    await this.speak(pickRandom(tips), false)
  }





  async speakCoupleInteractionTipV2(): Promise<void> {
    const tips = [
      '情侣照可以试试从后面环抱！甜蜜感拉满～',
      '牵手往前走，然后转头看镜头！这个瞬间最自然～',
      '额头碰额头嘟嘴，比正脸更甜哦～',
      '两个人背对镜头，让男朋友从背后拍，超有氛围感～',
      '对视笑一个！这个表情比摆拍甜一百倍～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 自拍姿势专属提示 */
  async speakSelfiePoseTip(): Promise<void> {
    const tips = [
      '对着镜子自拍！手机稍微斜一点拍，角度更好看～',
      '45度侧脸最上镜，稍微仰头看镜子里的自己～',
      '用后置镜头对着镜子拍，画质比前置好很多～',
      '手机和镜子成45度角，这个经典角度永远不会出错～',
      '侧脸对镜子，露出下颌线！这个角度显脸小～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 多人合照专属提示（进阶版） */
  async speakGroupPhotoTipV2(): Promise<void> {
    const tips = [
      '闺蜜照站成一排太无聊！试试错落有致，前后排错开～',
      '中间的人稍微往前站，后排踮脚，这样大家都能露出来～',
      '多人拍摄找一个共同视线点，避免各看各的～',
      '最后排踮脚、前排蹲下，这个经典队形适合所有人入镜～',
      '穿相近色系的衣服会更和谐高级，不一定要完全一样～',
      '闺蜜照可以围成一个圈，这样每个人都是C位～',
      '试试从侧面拍多人合照，层次感会比正面更强～',
      '道具加分！拿气球、咖啡杯或花束，画面立刻丰富起来～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 夜景氛围提示 */
  async speakNightAmbianceTip(): Promise<void> {
    const tips = [
      '夜色里的灯光打在侧脸上超有故事感～',
      '晚上拍照记得开闪光灯！不然脸就是一块黑影～',
      '霓虹灯下侧身站，让多彩的光打在侧脸上～',
      '找个光源让光打在脸上，别让脸太暗～',
      '夜间拍照打开屏幕补光，让脸部光线更均匀～',
      '夜景背景灯光斑斓，让女朋友靠近光源拍效果最好～',
      '夜间室内找个台灯或落地灯，光线柔和又温馨～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  // ===== 新增语音场景 =====

  // speakBacklightTip/speakGoldenHourTip/speakPortraitModeTip/speakCompositionGuide/speakLowBattery
  // 已在上方定义，此处补充以下新增方法：


  async speakPerfectShotTip(): Promise<void> {
    const tips = [
      '这张绝了！完美构图加自然表情，超级加分～',
      '哇！男朋友这张拍得超棒，有大师级水准了！',
      '这张光线构图都在线，太好看了！',
      '拍得真不错！发朋友圈绝对会被夸～',
      '男朋友进步好大！继续加油～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 低电量警告（与 speakLowBattery 不同：强调催促男朋友加快速度） */
  async speakLowBatteryWarning(): Promise<void> {
    const tips = [
      '手机电量低了，抓紧时间多拍几张～',
      '电池快没啦！趁现在赶紧多拍几张好看的～',
      '手机要没电了！男朋友快点，我们抢时间多拍几张～',
      '电量告急了！趁着还有电赶紧多拍几张～',
      '手机快没电了！男朋友动作快点，多留几张美好的回忆～',
    ]
    await this.speak(pickRandom(tips), true)
  }







  async speakPhotoCountMilestone(count: number): Promise<void> {
    if (count >= 100) {
      const tips = [
        '一百张啦！男朋友已经是资深摄影师了！',
        '一百张照片见证了所有进步！男朋友太强了～',
        '里程碑达成！一百张照片，男朋友的摄影之路越走越远！',
      ]
      await this.speak(pickRandom(tips), true)
    } else if (count >= 50) {
      const tips = [
        '五十张了！男朋友的进步肉眼可见！',
        '五十张照片，男朋友的摄影水平已经突飞猛进了！',
        '五十张里程碑！男朋友越来越专业了～',
      ]
      await this.speak(pickRandom(tips), true)
    } else if (count >= 25) {
      const tips = [
        '二十五张啦！男朋友的构图越来越讲究了！',
        '二十五张照片，记录了满满的进步！',
        '二十五张了，男朋友开始有摄影感觉了～',
      ]
      await this.speak(pickRandom(tips), true)
    } else if (count >= 10) {
      const tips = [
        '十张啦！男朋友已经有拍照习惯了，继续保持！',
        '十张照片了！男朋友进步好快～',
        '十张里程碑！男朋友越来越会拍了呢～',
      ]
      await this.speak(pickRandom(tips), true)
    }
  }


  async speakIndoorPortraitTip(): Promise<void> {
    const tips = [
      '室内找窗边！自然光最柔和～',
      '靠近窗户让光线打在脸上，这质感绝了！',
      '避开窗户反光，侧身站着更自然～',
      '室内白墙会反光！靠近墙站脸会更亮～',
    ]
    await this.speak(pickRandom(tips), true)
  }












  async speakImprovementDetected(dimension: 'composition' | 'exposure' | 'stability' | 'expression' | 'level'): Promise<void> {
    const tips: Record<string, string[]> = {
      composition: [
        '构图进步了！终于把我放对位置了～',
        '构图感觉变好了，男朋友悟性不错嘛～',
        '这次站位讲究多了，男朋友有在认真构图～',
      ],
      exposure: [
        '光线拿捏得比上次好了！',
        '脸上终于有光了，男朋友找到感觉了！',
        '这张亮度刚刚好，比上次进步了～',
      ],
      stability: [
        '这张稳多了！手不抖了，进步好大～',
        '终于不糊了，男朋友手稳了！',
        '清晰度比上次好多了，男朋友认真在拍～',
      ],
      expression: [
        '这次表情自然多了！比上次好看～',
        '笑得比上次自然了，进步肉眼可见～',
        '这个表情好灵动，男朋友抓到好瞬间了！',
      ],
      level: [
        '这次端得超稳！终于不歪了～',
        '水平线直了，强迫症看了都说舒服～',
        '照片终于不歪了，男朋友进步了！',
      ],
    }
    const pool = tips[dimension] || tips.composition
    await this.speak(pickRandom(pool), false)
  }













  async speakEyeContactTip(): Promise<void> {
    const tips = [
      '看镜头！眼神更有神～',
      '眼神定住！这样拍出来更有感染力～',
      '眼睛看着镜头方向！这个表情超有灵气～',
      '眼神聚焦到镜头！别放空，这样更有神～',
    ]
    await this.speak(pickRandom(tips), false)
  }






  // ========== 新增场景 TTS ==========








  async speakBakeryTip(): Promise<void> {
    const tips = [
      '暖黄色灯光让皮肤超通透！靠窗边或台灯旁站～',
      '面包店里光线偏暗，打开手机屏幕补补光～',
      '捧个面包或咖啡当道具，俏皮又自然～',
      '店内光线暖黄色，拍出来皮肤状态超好～',
      '侧身让灯光打在侧脸上，五官更立体～',
      '烘焙坊里的小道具都可以当拍摄道具～',
    ]
    await this.speak(pickRandom(tips), true)
  }



  async speakSelfieTooClose(): Promise<void> {
    const tips = [
      '手机拿远一点！自拍离太近会变形～',
      '拿远一点！太近拍出来脸会显大哦～',
      '往后退一步，离远点拍更显脸小～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 手抖/不稳定提示（手稳提示） */
  async speakHoldSteady(): Promise<void> {
    const tips = [
      '手稳住！',
      '稳住稳住～',
      '稳住，别动！',
      '双手握稳手机，慢慢按快门～',
      '稳住！等一秒再按，成片率更高～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 手机歪斜提示 */
  async speakPhoneTilted(): Promise<void> {
    const tips = [
      '手机歪了，扶正再拍～',
      '扶正一下手机，歪了～',
      '把手机摆正再拍～',
      '手机歪了！看看屏幕边缘的水平线，扶正再拍～',
      '手机有点歪，扶正后拍出来会更正～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 相机设备不可用提示 */
  async speakCameraUnavailable(): Promise<void> {
    await this.speak('相机设备不可用，请检查摄像头是否正常', true)
  }

  /** 打开姿势模板提示 */
  async speakOpenTemplate(): Promise<void> {
    const tips = [
      '打开姿势模板',
      '戳这里选个姿势模板',
      '点开模板看看怎么摆pose',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** AI 分析失败时的语音提示 */
  async speakAnalysisError(): Promise<void> {
    const tips = [
      '分析出了点小状况～没关系，重新拍一张试试',
      '这次没分析成功，再拍一张吧',
      '分析失败了，不过没关系，多拍几张总有一张能分析成功～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 模板同步失败提示 */
  async speakTemplateSyncFailed(): Promise<void> {
    const tips = [
      '模板加载失败了，没关系，本地模板也能用～',
      '网络不太好，模板没加载完，不过内置的姿势也够用啦～',
      '模板加载失败了，不过本地模板也能拍出好看的照片～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 鼓励重试（低分后） */
  async speakRetryEncourage(): Promise<void> {
    const tips = [
      '没关系！多拍几张就能找到感觉，男朋友加油～',
      '这张不行没关系，深呼吸，再来一张！',
      '摄影师也是练出来的！多拍几张，男朋友肯定越来越好的～',
      '这张不太满意？没关系，好照片都在后面呢～',
    ]
    await this.speak(pickRandom(tips), true)
  }



































  async speakLowLightTip(): Promise<void> {
    const tips = [
      '光线有点暗，找个亮的地方拍照会更清晰～',
      '这里好暗！试试靠窗或者开灯，脸会更亮～',
      '暗光环境容易糊片，让男朋友稳住手再拍～',
      '周围光线太暗，打开闪光灯补补光效果会好很多～',
      '暗光时手要更稳，让男朋友靠墙或用双手拿稳手机～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 逆光场景提示 */
  async speakBacklitTip(): Promise<void> {
    const tips = [
      '逆光拍剪影超有氛围！但脸太黑了，下回试试侧过来一点～',
      '背光环境容易脸黑，可以让人转个角度或打开补光～',
      '这个逆光很有感觉！稍微转一下身，光线更均衡～',
      '逆光时打开闪光灯正面补光，让脸和背景都清晰～',
      '背光太强时走到树荫下，漫反射光让脸不会太暗～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 人多嘈杂场景提示 */
  async speakCrowdedTip(): Promise<void> {
    const tips = [
      '周围人太多了！稍微等一等，等人走过去再拍～',
      '这里人好多！找个人少的角落背景会更干净～',
      '人多的时候试试仰拍，背景干净人还是主角～',
      '背景人太多！试试俯拍角度，把人当主体背景自然虚化～',
      '等一等！等人走过去再拍，干净背景更显高级～',
    ]
    await this.speak(pickRandom(tips), false)
  }


  async speakGroupTip(): Promise<void> {
    const tips = [
      '合照要照顾到每个人！让大家站近一点但别挤～',
      '几个人站一排容易脸叠在一起，试试错落站位～',
      '合照啦！让每个人都能露脸，站成弧形最好看～',
      '合照时让最中间的人稍微靠前，两边往后站，层次更好～',
      '多人合照试试三角构图！让最矮的站中间～',
    ]
    await this.speak(pickRandom(tips), false)
  }



  async speakBokehTip(): Promise<void> {
    const tips = [
      '背景有点实！让人物离背景远一点，虚化会更明显～',
      '试试走近一点拍！近距离主体清晰，背景自然就虚化了～',
      '用人像模式！背景会自动柔化，主体超清晰～',
      '找光源做虚化光斑，背景会更有氛围感～',
      '前景也可以虚化！让前景靠近镜头，层次感绝了～',
      '大光圈镜头虚化最美！没有的话走近主体也能虚化背景～',
      '背景太杂乱！走近一点让背景虚化，主体更突出～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 黄金时段专属提示（户外场景检测到 Golden Hour 时触发） */
  async speakGoldenHourTip(): Promise<void> {
    const tips = [
      '现在是黄金时段！光线超美，赶紧多拍几张～',
      '日落前20分钟光线最温柔！这个时间段拍人像绝了～',
      'Golden Hour 来啦！让光打在侧脸上，超有氛围感～',
      '黄昏的光最会说话！这个时间段拍照超有感觉～',
      '傍晚的光好温柔，让男朋友赶紧拍，光线不会再来啦～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 穿搭建议（特定场景提示服装搭配） */
  async speakDressCodeTip(sceneType: string): Promise<void> {
    const tips: Record<string, string[]> = {
      beach: ['海边穿浅色或亮色衣服超上镜！白色连衣裙或浅蓝最配～', '海边适合飘逸的长裙！风吹起来超有感觉～'],
      snow: ['雪地里穿亮色外套！红色或黄色在雪地里超显眼～', '白色或浅色衣服在雪地里超仙！别穿太深的颜色～'],
      night: ['夜景适合穿浅色或亮色衣服，在暗背景里更突出～', '晚上拍照穿有反光材质或亮片的衣服，霓虹灯下超美～'],
      cafe: ['咖啡馆适合文艺风穿搭！米色、驼色系超有氛围～', '小资风连衣裙或针织衫，咖啡馆里超上镜～'],
      outdoor: ['户外适合休闲风！浅色系衣服和绿植背景超配～', '户外穿自然色系最上镜，白色或浅蓝都很清爽～'],
      garden: ['温室花房穿浅色或碎花！和绿植背景超搭～', '花卉背景配浅色系衣服，仙女感满满～'],
      aquarium: ['水族馆穿浅色或亮色衣服！蓝色鱼光下更显肤色通透～', '水族馆适合白色或浅蓝色衣服，和蓝色光影超配～'],
      concert: ['演唱会穿有反光材质或亮片的衣服，灯光下超闪耀～', '演唱会穿黑色或深色衣服，舞台灯光下更酷！'],
      neon_light: ['霓虹灯光下穿深色或亮色衣服，和灯光形成对比超酷～', '赛博朋克风穿黑色或荧光色，在霓虹灯下超显眼～'],
    }
    const arr = tips[sceneType] || tips.outdoor
    await this.speak(pickRandom(arr), true)
  }

  /** 冬季拍照专属提示（雪景/寒冷环境） */
  async speakWinterTip(): Promise<void> {
    const tips = [
      '雪地里光线反射很强，脸上的阴影不好控制，稍微仰头让雪反射到脸上～',
      '雪天拍完赶紧回室内暖和，别让女朋友冻太久～',
      '雪景背景白茫茫，开闪光灯补光让脸和背景平衡～',
      '雪天户外光线超通透！皮肤看起来超细腻，赶紧多拍几张～',
      '雪地里穿亮色外套！红色或黄色在雪地里超显眼～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 春季拍照专属提示（花季/踏青） */
  async speakSpringTip(): Promise<void> {
    const tips = [
      '春天光线好柔和！樱花树下侧身站，超有春日感～',
      '户外踏青时让女朋友站在花丛前，笑着抓拍～',
      '春季阳光明媚！找好角度，让光打在侧脸上～',
      '春天户外光线超通透！皮肤看起来超好，赶紧多拍～',
      '春游踏青时找个干净的背景，让人和花成为主角～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 秋季拍照专属提示（红叶/落叶） */
  async speakAutumnTip(): Promise<void> {
    const tips = [
      '秋天红叶超美！让女朋友站在红叶前，超有秋日感～',
      '落叶地上光影斑驳，蹲低一点拍超有氛围感～',
      '秋天光线偏暖，暖色系穿搭和秋景超配～',
      '红叶季光线柔和！皮肤看起来超好，多拍几张～',
      '秋天逆光拍红叶，超有电影感！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 夜景城市灯光专属提示（霓虹/都市夜景） */
  async speakUrbanNightTip(): Promise<void> {
    const tips = [
      '夜景光线复杂，找个光源在背后或侧面的位置～',
      '霓虹灯下皮肤会显得更白净，让女友靠近光源～',
      '夜拍时手要稳，憋住呼吸再按快门～',
      '城市灯光斑斓！侧身站着让灯光打在脸上超有氛围～',
      '夜景背景灯光超有感觉，打开闪光灯补光让脸更清晰～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 站姿/坐姿体态提示 */
  async speakPostureTip(): Promise<void> {
    const tips = [
      '站姿时稍微收腹挺胸，仪态会好很多～',
      '站姿时重心放一只脚，腿会显得更直更长～',
      '双肩放松下沉，别端着会更自然～',
      '脖子伸长一点点，天鹅颈上线，气质立刻提升～',
      '站姿时收下巴一点点，下颌线会清晰很多～',
      '侧身站比正对镜头更显瘦，试试 45 度角～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 侧颜拍摄提示 */
  async speakSideProfileTip(): Promise<void> {
    const tips = [
      '侧脸超显气质！让光打在侧脸上，轮廓会更立体～',
      '拍侧脸时让女朋友看向远方，眼神更有故事感～',
      '侧颜逆光剪影超有意境，试试这个角度～',
      '低头看地面时从侧面拍，超有意境的低头侧颜～',
      '侧脸时让头发别在耳后，露出完整侧颜轮廓会更优雅～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 背景简洁度提示 */
  async speakBackgroundTip(): Promise<void> {
    const tips = [
      '背景太杂乱了！找个干净简洁的背景让人物更突出～',
      '找面纯色的墙或者干净的天空当背景，超容易出片～',
      '户外拍照时背景太乱，试试仰拍让天空当背景～',
      '打开人像模式虚化背景，主体立刻突出～',
      '背景延伸线可以让照片更有纵深感～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 拍摄角度提示 */
  async speakAngleTip(): Promise<void> {
    const tips = [
      '稍微蹲低一点从下往上拍，显腿长！',
      '从侧面 45 度角拍比正脸更显瘦，试试这个角度～',
      '仰拍时让女朋友抬头看镜头，下巴会更尖～',
      '俯拍时让女朋友低头收下巴，双下巴立刻消失～',
      '高角度俯拍适合想显脸小的女生～',
      '低角度仰拍适合想显腿长的全身照～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 露营帐篷场景 TTS */
  async speakTentCampTip(): Promise<void> {
    const tips = [
      '帐篷前光线超美！靠近帐篷站着，背景超有户外感～',
      '露营场景选个干净的背景，让人和帐篷成为主体～',
      '帐篷前的篝火灯光打在脸上超有感觉，但别太靠近火源～',
      '露营帐篷前超有氛围感！傍晚的光线拍出来超温柔～',
      '在帐篷前拍个背影也很美，让篝火或星空做背景～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 湖边水景场景 TTS */
  async speakLakeWaterTip(): Promise<void> {
    const tips = [
      '湖边光线超柔和！侧身站着让水面反光打在脸上～',
      '湖边风大拍的时候让女友站稳，头发乱的瞬间抓拍～',
      '湖边拍摄选个无风的时间段，水平如镜效果最好～',
      '水边拍照要注意别让水溅到镜头上～',
      '湖边光线柔和，拍侧脸最有感觉！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 圣诞氛围场景 TTS */
  async speakChristmasTip(): Promise<void> {
    const tips = [
      '圣诞灯串当背景超有氛围感！让女友靠近灯串站着～',
      '圣诞树前侧身站好，灯光打脸上超温暖～',
      '圣诞氛围最重要的是暖调光线，让脸靠近光源～',
      '双手捧脸或抱膝坐好，圣诞感十足！',
      '圣诞树彩灯当背景，侧身站好让灯光打侧脸～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 温泉场景 TTS */
  async speakHotspringTip(): Promise<void> {
    const tips = [
      '温泉水汽缭绕超有氛围！表情放松自然最好看～',
      '泡汤场景要注意光线不要太暗，让脸朝向光源～',
      '温泉场景适合侧身或回眸，慵懒感十足～',
      '温泉边光线偏暖，让蒸汽柔化光线，皮肤看起来超好～',
      '泡汤时别让蒸汽模糊镜头，保持镜头干净～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 超市便利店场景 TTS */
  async speakSupermarketTip(): Promise<void> {
    const tips = [
      '超市道具互动超可爱！拿个零食或水果做道具～',
      '超市货架前光线均匀，但背景比较杂乱，靠近镜头让背景虚化～',
      '超市便利店的冰柜灯光超有氛围感，站在旁边拍～',
      '超市里光线复杂，找个不背光的角落站～',
      '拿商品做道具，俏皮地看向镜头，日常生活感满满～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 礁石海浪场景 TTS */
  async speakRockyBeachTip(): Promise<void> {
    const tips = [
      '礁石浪花感拍出来了，男朋友有天赋！',
      '海边礁石的氛围感绝了，超有感觉！',
      '浪花和人物关系处理得太好了！',
      '男朋友把海边的浪漫都定格了！',
      '礁石上有青苔会滑，站好别动再拍～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 游乐园嘉年华场景 TTS */
  async speakCarnivalTip(): Promise<void> {
    const tips = [
      '游乐园光线复杂，找个不逆光的角度～',
      '旋转木马、摩天轮前拍照，超有童话感！',
      '游乐园的背景很丰富，让人站在前面笑一个～',
      '动感活力感满满！男朋友抓拍到你的快乐瞬间！',
      '游乐园大片感十足，笑容超有感染力！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /**
   * 场景路由：统一入口，根据 scene 类型分发到对应 speak 方法
   * 覆盖主要拍照场景，让外部调用方无需关心具体方法名
   *
   * scene 类型对照：
   *  indoor          → 室内场景（咖啡馆/家居/书店）
   *  outdoor         → 户外日常（公园/街道/校园）
   *  cafe            → 餐厅美食（咖啡馆/火锅/甜品店）
   *  rooftop_night   → 天台夜景（霓虹灯光）
   *  beach           → 海边户外（沙滩/海浪/日落）
   *  beach_sunset    → 海边日落（逆光剪影）
   *  swimming_pool   → 泳池边（水面反光）
   *  snow            → 雪景（强反射/围巾）
   *  hotspring       → 温泉场景（水汽/石墙）
   *  gym             → 健身房（镜子构图）
   *  rainy           → 雨天（窗户/倒影）
   *  subway          → 地铁暗光（站台灯）
   *  street          → 城市街拍（橱窗/霓虹）
   *  vintage_film    → 复古胶片风
   *  carnival        → 游乐园嘉年华
   *  graffiti        → 涂鸦墙
   *  aquarium        → 水族馆蓝色场景
   *  bookstore       → 书店文艺场景
   *  festival_lights → 灯展节日
   *  dance_performance → 演唱会舞台
   *  spring          → 春季/樱花
   *  autumn          → 秋季/红叶
   *  winter          → 冬季
   *  graduation      → 毕业照
   *  couple          → 情侣合照
   *  selfie          → 自拍
   *  backlight       → 逆光场景
   *  low_light       → 低光暗光
   *  harsh_sunlight  → 强日光户外
   *  foggy           → 雾霾天气
   */
  async getSpeechForScene(scene: string): Promise<void> {
    switch (scene) {
      case 'indoor':
        await this.speakIndoorPortraitTip(); break
      case 'outdoor':
        await this.speakOutdoorTip(); break
      case 'cafe':
        await this.speakCafeTip(); break
      case 'rooftop_party':
        await this.speakFestivalLightsTip(); break
      case 'rooftop_daytime':
        await this.speakMorningTip(); break
      case 'rooftop_night':
        await this.speakNightTip(); break
      case 'beach':
        await this.speakBeachTip(); break
      case 'beach_sunset':
        await this.speakBeachSunsetTip(); break
      case 'swimming_pool':
        await this.speakSwimmingPoolTip(); break
      case 'snow':
        await this.speakSnowTip(); break
      case 'hotspring':
        await this.speakHotspringTip(); break
      case 'gym':
        await this.speakGymTip(); break
      case 'rainy':
        await this.speakRainyTip(); break
      case 'subway':
        await this.speakSubwayDarkTip(); break
      case 'street':
        await this.speakUrbanNightTip(); break
      case 'vintage_film':
        await this.speakVintageFilmTip(); break
      case 'carnival':
        await this.speakCarnivalTip(); break
      case 'graffiti':
        await this.speakGraffitiTip(); break
      case 'aquarium':
        await this.speakAquariumTip(); break
      case 'bookstore':
        await this.speakBookstoreTip(); break
      case 'festival_lights':
        await this.speakFestivalLightsTip(); break
      case 'dance_performance':
        await this.speakDancePerformanceTip(); break
      case 'spring':
        await this.speakSpringTip(); break
      case 'autumn':
        await this.speakAutumnTip(); break
      case 'winter':
        await this.speakWinterTip(); break
      case 'graduation':
        await this.speakGraduationTip(); break
      case 'couple':
        await this.speakCouplePhotoTip(); break
      case 'selfie':
        await this.speakSelfieTip(); break
      case 'backlight':
        await this.speakBacklightTip(); break
      case 'low_light':
        await this.speakLowLightTip(); break
      case 'harsh_sunlight':
        await this.speakHarshSunlightTip(); break
      case 'foggy':
        await this.speakFoggyWeatherTip(); break
      case 'neon_light':
        await this.speakNeonLightTip(); break
      case 'bookstore':
        await this.speakBookstoreTip(); break
      case 'morning_run':
        await this.speakMorningTip(); break
      default:
        // 未知场景不播报，静默降级
        break
    }
  }

  /** 户外日常场景 */
  async speakOutdoorTip(): Promise<void> {
    const tips = [
      '户外光线好！找顺光或侧光的位置，脸会更亮～',
      '户外拍照避免正午顶光，找树荫或等云遮光～',
      '户外阳光下背景过曝，侧身躲开天空入镜会好很多～',
      '户外找干净的背景，让女朋友更突出～',
      '户外自然光最温柔，正对光源让脸均匀受光～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 咖啡馆餐厅场景 */
  async speakCafeTip(): Promise<void> {
    const tips = [
      '咖啡馆里找窗边座位，自然光打在脸上超好看～',
      '餐厅灯光偏暖黄，让女朋友靠近台灯或烛光坐～',
      '美食照光线要充足，举起筷子或杯子让光打在手上～',
      '咖啡馆装修复杂，找纯色墙面做背景会更干净～',
      '餐厅室内偏暗，打开闪光灯或屏幕补光效果最好～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 复古胶片风场景 */
  async speakVintageFilmTip(): Promise<void> {
    const tips = [
      '复古胶片风适合侧光，让光影层次更丰富～',
      '胶片感推荐稍微过曝补偿阴影，宽容度更高～',
      '复古胶片选 Kodak Gold 色调，黄橙暖色最有感觉～',
      '胶片风适合暖色调穿搭，颜色对比让画面更鲜活～',
      '胶片颗粒感用滤镜模拟即可，不用真的用胶片机～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 毕业照场景 */
  async speakGraduationTip(): Promise<void> {
    const tips = [
      '毕业照选黄昏前光线最柔和，不要正午顶光拍～',
      '抛帽瞬间超有活力！连拍几张总有一张完美～',
      '毕业袍解开最上面一颗扣子更休闲更自然～',
      '和同学朋友靠近贴贴合照，画面更温馨～',
      '学士帽流苏拨到一边更活泼，试试看～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 雨季/雨天场景 TTS */
  async speakRainySceneTip(): Promise<void> {
    const tips = [
      '雨天的光线超柔和，皮肤看起来超细腻～',
      '雨伞遮住半边脸，超有神秘感！',
      '雨天室内窗边光线最均匀，拍一张试试～',
      '雨后的倒影超有感觉，找水坑拍一张～',
      '雨丝飘在脸上时按下快门，绝美～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 晨间光线 TTS */
  async speakMorningLightTip(): Promise<void> {
    const tips = [
      '清晨阳光最温柔，皮肤看起来零瑕疵！',
      '早安！趁着早上光线好赶紧拍几张～',
      '早晨的光打在人脸上超通透，男朋友快拍！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 海岛度假场景 TTS */
  async speakIslandTip(): Promise<void> {
    const tips = [
      '海岛阳光太强，正午顶光脸会太暗，找树荫下拍～',
      '海边早上或傍晚光线最柔和，男朋友挑好时间！',
      '海岛沙滩反光强，侧身站躲开阳光直射～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 镜子自拍场景 TTS */
  async speakMirrorTip(): Promise<void> {
    const tips = [
      '浴室镜子光线超均匀，这角度绝了！',
      '镜子侧身45度比正面更显瘦，试试看～',
      '商场试衣间的镜子光线最好，顺手拍一张～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 摄影进阶技巧 TTS */
  async speakPhotographyTip(): Promise<void> {
    const tips = [
      '打开九宫格网格，把人脸放在交叉点上，构图立刻变专业！',
      '光线打在脸上时稍微侧身，立体感马上出来～',
      '背景太乱就靠近一点，让人占画面更大，背景自然虚化～',
      '拍逆光剪影超有感觉，让女朋友背对光源站～',
      '三分法构图最稳，把主体放在画面三分之一处～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 情侣互动姿势 TTS */
  async speakCouplePoseTip(): Promise<void> {
    const tips = [
      '两人靠近贴贴，额头碰额头，超甜！',
      '背对镜头牵手，男友从背后揽住你的腰～',
      '两人对视笑一个，连拍抓拍最自然的瞬间～',
      '假装亲一下侧脸，这个角度绝了～',
      '两人手牵手站好，一起看镜头，甜蜜满分！',
    ]
    await this.speak(pickRandom(tips), true)
  }
}

export { FACE_TIPS, STABILITY_TIPS, EXPRESSION_TIPS }

export default new VoiceCoach()
