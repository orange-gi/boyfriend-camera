/**
 * 神秘人模块全局弹窗状态管理
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'

type TabKey = 'chat' | 'self' | 'growth' | 'destiny'

interface MysteriousPersonState {
  isOpen: boolean
  activeTab: TabKey
}

interface ModalContextValue {
  mysteriousPerson: MysteriousPersonState
  openMysteriousPerson: (tab?: TabKey) => void
  closeMysteriousPerson: () => void
  setMysteriousPersonTab: (tab: TabKey) => void
}

const initialState: MysteriousPersonState = {
  isOpen: false,
  activeTab: 'chat',
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [mysteriousPerson, setMysteriousPerson] = useState<MysteriousPersonState>(initialState)

  const mysteriousTabParam = params['mysterious-person-tab'] as TabKey | undefined

  useFocusEffect(
    React.useCallback(() => {
      if (mysteriousTabParam && ['chat', 'self', 'growth', 'destiny'].includes(mysteriousTabParam)) {
        setMysteriousPerson({
          isOpen: true,
          activeTab: mysteriousTabParam,
        })
        router.setParams({ 'mysterious-person-tab': undefined } as any)
      }
    }, [mysteriousTabParam, router]),
  )

  const openMysteriousPerson = useCallback((tab: TabKey = 'chat') => {
    setMysteriousPerson({
      isOpen: true,
      activeTab: tab,
    })
  }, [])

  const closeMysteriousPerson = useCallback(() => {
    setMysteriousPerson((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }, [])

  const setMysteriousPersonTab = useCallback((tab: TabKey) => {
    setMysteriousPerson((prev) => ({
      ...prev,
      activeTab: tab,
    }))
  }, [])

  return (
    <ModalContext.Provider
      value={{
        mysteriousPerson,
        openMysteriousPerson,
        closeMysteriousPerson,
        setMysteriousPersonTab,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

export function useMysteriousPersonModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useMysteriousPersonModal must be used within ModalProvider')
  }
  return context
}
