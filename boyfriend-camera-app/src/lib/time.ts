/**
 * 时间工具函数
 * 所有时间统一使用“用户设备本地时区”
 *
 * 约定：
 * - 数据库存储：CloudBase 关系型数据库（MySQL DATETIME）使用 `YYYY-MM-DD HH:mm:ss`（无时区信息）
 * - 展示/比较/“今天边界”：统一按设备本地时区计算
 */

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

/**
 * 获取当前本地时间（设备时区）
 */
export function now(): dayjs.Dayjs {
  return dayjs()
}

/**
 * 将任意输入转换为本地时间（设备时区）
 */
export function toLocalTime(dateString: string | number | Date | dayjs.Dayjs): dayjs.Dayjs {
  if (dayjs.isDayjs(dateString)) return dateString
  if (typeof dateString === 'string') {
    const s = dateString.trim()
    // MySQL DATETIME 格式（如 '2026-04-05 20:13:00'）- 作为本地时间直接解析
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      // 使用 'YYYY-MM-DD HH:mm:ss' 格式解析，明确不当时区转换
      return dayjs(s, 'YYYY-MM-DD HH:mm:ss')
    }
    return dayjs(s as any)
  }
  // dayjs 会正确解析带 offset/时区的 ISO 字符串；展示/日界线运算按设备本地时区。
  return dayjs(dateString as any)
}

/**
 * 兼容旧命名：历史上该项目强制使用北京时间。
 * 现在已统一改为“设备本地时区”，但保留该函数名避免大范围重构。
 */
export const toBeijingTime = toLocalTime

/**
 * 格式化日期时间（本地时区）
 * @param dateString ISO 时间字符串或时间戳
 * @param format 格式字符串，默认为 'YYYY-MM-DD HH:mm:ss'
 */
export function formatDateTime(
  dateString: string | number | Date | dayjs.Dayjs | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  if (!dateString) return ''
  return toLocalTime(dateString).format(format)
}

/**
 * 格式化日期（本地时区）
 * @param dateString ISO 时间字符串或时间戳
 * @param format 格式字符串，默认为 'YYYY-MM-DD'
 */
export function formatDate(
  dateString: string | number | Date | dayjs.Dayjs | null | undefined,
  format: string = 'YYYY-MM-DD'
): string {
  if (!dateString) return ''
  return toLocalTime(dateString).format(format)
}

/**
 * 格式化时间（本地时区）
 * @param dateString ISO 时间字符串或时间戳
 * @param format 格式字符串，默认为 'HH:mm'
 */
export function formatTime(
  dateString: string | number | Date | dayjs.Dayjs | null | undefined,
  format: string = 'HH:mm'
): string {
  if (!dateString) return ''
  return toLocalTime(dateString).format(format)
}

/**
 * 格式化日期时间（中文格式，本地时区）
 * 例如：2024年1月15日 14:30
 */
export function formatDateTimeCN(
  dateString: string | number | Date | dayjs.Dayjs | null | undefined
): string {
  if (!dateString) return ''
  return toLocalTime(dateString).format('YYYY年M月D日 HH:mm')
}

/**
 * 格式化日期（中文格式，本地时区）
 * 例如：2024年1月15日
 */
export function formatDateCN(
  dateString: string | number | Date | dayjs.Dayjs | null | undefined
): string {
  if (!dateString) return ''
  return toLocalTime(dateString).format('YYYY年M月D日')
}

/**
 * 格式化日期时间（简短格式，本地时区）
 * 例如：1月15日 14:30
 */
export function formatDateTimeShort(
  dateString: string | number | Date | dayjs.Dayjs | null | undefined
): string {
  if (!dateString) return ''
  return toLocalTime(dateString).format('M月D日 HH:mm')
}

/**
 * 获取当前时间的 ISO 字符串（UTC instant；用于数据库存储）
 */
export function nowISO(): string {
  return now().toISOString()
}

/**
 * 将本地时间（或任意输入）转换为 ISO 字符串（UTC instant；用于数据库存储）
 * @param dateString ISO 时间字符串或时间戳
 */
export function toISOString(dateString: string | number | Date | dayjs.Dayjs): string {
  return toLocalTime(dateString).toISOString()
}

