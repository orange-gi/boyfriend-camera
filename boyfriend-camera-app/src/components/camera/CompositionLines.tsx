/**
 * CompositionLines - 构图线组件
 * 使用纯 React Native View 绘制（兼容 React 19）
 * Skia 与 React 19 不兼容，已移除
 */
import React, { useMemo } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

type CompositionMode = 'grid' | 'golden' | 'triangle'

interface Props {
  mode: CompositionMode
  opacity?: number
}

/** 黄金比例 ≈ 1.618 */
const PHI = 1.6180339887

export default function CompositionLines({ mode, opacity = 0.7 }: Props) {
  const { width, height } = useWindowDimensions()

  if (mode === 'grid') {
    return <GridLines width={width} height={height} opacity={opacity} />
  }
  if (mode === 'golden') {
    return <GoldenLines width={width} height={height} opacity={opacity} />
  }
  if (mode === 'triangle') {
    return <TriangleLines width={width} height={height} opacity={opacity} />
  }
  return null
}

/** 九宫格构图 */
function GridLines({ width, height, opacity }: { width: number; height: number; opacity: number }) {
  const tickSize = 4
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 垂直线 */}
      <View style={[styles.line, styles.verticalLine, { left: width / 3, height, opacity }]} />
      <View style={[styles.line, styles.verticalLine, { left: (2 * width) / 3, height, opacity }]} />
      {/* 水平线 */}
      <View style={[styles.line, styles.horizontalLine, { top: height / 3, width, opacity }]} />
      <View style={[styles.line, styles.horizontalLine, { top: (2 * height) / 3, width, opacity }]} />
      {/* 黄金分割点 */}
      {[
        [width / 3, height / 3],
        [(2 * width) / 3, height / 3],
        [width / 3, (2 * height) / 3],
        [(2 * width) / 3, (2 * height) / 3],
      ].map(([x, y], i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: x - tickSize,
              top: y - tickSize,
              width: tickSize * 2,
              height: tickSize * 2,
              borderRadius: tickSize,
              opacity,
            },
          ]}
        />
      ))}
    </View>
  )
}

/** 黄金螺旋/黄金分割线构图 */
function GoldenLines({ width, height, opacity }: { width: number; height: number; opacity: number }) {
  const goldenX1 = width / PHI
  const goldenX2 = width - width / PHI
  const goldenY1 = height / PHI
  const goldenY2 = height - height / PHI

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 垂直黄金分割线 */}
      <View style={[styles.line, styles.verticalLine, { left: goldenX1, height, opacity }]} />
      <View style={[styles.line, styles.verticalLine, { left: goldenX2, height, opacity }]} />
      {/* 水平黄金分割线 */}
      <View style={[styles.line, styles.horizontalLine, { top: goldenY1, width, opacity }]} />
      <View style={[styles.line, styles.horizontalLine, { top: goldenY2, width, opacity }]} />
      {/* 螺旋引导弧（用 View 模拟弧线效果） */}
      <GoldenSpiralHint width={width} height={height} opacity={opacity} />
    </View>
  )
}

/** 三角构图 */
function TriangleLines({ width, height, opacity }: { width: number; height: number; opacity: number }) {
  const topX = width / 2
  const topY = height * 0.1
  const bottomLeftX = width * 0.1
  const bottomLeftY = height * 0.9
  const bottomRightX = width * 0.9
  const bottomRightY = height * 0.9
  const centerX = width / 2
  const bottomCenterY = height * 0.9

  // 三边斜率
  const dx1 = bottomLeftX - topX
  const dy1 = bottomLeftY - topY
  const dx2 = bottomRightX - topX
  const dy2 = bottomRightY - topY

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
  const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI)
  const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 左边 */}
      <View
        style={[
          styles.diagonalLine,
          {
            left: topX,
            top: topY,
            width: len1,
            transform: [{ rotate: `${angle1}deg` }],
            transformOrigin: 'left top',
            opacity,
          },
        ]}
      />
      {/* 右边 */}
      <View
        style={[
          styles.diagonalLine,
          {
            left: topX,
            top: topY,
            width: len2,
            transform: [{ rotate: `${angle2}deg` }],
            transformOrigin: 'left top',
            opacity,
          },
        ]}
      />
      {/* 底边 */}
      <View style={[styles.line, styles.horizontalLine, { top: bottomLeftY, width: bottomRightX - bottomLeftX, left: bottomLeftX, opacity }]} />
      {/* 中线（虚线辅助） */}
      <View style={[styles.line, styles.verticalLine, { left: centerX, top: topY, height: bottomCenterY - topY, opacity: opacity * 0.5 }]} />
    </View>
  )
}

/** 黄金螺旋提示（用 View 弧形模拟） */
function GoldenSpiralHint({ width, height, opacity }: { width: number; height: number; opacity: number }) {
  // 使用多层半透明弧形叠加，模拟黄金螺旋效果
  const gx = width / PHI
  const gy = height / PHI

  return (
    <>
      {/* 右上象限弧（模拟） */}
      <View
        style={[
          styles.arc,
          {
            left: gx,
            top: gy,
            width: width - gx,
            height: height - gy,
            borderTopRightRadius: width - gx,
            opacity: opacity * 0.5,
          },
        ]}
      />
    </>
  )
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  verticalLine: {
    width: 1,
    top: 0,
  },
  horizontalLine: {
    height: 1,
    left: 0,
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  diagonalLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: '#fff',
    transformOrigin: 'left center',
  },
  arc: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
})
