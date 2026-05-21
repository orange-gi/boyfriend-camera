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
  // ========== Round 3 新增人脸位置提示 ==========
  FACE_CENTERING: '脸稍微往中间挪一点点，构图会更稳～',
  FACE_CENTER_PERFECT: '位置完美！就是现在，笑一个按下去！',
  LOOK_LEFT_THEN_SMILE: '先看左边，再转头笑！这个表情超自然～',
  LOOK_RIGHT_THEN_SMILE: '先看右边，再转头笑！自然的笑容马上就出来了～',
  SELFIE_TOO_HIGH: '手机稍微放低一点点，正面拍摄会更有神～',
  SELFIE_TOO_LOW: '手机抬高一点！俯拍显脸小，下巴尖尖的～',
  // 拍摄成功
  SHOOT_GOOD: '姿势很棒！就是现在，按快门！',
  // 拍摄失败
  CAPTURE_FAILED: '拍照失败了，再试一次吧～',
  // 相册保存
  SAVED_TO_ALBUM: '已保存到相册！可以去相册里找找看～',
  // 拍照成功
  CLICK_SNAP: '咔嚓！拍好了～来看看效果吧！',
  // ========== Round 5 新增 TTS 场景 ==========
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
  BACKLIGHT_HDR_HINT: '逆光场景明暗对比大！打开 HDR 模式，高光阴影都能保留～',
  // 成功抓拍倒计时
  COUNTDOWN_3: '三～',
  COUNTDOWN_2: '二～',
  COUNTDOWN_1: '一～',
  COUNTDOWN_GO: '拍！',
  CAPTURE_SUCCESS: '太棒了！拍到了！这张绝了～',
  CAPTURE_SUCCESS_2: '抓到了！这个表情太生动了～',
  CAPTURE_SUCCESS_3: '完美！就是这张！',
  // 表情僵硬
  EXPRESSION_STIFF: '表情放松一点～嘴角微微上扬，自然最美～',
  EXPRESSION_STIFF_2: '别僵着！想想开心的事，笑一个试试～',
  EXPRESSION_STIFF_3: '表情有点紧，肩膀放松，深呼吸～',
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
  // ========== Round 27 新增场景提示 ==========
  GYM_CARDIO_TIP: '动感单车上身体微微前倾，笑着看向镜头，活力满满！',
  RAINY_WINDOW_INDOOR: '雨天室内窗边超有氛围！让窗户的光打在侧脸上～',
  SUNGLASSES_COOL: '戴墨镜超酷！稍微侧身站，摘下墨镜的一瞬间抓拍～',

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
  // ========== Round 3 新增 TTS 场景 ==========
  CHECK_MIRROR: '检查一下镜子里有没有乱！头发衣服都要整理好～',
  GRAB_ATTENTION: '吸引她的注意力！逗她笑一下再按快门～',
  TELL_JOKE: '给她讲个笑话！表情自然的时候抓拍～',
  SQUEEZE_CHEEKS: '轻轻捏一下脸！自然的笑容马上出来～',
  PLAY_MUSIC: '放一首她喜欢的歌！跟着节奏自然摇摆～',
  DIRTY_LENS_HINT: '镜头好像有点脏！擦一下会更清晰～',
  CHECK_FACE_IN_FRAME: '确认一下脸在屏幕里！别被切掉了～',
  POSE_ADJUSTMENT: '稍微调整一下姿势！这个角度可以更好看～',
  EXPRESSION_REFRESH: '表情换一换！试试酷酷的、甜甜的、酷甜的三种～',
  LIGHT_CHECK: '确认一下光线方向！脸要朝向光源才好看～',
  // ========== Round 30 新增 TTS 场景 ==========
  CHECK_HAIR: '头发稍微理一下！光线下会更通透～',
  ADJUST_COLLAR: '领口整理一下！露出锁骨线条更好看～',
  CLEAN_LENS: '镜头有指纹！用衣服擦一下会更清晰～',
  STABILIZE_ARMS: '手臂夹紧身体！会更稳～',
  CHECK_BACKGROUND: '背景检查一下！太乱会抢戏～',
  FIND_REFLECTION: '找个能反光的东西补光！眼神会亮很多～',
  USE_WALL: '靠在墙上拍！身体不会晃～',
  CHECK_HORIZON: '看一下地平线！别歪了～',
  CLOSE_SPACE: '背景留少一点！人占画面大一点更好看～',
  OPEN_SPACE: '退后一步！背景完整一点更有感觉～',
  TURN_OFF_FLASH_AUTO: '闪光灯自动模式有点乱！手动开关试试～',
  ANGLE_LEFT: '往左边偏一点！光线会更柔和～',
  ANGLE_RIGHT: '往右边偏一点！换个角度试试～',
  TRY_MIRROR_SELFIE: '对着镜子拍！角度更好控制～',
  CHECK_EXPRESSION: '表情怎么样？自然放松最好看～',
  SQUEEZE_SMILE: '嘴角上扬一点点！微笑最上镜～',
  OPEN_EYES_WIDE: '眼睛睁大一点！眼神更有神～',
  RELAX_SHOULDERS_TIP: '肩膀放松！别端着，自然就好～',
  CHIN_DOWN_SLIGHTLY: '下巴稍微收一点点！下颌线更清晰～',
  TILT_FACE_LEFT: '脸稍微往左歪一点点～',
  TILT_FACE_RIGHT: '脸稍微往右歪一点点～',
  MOVE_TO_WINDOW: '走到窗户边！自然光最柔和～',
  SHADOW_CHECK: '脸上阴影太多！换个位置试试～',
  SOFTEN_LIGHT: '光太硬了！找阴影处或用东西柔化～',
  FACE_SCREEN_LIGHT: '用手机屏幕给脸补光！白色背景亮度刚好～',
  USE_CEILING_REFLECT: '白墙会反光！靠近墙站脸会更亮～',
  SUNBEAM_HINT: '有阳光的时候！侧身站着光影更立体～',
  EVENING_SOFT_LIGHT: '傍晚光线超柔！趁现在多拍几张～',
  NORTH_LIGHT_TIP: '北向窗户光线最柔和！适合拍人像～',
  MOONLIGHT_HINT: '月光下也超浪漫！打开闪光灯补补光～',
  CANDLE_WARM_LIGHT: '烛光超有氛围！让烛光打在脸上～',
  STREET_LAMP_NIGHT: '路灯下光线暖暖的！站灯下脸更亮～',
  NEON_COLORFUL: '霓虹灯下超酷！让光打在侧脸上～',
  TRAIN_WINDOW_LIGHT: '火车窗边光线好均匀！靠着窗拍～',
  SUBWAY_LIGHTS_COLD: '地铁站灯光冷调！侧身站着超有都市感～',
  ROOFTOP_GLOW: '天台灯光好浪漫！打开闪光灯补补光～',
  POOL_LIGHTS_NIGHT: '泳池灯光好梦幻！开闪光灯拍一张～',
  CAMPFIRE_WARM: '营火边超有氛围！火光打在脸上好温暖～',
  FIREWORKS_NIGHT: '烟花下超浪漫！开闪光灯抓拍瞬间～',
  STADIUM_LIGHTS_BRIGHT: '体育场灯光超亮！表情放松自然拍～',
  ZOO_ANIMAL_LIGHT: '动物园灯光均匀！和动物互动拍一张～',
  AQUARIUM_BLUE: '水族馆蓝色光线超梦幻！侧身站着超美～',
  CHRISTMAS_LIGHTS: '圣诞灯饰超有氛围！靠近灯串站着～',
  HALLOWEEN_LIGHTS: '南瓜灯好可爱！侧身靠着拍一张～',
  LANTERN_FESTIVAL: '元宵节灯笼超红！靠近灯笼站好～',
  MUSIC_STAGE_LIGHT: '舞台灯光超有感觉！抬头看灯拍一张～',
  GARDEN_FAIRY_LIGHT: '花园串灯超梦幻！站在灯下超浪漫～',
  MARKET_STALL_WARM: '集市摊位灯光暖暖的！靠着摊位随意一点～',
  BAKERY_DISPLAY: '面包店暖光好诱人！侧头微笑拍一张～',
  CAFE_WINDOW_SEAT: '咖啡馆靠窗位置光线最好！坐窗边拍～',
  BUBBLE_TIP: '吹个泡泡！透明泡泡在阳光下超梦幻～',
  LEAF_PROP: '捡片落叶当道具！俏皮又自然～',
  BALLOON_COLORFUL: '拿个彩色气球！活泼感十足～',
  UMBRELLA_RAIN: '撑透明伞！雨天光线超柔和～',
  SCARF_WIND: '披个围巾！风吹起来超有动感～',
  HAT_STYLE: '戴个帽子！帽檐可以挡阳光还能凹造型～',
  SUNGLASSES_STYLE: '戴墨镜超酷！摘下来的一瞬间抓拍～',
  FLOWER_CROWN: '戴个花环！仙气飘飘的感觉～',
  HAND_MIRROR: '拿个小镜子！对着镜子拍更有感觉～',
  BOOK_PROP: '拿本书！假装在看书，文艺感拉满～',
  BICYCLE_PROP: '骑个自行车！活力满满动感十足～',
  COFFEE_CUP: '端着咖啡！生活感满满，好自然～',
  ICE_CREAM_TIP: '拿着冰淇淋！俏皮可爱，嘴角沾一点更好笑～',
  CAKE_CANDLE: '生日蛋糕前光线暖暖的！侧头笑一个～',
  WINE_GLASS: '举杯庆祝一下！红酒杯超有氛围～',
  PASTRY_BASKET: '端着甜点托盘！慵懒又高级～',
  PLANT_GREEN: '抱着盆栽！绿植和人都好上镜～',
  POSTER_BACK: '靠在海报墙！和海报互动超有感觉～',
  GRAFFITI_WALL: '涂鸦墙前超酷！侧身站着超有态度～',
  VINTAGE_DOOR: '老木门前超有故事感！靠着门拍一张～',
  RAILING_VIEW: '靠着栏杆看远方！背景是城市天际线～',
  BALCONY_FLOWER: '阳台花丛里光线好！蹲下来仰拍～',
  STAIR_RAIL: '楼梯扶手边超有层次！侧身站着～',
  WINDOW_CURTAIN: '拉起窗帘拍！光影斑驳超有感觉～',
  BED_SHEETS: '躺在干净的床单上！俯拍仰头超有氛围～',
  PILLOW_LAYER: '抱着枕头拍！慵懒可爱～',
  KITCHEN_COOKING: '系上围裙做饭！生活感十足～',
  BALCONY_SUNSET: '阳台看夕阳！逆光侧脸超浪漫～',
  TERRACE_STARS: '天台看星星！仰头让星星落在眼睛里～',
  // ========== Round 30 新增姿势切换提示 ==========
  POSE_READY_NOW: '姿势摆好了！就是现在，按下去！',
  POSE_ALMOST_THERE: '就差一点点！手的位置再调整一下～',
  FACE_TOO_LEFT: '脸稍微往右挪！位置会更正～',
  FACE_TOO_RIGHT: '脸稍微往左挪！位置会更正～',
  STEP_CLOSER: '往前走一步！距离刚刚好～',
  STEP_BACK: '退后一步！距离刚刚好～',
  // ========== Round 33 新增 TTS 场景 ==========
  // 情绪引导类
  THINK_OF_SOMETHING: '想一件让你开心的事！这个表情最自然～',
  LOOK_SIDEWAYS_NATURAL: '假装在看旁边什么东西！眼神会超自然～',
  CLOSE_EYES_RELAX: '先闭眼放松，深呼吸～然后睁开眼看镜头！',
  LAUGH_NATURALLY: '假装被逗笑了！自然生动的笑容马上出来～',
  IMAGINE_FAVORITE_FOOD: '想象面前有最爱的美食！眼睛都亮了～',
  THINK_OF_LOVED_ONE: '想象你喜欢的人！这个表情好甜～',
  // 拍摄技巧指导类
  RULE_OF_THIRDS_REMINDER: '打开九宫格！人放在交叉点上更专业～',
  LEADING_ROOM_HINT: '眼睛看的方向留点空间！画面会更舒服～',
  SYMMETRY_HINT: '试试对称构图！正面站直超有气场～',
  DIAGONAL_LEAD: '对角线构图超有动感！试试斜着站～',
  FRAME_IN_FRAME: '找个框架构图！门框窗户都能当框架～',
  DEPTH_LAYERS: '前景背景层次分明！让画面更有深度～',
  // 情侣互动类
  HOLD_HANDS_TIGHT: '牵手！十指紧扣，超甜～',
  HUG_FROM_BEHIND_IDLE: '从后面抱！环腰抱超温馨～',
  PIGGYBACK_SHOT: '背起来！活力感满分～',
  SPIN_TOGETHER: '原地转一圈！抓拍旋转的瞬间～',
  WHISPER_SOMETHING: '凑近说悄悄话！这个距离好亲密～',
  TOUCH_FOREHEADS: '额头碰额头！嘟嘴亲亲，超甜～',
  PLAY_ROCK_SCISSORS: '猜拳！出拳的瞬间抓拍超有趣～',
  BALANCE_GAME: '背靠背站起来！考验默契～',
  // 新场景提示
  GYM_SQUAT_LUNGE: '深蹲或弓步！运动感超活力～',
  YOGA_POSE_TIP: '瑜伽姿势超有气质！舒展身体慢慢来～',
  DANCE_MOVE_HINT: '跟着音乐动起来！抓拍舞动的瞬间～',
  COOKING_INTERACT: '一起做饭互动！切菜或品尝，抓拍生活感～',
  READING_TOGETHER: '一起看书！这个安静瞬间好有氛围～',
  COFFEE_TOAST_CHEERS: '举杯碰一下！咖啡红酒都可以～',
  BLOW_BUBBLES_FUN: '吹泡泡！这个画面好梦幻～',
  PLAY_WITH_PET: '和宠物互动！自然的笑容最可爱～',
  BLOW_DANDELION: '吹蒲公英！浪漫又自然～',
  SWING_PARK: '荡秋千！裙子飘起来超美～',
  SWING_SEESAW: '跷跷板！高低错落很有趣～',
  STROLL_HOLD_HANDS: '牵手散步！走路的瞬间最自然～',
  JUMP_EXCITED: '原地跳一下！活力满满～',
  WINK_CUTE: '眨一只眼！俏皮可爱～',
  TONGUE_OUT_PLAYFUL: '吐舌头！俏皮可爱满分～',
  PEACE_SIGN: '比个耶！经典又可爱～',
  HEART_HAND_SIGN: '比心！爱心手势超甜～',
  OK_GESTURE: 'OK手势！简单又好看～',
  COVER_ONE_EYE_CUTE: '捂一只眼！可爱的遮脸pose～',
  // 光线微调类
  NODERLIGHT_REPOSITION: '光源太低了！稍微抬头让光打在脸上～',
  LIGHT_TOO_HIGH: '顶光阴影重！换个角度躲开顶光～',
  SIDE_LIGHT_TOO_STRONG: '侧光太硬！稍微正对光源一点～',
  BACKGROUND_LIGHT_TOO_BRIGHT: '背景太亮人太暗！打开闪光灯或走近光源～',
  REFLECTOR_HINT: '白墙白纸都能反光！用它们补补光～',
  SCREEN_LIGHT_TRICK: '手机屏幕对着脸！白色背景就是简易补光灯～',
  // 构图确认类
  CENTER_FRAME: '脸放中间！构图会更稳～',
  RULE_OF_THIRDS_ALIGN: '参考九宫格！人脸对准交叉点～',
  DIAGONAL_COMPOSITION: '试试斜着站！打破常规更有趣～',
  TIGHT_CROPPING: '拍近一点！特写更有冲击力～',
  WIDER_BACKGROUND: '退后一点！让背景更完整～',
  BALANCED_FRAME: '画面重心要稳！别让一边太空～',
  // ========== Round 38 新增 TTS 场景 ==========
  WIND_HAIR_MESSY: '风把头发吹乱了！先拨开再拍，或者让风吹着也很有氛围～',
  WIND_HAIR_NATURAL: '头发飘起来好美！就是现在抓拍发丝～',
  COLD_BREATH_HINT: '天冷拍照哈气！先深呼吸憋住，按快门就不会哈气啦～',
  HOT_WEATHER_GLOW: '天热光线强！找个阴凉处拍，皮肤不会油光～',
  HARSH_NOON_LIGHT: '正午阳光好硬！等一下或者找个阴影处～',
  CONCERT_LIGHTS: '演唱会的灯光超有氛围！让光打在脸上别挡住～',
  FESTIVAL_LANTERNS: '节日灯笼好美！站在灯下让光打在脸上～',
  SUBWAY_PLATFORM: '地铁站台光线冷调！侧身站着超有都市感～',
  CHEESE_HINT: '说"田七"！嘴型最自然～',
  SAY_PRETEND: '假装在看旁边的风景！比看镜头自然一百倍～',
  EXPRESSION_SAY_YUM: '说"好吃"！表情最自然～',
  CANDID_LOOK_SIDE: '往旁边看！就是现在抓拍～',
  CANDID_LOOK_UP: '抬头看天空！就是现在抓拍～',
  TEMPLATE_MATCH_HIGH: '姿势超准！就是这张，按快门！',
  TEMPLATE_MATCH_MEDIUM: '姿势差不多对了！再微调一下就完美～',
  BEACH_SAND_REFLECTION: '海边沙滩有倒影！蹲低一点拍出倒影～',
  POOL_SIDE_FUN: '泳池边光影好漂亮！坐在池边看镜头笑～',
  SNOW_BRIGHT_HINT: '雪地光线很强！戴墨镜或找阴影处，不然眼睛睁不开～',
  RAINBOW_APPEAR: '哇，有彩虹！快站在彩虹方向拍一张～',
  DOG_CAMERA_CURIOUS: '小狗狗在看镜头！就是现在抓拍～',
  CAT_LOOK_AWAY: '猫咪在看别处！等它转过来或者假装喂它～',
  CROWD_BACKGROUND: '背景人好多！稍微等人走开再拍，或者开人像模式虚化～',
  CAMERA_DIRTY_LENS: '镜头好像脏了！先擦一下，拍出来会更清晰～',
  // ========== Round 40 新增场景提示 ==========
  CAMERA_UPSIDE_DOWN: '手机好像拿反了！把摄像头朝上拿好～',
  FACE_LOCKED: '找到你了！就是现在，笑一个～',
  CAMERA_TOO_CLOSE: '手机离脸太近了！稍微拿远一点点～',
  LOW_BATTERY_HINT: '手机快没电了！抓紧时间多拍几张～',
  // ========== Round 3 新增 TTS 场景 ==========
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
  // ========== Round 41 新增人脸提示 ==========
  GLASSES_REFLECTION: '眼镜反光太亮了！稍微侧一下脸躲开光源～',
  GLASSES_TILT: '镜片反光挡住眼睛了，抬头或低头一点点～',
  EYE_CONTACT_HINT: '看镜头！眼神定住更有神～',
  EYE_LOOK_AWAY_NATURAL: '假装看旁边的风景！比看镜头自然一百倍～',
  GROUP_FACE_TOO_MANY: '找到好多人脸！对焦在最前面的人身上哦～',
  GROUP_STAND_CLOSER: '大家再靠近一点！贴贴更入镜～',
  GROUP_STAND_STAGGERED: '后排稍微错开站，这样每个人都能露出来～',
  OUTFIT_BLEND_BACKGROUND: '衣服和背景颜色太像了！稍微换个角度躲开～',
  HAIR_WIND_MESSY: '风把头发吹乱了！先理一下再拍，或者让风吹着也很有氛围～',
  EXPRESSION_THINK_OF_SONG: '想想你最喜欢的歌！这个表情最自然～',
  EXPRESSION_NATURAL_BREATH: '深呼吸放松！表情会更自然～',
  // ========== 本次新增人脸/光线/姿势提示 ==========
  DRESS_COLOR_HINT: '衣服颜色和背景太接近了！换个角度或者背景躲开～',
  HAIR_TUCK_EAR: '头发挡住耳朵了！轻轻拨到耳后，轮廓会更清晰～',
  COLLAR_PULL: '领口歪了！轻轻整理一下，露出一边锁骨更好看～',
  CHIN_UP_SLIGHT: '下巴稍微抬一点点！下颌线会更清晰立体～',
  CHIN_DOWN_SLIGHT: '稍微收一下下巴！脖子显得更长，仪态更好～',
  SHOULDER_DOWN: '肩膀放松往下沉！别端着，自然最美～',
  ARM_NATURAL: '手臂自然垂下就好！别紧贴身体，显瘦～',
  HAND_PLACE_HIP: '双手叉腰！这个姿势显瘦又有气场～',
  HAND_TOUCH_NECK: '轻轻搭在脖子上！这个姿势知性又优雅～',
  BODY_TURN_SLIGHT: '身体稍微侧一点！比正对镜头更显瘦～',
  FACE_TURN_MICRO: '脸稍微转一点点！完全正脸会显胖，侧一点更立体～',
  LIGHT_BALANCE_HINT: '脸上阴影太多了！稍微换个角度让光更均匀～',
  EYES_FOCUS_DISTANCE: '眼神聚焦到镜头方向！别放空～',
  TEETH_SHOW_SMILE: '露出上排牙齿笑！会更自信有感染力～',
  POSE_READY_HINT: '姿势摆好了！就是现在，按下去！',
  LIGHT_PERFECT_NOW: '光线完美！这个时刻拍出来一定超好看！',
  // ========== Round 42 新增天气场景 ==========
  RAINY_STREET_LAMP: '雨夜路灯下超有氛围！让雨滴打在伞上拍一张～',
  RAIN_PUDDLE_REFLECTION: '地上有水洼！蹲低拍倒影，角度绝了～',
  SNOW_CATCH_LIGHT: '雪地里光线反射强！戴墨镜或者眯眼笑～',
  WIND_STRONG_STABILIZE: '风太大了！双手握稳手机，头发乱的时候别按～',
  FOGGY_MYSTERY: '雾蒙蒙的超有氛围感！这个天气拍出来好有意境～',
  MORNING_DEW: '早晨光线超通透！趁露水还在多拍几张～',
  // ========== Round 42 新增构图进阶提示 ==========
  LEADING_LINE_HINT: '找一条引导线！道路围栏都能引导视线到人身上～',
  SYMMETRY_BUILDING: '正面站直对称构图！这个角度气场全开～',
  FRAME_BOUNDARY: '用门框窗户当框架！画面更有层次感～',
  DEPTH_OF_FIELD_HINT: '走近主体！背景自然虚化，主体更突出～',
  NEGATIVE_SPACE: '留白多一点！画面更透气，更有呼吸感～',
  // ========== Round 42 新增表情微调 ==========
  EYEBROW_RAISE: '眉毛稍微抬起来一点！眼睛会显得更大～',
  JAWLINE_TIGHTEN: '舌尖顶住上颚！下颌线立刻变清晰～',
  NECK_EXTEND: '脖子伸长一点！天鹅颈上线，气质立刻提升～',
  SMILE_TENSION: '嘴角向耳朵方向拉！笑容会更开更灿烂～',
  EYE_SQUINT_HINT: '笑的时候眼睛眯小一点！这个表情好甜～',
  // ========== Round 43 新增人脸提示 ==========
  HAIR_MESSY_NATURAL: '头发有点乱但很有氛围感！自然的才是最美的～',
  HAIR_WIND_BLOW: '风把头发吹起来好美！就是现在抓拍～',
  GLASSES_CLEAN: '眼镜有点反光，侧一下脸躲开光源～',
  FACE_TOO_CLOSE_CAMERA: '手机离脸太近了，稍微拿远一点点～',
  FACE_FAR_AWAY: '离镜头再近一点点，脸会更清晰～',
  NECK_LINE_TIP: '下巴稍微抬一点点，脖子线条会更修长～',
  COLLAR_STRAIGHTEN: '领口歪了，轻轻整理一下会更好看～',
  SHOULDER_RELAX: '肩膀放松往下沉，别端着，气质立刻提升～',
  ARM_AWAY_BODY: '手臂稍微离开身体，侧面会更显瘦～',
  SIT_STRAIGHT: '坐直了！弯腰驼背会显得没精神～',
  WAIST_HINT: '身体稍微前倾一点点，这样比例更好看～',
  HAND_HIP_TIP: '双手叉腰！这个姿势显瘦又有气场～',
  FINGER_TIPS: '手指轻轻合拢，比张开更优雅～',
  STAND_ONE_LEG: '站立时重心放一只脚，腿看起来更直更长～',
  // ========== 本次新增 TTS 场景 ==========
  MIRROR_ANGLE_HINT: '镜子稍微斜一点拍！角度不要正对镜子，会有反光～',
  INDOOR_GLASS_REFLECT: '玻璃有反光！稍微侧身躲开反光～',
  SCREEN_FILL_LIGHT: '用手机屏幕补光！白色背景对着脸，手机屏幕就是简易补光灯～',
  WINDOW_SIDE_POSITION: '脸朝向窗户！光源要在脸的正面或侧面～',
  STABILIZE_KNEE: '稍微弯一点膝盖，重心放低会更稳～',
  SUNGLASSES_REMOVE: '墨镜挡住了眼神！摘下来拍照，眼睛会更有神～',
  HAIR_TUCK_BEHIND: '头发挡脸了！轻轻拨到耳后，轮廓会更清晰～',
  COLLAR_ADJUST_TIP: '领口稍微整理一下！露出一边锁骨会更好看～',
  FACE_PARALLEL_WALL: '脸和墙壁平行！这样光线会更均匀～',
  NIGHT_FACE_TOO_DARK: '夜景脸太暗了！靠近光源或打开闪光灯补光～',
  STREET_NEON_FACE: '霓虹灯下超酷！让光打在侧脸上，表情放松一点～',
  RAINY_WINDOW_MIST: '雨天雾气蒙蒙的，窗户上有一层水汽超有氛围感～',
  TRAIN_WINDOW_LIGHT_TIP: '火车窗边光线均匀！靠窗坐，让光线打在脸上～',
  CINEMA_GLOW_HINT: '电影院里屏幕光打在脸上超有感觉！侧脸对着屏幕～',
  CROWD_AVOID_TIP: '旁边人多！等一下或者换个角度躲开路人～',
  PET_JUMP_HINT: '和宠物互动！蹲下来和它平视，自然的笑容最可爱～',
  BALLOON_PROP_TIP: '拿个气球当道具！活泼可爱，互动感十足～',
  BICYCLE_PROP_TIP: '靠在自行车旁边！活力十足，姿势也更丰富～',
  FLOWER_PROP_TIP: '拿束花当道具！捧着花或闻花香，自然又好看～',
  BOOK_PROP_TIP: '拿本书当道具！假装在看书，文艺感拉满～',
  // ========== 本次新增边缘场景提示 ==========
  FACE_LOOKING_DOWN_TOO_LONG: '抬起头看镜头！低头太久脖子会累，表情也看不见了～',
  FACE_SQUINTING_HARD: '眼睛眯太紧了！稍微放松一点，眯眼会显得没精神～',
  HAIR_EXTREMELY_MESSY: '头发太乱了！先理一下再拍，不然会抢戏～',
  SHOULDER_UNEVEN: '肩膀歪了！站直了双肩对齐，仪态更好看～',
  POSE_ARMS_WEIRD: '手臂姿势有点奇怪！自然垂下或叉腰就好，别僵着～',
  LEGS_CROOKED: '腿稍微站直一点，歪着显得没精神～',
  CHIN_TOO_UP: '下巴抬太高了！稍微收一点，下巴更尖～',
  CHIN_TOO_DOWN: '下巴收太多了！抬起来一点点，眼睛更有神～',
  EXPRESSION_FORCED: '表情别太夸张！自然一点最美～',
  GOOD_COMPOSITION_DETECTED: '构图很棒！就是这个位置，按下去！',
  PERFECT_MOMENT_NOW: '就是现在！这光这角度，绝了！',
  // ========== Round 5 新增：完美组合场景 ==========
  PERFECT_FACE_AND_LIGHT: '位置完美！光线也完美！就是现在，按下去就是大片！',
  PERFECT_ALL_IN_ONE: '构图完美！光线完美！姿势完美！三连击，按下去！',
  READY_TO_CAPTURE: '一切就绪！这个瞬间绝美，按快门！',
  CLICK_MOMENT: '现在光线好美！位置也对！赶紧按下去！',
  // 笑脸被检测到时的即时确认
  SMILE_DETECTED: '看到你在笑！就是这个表情，别动，按下去！',
  NATURAL_SMILE_DETECTED: '自然的笑容！好生动，按下去！',
  // ========== Round 6 新增：拍照引导提示 ==========
  SAY_CHEESE: '笑一个～茄子！',
  READY_POSE: '准备好了吗？三、二、一！',
  HOLD_STEADY_CAPTURE: '稳住！就是现在！',
  GROUP_FOTO_GUIDE: '大家靠近一点！看镜头，笑一个～',
  KEEP_STEADY_SHAKE: '手别抖！稳住～',
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
  // ========== Round 32 新增稳定性提示 ==========
  ELBOW_SUPPORT: '手臂贴近身体更稳！试试看～',
  TWO_HAND_GRIP: '双手握手机！会更稳更清晰～',
  BREATHE_IN_OUT: '深吸一口气，憋住，按快门～',
  RELAX_GRIP: '手机别握太紧！放松一点，手会更稳～',
  GROUND_STANCE: '双脚与肩同宽站好，稳稳的～',
  LOCK_ARMS: '手臂伸直锁住！比弯曲更稳～',
  // ========== Round 3 新增稳定性提示 ==========
  REST_ELBOW: '手臂靠在膝盖或桌子上，会稳很多～',
  SIT_DOWN_STABLE: '坐下来拍比站着拍更稳，靠着椅背试试～',
  USE_TIMER: '用定时拍照！放在桌面或稳定的地方，自己也能入镜～',
  // ========== Round 3 新增拍摄场景提示 ==========
  SUN_GLARE_SQUINT: '阳光太刺眼了！稍微侧身躲开强光，眼睛会更舒服～',
  GLASS_FACE_REFLECTION: '玻璃有反光！稍微侧身躲开脸上的反光～',
  MIRROR_CHECK_OUTFIT: '拍之前先检查一下镜子里！衣服领口都要整理好～',
  POSE_CONFIRM_OK: '姿势到位了！表情准备好了吗？笑一个～',
  POSE_MICRO_ADJUST: '就差一点点了！手的位置再微调一下～',
  // ========== Round 5 新增稳定性提示 ==========
  STABLE_READY: '稳稳的！可以按快门了～',
  STEADY_AND_GOOD: '手稳了！光线也棒，现在拍正好～',
  HOLD_FOR_MOMENT: '稳住！就这个瞬间，按下去！',
}

