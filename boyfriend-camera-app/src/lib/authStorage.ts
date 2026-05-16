/**
 * 登录页「记住邮箱 / 记住密码」键名（与 CloudBase 无关）
 * 静默重登仅读取二者皆有时的凭据。
 */
import { storage } from './storage'

export const REMEMBER_EMAIL_KEY = 'boyfriend_camera_remembered_email'
export const REMEMBER_PASSWORD_KEY = 'boyfriend_camera_remembered_password'

export async function getStoredCredentials(): Promise<{
  email: string
  password: string
} | null> {
  try {
    const email = await storage.getItem(REMEMBER_EMAIL_KEY)
    const password = await storage.getItem(REMEMBER_PASSWORD_KEY)
    if (email?.trim() && password?.trim()) {
      return { email: email.trim(), password: password.trim() }
    }
  } catch {
    // ignore
  }
  return null
}