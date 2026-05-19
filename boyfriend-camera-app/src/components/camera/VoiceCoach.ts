/**
 * VoiceCoach - 语音教练
 * 基于人脸位置和陀螺仪数据的语音提示
 * 使用 react-native-tts 朗读
 */
import Tts from 'react-native-tts'
import { type EmotionDetection } from '../../services/analyzer'
import { logger } from '../../utils/logger'

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
  GOOD_LIGHTING: '光线刚刚好！就是现在，拍！',
  TOO_DARK: '脸有点暗了，往光源方向靠近一点点～',
  TOO_BRIGHT: '光线有点亮了，稍微侧身躲开强光～',
  KEEP_STILL: '别动！就是现在，按快门！',
  // 新增边缘场景
  FACE_MOVING: '别动！脸不要晃来晃去的～',
  // ========== Round 2 新增 TTS 场景 ==========
  FACE_MOVING_TOO_MUCH: '别晃来晃去的！站定之后再拍～',
  CAMERA_MOVING: '手机在晃！先把手机拿稳再拍～',
  ALMOST_PERFECT: '就差一点点！稳住，按下去就是大片！',
  TRY_SIDE_FACE: '试试侧脸！轮廓感会更强～',
  TRY_BACK_VIEW: '背对镜头也超有感觉！转过去试试～',
  TRY_HALF_BODY: '试试拍半身照！比特写更有故事感～',
  TRY_FULL_BODY: '试试全身照！背景和人都要完整～',
  TRY_CLOSE_UP: '走近一点！怼脸拍更有冲击力～',
  TRY_WIDER: '退后一点！让背景更完整～',
  CHECK_LIGHTING: '先看一下光线方向！脸要朝向光源～',
  FIND_WINDOW: '找个窗户边站！自然光最柔和～',
  BACK_FROM_WINDOW: '离窗户近一点！脸会更亮～',
  TURN_TOWARD_LIGHT: '转过身面对光源！脸太暗了～',
  AVOID_HARSH_LIGHT: '躲开强光！找个柔和的地方～',
  GOLDEN_HOUR_NOW: '现在是黄金时段！赶紧拍，光线超美～',
  OVERCAST_PERFECT_TIME: '阴天光线好柔！随便拍都好看～',
  SHOOT_DURING_GOLDEN: '趁现在光线好！赶紧拍一张～',
  SUNSET_WINDOW: '夕阳光线超温柔！现在拍正合适～',
  SUNSET_WINDOW_2: '傍晚光线好美！这时间段拍照绝了～',
  FACE_PARTIAL: '脸稍微侧了一点，正对镜头会更好看～',
  LOW_ANGLE_FACE: '抬头看镜头！低角度显下巴～',
  HIGH_ANGLE_FACE: '稍微低头一点点，眼睛更有神～',
  // 模板切换确认
  TEMPLATE_CHANGED: '已切换到新姿势！跟着指导摆好～',
  // 边缘场景补充
  FACE_EDGE_LEFT: '脸靠左边缘了，往右挪一点点～',
  FACE_EDGE_RIGHT: '脸靠右边缘了，往左挪一点点～',
  FACE_EDGE_TOP: '脸太靠上了，往下站一点～',
  FACE_EDGE_BOTTOM: '脸太靠近底部了，头稍微抬高一点～',
  // 拍摄成功
  SHOOT_GOOD: '姿势很棒！就是现在，按快门！',
  // 拍摄失败
  CAPTURE_FAILED: '拍照失败了，再试一次吧～',
  // 相册保存
  SAVED_TO_ALBUM: '已保存到相册！可以去相册里找找看～',
  // 拍照成功
  CLICK_SNAP: '咔嚓！拍好了～来看看效果吧！',
  // 前置摄像头提示
  SELFIE_MODE: '自拍模式！找好角度，笑一个～',
  SELFIE_TOO_CLOSE: '手机拿远一点！自拍离太近会变形～',
  // 后置摄像头提示
  BACK_CAMERA: '后置镜头画质更好！让男朋友拿手机拍～',
  // 长时间无脸检测
  NO_FACE_LONG: '等了好久都没看到人脸～轻轻挥挥手让我找到你～',
  NO_FACE_10S: '十秒了还没看到你！挥挥手或者走近一点～',
  // 多人合照提示
  MULTI_FACE_TWO: '两个人的合照！靠近一点贴贴～',
  MULTI_FACE_THREE: '三个人的合照！大家站整齐一点～',
  MULTI_FACE_SQUEEZE: '人多挤不下！往后站一点大家都能入镜～',
  // 鼓励换姿势
  TRY_NEW_POSE: '换个姿势试试！这个角度有点单调～',
  TRY_DIFFERENT_ANGLE: '试试换个角度拍！侧面也很美～',
  // 黄金时段提示
  GOLDEN_HOUR: '这光线好温柔！现在是拍照的黄金时间～',
  // 尝试开闪光灯
  TRY_FLASH: '光线有点暗～打开闪光灯试试～',
  // ========== Round 20 新增人脸提示 ==========
  FACE_PARTIAL_SIDE: '脸稍微侧了一点，正对镜头会更好看～',
  CLOSE_ONE_EYE: '试试闭一只眼！俏皮又可爱，活泼感拉满～',
  HAIR_OVER_FACE: '头发挡住脸了～轻轻拨开，光会更通透～',
  HAND_NEAR_FACE: '手靠近脸可以显脸小！试试托腮或撩头发～',
  BLUSH_HINT: '侧过脸让光打在颧骨上，皮肤会看起来更通透～',
  // ========== Round 20 新增拍摄提示 ==========
  SHOOT_NOW_LIGHT: '光线刚刚好！就是现在，按快门！',
  SHOOT_NOW_POSE: '姿势超棒！表情到位！按下去就是大片！',
  SHOOT_NOW_PERFECT: '完美时刻！这光线这角度，按下去！',
  // ========== Round 20 新增鼓励提示 ==========
  KEEP_GOING: '继续拍！多拍几张选最好的～',
  ONE_MORE_TRY: '再来一张！这张有进步空间，继续加油～',
  GREAT_PROGRESS: '肉眼可见的进步！男朋友继续保持！',

  // 模板匹配度提示
  TEMPLATE_MATCH_GOOD: '姿势和模板超配！就是现在拍！',
  TEMPLATE_MATCH_OFF: '姿势有点跑偏～跟着模板摆正一点～',
  // 夜景拍照提示
  NIGHT_MODE_HINT: '晚上拍照记得打开闪光灯或找光源～',
  // 试拍建议
  TRY_ONE_MORE: '多拍几张选最好的！第一张不一定最好～',
  TRY_FIVE: '建议连拍几张！按快门别客气～',
  // ========== 本次新增 TTS 场景 ==========
  // HDR 模式提示
  HDR_HINT: '这个场景明暗对比大！打开 HDR 模式，高光阴影都能保留～',
  HDR_HINT_2: 'HDR 模式可以让亮部和暗部都清晰，打开试试～',
  // 人像模式提示
  PORTRAIT_MODE: '开人像模式！背景自动虚化，主体超突出～',
  PORTRAIT_MODE_2: '人像模式最适合拍近景！打开它，背景会变柔和～',
  // 全景模式提示
  PANORAMA_HINT: '试试全景模式！左右扫一下，大场景都能收进来～',
  // 专业模式提示
  PRO_MODE_HINT: '专业模式下 ISO 调低一点，画面会更干净～',
  PRO_MODE_HINT_2: '专业模式拍夜景！快门调慢，手要拿稳哦～',
  // 连拍提示
  BURST_MODE: '按住快门连拍！动起来抓拍的瞬间最自然～',
  BURST_MODE_2: '连拍模式开起来！多拍几张总有一张完美的～',
  // 定时拍照提示
  TIMER_HINT: '用定时拍照！放在稳定的地方，自己也能入镜～',
  TIMER_COUNTDOWN: '三二一！就是现在～',
  // 抓拍提示
  CANDID_CAPTURE: '假装在看她/他！就是现在抓拍～',
  CANDID_CAPTURE_2: '让她先动起来，然后抓拍！这个瞬间最自然～',
  // 逆光 HDR 提示
  BACKLIGHT_HDR: '逆光场景！打开 HDR 让脸和背景都清晰～',
  // 阴天提示
  OVERCAST_HINT: '阴天光线好柔和！不用担心过曝，随便拍都好看～',
  // 室内反射提示
  INDOOR_REFLECTION: '室内玻璃会反光！稍微侧身躲开反光～',
  // 傍晚提示
  EVENING_GLOW: '傍晚光线好温柔！这时间段拍人像绝了～',
  // 微距模式提示
  CLOSE_UP_HINT: '近拍模式！让花或小物件离镜头近一点，背景虚化超美～',
  // 防红眼提示
  RED_EYE_HINT: '开闪光灯时记得避开正面直打，可以让女朋友稍微侧一点～',
  // 镜子自拍提示
  MIRROR_SELFIE: '对着镜子自拍！手机稍微斜一点拍，角度更好看～',
  // 夕阳提示
  SUNSET_GLOW_HINT: '夕阳余晖好浪漫！侧身站着让光打在侧脸上～',
  // 超市道具提示
  SUPERMARKET_PROP: '拿个零食饮料当道具！俏皮可爱，互动感十足～',
  // 运动抓拍提示
  MOTION_CAPTURE: '动起来抓拍！跑跳的瞬间最有活力～',
  // 俯拍全身提示
  TOP_DOWN_FULL: '俯拍全身！男朋友站高一点，你躺下仰头看镜头～',
  // 仰拍大长腿提示
  LOW_ANGLE_LEGS: '仰拍大长腿！男朋友蹲低，你踮起脚尖～',

  // 表情夸张提示
  BIGGER_SMILE: '笑容再大一点！这样更上镜～',
  RELAX_FACE: '表情放松一点～别僵着，自然最美～',
  // 拍摄前最后确认
  ALMOST_THERE: '就差一点点了！位置很好，光线也棒，按！',
  // 情侣合照专属提示
  COUPLE_SQUEEZE: '两个人再靠近一点！贴贴更甜蜜～',
  COUPLE_LOOK_EACH_OTHER: '对视一下！这样拍出来超有感觉～',
  COUPLE_HUG_FROM_BEHIND: '男生从后面抱！经典的甜蜜姿势～',
  COUPLE_HOLD_HANDS_BACK: '牵手背对镜头，超有氛围感！',
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
  LAST_CHANCE: '这张一定会很好看！鼓起勇气按下去！',
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
}

