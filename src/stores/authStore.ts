import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import type { User } from '@supabase/supabase-js'

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

const MOCK_PROFILE: Profile = {
  id: 'dev-user-001',
  nickname: '开发者',
  avatar_url: null,
  gender: 'male',
  age: 25,
  province: '北京',
  city: '北京',
  district: '朝阳',
  is_vip: true,
  vip_expires_at: '2099-12-31T00:00:00Z',
  role: 'admin',
  is_online: true,
  last_seen: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  devMode: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ error: string | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  devMode: DEV_MODE,

  initialize: async () => {
    if (DEV_MODE) {
      set({
        user: { id: 'dev-user-001', email: 'dev@test.com' } as User,
        profile: MOCK_PROFILE,
        initialized: true,
      })
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile()
    }
    set({ initialized: true })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile()
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  login: async (email, password) => {
    if (DEV_MODE) return { error: null }
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) return { error: error.message }
    return { error: null }
  },

  register: async (email, password) => {
    if (DEV_MODE) return { error: null }
    set({ loading: true })
    const { error } = await supabase.auth.signUp({ email, password })
    set({ loading: false })
    if (error) return { error: error.message }
    return { error: null }
  },

  logout: async () => {
    if (!DEV_MODE) await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  fetchProfile: async () => {
    if (DEV_MODE) { set({ profile: MOCK_PROFILE }); return }
    const user = get().user
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) set({ profile: data as Profile })
  },

  updateProfile: async (data) => {
    if (DEV_MODE) {
      set({ profile: { ...MOCK_PROFILE, ...data } })
      return { error: null }
    }
    const user = get().user
    if (!user) return { error: '未登录' }
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) return { error: error.message }
    await get().fetchProfile()
    return { error: null }
  },
}))