// 表情检测提示
const EXPRESSION_TIPS = {
  // ========== Round 5 新增表情提示 ==========
  LOOK_SIDE_SMILE: '假装看旁边再转头笑，自然又灵动～',
  HAND_ON_CHIN: '一只手托着下巴，显脸小的经典pose～',
  // ========== Round 3 新增表情动作提示 ==========
  ACT_SHAKE: '假装被什么东西吓到！这个表情好生动～',
  COUNT_SHEEP: '说"田七"！嘴型刚刚好，表情最自然～',
  HAND_WAVE_SOFT: '轻轻挥手打招呼！幅度不要太大，自然最美～',
  NOD_HEAD: '点点头配合微笑！头稍微动起来更有活力～',
  SHAKE_HAIR_POSE: '甩一下头发！自然又有动感，就是现在抓拍～',
  THINK_FUNNY: '想想最好笑的事！这个表情好自然～',
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
  // ========== Round 5 (hourly iter) 新增表情提示 ==========
  COLD_EXPRESSION: '表情稍微冷一点！嘴角不要上扬，眼神放空，超有气场～',
  TEASING_LOOK: '调皮地歪头，嘴角微微上扬，这个表情绝了！',
  LOOK_UP_GAZE: '抬头向上看，眼神更有灵气，这个角度超美～',
  LIP_BITE: '轻轻咬一下下唇，这个表情好撩人！',
  EYEBROW_RAISE: '轻轻抬一下眉毛，俏皮感立刻上来～',
  // ========== Round 5 新增表情提示 ==========
  GENUINE_SMILE: '这笑容好自然！比摆拍好看一百倍～',
  TEASING_SMILE: '调皮地笑一个！比正襟危坐好看多了～',
  CONFIDENT_SMILE: '自信的笑容最上镜！就是现在拍～',
  RELAXED_SMILE: '放松的笑好美！自然流露的表情最动人～',
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
  // ========== Round 3 新增场景提示 ==========
  PARK_BENCH_SUN: '公园长椅上光线斑驳！找个阳光直射的地方坐下～',
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
  // ========== 本次新增场景提示 ==========
  // 秋叶场景
  AUTUMN_LEAVES: '秋天落叶超有氛围！站在落叶中笑着拍一张～',
  AUTUMN_LEAVES_2: '银杏叶枫叶做前景，虚化后超有层次感！',
  // 楼梯场景
  STAIRWELL: '楼梯上光线从上往下打，侧身站着超有气场～',
  STAIRWELL_2: '楼梯俯拍显脸小！男朋友站高一点，你站低一点～',
  STAIRWELL_3: '坐在楼梯上拍照，超有生活感！',
  // 天台白天
  ROOFTOP_DAY: '天台白天光线充足！找个有阴影的角落，别让太阳直射～',
  ROOFTOP_DAY_2: '天台背景是城市天际线，侧身站着超有范儿！',
  ROOFTOP_DAY_3: '天台有风时拍动态抓拍，头发飘起来超灵动！',
  // 草原/牧场
  MEADOW_FIELD: '草原上光线超通透！站在草丛中，笑着看镜头～',
  MEADOW_FIELD_2: '草原逆光拍剪影超浪漫！转过身让阳光勾勒轮廓～',
  // 电梯
  ELEVATOR_INDOOR: '电梯里光线均匀！靠着墙壁站着，侧头微笑～',
  // 停车场景
  PARKING_LOT: '停车场背景超酷！站在车旁，酷酷地看镜头～',
  // 自行车道
  BIKE_LANE: '自行车道超有动感！站在路中央，笑着抓拍～',
  // 人行道
  WALKWAY_STREET: '人行道上光线均匀！随意站着，自然地看镜头～',
  // 温室/花房
  GREENHOUSE_FLOWER: '温室花房里光线超柔！站在花丛中，笑一个～',
  // 有轨电车
  TRAM_RIDE: '有轨电车里超有都市感！靠着车窗坐好，笑着看镜头～',
  // 渡轮甲板
  FERRY_DECK: '渡轮甲板上视野超开阔！背靠大海，笑一个～',
  // 飞机窗户
  AIRPLANE_WINDOW: '飞机窗户光线超柔和！侧身靠着窗，让光线打在侧脸上～',
  // 出租车内
  TAXI_RIDE: '出租车里也能拍出氛围感！靠在车窗边，让街灯打在脸上～',
  // 地铁末班车
  SUBWAY_NIGHT_LATE: '深夜地铁站灯光冷调超有都市感！靠着柱子，看向远方～',
  // 冰激凌店
  ICE_CREAM_PARLOR: '冰激凌店里光线暖暖的！捧着冰激凌，俏皮地看镜头～',
  // 街头美食
  STREET_FOOD_STALL: '街头美食摊超有烟火气！拿着小吃，笑着拍一张～',
  // 公交车上
  BUS_INTERIOR: '公交车里超有日常感！靠着车窗坐好，看向窗外笑一个～',
  // 滑雪缆车
  SKI_LIFT: '滑雪缆车上俯瞰雪山超美！靠着缆车门，让背景衬出气场～',
  // 停车场入口
  PARKING_GATE: '停车场入口有坡度超有动感！站着看镜头，笑容灿烂～',
  // 地下通道
  UNDERPASS_LIGHT: '地下通道光线有明暗对比！站在光影交界处，超有感觉～',
  // 天桥
  FOOTBRIDGE_CITY: '天桥上俯瞰城市超有视野！靠着栏杆，看向远方～',
  // 地铁末班
  LAST_TRAIN_NIGHT: '深夜末班车人少超有氛围！靠在座位上，看向窗外～',
  // 地铁站艺术墙
  SUBWAY_ART_WALL: '地铁站艺术墙前超有文化感！站在画作旁边，侧头微笑～',
  // 咖啡厅包间
  CAFE_BOOTH: '咖啡厅包间光线超柔和！靠在沙发上，笑着看镜头～',
  // 书店角落
  BOOKSTORE_CORNER: '书店角落光线柔和！靠在书架旁边，低头看书或抬头笑～',
  // 电影院
  CINEMA_LOBBY: '电影院大厅灯光暗调超有氛围！靠着海报墙，酷酷地看镜头～',
  // 机场候机
  AIRPORT_LOUNGE: '机场候机大厅超有旅行感！靠着登机口，笑着看向远方～',
  // 码头
  DOCK_SIDE: '码头岸边超有海洋感！站在码头边，让海风吹起头发～',
  // 灯塔
  LIGHTHOUSE_DOOR: '灯塔门口超有画面感！侧身站着，让灯塔做背景～',
  // 火车车窗
  TRAIN_WINDOW_LIGHT_2: '火车窗边光线超有旅途感！靠着窗坐，看向窗外笑一个～',
  // 海边礁石滩
  ROCKY_SHORE: '礁石滩上海浪拍打超有动感！站稳了，侧身看向大海～',
  // 码头栈桥
  PIER_WOODEN: '木栈桥延伸入海超有画面感！走在栈桥上，回眸一笑～',
  // 草原山坡
  HILLSIDE_MEADOW: '山坡草原超有开阔感！站在山坡上，笑着看向远方～',
  // 瀑布观景台
  WATERFALL_PLATFORM: '瀑布观景台雾气氤氲超有感觉！站在栏杆旁，笑一个～',
  // 竹林小道
  BAMBOO_PATH_2: '竹林小道光线斑驳超有诗意！走在小道里，自然地笑～',
  // 古道
  ANCIENT_TRAIL: '古道上超有历史感！靠着石碑或古树，侧头微笑～',
  // 樱花公园
  SAKURA_PARK: '樱花公园里光线斑驳超浪漫！站在樱花树下，抬头笑一个～',
  // 银杏大道
  GINKGO_AVENUE: '银杏叶金黄色超有秋日感！站在银杏树下，笑一个～',
  // 红叶山
  AUTUMN_MAPLE: '红叶满山超有秋日氛围！站在红叶丛中，笑着看镜头～',
  // 薰衣草田
  LAVENDER_FIELD: '薰衣草田里超有浪漫感！站在花丛中，侧头微笑～',
  // 葡萄园
  VINEYARD_ROW: '葡萄园里超有田园感！站在葡萄架下，笑着看镜头～',
  // 农场麦田
  WHEAT_FIELD: '麦田金黄色超有丰收感！站在麦田中，笑着看远方～',
  // 风力发电机
  WINDMILL_FIELD: '风车田里超有新能源感！站在风车下，笑着看镜头～',
  // 太阳能电站
  SOLAR_PANEL_FARM: '太阳能板田超有科技感！站在板列间，笑着看镜头～',
  // 机场跑道
  RUNWAY_VIEW: '机场跑道视野超开阔！靠着围栏，看向远方的飞机～',
  // 体育馆看台
  STADIUM_SEATS: '体育馆看台超有运动感！坐在看台上，笑着看镜头～',
  // 游泳池边
  POOL_EDGE: '泳池边光线充足超有夏感！靠着泳池边，笑着看镜头～',
  // 温泉池边
  ONSEN_POOL: '温泉池边超有治愈感！靠在池边，让蒸汽打在脸上～',
  // 露营篝火
  CAMPFIRE_NIGHT: '篝火边超有温馨感！围坐篝火旁，让火光打在脸上～',
  // 星空露营
  CAMPING_STARS: '露营帐篷外星空璀璨超浪漫！仰头看星空，笑一个～',
  // 丛林小溪
  FOREST_STREAM: '丛林小溪流水潺潺超有自然感！站在溪边，笑着看镜头～',
  // 溶洞
  CAVE_ENTRANCE: '溶洞入口超有神秘感！站在洞口，让光线打在侧脸上～',
  // 古镇石桥
  STONE_BRIDGE: '古镇石桥超有年代感！站在桥上，笑着看镜头～',
  // 老街巷子
  OLD_STREET_LANE: '老街巷子里超有市井感！靠着老墙，侧头微笑～',
  // 红灯笼街
  LANTERN_STREET: '红灯笼街道超有过年氛围！站在灯笼下，笑着看镜头～',
  // 夜宵摊
  NIGHT_STALL_FOOD: '夜宵摊烟火气十足超有生活感！拿着小吃，笑着拍～',
  // 24小时便利店
  CONVENIENCE_24H: '24小时便利店全天光线均匀！站在货架前，俏皮地看镜头～',
  // 自动贩卖机前
  VENDING_MACHINE: '自动贩卖机前光线冷白超有都市感！拿着饮料，笑着看镜头～',
  // 加油站
  GAS_STATION: '加油站便利店里超有旅途感！靠着货架，笑着看镜头～',
  // 高速服务区
  HIGHWAY_REST_AREA: '高速服务区超有旅途感！站在服务区，笑着拍一张～',
  // 港口集装箱
  CONTAINER_PORT: '集装箱码头超有工业感！站在彩色集装箱前，酷酷地看镜头～',
  // 造船厂
  SHIPYARD: '造船厂里超有工业风！站在船舶旁，笑着看镜头～',
  // 废弃工厂
  ABANDONED_FACTORY: '废弃工厂超有废墟感！靠着锈迹斑斑的墙，酷酷地看镜头～',
  // 涂鸦隧道
  GRAFFITI_TUNNEL: '涂鸦隧道超有街头感！站在涂鸦墙前，笑着看镜头～',
  // 城市雕塑
  CITY_SCULPTURE: '城市雕塑前超有艺术感！站在雕塑旁边，侧头微笑～',
  // 喷泉广场
  FOUNTAIN_SQUARE: '喷泉广场超有都市感！靠着喷泉边，笑着看镜头～',
  // 图书馆阅览室
  LIBRARY_READING_ROOM: '图书馆阅览室超有文艺感！坐在书桌前，笑着看镜头～',
  // 学校教室
  SCHOOL_CLASSROOM: '教室里超有青春感！站在课桌旁，笑着看镜头～',
  // 大学校园草坪
  CAMPUS_LAWN: '大学校园草坪超有青春感！坐在草坪上，笑着看镜头～',
  // 实验室
  LABORATORY: '实验室里超有科技感！靠在实验台旁，笑着看镜头～',
  // 琴房
  MUSIC_ROOM: '琴房里超有音乐感！坐在钢琴前，笑着看镜头～',
  // 舞蹈室
  DANCE_STUDIO: '舞蹈室里超有活力感！靠着把杆，笑着看镜头～',
  // 拳击台
  BOXING_RING: '拳击台上超有力量感！靠在围绳上，酷酷地看镜头～',
  // 保龄球馆
  BOWLING_ALLEY: '保龄球馆灯光超有氛围感！站在球道旁，笑着看镜头～',
  // 桌球厅
  BILLIARDS_ROOM: '桌球厅灯光暗调超有绅士感！靠在球桌旁，笑着看镜头～',
  // 网吧
  INTERNET_CAFE: '网吧里超有电竞感！坐在电脑前，笑着看镜头～',
  // 纹身店
  TATTOO_STUDIO: '纹身店里超有个性感！靠着纹身椅，酷酷地看镜头～',
  // 美甲店
  NAIL_SALON: '美甲店里光线超柔和！坐着做美甲，笑着看镜头～',
  // 理发店
  BARBERSHOP: '理发店里光线均匀！靠着镜子，笑着看镜头～',
  // 裁缝店
  TAILOR_SHOP: '裁缝店里超有手工感！靠着布料架，笑着看镜头～',
  // 古董店
  ANTIQUE_SHOP: '古董店里超有年代感！站在古董架旁，侧头微笑～',
  // 花鸟市场
  BIRD_MARKET: '花鸟市场超有生活感！站在花丛中，笑着看镜头～',
  // 菜市场
  WET_MARKET: '菜市场里超有烟火气！站在菜摊旁，笑着看镜头～',
  // 批发市场
  WHOLESALE_MARKET: '批发市场里超有市井感！站在摊位旁，笑着看镜头～',
  // 奥特莱斯
  OUTLET_STORE: '奥特莱斯超有购物感！靠着名牌墙，笑着看镜头～',
  // 游乐场商店
  AMUSEMENT_GIFT_SHOP: '游乐场商店里超有欢乐感！拿着纪念品，笑着看镜头～',
  // 海洋馆
  AQUARIUM_TANK: '水族馆大鱼缸前超有梦幻感！站在玻璃前，笑着看镜头～',
  // 动物园长颈鹿区
  ZOO_GIRAFFE_2: '长颈鹿区超有非洲感！靠近围栏，笑着看镜头～',
  // 熊猫馆
  PANDA_EXHIBIT: '熊猫馆里超有国宝感！站在熊猫玩偶旁，笑着看镜头～',
  // 水上乐园
  WATER_SLIDE: '水上乐园滑道超有动感！站在滑道顶端，笑着看镜头～',
  // 滑雪场缆车
  SKI_LIFT_SNOW: '滑雪缆车上俯瞰雪景超浪漫！靠着缆车门，笑着看远方～',
  // 冰雕展
  ICE_SCULPTURE: '冰雕展里超有冰雪感！站在冰雕旁，笑着看镜头～',
  // 灯会
  LANTERN_FESTIVAL_LIGHT: '灯会现场超有过节感！站在花灯下，笑着看镜头～',
  // 元宵灯谜
  LANTERN_RIDDLE: '元宵灯谜会超有传统文化感！站在灯笼旁，笑着看镜头～',
  // 庙会
  TEMPLE_FAIR: '庙会超有过年氛围！站在摊位旁，笑着看镜头～',
  // 清明踏青
  SPRING_OUTING: '清明踏青超有春日感！站在草地旁，笑着看远方～',
  // 端午赛龙舟
  DRAGON_BOAT: '端午节赛龙舟超有传统感！站在江边，笑着看镜头～',
  // 中秋赏月
  MID_AUTUMN_MOON: '中秋赏月超有团圆感！站在月光下，笑着看镜头～',
  // 重阳登高
  DOUBLE_NINTH: '重阳登高超有传统感！站在山顶，笑着看远方～',
  // 除夕烟花
  NEW_YEAR_EVE: '除夕烟花超有过年氛围！站在烟花下，笑着看镜头～',
  // 跨年倒数
  NEW_YEAR_COUNTDOWN: '跨年倒数超有仪式感！站在人群中，笑着看镜头～',
  // 情人节
  VALENTINE_DATE: '情人节约会超有甜蜜感！靠着男友，笑着看镜头～',
  // 520表白日
  LOVE_DAY: '520表白日超有甜蜜感！站在爱心装饰旁，笑着看镜头～',
  // 毕业季
  GRADUATION_SEASON: '毕业季超有青春感！穿着学士服，笑着看镜头～',
  // 开学季
  SCHOOL_START: '开学季超有新学期感！站在校门口，笑着看镜头～',
  // 万圣节
  HALLOWEEN_NIGHT: '万圣节超有节日感！戴着南瓜灯，笑着看镜头～',
  // 感恩节
  THANKSGIVING: '感恩节超有温馨感！靠着南瓜装饰，笑着看镜头～',
  // 圣诞节平安夜
  CHRISTMAS_EVE: '圣诞节平安夜超有节日感！站在圣诞树旁，笑着看镜头～',
  // 元旦
  NEW_YEAR_DAY: '元旦新的一年超有希望感！站在新年的第一道光里，笑着看镜头～',
  // 生日惊喜
  BIRTHDAY_PARTY: '生日派对超有庆祝感！站在气球旁，笑着看镜头～',
  // 订婚典礼
  ENGAGEMENT_DAY: '订婚典礼超有甜蜜感！戴着订婚戒指，笑着看镜头～',
  // 婚礼现场
  WEDDING_DAY: '婚礼现场超有幸福感动！站在花门下，笑着看镜头～',
  // ========== Round 3 新增场景提示 ==========
  WINDOW_SEAT_SUNSET: '靠窗位置的夕阳光线超温柔！这个角度绝了～',
  // 蜜月旅行
  HONEYMOON: '蜜月旅行超有甜蜜感！站在异国风景前，笑着看镜头～',
  // ========== Round 32 新增场景提示 ==========
  // 春季踏青
  SPRING_FIELD: '春天踏青超有活力感！站在草地旁，笑着看远方～',
  // 樱花季补充
  CHERRY_RAIN: '樱花树下光线斑驳！风吹过来的时候按下快门，绝美～',
  // 海边日落
  SEASIDE_SUNSET: '海边日落光线超美！侧身站着让夕阳打在侧脸上～',
  // 雨天室内
  INDOOR_RAINY: '雨天室内窗边超有氛围！让窗户的光打在侧脸上～',
  // 健身房补充
  GYM_EQUIPMENT: '健身房器械区超有运动感！侧身站着，笑着看镜头～',
  // ========== Round 3 新增场景专项提示 ==========
  GYM_LOCKER: '更衣室镜子前光线均匀！打开闪光灯拍一张～',
  // 咖啡馆补充
  CAFE_CUP: '咖啡馆光线暖暖的！捧着咖啡，侧头看镜头～',
  // 街头夜景
  URBAN_NIGHT: '街头夜景灯光好美！靠近灯光站着，超有都市感～',
  // 草原补充
  FIELD_SUNSET: '草原日落超有开阔感！站在草丛中，笑着看远方～',
  // ========== Round 34 新增场景提示 ==========
  // 新年氛围场景
  SPRING_FESTIVAL: '新年氛围感满满！红灯笼和中国结做背景，超有过年感觉～',
  NEW_YEAR_EVE_TIP: '除夕夜烟花璀璨！打开闪光灯，在烟火下笑着拍一张～',
  // 春季踏青场景
  SPRING_OUTING_TIP: '春天踏青超有活力！站在草地旁，笑着看向远方～',
  // 春季花季场景
  FLOWER_FIELD: '花田里光线斑驳！站在花丛前面，自然微笑看向镜头～',
  // 古镇水乡场景
  WATER_TOWN: '古镇水乡超有诗意！站在小桥上，笑着看镜头～',
  // 沙漠场景
  DESERT_DUNES: '沙漠里光线超通透！站在沙丘上，笑着看向远方～',
  // 峡谷场景
  CANYON_VIEW: '峡谷里超有壮阔感！站在崖边，笑着看镜头～',
  // 瀑布场景
  WATERFALL_MIST: '瀑布雾气氤氲超有感觉！站在栏杆旁，笑一个～',
  // 游艇场景
  YACHT_DECK: '游艇甲板上视野超开阔！背靠大海，笑一个～',
  // 摩天大楼观景台
  SKYSCRAPER_VIEW: '摩天大楼俯瞰城市超有视野！靠着玻璃墙，看向远方～',
  // 博物馆展厅
  MUSEUM_HALL: '博物馆展厅灯光适合拍照！站在展品旁，侧头微笑～',
  // 音乐节主舞台
  FESTIVAL_MAIN_STAGE: '音乐节舞台超嗨！跟着节奏摇摆，表情夸张灿烂！',
  // 创意市集
  CREATIVE_MARKET: '创意市集超有活力！站在摊位旁，笑着看镜头～',
  // 艺术街区涂鸦墙
  STREET_ART_WALL: '涂鸦墙前超有街头感！侧身站着，酷酷地看镜头～',
  // 樱花雨实时抓拍
  CHERRY_RAIN_CATCH: '樱花飘落的时候按下快门！这个瞬间最浪漫～',
  // 雨中街景
  RAINY_STREET: '雨天街道超有氛围！找个有积水的角落，倒影超美～',
  // 雨后彩虹
  RAINBOW_AFTER_RAIN: '雨后彩虹超浪漫！侧身站着，让彩虹做背景～',
  // 星空延时
  STAR_TRAILS: '星空下超有浪漫感！仰头让星星落在眼睛里～',
  // 清晨湖泊
  LAKE_SUNRISE: '清晨湖面平静如镜！站在湖边，让水面反射光线～',
  // 黄昏剪影
  SUNSET_SILHOUETTE: '黄昏逆光剪影超有意境！转过身让阳光勾勒轮廓～',
  // 秋季枫叶
  AUTUMN_MAPLE_TIP: '枫叶红了超有秋日感！站在红叶丛中，笑一个～',
  // 银杏大道
  GINKGO_GOLDEN: '银杏叶金黄超浪漫！站在银杏树下，笑一个～',
  // 初雪场景
  FIRST_SNOW: '初雪超浪漫！站在雪中，让雪花落在发丝上～',
  // 冰雕展
  ICE_SCULPTURE_TIP: '冰雕展里超有冰雪感！站在冰雕旁，笑着看镜头～',
  // 圣诞夜
  CHRISTMAS_NIGHT: '圣诞夜灯光超有节日感！站在圣诞树旁，笑着看镜头～',
  // 元宵灯会
  LANTERN_FESTIVAL_TIP: '元宵灯会超有过节感！站在花灯下，笑着看镜头～',
  // 端午节
  DRAGON_BOAT_TIP: '端午节赛龙舟超有传统感！站在江边，笑着看镜头～',
  // 中秋月圆
  MID_AUTUMN_TIP: '中秋赏月超有团圆感！站在月光下，笑着看镜头～',
  // 重阳登高
  DOUBLE_NINTH_TIP: '重阳登高超有传统感！站在山顶，笑着看远方～',
  // 毕业典礼
  GRADUATION_DAY: '毕业典礼超有青春感！穿着学士服，笑着看镜头～',
  // 订婚典礼
  ENGAGEMENT_TIP: '订婚典礼超有甜蜜感！戴着戒指，笑着看镜头～',
  // 蜜月旅行
  HONEYMOON_TIP: '蜜月旅行超有甜蜜感！站在异国风景前，笑着看镜头～',
  // 健身打卡
  GYM_CHECKIN: '健身打卡超有活力！侧身站着，笑着看镜头～',
  // 瑜伽练习
  YOGA_SESSION: '瑜伽姿势超有气质！舒展身体，慢慢来～',
  // 舞蹈练习
  DANCE_PRACTICE: '舞蹈动作舒展超有美感！跟着节奏动起来～',
  // 乐队排练
  BAND_PRACTICE: '乐队排练超有音乐感！靠着乐器，笑着看镜头～',
  // 烹饪时光
  COOKING_TIME: '烹饪时光超有生活感！端着料理，笑着看镜头～',
  // 下午茶时光
  AFTERNOON_TEA: '下午茶时光超有小资情调！捧着茶杯，笑着看镜头～',
  // 红酒品鉴
  WINE_TASTING: '红酒品鉴超有格调！举杯碰一下，笑着看镜头～',
  // 书房阅读
  STUDY_ROOM: '书房阅读超有文艺感！坐在书桌前，笑着看镜头～',
  // 阳台花园
  BALCONY_GARDEN: '阳台花园超有生活感！站在花草中间，笑着看镜头～',
  // 露台烧烤
  ROOFTOP_BBQ: '露台烧烤超有烟火气！举着烤串，笑着看镜头～',
  // 帐篷露营
  CAMPING_NIGHT: '露营帐篷外星空璀璨超浪漫！仰头看星空，笑一个～',
  // 篝火晚会
  CAMPFIRE_TIP: '篝火边超有温馨感！围坐篝火旁，让火光打在脸上～',
  // 骑马体验
  HORSEBACK_RIDING: '骑马体验超有自由感！靠在马旁，笑着看镜头～',
  // 温泉泡汤
  ONSEN_RELAX: '温泉蒸汽超有治愈感！靠在池边，让蒸汽打在脸上～',
  // 海底世界
  UNDERWATER_WORLD: '水族馆大鱼缸前超梦幻！站在玻璃前，笑着看镜头～',
  // 动物园互动
  ZOO_FEEDING: '动物园互动超有童趣！靠近围栏，笑着看镜头～',
  // 农场体验
  FARM_VISIT: '农场田园超有清新感！站在田埂上，笑着看镜头～',
  // 葡萄园采摘
  VINEYARD_VISIT: '葡萄园里超有田园感！站在葡萄架下，笑着看镜头～',
  // 滑雪新手
  SKI_BEGINNER: '滑雪新手超有勇气！站在雪道上，笑着看镜头～',
  // 滑板体验
  SKATEBOARDING: '滑板公园超酷！靠着栏杆，酷酷地看镜头～',
  // 冲浪体验
  SURFING: '冲浪超有动感！站在冲浪板上，笑着看镜头～',
  // 潜水体验
  SNORKELING: '潜水体验超有探索感！在水边，笑着看镜头～',
  // 蹦极体验
  BUNGEE_JUMPING: '蹦极超有勇气！跳之前笑着拍一张，超酷～',
  // 热气球体验
  HOT_AIR_BALLOON: '热气球上俯瞰大地超浪漫！靠在篮子边，笑着看镜头～',
  // 飞机驾驶舱
  COCKPIT_VIEW: '飞机驾驶舱超有科技感！靠在舱门边，看向远方～',
  // 火车站台
  TRAIN_PLATFORM: '火车站台超有旅途感！靠着柱子，看向远方～',
  // 地铁末班
  SUBWAY_LAST: '深夜地铁站灯光冷调超有都市感！靠着柱子，看向远方～',
  // 公交车站
  BUS_STOP_TIP: '公交站日常感满满！靠着站牌，笑着看远方～',
  // 机场安检
  AIRPORT_SECURITY: '机场安检区域超有旅途感！笑着看镜头～',
  // 停车场
  PARKING_LOT_TIP: '停车场超酷！站在车旁，酷酷地看镜头～',
  // 便利店深夜
  CONVENIENCE_LATE: '24小时便利店深夜超有都市感！站在货架前，俏皮看镜头～',
  // 夜宵摊烟火
  LATE_NIGHT_FOOD: '夜宵摊烟火气超有生活感！拿着小吃，笑着拍～',
  // 自动贩卖机
  VENDING_MACHINE_TIP: '自动贩卖机前超有都市感！拿着饮料，笑着看镜头～',
  // 十字路口
  CROSSROADS: '十字路口超有都市感！靠着红绿灯，看向远方～',
  // 天桥夜色
  FOOTBRIDGE_NIGHT: '天桥上俯瞰城市超有视野！靠着栏杆，看向远方～',
  // 地下通道
  UNDERPASS_TIP: '地下通道超有都市感！站在光影交界处，超有感觉～',
  // 电梯内部
  ELEVATOR_TIP: '电梯里光线均匀！靠着墙壁站着，侧头微笑～',
  // 旋转楼梯
  SPIRAL_STAIRS: '旋转楼梯超有设计感！侧身站着，超有气场～',
  // 古建筑大门
  ANCIENT_DOOR: '古镇大门超有年代感！靠着门框，笑着看镜头～',
  // 拱形走廊
  ARCHED_CORRIDOR: '拱形走廊超有异域感！站在走廊里，笑着看镜头～',
  // 红灯笼街道
  RED_LANTERN_STREET: '红灯笼街道超有过年氛围！站在灯笼下，笑着看镜头～',
  // 樱花大道
  SAKURA_AVENUE: '樱花大道超浪漫！走在花路里，笑着看镜头～',
  // 竹林小道
  BAMBOO_PATH_TIP: '竹林小道光线斑驳超有诗意！走在小道里，自然地笑～',
  // 荷塘月色
  LOTUS_POND: '荷塘边超有诗意！站在荷塘旁，笑着看镜头～',
  // 芦苇荡
  REED_FIELD: '芦苇荡超有秋日感！站在芦苇丛中，笑着看远方～',
  // 海岸灯塔
  COASTAL_LIGHTHOUSE: '海岸灯塔超有画面感！站在灯塔旁，让海风吹起头发～',
  // 礁石海浪
  ROCKY_COAST: '礁石上浪花拍打超有动感！站稳了，侧身看向大海～',
  // 沙滩日落
  BEACH_SUNSET_TIP: '沙滩日落光线超美！侧身站着让夕阳打在侧脸上～',
  // 码头渔船
  FISHING_BOAT: '码头渔船超有渔村感！站在船旁，笑着看镜头～',
  // 港口集装箱
  CONTAINER_YARD: '集装箱码头超有工业感！站在彩色集装箱前，酷酷看镜头～',
  // 废弃铁路
  ABANDONED_RAILWAY: '废弃铁路超有废墟感！走在铁轨上，笑着看镜头～',
  // 艺术装置
  ART_INSTALLATION: '艺术装置前超有艺术感！站在装置旁边，侧头微笑～',
  // 喷泉广场
  FOUNTAIN_TIP: '喷泉广场超有都市感！靠着喷泉边，笑着看镜头～',
  // 学校操场
  SCHOOL_PLAYGROUND: '学校操场超有青春感！站在跑道旁，笑着看镜头～',
  // 大学校园
  CAMPUS_LIFE: '大学校园超有青春感！站在校门或图书馆前，笑着看镜头～',
  // 实验室
  LABORATORY_TIP: '实验室里超有科技感！靠在实验台旁，笑着看镜头～',
  // 琴房
  PIANO_ROOM: '琴房里超有音乐感！坐在钢琴前，笑着看镜头～',
  // 舞蹈教室
  DANCE_STUDIO_TIP: '舞蹈教室里超有活力感！靠着把杆，笑着看镜头～',
  // 保龄球馆
  BOWLING_TIP: '保龄球馆灯光超有氛围感！站在球道旁，笑着看镜头～',
  // 桌球厅
  BILLIARDS_TIP: '桌球厅灯光暗调超有绅士感！靠着球桌旁，笑着看镜头～',
  // 溜冰场
  ICE_RINK: '溜冰场超有动感！靠着围栏，笑着看镜头～',
  // 射击馆
  SHOOTING_RANGE: '射击馆超有个性感！拿着道具，酷酷地看镜头～',
  // 密室逃脱
  ESCAPE_ROOM: '密室逃脱超有神秘感！靠着墙壁，笑着看镜头～',
  // 剧本杀
  MURDER_MYSTERY: '剧本杀超有沉浸感！穿着戏服，笑着看镜头～',
  // 温泉度假村
  RESORT_ONSEN: '温泉度假村超有度假感！靠在池边，笑着看镜头～',
  // 别墅庭院
  VILLA_GARDEN: '别墅庭院超有品质感！站在花园里，笑着看镜头～',
  // 屋顶派对
  ROOFTOP_PARTY_TIP: '屋顶派对超有都市感！靠着栏杆，笑着看镜头～',
  // 水上乐园
  WATER_SLIDE_TIP: '水上乐园超有夏感！站在滑道顶端，笑着看镜头～',
  // 冰雪世界
  ICE_WORLD: '冰雪世界超有梦幻感！站在冰雕旁，笑着看镜头～',
  // 音乐节露营
  FESTIVAL_CAMPING: '音乐节露营超有青春感！围坐帐篷旁，笑着看镜头～',
  // 公路旅行
  ROAD_TRIP: '公路旅行超有自由感！站在公路旁，笑着看远方～',
  // 房车营地
  RV_CAMPING: '房车营地超有生活感！站在房车旁，笑着看镜头～',
  // 直升机停机坪
  HELIPAD_VIEW: '直升机停机坪俯瞰城市超有视野！靠着围栏，看向远方～',
  // 热气球节
  BALLOON_FESTIVAL: '热气球节超有色彩感！站在热气球旁，笑着看镜头～',
  // 音乐节彩灯
  MUSIC_LIGHTS: '音乐节彩灯超有动感！跟着灯光摇摆，笑着抓拍～',
  // ========== 本次新增场景提示 ==========
  // 海边场景
  // ========== 本次新增场景提示 ==========
  // 海边场景
  BEACH_WIND_HAIR: '海边风大头发乱，先理一下再拍，或者让风吹着也很有氛围～',
  BEACH_SUN_REFLECT: '沙滩上光线反射强，戴墨镜或找阴影处，不然眼睛睁不开～',
  // 美食场景
  FOOD_TOP_DOWN: '俯拍美食角度超棒！让男朋友站高一点，俯拍桌面～',
  FOOD_SIDE_LIGHT: '餐厅找靠窗位置！自然光打在食物上，色泽更诱人～',
  FOOD_WARM_AMBIENT: '暖色调餐厅光线最适合拍美食！让食物靠近光源～',
  // 集市/夜市场景
  MARKET_NIGHT: '夜市灯光超有烟火气！找个光源站好，表情会更清晰～',
  MARKET_STALL_LIGHT: '摊位灯光打在脸上，让男朋友稍微侧一下躲开顶光～',
  // 雪场景
  SNOW_SUNNY: '雪天阳光强烈！戴墨镜或找阴影处，眼睛才不会眯起来～',
  SNOW_SUNNY_2: '雪地背景白茫茫，衣服穿深色更显瘦更突出～',
  SNOW_SUNNY_3: '雪天户外手冷，拍照前先暖手，握手机才能稳～',
  // 天台夜景
  ROOFTOP_NIGHT_NEW: '天台夜景好浪漫！打开闪光灯补补光，背景灯光才不会被压暗～',
  ROOFTOP_NIGHT_NEW_2: '天台风大站稳了！双手握手机再拍～',
  // 健身房场景
  GYM_ACTION: '健身房动感单车超有活力！身体微微前倾，看向镜头笑着拍～',
  GYM_MIRROR: '健身镜前光线均匀，侧身站着笑着拍，运动感十足～',
  // 咖啡馆场景
  CAFE_WINDOW_NEW: '咖啡馆靠窗位置光线最好！坐窗边拍，让自然光打在脸上～',
  CAFE_WINDOW_NEW_2: '咖啡馆暖光很柔和，让脸稍微靠近窗户光会更通透～',
  CAR_MIRROR: '对着车内后视镜自拍！角度刚刚好，背景也好控制～',
  // ========== 本次新增场景提示 ==========
  // 毕业场景
  GRADUATION_ROBE: '毕业袍配学士帽超有纪念感！背景选校园地标，笑一个～',
  GRADUATION_HAT_TOSS: '抛帽瞬间超有活力！连拍几张，总有一张完美～',
  GRADUATION_GROUP: '毕业合照大家靠近贴贴，画面更温馨～',
  // 圣诞/节日场景
  CHRISTMAS_LIGHTS: '圣诞灯饰超有节日氛围！靠近灯串站，让光打在脸上～',
  CHRISTMAS_TREE: '圣诞树前光线暖暖的！侧身站着，节日感拉满～',
  // 动物园场景
  ZOO_ENCLOSURE: '动物园背景杂乱，试试虚化背景让人更突出～',
  ZOO_LIGHTING: '动物园室内灯光偏暗偏蓝，靠近窗户或开闪光灯～',
  // 古镇老街场景
  ANCIENT_TOWN_STREET: '古镇老墙做背景超有年代感！侧身站立更有氛围～',
  ANCIENT_TOWN_LANTERN: '古镇红灯笼街道超有过年氛围！站在灯笼下笑一个～',
  // 地铁站场景
  SUBWAY_STATION_HALL: '地铁站厅光线均匀！靠着柱子，看向远方，文艺日常～',
  SUBWAY_ESCALATOR_MOVE: '扶手电梯上光线冷调！靠着扶手，自然地看镜头～',
  // 超市便利店场景
  SUPERMARKET_AISLE: '拿个零食饮料当道具！俏皮可爱，互动感十足～',
  SUPERMARKET_LIGHT: '便利店冰柜前光线冷白！拿瓶饮料，笑着看镜头～',
  // 泳池/水上场景
  POOL_LIGHTS: '泳池灯光好梦幻！开闪光灯拍一张，水光超美～',
  POOL_SIDE_LIGHT: '泳池边光影好漂亮！坐在池边看镜头笑～',
  // 摩天轮场景
  FERRIS_WHEEL: '摩天轮里光线柔和！对着窗户，让城市做背景超浪漫～',
  FERRIS_WHEEL_NIGHT: '摩天轮夜景超浪漫！打开闪光灯拍一张～',
  // 嘉年华/游乐场景
  CARNIVAL_LIGHTS: '游乐园灯光超梦幻！站在旋转木马前，氛围感拉满～',
  CARNIVAL_FERRIS: '游乐园里超嗨！举高双手跟着音乐摇摆，表情夸张灿烂～',
  // 舞台表演场景
  DANCE_STAGE_LIGHT: '舞台灯光超有感觉！抬头看灯拍一张，光影绝绝子～',
  // 机场/车站场景
  AIRPORT_TERMINAL: '机场候机楼光线均匀！靠着大屏幕背景，超有都市感～',
  STATION_PLATFORM: '火车站台视野开阔！背对火车，让男生拍一张～',
  // 露营场景
  CAMPFIRE_NIGHT_VOICE: '篝火火光打在脸上好温暖！连拍几张选最好的～',
  TENT_OUTSIDE: '帐篷外星空璀璨超浪漫！仰头看星空，笑一个～',
  // ========== Round 5 新增场景提示 ==========
  WEDDING_CHOIR: '婚礼现场光线超美！站在蜡烛或灯光旁，超有氛围感～',
  WEDDING_CAKE: '蛋糕前光线暖暖的！转过来面向光源，笑一个～',
  PROM_NIGHT: '毕业舞会灯光超梦幻！站在灯下超有感觉～',
  BALLROOM_DANCE: '舞会厅灯光斑驳！身体舒展，笑着拍一张～',
  BEACH_SUNRISE: '海边日出光线最柔和！迎着朝霞，整个人都在发光～',
  PARK_FOUNTAIN: '喷泉旁光线超通透！水雾打在脸上好梦幻～',
  KITE_FESTIVAL: '风筝节草地超开阔！风吹着头发，跑动抓拍超有活力～',
  ART_MUSEUM: '艺术馆灯光超有氛围！站在画作前，文艺感拉满～',
  NIGHT_CANDLE_DINNER: '烛光晚餐超浪漫！让烛光打在侧脸上，氛围感绝了～',
  TRAIN_WINDOW_VOICE: '火车旅途超有故事感！靠在窗边，让窗光打在脸上～',
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
  // ========== Round 32 新增夜景提示 ==========
  NIGHT_STREET_FOOD: '夜市灯光超有烟火气！找个光源站好，表情会更清晰～',
  NIGHT_GARDEN: '花园夜景灯光超浪漫！靠近灯光站着，超有氛围～',
  NIGHT_POOL: '泳池灯光好梦幻！开闪光灯拍一张～',
  NIGHT_BALCONY: '阳台夜灯超柔和！靠着栏杆，笑着拍一张～',
  NIGHT_STROLL: '街头路灯下光线均匀！走着抓拍，自然又生动～',
  NIGHT_SUBWAY: '地铁站灯光冷调超有都市感！靠着柱子，看向远方～',
  NIGHT_PARTY: '天台派对灯光璀璨！让灯光打在侧脸上，表情会更立体～',
  NIGHT_CANDLE: '阳台烛光超浪漫！让烛光打在脸上，温柔感拉满～',
  NIGHT_CAR: '车窗外的夜景好美！侧身靠着车窗，让灯光打在侧脸上～',
  // ========== Round 39 新增夜景提示 ==========
  NIGHT_STABLE_COUNT: '晚上好美，注意保持稳定！我来帮你数，一、二、三～',
  NIGHT_STABLE_COUNT_2: '夜景光线柔和，稳住手哦！一、二、三，按！',
  NIGHT_TRIPOD_HINT: '晚上光线暗，打开闪光灯或者找个支撑点会更清晰～',
}

