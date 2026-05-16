/**
 * 重置 Expo 项目
 */
const fs = require('fs')
const path = require('path')

const files = [
  'node_modules',
  '.expo',
  'dist',
  '.expo-shared',
]

files.forEach((file) => {
  const p = path.join(__dirname, '..', file)
  if (fs.existsSync(p)) {
    console.log(`Removing ${file}...`)
    fs.rmSync(p, { recursive: true, force: true })
  }
})

console.log('Done. Run `pnpm install` to reinstall dependencies.')
