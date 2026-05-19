const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')
const fs = require('fs')

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// 加载 .env 文件（安全：.env 在 .gitignore 中，不会提交到 Git）
const envPath = path.resolve(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line: string) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim()
        const value = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
        if (key && !process.env[key]) {
          process.env[key] = value
        }
      }
    }
  })
}

const config = {}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