// ========== Round 39 新增：摄像头使用场景提示 ==========
const CAMERA_USAGE_TIPS = {
  HESITATION_LOW_ANGLE: '想好了吗？可以尝试从低角度往上拍，仰拍超显腿长～',
  HESITATION_10S: '想好怎么拍了吗？别犹豫，先拍一张试试～',
  FRONT_CAMERA_SWITCH: '试试用后置摄像头，画质更好哦～',
  FRONT_CAMERA_QUALITY: '后置摄像头像素更高，让男朋友拿手机拍更清晰～',
  BACKLIGHT_TIP: '有点逆光，试试换个角度或者靠近一点光源～',
  BACKLIGHT_TIP_2: '逆光时脸会变黑，侧身站或者换个方向避开直射光～',
  // ========== Round 40 新增场景提示 ==========
  ROOFTOP_PARK: '天台花园超有情调！站在花草中间，笑一个～',
  UNDERGROUND_PARKING: '地下车库光线冷调超有都市感！靠着柱子，看向远方～',
  CARGO_SHIP: '港口货轮超有工业感！站在集装箱旁，酷酷地看镜头～',
  SKYSCRAPER_LOBBY: '摩天大楼大堂超有都市感！靠着玻璃墙，看向远方～',
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
  // ========== Round 34 新增构图提示 ==========
  EDGE_CROWDING: '人太靠近边框了！稍微退后一点，画面更舒展～',
  CENTER_SPLIT: '人正好在正中间显得有点呆，稍微往左或右挪一点～',
  WEIGHT_IMBALANCE: '画面重心不稳！把主体稍微偏移一点试试～',
  LEADING_ROOM_LEFT: '人脸的视线方向要留白，让她看向留白更多的一边～',
  ASPECT_PORTRAIT: '竖着拍人像！竖图更显瘦，背景更干净～',
  ASPECT_LANDSCAPE: '换横图拍！横图能收入更多背景，更有故事感～',
  ASPECT_SQUARE: '试试方图！方图很文艺，朋友圈很受欢迎～',
  FILL_VERTICAL_WHOLE: '竖图拍全身！脚底贴着底部，头顶留白三分之一～',
  EYE_LINE: '眼睛连线要水平！歪了会显得画面不稳～',
  RULE_SIXTHS: '试试六分法！比九宫格更精准，人在六分线附近～',
  GOLDEN_TRIANGLE: '试试黄金三角构图！对角线划分画面，主体在交点～',
  // ========== Round 34 新增光线提示 ==========
  BACKLIGHT_SOFTEN: '逆光脸太暗！侧身让光从侧面打过来～',
  TOP_LIGHT_SOFTEN: '顶光阴影重！找个侧光或往前站一点躲开顶光～',
  MIXED_LIGHT_FIX: '两种光混在一起脸会花！只朝向一种光源～',
  SCREEN_LIGHT_HACK: '手机屏幕对着脸补光！白色背景就是简易补光灯～',
  GOLDEN_HOUR_NOW: '现在是黄金时段！赶紧拍，光线超美～',
  BLUE_HOUR_NOW: '蓝色时刻超浪漫！赶紧拍，光线绝绝子～',
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
  // ========== 本次新增鼓励语 ==========
  '光线层次分明，这张像杂志大片！',
  '男朋友构图越来越有想法了！',
  '表情和光线都在线，这张绝了！',
  '男友视角越来越专业，这张要收藏！',
  '男朋友的进步速度太快了，这张太惊艳了！',
  '逆光剪影好有意境，男朋友你开窍了！',
  '虚化和构图都到位，这张专业感拉满！',
  '男朋友的摄影眼光提升了，这张超有质感！',
  '色调和光线配合完美，这张绝了！',
  '表情捕捉超灵动，男朋友你行啊！',
  '构图和姿势都是满分，这张绝了！',
  '男朋友对细节的把控越来越好了！',
  '光线打在侧脸上层次感绝了！',
  '男友越拍越有自信，这张太可了！',
  '构图留白刚刚好，这张好有呼吸感！',
  '男朋友审美升级了，这张高级感满满！',
  '光线和表情同时在线，这张绝了！',
  '男朋友的构图意识在快速进化！',
  '虚化层次分明，这张像专业相机拍的！',
  '男友把我拍出了高级感，这张太可了！',
  '姿势和光线都是教科书级别！',
  '男朋友越拍越顺手，这张绝了！',
  '表情灵动+构图讲究，这张要存档！',
  // ========== Round 39 新增鼓励语 ==========
  '感觉不错哦，继续保持这个角度～',
  '连续拍了几张都很棒！就是这种感觉！',
  '男朋友越来越果断，赞！',
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
  // ========== Round 32 新增情侣互动提示 ==========
  RUB_NOSE: '轻轻蹭一下鼻子！这个动作超甜的～',
  HOLD_WAIST: '男生手放腰上，靠近一点贴贴～',
  KISS_FOREHEAD: '假装亲一下额头！这个角度绝了～',
  CLIMAX_LAUGH: '说个笑话把她逗笑，笑得最灿烂时抓拍～',
  TOUCH_NOSE: '轻轻点一下她的鼻尖，这个瞬间超可爱～',
  SWING_ARMS: '牵手荡秋千一样走一走，活力抓拍～',
  SHARE_SCARF: '同一条围巾！两个人贴一起超暖和～',
  PLAY_HAIR: '轻轻拨弄她的头发，自然又温柔～',
  CHIN_ON_SHOULDER: '下巴靠在对方肩膀上，慵懒感绝了～',
  ROLLING_HILLS: '一起躺下看天空，自然互动抓拍～',
  TUG_EAR: '轻轻拉一下耳朵，俏皮感十足～',
  SCRATCH_BACK: '假装给他挠痒痒，这个瞬间超自然～',
  STARE_INTO_EYES: '深情对视！这个时刻按下快门～',
  PLAY_CHIN: '轻轻托住他的下巴，这个角度超有戏～',
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
  TONGUE_OUT: '调皮地吐舌头，这个表情好可爱～',
  FINGER_HEART: '比个心！手指比心，眼睛看镜头，笑一个～',
  LOOK_DOWN: '稍微低头，眼睛往下看，害羞的感觉超可爱～',
  YAWN_BIG: '假装打个哈欠，然后笑出来，这个表情好自然～',
  WINK_CAMERA: '试试wink！一只眼睛眨一下，超俏皮～',
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
  GOLDEN_FILTER: '金棕滤镜很适合这张！温暖又有质感～',
  CINEMATIC_FILTER: '电影感滤镜让这张照片更有故事感～',
  FLORAL_FILTER: '花季滤镜配这张超美！色彩更通透～',
  SNOW_FILTER: '雪景滤镜提亮又柔和，画面更干净～',
}

