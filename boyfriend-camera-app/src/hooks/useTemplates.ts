/**
 * useTemplates - 模板管理 Hook
 */
import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { syncTemplates, getCachedTemplates } from '../services/templateSync'
import type { PoseTemplate } from '../components/camera/PoseTemplateOverlay'

const RECENT_KEY = 'recent_templates'
const MAX_RECENT = 5

export function useTemplates() {
  const [templates, setTemplates] = useState<PoseTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentTemplates, setRecentTemplates] = useState<PoseTemplate[]>([])

  useEffect(() => {
    loadTemplates()
    loadRecent()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setError(null)
    let cached: Awaited<ReturnType<typeof getCachedTemplates>> = []
    try {
      // 先取本地缓存
      cached = await getCachedTemplates()
      if (cached.length > 0) setTemplates(cached)

      // 再同步云端
      const synced = await syncTemplates()
      if (synced.length > 0) setTemplates(synced)
    } catch (e: unknown) {
      // 仅在完全没有数据时才报错，有缓存时网络失败不算致命错误
      if (cached.length === 0) {
        setError((e instanceof Error ? e.message : String(e)) || '加载失败，请检查网络后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadRecent() {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY)
      if (!raw) return
      const ids: string[] = JSON.parse(raw)
      const cached = await getCachedTemplates()
      const recent = ids
        .map((id) => cached.find((t) => t.id === id))
        .filter(Boolean) as PoseTemplate[]
      setRecentTemplates(recent)
    } catch {
      // ignore
    }
  }

  const markUsed = useCallback(async (templateId: string) => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY)
      const ids: string[] = raw ? JSON.parse(raw) : []
      // 移至顶部，去重
      const filtered = ids.filter((id) => id !== templateId)
      const updated = [templateId, ...filtered].slice(0, MAX_RECENT)
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      // 刷新 recent
      const cached = await getCachedTemplates()
      const recent = updated
        .map((id) => cached.find((t) => t.id === id))
        .filter(Boolean) as PoseTemplate[]
      setRecentTemplates(recent)
    } catch {
      // ignore
    }
  }, [])

  return { templates, loading, error, refresh: loadTemplates, recentTemplates, markUsed }
}
