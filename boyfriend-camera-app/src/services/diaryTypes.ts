/**
 * diaryTypes.ts - 日记记录核心类型
 *
 * 统一存放 DiaryRecord 类型，避免 scoring.ts ↔ analyzer.ts 循环导入
 * scoring.ts 需要 DiaryRecord（avgScore 参数类型）
 * analyzer.ts 需要 DiaryRecord（writeDiary/getDiary 参数类型）
 */
export interface DiaryRecord {
  date: string
  score: number
  suggestions: string[]
  faceCount: number
  /** 分项分数（用于进步检测） */
  compositionScore?: number
  exposureScore?: number
  stabilityScore?: number
  levelScore?: number
  expressionScore?: number
}
