import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types/database'

interface NotifState {
  notifications: Notification[]
  unreadCount: number
  loaded: boolean

  loadNotifications: (userId: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  addNotification: (n: Notification) => void
  reset: () => void
}

export const useNotificationStore = create<NotifState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loaded: false,

  loadNotifications: async (userId) => {
    if (get().loaded) return
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    if (data) {
      const notifs = data as Notification[]
      set({ notifications: notifs, unreadCount: notifs.filter(n => !n.is_read).length, loaded: true })
    }
  },

  markAsRead: async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  addNotification: (n) => {
    set(s => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }))
  },

  reset: () => set({ notifications: [], unreadCount: 0, loaded: false }),
}))
