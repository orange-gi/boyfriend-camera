import React, { useEffect, useState } from 'react'
import { Image, View, Platform } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { isWeb } from '../../platform'

/**
 * 底栏「时间」Tab：使用 `assets/icon.svg`（与设计稿一致）。
 * 去掉全图浅灰底 `#f9f9f9`，便于叠在胶囊上。
 */
interface TabAppMarkProps {
  size: number
}

/** Metro 将 .svg 作为静态资源 */
const ICON_SVG_ASSET = require('../../../assets/icon.svg')

let cachedXml: string | null = null
let loadPromise: Promise<string> | null = null

function preprocessSvgXml(xml: string): string {
  let s = xml.replace(/<\?xml[^?]*\?>\s*/i, '').replace(/<!DOCTYPE[^>]*>\s*/i, '')
  s = s.replace(/fill="#f9f9f9"/g, 'fill="none"')
  if (!/\bviewBox\s*=/.test(s)) {
    s = s.replace(/<svg\b([^>]*)>/i, '<svg$1 viewBox="0 0 1080 1080">')
  }
  return s
}

function loadIconSvgXml(): Promise<string> {
  if (cachedXml) return Promise.resolve(cachedXml)
  if (loadPromise) return loadPromise

  // Web: 直接从打包后的静态资源路径加载
  if (isWeb) {
    const uri = (ICON_SVG_ASSET as any)?.default?.uri || (ICON_SVG_ASSET as any)?.uri
    if (!uri) {
      return Promise.reject(new Error('icon.svg web 加载无 uri'))
    }
    loadPromise = fetch(uri)
      .then((r) => {
        if (!r.ok) throw new Error(`icon.svg fetch ${r.status}`)
        return r.text()
      })
      .then((xml) => {
        cachedXml = preprocessSvgXml(xml)
        return cachedXml
      })
    return loadPromise
  }

  // Native: 使用 resolveAssetSource
  const resolved = Image.resolveAssetSource(ICON_SVG_ASSET)
  if (!resolved?.uri) {
    return Promise.reject(new Error('icon.svg resolveAssetSource 无 uri'))
  }
  loadPromise = fetch(resolved.uri)
    .then((r) => {
      if (!r.ok) throw new Error(`icon.svg fetch ${r.status}`)
      return r.text()
    })
    .then((xml) => {
      cachedXml = preprocessSvgXml(xml)
      return cachedXml
    })
  return loadPromise
}

export function TabAppMark({ size }: TabAppMarkProps) {
  const [xml, setXml] = useState<string | null>(cachedXml)

  useEffect(() => {
    if (xml) return
    let cancelled = false
    loadIconSvgXml()
      .then((s) => {
        if (!cancelled) setXml(s)
      })
      .catch(() => {
        if (!cancelled) setXml(null)
      })
    return () => {
      cancelled = true
    }
  }, [xml])

  if (!xml) {
    return <View style={{ width: size, height: size }} accessibilityLabel="时间" />
  }

  return <SvgXml xml={xml} width={size} height={size} accessibilityLabel="时间" />
}
