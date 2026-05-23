/**
 * VoiceCoach - TTS 语音提示服务
 * 使用 react-native-tts 语音合成
 */
import Tts from 'react-native-tts'
import { logger } from '../utils/logger'

export type VoiceScene =
  | 'app_start'         // App 启动
  | 'camera_ready'       // 相机就绪
  | 'photo_captured'    // 拍照成功
  | 'analyzing'         // 分析中
  | 'score_reveal'      // 分数揭晓（按分段：<60 / 60-79 / 80-94 / 95-100）
  | 'diary_loaded'      // 日记加载
  | 'template_selected' // 模板选中
  | 'milestone'         // 里程碑提示（如首次 80 分、首次满分等）
  | 'encourage'         // 鼓励提示（分数低于 50 时）
  | 'celebration'       // 高分庆祝（>=85）
  | 'photo_saved'       // 照片保存成功
  | 'filter_selected'   // 滤镜选中
  | 'filter_swipe'     // 滤镜滑动提示
  | 'share_success'    // 分享成功
  | 'photo_deleted'    // 照片删除

export async function speakScene(scene: VoiceScene, score?: number): Promise<void> {
  try {
    const text = getSceneText(scene, score)
    if (!text) return
    await Tts.speak(text)
  } catch (e) {
    logger.warn('VoiceCoach', 'speak failed', e)
  }
}

function getSceneText(scene: VoiceScene, score?: number): string {
  const templates: Record<VoiceScene, string | ((s: number | undefined) => string)> = {
    app_start: '欢迎使用男友相机，让我们一起拍出好看的照片！',
    camera_ready: '相机准备好了，深呼吸，准备开始！',
    photo_captured: '拍好了！正在分析中，请稍候...',
    analyzing: '正在分析这张照片...',
    score_reveal: (s) => {
      if (!s) return '分数出来了！'
      if (s >= 95) return `哇！满分💯！这张照片太绝了！男朋友你是开挂了吗！快看看哪里做得好！`
      if (s >= 85) return `太棒了！${s}分！男朋友进步好快，这张照片可以直接发朋友圈了！`
      if (s >= 70) return `不错不错，${s}分！男朋友在认真拍，继续加油！`
      return `这张${s}分。多拍几张，分数一定会越来越高的！`
    },
    diary_loaded: '日记加载完成，记录每一次进步！',
    template_selected: '模板选好了，跟着剪影摆好姿势，让男朋友准备拍照！',
    milestone: (s) => {
      if (s && s >= 90) return '🎉 太棒了！男朋友摄影水平又上了一个台阶！'
      return '每天进步一点点，摄影师养成中！'
    },
    encourage: (s) => `没关系！${typeof s === 'number' ? s + '分' : ''}只是起点，多拍几张就会越来越好！`,
    celebration: (s) => `哇！${s}分！男朋友审美大爆发！这张要永久保存！`,
    photo_saved: '照片已保存到相册！可以去相册里找找看～',
    filter_selected: (s) => `滤镜切换成功！${s ? `现在用${s}滤镜呈现～` : '恢复原色调了！'}`,
    filter_swipe: '左右滑动切换滤镜，找到最喜欢的风格～',
    share_success: '分享成功！快让朋友们看看这张大片吧！',
    photo_deleted: '照片已删除～',
  }
  const t = templates[scene]
  if (typeof t === 'function') return t(score)
  return t || ''
}
