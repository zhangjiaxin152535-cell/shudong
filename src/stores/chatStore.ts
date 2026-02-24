import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Message, Profile } from '../types/database'

interface ConversationItem {
  id: string
  otherUserId: string
  otherName: string
  status: 'stranger' | 'friend'
  lastMsg: string
  lastTime: string
  isGroup: boolean
  groupName?: string
}

interface ChatState {
  conversations: ConversationItem[]
  conversationsLoaded: boolean
  messages: Record<string, Message[]>
  messagesFullyLoaded: Record<string, boolean>

  loadConversations: (userId: string) => Promise<void>
  loadMessages: (convId: string, isGroup?: boolean) => Promise<void>
  loadMoreMessages: (convId: string, isGroup?: boolean) => Promise<void>
  sendMessage: (convId: string, userId: string, text: string, isGroup?: boolean) => Promise<void>
  addIncomingMessage: (convId: string, msg: Message) => void
  updateConversationStatus: (convId: string, status: 'stranger' | 'friend') => void
  getStrangerSentCount: (convId: string, userId: string) => number
  reset: () => void
}

const PAGE_SIZE = 30

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  conversationsLoaded: false,
  messages: {},
  messagesFullyLoaded: {},

  loadConversations: async (userId) => {
    if (get().conversationsLoaded) return
    const items: ConversationItem[] = []

    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (convos) {
      for (const c of convos) {
        const otherId = c.user_a_id === userId ? c.user_b_id : c.user_a_id
        const { data: p } = await supabase.from('profiles').select('nickname').eq('id', otherId).single()
        const { data: lastMsg } = await supabase.from('messages').select('text_content, created_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).single()
        items.push({
          id: c.id, otherUserId: otherId, otherName: p?.nickname || '未知用户',
          status: c.status, lastMsg: lastMsg?.text_content || '', lastTime: lastMsg?.created_at || c.created_at,
          isGroup: false,
        })
      }
    }

    const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', userId)
    if (myGroups) {
      for (const gm of myGroups) {
        const { data: group } = await supabase.from('groups').select('*').eq('id', gm.group_id).single()
        const { data: lastMsg } = await supabase.from('group_messages').select('text_content, created_at').eq('group_id', gm.group_id).order('created_at', { ascending: false }).limit(1).single()
        if (group) {
          items.push({
            id: `group-${group.id}`, otherUserId: '', otherName: group.name,
            status: 'friend', lastMsg: lastMsg?.text_content || '', lastTime: lastMsg?.created_at || group.created_at,
            isGroup: true, groupName: group.name,
          })
        }
      }
    }

    items.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())
    set({ conversations: items, conversationsLoaded: true })
  },

  loadMessages: async (convId, isGroup = false) => {
    if (get().messages[convId]) return
    const table = isGroup ? 'group_messages' : 'messages'
    const column = isGroup ? 'group_id' : 'conversation_id'
    const realId = isGroup ? convId.replace('group-', '') : convId

    const { data } = await supabase.from(table).select('*')
      .eq(column, realId).order('created_at', { ascending: false }).limit(PAGE_SIZE)

    const msgs = (data || []).reverse() as Message[]
    set(s => ({
      messages: { ...s.messages, [convId]: msgs },
      messagesFullyLoaded: { ...s.messagesFullyLoaded, [convId]: (data?.length || 0) < PAGE_SIZE },
    }))
  },

  loadMoreMessages: async (convId, isGroup = false) => {
    if (get().messagesFullyLoaded[convId]) return
    const existing = get().messages[convId] || []
    if (existing.length === 0) return

    const table = isGroup ? 'group_messages' : 'messages'
    const column = isGroup ? 'group_id' : 'conversation_id'
    const realId = isGroup ? convId.replace('group-', '') : convId
    const oldest = existing[0].created_at

    const { data } = await supabase.from(table).select('*')
      .eq(column, realId).lt('created_at', oldest).order('created_at', { ascending: false }).limit(PAGE_SIZE)

    const older = (data || []).reverse() as Message[]
    set(s => ({
      messages: { ...s.messages, [convId]: [...older, ...existing] },
      messagesFullyLoaded: { ...s.messagesFullyLoaded, [convId]: (data?.length || 0) < PAGE_SIZE },
    }))
  },

  sendMessage: async (convId, userId, text, isGroup = false) => {
    const table = isGroup ? 'group_messages' : 'messages'
    const column = isGroup ? 'group_id' : 'conversation_id'
    const realId = isGroup ? convId.replace('group-', '') : convId

    const { data, error } = await supabase.from(table).insert({
      sender_id: userId, content_type: 'text', text_content: text, [column]: realId,
    }).select().single()

    if (!error && data) {
      const msg = data as Message
      set(s => ({
        messages: { ...s.messages, [convId]: [...(s.messages[convId] || []), msg] },
        conversations: s.conversations.map(c => c.id === convId ? { ...c, lastMsg: text, lastTime: msg.created_at } : c),
      }))
      await supabase.from(isGroup ? 'groups' : 'conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', realId)
    }
  },

  addIncomingMessage: (convId, msg) => {
    set(s => {
      const existing = s.messages[convId] || []
      if (existing.some(m => m.id === msg.id)) return s
      return {
        messages: { ...s.messages, [convId]: [...existing, msg] },
        conversations: s.conversations.map(c =>
          c.id === convId ? { ...c, lastMsg: msg.text_content || '', lastTime: msg.created_at } : c
        ),
      }
    })
  },

  updateConversationStatus: (convId, status) => {
    set(s => ({
      conversations: s.conversations.map(c => c.id === convId ? { ...c, status } : c),
    }))
  },

  getStrangerSentCount: (convId, userId) => {
    const msgs = get().messages[convId] || []
    return msgs.filter(m => m.sender_id === userId).length
  },

  reset: () => set({ conversations: [], conversationsLoaded: false, messages: {}, messagesFullyLoaded: {} }),
}))
