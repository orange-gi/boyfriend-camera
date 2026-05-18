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
    '构图感绝了，视觉重心刚刚好，舒服！',
    '男朋友终于把背景和人物的关系搞明白了，可喜可贺！',
    '构图感满分！主体位置刚刚好，背景干净又高级！',
    '男朋友这构图感觉像学过摄影一样，舒服！',
    '构图拿捏得死死的！这张大片感拉满了！',
  ],
  // 构图一般（28-34分）但整体不错的鼓励文案 Round 3 新增
  composition_okay: [
    '构图越来越有感觉了！这张位置刚好～',
    '构图进步了！人站的位置比上次好看了～',
    '这张构图更稳了，男朋友感觉越来越好！',
    '构图更讲究了！主体位置比上次更舒服～',
    '男朋友构图感在进步！这张位置刚刚好～',
  ],
  exposure_great: [
    '光线刚刚好，皮肤看起来通透又自然！',
    '亮度满分！这光线简直是老天爷帮忙打的～',
    '这张的光打得也太温柔了吧，看起来皮肤状态超好！',
    '光线完美！有种杂志封面的质感了～',
    '柔和的光线刚刚好，整个人都在发光！',
    '这张逆光剪影也太有感觉了吧，男朋友审美开窍了？',
    '光线均匀又柔和，皮肤看起来超细腻！',
    '这光打得也太温柔了，男朋友你是专业的吗？',
  ],
  stability_great: [
    '稳如老狗！这张照片清晰到连发丝都数得清！',
    '清晰度满分！男朋友的手终于不抖了，值得表扬！',
    '这张太清晰了，可以直接当头像用！',
    '马步扎得稳！这清晰度，一看就是练过的～',
    '清晰得像专业相机拍出来的，男朋友你行啊！',
    '这张稳得离谱，男朋友你是开了三脚架吗？哈哈～',
    '稳得不行！这清晰度放大看都经得起考验！',
    '手稳如山！这张照片每一根头发丝都清晰可见！',
  ],
  total_amazing: [
    '100 分！！！这张照片我要存档一万遍！男朋友你是开挂了吗！',
    '满分之作！男朋友你是偷偷进修了吗？这张照片可以上杂志封面了！',
    '满分满分！这构图这光线简直是教科书级别！可以直接去参赛了！',
    '满分神作！这张照片朋友看了都要问你在哪拍的！',
    '男朋友你确定不是偷偷请了摄影师的？这表现太惊艳了！',
  ],
  level_great: [
    '地平线笔直！男朋友终于学会看水平仪了，感动！',
    '这张端得超稳，强迫症看了都说舒服！',
    '歪？是谁把照片扶正的？是我男朋友！（骄傲）',
    '端得比桌子还平，男朋友你是强迫症附体了吗？',
  ],
  // 95-100 分专属满分文案（扩充）
  score_95_100: [
    '满分之作！！！男朋友你是偷偷进修了吗？这张照片可以上杂志封面了！',
    '100 分！！！这张照片我要存档一万遍！男朋友你是开挂了吗！',
    '男朋友摄影水平已经达到专业级了！这张照片太绝了！',
    '满分满分！这构图这光线简直是教科书级别！可以直接去参赛了！',
    '男朋友审美觉醒！女朋友感动到哭！这张照片值得裱起来！',
    '满分！！！这张照片是里程碑！男朋友从摄影师毕业了！',
    '男朋友你确定不是偷偷请了摄影师的？这表现太惊艳了！',
    '100 分神作！这张照片朋友看了都要问你在哪拍的！',
    '这张也太好看了吧！男友视角满分💯！',
    '救命这个角度绝了，男友拍照天花板就是你！',
    '天呐！这张要火！男朋友摄影师附体了吧！🔥',
    '啊啊啊啊！绝了绝了！男朋友我要给你加鸡腿！🍗',
    '这拍的也太会了吧！每根头发丝都在发光诶！',
    '男朋友开窍了！朋友圈点赞破百不是梦！✨',
    '满分💯！这张照片我要设成锁屏！',
    'OMG！这构图这光线，简直是神来之笔！',
    '男朋友你是摄影大师吧？这张我要存进云端永久保存！',
    '满分神作！男友视角yyds！冲鸭！🦆',
    '这张我要打满分！男朋友你简直是我的专属摄影师！',
    '绝了绝了！男朋友这张要上男友相机名人堂！🏆',
    // ========== Round 5 新增满分文案 ==========
    '男朋友你这张照片让我原地尖叫！满分💯！这角度这光线绝了！',
    '100分神图！这构图可以直接当手机壁纸了！男朋友你是天才吧！',
    '啊啊啊啊啊！这也太好看了吧！男朋友摄影天赋大爆发！💥',
    '满分！男朋友这审美提升速度堪比火箭，这张要永久保存！',
    '这光线这角度简直完美！男朋友你真的是男朋友吗，太专业了吧！',
    '100分！男朋友把我拍成了女神！以后拍照就你了！👑',
    '绝了绝了！这张照片我要分享给闺蜜，让她们羡慕死！',
    '男朋友开挂了！每根发丝都在发光，这构图太绝了！',
  ],
  // 85-94 分高分专属文案
  score_85_94: [
    '这张太可了！男朋友审美在线，这构图绝了！',
    '高分之作！男朋友进步太大了，这张要收藏！',
    '这张照片有高级感！构图讲究，光线也棒！',
    '男朋友越来越会拍了！这张可以直接发朋友圈！',
    '哇塞！男朋友你这构图有点东西啊，要被夸爆了！',
    '这张照片太惊艳了！构图完美+光线到位，男朋友你行啊！',
    '男朋友摄影天赋开始显露了！这张太有感觉了！',
    '这张构图绝绝子！男朋友审美在线，继续保持！',
    '男朋友越来越有摄影师范儿了！这张要存档！',
    '高分！构图讲究+光线完美，男朋友你这波赢麻了！',
    // ========== Round 5 新增高分文案 ==========
    '这张照片好有质感！构图讲究+光线到位，男朋友审美大爆发！',
    '男朋友这张拍出了大片感！朋友圈点赞破百不是梦！',
    '这张绝了！光线和构图配合得刚刚好，男朋友你太会了！',
    '高分佳作！男朋友摄影技能持续解锁，这张太值得收藏了！',
    '这张照片好有氛围！构图和光线都拿捏了，继续保持！',
    '男朋友越来越有感觉了！这张直接发朋友圈，绝对被夸爆！',
    '这张好高级！构图讲究，眼神到位，男朋友你是专业的吧！',
    '85分以上稳了！男朋友这审美在线，下次冲满分！',
    '这张好有feel！构图感满满，光线配合得超好，男朋友你行啊！',
    '男朋友摄影天赋持续在线！这张构图讲究，色彩也棒！',
  ],
  // 新增：夜景专属夸奖
  night_great: [
    '夜景灯光把人拍得超有氛围感！',
    '霓虹灯光下也能这么美，男朋友你开窍了！',
    '夜景这么难拍你都能拿捏，厉害了！',
    '夜色里的你格外美，男朋友这构图绝了！',
    '夜拍能拿高分，男朋友你是专业的吗！',
    '暗光环境下还能保持清晰，男朋友太靠谱了～',
  ],
  // 新增：人像虚化专属夸奖（合并 bokeh_good 唯一条目）
  bokeh_good: [
    '背景虚化层次感绝了，主体超突出！',
    '这虚化效果像专业相机拍出来的，男朋友你行啊！',
    '背景虚化得刚刚好，主体和背景关系处理得太棒了！',
    '焦外虚化好美，男朋友你用了人像模式吧？',
    '前景虚化有层次，男朋友这构图思路可以！',
  ],
  // 新增：侧光/戏剧光夸奖
  dramatic_light: [
    '侧光勾勒出脸部轮廓，好有电影感！',
    '这光影对比绝了，像杂志大片！',
    '戏剧性光线下也能拿高分，男朋友审美在线！',
  ],
  // 新增：可爱风格夸奖
  cute_style: [
    '这表情也太可爱了吧！男朋友拍得好甜～',
    '俏皮感十足！男朋友抓到了你的灵动瞬间！',
    '这组照片好有活力，男朋友把可爱都收进来了！',
    '甜甜的笑容被定格了，男朋友摄影有进步呢～',
  ],
  // 新增：高级感夸奖
  high_end: [
    '这组照片有高级感！像杂志内页！',
    '色调好舒服，男朋友审美开挂了？',
    '氛围感拉满，这构图有点东西！',
    '男朋友你确定是男朋友不是摄影师吗？这质感绝了！',
    '这组照片我要发朋友圈炫耀一下～',
  ],
  // 新增：进步超大时专属夸奖
  breakthrough: [
    '这张是男朋友的巅峰之作吧！',
    '肉眼可见的突破！这张照片要存档！',
    '男朋友进化速度惊人，这进步太明显了！',
    '这张照片有被惊艳到！男朋友开挂了！',
    '从这张开始男朋友正式升级为专业摄影师！',
  ],
  // 新增：细节处理夸奖
  detail_great: [
    '发丝都清晰可见，这细节处理太棒了！',
    '连睫毛都数得清，男朋友这手稳得离谱！',
    '细节满分！这清晰度可以直接出片了！',
  ],
  face_great: [
    '正脸怼镜头，表情超自然，男朋友这次抓得真好！',
    '笑容满分！这表情一看就是发自内心的开心～',
    '男朋友终于拍到正脸了，这表情太甜了吧！',
    '眼神杀！这张照片让人看了心动～',
    '捕捉到了好自然的笑容，这张绝了！',
    '表情管理满分，男朋友抓怕技术在线！',
  ],
  total_great: [
    '这张照片太完美了！男朋友你偷偷进修了吗？',
    '大片感十足！这张可以直接上杂志封面！',
    '男朋友摄影技术突飞猛进，给你点赞！',
    '这张照片我要存起来当头像！',
    '进步太大了，男朋友你是开挂了吗？',
    '摄影师看了都要问你在哪学的！',
    '这构图这光线，简直是教科书级别！',
    '男朋友审美觉醒！女朋友感动哭了呜呜～',
    '我可以拿这张去参赛吗？太可了！',
    '这个光线绝了，女友皮肤白到发光！',
    '构图太专业了，朋友圈点赞破百！',
    '这角度太懂女生了，下一个网红就是你！',
    '女友说你终于开窍了！',
    '摄影师的天赋开始觉醒了！',
    '审美在线，男友力爆棚！',
  ],
  multiple_faces: [
    '情侣照甜蜜满分！两个人都超上镜～',
    '闺蜜合影拍得也太好了吧！',
    '多人合照构图也很棒，有层次感！',
  ],
  brightness_perfect: [
    '光线刚刚好，整个人都在发光！',
    '皮肤质感太好了，这光打得绝了！',
  ],
  small_group: [
    '这张构图有层次！前景背景搭配得很好～',
    '空间感拿捏了，背景和人关系处理得超棒！',
  ],
  // 进步鼓励（与上次相比有提升时）
  progress_up: [
    '比上次进步了！继续保持这个感觉～',
    '这张比上次拍得好！男朋友开窍了呀～',
    '肉眼可见的进步！男朋友学得真快～',
    '越拍越顺眼了，继续保持这个节奏！',
    '每次都在进步，男朋友你是潜力股！',
  ],
  // 连续好评（连续高分时）
  streak: [
    '连续高分！这男朋友是开挂了吗？',
    '男朋友摄影水平稳定发挥，太靠谱了！',
    '连续几次都这么高分，男朋友你是认真的吗？',
    '摄影师养成了！这稳定输出也太厉害了吧～',
  ],
  // 多维度全能夸奖（构图+曝光+稳定+水平全优秀）
  all_dimension_perfect: [
    '四维全能！这张照片简直是教科书级别，男朋友你已经不是男朋友了，是摄影师！',
    '构图完美+光线完美+稳定完美+水平完美=这张满分之作！',
    '男朋友这是开挂了吧？四维全能，女朋友已经感动到说不出话！',
    '专业摄影师级别的表现！构图/光线/稳定/水平全部在线，这张存档！',
    '全能选手！男朋友的摄影水平已经进入next level！',
    '男朋友你确定没偷偷学摄影？这表现太惊艳了！',
  ],
  // 构图+曝光双优
  composition_exposure_master: [
    '构图和光线都是满分表现！男朋友你是在哪里进修过吗？',
    '构图讲究、光线到位，这张大片感拉满了！',
    '男朋友审美在线！构图和光线配合得刚刚好～',
  ],
  // 构图+稳定双优
  composition_stability_master: [
    '构图讲究还稳如老狗，男朋友这是进化了吧！',
    '构图专业+手稳如山，这张照片经得起放大！',
    '男朋友终于同时搞定了构图和手抖，进步太大了！',
  ],
  // 曝光+稳定双优
  exposure_stability_master: [
    '光线拿捏得稳，手也稳，这张可以放大做海报！',
    '光线和清晰度都完美，男朋友这表现太靠谱了～',
    '男朋友终于不抖了！光线也刚刚好，感动哭了！',
  ],
  // 表情+构图双优
  expression_composition_master: [
    '表情自然+构图讲究，这张可以直接上杂志了！',
    '男朋友你把表情和构图都拿捏了，太厉害了吧！',
    '表情到位+位置讲究，这张绝了！',
  ],
  // 夜景+稳定双优
  night_stability_master: [
    '夜景这么暗还能拍这么清晰，男朋友你用了夜视模式吗？',
    '暗光环境下手这么稳，夜拍达人就是你了！',
    '夜景+清晰双优，男朋友你晚上也能这么靠谱吗？',
  ],
  // 人像+虚化双优
  portrait_bokeh_master: [
    '人像和虚化效果都很棒，男朋友你用了人像模式吧？',
    '主体突出+背景虚化，这效果像单反拍的！',
    '男朋友终于搞定了人像摄影，这虚化层次感绝了！',
  ],
  // 近景+表情双优
  closeup_expression_master: [
    '近景特写+表情满分，这张脸部细节太清晰了！',
    '放大看都这么好看，男朋友你把细节都收进来了！',
    '近景+表情双优，男朋友你是细节控吗？',
  ],
  // 新用户首张好评
  first_good: [
    '第一次拍就这么有感觉，男朋友是有天赋的！',
    '首张就拿高分，男朋友你之前是不是偷偷练过？',
    '第一印象满分！继续保持这个水平哦～',
  ],
  // 特定场景好评
  outdoor_good: [
    '户外光线拿捏得恰到好处，这背景绝了！',
    '外景拍得太好了，有大片感！',
    '逆光剪影好有意境，男朋友你懂浪漫啊～',
    '这个取景也太会选了吧，审美在线！',
  ],
  indoor_good: [
    '室内的光线氛围感拉满了！',
    '室内也能拍出这种感觉，太会找了！',
    '这个角度室内拍得超有质感！',
  ],
  // 低光环境表现好
  low_light_good: [
    '光线这么暗都能拍清楚，男朋友你是专业的吗！',
    '暗光环境表现这么稳，闪光灯用得刚刚好～',
    '室内昏暗也能拿捏，这光线氛围感绝了！',
  ],
  // 构图改善（与上次比构图分提升）
  composition_improved: [
    '这次构图比上次好多了！终于把人放对位置了～',
    '构图进步好大！男朋友开窍了呀～',
    '这次把人放到了正确的位置，看起来舒服多了！',
  ],
  // 眼神/表情改善
  expression_improved: [
    '这次表情自然多了！比上次好看～',
    '眼神有光多了，这笑容太加分了！',
    '这次表情管理好多了，继续保持～',
  ],
  // 光线改善
  lighting_improved: [
    '这次光线拿捏得比上次好，看起来皮肤状态超好！',
    '终于找到合适的光线了，整个人都在发光～',
    '这次亮度刚刚好，不像上次过曝或太暗了！',
  ],
  // 稳定性改善
  stability_improved: [
    '这次手稳多了，照片清晰度大幅提升！',
    '终于不糊了，男朋友你开挂了吗？哈哈～',
    '这张清晰度比上次好太多，明显进步了！',
  ],
  // 情侣合照专属夸奖
  couple_photo: [
    '情侣照甜蜜感拉满！两个人的互动超有爱～',
    '这张情侣照可以直接当手机壁纸了！',
    '两人合照拍得也太甜了，男朋友摄影技术在线！',
  ],

  // 俯拍好评（俯视角度）
  top_angle_good: [
    '俯拍显脸小的秘密被男朋友发现了！',
    '这个俯拍角度绝了，显瘦效果满分！',
    '从上往下拍这角度选得太好了，脸小小的好可爱～',
    '俯拍角度选得好，下巴尖尖的视觉效果出来了～',
    '这个角度好显瘦！男朋友你是怎么想到的？',
    '俯拍这个角度绝了，整个人看起来超精致！',
    '从上往下拍超显脸小，男朋友开窍了！',
  ],
  // 仰拍好评（大长腿效果）
  low_angle_good: [
    '仰拍大长腿效果出来了，男朋友你懂啊！',
    '这张拍出大长腿了，男朋友你蹲得好低！',
    '仰角选得好，腿看起来超长，这角度绝了！',
    '哇！大长腿效果拉满！男朋友你趴得好低哈哈～',
    '仰拍真的显高，男朋友这个机位选得妙！',
    '仰拍角度太绝了！大长腿既视感，男朋友太会了！',
    '男朋友蹲得好低！这个仰角太专业了～',
  ],
  // 约会场景专属夸奖
  couple_date: [
    '约会照拍得这么好看，男朋友你是偷偷练过吗？',
    '咖啡馆/餐厅里也能拍出这么有氛围感的照片！',
    '这张约会照绝了，可以直接当朋友圈封面！',
    '约会照片超甜！男朋友镜头下的你太好看了～',
    '这组照片记录了你们的美好瞬间，太有感觉了！',
    '约会拍照拿高分，男朋友你是来谈恋爱的还是来当摄影师的？',
  ],
  // 构图极端优秀（构图满分时）
  composition_perfect: [
    '构图满分！专业摄影师都要点赞的水平！',
    '黄金比例构图，男朋友你是艺术生吗？',
    '这张构图堪称完美，教科书级别！',
  ],
  // 综合表现平稳
  steady_progress: [
    '整体表现稳定，男朋友继续保持这个水平～',
    '虽然没有特别惊艳，但整体很均衡！',
    '这张很稳，没有明显短板，继续加油！',
  ],
  closeup_good: [
    '近景特写太有感觉了！皮肤质感满分～',
    '怼脸拍也能这么好看，男朋友拍照技术在线！',
    '怼脸自拍竟然这么上镜，这张绝了！',
  ],
  // 新增：滤镜感夸奖
  filter_perfect: [
    '滤镜选得好！色调和场景超搭，男朋友审美在线！',
    '这张调色绝了，像电影截图一样！',
    '色调好有感觉，男朋友你偷偷调过色吧？',
    '滤镜和光线配合得天衣无缝，这张绝了！',
    '金棕色调好温暖，男朋友你懂女生喜欢什么～',
  ],
  // 新增：抓拍动态夸奖
  candid_great: [
    '这张抓拍好自然！不像摆拍，太喜欢了～',
    '动态瞬间抓得好，这表情太生动了！',
    '抓拍到自然流露的表情，男朋友你是专业的吗！',
    '这瞬间抓拍太珍贵了，表情管理满分！',
  ],
  // 新增：氛围感夸奖
  vibe_perfect: [
    '氛围感拉满！这张照片有故事感！',
    '整张照片的情绪感绝了，像杂志大片！',
    '这张照片好有感觉，男朋友你是在用心拍！',
    '意境感十足，男朋友你这构图有故事！',
  ],
  // 新增：男友成长夸奖
  growth_praise: [
    '男朋友的摄影水平肉眼可见地在提升！',
    '这张比上一张进步好大，男朋友你太棒了！',
    '从这张开始男朋友要起飞了，感动！',
    '男朋友终于开窍了，这张照片要永久保存！',
  ],
  // 新增：可爱风夸奖
  adorable_style: [
    '这组照片好甜！男朋友把可爱都拍进去了！',
    '甜甜的氛围感满分，男朋友越来越懂女生了～',
    '可爱到融化！这张要当头像！',
  ],
  // 新增：时尚感夸奖
  fashion_style: [
    '时尚感拉满！男朋友这构图有杂志感！',
    '这色调好高级，男朋友你是学过设计吗？',
    '时尚大片感！这张可以直接上时尚博主了～',
  ],
  // 书店/图书馆场景夸奖
  bookstore_good: [
    '书店里的光线超有质感！男朋友这构图很有文艺气息～',
    '在书架前拍照超有感觉，男朋友你懂文艺风！',
    '书香气质拉满，这张照片很有故事感！',
    '男朋友这构图很有文艺感，像杂志内页！',
  ],
  // 露营帐篷场景夸奖
  camping_tent_good: [
    '帐篷前拍照超有户外感，男朋友这构图绝了！',
    '露营场景也拍得这么好看，男朋友你好会找角度！',
    '帐篷背景超有感觉，男朋友你是有探险精神的摄影师！',
    '野营风照片好有感觉，这张要存档！',
  ],
  // 湖边夸奖
  lake_side_good: [
    '湖边光线超柔，水面反光好美！',
    '湖边的倒影好有意境，男朋友这构图太会了！',
    '水面波光粼粼，男朋友拍得好浪漫！',
    '男朋友在湖边也能拍出这种氛围感，太厉害了！',
  ],
  // 画廊/博物馆夸奖
  gallery_good: [
    '画廊氛围感拉满，这张照片很有艺术气息！',
    '在画作旁边的构图很有层次感，男朋友审美在线！',
    '博物馆里的光影也拿捏了，男朋友你是有文化底蕴的摄影师！',
    '这张照片像在讲述一个故事，男朋友你开窍了！',
  ],
  // 商场橱窗夸奖
  mall_display_good: [
    '橱窗灯光下皮肤好通透，男朋友这场景选绝了！',
    '都市感拉满！商场橱窗也能拍出大片感！',
    '男朋友在商场里也能找到这种光影，太会了！',
    '霓虹灯光下超有感觉，男朋友你懂都市风！',
  ],
  // 桥上夜景夸奖
  bridge_night_good: [
    '桥上的夜景灯光好璀璨，男朋友这角度选绝了！',
    '夜景桥梁做背景超有氛围，这构图太浪漫了！',
    '男朋友在桥上也能找到最佳机位，太厉害了！',
    '这张夜景好有都市感，背景和人都很和谐！',
  ],
  // 摩天轮夸奖
  ferris_wheel_master: [
    '摩天轮里的光线超柔和，这氛围绝了！',
    '摩天轮俯瞰城市的角度超浪漫，男朋友你懂浪漫啊！',
    '在摩天轮里拍照超有感觉，这张可以直接发朋友圈！',
    '男朋友在摩天轮里也拍出这么好看的照片，太厉害了！',
  ],
  // 浴室镜自拍夸奖
  mirror_selfie_master: [
    '浴室镜自拍光线超均匀，男朋友你终于发现这个黄金机位了！',
    '镜子里反射也拿捏了，这构图太专业了！',
    '浴室光线下皮肤状态好好，男朋友你懂找光！',
    '镜子自拍也能这么有质感，男朋友你进步好大！',
  ],
  // 星空夜景夸奖
  starry_night_good: [
    '星空下拍照超有感觉，男朋友你在用心捕捉这一刻！',
    '星星落在眼睛里的感觉出来了，这张绝了！',
    '夜空璀璨，这张照片好有诗意！',
    '男朋友拍星空超有耐心，这张照片值得珍藏！',
  ],
  // 公园长椅夸奖
  park_bench_good: [
    '公园长椅超有生活感，男朋友这场景找得好！',
    '长椅上的午后时光被定格了，好治愈！',
    '公园光影斑驳，这构图好有层次感！',
    '男朋友在公园也能找到这种光影，太会了！',
  ],
  // 新增：闺蜜照夸奖
  bestie_photo: [
    '闺蜜照拍得超有默契！两个人的互动感绝了！',
    '和闺蜜一起入镜，这张照片太有故事感了！',
    '闺蜜合照也能这么好看，男朋友摄影技术在线！',
  ],
  // 新增：火锅美食场景夸奖
  hotpot_good: [
    '火锅热气腾腾，这氛围感太到位了！',
    '火锅配美人，这构图绝了！',
    '男朋友拍美食也有两下子，这张绝了！',
  ],
  // 新增：车内自拍夸奖
  car_selfie_good: [
    '车里也能拍出这种氛围感，男朋友你好有创意！',
    '车窗外的风景和人完美融合，超有感觉！',
    '车内自拍光线超均匀，男朋友你开窍了！',
  ],
  // 新增：雪景夸奖
  snow_scene_good: [
    '雪地里皮肤好通透！白茫茫的背景超浪漫～',
    '雪景光线柔和，这肤色绝了！',
    '男朋友在雪天也能拍出这种氛围感，太厉害了！',
  ],
  // 新增：宠物合照夸奖
  pet_photo_good: [
    '和萌宠一起入镜，这张照片太有爱了！',
    '男朋友把宠物和人都拍得很好看，这张绝了！',
    '毛孩子入镜更可爱了，男朋友你真会！',
  ],
  // 新增：晨光夸奖
  morning_light_good: [
    '清晨的光线好柔和，整个人都在发光！',
    '早安光线超通透，这皮肤状态绝了！',
    '早晨的光线最有质感，男朋友你这角度绝了！',
  ],
  // 新增：夜景都市夸奖
  city_night_good: [
    '都市夜景璀璨，这张照片好有故事感！',
    '城市灯光做背景超有氛围，男朋友审美在线！',
    '夜景都市感拉满，这构图太会了！',
  ],
  // 超市/便利店场景夸奖
  supermarket_fun: [
    '超市拍照也这么有创意，男朋友你太会玩了！',
    '和零食道具互动超可爱，这创意绝了！',
    '男朋友把生活场景都拍成大片了！',
    '这张好有生活气息，俏皮感拉满！',
  ],
  // 泳池边夸奖
  pool_side_good: [
    '泳池边的光线超通透，这肤色绝了！',
    '泳池边拍得超有夏日感，男朋友你好会选场景！',
    '阳光泳池超有感觉，这构图太懂女生了！',
    '泳池边的肤色好通透，男朋友摄影技术在线！',
  ],
  // 天台阳台夸奖
  balcony_view_good: [
    '阳台光线超通透，这构图好有空间感！',
    '天台/阳台的视野绝了，构图很有层次！',
    '男朋友找的这个角度超有感觉，背景好干净！',
    '阳台拍照超有氛围，男朋友审美在线！',
  ],
  // 滑雪场景夸奖
  ski_resort_good: [
    '滑雪服也能拍出大片感！男朋友太会了！',
    '雪地光线超柔和，这皮肤状态绝了！',
    '滑雪场景拍出高级感，男朋友有眼光！',
    '雪景大片感十足，男朋友这构图很有想法！',
  ],
  // 海边栈道夸奖
  boardwalk_good: [
    '栈道海风感拍出来了，男朋友构图进步了！',
    '海边栈道的空间感超好，层次感十足！',
    '海风飘逸的感觉捕捉到了，超有氛围！',
    '男朋友找的这个角度超有电影感！',
  ],
  // 家居绿植夸奖
  home_plants_good: [
    '居家感拍得超温馨，男朋友太会了！',
    '绿植背景好清新，这色调绝了！',
    '家居照也能这么有质感，男朋友审美在线！',
    '男朋友把日常感拍出了杂志大片的感觉！',
  ],
  // 游乐园飞椅夸奖
  amusement_ride_good: [
    '动感活力感满满！男朋友抓拍到你的快乐瞬间！',
    '游乐园大片感十足，笑容超有感染力！',
    '男朋友把快乐氛围都收进镜头里了！',
    '动感十足！男朋友这抓拍技术可以出道了～',
  ],
  // 礁石海浪夸奖
  rocky_beach_good: [
    '礁石浪花感拍出来了，男朋友有天赋！',
    '海边礁石的氛围感绝了，超有感觉！',
    '浪花和人物关系处理得太好了！',
    '男朋友把海边的浪漫都定格了！',
  ],
  // 新增：音乐节场景夸奖
  music_festival_good: [
    '音乐节现场感拉满！男朋友把氛围都收进来了！',
    '动感十足！跟着节奏摇摆的样子超好看～',
    '男朋友抓拍到了你最快乐的样子！',
    '这张照片好有感染力，朋友圈点赞预定！',
  ],
  // 新增：便利店场景夸奖
  convenience_store_good: [
    '便利店日常感满分！这张照片好接地气～',
    '俏皮可爱！男朋友把日常感拍出来了！',
    '生活气息满满，这张照片好真实好喜欢！',
  ],
  // 咖啡馆场景夸奖
  cafe_scene_good: [
    '咖啡馆氛围感满分！这张照片好有小资情调～',
    '男朋友拍出了咖啡馆的文艺感，这张绝了！',
    '咖啡馆光线超柔和，这肤色绝了！',
  ],
  // 烘焙坊场景夸奖
  bakery_good: [
    '面包店香气仿佛都能闻到，这张照片太有感觉了！',
    '暖黄色灯光下皮肤超通透，男朋友好会找角度！',
    '男朋友把甜品店的温暖氛围都拍进来了！',
  ],
  // 夜市小吃场景夸奖
  night_market_good: [
    '夜市灯光超有烟火气，这张照片好有感觉！',
    '男朋友把夜市的热闹氛围都收进来了！',
    '夜市小吃配美人，这构图绝了！',
  ],
  // 新增：健身房场景夸奖
  gym_fitness_good: [
    '运动风满满！男朋友拍出了活力感！',
    '健身房大片感十足，你这pose好专业～',
    '男朋友把健康活力感都拍进来了！',
  ],
  // 新增：图书馆/自习场景夸奖
  library_study_good: [
    '文艺气质拉满！这张照片好有书卷气～',
    '男朋友把你文静的一面拍出来了！',
    '安静的美感，男朋友这构图有文艺腔调！',
  ],
  // 新增：创意构图夸奖
  creative_composition_good: [
    '这个构图角度好有创意！男朋友你是专业的吗！',
    '创意构图拿捏了！这张照片与众不同！',
    '男朋友审美在线！这角度选得太绝了！',
  ],
  // ========== 一般档位文案（60-79分） ==========
  // ========== 中高分段文案（80-84分）新增 ==========
  score_80_84: [
    '这张拍得很不错！男朋友进步超快的，这张有被夸到！',
    '80分以上了！男朋友审美开窍，这张构图感绝了！',
    '这张很可！离高分只差一点点，下次光线再好点就能冲90！',
    '男朋友这张拍出了感觉！这水平继续保持，下次冲满分！',
    '这张有被惊喜到！构图讲究了，继续保持这个感觉！',
    '不错的分数！男朋友越拍越好了，这张值得收藏！',
    '这张已经很好看了！再注意一个细节就能上85了～',
    '男朋友感觉越来越专业了，这张可以上相册精选！',
    '这张有范儿！构图和光线配合得刚刚好～',
    '好家伙，这张离大片只差一点点距离了！',
  ],
  score_60_79: [
    '这张还可以！男朋友有进步的空间，继续加油～',
    '比及格线好多了！男朋友正在进步中，再接再厉～',
    '这张有亮点！构图或光线有一项拿捏了～',
    '男朋友在努力！细节再注意一下会更好～',
    '这张有潜力！稍微调整一下角度就完美了～',
    '整体还不错，有一两个方面特别棒！',
    '男朋友感觉越来越好，这张有进步！',
    '有点感觉了！就是还可以再精细一点～',
    '这张有救！下次注意一个点就能提分～',
    '男朋友在状态！继续拍下去会越来越好的～',
    '有被惊喜到！男朋友这构图越来越有感觉了！',
    '整体均衡，没有明显短板，继续保持～',
    '比上次好多了！这张有被夸到～',
    '男朋友审美在线，这张有被看到！',
    '进步一点点！这感觉越来越对了～',
  ],
  // ========== 普通档位文案（40-59分）Round 2 新增 ==========
  score_40_59: [
    '这张有潜力！再调整一下角度就更好看啦～',
    '男朋友在努力！背景再干净一点就能提分～',
    '光线不错，但构图可以再讲究一点～',
    '整体还行！人稍微往中间站一丢丢会更棒～',
    '有进步的空间！下次试试让人脸落在九宫格交叉点上～',
    '这张不错！就是可以再多点互动感～',
    '男朋友正在状态！再拍几张找找感觉～',
    '还行还行！背景太乱了，简洁背景更显高级～',
    '有被惊喜到一点点！光线刚好，但距离可以再调整～',
    '男朋友正在进步！这张比及格好，再精细一点就完美～',
    '稍微调整站位！往光源方向靠一点，脸上的光会更柔和～',
    '这张有救！下次换个角度试试，肯定会更好～',
    '有被夸到！就是表情可以再自然一点～',
    '男朋友审美在线，这张有亮点，下次注意一个点就能提分～',
    '有点感觉了！就是背景稍微有点抢戏，简洁背景更突出人物～',
  ],
  // ========== Round 2 新增 ==========
  // 糟糕分数鼓励（总分 < 50）
  low_score_encourage: [
    '没关系！每张大片都是练出来的，多拍几张就好啦～',
    '这张不够好没关系，再来一张！男朋友你的潜力在后面呢～',
    '第一次不够完美太正常了！摄影师也是练出来的，继续加油～',
    '这张只是热身！深呼吸，再来一张，肯定会更好～',
    '男朋友别气馁，拍照就是多练，进步肉眼可见的！',
  ],
  // 连续提升夸奖（连续3次分数上涨）
  consecutive_improvement: [
    '连续进步！这学习速度也太快了吧！',
    '每张都在进步，男朋友你是开了加速挂吗！',
    '连续三次比上次好，这摄影师潜质藏不住了～',
  ],
  // 用了模板后高分夸奖
  template_match_praise: [
    '跟着模板拍果然没错！这姿势摆得太到位了！',
    '模板用得好！男朋友完全理解了指导意图！',
    '照着模板来就是不一样，这张大片感拉满！',
  ],
  // 金色时刻（golden hour）夸奖
  golden_hour_good: [
    '夕阳余晖把人拍得好温柔！男朋友这光用绝了～',
    'Golden Hour 光线好美，男朋友抓到了！',
    '黄昏的光最会说话，男朋友你懂这浪漫～',
  ],
  // 纪念日/特殊节日夸奖
  celebration_day_good: [
    '特殊日子拍的照片就是不一样！这张值得永久保存～',
    '纪念日大片！这张照片太有意义了！',
    '节日氛围感满满，男朋友你这张拍出了仪式感！',
  ],
  // 周末约会夸奖
  weekend_date_good: [
    '周末约会拍出大片感，这约会质量也太高了吧！',
    '男朋友周末都在进化，这约会照绝了！',
    '周末时光拍出这种大片，女朋友好幸福～',
  ],
  // 连续尝试终于成功的夸奖（多次低于60后首次超过80）
  never_give_up: [
    '终于成功了！男朋友不放弃的精神太赞了！',
    '这张是坚持的回报！男朋友你终于做到了！',
    '来之不易的佳作！这张值得炫耀一下～',
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
    '人太小了，显得景大人小，下次走近一点～',
    '人太大，脸都顶到边框了，退后一点点吧～',
    '背景有点乱，找个干净的墙或背景会更显高级～',
    '这个角度太奇怪了，稍微换个视角试试～',
  ],
  exposure: [
    '我是藏在阴影里的神秘女友吗？打开闪光灯或靠近光源！',
    '过曝了！我是来拍照的不是来当灯泡的～',
    '光线有点硬，自然光或柔光箱效果更好',
    '脸上有点暗，下次让人脸朝向光源方向～',
    '背景太亮人脸太暗，开个屏幕补光试试？',
    '光线有点乱，脸上的阴影好奇怪……换个角度试试',
    '过曝了！脸上高光太亮，细节都没了～',
    '太暗了！感觉在拍恐怖片，打开光源试试～',
    '逆光剪影挺有意境的，但脸太黑了，下次转过来试试～',
    '顶光在脸上留下奇怪的阴影，往边上站一站躲开～',
  ],
  stability: [
    '这张照片自带马赛克滤镜，手稳住！深呼吸再按快门',
    '有点糊了，男朋友手抖得像在跳舞 💃',
    '模糊朦胧不是美，除非你要走印象派路线',
    '糊了糊了！建议让男朋友双手握手机，深呼吸后拍',
    '这张有点糊，下次让他靠墙或找个支撑点～',
    '动起来的照片更模糊，建议先让他站稳再拍',
    '糊了！对焦似乎没对上，下次先点一下屏幕对焦～',
    '有点糊，可能是快门太慢，让他手稳住再拍～',
    '晚上光线暗容易糊，打开闪光灯或找光源更亮的地方～',
  ],
  level: [
    '地平线都歪了，我俩要倒啦！拍照时看下水平仪',
    '这张照片喝醉了吧哈哈，歪成这样也是种风格（不是）',
    '把手机放稳再拍，别像端着酒杯一样拍照',
    '斜了斜了！打开相机网格线，参照着拍～',
    '歪了！但歪得很有艺术感……开玩笑的，下次注意哦',
    '斜了！建筑物和地平线都歪了，打开九宫格对齐试试～',
  ],
  face: [
    '脸被切掉了一部分！下次拍完整一点哦～',
    '又是半张脸！男朋友你是要玩抽象艺术吗？',
    '我的脸呢？我的脸去哪了？下次让我在画面里～',
    '拍到了！就是只有一点点……多拍几张总有一张完整～',
    '半张脸入镜了！稍微把镜头移一下，把脸拍完整～',
    '眼神不知道在看哪里，下次让她看镜头哦～',
    '眼睛闭着拍出来了，提醒她睁大眼睛再来～',
    '表情太僵了！笑一个，让气氛轻松自然点～',
  ],
  // 新增：夜景相关建议
  night: [
    '夜景光线复杂，试试打开闪光灯补补光～',
    '暗光环境下尽量找光源，让脸亮起来～',
    '夜景拍糊了？打开夜景模式或找光源更亮的地方～',
    '晚上光线不足，手要更稳，深呼吸后按快门～',
    '夜间逆光很美但脸太黑，转过来让脸朝向光源～',
  ],
  // 新增：人像虚化建议
  bokeh: [
    '背景太实了，试试用人像模式虚化背景～',
    '找些好看的背景，虚化掉杂乱的元素～',
    '背景和主体分不开，试试走近一点让背景虚化～',
  ],
  // 新增：雨天建议
  rainy: [
    '雨天的光线比较柔和，找个窗户边试试～',
    '雨滴落在玻璃上很有氛围感，可以利用这个元素～',
    '雨天光线偏暗，可以靠近窗户或开灯补光～',
  ],
  // 新增：运动/抓拍建议
  motion: [
    '要抓拍动态瞬间？提前对焦在主体位置～',
    '运动中拍糊了，试试用连拍模式多拍几张～',
    '要拍跳跃照？让他跳起来后数3、2、1再按快门～',
    '抓拍笑容需要耐心等待，可以让她先做动作再抓拍～',
  ],
  // 新增建议池
  over_exposure: [
    '高光过曝了，脸部细节都没有了～稍微暗一点试试',
    '脸上有块亮斑，太曝光了！换个角度或补补光',
    '过曝了！脸上的细节都没了，稍微退后一点～',
  ],
  under_exposure: [
    '脸太黑了，打开闪光灯或靠近光源试试',
    '太暗了！脸上黑黑的，下次找亮一点的地方～',
    '暗部细节没了，补点光效果会更好哦',
  ],
  face_cut_off: [
    '脸被切掉了一部分！稍微移一下镜头，把脸拍完整～',
    '边缘裁切到脸了！后退一点点，画面更完整～',
    '这张脸只剩一半了，下次让男朋友多留点边～',
  ],
  hand_in_frame: [
    '手入了镜头，有点挡住脸了～',
    '手指进画面了，稍微调整一下角度～',
    '手抢镜了！让手自然垂下或做个小动作～',
  ],
  ugly_background: [
    '背景有点乱，下次找个干净的地方拍～',
    '背景太杂了，简洁的背景更显高级感～',
    '背景干扰太多，试试找个简单的背景～',
  ],
  noise_in_dark: [
    '暗光下噪点有点多，晚上光线要充足一点～',
    '暗处颗粒感有点重，光线再亮一点效果更好～',
    '夜晚拍照噪点明显，打开闪光灯试试～',
  ],
  // 新增：表情僵硬建议
  stiff_expression: [
    '表情有点僵，放松一点笑会更自然～',
    '太紧绷了！深呼吸，让表情自然流动～',
    '笑得更自然一点，自然的笑容最好看～',
  ],
  // 新增：背景遮挡建议
  hand_occluding: [
    '手挡住了一部分脸，稍微调整一下手的位置～',
    '手指入镜了，让手自然垂下或者做个小动作～',
    '手抢镜了！把手稍微移开一点点～',
  ],
  // 新增：前景过多建议
  foreground_clutter: [
    '前景有点杂乱了，让背景更干净一点～',
    '前景东西太多了，有点干扰主体了～',
    '画面有点堵，把前景的东西移开试试～',
  ],
  // 新增：竖图横图建议
  orientation_hint: [
    '全身照用竖图更好看，男朋友试试竖着拍～',
    '近景特写横图更有电影感，换个方向试试～',
  ],
  // 新增：背景虚化不够建议
  background_too_sharp: [
    '背景有点实，试试走近一点让背景虚化～',
    '背景和人分不开，开人像模式虚化背景试试～',
    '背景有点抢镜，找个更简洁的背景会更好～',
  ],
  // 背景太暗建议
  background_too_dark: [
    '背景太暗了，显得整张照片很压抑，换个光源试试～',
    '背景黑黑的太沉闷了，找个更亮的地方试试～',
    '打开闪光灯或靠近光源，让背景也亮一点～',
  ],
  // 自拍小贴士
  selfie_tips: [
    '自拍时稍微低头看镜头，眼睛会更有神～',
    '45度角自拍是万能角度，试试看～',
    '表情自然最重要，假装被什么东西吸引会更有灵气～',
    '不要正对光源，侧光拍出来更有立体感～',
  ],
  // 户外场景专属建议
  outdoor_specific: [
    '户外光线好，但背景太乱会影响主体，找个干净的角落试试～',
    '逆光拍摄时记得让人脸朝向光源，这样脸才不会黑黑的～',
    '天晴户外正午光线太硬，找个树荫或阴凉处，光线更柔和～',
    '户外仰拍显腿长，但要注意让女朋友抬头看镜头～',
  ],
  // 夜景场景专属建议
  night_specific: [
    '夜景光线复杂，开闪光灯或找个光源补补光～',
    '晚上拍照容易糊，打开手机闪光灯或靠近光源更亮的地方～',
    '夜景逆光很美，但脸太黑！转过来让脸朝向光源～',
    '夜间拍摄手要更稳，深呼吸后双手握手机再按快门～',
  ],
  // 餐厅/美食场景专属建议
  restaurant_specific: [
    '餐厅暖光下皮肤超好！让人靠近窗户或台灯～',
    '美食照让人捧着食物或举杯，画面更生动～',
    '餐厅里找窗边位置，光线绝绝子！',
    '火锅热气腾腾很有氛围，让人脸稍微离热气远一点～',
  ],
  // 海边/沙滩场景专属建议
  beach_specific: [
    '海边阳光太刺眼了，找个阴凉处或让女朋友微微眯眼～',
    '沙滩光线反射很强，脸上的阴影不好控制，靠近一点拍～',
    '海边拍逆光剪影超有感觉！转过身让阳光在身后～',
    '沙滩上人多背景乱，往没人的地方走走～',
  ],
  // 情侣合照专属建议
  couple_specific: [
    '情侣照最重要的是互动！靠近一点，眼神交流一下～',
    '两人合照要选好站位，别让一个人顶到边框～',
    '情侣照可以让女朋友站着，男友从背后环抱更甜蜜～',
    '两人合照时，视线方向要留白，别把画面撑太满～',
  ],
  // 室内日常场景专属建议
  indoor_specific: [
    '室内最重要的是光线！靠近窗户站，皮肤会看起来更好～',
    '室内光线不够的话，打开手机闪光灯补一下～',
    '家里找个干净的背景，比杂乱的角落更显气质～',
    '室内镜子自拍光线好均匀，试试对着镜子拍～',
  ],
  // 宠物互动专属建议
  pet_specific: [
    '和宠物互动的时候抓拍，表情最自然可爱～',
    '拍宠物时对焦在眼睛上，眼睛有光才好看～',
    '宠物跑来跑去不好拍，让她先hold住宠物再拍～',
  ],
  // 露营场景专属建议
  camping_specific: [
    '露营帐篷前光线超美！靠近帐篷站着，背景超有户外感～',
    '露营场景要选干净的背景，让人和帐篷成为主体～',
    '帐篷前的篝火灯光打在脸上超有感觉，但别太靠近火源～',
  ],
  // 湖边场景专属建议
  lake_specific: [
    '湖边光线柔和，找个水面反光的位置会让照片更梦幻～',
    '湖边拍摄注意别踩到水里，让男朋友站稳了再拍～',
    '湖边风大头发容易乱，男朋友找个避风的角度更好看～',
  ],
  // 画廊/博物馆场景专属建议
  gallery_specific: [
    '画廊里不要开闪光灯，会影响其他观众，靠窗边站～',
    '博物馆里站在画作旁边侧身，构图会更有层次感～',
    '画廊光线偏暗，靠近灯光展示区域脸会更亮～',
  ],
  // 商场橱窗场景专属建议
  mall_specific: [
    '商场橱窗玻璃会反光，让女朋友稍微侧身躲开反光～',
    '橱窗灯光偏白/偏蓝，可以用手机屏幕补光让脸更自然～',
    '商场人多背景乱，找个没人的时间段或角度会更好～',
  ],
  // 桥上夜景专属建议
  bridge_night_specific: [
    '桥上风大，拍摄时让手机拿稳，防止风吹晃动～',
    '桥上夜景要开闪光灯或找光源补光，桥灯往往打在桥体而不是人脸上～',
    '桥上人多找好角度，让灯光成为背景而不是干扰～',
  ],
  // 摩天轮场景专属建议
  ferris_wheel_specific: [
    '摩天轮在转动的时候拍摄，可以捕捉到不同高度的视角～',
    '摩天轮包厢里空间小，男朋友拿手机伸出去拍效果更好～',
    '摩天轮里光线偏暗，可以打开屏幕补光让脸亮起来～',
  ],
  // 星空夜景专属建议
  starry_night_specific: [
    '星空夜景要长曝光，手机拿稳了不要动～',
    '星空拍摄背景很暗，男朋友要站在灯光下或打开闪光灯补光～',
    '星空夜景后期可以稍微提亮人脸，让主体更突出～',
  ],
  // 公园长椅专属建议
  park_bench_specific: [
    '公园长椅上坐好，一条腿蜷起来一条腿伸直，显腿长～',
    '长椅背景要干净，避开旁边乱入的行人～',
    '公园里树叶斑驳的光影很美，让女朋友坐在光影里～',
  ],
  // 车内自拍专属建议
  car_selfie_specific: [
    '车里自拍开点窗让自然光进来，脸上的光会更自然～',
    '车里后视镜前自拍可以拍到全脸，但注意别挡视线～',
    '车窗外有好看风景时，侧身看向窗外构图更有故事感～',
  ],
  // 雪景专属建议
  snow_specific: [
    '雪地光线反射很强，脸上的阴影不好控制，稍微仰头让雪反射到脸上～',
    '雪天拍完赶紧回室内暖和，别让女朋友冻太久～',
    '雪景背景白茫茫，开闪光灯补光让脸和背景平衡～',
  ],
  // 闺蜜合照专属建议
  bestie_specific: [
    '闺蜜照最重要的是互动！靠近一点，做同样的表情或动作～',
    '两人合照时视线方向要留白，别把画面撑太满～',
    '闺蜜照可以一正一侧，构图有层次感～',
  ],
}

