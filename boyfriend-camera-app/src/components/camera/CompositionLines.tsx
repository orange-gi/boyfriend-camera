/**
 * CompositionLines - 构图线组件
 * 使用 @shopify/react-native-skia 绘制九宫格/黄金螺旋/三角构图
 */
import React from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import {
  Canvas,
  Path,
  Skia,
  vec,
  Circle,
  Line,
} from '@shopify/react-native-skia'

type CompositionMode = 'grid' | 'golden' | 'triangle'

interface Props {
  mode: CompositionMode
  opacity?: number
}

// 黄金比例 ≈ 1.618
const PHI = 1.6180339887

export default function CompositionLines({ mode, opacity = 0.7 }: Props) {
  const { width, height } = useWindowDimensions()
  const strokeColor = `rgba(255,255,255,${opacity})`
  const strokeWidth = 1.5

  const gridLines = (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 九宫格 - 两条垂直线 */}
      <Line
        p1={vec(width / 3, 0)}
        p2={vec(width / 3, height)}
        color={strokeColor}
        strokeWidth={strokeWidth}
      />
      <Line
        p1={vec((2 * width) / 3, 0)}
        p2={vec((2 * width) / 3, height)}
        color={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* 两条水平线 */}
      <Line
        p1={vec(0, height / 3)}
        p2={vec(width, height / 3)}
        color={strokeColor}
        strokeWidth={strokeWidth}
      />
      <Line
        p1={vec(0, (2 * height) / 3)}
        p2={vec(width, (2 * height) / 3)}
        color={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* 黄金分割点 - 四个交点 */}
      <Circle cx={width / 3} cy={height / 3} r={4} color={strokeColor} opacity={opacity} />
      <Circle cx={(2 * width) / 3} cy={height / 3} r={4} color={strokeColor} opacity={opacity} />
      <Circle cx={width / 3} cy={(2 * height) / 3} r={4} color={strokeColor} opacity={opacity} />
      <Circle cx={(2 * width) / 3} cy={(2 * height) / 3} r={4} color={strokeColor} opacity={opacity} />
    </Canvas>
  )

  // 构建黄金螺旋线的 Path
  const buildGoldenSpiral = (): ReturnType<typeof Skia.Path.Make> => {
    const p = Skia.Path.Make()
    // 简化的黄金螺旋近似
    const goldenX1 = width / PHI
    const goldenX2 = width - width / PHI
    const goldenY1 = height / PHI
    const goldenY2 = height - height / PHI

    // 四条黄金分割线
    p.moveTo(goldenX1, 0)
    p.lineTo(goldenX1, height)
    p.moveTo(goldenX2, 0)
    p.lineTo(goldenX2, height)
    p.moveTo(0, goldenY1)
    p.lineTo(width, goldenY1)
    p.moveTo(0, goldenY2)
    p.lineTo(width, goldenY2)

    // 简化螺旋曲线
    p.moveTo(width, height)
    p.quadTo(goldenX1, height, goldenX1, height - height / PHI)
    p.quadTo(goldenX1, goldenY1, width - goldenX1, goldenY1)
    p.quadTo(goldenX2, goldenY2, goldenX2, goldenY2)
    return p
  }

  const goldenLines = (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        path={buildGoldenSpiral()}
        style="stroke"
        strokeWidth={strokeWidth}
        color={strokeColor}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  )

  // 三角构图的 Path
  const buildTrianglePath = (): ReturnType<typeof Skia.Path.Make> => {
    const p = Skia.Path.Make()
    const topX = width / 2
    const topY = height * 0.1
    const bottomLeftX = width * 0.1
    const bottomLeftY = height * 0.9
    const bottomRightX = width * 0.9
    const bottomRightY = height * 0.9

    p.moveTo(topX, topY)
    p.lineTo(bottomLeftX, bottomLeftY)
    p.moveTo(topX, topY)
    p.lineTo(bottomRightX, bottomRightY)
    p.moveTo(bottomLeftX, bottomLeftY)
    p.lineTo(bottomRightX, bottomRightY)
    // 垂直辅助线
    p.moveTo(topX, topY)
    p.lineTo(topX, bottomRightY)
    return p
  }

  const triangleLines = (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        path={buildTrianglePath()}
        style="stroke"
        strokeWidth={strokeWidth}
        color={strokeColor}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* 虚线辅助 */}
      <Line
        p1={vec(width / 2, height * 0.1)}
        p2={vec(width / 2, height * 0.9)}
        color={strokeColor}
        strokeWidth={strokeWidth * 0.6}
        opacity={opacity * 0.5}
      />
    </Canvas>
  )

  return (
    <View style={styles.container} pointerEvents="none">
      {mode === 'grid' && gridLines}
      {mode === 'golden' && goldenLines}
      {mode === 'triangle' && triangleLines}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
})
