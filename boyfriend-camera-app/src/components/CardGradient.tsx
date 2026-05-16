import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

interface CardGradientProps {
  style?: ViewStyle
}

export const CardGradient: React.FC<CardGradientProps> = ({ style }) => {
  return (
    <View style={style}>
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
      </Svg>
    </View>
  )
}