// 表情检测提示
const EXPRESSION_TIPS = {
  // ========== Round 5 新增表情提示 ==========
  LOOK_SIDE_SMILE: '假装看旁边再转头笑，自然又灵动～',
  HAND_ON_CHIN: '一只手托着下巴，显脸小的经典pose～',
  HAND_IN_HAIR: '手指轻轻拨弄头发，撩人又自然～',
  BLOW_KISS: '嘟嘴送个飞吻，这个角度绝了！',
  HEART_HANDS: '双手比个爱心，下巴微微抬起，超甜！',
  FINGER_HEART: '手指比个小心心，眼睛看镜头笑～',
  VICTORY_POSE: '比个耶！活力满满的笑容，就是现在！',
  COVER_MOUTH_LAUGH: '捂嘴笑也好可爱，这个表情太加分了！',
  PROFILE_LOOK: '侧脸看远方，氛围感拉满！',
  HEAD_ON_SHOULDER: '歪头靠在肩上，温柔感溢出屏幕～',
  HUG_SELF: '双手抱住自己，自然又可爱～',
  POINT_DIRECTION: '手指指向远方，活泼又有趣！',
  BARE_SHOULDER: '露出肩膀线条，优雅又显瘦！',
  LEG_CROSS: '站立时双腿交叉，更显身材比例～',
  ARM_ON_HEAD: '手臂举过头顶，延长身体线条～',
  SIT_LEAN_WALL: '靠着墙坐着，慵懒又自然～',
  SIT_FLOOR: '坐在地上，盘腿或伸腿都好看～',
  BACK_AGAINST_WALL: '背靠墙站，肩颈放松，超有气场！',
  LEAN_FORWARD_PHONE: '身体前倾假装看手机，这个角度超自然！',
  // 原有表情提示
  BLURRY: '照片有点糊了，让他手拿稳一点～',
  CLOSED_EYES: '好像有人闭眼了，提醒他睁大眼睛！',
  NO_SMILE: '笑一个！自然一点更好看～',
  SMILING_GOOD: '这个笑容绝了！就是现在，按快门！',
  EYES_OPEN_GOOD: '眼神超有光，这表情太加分了！',
  YAW_LEFT: '脸稍微转过来一点，别侧太多',
  YAW_RIGHT: '脸稍微往这边转一点，别只露侧脸',
  ROLL_TILTED: '头稍微正一点，歪着显脸大哦～',
  NERVOUS_FACE: '放松～别僵着，自然一点更好看～',
  TILTED_HEAD_GOOD: '歪头好可爱！就是现在按快门～',
  BOTH_EYES_CLOSED: '两只眼睛都闭了，提醒她睁开～',
  TONGUE_OUT: '哈哈表情太搞怪了！这个也可以抓拍～',
  SURPRISED_FACE: '这惊讶表情好生动！就是现在！',
  SERIOUS_FACE: '表情太严肃了，笑一个试试～',
  PERFECT_FACE: '表情完美！光线也棒，按快门的最佳时机！',
  TALKING_FACE: '在说话的时候抓拍，自然又生动～',
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
  COMBO_LOOKAWAY_SMILE: '假装看旁边，再转头对我笑～',
  COMBO_HAND_HEART: '双手比个爱心，下巴微微抬起～',
  COMBO_LEAN_FORWARD: '身体微微前倾，脸靠近镜头～',
  COMBO_ARM_CROSS: '双手抱臂，下巴收紧，精神点！',
  COMBO_CASUAL_HANDS_POCKET: '双手插兜，头微微歪，酷酷的～',
  POSE_CHIN_REST: '下巴轻轻放在手背上，温柔又显脸小～',
  POSE_LOOK_PHONE: '低头假装看手机，这个角度超自然！',
  POSE_HAND_NECK: '一只手轻轻搭在脖子上，知性感拉满～',
  POSE_POINT_CHIN: '手指轻轻点在下巴上，这个角度绝了！',
  POSE_LEAN_WALL: '靠墙站好，肩颈放松，酷酷地看镜头～',
  POSE_HAND_FACE: '一只手轻轻放在脸旁边，显脸小效果满分～',
  POSE_FIGURE_8: '双手比个8放在下巴旁边，超显脸小！',
  POSE_ARM_WAVE: '一只手臂举起来，活力感拉满！',
  // ========== Round 7 新增表情/动作提示 ==========
  POSE_LIE_DOWN: '躺在草地上或床上，仰头看镜头，超有氛围～',
  POSE_HAND_CHEEK: '双手托腮，甜美感拉满！',
  POSE_KISS_FINGER: '手指轻轻亲一下，再指向镜头，俏皮死了！',
  POSE_WAVE_BEYOND: '对着镜头轻轻挥手，活力满满～',
  POSE_COUNTDOWN: '倒数321！就是现在！',
  POSE_BREATH_IN: '深呼吸～肩膀放松，表情更自然～',
  POSE_SHAKE_HAIR: '轻轻甩一下头发，动态抓拍更自然！',
  POSE_FLOOR_CROSS_LEGS: '盘腿坐着，歪头看镜头，慵懒又自然～',
  POSE_KNEEL: '单膝跪地，仰头看镜头，超有气场！',
  POSE_HOLD_BALLOON: '拿着气球拍照，超有童话感～',
  POSE_PET_CUDDLE: '和宠物互动抓拍，表情最自然可爱！',
  POSE_HOLD_FLOWER: '捧着花束，侧头微笑，温柔感拉满～',
  POSE_BOOK_READ: '假装看书或杂志，文艺感十足！',
  POSE_MIRROR_SELFIE: '对着镜子自拍，抓拍最有感觉～',
  POSE_ICE_CREAM: '拿着冰淇淋或咖啡，俏皮自然！',
  POSE_SCARF_FLOW: '围巾或披肩随风飘动，动感抓拍超美！',
  POSE_BATHROBE: '穿浴袍靠在窗边，慵懒又高级～',
  POSE_UMBRELLA: '撑把透明伞，雨天氛围感绝了！',
  POSE_BIKE: '骑着自行车或靠在一旁，活力满满！',
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
  // 演唱会场景
  CONCERT_LIGHTS: '演唱会灯光超有氛围！让灯光打在侧脸上，超酷～',
  // 樱花雨场景
  CHERRY_BLOSSOM_RAIN: '樱花飘落的时候按下快门，绝美！',
  // 灯笼夜景
  LANTERN_NIGHT: '灯笼光暖暖的超有感觉！侧身站着，让光打在侧脸上～',
  // 地铁站台
  SUBWAY_PLATFORM: '地铁站台光线冷调超有都市感！随意站着，抓拍～',
  // 便利店门口
  CONVENIENCE_DOOR: '便利店门口光线均匀！拿个零食道具，俏皮地看镜头～',
  // 海边灯塔
  LIGHTHOUSE_SCENE: '灯塔背景超有画面感！侧身站着，让海风吹起头发～',
  // 竹林小径
  BAMBOO_PATH: '竹林小径光线斑驳！走着抓拍，自然又灵动～',
  // 夜市美食街
  NIGHT_MARKET_FOOD: '夜市灯光超有氛围！找个人少的角落，让美食和人一起上镜～',
  // 农场田园
  FARM_SCENE: '田园风光好清新！站在田埂上，笑一个～',
  // 泳池派对
  POOL_PARTY: '泳池派对超嗨！靠在泳池边，笑得灿烂点～',
  // 滑板公园
  SKATE_PARK: '滑板公园超酷！靠着栏杆，酷酷地看镜头～',
  // 动物园长颈鹿区
  ZOO_GIRAFFE: '长颈鹿背景超可爱！靠近围栏，侧身站着～',
  // 水族馆
  AQUARIUM: '水族馆的光线超梦幻！站在大鱼缸前，笑一个～',
  // 教堂婚礼
  CHAPEL_WEDDING: '教堂背景超庄严！端正站着，笑得温柔点～',
  // 集市摊位
  MARKET_STALL: '集市摊位好热闹！靠着摊位，随意自然地笑～',
  // 屋顶花园
  ROOFTOP_GARDEN: '屋顶花园超有情调！站在花草中间，笑一个～',
  // 咖啡拉花
  CAFE_LATTE: '咖啡拉花超好看！捧着咖啡，侧头看镜头～',
  // 烘焙甜点
  BAKERY_SWEET: '甜点柜台好诱人！端着蛋糕，笑一个～',
  // ========== 新模板场景提示（081-090）==========
  // 健身房动感单车
  GYM_CARDIO: '动感单车超有活力！身体微微前倾，笑着看向镜头，活力满满！',
  // 厨房烹饪
  KITCHEN_STOVE: '灶台前光线暖暖的！一手拿锅铲，端着菜，笑得灿烂点～',
  // 温泉泡汤
  HOT_SPRING_SPA: '温泉蒸汽好治愈！靠在池边，让蒸汽打在脸上，自然微笑看向镜头～',
  // 公交站等车
  BUS_STOP_URBAN: '公交站日常感满满！靠着站牌，看镜头或看远方，文艺又自然～',
  // 操场单杠
  PLAYGROUND_SPORTS: '操场运动风超阳光！站在单杠旁，身体舒展，笑一个～',
  // 音乐节
  MUSIC_FESTIVAL: '音乐节舞台超嗨！双手举起跟着节拍摇摆，表情夸张灿烂！',
  // 艺术展画廊
  ART_GALLERY: '画廊看展超文艺！站在艺术品旁，侧头微笑，文艺感拉满～',
  // 便利店自助结账
  CONVENIENCE_SELF_CHECKOUT: '自助结账机前好日常！手里拿着商品，俏皮地看镜头笑～',
  // 公园草坪野餐
  PARK_PICNIC_LAWN: '野餐垫上光线好温柔！坐在草地上，一手撑地，侧头微笑看向镜头～',
  // 地铁站台
  SUBWAY_PLATFORM_NIGHT: '地铁站台都市感十足！靠着柱子，看向远处，文艺日常～',
  // 便利店货架前
  CONVENIENCE_ISLE: '货架前光线均匀！拿个零食饮料，俏皮地看镜头～',
  // 地铁站扶手电梯
  SUBWAY_ESCALATOR: '扶手电梯上光线冷调！靠着扶手，随意自然地看镜头～',
  // 便利店冰柜前
  CONVENIENCE_FRIDGE: '冰柜前光线冷白！拿瓶饮料，俏皮地笑一个～',
  // 健身房器械区
  GYM_MACHINE: '器械区背景好有运动感！侧身站着，举起哑铃或笑着看镜头～',
  // 厨房水槽前
  KITCHEN_SINK: '水槽前光线均匀！端着一杯水或拿着食材，笑着看镜头～',
}

