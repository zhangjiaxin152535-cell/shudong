import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Search } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { getOrCreateConversation } from '../lib/chat'
import PageHeader from '../components/common/PageHeader'
import BottleModal from './BottleModal'
import type { Profile, TreeholePost } from '../types/database'

type RightPanel = 'chatlist' | 'search' | 'treehole'
interface ChatItem { id: string; name: string; isGroup: boolean; lastMsg: string; time: string; otherUserId?: string }

export default function RealPersonPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const [rightPanel, setRightPanel] = useState<RightPanel>('chatlist')
  const [searchGender, setSearchGender] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [searchProvince, setSearchProvince] = useState('')
  const [emailSearch, setEmailSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [bottleOpen, setBottleOpen] = useState(false)

  const handleSearch = async () => {
    if (!user) return
    let query = supabase.from('profiles').select('*').neq('id', user.id)
    if (searchGender) query = query.eq('gender', searchGender)
    if (ageMin) query = query.gte('age', parseInt(ageMin))
    if (ageMax) query = query.lte('age', parseInt(ageMax))
    if (searchProvince) query = query.ilike('province', `%${searchProvince}%`)
    const { data } = await query.limit(20)
    if (data) setSearchResults(data as Profile[])
    setRightPanel('search')
  }

  return (
    <div className="page">
      <PageHeader title="交友区" backTo="/"
        right={<div className="flex gap-2">
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/create-group')}>创建群聊</button>
          <button className="btn btn-sm btn-yellow" onClick={() => navigate('/vip')}><Crown size={14} /> 会员充值</button>
        </div>}
      />

      <div className="two-column">
        {/* 左栏 */}
        <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 className="text-sm text-bold mb-2">按条件搜索</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">性别</label>
                <select className="select input-sm" value={searchGender} onChange={e => setSearchGender(e.target.value)}>
                  <option value="">不限</option><option value="male">男</option><option value="female">女</option>
                </select>
              </div>
              {/* !!! 上线前改回: 加 disabled 和 opacity 限制非VIP */}
              <div><label className="label">年龄</label>
                <div className="flex gap-2 items-center"><input className="input input-sm" type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} placeholder="最小" /><span className="text-gray">~</span><input className="input input-sm" type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} placeholder="最大" /></div>
              </div>
              {/* !!! 上线前改回: 加 disabled 和 opacity 限制非VIP */}
              <div><label className="label">地区</label><input className="input input-sm" value={searchProvince} onChange={e => setSearchProvince(e.target.value)} placeholder="省/市/区" /></div>
              <button className="btn btn-primary btn-full btn-sm" onClick={handleSearch}><Search size={14} /> 搜索</button>
            </div>
          </div>

          <div className="divider"><label className="label">邮箱搜索（免费）</label>
            <div className="flex gap-2"><input className="input input-sm flex-1" value={emailSearch} onChange={e => setEmailSearch(e.target.value)} placeholder="输入邮箱" /><button className="btn btn-ghost btn-sm"><Search size={14} /></button></div>
          </div>

          <div className="divider"><button className="btn btn-gradient-ocean btn-full" onClick={() => setBottleOpen(true)}>🍶 漂流瓶</button></div>

          <div>
            <button className={`btn btn-full ${rightPanel === 'treehole' ? 'btn-green-fill' : 'btn-green-outline'}`}
              onClick={() => setRightPanel(rightPanel === 'treehole' ? 'chatlist' : 'treehole')}>
              🌲 树洞 {rightPanel === 'treehole' && '(当前选中)'}
            </button>
          </div>
        </aside>

        {/* 右栏 */}
        <main className="main-content p-4">
          {rightPanel === 'chatlist' && <ChatListPanel />}
          {rightPanel === 'search' && <SearchResultsPanel results={searchResults} />}
          {rightPanel === 'treehole' && <TreeHolePanel />}
        </main>

        <BottleModal open={bottleOpen} onClose={() => setBottleOpen(false)} />
      </div>
    </div>
  )
}

