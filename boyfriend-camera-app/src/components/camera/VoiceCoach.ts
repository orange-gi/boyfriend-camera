/**
 * VoiceCoach - 语音教练
 * 基于人脸位置和陀螺仪数据的语音提示
 * 使用 react-native-tts 朗读
 */
import Tts from 'react-native-tts'
import { type EmotionDetection, type SceneType } from '../../services/analyzer'
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
  FACE_CENTERING: '脸稍微往中间挪一点点，构图会更稳～',
  FACE_CENTER_PERFECT: '位置完美！就是现在，笑一个按下去！',
  LOOK_LEFT_THEN_SMILE: '先看左边，再转头笑！这个表情超自然～',
  LOOK_RIGHT_THEN_SMILE: '先看右边，再转头笑！自然的笑容马上就出来了～',
  // 新增：手势引导
  HAND_NATURAL: '手自然垂下就好！别紧贴身体，侧面更显瘦～',
  HAND_HIP_POSE: '双手叉腰！这个姿势显瘦又有气场～',
  HAND_FINGERS_TIPS: '手指轻轻合拢，比张开更优雅～',
  // 新增：表情场景
  RELAX_SHOULDER_TIP: '肩膀放松一下！别端着，自然最美～',
  BREATH_RELAX: '深呼吸～放松再笑，这个表情最自然～',
  THINK_HAPPY: '想一件开心的事！表情马上活起来～',
  // 新增：稳定性实时反馈
  STEADY_NOW: '稳住！手不抖了，按下去～',
  CAMERA_SHAKE_LESS: '好多了！继续稳住，按快门～',
  SELFIE_TOO_HIGH: '手机稍微放低一点点，正面拍摄会更有神～',
  SELFIE_TOO_LOW: '手机抬高一点！俯拍显脸小，下巴尖尖的～',
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
  CLOSE_ONE_EYE: '试试闭一只眼！俏皮又可爱，活泼感拉满～',
  HAIR_OVER_FACE: '头发挡住脸了～轻轻拨开，光会更通透～',
  HAND_NEAR_FACE: '手靠近脸可以显脸小！试试托腮或撩头发～',
  BLUSH_HINT: '侧过脸让光打在颧骨上，皮肤会看起来更通透～',
  SHOOT_NOW_LIGHT: '光线刚刚好！就是现在，按快门！',
  SHOOT_NOW_POSE: '姿势超棒！表情到位！按下去就是大片！',
  SHOOT_NOW_PERFECT: '完美时刻！这光线这角度，按下去！',
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
  TIMER_COUNTDOWN: '三二一！就是现在～',
  TIMER_COUNTDOWN_2: '321！就是现在～',
  TIMER_COUNTDOWN_3: '倒计时结束！按快门～',
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
  SPRING_RAIN: '春雨绵绵的窗边超有氛围感！让窗户的光打在侧脸上～',
  FOGGY_MORNING: '雾蒙蒙的早晨超有诗意！这个光线超柔和，拍～',
  SUNSET_WINDOW_INDOOR: '傍晚斜阳从窗户洒进来，光影绝了！就在这拍～',
  BACKLIGHT_SILHOUETTE: '逆光剪影超有感觉！转过身来，让光线打在侧脸上～',
  WINDOW_LIGHT_NEAR: '脸稍微靠近窗户！自然光直接打在脸上～',
  POSE_READY_NOW: '姿势摆好了！就是现在，按下去！',
  POSE_ALMOST_THERE: '就差一点点！手的位置再调整一下～',
  FACE_TOO_LEFT: '脸稍微往右挪！位置会更正～',
  FACE_TOO_RIGHT: '脸稍微往左挪！位置会更正～',
  STEP_CLOSER: '往前走一步！距离刚刚好～',
  STEP_BACK: '退后一步！距离刚刚好～',
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
  CAMERA_UPSIDE_DOWN: '手机好像拿反了！把摄像头朝上拿好～',
  FACE_LOCKED: '找到你了！就是现在，笑一个～',
  CAMERA_TOO_CLOSE: '手机离脸太近了！稍微拿远一点点～',
  LOW_BATTERY_HINT: '手机快没电了！抓紧时间多拍几张～',
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
  FACE_FINDING_IN_PROGRESS: '正在识别人脸～等一下哦～',
  FACE_FOUND_CONFIRM: '找到脸了！就是现在，笑一个～',
  STORAGE_NEAR_FULL: '手机存储快满了！先清理一下再继续拍吧～',
  LOW_BATTERY_WARNING: '手机电量低了！抓紧时间拍几张～',
  TEMPLATE_MATCH_PERFECT: '姿势超准！这个角度绝了，按下去就是大片！',
  TEMPLATE_MATCH_OFF_REFINE: '姿势稍微跑偏了～跟着剪影调整一下会更好～',
  SELFIE_PANORAMA_HINT: '试试侧身站！45度侧脸最上镜，试试看～',
  CROWD_AVOID_HINT: '旁边人多，稍微等一下或者换个角度躲开～',
  SHADOW_ON_FACE_HINT: '脸上有阴影！稍微侧身躲开阴影，光会更干净～',
  HANDLE_WITH_CARE: '手机拿稳！等她准备好再按快门～',
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
  RAINY_STREET_LAMP: '雨夜路灯下超有氛围！让雨滴打在伞上拍一张～',
  RAIN_PUDDLE_REFLECTION: '地上有水洼！蹲低拍倒影，角度绝了～',
  SNOW_CATCH_LIGHT: '雪地里光线反射强！戴墨镜或者眯眼笑～',
  WIND_STRONG_STABILIZE: '风太大了！双手握稳手机，头发乱的时候别按～',
  FOGGY_MYSTERY: '雾蒙蒙的超有氛围感！这个天气拍出来好有意境～',
  MORNING_DEW: '早晨光线超通透！趁露水还在多拍几张～',
  LEADING_LINE_HINT: '找一条引导线！道路围栏都能引导视线到人身上～',
  SYMMETRY_BUILDING: '正面站直对称构图！这个角度气场全开～',
  FRAME_BOUNDARY: '用门框窗户当框架！画面更有层次感～',
  DEPTH_OF_FIELD_HINT: '走近主体！背景自然虚化，主体更突出～',
  NEGATIVE_SPACE: '留白多一点！画面更透气，更有呼吸感～',
  EYEBROW_RAISE: '眉毛稍微抬起来一点！眼睛会显得更大～',
  JAWLINE_TIGHTEN: '舌尖顶住上颚！下颌线立刻变清晰～',
  NECK_EXTEND: '脖子伸长一点！天鹅颈上线，气质立刻提升～',
  SMILE_TENSION: '嘴角向耳朵方向拉！笑容会更开更灿烂～',
  EYE_SQUINT_HINT: '笑的时候眼睛眯小一点！这个表情好甜～',
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
  PERFECT_FACE_AND_LIGHT: '位置完美！光线也完美！就是现在，按下去就是大片！',
  PERFECT_ALL_IN_ONE: '构图完美！光线完美！姿势完美！三连击，按下去！',
  READY_TO_CAPTURE: '一切就绪！这个瞬间绝美，按快门！',
  CLICK_MOMENT: '现在光线好美！位置也对！赶紧按下去！',
  // 笑脸被检测到时的即时确认
  SMILE_DETECTED: '看到你在笑！就是这个表情，别动，按下去！',
  NATURAL_SMILE_DETECTED: '自然的笑容！好生动，按下去！',
  SAY_CHEESE: '笑一个～茄子！',
  READY_POSE: '准备好了吗？三、二、一！',
  HOLD_STEADY_CAPTURE: '稳住！就是现在！',
  GROUP_FOTO_GUIDE: '大家靠近一点！看镜头，笑一个～',
  KEEP_STEADY_SHAKE: '手别抖！稳住～',
  NIGHT_WARM_LIGHT: '夜色里暖暖的灯光打在脸上好温柔！就是现在拍～',
  CITY_NIGHT_FACE: '城市夜景璀璨！让灯光打在脸上，超有氛围～',
  BALCONY_NIGHT_TIP: '阳台夜景好浪漫！打开闪光灯补补光，脸会更亮～',
  NEON_REFLECTION: '霓虹灯光斑驳打在脸上超美！侧身躲开直射光～',
  THINK_OF_BEST_MOMENT: '想一件最开心的事！这个表情好生动～',
  LOOK_INTO_EYES: '看着我！眼神更有神～',
  LAUGH_LOUDLY: '大笑一个！夸张一点更好看～',
  COUNT_TO_THREE: '一、二、三，笑！',
  RULE_OF_THIRDS_REMIND: '参考九宫格！把脸放到交叉点上～',
  LEADING_ROOM_CHECK: '眼睛看的方向留点空间，画面会更舒服～',
  FACE_CENTER_REMIND: '脸放中间！构图会更稳～',
  COMPOSITION_FINAL: '构图完美！就是现在，按下去！',
  TEMPLATE_MATCH_PERFECT_NOW: '姿势超准！这个光线这角度，按下去就是大片！',
  TEMPLATE_FACE_MOVE: '跟着模板稍微调整一下！就是现在，拍～',
  COMPOSITION_OKAY_NOW: '构图差不多了！这个光线，按下去！',
  COMPOSITION_ALMOST: '就差一点点！稍微调整一下站位～',
  RULE_OF_THIRDS_ON: '打开九宫格！构图会好很多～',
  SMILE_CUTE_NOW: '这个表情好可爱！就是现在，按下去！',
  EXPRESSION_READY: '表情准备好了！笑一个，按快门！',
  POSE_PERFECT_TRY: '姿势超棒！就是现在，按下去就是大片！',
  LIGHT_NICE_NOW: '光线刚刚好！就是现在，拍～',
  LIGHT_SOFT_INDOOR: '室内柔光超适合拍照！随便拍都好看～',
  LIGHT_HARD_AVOID: '光线有点硬！找个柔和的地方试试～',
  NOW_PERFECT: '现在光线完美！姿势也对！就是现在拍～',
  KEEP_TRYING: '继续拍！多拍几张选最好的～',
  GOOD_TAKING: '这张拍得好！继续保持这个感觉～',
  MOTION_BLUR_HINT: '照片有点糊了！双手握稳手机，憋住气再按快门～',
  HANDHELD_NIGHT_SHAKE: '晚上光线暗，手稍微抖照片就糊了！靠在墙上或用闪光灯～',
  STEADY_NIGHT_SHOOT: '晚上稳住！双手握手机，憋住气轻轻按快门～',
  THREE_FACES_DETECTED: '三个人！大家往中间靠，站整齐一点～',
  FOUR_PLUS_FACES: '好多人一起拍！往后站一步，大家都能入镜～',
  GROUP_SMILE_SYNC: '大家一起笑！一二三茄子～',
  GROUP_LOOK_CAMERA: '大家看镜头！对焦在最前面的人身上～',
  GROUP_LAYERED_STAND: '后排稍微错开站，这样每个人都能露出来～',
  EXPRESSION_CHANGE_TRICK: '假装被逗笑！这个表情最自然～',
  THINK_SURPRISE: '假装听到什么惊讶的事！表情马上活起来～',
  RELAX_BEFORE_SMILE: '肩膀放松一下！表情会更自然～',
  TAKE_DEEP_BREATH: '深呼吸～放松再笑，这个表情最自然～',
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
  ELBOW_SUPPORT: '手臂贴近身体更稳！试试看～',
  TWO_HAND_GRIP: '双手握手机！会更稳更清晰～',
  BREATHE_IN_OUT: '深吸一口气，憋住，按快门～',
  RELAX_GRIP: '手机别握太紧！放松一点，手会更稳～',
  GROUND_STANCE: '双脚与肩同宽站好，稳稳的～',
  LOCK_ARMS: '手臂伸直锁住！比弯曲更稳～',
  REST_ELBOW: '手臂靠在膝盖或桌子上，会稳很多～',
  SIT_DOWN_STABLE: '坐下来拍比站着拍更稳，靠着椅背试试～',
  USE_TIMER: '用定时拍照！放在桌面或稳定的地方，自己也能入镜～',
  SUN_GLARE_SQUINT: '阳光太刺眼了！稍微侧身躲开强光，眼睛会更舒服～',
  GLASS_FACE_REFLECTION: '玻璃有反光！稍微侧身躲开脸上的反光～',
  MIRROR_CHECK_OUTFIT: '拍之前先检查一下镜子里！衣服领口都要整理好～',
  POSE_CONFIRM_OK: '姿势到位了！表情准备好了吗？笑一个～',
  POSE_MICRO_ADJUST: '就差一点点了！手的位置再微调一下～',
  STABLE_READY: '稳稳的！可以按快门了～',
  STEADY_AND_GOOD: '手稳了！光线也棒，现在拍正好～',
  HOLD_FOR_MOMENT: '稳住！就这个瞬间，按下去！',
  TRIPOD_HINT: '找个稳定的支撑点放手机！靠在墙边更稳～',
  SELFIE_STICK: '用自拍杆可以拉远距离，手更稳构图更好～',
  BREATHE_IN_OUT_DEEP: '深吸一口气，憋住，轻轻按快门～',
  BODY_WEIGHT_CENTER: '重心放低，双脚站稳，比什么都稳～',
  ARM_TUCK_IN: '手臂贴近身体更稳！试试看～',
}

