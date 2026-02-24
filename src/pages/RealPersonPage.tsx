import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Crown, Search } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import { useTreeholeStore } from '../stores/treeholeStore'
import { supabase } from '../lib/supabase'
import { getOrCreateConversation } from '../lib/chat'
import PageHeader from '../components/common/PageHeader'
import BottleModal from './BottleModal'
import type { Profile } from '../types/database'

type RightPanel = 'chatlist' | 'search' | 'treehole'

export default function RealPersonPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'treehole' ? 'treehole' as RightPanel : 'chatlist' as RightPanel
  const [rightPanel, setRightPanel] = useState<RightPanel>(initialTab)
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
        <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 className="text-sm text-bold mb-2">按条件搜索</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">性别</label>
                <select className="select input-sm" value={searchGender} onChange={e => setSearchGender(e.target.value)}>
                  <option value="">不限</option><option value="male">男</option><option value="female">女</option>
                </select></div>
              {/* !!! 上线前改回: 加 disabled 和 opacity 限制非VIP */}
              <div><label className="label">年龄</label>
                <div className="flex gap-2 items-center"><input className="input input-sm" type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} placeholder="最小" /><span className="text-gray">~</span><input className="input input-sm" type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} placeholder="最大" /></div></div>
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
  const { conversations, conversationsLoaded } = useChatStore()

  if (!conversationsLoaded) return <div className="empty-state">加载中...</div>
  if (conversations.length === 0) return <div className="empty-state">还没有对话，去搜索一下吧</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {conversations.map(chat => (
        <div key={chat.id} className="chat-item" onClick={() => navigate(`/chat/${chat.id}`)}>
          <div className="avatar avatar-lg">{chat.isGroup ? '👥' : '👤'}</div>
          <div className="chat-item-info">
            <div className="chat-item-top"><span className="chat-item-name">{chat.otherName}</span><span className="chat-item-time">{formatTime(chat.lastTime)}</span></div>
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
            <div className="avatar avatar-lg">👤</div>
            <div className="flex-1"><span className="text-medium text-sm">{u.nickname || '未设置'}</span>{u.age && <span className="text-xs text-gray ml-2">{u.age}岁</span>}{u.province && <span className="text-xs text-gray ml-2">{u.province}</span>}</div>
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
  const { posts, loaded, loadPosts, addPost } = useTreeholeStore()
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  if (!loaded) { loadPosts(); return <div className="empty-state">加载中...</div> }

  const handlePost = async () => {
    if (!content.trim() || !user) return
    setPosting(true)
    await addPost(user.id, content.trim())
    setContent(''); setShowForm(false); setPosting(false)
  }

  return (
    <div>
      <div className="flex-between mb-3">
        <h3 className="text-sm text-bold">🌲 树洞</h3>
        <button className="btn btn-sm btn-success btn-round" onClick={() => setShowForm(!showForm)}>+ 发帖</button>
      </div>
      {showForm && (
        <div className="card mb-3">
          <textarea className="textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="写下你的心声..." rows={3} />
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(false)}>取消</button>
            <button className="btn btn-sm btn-success" onClick={handlePost} disabled={!content.trim() || posting}>{posting ? '发布中...' : '发布'}</button>
          </div>
        </div>
      )}
      {posts.length === 0 ? <div className="empty-state">还没有树洞内容</div> : (
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
  if (min < 1) return '刚刚'; if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60); if (h < 24) return `${h}小时前`
  return d.toLocaleDateString('zh-CN')
}