// 夜景专属语音提示
const NIGHT_TIPS = {
  CITY_LIGHTS: '夜景灯光好美！打开闪光灯照亮人脸～',
  CITY_LIGHTS_2: '城市灯光璀璨！让女朋友站在灯光前，脸不会黑～',
  CITY_LIGHTS_3: '夜拍最重要的是补光！打开闪光灯或找光源～',
  GLOW_STICK: '荧光棒挥动起来！夜晚的光轨超有氛围感～',
  GLOW_STICK_2: '夜色里的小光源超有氛围，举起来拍一张～',
  FIREFLY: '萤火虫的光点点超浪漫！蹲下来和它们合影～',
  FIREFLY_2: '夏夜萤火虫好梦幻！快门慢一点，光点更密～',
  ROOFTOP_NIGHT: '天台夜景好浪漫！打开闪光灯把人脸照亮～',
  ROOFTOP_NIGHT_2: '夜幕下的城市好美！侧身站着，让灯光打在侧脸上～',
  BALCONY_NIGHT_2: '夜阳台好浪漫！打开闪光灯补补光，表情更清晰～',
  NEON_SIGN: '霓虹招牌光超有感觉！靠近光站着，超酷的～',
  NEON_SIGN_2: '霓虹灯下拍一张！让灯光打在脸上，超有都市感～',
  STARLIGHT: '星光下好浪漫！仰头看向天空，眼睛里有光～',
  STARLIGHT_2: '夜晚星空超美！抬头仰望，星星落在眼睛里～',
  LAMP_POST: '路灯下光线好暖！站在灯下，脸超柔和～',
  LAMP_POST_2: '街灯暖暖的光超适合拍照，侧身站着超有感觉～',
  NIGHT_WINDOW: '窗边夜色好美！让脸靠近窗户，光从背后透进来～',
  NIGHT_WINDOW_2: '窗外的灯光映在脸上，夜晚氛围感绝了～',
  CANDLE_AMB: '烛光晚餐超有氛围！让烛光打在脸上，温柔又浪漫～',
  CAR_HEADLIGHTS: '车灯打在脸上超有氛围！侧身站着，表情到位～',
  NEON_REFLECT: '霓虹灯反射在脸上超有感觉！',
  CITY_GLOW: '城市微光超有氛围感！侧身站着，让光勾出轮廓～',
}

