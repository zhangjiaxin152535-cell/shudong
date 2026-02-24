import { supabase } from './supabase'
import { useChatStore } from '../stores/chatStore'
import { useNotificationStore } from '../stores/notificationStore'
import type { Message, Notification } from '../types/database'

let channel: ReturnType<typeof supabase.channel> | null = null

export function startRealtimeSubscriptions(userId: string) {
  if (channel) return

  channel = supabase.channel(`user-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
    }, (payload) => {
      const msg = payload.new as Message
      if (msg.conversation_id) {
        useChatStore.getState().addIncomingMessage(msg.conversation_id, msg)
      }
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'group_messages',
    }, (payload) => {
      const msg = payload.new as Message & { group_id: string }
      if (msg.group_id) {
        useChatStore.getState().addIncomingMessage(`group-${msg.group_id}`, msg as Message)
      }
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      useNotificationStore.getState().addNotification(payload.new as Notification)
    })
    .subscribe()
}

export function stopRealtimeSubscriptions() {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}
