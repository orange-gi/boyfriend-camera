/**
 * VoiceCoach - 语音教练
 * 基于人脸位置和陀螺仪数据的语音提示
 */
import Tts from 'react-native-tts'

class VoiceCoach {
  private enabled: boolean = true

  async initialize() {
    // TODO: 初始化 TTS
    // - 设置中文语音
    // - 语速适中
    console.log('[VoiceCoach] initialized')
  }

  async speak(text: string) {
    if (!this.enabled) return
    // TODO: 调用 TTS 播放提示
    console.log('[VoiceCoach] speak:', text)
    // await Tts.speak(text)
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  stop() {
    // Tts.stop()
  }
}

export default new VoiceCoach()