// 光线检测语音提示
const LIGHT_TIPS = {
  FACE_TOO_DARK: '脸有点暗了！转过来面向光源试试～',
  FACE_TOO_DARK_2: '光都在背后了！让人脸朝向光源，脸会更亮～',
  FACE_TOO_DARK_3: '背光脸黑了！往前站一点或者让光源在前面～',
  FACE_TOO_BRIGHT: '光太强了！眯眼睛了！稍微侧一下身～',
  FACE_TOO_BRIGHT_2: '光线太刺眼了！找个阴凉处或者侧身站～',
  FACE_TOO_BRIGHT_3: '脸上有强烈光斑！稍微转一下角度试试～',
  PERFECT_LIGHT: '光线刚刚好！就是现在，按快门！',
  PERFECT_LIGHT_2: '这光线绝了！脸上的光好柔和，快拍！',
  PERFECT_LIGHT_3: '自然光好舒服！皮肤看起来超通透，拍起来！',
  SOFT_LIGHT: '柔光好舒服！拍出来皮肤超好的～',
  SOFT_LIGHT_2: '阴天光线超柔和，不用担心过曝，随便拍！',
  HARD_SHADOW: '阴影太重了！找个柔和的地方会更好看～',
  HARD_SHADOW_2: '脸上有硬阴影，侧一点站或者换个地方～',
  SPOTLIGHT_HOT: '顶上有个大白灯！往下站一点，阴影会少很多～',
  SPOTLIGHT_HOT_2: '头顶聚光灯太亮了！换个位置或者抬头找别的光～',
  REFLECTOR_HACK: '找个白墙或白纸放在脸下方，可以补眼神光～',
  REFLECTOR_HACK_2: '用白色东西在脸下补光，眼神会亮很多～',
  GLOW_REFLECT: '找个发光的屏幕放在脸下方，补光又自然～',
  CANDLE_LIGHT: '烛光氛围感绝了！脸靠近一点，光更柔和～',
  SUNSET_SIDE: '夕阳侧光超有层次！让光打在侧脸上～',
  // ========== Round 7 新增光线提示 ==========
  WINDOW_SOFT: '窗边自然光超柔和！让人脸朝向窗户～',
  DOORWAY_LIGHT: '门洞光超有戏剧感！站在光影交界处～',
  OVERCAST_PERFECT: '阴天光线像柔光箱，拍出来皮肤超好～',
  MORNING_GOLD: '晨光暖暖的！侧身站着让光线打在侧脸上～',
  SCREEN_FILL: '用手机屏幕补光！白色背景亮度刚好～',
  WHITE_WALL_BOUNCE: '白墙会反光！站在墙边让光线更均匀～',
  MIRROR_REFLECT: '镜子能反射光线！靠近镜子让光打均匀～',
  SHADE_PERFECT: '阴凉处光线超柔和！脸上的光刚刚好～',
  LAMP_WARM: '台灯光暖暖的！靠近台灯脸会超柔和～',
  FLUORESCENT_SOFT: '日光灯有点平！靠近窗户找自然光～',
}