// ========== Round 3 新增：姿势引导语音提示 ==========
const POSE_TIPS = {
  LEAN_WALL: '靠墙站好～肩膀放松，一只手稍微抬起～',
  SIDE_POSE: '侧身站着～一只脚稍微往前伸，腿显更长～',
  HAND_ON_FACE: '手轻轻托着下巴，假装在想事情～',
  WALKING_CATCH: '往前走几步！让他从背后抓拍，自然又生动～',
  SITTING_LEG: '坐在椅子上～一只脚往前伸，身体稍微侧过来～',
  LOOK_BACK: '回头看镜头！一个肩膀留在画面里，超有氛围～',
  ARM_ON_HEAD: '一只手轻轻放在头顶，微微歪头，超可爱～',
  CROSS_ARMS: '交叉手臂站着，气场全开，超有态度～',
  SHOULDER_SHOW: '露出肩膀！头发拨到一边，锁骨线条超美～',
  LYING_DOWN: '躺下来仰拍！头发散开，超有感觉～',
  HUNCH_SHOULDER: '稍微含一点肩，缩一下脖子，下巴更尖～',
  JAW_TILT: '稍微抬一点下巴，下颌线会更清晰立体～',
  COLLAR_TUG: '轻轻拉一下衣领，脖子线条更修长～',
  HAIR_TUCK: '头发稍微理一下，风把它吹到一边，光影更通透～',
  ARM_AWAY: '手臂稍微离开身体，显得更瘦～',
  LEGS_CROSS: '双脚稍微错开，一只脚稍微踮起来～',
  LOOK_ASIDE: '视线看向旁边，嘴角微微上扬，眼神更有戏～',
  PROFILE: '试试侧脸！轮廓感超强，表情放松～',
  HUG_SELF: '一只手环抱另一只手臂，曲线超美～',
  FINGER_CHIN: '手指轻轻点在下巴上，脸型更显尖～',
  // ========== 本次新增姿势提示 ==========
  STAIR_STEP: '踩在楼梯台阶上，一只脚站高一只脚低，超显腿长～',
  CHAIR_CROSS_LEG: '坐在椅子上翘二郎腿，身体稍微前倾，活力感～',
  WINDOW_CURTAIN: '靠在窗户边拉起窗帘，光影超有层次～',
  BALCONY_LEAN: '靠在阳台栏杆上，看远方，背景是城市天际线～',
  BED_PILLOW: '躺在床上或沙发上，头靠在枕头上，慵懒又自然～',
  FLOOR_SIT: '盘腿坐在地上，手放在膝盖上，休闲感十足～',
  TREE_TRUNK: '靠在树干上，肩膀放松，身体稍微侧过来～',
  GLASS_DOOR: '站在落地玻璃前，让玻璃上的倒影也入镜，超有层次～',
  BALLOON_HOLD: '拿着气球拍照！气球飘起来的时候抓拍，超有童话感～',
  FLOWER_BOUQUET: '捧着花束！侧头微笑，温柔感拉满～',
  BOOK_READ: '假装看书或杂志！低头看，再抬眼抓拍，文艺感十足～',
  MIRROR_SELFIE_TIP: '对着镜子自拍！手机稍微斜一点拍，角度更好看～',
  ICE_CREAM_HOLD: '拿着冰淇淋或咖啡！俏皮地笑一个，生活感满满～',
  SCARF_FLOW: '围巾或披肩随风飘动！动态抓拍超美～',
  BATHROBE_TIP: '穿浴袍靠在窗边，慵懒又高级，氛围感绝了～',
  UMBRELLA_TIP: '撑把透明伞！雨天氛围感绝了，俏皮又浪漫～',
  BIKE_TIP: '骑着自行车或靠在旁边！活力感十足，笑着看镜头～',
  // ========== 本次新增场景专属提示 ==========
  SUPERMARKET_TIP: '拿个零食饮料当道具！俏皮可爱，互动感十足～',
  GYM_POSE: '健身房镜前光线均匀！侧身站着，笑着拍一张超有活力～',
  CINEMA_TIP: '电影海报前侧身站着！和海报互动超有感觉～',
  FLOWER_MARKET_TIP: '捧一束花互动！蹲下来仰拍，人在花丛中美美的～',
  AQUARIUM_TIP: '大鱼缸前侧脸站着！蓝色水光打在脸上超梦幻～',
  MUSIC_FEST_TIP: '跟着音乐摇摆！表情夸张灿烂的时候抓拍，活力十足～',
  BAR_TIP: '靠吧台站着！鸡尾酒杯是天然道具，氛围感拉满～',
  BOOKSTORE_TIP: '靠在书架旁低头看书！文艺感十足，安静的美～',
  // ========== Round 43 新增姿势提示 ==========
  BALCONY_SUNSET_POSE: '夕阳西下时靠在阳台！逆光剪影超浪漫～',
  GARDEN_SWING_POSE: '在花园秋千上轻轻晃动！裙子飘起来的时候抓拍～',
  TERRACE_NIGHT_POSE: '在天台露台上！背景是星空或城市灯光，超有氛围～',
  KITCHEN_CHEF_POSE: '在厨房灶台前！侧身靠着台面，笑着看向镜头～',
  BALCONY_COFFEE_POSE: '捧着咖啡杯靠在阳台！早晨的光线超柔和～',
  BIKE_CAFE_POSE: '在咖啡馆门口骑自行车！活力感和日常感兼具～',
  ROOFTOP_PICNIC_POSE: '在天台野餐垫上！坐着歪头笑，背景是城市天际线～',
  TRAIN_WINDOW_POSE: '在火车窗边靠着！窗外风景做背景，超有旅途感～',
  FERRY_DECK_POSE: '在渡轮甲板上！背景是大海和蓝天，超开阔～',
  CAR_SELFIE_WINDOW_POSE: '在车里靠着车窗！窗外街景做背景，氛围感满满～',
  LAKE_SIDE_POSE: '在湖边站着！水面反光打在脸上超通透～',
  MEADOW_FLOWER_POSE: '在花田中蹲下来！花花草草做前景，超有层次感～',
  BALLOON_STRING_POSE: '拿着气球线轻轻晃动！抓拍动态瞬间，超有活力～',
}

