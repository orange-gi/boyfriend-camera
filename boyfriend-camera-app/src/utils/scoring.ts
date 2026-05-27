/**
 * scoring.ts - 共享评分与文案抽取工具
 *
 * 集中管理：
 * - pickRandom: 从文案池随机抽取（防御性：空值安全）
 * - avgScore: 计算日记记录的平均分（防御性：空数组返回 0）
 * - safeBrightness: 将亮度值 clamp 到 [0, 255]
 * - safeSharpness: 将清晰度值 clamp 到 [0, 255]
 */
import type { DiaryRecord } from '../services/diaryTypes'

/** 从文案数组随机抽取一项，空/未定义时返回空字符串 */
export function pickRandom(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 计算 DiaryRecord 数组的平均分，空数组返回 0（防御除零） */
export function avgScore(records: DiaryRecord[]): number {
  if (records.length === 0) return 0
  return Math.round(records.reduce((s, r) => s + r.score, 0) / records.length)
}

/** 亮度值安全范围 [0, 255] */
export function safeBrightness(value: number): number {
  return Math.max(0, Math.min(255, value))
}

/** 清晰度值安全范围 [0, 255] */
export function safeSharpness(value: number): number {
  return Math.max(0, Math.min(255, value))
}

