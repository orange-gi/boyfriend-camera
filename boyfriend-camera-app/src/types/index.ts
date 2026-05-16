/**
 * 男友相机 - 类型定义
 */
export interface User {
  id: string
  email?: string
  phone?: string
  created_at?: string
}

export interface PhotoAnalysis {
  id: string
  user_id: string
  score?: number
  highlights?: string[]
  suggestions?: AnalysisSuggestion[]
  tip?: string
  analysis_text?: string
  image_url?: string
  created_at?: string
}

export interface AnalysisSuggestion {
  dimension: string
  text: string
}

export type AnalysisDimension =
  | '构图'
  | '用光'
  | '角度'
  | '背景'
  | '表情引导'
