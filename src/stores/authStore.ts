import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import type { User } from '@supabase/supabase-js'

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'
const DEV_EMAIL = 'admin@shudong.test'
const DEV_PASSWORD = 'shudong123'

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
      // 先尝试登录测试账号
      let { error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      })

      // 如果登录失败（账号不存在），就自动注册
      if (error) {
        console.log('开发模式：测试账号不存在，正在自动注册...')
        const { error: regError } = await supabase.auth.signUp({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        })
        if (!regError) {
          // 注册成功，再次登录
          await supabase.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
          })
          // 设置管理员资料
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            await supabase.from('profiles').update({
              nickname: '开发者',
              role: 'admin',
              is_vip: true,
              vip_expires_at: '2099-12-31T00:00:00Z',
              gender: 'male',
              age: 28,
              province: '北京',
              city: '北京',
              district: '朝阳',
              is_online: true,
            }).eq('id', session.user.id)
          }
        } else {
          console.error('开发模式注册也失败了:', regError.message)
        }
      }
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
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) return { error: error.message }
    return { error: null }
  },

  register: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signUp({ email, password })
    set({ loading: false })
    if (error) return { error: error.message }
    return { error: null }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  fetchProfile: async () => {
    const user = get().user
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      if (DEV_MODE && (!data.is_vip || data.role !== 'admin')) {
        await supabase.from('profiles').update({
          is_vip: true, role: 'admin', vip_expires_at: '2099-12-31T00:00:00Z',
          nickname: data.nickname || '开发者', is_online: true,
        }).eq('id', user.id)
        data.is_vip = true
        data.role = 'admin'
        data.vip_expires_at = '2099-12-31T00:00:00Z'
        if (!data.nickname) data.nickname = '开发者'
      }
      set({ profile: data as Profile })
    }
  },

  updateProfile: async (data) => {
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
