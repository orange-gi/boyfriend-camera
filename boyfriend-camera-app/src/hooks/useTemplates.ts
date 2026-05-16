/**
 * useTemplates - 模板管理 Hook
 */
import { useState, useEffect } from 'react'
import { syncTemplates, getCachedTemplates } from '../services/templateSync'
import type { PoseTemplate } from '../components/camera/PoseTemplateOverlay'

export function useTemplates() {
  const [templates, setTemplates] = useState<PoseTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setError(null)
    try {
      // 先取本地缓存
      const cached = await getCachedTemplates()
      if (cached.length > 0) setTemplates(cached)
      
      // 再同步云端
      const synced = await syncTemplates()
      if (synced.length > 0) setTemplates(synced)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return { templates, loading, error, refresh: loadTemplates }
}
