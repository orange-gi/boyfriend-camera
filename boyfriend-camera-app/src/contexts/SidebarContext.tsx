import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface SidebarContextType {
  visible: boolean
  show: () => void
  hide: () => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])
  const toggle = useCallback(() => setVisible((v) => !v), [])

  return (
    <SidebarContext.Provider value={{ visible, show, hide, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}
