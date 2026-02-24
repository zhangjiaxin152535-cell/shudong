import { create } from 'zustand'

interface UIState {
  showLoginModal: boolean
  setShowLoginModal: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  showLoginModal: false,
  setShowLoginModal: (show) => set({ showLoginModal: show }),
}))
