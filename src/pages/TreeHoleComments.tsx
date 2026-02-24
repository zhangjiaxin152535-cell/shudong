import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { TreeholePost, TreeholeComment } from '../types/database'

export default function TreeHoleComments() {
  const navigate = useNavigate()
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuthStore()

  const [post, setPost] = useState<TreeholePost & { author_name: string } | null>(null)
  const [comments, setComments] = useState<(TreeholeComment & { author_name: string })[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [postId])

  const loadData = async () => {
    if (!postId) return

    const { data: p } = await supabase.from('treehole_posts').select('*').eq('id', postId).single()
    if (p) {
      const { data: author } = await supabase.from('profiles').select('nickname').eq('id', p.user_id).single()
      setPost({ ...p, author_name: author?.nickname || '匿名' })
    }

    const { data: cmts } = await supabase.from('treehole_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
    if (cmts) {
      const enriched = await Promise.all(cmts.map(async c => {
        const { data: prof } = await supabase.from('profiles').select('nickname').eq('id', c.user_id).single()
        return { ...c, author_name: prof?.nickname || '匿名' }
      }))
      setComments(enriched)
    }
    setLoading(false)
  }

  const handleComment = async () => {
    if (!input.trim() || !user || !postId) return
    const { error } = await supabase.from('treehole_comments').insert({
      post_id: postId, user_id: user.id, content: input.trim(),
    })
    if (!error) {
      setInput('')
      loadData()
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>
  if (!post) return <div className="min-h-screen flex items-center justify-center text-gray-400">帖子不存在</div>

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-semibold">树洞评论</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">👤</div>
              <span className="text-sm font-medium">{post.author_name}</span>
              <span className="text-xs text-gray-400">{formatTime(post.created_at)}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.text_content}</p>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-3">全部评论（{comments.length}）</h3>

          {comments.length === 0 ? (
            <p className="text-center text-gray-400 py-4">还没有评论，说点什么吧</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0 flex items-center justify-center text-sm">👤</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author_name}</span>
                      <span className="text-xs text-gray-400">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                  </div>
                  <button className="text-xs text-red-400 hover:text-red-600 shrink-0 self-start">举报</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleComment() }}
            placeholder="输入评论..." className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          <button onClick={handleComment} disabled={!input.trim()} className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-30 transition-colors">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime(), min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}小时前`
  return d.toLocaleDateString('zh-CN')
}