// 表情检测提示
const EXPRESSION_TIPS = {
  LOOK_SIDE_SMILE: '假装看旁边再转头笑，自然又灵动～',
  HAND_ON_CHIN: '一只手托着下巴，显脸小的经典pose～',
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
  PEACE_SIGN_2: '比个耶或比个剪刀手，活力满满！',
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
  COLD_EXPRESSION: '表情稍微冷一点！嘴角不要上扬，眼神放空，超有气场～',
  TEASING_LOOK: '调皮地歪头，嘴角微微上扬，这个表情绝了！',
  LOOK_UP_GAZE: '抬头向上看，眼神更有灵气，这个角度超美～',
  LIP_BITE: '轻轻咬一下下唇，这个表情好撩人！',
  EYEBROW_RAISE_2: '轻轻抬一下眉毛，俏皮感立刻上来～',
  GENUINE_SMILE: '这笑容好自然！比摆拍好看一百倍～',
  TEASING_SMILE: '调皮地笑一个！比正襟危坐好看多了～',
  CONFIDENT_SMILE: '自信的笑容最上镜！就是现在拍～',
  RELAXED_SMILE: '放松的笑好美！自然流露的表情最动人～',
  SOFT_GAZE: '眼神温柔一点！这个表情好有感觉～',
  PROUD_LOOK: '自信地抬起头！这个表情好有气场～',
  POUT_EXPRESSION: '微微嘟嘴！可爱俏皮满分～',
  RELAXED_EYES: '眼睛放松，不要瞪！柔和的眼神更好看～',
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
  '感觉不错哦，继续保持这个角度～',
  '连续拍了几张都很棒！就是这种感觉！',
  '男朋友越来越果断，赞！',
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
  return pool[Math.floor(Math.random() * pool.length)]
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
      FACE_TIPS.TRY_SIDE_FACE,
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

  /** 拍摄模式提示（人像/HDR/全景/专业/连拍） */
  async speakModeTip(mode: 'portrait' | 'hdr' | 'panorama' | 'pro' | 'burst' | 'timer'): Promise<void> {
    const tips: Record<string, string[]> = {
      portrait: [FACE_TIPS.PORTRAIT_MODE, FACE_TIPS.PORTRAIT_MODE_2],
      hdr: [FACE_TIPS.HDR_HINT, FACE_TIPS.HDR_HINT_2, FACE_TIPS.BACKLIGHT_HDR],
      panorama: [FACE_TIPS.PANORAMA_HINT, FACE_TIPS.PANORAMA_HINT_2, FACE_TIPS.PANORAMA_HINT_3],
      pro: [FACE_TIPS.PRO_MODE_HINT, FACE_TIPS.PRO_MODE_HINT_2],
      burst: [FACE_TIPS.BURST_MODE, FACE_TIPS.BURST_MODE_2],
      timer: [FACE_TIPS.TIMER_HINT, FACE_TIPS.TIMER_HINT_2, FACE_TIPS.TIMER_HINT_3],
    }
    const pool = tips[mode]
    if (pool && pool[0]) {
      await this.speak(pickRandom(pool), true)
    }
  }

  /** 推荐拍照模式（根据场景自动推荐最佳模式） */
  async speakRecommendMode(brightness: number, sceneType?: SceneType): Promise<void> {
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
    // 健身房场景
    if (sceneType === 'gym') {
      await this.speak('健身房灯光均匀，开闪光灯或找窗边，活力满满拍起来～', true)
      return
    }
    // 海边/沙滩场景
    if (sceneType === 'beach') {
      await this.speak('海边阳光强烈，找阴凉处或用闪光灯补光～', true)
      return
    }
    // 雨天街头场景
    if (sceneType === 'rainy_street') {
      await this.speak('雨天光线柔和，靠窗户边拍超有氛围感～', true)
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

  /** 相机权限被拒绝时提示 */
  async speakCameraPermissionDenied(): Promise<void> {
    const tips = [
      '相机权限被拒绝了～在设置里打开相机权限就可以拍照啦',
      '需要相机权限才能拍照哦，去设置里开启一下～',
      '相机用不了是因为没开权限！去设置-隐私-相机里打开就好～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 存储空间不足时提示 */
  async speakStorageFull(): Promise<void> {
    const tips = [
      '手机存储快满了！先清理一下再继续拍吧～',
      '存储空间不够了，删点照片腾出空间再拍～',
      '手机快存满了，清理一下才能继续拍照哦～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 日记删除确认提示 */
  async speakDiaryDeleted(): Promise<void> {
    const tips = [
      '删除成功！这张照片的记录已经从日记里移除了～',
      '删掉啦～这张照片不在日记里了～',
      '记录已删除！重新拍一张更好的吧～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 照片分享成功提示 */
  async speakSharedSuccess(): Promise<void> {
    const tips = [
      '分享成功！让更多人来欣赏这张大片吧～',
      '分享出去啦～男朋友这张拍得真好！',
      '分享完成！把这张好看的照片分享给朋友们看吧～',
    ]
    await this.speak(pickRandom(tips), true)
  }

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
      '表情稍微放松一点！想想开心的事，笑得更自然～',
      '别僵着！深呼吸一下，嘴角微微上扬，这个表情最好看～',
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
    ]
    await this.speak(pickRandom(tips))
  }

  /** 饱和度过高提示 */
  async speakOverSaturatedTip(): Promise<void> {
    const tips = [
      '颜色稍微浓了点，稍微淡雅一点会更自然～',
      '饱和度拉太满了，稍微降降会更耐看～',
      '这张颜色有点过了，换个柔和点的滤镜试试～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 肤色偏色提示 */
  async speakSkinToneTip(): Promise<void> {
    const tips = [
      '肤色稍微有点偏，下次换个角度躲开有色光～',
      '脸上有点发黄或发绿，试试侧身躲开环境光～',
      '光源颜色影响了肤色，换个地方重新拍会更好看～',
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

  /** 姿势匹配提示 — 模板匹配度高时鼓励拍摄 */
  async speakPoseMatchTip(): Promise<void> {
    const tips = [
      '姿势和模板匹配度很高！这个角度绝了，按下去～',
      '剪影和真人完美契合！就是现在，笑一个按下去～',
      '姿势摆得超准！就是这张，按快门就是大片！',
      '完美匹配！就是现在，按下去就是满分作品～',
      '姿势和光线都很棒！按下去就是最佳照片～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 画面过满提示（与 crowdedPlaceTip 互补，更多场景） */
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

  /** 背景太暗提示 */
  async speakBackgroundDarkTip(): Promise<void> {
    const tips = [
      '背景太暗了！找个光源更亮的地方试试～',
      '这张背景有点黑，男朋友换个角度让光打在背景上～',
      '背景太暗了，打开闪光灯或找更亮的地方试试～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 建议换个角度 */
  async speakDifferentAngleTip(): Promise<void> {
    const tips = [
      FACE_TIPS.TRY_DIFFERENT_ANGLE,
      '换个角度试试！侧面、正面不同角度感觉不一样～',
      '稍微调整一下拍摄角度，画面会更丰富～',
    ]
    await this.speak(pickRandom(tips))
  }

  /** 相册保存成功提示 */
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

  /** 人脸检测到确认 + 引导拍照 */
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
    if (arr.length > 0) await this.speak(arr[Math.floor(Math.random() * arr.length)], true)
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

  /** 分数揭晓播报 — 分数动画完成后朗读总分，营造仪式感 */
  /** 分数揭示 — 鼓励型变体（根据最终分数传入不同语气） */
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
    // 鼓励型变体：补充一句温暖的话
    await this.speakScoreEncouragement(score)
  }

  /** 分数段专属鼓励语（温暖补充） */
  private async speakScoreEncouragement(score: number): Promise<void> {
    const highPraise = [
      '这张太惊艳了，女朋友要感动哭了！',
      '男朋友你是偷偷请了摄影师吗！',
      '这张可以直接当头像，太好看了！',
    ]
    const goodPraise = [
      '进步好大！男朋友越拍越有感觉了～',
      '这张很棒！继续保持，下一张冲击满分！',
      '男朋友审美在线！再接再厉！',
    ]
    const okayPraise = [
      '有亮点！多拍几张分数会更高的～',
      '慢慢来，摄影师都是练出来的！',
      '这张比之前好多了，继续加油！',
    ]
    const lowPraise = [
      '没关系！每张大片都是练出来的～',
      '男朋友别气馁，下次一定会更好！',
      '第一次不够完美太正常了，多拍几张感觉就来了！',
    ]

    if (score >= 85) {
      await this.speak(highPraise[Math.floor(Math.random() * highPraise.length)], false)
    } else if (score >= 70) {
      await this.speak(goodPraise[Math.floor(Math.random() * goodPraise.length)], false)
    } else if (score >= 50) {
      await this.speak(okayPraise[Math.floor(Math.random() * okayPraise.length)], false)
    } else {
      await this.speak(lowPraise[Math.floor(Math.random() * lowPraise.length)], false)
    }
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
      '逆光检测到！试试打开 HDR 模式，或者让女友侧身躲开强光～',
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

  /** 存储空间不足提醒 */
  async speakStorageWarning(): Promise<void> {
    await this.speak(FACE_TIPS.STORAGE_NEAR_FULL, false)
  }

  /** 电量低提醒 */
  async speakLowBattery(): Promise<void> {
    await this.speak(FACE_TIPS.LOW_BATTERY_WARNING, false)
  }

  /** 模板匹配度反馈 */
  async speakTemplateMatch(quality: 'perfect' | 'good' | 'off'): Promise<void> {
    if (quality === 'perfect') {
      await this.speak(FACE_TIPS.TEMPLATE_MATCH_PERFECT, false)
    } else if (quality === 'off') {
      await this.speak(FACE_TIPS.TEMPLATE_MATCH_OFF, false)
    }
  }

  /** 笑脸检测到时的即时确认 */
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

  /** 构图完美时的提示 */
  async speakCompositionPerfect(): Promise<void> {
    const tips = [
      '构图完美！这个角度绝了，按下去就是大片！',
      '位置刚刚好！就是现在，拍！',
      '黄金构图！男朋友你开窍了，按下去！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 光线完美时的提示 */
  async speakLightPerfect(): Promise<void> {
    const tips = [
      '光线完美！这个时刻拍出来一定超好看！',
      '光线刚刚好！就是现在，按快门！',
      '光影好美！就是这张，按下去！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 背景检查提醒 */
  async speakCheckBackground(): Promise<void> {
    const tips = [
      FACE_TIPS.CHECK_BACKGROUND,
      '背景检查一下！太乱会抢戏～',
      '看一下背景有没有杂物？干净背景更好看～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 表情自然时的鼓励 */
  async speakExpressionNatural(): Promise<void> {
    const tips = [
      '表情好自然！这个瞬间绝了，按下去！',
      '表情放松了！就是现在拍～',
      '这个表情好生动！就是这张！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 连拍完成提示 */
  async speakBurstComplete(total: number): Promise<void> {
    const tips = [
      `连拍完成！拍了${total}张，选一张最喜欢的吧～`,
      `${total}张连拍完成！动起来的瞬间最自然，选最自然的那张～`,
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 情绪引导提示（根据检测到的情绪给出具体引导） */
  async speakMoodGuidance(mood: 'happy' | 'cool' | 'cute' | 'elegant' | 'energetic'): Promise<void> {
    const tips: Record<string, string[]> = {
      happy: [
        '笑起来眼睛弯弯的最好看了！就是现在，按快门！',
        '这笑容好甜！自然流露的快乐最动人～',
        '笑一个！发自内心的笑容最上镜～',
      ],
      cool: [
        '表情放松，微微侧头，这个角度超有气场～',
        '眼神放空看向远方，酷酷的最有范儿！',
        '冷艳感拉满！这个表情绝了，按下去～',
      ],
      cute: [
        '嘟嘴或歪头，可爱感拉满！',
        '调皮地笑一个！比正襟危坐好看多了～',
        '可爱的小表情最加分了！就是这个瞬间～',
      ],
      elegant: [
        '肩膀放松，脖子伸长一点，气质立刻提升～',
        '下巴微微收紧，下颌线更清晰，优雅感拉满～',
        '姿态舒展，这个角度超有气质！',
      ],
      energetic: [
        '动起来！跑跳的瞬间最有活力～',
        '活力感十足！这个表情好有感染力！',
        '动感抓拍最自然，跟着节奏动起来！',
      ],
    }
    const pool = tips[mood] || tips.happy
    await this.speak(pickRandom(pool), true)
  }

  /** 姿势确认提示（模板匹配度高时播报） */
  async speakPostureConfirmed(): Promise<void> {
    const tips = [
      '姿势到位了！就是现在，按快门！',
      '这个姿势绝了！稳住，按下去就是大片！',
      '姿势完美！表情也准备好了吗？笑一个～',
      '姿势和光线都完美！就是现在，按下去！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 宠物拍照提示 */
  async speakPetPhoto(): Promise<void> {
    const tips = [
      '和小宠物一起入镜超有爱！蹲下来和它平视，画面更亲近～',
      '用零食吸引宠物注意力，让它看向镜头，就是现在抓拍！',
      '连拍模式最适合拍宠物！多拍几张总有一张完美～',
      '宠物奔跑时抓拍最有活力！这个瞬间绝了！',
      '和宠物互动时表情最自然，男朋友准备好了吗？',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 镜子自拍提示 */
  async speakMirrorSelfie(): Promise<void> {
    const tips = [
      '对着镜子稍微斜一点拍！正对镜子会有反光～',
      '镜子稍微斜一点角度更好看，手机举高一点点更显瘦～',
      '镜子里的倒影和手机都会入镜，稍微调整位置躲开～',
      '浴室镜子有雾气时超有氛围感！这个光线绝了～',
      '对着镜子自拍时让身体稍微侧一点，更有曲线感～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 海边泳池场景提示 */
  async speakBeachPool(): Promise<void> {
    const tips = [
      '海边阳光强烈，侧身站着让光打在侧脸上，表情更柔和～',
      '泳池边等浪来的时候抓拍，浪花打在脚踝超有氛围感！',
      '傍晚海边的夕阳光最温柔，侧身站让光打在侧脸上～',
      '泳池边皮肤上有水珠时先擦干，不然反光太明显～',
      '海边穿搭颜色鲜艳的话，在蓝色背景里会超级突出！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 车内拍照提示 */
  async speakCarInterior(): Promise<void> {
    const tips = [
      '车里光线复杂，摇上车窗减少玻璃反光～',
      '坐在副驾驶从斜后方拍，驾驶座的侧脸最有故事感！',
      '傍晚车内暖色灯光超有氛围感，打开车内灯试试～',
      '坐在后座从窗外拍，背景虚化超有电影感～',
      '开车门站在车旁拍，车身当背景超有范儿！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 日记加载完成提示 */
  async speakDiaryLoaded(count: number): Promise<void> {
    if (count === 0) {
      await this.speak('进步日记是空的！先去拍一张吧～', true)
    } else {
      await this.speak(`已加载${count}条进步记录，继续加油！`, true)
    }
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

  /** 照片已删除提示 */
  async speakPhotoDeleted(): Promise<void> {
    await this.speak('这张已删除！换个姿势再拍一张吧～', true)
  }

  /** 达成新里程碑提示 */
  async speakNewMilestone(milestone: string): Promise<void> {
    await this.speak(`太棒了！解锁了「${milestone}」成就！继续保持～`, true)
  }

  /** 夜景闪光灯提示 */
  async speakNightFlashTip(): Promise<void> {
    const tips = [
      '夜景拍照打开闪光灯！让脸亮起来，背景也会保留～',
      '晚上光线太暗，打开闪光灯补光试试～',
      '夜景模式会自动多帧合成，打开夜景模式手要拿稳哦～',
      '晚上拍人像，闪光灯正面补光最有效～',
      '夜间开闪光灯时让手机稍微离人远一点，光线会更均匀～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 窗户人像提示 */
  async speakWindowPortraitTip(): Promise<void> {
    const tips = [
      '窗户边的自然光最柔和！让女朋友靠近窗户坐～',
      '找一扇大窗户，自然光打在人脸上超好看～',
      '窗边拍摄时，让女朋友侧对窗户，光影最有立体感～',
      '逆光剪影很有意境！把窗户放在身后，让光勾勒轮廓～',
      '窗边拍摄时，背景选择干净的墙面，画面更简洁～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 秋季红叶/色彩环境提示 */
  async speakAutumnLeavesTip(): Promise<void> {
    const tips = [
      '红叶季节光线斑斓！侧光让树叶更有层次感～',
      '秋天拍逆光，叶子会透光超美！试试转过来～',
      '红叶背景会让皮肤显得更通透，现在光线正好～',
      '秋季户外光线好柔！让女朋友在红叶前转个圈抓拍～',
      '秋天的光线最温柔，这个时间拍照光线绝美～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 反光面拍摄提示（镜子/玻璃/水面） */
  async speakReflectionShotTip(): Promise<void> {
    const tips = [
      '玻璃和水面的倒影超有感觉！稍微斜着拍，倒影会更完整～',
      '找一块干净的反光面，俯拍时倒影和人会形成对称构图～',
      '玻璃反光时要斜着拍，躲开周围的杂乱环境～',
      '水面倒影需要慢门或稳定手机，打开连拍抓一张～',
      '镜子拍摄时把手机稍微侧一点，躲开自己和镜中像重叠～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 情侣合照专属姿势提示 */
  async speakCouplePoseTip(): Promise<void> {
    const tips = [
      '两个人靠近一点贴贴！这个距离刚刚好，按下去～',
      '对视一下！就是这样，超级有感觉～',
      '男生从后面抱着她！这个姿势超经典～',
      '牵手背对镜头往前走，男朋友从后面抓拍，氛围感绝了～',
      '两人并排站着，一起看镜头笑，这个合照经典又好看～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 闺蜜合照专属提示 */
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

  /** 首次拍摄引导提示 */
  async speakFirstPhotoHint(): Promise<void> {
    const tips = [
      '第一张照片！深呼吸，放轻松，男朋友准备好了就按下去～',
      '新手上路！别紧张，慢慢来，男朋友你行的～',
      '第一张开始！让女朋友站好位置，笑一个，按下去～',
      '初次开拍！告诉男朋友打开九宫格辅助线，构图会更准～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 存储空间不足提示 */
  async speakStorageHint(): Promise<void> {
    const tips = [
      '手机存储快满了！先清理一下再继续拍吧～',
      '存储空间不够了，删点照片或清理缓存再继续～',
      '存储快满了！先把好看的照片备份出来再拍～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** HDR 模式提示 */
  async speakHDRTip(): Promise<void> {
    const tips = [
      '明暗对比大！打开 HDR 模式，高光阴影都能保留～',
      '这个场景开 HDR 模式更好看！打开试试～',
      '逆光或强光场景建议打开 HDR，打开相机的 HDR 设置～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 构图最后确认提示 */
  async speakCompositionConfirm(): Promise<void> {
    const tips = [
      '最后确认一下：人脸在交叉点上，背景干净，光线均匀！',
      '打开九宫格看一眼：人脸对准了吗？背景干净吗？可以按了～',
      '构图确认！九宫格对齐了吗？可以按快门了～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 人脸丢失提示 — 实时检测中人脸突然消失时触发 */
  async speakFaceLost(): Promise<void> {
    const tips = [
      '看不到脸了！再靠近一点，让相机找到你～',
      '脸丢了！稍微站近一点，让镜头找到你～',
      '相机找不到你的脸了，往前一点点～',
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
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 姿势完美匹配提示 — 模板匹配度 95%+ 时 */
  async speakExcellentPose(): Promise<void> {
    const tips = [
      '姿势完美！就是现在，按下去就是大片！',
      '和模板完全吻合！这一张绝对高分！',
      '姿势绝了！男朋友快门按下去就是神作！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 接近满分提示 — 95-99 分区间 */
  async speakNearPerfect(score: number): Promise<void> {
    await this.speak(`${score}分！只差一点点就是满分了，太厉害了！`, true)
  }

  /** 夜景拍摄引导提示 */
  async speakNightSceneTip(): Promise<void> {
    const tips = [
      '夜景光线复杂，打开闪光灯或找光源更亮的地方～',
      '晚上拍照手要更稳！双手握手机，深呼吸后按快门～',
      '夜景模式拍完要等一下，让手机自动合成多帧～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 连拍鼓励提示 — 引导男朋友多拍几张提升成功率 */
  async speakStreakEncourage(): Promise<void> {
    const tips = [
      '多拍几张！按住快门别松手，总有一张完美的～',
      '连拍模式开启！多按几张，男朋友总能找到最好的角度～',
      '连拍！多拍总没错，最好的表情往往在不经意间～',
      '连拍模式拍起来！多按几张成功率更高～',
      '多拍几张保险！连拍模式下男朋友尽情按快门～',
    ]
    await this.speak(pickRandom(tips), true)
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

  async speakNightGuide(): Promise<void> {
    const tips = [
      '夜景光线复杂，打开闪光灯补补光～',
      '晚上光线不足，打开闪光灯或找个光源站～',
      '夜间拍照手要更稳，深呼吸后按快门～',
      '夜景模式自动开启，手拿稳等处理完成～',
      '晚上光线暗，打开闪光灯拍出来会更清晰～',
      '夜间逆光很美！转过来让脸朝向光源试试～',
      '夜晚室内打开室内灯，让脸更亮更清晰～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakExpressionRelaxGuide(): Promise<void> {
    const tips = [
      '表情再自然一点！想想最开心的事，嘴角上扬一点点～',
      '笑一个！自然的笑容最好看～',
      '让她放松一下！深呼吸，然后笑一个～',
      '表情再柔和一点，嘴角微微上扬就够了～',
      '逗她笑一下！这个表情最生动～',
      '假装被逗笑了，自然流露的笑容最动人～',
      '让她想想最喜欢的人或事，表情会变温柔的～',
      '别僵着！想象旁边有只小猫在逗她～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakCoupleTip(): Promise<void> {
    const tips = [
      '情侣照要靠近一点！贴贴更甜蜜～',
      '两人对视一下！这个角度超有感觉～',
      '男生从后面环抱，经典的甜蜜姿势～',
      '牵手背对镜头，回头看镜头，超有氛围感～',
      '两人靠近一点，贴贴更上镜～',
      '对视一下！这个表情绝了，按下去～',
      '两人互动抓拍！逗她笑的那个瞬间最自然～',
      '男生公主抱起来！这个瞬间超甜～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakGoldenLightGuide(): Promise<void> {
    const tips = [
      '现在是拍照的黄金时段！光线超美，赶紧多拍几张～',
      '日落前半小时光线最温柔！这时间段拍人像绝了～',
      '黄金时段到了！趁阳光还在多按快门～',
      '日落光线好温柔！侧身站让光打在侧脸上～',
      '日出后或日落前是拍照黄金期，这光这角度绝了～',
      '黄金时段很短！抓紧时间多拍几张，光线不会再来～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakCloudyLightGuide(): Promise<void> {
    const tips = [
      '阴天光线超柔和！脸上不会有硬阴影，随便拍都好看～',
      '阴天的漫反射光是天然柔光箱，拍人像超合适～',
      '阴天没有强光直射，不用担心过曝，这个时间随便拍～',
      '阴天光线偏冷白，后期可以加一点暖色调让肤色更健康～',
      '阴天光线均匀又稳定！拍特写和近景最合适了～',
      '阴天拍照皮肤状态超好！这个时间段光线超柔～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakPetTip(): Promise<void> {
    const tips = [
      '和宠物互动时蹲下来和它平视，表情最自然～',
      '让男朋友在旁边等着随时抓拍！自然的瞬间最可爱～',
      '逗猫逗狗抓拍！和小动物互动时表情最生动～',
      '宠物动来动去！连拍模式按着快门别松手～',
      '让宠物看向镜头！用零食或声音吸引它的注意力～',
      '和宠物同框超有爱！自然的互动最可爱～',
      '让猫咪或狗狗先放松，再慢慢引导它们看镜头～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakGroupShotGuide(): Promise<void> {
    const tips = [
      '多人合照大家靠近一点！贴贴更上镜～',
      '合照时后排稍微错开站，这样每个人都能露出来～',
      '人多往后退一步！大家都入镜才好看～',
      '多人合照对焦在中间的人身上最合适～',
      '大家看镜头！对焦在最前面的人身上哦～',
      '合照时稍微错落站位，这样构图更有层次～',
      '多人拍摄连拍几张，总有一张每个人表情都在线～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakFlashTip(): Promise<void> {
    const tips = [
      '光线有点暗，打开闪光灯补补光～',
      '闪光灯可以消除脸上的阴影，让皮肤看起来更通透～',
      '逆光时打开闪光灯正面补光，背景和人脸都能兼顾～',
      '闪光灯跳闪效果更柔和！把灯头朝向天花板反射下来～',
      '后置镜头开闪光灯距离远效果一般，靠近一点补光会更自然～',
      '柔光罩可以软化闪光灯直打的硬光，让皮肤更柔和～',
      '晚上或暗光环境下打开闪光灯，照片会更清晰～',
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

  async speakZoomTip(): Promise<void> {
    const tips = [
      '光线充足时稍微拉近一点，人物特写更有张力～',
      '不要用数字变焦！走近一点拍，画质会好很多～',
      '人像模式最好用 1 倍或 2 倍光学变焦，画质最佳～',
      '逆光时稍微拉近，可以拍到更多轮廓光～',
      '光线好的时候可以用 2 倍变焦拍半身特写，更有质感～',
      '超广角拍建筑有气势，拍人像容易变形，建议换回 1 倍～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakPortraitModeTip(): Promise<void> {
    const tips = [
      '人像模式背景虚化超美！试试用这个模式拍～',
      '人像模式让背景柔化，主体更突出～',
      '开人像模式要找明显的前景或背景，虚化效果才明显～',
      '人像模式光线充足时效果最好，逆光也能拍出轮廓光～',
      '人像模式半身照最佳，距离 1 到 2 米效果最好～',
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

  async speakPoseConfirmTip(): Promise<void> {
    const tips = [
      '姿势完美！这个角度绝了，按下去就是大片～',
      '姿势超准！就是现在，按快门！',
      '跟着剪影摆好了！就是现在，笑一个按下去～',
      '姿势和模板完美匹配！按下去就是满分作品～',
      '完美！就是现在！按下去～',
      '姿势超棒！就是现在，按下去就是大片！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakCompositionGuide(): Promise<void> {
    const tips = [
      '构图完美！这个光线，按下去就是大片～',
      '打开九宫格！把脸放到交叉点上～',
      '构图差不多了！就是现在，按下去～',
      '脸放中间！构图会更稳～',
      '九宫格对齐了！这个位置按下去～',
      '构图完美！光线也完美！三连击，按下去！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  async speakHarshLightTip(): Promise<void> {
    const tips = [
      '正午阳光太硬了！找个树荫或阴凉处拍～',
      '强光下眯眼好辛苦！找个柔和的地方试试～',
      '正午光线太直了，脸上的阴影好奇怪～',
      '太阳太晒了！找个阴凉处，光线会更柔和～',
      '强光下容易过曝，找个阴影处或等傍晚再拍～',
      '光线太硬了！找个树荫或建筑阴影，光会更柔～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 强日光户外建议 — 正午/夏季户外亮度高直射（Round 2 新增） */
  async speakHarshSunlightOutdoor(): Promise<void> {
    const tips = [
      '阳光直晒太烈了！找个树荫或建筑阴影，光线会柔很多～',
      '户外阳光太强容易过曝！侧身站躲开直射光，或者找个阴凉处～',
      '正午烈日下拍照容易阴阳脸！找个柔和的光源再拍～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 雾霾天/沙尘天建议（Round 2 新增） */
  async speakSmokeHazeTip(): Promise<void> {
    const tips = [
      '今天天气有点雾，光线反而很柔和！找个前景虚化，超有层次感～',
      '雾霾天气拍侧脸超有感觉！柔和的光线让皮肤看起来超好～',
      '这种天气背景朦胧有氛围感！主体清晰、背景柔化，层次分明～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 地铁/地下空间暗光建议（Round 2 新增） */
  async speakMetroSubwayTip(): Promise<void> {
    const tips = [
      '地铁站光线偏暗！找个灯光充足的位置，或者打开闪光灯补光～',
      '地下空间灯光偏冷偏暗！侧身站让光打在侧脸上，立体感会更强～',
      '地铁出口光差大！稍微等眼睛适应后再拍，避免脸太黑～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 照片已保存到相册（ResultScreen 保存成功后播报） */
  async speakResultSaved(): Promise<void> {
    const tips = [
      '已保存到相册！去相册里翻翻看吧～',
      '保存成功！这张要好好收藏哦～',
      '照片已入库！有空去相册里看看～',
      '保存好了！可以去相册里找这张了～',
      '搞定！这张值得永久保存～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 分享准备就绪 */
  async speakShareReady(): Promise<void> {
    const tips = [
      '分享出去让大家羡慕一下～',
      '这张不分享可惜了！发朋友圈吧～',
      '男朋友的大作，分享给闺蜜看看～',
      '这张绝了！分享给朋友炫耀一下～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 日记为空时的引导提示 */
  async speakDiaryEmpty(): Promise<void> {
    const tips = [
      '日记还是空的！先去拍一张吧～',
      '还没有记录呢！去拍照看看男朋友进步了没有～',
      '日记等着你来填满！先拍一张试试～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 用户跳过自动推荐的模板 */
  async speakTemplateSkipped(): Promise<void> {
    const tips = [
      '没关系！换一个姿势试试～',
      '这个不太喜欢？往左滑看看别的～',
      '跳过啦～看看下一个姿势合不合适～',
      '没找到喜欢的？翻翻看其他模板吧～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 连拍串断裂提醒 */
  async speakStreakBroken(): Promise<void> {
    const tips = [
      '连续拍照断了～没关系，今天重新开始！',
      '打卡断了一天！明天继续加油～',
      '连续记录暂时休息了一下，新的一天重新开始吧～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 接近每日目标时的鼓励 */
  async speakNearDailyGoal(remaining: number): Promise<void> {
    const tips = [
      `就差${remaining}张了！再拍几张达标～`,
      `今天目标快完成了！再坚持${remaining}张～`,
      `${remaining}张就到今天的任务了！冲一下～`,
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 检测到正视镜头（眼神到位）— 正向确认 */
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

  /** 完美时刻综合播报（构图+光线+姿势均到位时） */
  async speakPerfectMomentNow(): Promise<void> {
    const tips = [
      '现在光线完美！姿势也对！就是现在拍～',
      '这光线这角度绝了！按下去就是大片！',
      '光线刚刚好，姿势也到位了！就是现在拍～',
      '完美时刻！构图光线都在线，赶紧按下去！',
      '这角度这光线都绝了！就是现在！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 多人合照中有人没看镜头 */
  async speakGroupLookAtCamera(): Promise<void> {
    const tips = [
      '大家都在看镜头吗？提醒一下还没看过来的人～',
      '有人没看镜头哦！让大家一起看镜头笑一个～',
      '后排的也要看镜头！提醒一下～',
      '合照大家要一起看镜头哦～准备，一二三茄子！',
    ]
    await this.speak(pickRandom(tips), false)
  }

  // ===== speakScene - 统一场景入口（映射 VoiceScene 类型到具体方法） =====
  /**
   * speakScene - 统一场景入口
   * 将 VoiceScene 类型映射到具体的 speak 方法
   * VoiceScene 类型定义见 src/services/voiceCoach.ts
   */
  async speakScene(scene: string, score?: number): Promise<void> {
    switch (scene) {
      case 'app_start':
        await this.speakDailyWelcome(true); break
      case 'camera_ready':
        await this.speakCameraSetupTip(); break
      case 'photo_captured':
        await this.speakCaptureSuccess(); break
      case 'analyzing':
        await this.speakProcessingDone(); break
      case 'score_reveal':
        await this.speakScoreReveal(score ?? 0); break
      case 'diary_loaded':
        await this.speakDiaryLoaded(0); break
      case 'template_selected':
        await this.speakTemplateTip('跟着剪影摆好姿势，让男朋友准备拍照！'); break
      case 'milestone':
        await this.speakMilestone(score ?? 0); break
      case 'encourage':
        await this.speakRetryTip(score ?? 0); break
      case 'celebration':
        await this.speakCelebration('streak3'); break
      case 'photo_saved':
        await this.speakSavedToAlbum(); break
      case 'filter_selected':
        await this.speakFilterSwipeHint(); break
      case 'filter_swipe':
        await this.speakFilterSwipeHint(); break
      case 'share_success':
        await this.speakShareSuccess(); break
      case 'photo_deleted':
        await this.speakDiaryDeleted(); break
      case 'processing_done':
        await this.speakProcessingDone(); break
      case 'perfect_timing':
        await this.speakPerfectTiming(); break
      default:
        await this.speakPerfectTiming()
    }
  }

  // ===== 缺失的场景方法 - 基于 analyzer.ts SceneType 枚举 =====
  // 场景类型定义: indoor | outdoor | cafe | rooftop_night | camping_campfire | snow |
  // ski_resort | cherry_blossom | christmas | gym | zoo | train | ancient_town | lighthouse |
  // subway | supermarket | rooftop_party | farm | graffiti | aquarium | chapel | market_stall |
  // bakery | carousel | greenhouse | tent_camp | graduation | festival_lights | graduation_outdoor |
  // old_town | beach_sunset | rainy_street | morning_run | bookstore | mirror | carnival |
  // beach | dance_performance | red_autumn_detail | rooftop_daytime | amusement_carnival |
  // airport_station | meadow_ranch | subway_escalator

  /** 天台派对场景 */
  async speakRooftopPartyTip(): Promise<void> {
    const tips = [
      '天台派对灯光璀璨！让灯光打在侧脸上，表情放松超有氛围～',
      '派对灯光超炫酷！打开闪光灯补补光，笑容灿烂一点～',
      '天台夜景超有感觉！侧身站着让城市灯光勾勒轮廓，超酷～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 农场田园场景 */
  async speakFarmTip(): Promise<void> {
    const tips = [
      '农场田园光线超自然！侧身站着让阳光打在侧脸上，温柔又清新～',
      '田园场景好适合拍自然风！表情放松，笑容灿烂最上镜～',
      '农场草地超有氛围！找个有趣的角度，让背景更丰富～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 涂鸦墙场景 */
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

  /** 集市摊位场景 */
  async speakMarketStallTip(): Promise<void> {
    const tips = [
      '集市摊位灯光暖暖的！靠着摊位随意一点，生活感十足～',
      '市集超有烟火气！捧着喜欢的物件，表情自然一点～',
      '集市道具超丰富！找个有趣的摊位做背景，俏皮一点～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 旋转木马场景 */
  async speakCarouselTip(): Promise<void> {
    const tips = [
      '旋转木马超梦幻！坐在木马上侧身看镜头最上镜～',
      '游乐场光线复杂，找个不逆光的角度～',
      '木马转起来的时候抓拍，表情自然又灵动～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 温室植物园场景 */
  async speakGreenhouseTip(): Promise<void> {
    const tips = [
      '温室里光线超柔和！绿植背景清新又自然～',
      '站在花丛前面，侧身微笑最上镜～',
      '温室光线均匀，不用担心过曝，放开笑～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 帐篷露营场景 */
  async speakTentCampTip(): Promise<void> {
    const tips = [
      '帐篷露营超有氛围！让帐篷做背景，笑容灿烂一点～',
      '户外露营光线自然！找个好看的角度，让背景更丰富～',
      '帐篷旁边超有野外感！表情放松自然，这张绝了～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 海边日落场景 */
  async speakBeachSunsetTip(): Promise<void> {
    const tips = [
      '海边夕阳余晖超浪漫！侧身站着让光打在侧脸上，轮廓绝了～',
      '夕阳倒映在海面上超美！蹲低一点拍出倒影，角度绝了～',
      '海边夕阳光线最温柔！表情放松，笑容自然，这张值得永久保存～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 雨天街头场景 */
  async speakRainyStreetTip(): Promise<void> {
    const tips = [
      '雨天街道超有氛围感！透明伞撑起来，画面超有感觉～',
      '雨滴打在伞上超浪漫！侧身靠着，表情放松，这张绝了～',
      '雨夜路灯下光线超柔和！找个光源站好，表情会更清晰～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 晨跑运动场景 */
  async speakMorningRunTip(): Promise<void> {
    const tips = [
      '早晨光线超通透！笑容灿烂活力满满，这张绝了～',
      '晨跑场景好有活力！动起来抓拍，活力感十足～',
      '早晨户外光线最柔和！找个干净的背景，表情自然一点～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 书店文艺场景 */
  async speakBookstoreTip(): Promise<void> {
    const tips = [
      '书店里的光线超有质感！靠在书架旁边，文艺感拉满～',
      '书香气质超适合拍照！侧身站着，表情知性一点～',
      '书架前超有氛围感！找个光线好的角落，表情自然～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 地铁站场景 */
  async speakSubwayTip(): Promise<void> {
    const tips = [
      '地铁站冷调灯光超有都市感！侧身站着，表情酷一点～',
      '地铁站光线均匀！靠着柱子，看向远方，超有故事感～',
      '地铁站背景超有层次！找个干净的角落，表情自然一点～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 地铁扶梯场景 */
  async speakSubwayEscalatorTip(): Promise<void> {
    const tips = [
      '扶梯上动起来超有活力！走起来抓拍，表情自然又生动～',
      '扶梯背景超有都市感！侧身靠着，表情放松，这张绝了～',
      '地铁扶梯光线均匀！找个不逆光的角度，表情酷一点～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 机场车站场景 */
  async speakAirportStationTip(): Promise<void> {
    const tips = [
      '机场车站超有故事感！背对镜头或侧身站，表情自然一点～',
      '候车大厅光线均匀！靠着柱子，看向远方，超有氛围～',
      '车站背景超有层次！找个简洁的角落，表情放松～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 海滩泳池派对场景 */
  async speakBeachPoolPartyTip(): Promise<void> {
    const tips = [
      '泳池边光影好漂亮！坐在池边看镜头笑～',
      '海滩光线超通透！侧身站着让光打在侧脸上，超美～',
      '泳池派对超有活力！动起来抓拍，笑容灿烂～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 早晨拍照提示 */
  async speakMorningPhotoTip(): Promise<void> {
    await this.speak('早晨的光线最通透！趁光线好赶紧多拍几张～', false)
  }

  /** 连续拍摄激励 */
  async speakDayStreakTip(count: number): Promise<void> {
    if (count === 2) {
      await this.speak('连续两天都在拍！男朋友越来越有感觉了～', false)
    } else if (count === 3) {
      await this.speak('连续三天！男朋友拍照习惯养成了，继续保持～', false)
    } else {
      await this.speak(`连续${count}天都在拍照！男朋友你是认真的吧，太棒了～`, false)
    }
  }

  /** 首次拍照引导 */
  async speakFirstPhotoTip(): Promise<void> {
    const tips = [
      '第一次拍！不用紧张，随便找个好看的角度按下去就是进步～',
      '新手第一天！找个光线好的地方，随便拍两张练练手～',
      '第一次玩这个！不用追求完美，先熟悉一下怎么用～',
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 定时拍照提示（扩展版，支持秒数参数） */
  async speakSelfieTimerTip(seconds: number = 3): Promise<void> {
    const tips = seconds === 3
      ? ['定时三秒！放在稳定的地方，摆好姿势等着～', '三秒倒计时！先摆好姿势，然后去站位～']
      : ['定时十秒！先摆好姿势和位置，然后跑去站好～', '十秒倒计时！有充足的时间走到位置摆好pose～']
    await this.speak(pickRandom(tips), true)
  }

  /** 连拍高产鼓励（拍了 5/10/15 张后） */
  async speakBurstEncourage(count: number): Promise<void> {
    const tips = [
      `连拍${count}张！多拍几张选最好的，这种方法超有效～`,
      `${count}张连拍！男朋友太努力了，继续保持这个节奏！`,
      `拍了${count}张！量变引起质变，继续加油！`,
    ]
    await this.speak(pickRandom(tips), false)
  }

  /** 进步加速提示（分数比上次提升 10 分以上时） */
  async speakScoreJumped(previousScore: number, newScore: number): Promise<void> {
    const diff = newScore - previousScore
    const tips = [
      `比上次进步了${diff}分！男朋友你开窍了！`,
      `${previousScore}分到${newScore}分，进步${diff}分！继续保持！`,
      `一下子进步了${diff}分！男朋友学得好快！`,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 模板加载缓慢提示 */
  async speakTemplateLoadingSlow(): Promise<void> {
    await this.speak('姿势模板加载中，耐心等一下～', false)
  }

  /** 情侣互动专属提示（进阶版） */
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
    ]
    await this.speak(pickRandom(tips), true)
  }

  // ===== 新增语音场景 =====

  // speakBacklightTip/speakGoldenHourTip/speakPortraitModeTip/speakCompositionGuide/speakLowBattery
  // 已在上方定义，此处补充以下新增方法：

  /** 光线太暗时提醒（与 speakLowLightWarning 不同：强调找光源策略） */
  async speakLowLightTip(): Promise<void> {
    const tips = [
      '光线有点暗，打开补光灯或找亮一点的地方试试～',
      '环境光不够，靠近窗户或打开手机闪光灯～',
      '太暗了！找个光源或者打开屏幕补光吧～',
      '光线不足噪点会很多，找个亮一点的地方拍会更好～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 完美拍摄时的鼓励 */
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
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 健身房镜子拍照提示 */
  async speakGymMirrorTip(): Promise<void> {
    const tips = [
      '对着镜子侧身站！举一下哑铃超有活力，赶紧拍～',
      '健身房镜子前光线从侧面打进来最有立体感～',
      '穿亮色运动服在镜子前超显眼！笑一个拍～',
      '动感单车旁光线好！侧身站着，让侧光勾勒线条～',
      '瑜伽垫上躺着俯拍超显脸小！这个姿势绝了～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 火车窗边拍照提示 */
  async speakTrainWindowTip(): Promise<void> {
    const tips = [
      '火车窗边光线均匀！侧身靠着窗，让光打在侧脸上～',
      '车窗有反光，稍微侧身躲开玻璃反光～',
      '透过车窗拍人，层次感绝了！试试看～',
      '火车窗边穿纯色衣服，和窗外风景更搭～',
      '高铁窗边超有电影感！就是现在，按快门～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 节日灯展/灯会拍照提示 */
  async speakFestivalLanternTip(): Promise<void> {
    const tips = [
      '灯展灯光斑斓！让光打在侧脸上，别让灯直射眼睛～',
      '灯串做前景超浪漫！让灯串在镜头前虚化成光斑～',
      '灯展一般晚上拍，打开闪光灯正面补光～',
      '灯展颜色丰富！穿纯色衣服更显主体～',
      '灯串从上方垂下来做背景，仰头看镜头，梦幻感绝了～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 雨天室内窗边拍照提示 */
  async speakRainyWindowTip(): Promise<void> {
    const tips = [
      '雨天室内窗边超有氛围！让窗户的光打在侧脸上～',
      '玻璃上有水珠超有意境！镜头贴近玻璃拍出朦胧感～',
      '雨滴落在窗户上形成漂亮的模糊背景，特写超美～',
      '雨天窗户雾气蒙蒙！用手指在玻璃上画个爱心超浪漫～',
      '雨夜路灯透过窗户照进来，暖黄色超有氛围感～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 雪天拍照提示 */
  async speakSnowWeatherTip(): Promise<void> {
    const tips = [
      '雪地光线反射极强！戴墨镜或者眯眼笑～',
      '雪地白茫茫一片，穿鲜艳衣服才不会被背景吞没～',
      '雪地脚印可以做引导线！顺着脚印走向镜头，画面有延伸感～',
      '雪后初晴光线最美！趁雪还没化赶紧多拍几张～',
      '雪地仰拍超浪漫！躺在雪地上仰头看镜头，超有创意～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 演唱会现场拍照提示 */
  async speakConcertLiveTip(): Promise<void> {
    const tips = [
      '演唱会灯光闪烁！举起荧光棒，让光源照亮脸部～',
      '舞台灯光打在脸上颜色会变！等白光时赶紧拍一张～',
      '举起双手跟着节奏摇摆，活力感十足，连拍抓拍～',
      '演唱会拍的是氛围！对焦在脸上，让舞台灯光做背景光斑～',
      '演唱会手机拍不清楚？开启专业模式调高 ISO～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 照片数量里程碑提示（进入进步日记时播报） */
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


  /** 超市便利店场景提示 */
  async speakSupermarketTip(): Promise<void> {
    const tips = [
      '拿个零食饮料当道具！俏皮可爱，互动感十足～',
      '超市货架前超有生活感！靠过去拍一张～',
      '便利店灯光均匀，俏皮自然～',
      '拿个小零食比耶！活力感十足～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 室内人像场景提示 */
  async speakIndoorPortraitTip(): Promise<void> {
    const tips = [
      '室内找窗边！自然光最柔和～',
      '靠近窗户让光线打在脸上，这质感绝了！',
      '避开窗户反光，侧身站着更自然～',
      '室内白墙会反光！靠近墙站脸会更亮～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 户外风景场景提示 */
  async speakOutdoorLandscapeTip(): Promise<void> {
    const tips = [
      '户外找干净背景！光影斑驳超有层次感～',
      '逆光剪影好有意境！转过身来让光打在侧脸上～',
      '户外光线充足，找好角度超容易出片！',
      '找一面白墙或绿植背景，构图干净又高级～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** ===== 2026-05-25 新增 TTS 场景 ===== */

  /** 对焦失焦提醒 */
  async speakFocusLost(): Promise<void> {
    const tips = [
      '对焦跑掉了！点一下屏幕上的人脸位置，重新对焦～',
      '对焦没对上！用手指点一下屏幕中间，让相机重新找到你～',
      '相机对焦丢失了！在屏幕上点击人物位置，重新对焦～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 预览模式下确认拍摄 */
  async speakPreviewReady(): Promise<void> {
    const tips = [
      '预览好了吗？准备好了就按快门吧～',
      '这个角度不错！就是现在，按下去～',
      '预览效果很好！按快门记录下来吧～',
    ]
    await this.speak(pickRandom(tips), true)
  }


  /** 持续稳定时的确认提示 */
  async speakSteadyConfirmed(): Promise<void> {
    const tips = [
      '稳了稳了！就是现在，按下去就是大片！',
      '手稳住了！姿势也对，按快门！',
      '稳如磐石！这个瞬间绝了，按下去！',
      '稳稳的！光线也刚好，就是这张了！',
    ]
    await this.speak(pickRandom(tips), true)
  }


  /** 拍摄后夸奖确认（增强用户信心） */
  async speakPhotoConfirmation(): Promise<void> {
    const tips = [
      '这张拍得不错！继续拍下去～',
      '拍到了！多拍几张选最好的～',
      '按下了！就是这张，感觉不错～',
      '咔嚓！这张可以，继续保持～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 定时拍照倒计时中 */
  async speakTimerRunning(seconds: number): Promise<void> {
    const tips = [
      `${seconds}秒后拍摄～摆好姿势别动哦～`,
      `还有${seconds}秒！姿势准备好，马上拍～`,
      `倒计时${seconds}秒！准备好了吗～`,
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 夜间手持不稳警告 */
  async speakNightHandheldWarning(): Promise<void> {
    const tips = [
      '晚上光线暗！靠在墙上或找个支撑点拍～',
      '晚上手机容易抖！把手机放在桌面或靠在墙上更稳～',
      '夜间拍照要更稳！双手握手机，深呼吸后按快门～',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 检测到自然表情时的正向确认（补充 speakSmileDetected） */
  async speakExpressionDetected(): Promise<void> {
    const tips = [
      '表情好自然！就是这个感觉，按下去～',
      '眼神到位了！表情超自然，按快门！',
      '这表情好灵动！就是现在拍～',
      '笑容好生动！这个瞬间绝了，按下去！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 背景变干净时的确认提示 */
  async speakBackgroundClear(): Promise<void> {
    const tips = [
      '背景干净了！这个位置超好看，按快门～',
      '换了个好位置！背景干净主体突出，拍～',
      '这个角度背景超简洁，就是现在拍！',
    ]
    await this.speak(pickRandom(tips), true)
  }

  /** 黄金时刻拍摄确认（光线条件完美时） */
  async speakGoldenLightConfirm(): Promise<void> {
    const tips = [
      '这光线绝了！就是现在拍，光影最美的时刻～',
      '黄金光线！男朋友快按快门，这光太美了～',
      '光影太漂亮了！赶紧拍一张，光线不会等人的～',
    ]
    await this.speak(pickRandom(tips), true)
  }
}

export { FACE_TIPS, STABILITY_TIPS, EXPRESSION_TIPS }

export default new VoiceCoach()
