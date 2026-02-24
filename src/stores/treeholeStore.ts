import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { TreeholePost } from '../types/database'

interface PostItem extends TreeholePost {
  author_name: string
  comment_count: number
}

interface TreeholeState {
  posts: PostItem[]
  loaded: boolean
  loadPosts: () => Promise<void>
  addPost: (userId: string, text: string) => Promise<void>
  refreshPosts: () => Promise<void>
  reset: () => void
}

export const useTreeholeStore = create<TreeholeState>((set, get) => ({
  posts: [],
  loaded: false,

  loadPosts: async () => {
    if (get().loaded) return
    await get().refreshPosts()
  },

  refreshPosts: async () => {
    const { data } = await supabase.from('treehole_posts').select('*')
      .order('created_at', { ascending: false }).limit(30)
    if (data) {
      const enriched: PostItem[] = await Promise.all(data.map(async (post) => {
        const { data: p } = await supabase.from('profiles').select('nickname').eq('id', post.user_id).single()
        const { count } = await supabase.from('treehole_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
        return { ...post, author_name: p?.nickname || '匿名', comment_count: count || 0 }
      }))
      set({ posts: enriched, loaded: true })
    }
  },

  addPost: async (userId, text) => {
    const { data, error } = await supabase.from('treehole_posts')
      .insert({ user_id: userId, text_content: text }).select().single()
    if (!error && data) {
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', userId).single()
      set(s => ({ posts: [{ ...data, author_name: p?.nickname || '我', comment_count: 0 }, ...s.posts] }))
    }
  },

  reset: () => set({ posts: [], loaded: false }),
}))
