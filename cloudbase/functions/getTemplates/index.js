/**
 * 男友相机 - getTemplates 云函数
 * 返回姿势模板列表，支持增量同步
 *
 * 请求参数:
 *   localVersion: number  // 客户端当前版本号
 *
 * 返回:
 *   latestVersion: number
 *   update: PoseTemplate[]  // localVersion 之后的新模板
 */
const CURRENT_VERSION = 3

// 内嵌 SVG data URI 作为剪影（简约人物轮廓，粉色半透明）
const mkSvgBase64 = (svgContent) =>
  `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`

const SVG_SILHOUETTE_SIDE = mkSvgBase64(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" fill="rgba(255,107,107,0.35)" stroke="rgba(255,107,107,0.7)" stroke-width="2">
  <ellipse cx="100" cy="50" rx="28" ry="32"/>
  <path d="M 70 82 Q 60 120 65 180 L 80 280"/>
  <path d="M 130 82 Q 140 120 135 180 L 120 280"/>
  <path d="M 70 90 Q 30 130 20 160" fill="none"/>
  <path d="M 130 90 Q 160 110 175 130" fill="none"/>
  <path d="M 65 180 Q 55 220 50 280"/>
  <path d="M 135 180 Q 145 220 150 280"/>
</svg>`)

const SVG_SILHOUETTE_HAIR = mkSvgBase64(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" fill="rgba(255,107,107,0.35)" stroke="rgba(255,107,107,0.7)" stroke-width="2">
  <ellipse cx="100" cy="50" rx="26" ry="30"/>
  <path d="M 74 80 Q 65 115 70 170 L 85 280"/>
  <path d="M 126 80 Q 135 115 130 170 L 115 280"/>
  <path d="M 74 88 Q 40 100 35 150 Q 45 145 55 155"/>
  <path d="M 126 88 Q 155 95 165 115"/>
  <path d="M 70 170 Q 60 210 55 280"/>
  <path d="M 130 170 Q 140 210 145 280"/>
  <path d="M 35 150 Q 25 170 20 190" fill="none" stroke-dasharray="3,2"/>
</svg>`)

const SVG_SILHOUETTE_CHEEK = mkSvgBase64(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" fill="rgba(255,107,107,0.35)" stroke="rgba(255,107,107,0.7)" stroke-width="2">
  <ellipse cx="100" cy="50" rx="26" ry="30"/>
  <ellipse cx="120" cy="65" rx="10" ry="8" fill="rgba(255,107,107,0.5)" stroke="none"/>
  <path d="M 74 80 Q 65 115 68 165 L 80 280"/>
  <path d="M 126 80 Q 138 115 132 165 L 120 280"/>
  <path d="M 74 90 Q 55 100 45 130"/>
  <path d="M 126 95 Q 150 100 165 90"/>
  <path d="M 68 165 Q 58 205 55 280"/>
  <path d="M 132 165 Q 142 205 145 280"/>
</svg>`)

const SVG_SILHOUETTE_BACK = mkSvgBase64(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" fill="rgba(255,107,107,0.35)" stroke="rgba(255,107,107,0.7)" stroke-width="2">
  <ellipse cx="100" cy="50" rx="28" ry="32"/>
  <path d="M 70 82 Q 60 120 65 180 L 82 280"/>
  <path d="M 130 82 Q 140 120 135 180 L 118 280"/>
  <path d="M 70 90 Q 20 100 15 150" fill="none"/>
  <path d="M 130 90 Q 180 100 185 150" fill="none"/>
  <path d="M 15 150 Q 10 180 15 220" fill="none"/>
  <path d="M 65 180 Q 55 220 50 280"/>
  <path d="M 135 180 Q 145 220 150 280"/>
</svg>`)

// 所有模板定义
const ALL_TEMPLATES = [
  {
    id: 'template_001',
    name: '侧身回眸',
    description: '微微侧身，回头看镜头，自然又显瘦',
    overlayUrl: SVG_SILHOUETTE_SIDE,
    thumbnail: SVG_SILHOUETTE_SIDE,
    voiceTip: '侧身站好，轻轻回头看我，笑一个～',
    category: '侧身',
    version: 1,
  },
  {
    id: 'template_002',
    name: '撩发pose',
    description: '一只手轻轻撩起头发，优雅又灵动',
    overlayUrl: SVG_SILHOUETTE_HAIR,
    thumbnail: SVG_SILHOUETTE_HAIR,
    voiceTip: '单手轻轻撩一下耳边头发，下巴微微抬起',
    category: '手势',
    version: 2,
  },
  {
    id: 'template_003',
    name: '托腮文艺',
    description: '托腮思考，文艺感十足，适合近景特写',
    overlayUrl: SVG_SILHOUETTE_CHEEK,
    thumbnail: SVG_SILHOUETTE_CHEEK,
    voiceTip: '用手托住一边脸，眼睛看我，眼神温柔一点',
    category: '特写',
    version: 2,
  },
  {
    id: 'template_004',
    name: '背影回眸',
    description: '先拍背影，再慢慢转身抓拍，自然又有故事感',
    overlayUrl: SVG_SILHOUETTE_BACK,
    thumbnail: SVG_SILHOUETTE_BACK,
    voiceTip: '先背对我，然后慢慢转身，回头那一瞬间按下快门！',
    category: '创意',
    version: 3,
  },
]

exports.main = async (event = {}, context = {}) => {
  const localVersion = event.localVersion || 0

  // 返回增量更新（localVersion 之后的新模板）
  const update = ALL_TEMPLATES.filter(t => t.version > localVersion)

  return {
    latestVersion: CURRENT_VERSION,
    update,
    totalCount: ALL_TEMPLATES.length,
  }
}
