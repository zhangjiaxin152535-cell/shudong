import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import PageHeader from '../components/common/PageHeader'
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
    await supabase.from('treehole_comments').insert({ post_id: postId, user_id: user.id, content: input.trim() })
    setInput(''); loadData()
  }

  if (loading) return <div className="page"><div className="flex-center page-scroll text-gray">加载中...</div></div>
  if (!post) return <div className="page"><div className="flex-center page-scroll text-gray">帖子不存在</div></div>

  return (
    <div className="page">
      <PageHeader title="树洞评论" />

      <div className="page-scroll p-4">
        <div className="container-lg">
          <div className="post-card mb-4">
            <div className="post-author"><div className="avatar avatar-md">👤</div><span className="text-sm text-medium">{post.author_name}</span><span className="text-xs text-gray">{formatTime(post.created_at)}</span></div>
            <div className="post-content">{post.text_content}</div>
          </div>

          <h3 className="text-sm text-bold mb-3">全部评论（{comments.length}）</h3>
          {comments.length === 0 ? <div className="empty-state">还没有评论，说点什么吧</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {comments.map(c => (
                <div key={c.id} className="flex gap-3" style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
                  <div className="avatar avatar-md shrink-0">👤</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="text-sm text-medium">{c.author_name}</span><span className="text-xs text-gray">{formatTime(c.created_at)}</span></div>
                    <p className="text-sm mt-1">{c.content}</p>
                  </div>
                  <button className="btn btn-sm btn-ghost text-red shrink-0">举报</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-footer">
        <div className="container-lg flex gap-2 px-4 py-3">
          <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleComment() }} placeholder="输入评论..." />
          <button className="btn btn-success" onClick={handleComment} disabled={!input.trim()}><Send size={16} /></button>
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime(), min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'; if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60); if (h < 24) return `${h}小时前`
  return d.toLocaleDateString('zh-CN')
}