// 构图专项语音提示
const COMPOSITION_TIPS = {
  RULE_OF_THIRDS: '试试把人脸放在九宫格的交叉点上～',
  RULE_OF_THIRDS_2: '把眼睛放在画面上三分之一处，会更好看～',
  RULE_OF_THIRDS_3: '人脸稍微靠左或靠右一点，打开九宫格试试～',
  CENTER_COMPOSITION: '正中间构图也很美！人站中间超稳～',
  CENTER_COMPOSITION_2: '中间构图超有气场！就是现在拍！',
  LEADING_ROOM: '眼睛看的一方留多一点空间，看起来更舒服～',
  LEADING_ROOM_2: '视线前方留白，构图更有呼吸感～',
  FRAME_IN_FRAME: '找个窗户或门框当背景，画面更有层次～',
  FRAME_IN_FRAME_2: '框架构图超有感觉！用前景把主体框起来～',
  SYMMETRY: '左右对称超有感觉！站正了拍一张～',
  SYMMETRY_2: '对称构图超稳！找个中线对齐一下～',
  DIAGONAL_LEAD: '对角线构图超有动感！歪一点站试试～',
  DIAGONAL_LEAD_2: '对角线构图好有活力！顺着线拍过去～',
  FILL_FRAME: '再靠近一点！特写更有冲击力～',
  FILL_FRAME_2: '怼脸拍更有感觉！把脸占满画面～',
  NEGATIVE_SPACE: '背景很干净，多留点空间反而更高级～',
  NEGATIVE_SPACE_2: '背景留白超有氛围感！不要把人拍满了～',
  BACKGROUND_DEPTH: '找个远一点的背景，虚化效果会更好～',
  BACKGROUND_DEPTH_2: '背景离远一点，背景虚化更明显～',
  LEADING_LINES: '找条路或栏杆做引导线，构图更有张力～',
  LEADING_LINES_2: '顺着线条拍过去，画面有纵深感～',
  BOKEH_LAYER: '背景有光斑超有层次！开大光圈虚化更美～',
  GOLDEN_RATIO: '试试黄金螺旋构图，画面更有张力～',
  TRIANGLE_POSE: '身体形成三角形构图，超稳又有动感～',
  SPiral_POSE: '试试螺旋构图，姿势有延伸感～',
  SENTINEL_POSE: '侧身站着，肩膀和脚成三角形，超有气场～',
  CENTER_DOT: '把人放在画面正中心，更有冲击力～',
  // ========== Round 7 新增构图提示 ==========
  FILL_VERTICAL: '竖图拍全身超显腿长！试试竖着拍～',
  HORIZONTAL_CINEMA: '横图拍近景有电影感！换个方向试试～',
  LOW_HORIZON: '低角度仰拍超显气质！抬头看镜头试试～',
  HIGH_ANGLE: '俯拍显脸小！从上往下拍试试～',
  FRAME_EDGES: '画面边缘留点空间，不要让人贴着边框～',
  HEADROOM: '头顶留白太多！稍微往下挪一挪～',
  GROUND_LINE: '地平线稍微偏一点，构图更有张力～',
  BODY_CURVES: '身体稍微侧一下，S形曲线超有气质～',
  HANDS_NATURAL: '手不知道怎么放？拿个道具自然一点～',
  HAIR_TUCK: '头发稍微理一下，光线会把它照得更通透～',
  JAWLINE_TILT: '稍微抬一点下巴，下颌线会更清晰～',
  SHOULDER_ANGLE: '肩膀稍微侧一下，体型更显瘦～',
  ARM_GAP: '手臂稍微离身体远一点，显得更瘦～',
  LEGS_STAGGER: '站姿稍微错开，一只脚稍微往前伸～',
  PROFILE_SHOT: '试试侧脸！轮廓感超强的～',
  COLLAR_EXPOSE: '稍微拉一下衣领，脖子线条更修长～',
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
  // ========== Round 16 新增欢迎语 ==========
  '今天想拍什么风格？男朋友准备好了就开始～',
  '男友相机已上线！摆好姿势，今天多拍几张～',
  '约会怎么能少了合影！男朋友准备开拍吧～',
  '来啦！男朋友准备好拍照咯，今天多留下几张美好回忆～',
  '男朋友准备好了吗？开始拍美美的照片吧～',
  '男友相机为你服务！今天想拍几张好看的？',
  '约起来拍照吧～男朋友拿出最佳状态，开始咯！',
  '新的一天，新的照片！男朋友准备好开始拍了吗～',
  '男友摄影师上线咯～今天想留下什么回忆？开始拍！',
]

// 模板选中确认语（用于选中新模板时的语音确认）
const TEMPLATE_SELECT_TIPS = [
  '已选择这个姿势！跟着指导站好～',
  '姿势已更新！按照模板调整站位～',
  '新姿势选好了！跟着模板试试看～',
  '已切换姿势！调整好站位，准备好就拍～',
  // ========== Round 16 新增模板选择语 ==========
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
]

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
  '这个侧颜绝了！',
  '下颌线好清晰！',
  '颈肩线条好漂亮！',
  '这气质绝了！',
  'pose摆得超自然！',
  '男友终于开窍了！',
  '照片好有故事感！',
  '色调好治愈～',
  '这张太可了！',
  // ========== Round 5 新增鼓励语 ==========
  '光线好温柔，这张绝了！',
  '构图干净利落，主体超突出！',
  '这个表情好灵动，捕捉到了！',
  '男友审美持续在线！',
  '背景虚化超有层次感！',
  '这光线把人拍得好通透～',
  '姿势和背景好搭，男朋友你行啊！',
  '氛围感拿捏得刚刚好！',
  '男朋友今天状态超好，这张绝了！',
  '色彩和光线配合得超棒！',
  '构图比例好舒服，主体超突出！',
  '男友越拍越顺手了！',
  '这张好有艺术感！',
  'pose好自然，不做作！',
  '男朋友这波赢麻了！',
  '光线在脸上好柔和，这张绝了！',
  '这角度好特别，抓住了！',
  '构图有创意，这张好有趣！',
  '表情和光线都到位了！',
  '男朋友审美在线，这张好高级！',
  '前景背景层次分明，画面好丰富！',
  '男友进步速度惊人，这张要收藏！',
  // ========== Round 17 新增鼓励语 ==========
  '背景虚化超有层次！主体和背景分离得刚刚好～',
  '这张色调好治愈，有被暖到！',
  '光影搭配得刚刚好，这张绝了！',
  '男朋友构图越来越讲究了，有被惊艳到！',
  '姿势和光线都是满分，这张太可了！',
  '色彩和背景好搭，男朋友审美大爆发！',
  '男朋友把女朋友拍出了高级感！',
  '表情和光线都好自然，这张有被治愈到！',
  '男朋友你行啊！这构图有被惊艳到！',
  '光线刚刚好，皮肤通透感绝了！',
  '姿势好自然不做作，男朋友开窍了！',
  '这张可以上男友相机名人堂了！',
  '男朋友的手越来越稳了，这张清晰度满分！',
  '背景和衣服颜色好搭！男朋友有在认真选景～',
  '构图有想法，这张照片有故事感！',
  '男朋友越拍越有感觉了，继续保持！',
  // ========== Round 2 新增鼓励语 ==========
  '光影层次好丰富，这张绝了！',
  '表情捕捉得好生动，很有灵气！',
  '男朋友审美持续在线，这张要收藏！',
  '背景虚化超有层次，主体超突出！',
  '色调好治愈，这张照片暖到我了！',
  '姿势好优雅，男朋友这波赢麻了！',
  '光线把人拍得好通透，这张绝了！',
  '男朋友进步速度惊人！继续保持！',
  '前景背景层次分明，画面好丰富！',
  '这张好有电影感！男朋友你有天赋！',
  '色彩和光线配合得刚刚好！',
  '男朋友把女朋友拍出了高级感！',
  '这张有被治愈到！色调好温柔～',
  '男朋友构图越来越讲究了！',
  '姿势和背景好搭，男朋友好会选景！',
  '表情和光线都到位了，这张绝了！',
  '男友越来越会找光和角度了！',
  '这张好有氛围感！男朋友太会了～',
  '男朋友今天状态超好，这张绝了！',
  '背景虚化刚刚好，层次感满分！',
  '男朋友你行啊！这次拍出了大片感！',
  '光线打在脸上刚刚好，这张绝了！',
  '构图干净利落，男朋友越来越专业了！',
  '姿势好自然不做作，这张绝了！',
  '男朋友审美大爆发，这张太可了！',
]

