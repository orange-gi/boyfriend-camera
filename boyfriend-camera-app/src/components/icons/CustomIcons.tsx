import React from 'react'
import { Svg, Path, Circle, Line, Rect, Polyline } from 'react-native-svg'

// 统一设计规范的线性图标组件
interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

// 简洁的线性图标 - 新建计划
export const PlusIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 全屏专注（放大镜）
export const FocusIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} />
    <Path d="m21 21-4.35-4.35" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 记录感受（心形）
export const HeartIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 历史记录
export const HistoryIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12a9 9 0 1 0 3-7.07L3 3v6h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 7l4.5 2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 用户头像
export const UserIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
)

// 简洁的线性图标 - 设置
export const SettingsIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 资产数据/订阅
export const CreditCardIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
)

// 简洁的线性图标 - 升级
export const CrownIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m16 4 0 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m20 4 0 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m18 4-2 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m14 4-2 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m10 4-2 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m6 4-2 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 箭头下拉
export const ChevronDownIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="m6 9 6 6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 箭头左
export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="m15 18-6-6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 登出
export const LogOutIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16,17 21,12 16,7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 聊天气泡
export const ChatIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 神秘人
export const SparklesIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 3v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 5h-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 17v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 18H3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// 简洁的线性图标 - 侧边栏（矩形框加竖线）
export const SidebarIcon: React.FC<IconProps> = ({ size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <Line x1="9" y1="3" x2="9" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
)

// 命运 tab 图标（来自 mingyun.svg，天平/命运意象）
const MINGYUN_PATH =
  'M384 42.666667c10.112 0 19.968 2.858667 28.458667 8.192l3.541333 2.474666 3.328 2.688c6.442667 5.717333 11.434667 12.885333 14.506667 20.906667l1.493333 4.522667L640 809.728l69.418667-246.997333A128 128 0 0 1 832.853333 469.333333H938.666667a42.666667 42.666667 0 1 1 0 85.333334h-105.898667a42.709333 42.709333 0 0 0-38.784 24.618666l-2.389333 6.528-100.266667 356.693334-1.493333 4.522666a53.333333 53.333333 0 0 1-99.669334 0l-1.493333-4.48L383.957333 214.186667l-69.376 247.04A128 128 0 0 1 191.701333 554.666667H85.333333a42.666667 42.666667 0 1 1 0-85.333334h106.112a42.709333 42.709333 0 0 0 40.96-31.146666l100.266667-356.693334 1.493333-4.522666A53.333333 53.333333 0 0 1 384 42.666667z'

export const MingyunIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
    <Path d={MINGYUN_PATH} fill={color} />
  </Svg>
)

// 愿景规划 tab 图标（来自 yuanjing.svg）
const YUANJING_PATH =
  'M488.405333 92.458667a42.666667 42.666667 0 0 1 65.450667 27.136c19.242667 96.426667 77.653333 190.122667 155.477333 252.416 93.013333 74.368 144 166.826667 144 267.946666a341.418667 341.418667 0 0 1-582.698666 241.408A341.333333 341.333333 0 0 1 170.666667 640c0-58.624 21.632-116.778667 52.053333-154.709333A42.666667 42.666667 0 0 1 298.666667 512a64 64 0 0 0 128 0c0-34.56-7.978667-51.584-22.101334-78.122667l-16.085333-30.805333c-27.733333-55.466667-31.402667-110.848-12.032-164.693333 18.688-51.882667 57.472-98.773333 107.477333-142.506667l4.48-3.413333z m2.816 117.333333c-16.554667 20.181333-27.904 39.253333-34.474666 57.472-10.965333 30.506667-9.898667 61.696 8.106666 97.621333l15.232 28.672c15.872 29.866667 31.914667 64.682667 31.914667 118.442667a149.333333 149.333333 0 0 1-254.378667 106.069333c-0.981333 7.253333-1.621333 14.549333-1.621333 21.930667a256 256 0 0 0 512 0c0-69.546667-34.346667-139.221333-112-201.344a536.234667 536.234667 0 0 1-164.778667-228.864z'

export const YuanjingIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
    <Path d={YUANJING_PATH} fill={color} />
  </Svg>
)

// 探索自我 tab 图标（来自 ziwo.svg）
const ZIWO_PATH =
  'M512 42.666667c123.093333 0 241.962667 43.946667 330.24 123.434666C930.688 245.674667 981.333333 354.645333 981.333333 469.333333a256 256 0 0 1-256 256h-96a32.042667 32.042667 0 0 0-25.6 51.2l12.8 17.066667a117.418667 117.418667 0 0 1-32.213333 170.197333A117.333333 117.333333 0 0 1 522.666667 981.333333H512a469.333333 469.333333 0 1 1 0-938.666666z m0 85.333333a384 384 0 1 0 0 768h10.666667a32.042667 32.042667 0 0 0 25.6-51.2l-12.8-17.066667a117.418667 117.418667 0 0 1 32.213333-170.197333A117.333333 117.333333 0 0 1 629.333333 640H725.333333l8.448-0.213333A170.666667 170.666667 0 0 0 896 469.333333c0-89.002667-39.253333-175.36-110.848-239.829333C713.429333 164.906667 615.253333 128 512 128z m-234.666667 341.333333a64 64 0 1 1 0 128 64 64 0 0 1 0-128z m469.333334-85.333333a64 64 0 1 1 0 128 64 64 0 0 1 0-128z m-384-128a64 64 0 1 1 0 128 64 64 0 0 1 0-128z m213.333333-42.666667a64 64 0 1 1 0 128 64 64 0 0 1 0-128z'

export const ZiwoIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
    <Path d={ZIWO_PATH} fill={color} />
  </Svg>
)

// 神秘人 tab 图标（来自 MenuIcon-人员管理-黑色.svg）
const SHENMIREN_PATH =
  'M512 597.333333a213.333333 213.333333 0 0 1 213.333333 213.333334v85.333333a42.666667 42.666667 0 1 1-85.333333 0v-85.333333a128 128 0 0 0-115.328-127.36L512 682.666667H256a128 128 0 0 0-128 128v85.333333a42.666667 42.666667 0 1 1-85.333333 0v-85.333333a213.333333 213.333333 0 0 1 213.333333-213.333334h256z m257.365333 37.546667a42.666667 42.666667 0 0 1 51.968-30.634667A213.333333 213.333333 0 0 1 981.333333 810.666667V896a42.666667 42.666667 0 0 1-85.333333 0v-85.290667l-0.426667-10.581333a128 128 0 0 0-95.573333-113.28 42.666667 42.666667 0 0 1-30.634667-51.968zM384 85.333333a213.333333 213.333333 0 1 1 0 426.666667A213.333333 213.333333 0 0 1 384 85.333333z m257.365333 37.418667a42.666667 42.666667 0 0 1 52.010667-30.592 213.333333 213.333333 0 0 1 0 413.013333 42.666667 42.666667 0 0 1-21.418667-82.602666 128.042667 128.042667 0 0 0 0-247.808 42.666667 42.666667 0 0 1-30.592-52.053334zM384 170.666667a128 128 0 1 0 0 256 128 128 0 0 0 0-256z'

export const ShenmirenIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
    <Path d={SHENMIREN_PATH} fill={color} />
  </Svg>
)

