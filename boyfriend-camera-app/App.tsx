/**
 * App.tsx - 男友相机入口
 */
import React, { useEffect, useState } from 'react'
import { StatusBar, View, Text, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { login } from './src/services/cloudbase'

import HomeScreen from './src/screens/HomeScreen'
import CameraScreen from './src/screens/CameraScreen'
import ResultScreen from './src/screens/ResultScreen'
import DiaryScreen from './src/screens/DiaryScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  const [ready, setReady] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    initApp()
  }, [])

  async function initApp() {
    console.log('[App] 初始化...')
    await login()
    setReady(true)
  }

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>📸 男友相机</Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen
              name="Diary"
              component={DiaryScreen}
              options={{
                headerShown: true,
                headerTitle: '进步日记',
                headerBackTitle: '返回',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
})