function pickRandom(arr: string[]): string {
  if (!arr || arr.length === 0) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

export interface AnalyzeContext {
  /** 上次得分（进步检测） */
  lastScore?: number
  /** 最近 N 次的平均分（连续好评检测） */
  recentAvg?: number
  /** 连续高分次数（用于连续好评文案） */
  streakCount?: number
  /** 总拍摄次数 */
  totalShoots?: number
  /** 是否为首次拍摄 */
  isFirstPhoto?: boolean
  /** 场景类型（用于场景专属夸奖） */
  sceneType?: 'indoor' | 'outdoor' | 'other'
  /** 上次构图分（构图改善检测） */
  lastCompositionScore?: number
  /** 上次表情分（表情改善检测） */
  lastExpressionScore?: number
  /** 上次光线分（光线改善检测） */
  lastExposureScore?: number
  /** 上次稳定分（稳定改善检测） */
  lastStabilityScore?: number
  /** 是否情侣合照 */
  isCouplePhoto?: boolean
  /** 历史最高分（用于新纪录检测） */
  peakScore?: number
}

export async function analyzePhoto(
  params: {
    facePosition: { x: number; y: number; area: number } | null
    faceCount: number
    brightness: number // 0-255
    sharpness: number // 拉普拉斯方差，>100 为清晰
    tiltAngle: number // 倾斜角度度数
  },
  context: AnalyzeContext = {}
): Promise<AnalysisResult> {
  const { facePosition, faceCount, brightness, sharpness, tiltAngle } = params
  const { lastScore, recentAvg, streakCount = 0, totalShoots = 0, isFirstPhoto, sceneType, lastCompositionScore, lastExpressionScore, lastExposureScore, lastStabilityScore, isCouplePhoto, peakScore } = context
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
  if (faceCount > 1 && compositionScore >= 30) praise.push(pickRandom(PRAISE_POOL.multiple_faces))

  // 人脸被裁切检测
  if (facePosition && compositionScore < 35) {
    const tooCloseToEdge = facePosition.x < 0.08 || facePosition.x > 0.92 ||
      facePosition.y < 0.12 || facePosition.y > 0.88
    if (tooCloseToEdge) {
      suggestions.push(pickRandom(SUGGESTION_POOL.face_cut_off))
    }
  }

  // 噪点检测（亮度尚可但清晰度低 = 暗光噪点）
  if (brightness >= 60 && brightness <= 160 && sharpness < 80 && sharpness >= 50) {
    suggestions.push(pickRandom(SUGGESTION_POOL.noise_in_dark))
  }

  // 曝光分 0-30
  let exposureScore = 30
  if (brightness < 40) {
    exposureScore -= 20
    problems.push('exposure')
    suggestions.push(pickRandom(SUGGESTION_POOL.exposure))
    suggestions.push(pickRandom(SUGGESTION_POOL.under_exposure))
  } else if (brightness > 220) {
    exposureScore -= 15
    problems.push('exposure')
    suggestions.push(pickRandom(SUGGESTION_POOL.exposure))
    suggestions.push(pickRandom(SUGGESTION_POOL.over_exposure))
  } else if (brightness < 60 || brightness > 200) {
    exposureScore -= 8
    problems.push('exposure')
    suggestions.push(pickRandom(SUGGESTION_POOL.exposure))
  }
  if (exposureScore >= 28) praise.push(pickRandom(PRAISE_POOL.exposure_great))
  if (exposureScore >= 28 && (brightness >= 80 && brightness <= 180)) praise.push(pickRandom(PRAISE_POOL.brightness_perfect))

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

  // clamp 到 0-100 范围，防止边界情况下越界
  const rawTotal = compositionScore + exposureScore + stabilityScore + levelScore
  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal)))

  // 总分优秀时追加额外夸奖
  if (totalScore >= 90) praise.push(pickRandom(PRAISE_POOL.total_great))

  // 总分惊艳（100分场景）专属文案
  if (totalScore === 100) praise.push(pickRandom(PRAISE_POOL.total_amazing))

  // 高分区间专属文案（95-100分段、85-94分段、60-79分段）
  if (totalScore >= 95) {
    praise.push(pickRandom(PRAISE_POOL.score_95_100))
  } else if (totalScore >= 85 && totalScore < 95) {
    praise.push(pickRandom(PRAISE_POOL.score_85_94))
  } else if (totalScore >= 80 && totalScore < 85) {
    praise.push(pickRandom(PRAISE_POOL.score_80_84))
  } else if (totalScore >= 60 && totalScore < 80) {
    praise.push(pickRandom(PRAISE_POOL.score_60_79))
  } else if (totalScore >= 40 && totalScore < 60) {
    praise.push(pickRandom(PRAISE_POOL.score_40_59))
  }

  // 场景专属夸奖
  if (sceneType === 'outdoor' && totalScore >= 75) praise.push(pickRandom(PRAISE_POOL.outdoor_good))
  if (sceneType === 'indoor' && totalScore >= 75) praise.push(pickRandom(PRAISE_POOL.indoor_good))
  // 构图一般（28-34分）但整体不错的鼓励 Round 3 新增
  if (compositionScore >= 28 && compositionScore < 35 && totalScore >= 70) {
    praise.push(pickRandom(PRAISE_POOL.composition_okay))
  }

  // 基于亮度的场景推断夸奖
  // 明亮户外场景（户外阳光充足）
  if (brightness > 180 && facePosition && compositionScore >= 35 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.outdoor_good))
  }
  // 室内柔和光场景（亮度适中，非直射阳光）
  if (brightness >= 80 && brightness <= 160 && exposureScore >= 25 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.indoor_good))
  }
  // 逆光/戏剧光场景（高对比度，背景亮主体暗或有轮廓光）
  if (brightness > 200 && facePosition && compositionScore >= 35 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.dramatic_light))
  }

  // 近景特写夸奖（人脸面积大）
  if (facePosition && (facePosition.area ?? 0) > 0.25 && totalScore >= 70) praise.push(pickRandom(PRAISE_POOL.closeup_good))

  // 夜景专属夸奖
  if (brightness < 80 && brightness >= 30 && totalScore >= 78) praise.push(pickRandom(PRAISE_POOL.night_great))

  // 人像虚化夸奖
  if (totalScore >= 80 && facePosition && (facePosition.area ?? 0) > 0.15 && (facePosition.area ?? 0) < 0.35) praise.push(pickRandom(PRAISE_POOL.bokeh_good))

  // 滑雪场景夸奖（高亮度户外 + 高对比 = 雪景）
  if (brightness > 200 && sceneType === 'outdoor' && totalScore >= 75) praise.push(pickRandom(PRAISE_POOL.ski_resort_good))
  // 海边栈道夸奖（高亮度户外 + 高sharpness = 清晰海景）
  if (brightness > 160 && sceneType === 'outdoor' && sharpness > 140 && totalScore >= 72) praise.push(pickRandom(PRAISE_POOL.boardwalk_good))
  // 家居绿植夸奖（柔和亮度室内 + 中等sharpness）
  if (brightness >= 100 && brightness <= 180 && sceneType === 'indoor' && sharpness > 100 && totalScore >= 72) praise.push(pickRandom(PRAISE_POOL.home_plants_good))
  // 游乐园飞椅夸奖（户外 + 动感 = 活力场景）
  if (sceneType === 'outdoor' && sharpness > 120 && totalScore >= 72) praise.push(pickRandom(PRAISE_POOL.amusement_ride_good))
  // 礁石海浪夸奖（高亮度户外 + 特殊环境 = 礁石海岸）
  if (brightness > 150 && sceneType === 'outdoor' && compositionScore >= 30 && totalScore >= 72) praise.push(pickRandom(PRAISE_POOL.rocky_beach_good))

  // 细节处理夸奖（清晰度极高）
  if (sharpness > 150 && totalScore >= 75) praise.push(pickRandom(PRAISE_POOL.detail_great))

  // 进步突破时专属夸奖
  if (lastScore !== undefined && totalScore - lastScore >= 20) praise.push(pickRandom(PRAISE_POOL.breakthrough))

  // 首次好评
  if (isFirstPhoto && totalScore >= 80) praise.push(pickRandom(PRAISE_POOL.first_good))

  // 低光环境表现好（亮度偏低但总分不差）
  if (brightness < 80 && brightness >= 40 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.low_light_good))
  }

  // 极暗但稳定 = 星空夜景或天台夜景
  if (brightness < 40 && stabilityScore >= 18 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.starry_night_good))
    praise.push(pickRandom(PRAISE_POOL.night_great))
  }

  // 高亮度户外 + 构图优秀 = 泳池/天台等明亮场景
  if (brightness > 180 && compositionScore >= 35 && facePosition && totalScore >= 78) {
    // 仅在户外场景标记
    if (sceneType === 'outdoor') {
      praise.push(pickRandom(PRAISE_POOL.pool_side_good))
    }
  }

  // 进步鼓励
  if (lastScore !== undefined && totalScore > lastScore) {
    praise.push(pickRandom(PRAISE_POOL.progress_up))
    // 检测具体维度进步
    if (lastCompositionScore !== undefined && compositionScore > lastCompositionScore) {
      praise.push(pickRandom(PRAISE_POOL.composition_improved))
    }
    if (lastExpressionScore !== undefined && faceCount > 0) {
      praise.push(pickRandom(PRAISE_POOL.expression_improved))
    }
    if (lastExposureScore !== undefined && exposureScore > lastExposureScore) {
      praise.push(pickRandom(PRAISE_POOL.lighting_improved))
    }
    if (lastStabilityScore !== undefined && stabilityScore > lastStabilityScore) {
      praise.push(pickRandom(PRAISE_POOL.stability_improved))
    }
    if (totalScore - lastScore >= 15) {
      praise.push('进步幅度好大！男朋友你偷偷练习了吗？')
    }
  }

  // 情侣合照专属夸奖
  if (isCouplePhoto && faceCount >= 2 && totalScore >= 70) {
    praise.push(pickRandom(PRAISE_POOL.couple_photo))
  }

  // 构图分满分追加专属夸奖
  if (compositionScore === 40) praise.push(pickRandom(PRAISE_POOL.composition_perfect))

  // 俯拍/仰拍场景（通过 facePosition.y 推断）
  if (facePosition) {
    if (facePosition.y > 0.6 && totalScore >= 70) {
      praise.push(pickRandom(PRAISE_POOL.top_angle_good))
    }
    if (facePosition.y < 0.3 && totalScore >= 70) {
      praise.push(pickRandom(PRAISE_POOL.low_angle_good))
    }
  }

  // 综合平稳表现（没有突出项但总分不差）
  if (totalScore >= 70 && praise.length === 1) {
    praise.push(pickRandom(PRAISE_POOL.steady_progress))
  }

  // 连续好评（使用 streakCount 更精确）
  if (streakCount >= 2 && totalScore >= 80) praise.push(pickRandom(PRAISE_POOL.streak))
  // 备选：使用 recentAvg 判断
  if (recentAvg !== undefined && recentAvg >= 80 && totalScore >= 80 && streakCount < 2) praise.push(pickRandom(PRAISE_POOL.streak))

  // 老用户里程碑夸奖
  if (totalShoots === 10 && totalScore >= 70) praise.push('🎉 十连拍达成！男朋友已经拍了10张，进步肉眼可见！')
  if (totalShoots === 20 && totalScore >= 70) praise.push('🏆 二十连拍里程碑！摄影师已在线，女朋友感动哭泣！')
  if (totalShoots === 50 && totalScore >= 70) praise.push('👑 五十次快门！男朋友你是被拍照耽误的摄影师吧！')
  if (totalShoots === 100 && totalScore >= 70) praise.push('💎 百次快门达成！男朋友已经是拍照达人了！')
  if (totalShoots === 5 && totalScore >= 80) praise.push('🌟 五连拍高分！男朋友你是有天赋的！')
  if (totalShoots === 30 && totalScore >= 80) praise.push('🔥 三十张里程碑！这男朋友太会拍了！')
  // 首次突破90分
  if (totalScore >= 90 && totalShoots > 0 && totalShoots < 5) praise.push('🎯 首次突破90分！男朋友你开挂了！')

  // 新纪录检测（当本次分数超越历史最高分）
  if (peakScore !== undefined && totalScore > peakScore && totalScore >= 70) {
    const margin = totalScore - peakScore
    if (totalScore >= 90) {
      praise.push(`🏆🏆🏆 新纪录！！！历史最高${peakScore}→${totalScore}！男朋友这是开挂了吧！`)
    } else if (totalScore >= 80) {
      praise.push(`📸 新纪录达成！历史最高${peakScore}，这次${totalScore}分！男朋友进化了！`)
    } else {
      praise.push(`✨ 新纪录！历史最高${peakScore}→${totalScore}，继续保持！`)
    }
  }

  // 多维度全能夸奖（构图+曝光+稳定+水平全优秀）
  const allPerfect = compositionScore >= 35 && exposureScore >= 28 && stabilityScore >= 18 && levelScore >= 9
  if (allPerfect) praise.push(pickRandom(PRAISE_POOL.all_dimension_perfect))

  // 构图+曝光双优
  if (compositionScore >= 35 && exposureScore >= 28 && !allPerfect) {
    praise.push(pickRandom(PRAISE_POOL.composition_exposure_master))
  }
  // 构图+稳定双优
  if (compositionScore >= 35 && stabilityScore >= 18 && !allPerfect) {
    praise.push(pickRandom(PRAISE_POOL.composition_stability_master))
  }
  // 曝光+稳定双优
  if (exposureScore >= 28 && stabilityScore >= 18 && !allPerfect) {
    praise.push(pickRandom(PRAISE_POOL.exposure_stability_master))
  }
  // 表情+构图双优（人脸存在时）
  if (faceCount > 0 && compositionScore >= 35 && !allPerfect) {
    praise.push(pickRandom(PRAISE_POOL.expression_composition_master))
  }
  // 夜景+稳定双优
  if (brightness < 80 && stabilityScore >= 18 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.night_stability_master))
  }
  // 人像+虚化双优
  if (facePosition && (facePosition.area ?? 0) > 0.15 && (facePosition.area ?? 0) < 0.35 && totalScore >= 80) {
    praise.push(pickRandom(PRAISE_POOL.portrait_bokeh_master))
  }
  // 近景+表情双优
  if (facePosition && (facePosition.area ?? 0) > 0.25 && faceCount > 0 && !allPerfect) {
    praise.push(pickRandom(PRAISE_POOL.closeup_expression_master))
  }

  // 滤镜完美夸奖（总分高+构图优秀+曝光优秀）
  if (totalScore >= 85 && compositionScore >= 35 && exposureScore >= 28) {
    praise.push(pickRandom(PRAISE_POOL.filter_perfect))
  }

  // 抓拍夸奖（动态场景+人脸存在）
  if (faceCount > 0 && (brightness > 180 || brightness < 80) && totalScore >= 72) {
    praise.push(pickRandom(PRAISE_POOL.candid_great))
  }

  // 氛围感夸奖（总分高+曝光适中）
  if (totalScore >= 80 && brightness >= 60 && brightness <= 200 && praise.length >= 1) {
    praise.push(pickRandom(PRAISE_POOL.vibe_perfect))
  }

  // 男友成长夸奖（总分提升 10+）
  if (lastScore !== undefined && totalScore - lastScore >= 10 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.growth_praise))
  }

  // 书店/图书馆场景夸奖
  if (totalScore >= 75 && sceneType === 'indoor' && compositionScore >= 30) {
    praise.push(pickRandom(PRAISE_POOL.bookstore_good))
  }

  // 商场橱窗场景夸奖
  if (totalScore >= 75 && sceneType === 'indoor' && brightness >= 120 && brightness <= 220) {
    praise.push(pickRandom(PRAISE_POOL.mall_display_good))
  }

  // 场景专属建议（从未触发的建议池类别）
  // 雨天场景：亮度偏低且室内 → 提醒雨天光线柔和
  if (brightness < 100 && sceneType === 'indoor' && totalScore >= 60) {
    suggestions.push(pickRandom(SUGGESTION_POOL.rainy))
  }
  // 运动/抓拍场景：清晰度偏低且人脸面积适中 → 建议连拍
  if (sharpness < 100 && sharpness >= 50 && facePosition && facePosition.area >= 0.1 && facePosition.area <= 0.3) {
    suggestions.push(pickRandom(SUGGESTION_POOL.motion))
  }
  // 人像虚化场景：户外且背景实（构图分数中等）→ 建议人像模式
  if (sceneType === 'outdoor' && compositionScore < 35 && totalScore >= 60) {
    suggestions.push(pickRandom(SUGGESTION_POOL.bokeh))
  }

  // 表情僵硬建议
  if (brightness >= 80 && brightness <= 180 && faceCount > 0 && stabilityScore >= 15 && compositionScore >= 30 && totalScore >= 60 && totalScore < 75) {
    suggestions.push(pickRandom(SUGGESTION_POOL.stiff_expression))
  }

  // 火锅/美食场景夸奖（亮度高+室内+构图好）
  if (brightness >= 140 && sceneType === 'indoor' && compositionScore >= 35 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.hotpot_good))
  }

  // 闺蜜照夸奖（多人合照且非情侣）
  if (faceCount > 1 && !isCouplePhoto && compositionScore >= 30 && totalScore >= 70) {
    praise.push(pickRandom(PRAISE_POOL.bestie_photo))
  }

  // 情侣合照专属夸夸（2人入镜+构图不错）
  if (isCouplePhoto && faceCount === 2 && compositionScore >= 30 && totalScore >= 65) {
    praise.push(pickRandom(PRAISE_POOL.couple_photo))
  }

  // 户外高光环境夸奖（户外+高亮度+构图好）
  if (sceneType === 'outdoor' && brightness >= 160 && compositionScore >= 35 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.outdoor_good))
  }


  // 晨光夸奖（亮度适中偏高+户外+构图好）
  if (brightness >= 140 && brightness <= 220 && compositionScore >= 35 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.morning_light_good))
  }

  // 雪景夸奖（户外+高亮度+构图好+总分高）
  if (brightness >= 180 && compositionScore >= 35 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.snow_scene_good))
  }

  // 咖啡馆场景夸奖（室内+暖光+构图好）
  if (brightness >= 100 && brightness <= 180 && sceneType === 'indoor' && compositionScore >= 35 && totalScore >= 75) {
    praise.push(pickRandom(PRAISE_POOL.cafe_scene_good || PRAISE_POOL.indoor_good))
  }

  // 烘焙坊/面包店场景夸奖（室内+暖黄光+总分高）
  if (brightness >= 120 && brightness <= 200 && sceneType === 'indoor' && totalScore >= 72) {
    praise.push(pickRandom(PRAISE_POOL.bakery_good || PRAISE_POOL.indoor_good))
  }

  // 夜市/小吃街场景夸奖（低亮度+高饱和）
  if (brightness >= 40 && brightness < 100 && totalScore >= 70 && sceneType === 'outdoor') {
    praise.push(pickRandom(PRAISE_POOL.night_market_good || PRAISE_POOL.city_night_good))
  }

  // 都市夜景夸奖（低亮度+构图优秀）
  if (brightness >= 30 && brightness < 100 && compositionScore >= 35 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.city_night_good))
  }

  // 宠物合照夸奖（人脸存在+总分高+构图中等）
  if (faceCount > 0 && compositionScore >= 30 && totalScore >= 75 && stabilityScore >= 15) {
    praise.push(pickRandom(PRAISE_POOL.pet_photo_good))
  }

  // ========== Round 1 新增触发 ==========
  // 糟糕分数鼓励（总分 < 50 但非最差）
  if (totalScore < 50 && totalScore >= 30) {
    praise.push(pickRandom(PRAISE_POOL.low_score_encourage))
    suggestions.push('别气馁！多拍几张找到感觉就好～')
  }
  // 超低分安慰
  if (totalScore < 30) {
    praise.push('这张没达标没关系，重要的是多练习！')
    suggestions.push('打开相机网格线，稳住手，多拍几张～')
  }
  // 金色时刻夸奖（黄昏阳光：亮度 150-210 且户外）
  if (brightness >= 150 && brightness <= 210 && sceneType === 'outdoor' && compositionScore >= 35) {
    praise.push(pickRandom(PRAISE_POOL.golden_hour_good))
  }
  // 纪念日场景夸奖（室内+暖光+构图好+高分）
  if (brightness >= 100 && brightness <= 200 && sceneType === 'indoor' && compositionScore >= 35 && totalScore >= 80) {
    praise.push(pickRandom(PRAISE_POOL.celebration_day_good))
  }
  // 周末约会夸奖（户外+构图好+稳定+高分）
  if (sceneType === 'outdoor' && compositionScore >= 35 && stabilityScore >= 15 && totalScore >= 78) {
    praise.push(pickRandom(PRAISE_POOL.weekend_date_good))
  }
  // 模板匹配夸奖（高构图分+高曝光分+总分高）
  if (compositionScore >= 35 && exposureScore >= 28 && totalScore >= 82) {
    praise.push(pickRandom(PRAISE_POOL.template_match_praise))
  }
  // 连续提升夸奖（streakCount >= 3 且本次分数 >= recentAvg - 5）
  if (streakCount >= 3 && recentAvg !== undefined && totalScore > (recentAvg - 5)) {
    praise.push(pickRandom(PRAISE_POOL.consecutive_improvement))
  }

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

  // 场景专属建议（基于 sceneType 上下文补充）
  if (sceneType === 'outdoor' && totalScore < 80) {
    suggestions.push(pickRandom(SUGGESTION_POOL.outdoor_specific))
  }
  if (brightness < 50 && totalScore < 80) {
    suggestions.push(pickRandom(SUGGESTION_POOL.night_specific))
  }
  if (isCouplePhoto && totalScore < 75) {
    suggestions.push(pickRandom(SUGGESTION_POOL.couple_specific))
  }
  if (sceneType === 'indoor' && totalScore < 75) {
    suggestions.push(pickRandom(SUGGESTION_POOL.indoor_specific))
  }

  // 去重：避免多条相同建议/夸奖（同一个维度触发多个条件时可能重复）
  const uniqueSuggestions = [...new Set(suggestions)]
  const uniquePraise = [...new Set(praise)]

  return {
    totalScore,
    compositionScore,
    exposureScore,
    stabilityScore,
    levelScore,
    suggestions: uniqueSuggestions,
    problems,
    praise: uniquePraise,
  }
}

