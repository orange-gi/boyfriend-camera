/**
 * cloudbase.ts - CloudBase 初始化和登录
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloudbase = require('@cloudbase/js-sdk')

const app = cloudbase.init({
  env: 'jiulou-4gu5ljkpa1082b3c',
  region: 'ap-shanghai',
})

export async function login(): Promise<any> {
  // 匿名登录
  try {
    const auth = app.auth({ persistence: 'local' })
    await auth.anonymousAuthProvider().signIn()
    console.log('[CloudBase] 匿名登录成功')
    return auth
  } catch (e: any) {
    console.error('[CloudBase] 登录失败:', e.message)
    return null
  }
}

export async function getCurrentUser(): Promise<any> {
  const auth = app.auth({ persistence: 'local' })
  return await auth.getCurrentUser()
}

export async function callFunction(name: string, data: object): Promise<any> {
  try {
    const res = await app.callFunction({
      name,
      data,
    })
    return res
  } catch (e: any) {
    console.error('[CloudBase] callFunction error:', e.message)
    return null
  }
}

export default app