/**
 * CloudBase 关系型数据库（MySQL DATETIME）写入格式：`YYYY-MM-DD HH:mm:ss`
 * 注意：DATETIME 不携带时区信息；本项目口径为“设备本地时间”。
 */
export function toSqlDateTime(date: string | number | Date | dayjs.Dayjs): string {
  return toLocalTime(date).format('YYYY-MM-DD HH:mm:ss')
}

/** 当前时间的 SQL DATETIME 字符串（本地时区口径） */
export function nowSqlDateTime(): string {
  return toSqlDateTime(now())
}

/**
 * 比较两个时间（本地时区口径）
 * @returns 正数表示 date1 > date2，负数表示 date1 < date2，0 表示相等
 */
export function compareTime(
  date1: string | number | Date | dayjs.Dayjs,
  date2: string | number | Date | dayjs.Dayjs
): number {
  const time1 = toLocalTime(date1)
  const time2 = toLocalTime(date2)
  return time1.valueOf() - time2.valueOf()
}

/**
 * 获取时间差（本地时区口径）
 * @returns 毫秒数
 */
export function diffTime(
  date1: string | number | Date | dayjs.Dayjs,
  date2: string | number | Date | dayjs.Dayjs,
  unit: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' = 'millisecond'
): number {
  const time1 = toLocalTime(date1)
  const time2 = toLocalTime(date2)
  return time1.diff(time2, unit)
}

/**
 * 判断时间是否在今天（设备本地时区）
 */
export function isToday(dateString: string | number | Date | dayjs.Dayjs): boolean {
  const date = toLocalTime(dateString)
  const today = now()
  return date.isSame(today, 'day')
}

/**
 * 判断时间是否在昨天（设备本地时区）
 */
export function isYesterday(dateString: string | number | Date | dayjs.Dayjs): boolean {
  const date = toLocalTime(dateString)
  const yesterday = now().subtract(1, 'day')
  return date.isSame(yesterday, 'day')
}

/**
 * 获取相对时间描述（设备本地时区）
 * 例如：刚刚、5分钟前、2小时前、昨天、3天前
 */
export function formatRelativeTime(dateString: string | number | Date | dayjs.Dayjs): string {
  const date = toLocalTime(dateString)
  const nowTime = toLocalTime(new Date())
  const diffSeconds = nowTime.diff(date, 'second')
  
  if (diffSeconds < 60) {
    return '刚刚'
  }
  
  const diffMinutes = nowTime.diff(date, 'minute')
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  }
  
  const diffHours = nowTime.diff(date, 'hour')
  if (diffHours < 24) {
    return `${diffHours}小时前`
  }
  
  const diffDays = nowTime.diff(date, 'day')
  if (diffDays === 1) {
    return '昨天'
  }
  if (diffDays < 7) {
    return `${diffDays}天前`
  }
  
  return formatDateCN(dateString)
}

/**
 * 当天开始（本地时区）的 ISO（UTC instant；用于 DB 过滤）
 */
export function startOfTodayISO(): string {
  return now().startOf('day').toISOString()
}

/**
 * 次日开始（本地时区）的 ISO（UTC instant；用于 DB 过滤）
 */
export function startOfTomorrowISO(): string {
  return now().add(1, 'day').startOf('day').toISOString()
}

/** 当天开始（本地时区）SQL DATETIME（用于 MySQL DATETIME 过滤） */
export function startOfTodaySqlDateTime(): string {
  return now().startOf('day').format('YYYY-MM-DD HH:mm:ss')
}

/** 次日开始（本地时区）SQL DATETIME（用于 MySQL DATETIME 过滤） */
export function startOfTomorrowSqlDateTime(): string {
  return now().add(1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss')
}

/** `YYYY-MM-DD` → 当天 00:00:00（用于范围过滤起点） */
export function dateStartSqlDateTime(dateYYYYMMDD: string): string {
  return `${dateYYYYMMDD} 00:00:00`
}

/** `YYYY-MM-DD` → 当天 23:59:59（用于范围过滤终点） */
export function dateEndSqlDateTime(dateYYYYMMDD: string): string {
  return `${dateYYYYMMDD} 23:59:59`
}