// ========== Round 3 新增：情侣互动专属语音提示 ==========
const COUPLE_TIPS = {
  SQUEEZE_TOGETHER: '两个人再靠近一点！贴贴更甜蜜～',
  FACE_EACH_OTHER: '对视一下！这样拍出来超有感觉～',
  HUG_FROM_BEHIND: '男生从后面抱！经典的甜蜜姿势～',
  HOLD_HANDS_LOOK: '牵手看镜头，甜蜜感要溢出来了！',
  BACK_TO_CAMERA: '两人背对镜头牵手，超有氛围感！',
  PLAYFUL_NUDGE: '轻轻推他一下！自然互动抓拍～',
  FORHEAD_TOUCH: '额头碰额头，超甜的姿势～',
  SHADOW_KISS: '假装亲一下！这个角度绝了～',
  SPIN_TOGETHER: '转个圈圈！裙子飘起来抓拍～',
  WHISPER: '假装在他耳边说悄悄话，这个瞬间绝了～',
  PIGGYBACK: '让他背你！这个姿势超可爱～',
  TICKLE_EACH_OTHER: '互相挠痒痒！笑得灿烂的时候抓拍～',
  HAND_ON_CHEEK: '一只手轻轻放在他脸颊上，温柔感拉满～',
  SHARE_FOOD: '一起吃一个冰淇淋！互动感十足～',
  BLOW_BALLOON: '一起吹气球！这个互动超可爱～',
}

// ========== Round 3 新增：情绪引导专属语音提示 ==========
const EMOTION_TIPS = {
  THINK_OF_HAPPY: '想一件开心的事！发自内心的笑最好看～',
  LOOK_OUTSIDE: '看向窗外！假装在看风景，眼神更自然～',
  DEEP_BREATH: '深呼吸～放松肩膀，表情更自然～',
  PRETEND_LAUGH: '假装被逗笑了，这个表情最生动～',
  WIND_BLOW: '假装被风吹到了，眼睛稍微眯起来超灵动～',
  LOOK_UP_SUN: '抬头让阳光洒在脸上，温暖又自然～',
  WAITING_SOMEONE: '假装在等人，微微侧头看向旁边，眼神超有戏～',
  HEAR_NAME: '假装听到名字被叫到，转头看镜头，表情最自然～',
  RELAX_SHOULDERS: '放松肩膀～表情一放松笑容就更自然～',
  PRETEND_SURPRISE: '假装惊讶，嘴巴微微张开，眼睛睁大超可爱～',
  READ_BOOK_LOOK_UP: '低头看书或看手机，然后抬起头看镜头抓拍～',
  STARE_AFAR: '假装在看远处出神，然后转头微笑，超有氛围～',
  COUNT_TO_THREE: '数三下！一、二、三，笑一个～',
  SING_A_SONG: '小声哼首歌，表情会自然放松～',
  CLOSE_EYES_SMILE: '闭上眼睛笑一笑，再睁开眼看镜头～',
}

// ========== Round 3 新增：滤镜推荐语音提示 ==========
const FILTER_TIPS = {
  WARM_FILTER: '这张试试暖调滤镜！肤色看起来会更柔和～',
  COOL_FILTER: '冷调滤镜很有质感！整体色调会更有氛围～',
  PORTRAIT_FILTER: '人像滤镜最适合这张！皮肤通透又自然～',
  FOOD_FILTER: '美食照用暖色调滤镜，看起来食欲感满满～',
  SUNSET_FILTER: '夕阳配暖色调滤镜，光线会更浓郁～',
  NIGHT_FILTER: '夜景用电影滤镜，灯光会更有层次感～',
  VIVID_FILTER: '这张试试生动滤镜，颜色会更鲜活～',
  SOFT_FILTER: '柔化滤镜超适合这张！梦幻感满满～',
  BOKEH_FILTER: '开大光圈虚化背景！主体会更突出～',
  BW_FILTER: '试试黑白滤镜！光影感会更强～',
}

type FaceTipKey = keyof typeof FACE_TIPS
type StabilityTipKey = keyof typeof STABILITY_TIPS

