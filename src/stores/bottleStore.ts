import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Bottle, BottleReply } from '../types/database'

interface BottleWithReplies extends Bottle {
  replies: (BottleReply & { author_name: string })[]
  creator_name: string
}

interface BottleState {
  myBottles: Bottle[]
  todayThrows: number
  todayCatches: number
  loaded: boolean

  loadMyBottles: (userId: string) => Promise<void>
  loadDailyLimits: (userId: string) => Promise<void>
  throwBottle: (userId: string, content: string, isVip: boolean) => Promise<{ error?: string }>
  catchBottle: (userId: string, isVip: boolean) => Promise<{ bottle?: BottleWithReplies; error?: string }>
  replyToBottle: (bottleId: string, userId: string, content: string, pickNumber: number) => Promise<void>
  getBottleDetail: (bottle: Bottle) => Promise<BottleWithReplies>
  reset: () => void
}

export const useBottleStore = create<BottleState>((set, get) => ({
  myBottles: [],
  todayThrows: 0,
  todayCatches: 0,
  loaded: false,

  loadMyBottles: async (userId) => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('bottles').select('*').eq('creator_id', userId).gte('created_at', threeDaysAgo).order('created_at', { ascending: false })
    if (data) set({ myBottles: data, loaded: true })
  },

  loadDailyLimits: async (userId) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('bottle_daily_limits').select('*').eq('user_id', userId).eq('date', today).single()
    if (data) set({ todayThrows: data.throws, todayCatches: data.catches })
    else set({ todayThrows: 0, todayCatches: 0 })
  },

  throwBottle: async (userId, content, isVip) => {
    // !!! 上线前改回 3
    if (!isVip && get().todayThrows >= 50) return { error: '今天已扔满，开通VIP可无限' }
    await supabase.from('bottles').insert({ creator_id: userId, content })
    await updateLimit(userId, 'throws')
    set(s => ({ todayThrows: s.todayThrows + 1 }))
    await get().loadMyBottles(userId)
    return {}
  },

  catchBottle: async (userId, isVip) => {
    // !!! 上线前改回 3
    if (!isVip && get().todayCatches >= 50) return { error: '今天已捞满，开通VIP可无限' }
    const { data: bottles } = await supabase.from('bottles').select('*').eq('status', 'floating').neq('creator_id', userId).lt('pick_count', 10)
    if (!bottles || bottles.length === 0) return { error: '大海空空的，没有捞到瓶子~' }

    const bottle = bottles[Math.floor(Math.random() * bottles.length)]
    await supabase.from('bottles').update({ pick_count: bottle.pick_count + 1 }).eq('id', bottle.id)
    if (bottle.pick_count + 1 >= bottle.max_picks) {
      await supabase.from('bottles').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', bottle.id)
    }
    await updateLimit(userId, 'catches')
    set(s => ({ todayCatches: s.todayCatches + 1 }))

    const enriched = await get().getBottleDetail(bottle)
    return { bottle: enriched }
  },

  replyToBottle: async (bottleId, userId, content, pickNumber) => {
    if (content.trim()) {
      await supabase.from('bottle_replies').insert({ bottle_id: bottleId, user_id: userId, content: content.trim(), pick_number: pickNumber })
    }
  },

  getBottleDetail: async (bottle) => {
    const { data: replies } = await supabase.from('bottle_replies').select('*').eq('bottle_id', bottle.id).order('created_at', { ascending: true })
    const { data: creator } = await supabase.from('profiles').select('nickname').eq('id', bottle.creator_id).single()
    const enrichedReplies = replies ? await Promise.all(replies.map(async r => {
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', r.user_id).single()
      return { ...r, author_name: p?.nickname || '匿名' }
    })) : []
    return { ...bottle, replies: enrichedReplies, creator_name: creator?.nickname || '匿名' }
  },

  reset: () => set({ myBottles: [], todayThrows: 0, todayCatches: 0, loaded: false }),
}))

async function updateLimit(userId: string, field: 'throws' | 'catches') {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase.from('bottle_daily_limits').select('*').eq('user_id', userId).eq('date', today).single()
  if (data) await supabase.from('bottle_daily_limits').update({ [field]: data[field] + 1 }).eq('user_id', userId).eq('date', today)
  else await supabase.from('bottle_daily_limits').insert({ user_id: userId, date: today, [field]: 1 })
}
