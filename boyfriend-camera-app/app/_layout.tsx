/**
 * 男友相机 - 根布局
 * 简化版，参考知与行架构
 */
import '../src/polyfills'

import React, { useEffect, useState } from 'react'
import { Buffer } from 'buffer'
import { Stack, useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import '../src/lib/cloudbase'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '../src/lib/queryClient'

// Polyfill Buffer
if (typeof (globalThis as any).Buffer === 'undefined') {
  ;(globalThis as any).Buffer = Buffer
}

function AuthNavigationSync() {
  const { user, status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') return

    const isAuthRoute = pathname.startsWith('/(auth)') || pathname === '/login'
    const isHome = pathname === '/home' || pathname === '/' || pathname === '/(tabs)'

    if (status === 'authenticated' && user && isAuthRoute) {
      router.replace('/home')
      return
    }

    if (status === 'unauthenticated' && !isAuthRoute && !isHome) {
      router.replace('/(auth)/login')
    }
  }, [user, status, pathname, router])

  return null
}

function RootNavContent() {
  return (
    <>
      <AuthNavigationSync />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFF5F6' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavContent />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