/** 从稳定性提示池中随机选取同类提示 */
function pickStabilityTip(category: 'STABLE' | 'SHAKY' | 'EXTREME_SHAKE' | 'TILTED'): string {
  const variants: Record<string, string[]> = {
    STABLE: [STABILITY_TIPS.STABLE, STABILITY_TIPS.STABLE_2, STABILITY_TIPS.STABLE_3, STABILITY_TIPS.STABLE_4, STABILITY_TIPS.STABLE_5, STABILITY_TIPS.STABLE_SUPER, STABILITY_TIPS.STABLE_CAMERA, STABILITY_TIPS.BREATHE_STEADY, STABILITY_TIPS.WALL_SUPPORT, STABILITY_TIPS.WIDE_STANCE],
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
    this.lastFaceTip = text
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
      '自拍技巧': [
        '自拍最重要的是光线！找好角度，让光打在脸上～',
        '举起手机微微仰角，显脸小眼睛更有神～',
        '侧脸自拍超显气质！试试 45 度角微微低头～',
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

  /** 选中新模板时的语音确认（比切换确认更具体） */
  async speakTemplateSelected(templateName: string): Promise<void> {
    const tip = TEMPLATE_SELECT_TIPS[Math.floor(Math.random() * TEMPLATE_SELECT_TIPS.length)]
    await this.speak(`${templateName}～${tip}`, true)
  }

  /** 每日首次打开欢迎语（判断是否今日首次使用）
   *  @param isFirstToday 今天是否首次打开（由调用方传入判断逻辑）
   */
  async speakDailyWelcome(isFirstToday: boolean): Promise<void> {
    if (!isFirstToday) return
    const tip = WELCOME_TIPS[Math.floor(Math.random() * WELCOME_TIPS.length)]
    await this.speak(tip, false)
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

  /** 接近优秀（70-89分）时的语音提示 */
  async speakAlmostGreat(score: number): Promise<void> {
    const tips = [
      `${score}分！差一点就完美了！男朋友继续加油！`,
      `${score}分，已经很棒了！再拍一张挑战满分！`,
      `就差一点到优秀！${score}分，距离大片只差一点点！`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 重新再拍的建议（低于50分） */
  async speakTryAgainTip(suggestion: string): Promise<void> {
    const tips = [
      `试试${suggestion}，重新拍一张！`,
      `根据建议${suggestion}，再拍一次一定更好！`,
      `建议${suggestion}，男朋友再试一次吧！`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 情侣合照专属鼓励 */
  async speakCoupleCheer(): Promise<void> {
    const tips = [
      '两个人靠近一点！甜蜜感拉满～',
      '情侣照最重要的是互动！对视一下～',
      '男生从后面环抱，超有感觉的！',
      '背对镜头牵手，简约又甜蜜！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
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

  /** 组合动作提示（引导组合多个动作） */
  async speakComboTip(comboType: 'COMBO_LOOKAWAY_SMILE' | 'COMBO_HAND_HEART' | 'COMBO_LEAN_FORWARD' | 'COMBO_ARM_CROSS' | 'COMBO_CASUAL_HANDS_POCKET'): Promise<void> {
    const tips: Record<string, string[]> = {
      COMBO_LOOKAWAY_SMILE: ['假装看旁边，再转头对我笑～', '先看旁边，然后转过头来笑，这个角度超自然！'],
      COMBO_HAND_HEART: ['双手比个爱心，下巴微微抬起～', '双手比心pose，下巴抬起来，眼睛更有神！'],
      COMBO_LEAN_FORWARD: ['身体微微前倾，脸靠近镜头～', '前倾一点拍特写！脸占满画面更有感觉～'],
      COMBO_ARM_CROSS: ['双手抱臂，下巴收紧，精神点！', '抱臂站好，下巴收紧，气场全开！'],
      COMBO_CASUAL_HANDS_POCKET: ['双手插兜，头微微歪，酷酷的～', '插兜歪头，酷酷的感觉一下！'],
    }
    const arr = tips[comboType] || []
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

  // ========== Round 2 新增 ==========
  /** 倒计时提示（3-2-1） */
  async speakCountdown(num: number): Promise<void> {
    if (num === 3) await this.speak('三～', true)
    else if (num === 2) await this.speak('二～', true)
    else if (num === 1) await this.speak('一～笑一个！', true)
  }

  /** 低分鼓励（总分 < 50） */
  async speakLowScore(score: number): Promise<void> {
    const tips = [
      `这张只有${score}分，没关系！多拍几张就好啦～`,
      `${score}分不是终点！男朋友继续加油！`,
      `${score}分只是开始！再来一张，肯定会更好！`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 满分/接近满分庆祝 */
  async speakPerfectScore(score: number): Promise<void> {
    const tips = [
      `满分！${score}分！男朋友你是开挂了吗！这张太绝了！`,
      `${score}分！男朋友摄影师天赋觉醒！这张要存档一万年！`,
      `${score}分大片！这张照片可以直接上杂志封面了！`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 连续好评播报 */
  async speakStreak(count: number): Promise<void> {
    const tips = [
      `连续${count}次高分！男朋友这稳定发挥太厉害了！`,
      `${count}连拍都是好片！男朋友你是专业的吗！`,
      `${count}次都这么高分，这摄影师养成了！`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 模板分类切换提示 */
  async speakTemplateCategory(category: string): Promise<void> {
    const tips: Record<string, string[]> = {
      '室内日常': ['切换到室内日常～家里也能拍大片！', '室内场景！家里的角落都是拍照好地方～'],
      '户外风景': ['户外风景！找个好背景就成功一半了～', '户外模式！让自然光帮你打光～'],
      '餐厅美食': ['餐厅美食！暖光下的菜品和人都是大片～', '美食模式！边吃边拍两不误～'],
      '情侣合照': ['情侣合照！两个人的甜蜜要记录下来～', '双人模式！靠近一点，笑一个～'],
      '特殊风格': ['特殊风格！创意满分，男朋友准备好了吗～', '风格模式！这张要有大片感！'],
      '室内场景': ['室内场景！找到好光线就成功一半了～', '室内模式！找个窗边位置试试～'],
      '城市街拍': ['城市街拍！找个有特色的背景，照片更有故事感～', '街头模式！城市的角落都是大片背景～'],
    }
    const pool = tips[category] || [`已切换到${category}场景～`] 
    await this.speak(pool[Math.floor(Math.random() * pool.length)], true)
  }

  /** 晨光拍摄提示 */
  async speakMorningTip(): Promise<void> {
    const tips = [
      '早上的光线好柔和，现在拍照超适合！',
      '晨光时光光线超美！趁现在多拍几张～',
      '早起的福利！这种光线拍照最好看了～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
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
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  /** 金色时刻提示 */
  async speakGoldenHour(): Promise<void> {
    const tips = [
      '现在是金色时刻！夕阳的光最会说话，快拍！',
      '黄昏光线超美！男朋友抓紧时间，这光绝了！',
      'Golden Hour！男朋友快按快门，这光错过就没了！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  /** 新纪录庆祝 */
  async speakNewRecordAlert(score: number): Promise<void> {
    const tips = [
      `新纪录！${score}分！男朋友你破纪录了！`,
      `${score}分！历史最高！男朋友进化了！`,
      `🏆 新纪录达成！${score}分！男朋友太厉害了！`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 里程碑庆祝 */
  async speakMilestone(count: number): Promise<void> {
    const msgs: Record<number, string> = {
      10: '🎉 十连拍达成！男朋友进步肉眼可见！',
      20: '🏆 二十连拍里程碑！摄影师已在线！',
      50: '👑 五十次快门！男朋友你是被拍照耽误的摄影师！',
      100: '💎 百次快门达成！男朋友已经是拍照达人了！',
    }
    const msg = msgs[count] || `🎊 ${count}次拍摄达成！继续加油！`
    await this.speak(msg, true)
  }

  /** 极低分鼓励（<50分），温柔安抚而不是打击） */
  async speakLowScoreGentle(score: number): Promise<void> {
    const tips = [
      `${score}分，没关系！每张照片都是进步的开始～`,
      `${score}分，别灰心！教他几个小技巧，下次一定更棒！`,
      `才${score}分而已呀～告诉他哪里没做好，下次一定更好看！`,
      `${score}分不是终点！把这张当参考，告诉男友下次怎么改进～`,
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 全能满分播报（四维全部高分时） */
  async speakAllDimensionPerfect(): Promise<void> {
    const tips = [
      '四维全能！构图光线稳定构图全部完美！男朋友你是开挂了吗！',
      '全能选手！构图光线稳定构图都是满分！摄影师认证！',
      '太惊艳了！四个维度全部拿满，男朋友你简直是天生的摄影师！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 首次使用引导语（第一次拍照前播报） */
  async speakFirstTimeUser(): Promise<void> {
    const tips = [
      '第一次用男友相机呀～让男朋友拿好手机，屏幕上的剪影就是站位参考！',
      '拍照前先选个喜欢的姿势模板，让男朋友照着剪影站就好！',
      '建议先选个简单的姿势～男朋友照着屏幕上的人形剪影站就 OK！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  /** 夜间拍摄引导 */
  async speakNightPhotography(): Promise<void> {
    const tips = [
      '夜景光线比较暗，找个光源在身后或侧面的位置～',
      '晚上拍照，打开闪光灯或者找街灯当光源，脸不要背光！',
      '夜晚光线复杂，让女朋友靠近光源或者打开手机闪光灯～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 连拍模式引导 */
  async speakBurstMode(): Promise<void> {
    const tips = [
      '连拍模式开启！按着快门别松手，我来帮你选最好的那张～',
      '连拍中！多拍几张选最自然的表情～',
      '别客气，多拍几张！连拍模式帮你抓最自然的那一刻！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 好光线专项表扬 */
  async speakGoodLighting(): Promise<void> {
    const tips = [
      '这个光线绝了！脸上的光好柔和，男朋友你是专业的吗！',
      '好温柔的光！整个人都在发光，男朋友审美开挂了！',
      '这光打得刚刚好！男朋友今天状态满分～',
      '逆光也太有感觉了吧！这光线男朋友你怎么找到的！',
      '脸上的光超均匀！男朋友终于学会找光了，感动！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 姿势完美达标表扬 */
  async speakPosePerfect(): Promise<void> {
    const tips = [
      '姿势满分！男朋友完全照着模板来，超棒！',
      '这个pose太到位了！男朋友你是有天赋的吗！',
      '姿势完全复刻！男朋友认真起来真的好厉害～',
      '男朋友完全学到了！这个姿势绝了！',
      '照着模板摆的姿势超标准！男朋友悟性太高了！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 进步鼓励语（非分数驱动，通用进度鼓励） */
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
      await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
      return
    }
    if (totalPhotos < 20) {
      const tips = [
        '男朋友已经是老手了！继续保持这个状态～',
        '拍了这么多张，进步肉眼可见！',
        '男朋友越来越会拍了，继续保持！',
      ]
      await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
      return
    }
    const tips = [
      '男友摄影师认证！拍了这么多张，每张都越来越好了！',
      '男朋友已经从新手进化成高手，继续探索更多姿势吧～',
      '哇！已经拍了这么多！男朋友的拍照水平简直开挂了！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  // ========== Round 8 新增 TTS 场景 ==========
  async speakPerfectMoment(): Promise<void> {
    const tips = [
      '这一刻光线绝了！表情也超棒！就是现在，按快门！',
      '姿势完美表情到位，这光线太珍贵了，按下去！',
      '天时地利人和！男朋友这张拍出来一定是神作！',
      '这光线这角度这表情，绝了！赶紧按快门别浪费！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  async speakFaceTooSmall(): Promise<void> {
    await this.speak('人太小了！往前走两步，让脸大一点点，画面会更饱满～', true)
  }

  async speakFaceTooLarge(): Promise<void> {
    await this.speak('脸占画面太大了！稍微退后一点点，留点背景更好看～', true)
  }

  async speakWindBlowsHair(): Promise<void> {
    const tips = [
      '有风！头发飘起来了，等风再吹一次，赶紧抓拍！',
      '这风吹得正好！让头发再飘一下，超有氛围！',
      '风来了别动！就是现在，让头发飘起来抓拍！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  async speakGoodBackground(): Promise<void> {
    await this.speak('这个背景超好看！光线也棒，别浪费了，赶紧拍！', true)
  }

  async speakSharePhoto(): Promise<void> {
    const tips = [
      '这张太美了！分享给闺蜜，让她们也羡慕羡慕～',
      '这张可以直接发朋友圈！配文都不用想了，就这张！',
      '男朋友这张绝了！必须分享一下，让大家都看看！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  async speakKeepPractice(): Promise<void> {
    const tips = [
      '多拍几张选最好的！第一张不一定最完美～',
      '拍照就是熟能生巧！继续拍，你男友会越来越好的！',
      '每拍一张都是进步！男朋友加油，继续练习！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  async speakMirrorShot(): Promise<void> {
    await this.speak('用镜子拍可以消除男友手残视角！这个方法绝了～', true)
  }

  async speakTimerMode(): Promise<void> {
    const tips = [
      '试试定时拍摄！十秒足够摆好姿势，男朋友也可以入镜了～',
      '打开定时器！摆好姿势再拍，男朋友也能一起合照了～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 侧颜/角度提示 */
  async speakAngleTip(): Promise<void> {
    const tips = [
      '侧脸超有感觉！让女朋友稍微侧一点试试～',
      '换个角度拍！侧面比正脸更有故事感～',
      '侧身回眸是最经典的姿势之一，试试看～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 多人合照提示 */
  async speakGroupPhotoTip(count: number): Promise<void> {
    const tips: Record<number, string[]> = {
      2: ['两个人靠近一点！贴贴更上镜～', '情侣合照靠近一点，甜蜜感拉满～'],
      3: ['三个人站整齐一点！大家往中间靠～', '三人合照别挤在两边，中间位置更上镜～'],
      4: ['四个人站好！稍微错开一点位置～', '人多往后退一步！让大家都能入镜～'],
    }
    const pool = tips[count] || tips[2]
    await this.speak(pool[Math.floor(Math.random() * pool.length)], true)
  }

  /** 镜子自拍提示 */
  async speakMirrorSelfieTip(): Promise<void> {
    const tips = [
      '对着镜子拍可以消除男友手残视角！这个方法绝了～',
      '用镜子自拍，让男朋友拿手机从背后拍，你看着镜子调整姿势～',
      '浴室镜子光线超均匀！这个位置拍出来皮肤超好～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 大风天提示 */
  async speakWindTip(): Promise<void> {
    const tips = [
      '有风！头发飘起来的时候按下快门，超有氛围～',
      '风来了别动！让头发自然飘一下，这个瞬间抓拍绝了～',
      '有风吹的时候最适合拍动态感，等风再吹一次赶紧拍～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 阴天提示 */
  async speakCloudyTip(): Promise<void> {
    const tips = [
      '阴天光线超柔和，是拍照的好时候！皮肤看起来会超好～',
      '云层就是天然柔光箱！阴天拍出来皮肤超细腻～',
      '阴天拍照不用担心过曝，光线均匀柔和，随便拍都好看～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  /** 雨天提示 */
  async speakRainyTip(): Promise<void> {
    const tips = [
      '雨天的光线超柔和！找个窗户边，光影绝绝子～',
      '雨天窗边拍照最有氛围感！水珠做前景超有感觉～',
      '雨后的地面有倒影，找个水洼试试俯拍，超有意境～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  /** 逆光拍摄提示 */
  async speakBacklightTip(): Promise<void> {
    const tips = [
      '逆光超有感觉！转过身让光打在侧脸上，绝绝子～',
      '背光拍摄剪影超浪漫！整个人都在发光的感觉～',
      '逆光的时候让女朋友稍微侧身，光线勾勒轮廓超美～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 侧光拍摄提示 */
  async speakSideLightTip(): Promise<void> {
    const tips = [
      '侧光超有立体感！脸稍微转一点让光打在侧脸上～',
      '这种光线下侧颜最有感觉！让女朋友稍微转头～',
      '侧光最能勾勒轮廓，试试让光打在脸的侧面～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 新手引导提示（第一次打开相机） */
  async speakFirstTimeTip(): Promise<void> {
    const tips = [
      '第一次拍照呀～让男朋友打开相机，选个喜欢的姿势模板照着站～',
      '先用姿势模板练习！屏幕上会出现半透明剪影，照着站就 OK～',
      '拍照前先选个喜欢的姿势，让男朋友照着屏幕上的轮廓站～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 提醒男朋友对焦 */
  async speakFocusTip(): Promise<void> {
    const tips = [
      '让男朋友点一下屏幕上你的脸，对焦会更准～',
      '先点一下屏幕对焦在人脸上，出来的照片会更清晰～',
      '点击屏幕上人脸的位置对焦，这样主体会更清晰～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 引导缩小背景 */
  async speakTighterFrameTip(): Promise<void> {
    const tips = [
      '稍微拉近一点！背景太杂了，主体会更突出～',
      '镜头再近一点点！主体大一点更上镜～',
      '放大一点拍！特写比远景更有冲击力～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 引导拉开距离 */
  async speakWiderFrameTip(): Promise<void> {
    const tips = [
      '稍微退后一点！让更多背景入镜，画面会更丰富～',
      '拉远一点！这样背景和人物关系更好看～',
      '退后一步！让更多环境入镜，构图更有层次～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

}

export { FACE_TIPS, STABILITY_TIPS, EXPRESSION_TIPS, SCENE_TIPS }
export default new VoiceCoach()