// 巅峰记录存储
const PEAK_KEY = 'peak_score'

/** 获取历史最高分 */
export async function getPeakScore(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PEAK_KEY)
    if (!raw) return 0
    const parsed = parseInt(raw, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  } catch {
    return 0
  }
}

/** 更新历史最高分（仅当分数更高时） */
export async function updatePeakScore(score: number): Promise<boolean> {
  const current = await getPeakScore()
  if (score > current) {
    try {
      await AsyncStorage.setItem(PEAK_KEY, String(score))
      return true // 新纪录
    } catch {
      return false
    }
  }
  return false
}

/** 从日记列表重新计算并同步峰值分（删除记录后调用） */
export async function recalcPeakScore(diary: DiaryRecord[]): Promise<void> {
  if (diary.length === 0) {
    try {
      await AsyncStorage.removeItem(PEAK_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  const max = Math.max(...diary.map(r => r.score))
  try {
    await AsyncStorage.setItem(PEAK_KEY, String(max))
  } catch {
    /* ignore */
  }
}

/** 获取进步曲线数据（用于 ProgressChart）
 * @param limit 返回最近 N 条记录，默认 30
 */
export async function getScoreHistory(limit: number = 30): Promise<{ date: string; score: number }[]> {
  try {
    const raw = await AsyncStorage.getItem(DIARY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // 只返回有效的分数记录
    return parsed
      .filter((r): r is DiaryRecord => r && typeof r.score === 'number' && typeof r.date === 'string')
      .slice(-limit)
  } catch (e) {
    console.warn('[Diary] getScoreHistory failed:', e)
    return []
  }
}

// 进步日记存储
export interface DiaryRecord {
  date: string
  score: number
  suggestions: string[]
  faceCount: number
  /** 分项分数（用于进步检测） */
  compositionScore?: number
  exposureScore?: number
  stabilityScore?: number
  levelScore?: number
}

export async function saveToDiary(record: DiaryRecord): Promise<boolean> {
  try {
    const existing = await getDiary()
    existing.push(record)
    // 只保留最近 30 条
    const trimmed = existing.slice(-30)
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(trimmed))
    return true
  } catch (e) {
    // 存储空间不足时，尝试删除最旧的记录再保存
    const errStr = String((e as any)?.message || e || '')
    if (errStr.includes('QUOTA') || errStr.includes('quota') || errStr.includes('space')) {
      try {
        const existing = await getDiary()
        // 删除最旧的一条记录
        if (existing.length > 0) {
          existing.shift()
          existing.push(record)
          await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(existing))
          return true
        }
      } catch {
        console.error('[Analyzer] 存储空间不足，保存日记失败:', e)
        return false
      }
    }
    console.error('[Analyzer] 保存日记失败:', e)
    return false
  }
}

/** 直接覆盖保存整个日记数组（用于删除操作） */
export async function writeDiary(records: DiaryRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(records))
  } catch (e) {
    console.error('[Analyzer] 写入日记失败:', e)
  }
}

export async function getDiary(): Promise<DiaryRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(DIARY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    // 过滤无效记录，防止损坏数据导致崩溃
    return Array.isArray(parsed) ? parsed.filter(r => r && typeof r.score === 'number' && r.date) : []
  } catch (e) {
    console.warn('[Diary] getDiary failed:', e)
    return []
  }
}

/** 表情检测数据结构（用于 VoiceCoach 提示） */
export interface EmotionDetection {
  smiling?: boolean
  leftEyeOpen?: boolean
  rightEyeOpen?: boolean
  yawAngle?: number
  rollAngle?: number
  sharpness?: number
  /** 张嘴程度（0-1），检测惊讶表情 */
  mouthOpen?: number
}