function ChatListPanel() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadChats() }, [user])

  const loadChats = async () => {
    if (!user) { setLoading(false); return }
    try {
      const items: ChatItem[] = []
      const { data: convos, error: convErr } = await supabase.from('conversations').select('*').or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`).order('updated_at', { ascending: false })
      if (!convErr && convos) {
        for (const c of convos) {
          const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id
          const { data: p } = await supabase.from('profiles').select('nickname').eq('id', otherId).single()
          const { data: lastMsg } = await supabase.from('messages').select('text_content, created_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).single()
          items.push({ id: c.id, name: p?.nickname || '未知用户', isGroup: false, lastMsg: lastMsg?.text_content || '', time: lastMsg ? formatTime(lastMsg.created_at) : '', otherUserId: otherId })
        }
      }
      const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
      if (myGroups) {
        for (const gm of myGroups) {
          const { data: group } = await supabase.from('groups').select('*').eq('id', gm.group_id).single()
          const { data: lastMsg } = await supabase.from('group_messages').select('text_content, created_at').eq('group_id', gm.group_id).order('created_at', { ascending: false }).limit(1).single()
          if (group) items.push({ id: `group-${group.id}`, name: group.name, isGroup: true, lastMsg: lastMsg?.text_content || '', time: lastMsg ? formatTime(lastMsg.created_at) : '' })
        }
      }
      setChats(items)
    } catch (e) { console.error('加载聊天列表出错:', e) }
    setLoading(false)
  }

  if (loading) return <div className="empty-state">加载中...</div>
  if (chats.length === 0) return <div className="empty-state">还没有对话，去搜索一下吧</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {chats.map(chat => (
        <div key={chat.id} className="chat-item" onClick={() => navigate(`/chat/${chat.id}`)}>
          <div className="avatar avatar-lg">{chat.isGroup ? '👥' : '👤'}</div>
          <div className="chat-item-info">
            <div className="chat-item-top"><span className="chat-item-name">{chat.name}</span><span className="chat-item-time">{chat.time}</span></div>
            <div className="chat-item-msg">{chat.lastMsg}</div>
          </div>
          {!chat.isGroup && <button className="btn btn-sm text-red" onClick={e => e.stopPropagation()}>删除</button>}
        </div>
      ))}
    </div>
  )
}

function SearchResultsPanel({ results }: { results: Profile[] }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const handleSayHi = async (targetId: string) => {
    if (!user) return
    const convId = await getOrCreateConversation(user.id, targetId)
    if (convId) navigate(`/chat/${convId}`)
  }

  if (results.length === 0) return <div className="empty-state">没有找到匹配的用户</div>

  return (
    <div>
      <h3 className="text-sm text-bold mb-3">搜索结果（{results.length}人）</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map(u => (
          <div key={u.id} className="user-item">
            <div className="avatar avatar-lg">{u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}</div>
            <div className="flex-1"><span className="text-medium text-sm">{u.nickname || '未设置昵称'}</span>{u.age && <span className="text-xs text-gray ml-2">{u.age}岁</span>}{u.province && <span className="text-xs text-gray ml-2">{u.province}</span>}</div>
            <button className="btn btn-sm btn-round" style={{ background: '#eff6ff', color: '#2563eb' }} onClick={() => handleSayHi(u.id)}>打招呼</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TreeHolePanel() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<(TreeholePost & { author_name: string; comment_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => { loadPosts() }, [])

  const loadPosts = async () => {
    const { data } = await supabase.from('treehole_posts').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) {
      const enriched = await Promise.all(data.map(async (post) => {
        const { data: p } = await supabase.from('profiles').select('nickname').eq('id', post.user_id).single()
        const { count } = await supabase.from('treehole_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
        return { ...post, author_name: p?.nickname || '匿名', comment_count: count || 0 }
      }))
      setPosts(enriched)
    }
    setLoading(false)
  }

  const handlePost = async () => {
    if (!newPostContent.trim() || !user) return
    setPosting(true)
    await supabase.from('treehole_posts').insert({ user_id: user.id, text_content: newPostContent.trim() })
    setNewPostContent(''); setShowPostForm(false); setPosting(false)
    loadPosts()
  }

  if (loading) return <div className="empty-state">加载中...</div>

  return (
    <div>
      <div className="flex-between mb-3">
        <h3 className="text-sm text-bold">🌲 树洞</h3>
        <button className="btn btn-sm btn-success btn-round" onClick={() => setShowPostForm(!showPostForm)}>+ 发帖</button>
      </div>

      {showPostForm && (
        <div className="card mb-3">
          <textarea className="textarea" value={newPostContent} onChange={e => setNewPostContent(e.target.value)} placeholder="写下你的心声..." rows={3} />
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn btn-sm btn-ghost" onClick={() => setShowPostForm(false)}>取消</button>
            <button className="btn btn-sm btn-success" onClick={handlePost} disabled={!newPostContent.trim() || posting}>{posting ? '发布中...' : '发布'}</button>
          </div>
        </div>
      )}

      {posts.length === 0 ? <div className="empty-state">还没有树洞内容，发第一条吧</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-author"><div className="avatar avatar-md">👤</div><span className="text-sm text-medium">{post.author_name}</span><span className="text-xs text-gray">{formatTime(post.created_at)}</span></div>
              <div className="post-content">{post.text_content}</div>
              <div className="post-actions">
                <button className="btn btn-sm btn-ghost text-blue" onClick={() => navigate(`/treehole/${post.id}`)}>💬 评论({post.comment_count})</button>
                <button className="btn btn-sm btn-ghost text-red">举报</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
