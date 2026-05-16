/**
 * 测试 getTemplates 云函数 - 验证返回结构
 */
const https = require('https')

const ENV_ID = 'jiulou-4gu5ljkpa1082b3c'

function callFunction(name, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name, data })
    const req = https.request({
      hostname: 'tcb.cloud.tencent.com',
      path: `/admin/v2/functions/${name}/call?envId=${ENV_ID}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve(JSON.parse(d)))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  console.log('=== 测试 getTemplates ===')
  const result = await callFunction('getTemplates', { localVersion: 0 })
  
  const data = result.result || result
  const templates = data.update || []
  
  console.log(`latestVersion: ${data.latestVersion}`)
  console.log(`templates count: ${templates.length}`)
  
  // 验证每个模板
  const required = ['id', 'name', 'overlayUrl', 'thumbnail', 'voiceTip', 'category']
  for (const t of templates) {
    const missing = required.filter(k => !t[k])
    if (missing.length > 0) {
      console.error(`❌ ${t.name}: 缺少字段 ${missing.join(', ')}`)
    } else {
      console.log(`✅ ${t.name} (${t.category})`)
    }
  }
  
  // 验证分类覆盖
  const categories = [...new Set(templates.map(t => t.category))]
  console.log(`\n分类覆盖: ${categories.join(', ')}`)
  
  // 检查是否有重复 id
  const ids = templates.map(t => t.id)
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dup.length > 0) {
    console.error(`❌ 重复 id: ${dup.join(', ')}`)
  } else {
    console.log('✅ 无重复 id')
  }
  
  console.log('\n=== 测试通过 ===')
}

main().catch(e => {
  console.error('测试失败:', e.message)
  process.exit(1)
})