type FaceTipKey = keyof typeof FACE_TIPS
type StabilityTipKey = keyof typeof STABILITY_TIPS

/** 从稳定性提示池中随机选取同类提示 */
function pickStabilityTip(category: 'STABLE' | 'SHAKY' | 'EXTREME_SHAKE' | 'TILTED'): string {
  const variants: Record<string, string[]> = {
    STABLE: [STABILITY_TIPS.STABLE, STABILITY_TIPS.STABLE_2, STABILITY_TIPS.STABLE_3, STABILITY_TIPS.STABLE_4, STABILITY_TIPS.STABLE_5, STABILITY_TIPS.STABLE_SUPER, STABILITY_TIPS.STABLE_CAMERA, STABILITY_TIPS.BREATHE_STEADY, STABILITY_TIPS.WALL_SUPPORT, STABILITY_TIPS.WIDE_STANCE, STABILITY_TIPS.STABLE_READY, STABILITY_TIPS.STEADY_AND_GOOD, STABILITY_TIPS.HOLD_FOR_MOMENT],
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

  /** 最佳拍摄时机提示（光线+位置都到位） */
  async speakPerfectTiming(): Promise<void> {
    const tips = [
      FACE_TIPS.SHOOT_NOW_PERFECT,
      FACE_TIPS.SHOOT_NOW_LIGHT,
      FACE_TIPS.SHOOT_NOW_POSE,
      FACE_TIPS.ALMOST_PERFECT,
      FACE_TIPS.SHOOT_GOOD,
      FACE_TIPS.CLICK_SNAP,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 表情动作提示（随机抽取） */
  /** 随机姿势提示（不指定类型，随机引导） */
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

  /** 拍摄模式提示（人像/HDR/全景/专业/连拍） */
  async speakModeTip(mode: 'portrait' | 'hdr' | 'panorama' | 'pro' | 'burst' | 'timer'): Promise<void> {
    const tips: Record<string, string[]> = {
      portrait: [FACE_TIPS.PORTRAIT_MODE, FACE_TIPS.PORTRAIT_MODE_2],
      hdr: [FACE_TIPS.HDR_HINT, FACE_TIPS.HDR_HINT_2, FACE_TIPS.BACKLIGHT_HDR],
      panorama: [FACE_TIPS.PANORAMA_HINT],
      pro: [FACE_TIPS.PRO_MODE_HINT, FACE_TIPS.PRO_MODE_HINT_2],
      burst: [FACE_TIPS.BURST_MODE, FACE_TIPS.BURST_MODE_2],
      timer: [FACE_TIPS.TIMER_HINT],
    }
    const pool = tips[mode]
    if (pool && pool[0]) {
      await this.speak(pickRandom(pool), true)
    }
  }

  /** 推荐拍照模式（根据场景自动推荐最佳模式） */
  async speakRecommendMode(brightness: number, sceneType?: string): Promise<void> {
    // 暗光场景推荐闪光灯或专业模式
    if (brightness < 50) {
      await this.speak(FACE_TIPS.TOO_DARK, true)
      return
    }
    // 逆光场景推荐 HDR
    if (brightness > 200) {
      await this.speak(FACE_TIPS.HDR_HINT, true)
      return
    }
    // 傍晚推荐黄金时段
    if (sceneType === 'sunset' || sceneType === 'rooftop_night') {
      await this.speak(FACE_TIPS.GOLDEN_HOUR_NOW, true)
      return
    }
    // 阴天推荐
    if (sceneType === 'overcast') {
      await this.speak(FACE_TIPS.OVERCAST_PERFECT_TIME, true)
      return
    }
    // 默认推荐人像模式
    await this.speak(FACE_TIPS.PORTRAIT_MODE, true)
  }

  /** 快速姿势提示（从常用姿势中随机抽取） */
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
    ]
    await this.speak(pickRandom(pool), true)
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
      '全部': [
        '模板全都展示出来啦！找一个最喜欢的开始拍吧～',
        '海量模板任你选！找到一个适合当下场景的，事半功倍哦～',
        '全部模板都在这里！慢慢挑，找到最搭的那个～',
        '不用纠结，往下滑一定有适合你们的pose！',
      ],
    }
    const arr = tips[category]
    if (arr && arr.length > 0) {
      const tip = arr[Math.floor(Math.random() * arr.length)]
      await this.speak(tip, true)
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

  // ========== Round 5 新增 TTS 方法 ==========
  /** 闭眼检测提示（MLKit 返回闭眼时调用） */
  async speakBlinkTip(): Promise<void> {
    const tips = [
      FACE_TIPS.BLINK_DETECTED,
      FACE_TIPS.BLINK_DETECTED_2,
      FACE_TIPS.BOTH_EYES_CLOSED_TIP,
    ]
    await this.speak(pickRandom(tips))
  }

  /** 人脸距离提示（faceArea 超出范围时调用） */
  async speakFaceDistanceTip(tooFar: boolean): Promise<void> {
    if (tooFar) {
      const tips = [FACE_TIPS.FACE_TOO_FAR, FACE_TIPS.FACE_TOO_FAR_2]
      await this.speak(pickRandom(tips))
    } else {
      const tips = [FACE_TIPS.FACE_TOO_NEAR, FACE_TIPS.FACE_TOO_NEAR_2]
      await this.speak(pickRandom(tips))
    }
  }

  /** 逆光场景提示（检测到强背光时调用） */
  async speakBacklightTip2(): Promise<void> {
    const tips = [
      FACE_TIPS.BACKLIGHT_DETECTED,
      FACE_TIPS.BACKLIGHT_DETECTED_2,
    ]
    await this.speak(pickRandom(tips))
  }

  /** 成功抓拍倒计时（3-2-1-拍！） */
  async speakCaptureCountdown(): Promise<void> {
    await this.speak(FACE_TIPS.COUNTDOWN_3, true)
    await new Promise<void>(r => setTimeout(r, 800))
    await this.speak(FACE_TIPS.COUNTDOWN_2, true)
    await new Promise<void>(r => setTimeout(r, 800))
    await this.speak(FACE_TIPS.COUNTDOWN_1, true)
    await new Promise<void>(r => setTimeout(r, 800))
    await this.speak(FACE_TIPS.COUNTDOWN_GO, true)
  }

  /** 表情僵硬提示 */
  async speakStiffExpressionTip(): Promise<void> {
    const tips = [
      FACE_TIPS.EXPRESSION_STIFF,
      FACE_TIPS.EXPRESSION_STIFF_2,
      FACE_TIPS.EXPRESSION_STIFF_3,
    ]
    await this.speak(pickRandom(tips))
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
    this.speaking = false
    this.enabled = false
    try {
      Tts.stop()
    } catch {
      // 静默处理 stop 失败
    }
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
    ]
    await this.speak(pickRandom(tips), true)
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

  /** ========== 本次新增 TTS 场景 ========== */

  /** 情侣甜蜜互动提示 */
  async speakCoupleSweetTip(): Promise<void> {
    const tips = [
      '情侣照要甜蜜感！额头碰额头或者鼻子碰鼻子，超甜～',
      '两个人靠在一起笑一个，甜蜜感要溢出屏幕了！',
      '牵手、转圈、互相逗笑，情侣照最重要的是自然～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 逆光 HDR 提示 */
  async speakBacklightHDRTip(): Promise<void> {
    const tips = [
      '逆光场景！打开 HDR 让脸和背景都清晰～',
      '背景亮人脸暗！打开 HDR 或者转过来面对光源～',
      '背光拍剪影也超美！转过身为背光试试～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 阴天拍照提示 */
  async speakOvercastTip(): Promise<void> {
    const tips = [
      '阴天光线好柔和！不用担心过曝，随便拍都好看～',
      '云层就是天然柔光箱，拍出来皮肤超好的～',
      '阴天光线超均匀！找个漂亮的背景开始拍吧～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 连拍提示 */
  async speakBurstModeTip(): Promise<void> {
    const tips = [
      '按住快门连拍！多拍几张总有一张完美～',
      '连拍模式开起来！动起来抓拍的瞬间最自然～',
      '连拍是抓拍神器！让女朋友做动作然后按下去～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 定时拍照提示 */
  async speakTimerTip(): Promise<void> {
    const tips = [
      '用定时拍照！放在稳定的地方，自己也能入镜～',
      '三二一！就是现在～',
      '定时拍照可以摆好pose再拍，不用急～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 抓拍提示 */
  async speakCandidTip(): Promise<void> {
    const tips = [
      '假装在看她！就是现在抓拍～',
      '让她先动起来然后抓拍，这个瞬间最自然～',
      '假装看旁边再转头笑，自然又灵动～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 夕阳拍照提示 */
  async speakSunsetTip(): Promise<void> {
    const tips = [
      '夕阳余晖好浪漫！侧身站着让光打在侧脸上～',
      '现在是黄金时段！赶紧拍，光线超美～',
      '傍晚光线好温柔！这时间段拍照绝了～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 超市道具提示 */
  async speakSupermarketPropTip(): Promise<void> {
    const tips = [
      '拿个零食饮料当道具！俏皮可爱，互动感十足～',
      '超市里的小道具超适合拍照！拿个零食摆 pose～',
      '拿着冰淇淋或咖啡，笑着看镜头，俏皮感拉满～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 俯拍全身提示 */
  async speakTopDownFullTip(): Promise<void> {
    const tips = [
      '俯拍全身！男朋友站高一点，你躺下仰头看镜头～',
      '从上往下拍超显脸小！男朋友把手机举高一点～',
      '俯拍可以拍全身躺着的感觉，超有氛围感～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 仰拍大长腿提示 */
  async speakLowAngleLegsTip(): Promise<void> {
    const tips = [
      '仰拍大长腿！男朋友蹲低，你踮起脚尖～',
      '从下往上拍超级显腿长！男朋友快蹲下去～',
      '低角度仰拍大长腿效果绝了！蹲低拍起来～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 表情夸张提示 */
  async speakExpressionExaggerateTip(): Promise<void> {
    const tips = [
      '笑容再大一点！这样更上镜～',
      '表情放松一点～别僵着，自然最美～',
      '表情夸张一点！生动活泼更有感染力～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 夜拍模式提示 */
  async speakNightModeTip(): Promise<void> {
    const tips = [
      '晚上拍照记得打开闪光灯或找光源～',
      '夜景光线复杂，打开闪光灯照亮人脸～',
      '暗光环境下手要更稳！双手拿手机，靠墙拍～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 室内反射提示 */
  async speakIndoorReflectionTip(): Promise<void> {
    const tips = [
      '室内玻璃会反光！稍微侧身躲开反光～',
      '玻璃橱窗会反射，让男朋友换个角度躲开～',
      '反光太明显了，稍微转一下躲开玻璃反光～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 傍晚拍照提示 */
  async speakEveningTip(): Promise<void> {
    const tips = [
      '傍晚光线好温柔！这时间段拍人像绝了～',
      'Golden Hour 光线好美，男朋友抓到了！',
      '夕阳余晖把人拍得好温柔！男朋友这光用绝了～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 运动抓拍提示 */
  async speakMotionCaptureTip(): Promise<void> {
    const tips = [
      '动起来抓拍！跑跳的瞬间最有活力～',
      '动感活力感满满！男朋友抓拍到你的快乐瞬间！',
      '跑起来、跳起来！活力瞬间最生动～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 黄金时段提示 */
  async speakGoldenHourTip(): Promise<void> {
    const tips = [
      '现在是黄金时段！赶紧拍，光线超美～',
      'Golden Hour 光线最温柔！拍人像的黄金时间～',
      '趁现在光线好！赶紧拍一张，光线不会再来～',
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

  /** 滤镜已应用提示 */
  /** 滤镜移除提示 */
  async speakFilterRemoved(): Promise<void> {
    const tips = [
      '滤镜已清除，恢复原图～',
      '原图也很美！撤销滤镜看看～',
      '滤镜去掉了，还是原图最真实～',
      '恢复原始色调，这张本来就好看～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
  }

  /** 模板已清除提示 */
  async speakTemplateCleared(): Promise<void> {
    const tips = [
      '模板已关闭，自由发挥吧～',
      '没有模板限制啦，自由拍摄更自然～',
      '模板去除，跟着感觉拍就好～',
      '关闭模板引导，随心所欲拍～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
  }

  /** 分享成功提示 */
  async speakShareSuccess(): Promise<void> {
    const tips = [
      '分享成功！这张绝对被夸爆～',
      '发出去了！男朋友摄影师认证加一～',
      '分享成功！等着被点赞吧～',
      '发出去了！男朋友继续加油哦～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
  }

  /** 里程碑庆祝提示 */
  async speakCelebration(milestone: 'streak3' | 'streak7' | 'first10' | 'perfect'): Promise<void> {
    const tips: Record<string, string[]> = {
      streak3: ['连续三天都在拍！男朋友好有毅力～', '三天坚持下来太棒了！男朋友已经爱上摄影了～', '三天连续打卡！男朋友这习惯养成得真好～'],
      streak7: ['一周都在拍！男朋友摄影师天赋觉醒了！', '整整一周！男朋友你这摄影热情太牛了～', '七天连续！男朋友已经是拍照达人了！'],
      first10: ['拍满十张了！男朋友进步速度惊人～', '十张照片！从新手到有点感觉了，继续加油！', '十张里程碑！男朋友的相册越来越丰富了～'],
      perfect: ['满分作品诞生！男朋友你是怎么做到的！', '满分！男朋友这张直接封神了！', '完美！满分作品！男朋友已经超越全国99%的男生了！'],
    }
    const arr = tips[milestone] || tips.perfect
    const tip = arr[Math.floor(Math.random() * arr.length)]
    await this.speak(tip, true)
  }

  /** 滤镜滑动提示（ResultScreen 滤镜区出现时播报） */
  async speakFilterSwipeHint(): Promise<void> {
    const tips = [
      '滤镜可以左右滑动切换，找到最喜欢的那一款～',
      '试试不同的滤镜，每种风格都不一样哦～',
      '向左滑动查看更多滤镜，找到最适合这张照片的风格～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
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
      landscape: '风景',
      night: '夜景',
      sunset: '日落',
      floral: '花季',
      snow: '雪景',
      golden: '金棕',
      cinematic: '电影',
    }
    const label = filterLabels[filterName] || filterName
    const tips = [
      `${label}滤镜已应用！这个色调好有感觉～`,
      `滤镜切换成${label}了！整体氛围感更强了～`,
      `${label}色调好搭！男朋友这张绝了～`,
      `试试这个${label}滤镜！色调刚刚好～`,
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
  }

  /** 分享提示 */
  async speakShareTip(): Promise<void> {
    const tips = [
      '这张可以发朋友圈了！男朋友摄影师认证～',
      '发小红书绝对被夸爆！男朋友你太强了～',
      '这张绝了！发朋友圈点赞肯定破百～',
      '这张大片感十足！分享出去让大家羡慕一下～',
      '男朋友这张可以上摄影展了！快去分享吧～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
  }

  /** 重拍鼓励提示 */
  async speakRetryTip(score: number): Promise<void> {
    if (score < 40) {
      const tips = [
        '这张不太满意？没关系，多拍几张总有一张完美的～',
        '再试一次！这次注意一下光线和构图，肯定会更好～',
        '热身而已！重新拍一张，男朋友摄影师要上线了～',
        '这张有点糊了～下次稳一点再按快门，肯定能过～',
      ]
      const tip = tips[Math.floor(Math.random() * tips.length)]
      await this.speak(tip, true)
    } else if (score < 60) {
      const tips = [
        '这张还不错！但还有提升空间，再拍一张试试？',
        '有进步了！再调整一下角度就是大片了～',
        '比上次好多了！继续加油，下次冲满分～',
      ]
      const tip = tips[Math.floor(Math.random() * tips.length)]
      await this.speak(tip, false)
    } else {
      const tips = [
        '这张已经很好了！不满意的话再拍一张试试～',
        '挺不错的！如果想更好就再拍一张～',
      ]
      const tip = tips[Math.floor(Math.random() * tips.length)]
      await this.speak(tip, false)
    }
  }

  /** 分数展示前提示（处理完成，即将出结果） */
  async speakProcessingDone(): Promise<void> {
    const tips = [
      '分析完成！来看看这张表现怎么样～',
      '这张拍得怎么样呢？男朋友准备好接受评分了吗～',
      '结果出来了！男朋友的摄影水平公开处刑时间到～',
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]
    await this.speak(tip, false)
  }

  /** 多人合照提示 */
  async speakMultiPersonTip(): Promise<void> {
    const tips = [
      '人多站两边，中间留给人多的那侧～',
      '多人合照别挤成一团，错开站位更自然～',
      '后排的稍微露个额头出来，不然会被挡住～',
      '连拍几张选最好的，每个人表情都在线～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 阴天摄影提示 */
  async speakCloudyDayTip(): Promise<void> {
    const tips = [
      '阴天光线超柔和！不用担心脸上有硬阴影～',
      '阴天拍出来皮肤超好，趁现在多拍几张～',
      '没有强光直射，侧脸大胆拍，光比会很舒服～',
      '虽然天阴，但阴天的漫反射光其实超适合拍人像～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 镜面倒影提示 */
  async speakReflectionTip(): Promise<void> {
    const tips = [
      '找找地面水洼或玻璃的倒影，画面会更有趣～',
      '对着镜子拍，光线和构图都完美～',
      '有反光的地方稍微侧身，手机镜头和光源别在同一直线～',
      '玻璃橱窗也能当镜子用，找好角度躲开反光～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 窗边光线提示 */
  async speakWindowLightTip(): Promise<void> {
    const tips = [
      '窗边光线超棒！让脸朝向窗户，皮肤看起来超好～',
      '早晨的窗边光线偏暖，拍元气少女感绝了～',
      '窗光侧脸最有立体感，让脸稍微侧向窗户～',
      '阴天的窗边光线是天然的柔光箱，拍出来皮肤超细腻～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 表情夸张提示（表情僵硬时） */
  async speakRelaxExpressionTip(): Promise<void> {
    const tips = [
      '表情放松一点！笑一个，让气氛轻松自然～',
      '别太紧绷啦～深呼吸，让表情自然流动～',
      '假装被什么逗乐了，眼睛也会亮起来～',
      '表情自然最重要，不用刻意摆拍，真实最美～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 镜子自拍提示 */
  async speakMirrorSelfieTip(): Promise<void> {
    const tips = [
      '对着镜子自拍！手机稍微斜一点拍，角度更好看～',
      '浴室镜自拍光线好均匀，试试歪头笑一个～',
      '全身镜自拍显腿长！站在镜子前笑一个～',
      '镜子里的倒影也很美！试试拍镜子里的自己～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 海边拍照提示 */
  async speakBeachTip(): Promise<void> {
    const tips = [
      '海边阳光强烈容易眯眼！稍微侧身躲开强光～',
      '海风吹起头发超灵动！等风来时按下快门～',
      '让男朋友蹲低拍，超级显腿长！',
      '侧身站着让阳光勾勒轮廓，逆光超浪漫～',
      '沙滩脚印做前景超有层次感！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 雪景拍照提示 */
  async speakSnowTip(): Promise<void> {
    const tips = [
      '雪地光线反射强！戴墨镜或找阴影，避免眯眼～',
      '围巾是天然的暖色反光板，把脸衬得红润通透～',
      '白茫茫的背景超浪漫！稍微过曝一点白雪才不灰～',
      '雪景里的彩色围巾超好看，是加分项哦～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 游乐场/嘉年华提示 */
  async speakCarnivalTip(): Promise<void> {
    const tips = [
      '游乐场彩色灯光超有活力！找好角度就拍～',
      '旋转木马前光线梦幻，试试侧身站着超有氛围～',
      '摩天轮里光线柔和！俯拍城市全景超震撼～',
      '游乐场夜景灯光璀璨！背对灯光拍剪影超浪漫～',
      '过山车抓拍表情超刺激！让男朋友对准脸按快门～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 毕业照提示 */
  async speakGraduationTip(): Promise<void> {
    const tips = [
      '毕业照帽子稍微抬高一点，露出额头更有精神～',
      '抛帽的瞬间最好抓拍！让男朋友对准脸多拍几张～',
      '毕业袍纽扣解开一颗，脖子线条更修长～',
      '学士帽歪一点戴更活泼！别太端正了～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 天台夜景提示 */
  async speakRooftopNightTip(): Promise<void> {
    const tips = [
      '天台夜景好浪漫！打开闪光灯补补光，人脸更清晰～',
      '城市夜景做背景超有氛围！让女朋友站在灯光前～',
      '天台风大注意头发！稍微理一下再拍，光影更干净～',
      '夜景拍摄要双手拿稳手机，或者靠在栏杆上更稳～',
      '天台侧光拍侧脸超有层次感，试试看～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 健身房/运动风提示 */
  async speakGymTip(): Promise<void> {
    const tips = [
      '健身房镜前光线均匀！侧身站着，笑着拍一张超有活力～',
      '运动风来一张！动作舒展一点，笑得灿烂～',
      '运动完脸微微泛红最有活力感，让男朋友抓拍～',
      '健身房镜前开闪光灯补光，脸会更清晰～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 樱花季提示 */
  async speakCherryBlossomTip(): Promise<void> {
    const tips = [
      '樱花树下光线斑驳！风吹过来时按下快门，绝美～',
      '樱花做前景虚化超浪漫！让男朋友稍微蹲低拍～',
      '樱花季逆光拍发丝发光绝了！让阳光从背后打过来～',
      '樱花雨飘落时抓拍超有意境，多拍几张选最好的～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** ========== Round 28 新增：舞蹈/表演场景 TTS ========== */
  async speakDancePerformanceTip(): Promise<void> {
    const tips = [
      '舞台灯光变化快，连拍几张选最清晰的那张～',
      '表演中表情夸张一点更有感染力！活力感拉满～',
      '舞台逆光超有感觉！转过身让轮廓发光，绝了～',
      '表演现场光线复杂，开闪光灯补光效果更好～',
      '跟着节奏动起来的时候抓拍，表情最生动～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** ========== Round 28 新增：红叶特写场景 TTS ========== */
  async speakRedAutumnTip(): Promise<void> {
    const tips = [
      '红叶背景下光线斑驳！风吹过来的时候按下快门，绝美～',
      '枫叶近景特写超有秋日感，背景虚化主体突出～',
      '落叶季光线好温柔！侧身站着让光线打在侧脸上～',
      '红叶背景颜色很鲜艳，衣服选浅色更突出主体～',
      '蹲低仰拍让叶子落在头顶上方，超有氛围感～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** ========== Round 28 新增：节日灯展场景 TTS ========== */
  async speakFestivalLightsTip(): Promise<void> {
    const tips = [
      '灯展场景色彩斑斓！侧身站着让灯光打侧脸上，超有氛围～',
      '灯展人多背景杂，找个空隙蹲低仰拍，背景更干净～',
      '灯展光线复杂，打开手机闪光灯补补光～',
      '灯展逆光超浪漫！转过来让脸朝向光源试试～',
      '灯展背景五彩缤纷，衣服选纯色更突出主体～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** ========== Round 28 新增：游乐园/嘉年华场景 TTS ========== */
  async speakAmusementTip(): Promise<void> {
    const tips = [
      '游乐园灯光超梦幻！找个项目做背景，笑着拍一张～',
      '旋转木马前超浪漫！侧身站着，光线超温柔～',
      '游乐园大摆臂超有活力！动起来抓拍最自然～',
      '摩天轮里光线柔和，这个角度超浪漫～',
      '过山车尖叫瞬间超生动！抓拍表情最自然～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** ========== Round 28 新增：天台日间场景 TTS ========== */
  async speakRooftopDaytimeTip(): Promise<void> {
    const tips = [
      '天台白天光线充足！找个有阴影的角落，别让太阳直射～',
      '天台背景是城市天际线，侧身站着超有范儿！',
      '天台有风时拍动态抓拍，头发飘起来超灵动～',
      '天台俯拍全身照超显气场！男朋友站高一点～',
      '正午天台光线太硬，找个下午时段光线更柔和～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** ========== Round 28 新增：草原/牧场场景 TTS ========== */
  async speakMeadowRanchTip(): Promise<void> {
    const tips = [
      '草原上光线超通透！站在草丛中，笑着看镜头～',
      '草原逆光拍剪影超浪漫！转过身让阳光勾勒轮廓～',
      '草原风大头发容易乱，男朋友找个避风的角度拍～',
      '草原背景干净开阔，人站中间或偏左构图都很好看～',
      '牧场木栅栏做前景虚化，超有田园感～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  // ========== Round 35 新增 TTS 场景 ==========
  // 拍摄前引导
  async speakPreShootTip(): Promise<void> {
    const tips = [
      '先确认一下光线方向！脸要朝向光源才好看～',
      '检查一下镜头有没有指纹！擦干净再拍会更清晰～',
      '先让男朋友拿稳手机，憋住呼吸再按快门～',
      '先打开九宫格辅助线！构图会专业很多～',
      '先问一句这样可以吗！十张里能挑出一两张特别好的！',
      '先确认一下背景干净不干净，杂乱的背景会抢戏～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  // 拍摄中实时指导
  async speakMidShootTip(): Promise<void> {
    const tips = [
      '就差一点点！稳住，按下去就是大片！',
      '姿势超棒！表情到位！按下去就是大片！',
      '完美时刻！这光线这角度，按下去！',
      '手稳住！就是现在，深呼吸，咔嚓！',
      '位置刚刚好！就是现在，按快门！',
      '表情超自然！别动，就是现在拍！',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  // 拍完后自动播报
  async speakPostShootResult(score: number): Promise<void> {
    if (score >= 90) {
      await this.speak(`完美！给你打${score}分！这张要永久收藏！`, false)
    } else if (score >= 80) {
      await this.speak(`这张${score}分！男朋友进步好大，继续保持！`, false)
    } else if (score >= 70) {
      await this.speak(`${score}分！不错不错，继续加油！`, false)
    } else {
      await this.speak('这张有进步空间，再来一张试试～', false)
    }
  }

  // 场景切换提醒
  async speakSceneChangeTip(sceneType: string): Promise<void> {
    const sceneTips: Record<string, string[]> = {
      beach: ['海边阳光强！找个阴凉处或戴墨镜～', '海风吹头发超美，等风来再拍～'],
      cafe: ['咖啡馆光线暖暖的！靠近窗户位置最佳～', '捧着咖啡侧头看窗外，文艺感绝了～'],
      night: ['夜景光线复杂，打开闪光灯补补光～', '晚上拍要手更稳，深呼吸再按快门～'],
      indoor: ['室内最重要的是光线！靠近窗户站～', '家里找窗边或白墙做背景，简单干净～'],
    }
    const tips = sceneTips[sceneType] || ['换个角度试试！光影会更丰富～']
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  // 情侣互动特别提示
  async speakCoupleInteractionTip(): Promise<void> {
    const tips = [
      '两个人靠近一点！贴贴更甜蜜～',
      '对视一下！这个瞬间按下去，超有感觉～',
      '从背后抱！经典的甜蜜姿势学起来～',
      '牵手往前走，边走边抓拍，自然又好看～',
      '额头碰额头！嘟嘴亲亲，超甜～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  // 连拍建议
  async speakBurstTip(): Promise<void> {
    const tips = [
      '按住快门连拍！多拍几张选最好的～',
      '连拍模式开起来！动起来的瞬间最自然～',
      '多拍几张总有一张完美！别只拍一张就收工～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  // ========== Round 3 新增 TTS 方法 ==========
  /** 切换到前置摄像头 */
  async speakCameraSwitchedFront(): Promise<void> {
    const tips = [FACE_TIPS.CAMERA_SWITCHED_FRONT, FACE_TIPS.CAMERA_SWITCHED_FRONT_2, FACE_TIPS.CAMERA_SWITCHED_FRONT_3]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 切换到后置摄像头 */
  async speakCameraSwitchedBack(): Promise<void> {
    const tips = [FACE_TIPS.CAMERA_SWITCHED_BACK, FACE_TIPS.CAMERA_SWITCHED_BACK_2, FACE_TIPS.CAMERA_SWITCHED_BACK_3]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 连拍完成汇总 */
  async speakBurstCaptureDone(count: number): Promise<void> {
    const pools = [FACE_TIPS.BURST_CAPTURE_DONE, FACE_TIPS.BURST_CAPTURE_DONE_2, FACE_TIPS.BURST_CAPTURE_DONE_3]
    let text = pools[Math.floor(Math.random() * pools.length)]
    // 替换占位符 X
    text = text.replace('X', String(count))
    await this.speak(text, true)
  }

  /** 停留过久的鼓励语 */
  async speakIdleTooLong(): Promise<void> {
    const tips = [FACE_TIPS.IDLE_TOO_LONG, FACE_TIPS.IDLE_TOO_LONG_2, FACE_TIPS.IDLE_TOO_LONG_3]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 模板匹配度提升提示 */
  async speakTemplateProgress(matchPercent: number): Promise<void> {
    if (matchPercent >= 90) {
      await this.speak('姿势超准！就是现在拍，这张一定是大片！', true)
    } else if (matchPercent >= 70) {
      await this.speak('姿势越来越对了！再调整一点点就完美！', false)
    } else {
      await this.speak('跟着剪影慢慢调整，加油！', false)
    }
  }

  /** 亮度突变提示（走出阴影/进入阴影） */
  async speakBrightnessChanged(warmer: boolean): Promise<void> {
    if (warmer) {
      await this.speak('走出阴影了！光线变亮了，这个角度超好看～', false)
    } else {
      await this.speak('走进阴影了！脸上光变柔和了，好舒服～', false)
    }
  }

  /** 连续高分连续达成提示 */
  async speakContinuousHighScore(count: number): Promise<void> {
    if (count === 3) {
      await this.speak('三连高分！男朋友你是开挂了吗，继续保持！', true)
    } else if (count === 5) {
      await this.speak('五连高分！男朋友摄影师天赋满点！太厉害了！', true)
    } else if (count >= 7) {
      await this.speak(`${count}连高分！男朋友简直是摄影大师！继续保持！`, true)
    } else {
      await this.speak(`连续${count}次高分！这稳定输出太厉害了！`, true)
    }
  }

  /** 模板超时提醒（用户一直在看模板但没拍） */
  async speakTemplateTimeout(): Promise<void> {
    const tips = [
      '姿势摆好了吗？差不多就拍一张吧～',
      '跟着剪影站好了就按快门！差不多就行～',
      '不用完美！先拍一张看看效果～',
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], false)
  }

  /** 构图线模式切换成功提示 */
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
    ]
    await this.speak(tips[Math.floor(Math.random() * tips.length)], true)
  }

  /** 早晨光线提示 */
  async speakMorningLightTip(): Promise<void> {
    const tips = [
      '早晨的光线好柔和！趁现在多拍几张～',
      '早安光线最适合拍照了，整个人都在发光～',
      '这个时间段光线最温柔，拍出来皮肤超好！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 人多场所拍摄提示 */
  async speakCrowdedPlaceTip(): Promise<void> {
    const tips = [
      '人太多了！稍微等一下，等人群散开再拍～',
      '找个没人的角落！背景干净主体才突出～',
      '趁人走过去赶紧拍！动作要快～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 自拍杆提示 */
  async speakSelfieStickTip(): Promise<void> {
    const tips = [
      '有自拍杆！稍微举高一点，从上往下拍超显脸小～',
      '举高自拍杆！俯拍角度绝了，大长腿既视感～',
      '自拍杆举高一点！高机位拍出来更好看～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 照片预览模糊警告 */
  async speakBlurWarning(): Promise<void> {
    const tips = [
      '这张看起来有点糊！手拿稳了再按快门～',
      '预览有点模糊，深呼吸，稳住手再拍一张～',
      '这张糊了！双手握手机，憋住气再拍～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 照片已保存提示 */
  async speakPhotoSaved(): Promise<void> {
    const tips = [
      '已保存到相册！可以去相册里查看～',
      '这张已存好了！拍得很棒～',
      '保存成功！去相册里看看效果吧～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 模板分类切换提示 */
  async speakTemplateCategorySwitched(category: string): Promise<void> {
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
    }
    const label = catLabels[category] || category
    await this.speak(`已切换到${label}模板，找个好位置开始拍吧～`, false)
  }

  /** 连续拍摄过多提醒（防止电量过快消耗） */
  async speakBurstExcessive(count: number): Promise<void> {
    const tips = [
      `已经拍了${count}张啦！先看看效果，选一张最好的保存吧～`,
      `${count}张了！够啦够啦，去看看哪张最好看～`,
      `拍了${count}张啦！多拍不一定好，选一张保存吧～`,
    ]
    await this.speak(pickRandom(tips), false)
  }
}

export { FACE_TIPS, STABILITY_TIPS, EXPRESSION_TIPS, SCENE_TIPS }
export default new VoiceCoach()
