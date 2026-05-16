/**
 * 男友相机 - 环境配置
 */
export const config = {
  // CloudBase
  cloudbaseEnvId: process.env.EXPO_PUBLIC_CLOUDBASE_ENV_ID || 'jiulou-4gu5ljkpa1082b3c',

  // AI
  minimaxApiKey: process.env.EXPO_PUBLIC_MINIMAX_API_KEY || '',

  // App
  appName: '男友相机',
  appVersion: '1.0.0',

  // 主题色
  colors: {
    primary: '#FF8A9B',
    background: '#FFF5F6',
    surface: '#ffffff',
    text: '#2D2D2D',
    textSecondary: '#888888',
    border: '#eeeeee',
    success: '#4CAF50',
    warning: '#FFE066',
  },

  // 云函数名称
  functions: {
    analyzePhoto: 'boyfriend-camera-analyze-photo',
  },

  // 存储桶
  storage: {
    bucket: '6a69-jiulou-4gu5ljkpa1082b3c-1257615712',
    photosPath: 'boyfriend-camera/photos/',
  },
}
