import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, Search, Mail } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { getOrCreateConversation } from '../lib/chat'
import BottleModal from './BottleModal'
import type { Profile, TreeholePost } from '../types/database'

type RightPanel = 'chatlist' | 'search' | 'treehole'

interface ChatItem {
  id: string
  name: string
  isGroup: boolean
  lastMsg: string
  time: string
  otherUserId?: string
}

export default function RealPersonPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const isVip = profile?.is_vip ?? false

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
    if (isVip && ageMin) query = query.gte('age', parseInt(ageMin))
    if (isVip && ageMax) query = query.lte('age', parseInt(ageMax))
    if (isVip && searchProvince) query = query.ilike('province', `%${searchProvince}%`)

    const { data } = await query.limit(20)
    if (data) setSearchResults(data as Profile[])
    setRightPanel('search')
  }

  const handleEmailSearch = async () => {
    // TODO: 邮箱搜索需要后端函数（Supabase Edge Function），暂不可用
    if (!emailSearch.trim()) return
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-red-500">交友区</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/create-group')} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            创建群聊
          </button>
          <button onClick={() => navigate('/vip')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
            <Crown size={14} />
            会员充值
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左栏 */}
        <aside className="w-64 bg-white border-r flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">按条件搜索</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">性别</label>
                  <select value={searchGender} onChange={e => setSearchGender(e.target.value)} className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white">
                    <option value="">不限</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>

                <div className={!isVip ? 'opacity-50' : ''}>
                  <label className="text-xs text-gray-500">年龄 {!isVip && '🔒'}</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} disabled={!isVip} placeholder="最小" min="1" max="150" className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                    <span className="text-gray-400 text-xs">~</span>
                    <input type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} disabled={!isVip} placeholder="最大" min="1" max="150" className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                  </div>
                </div>

                <div className={!isVip ? 'opacity-50' : ''}>
                  <label className="text-xs text-gray-500">地区 {!isVip && '🔒'}</label>
                  <input value={searchProvince} onChange={e => setSearchProvince(e.target.value)} disabled={!isVip} placeholder="省/市/区" className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg" />
                </div>

                <button onClick={handleSearch} className="w-full flex items-center justify-center gap-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                  <Search size={14} /> 搜索
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="text-xs text-gray-500">邮箱搜索（免费）</label>
              <div className="flex gap-1 mt-1">
                <input value={emailSearch} onChange={e => setEmailSearch(e.target.value)} placeholder="输入邮箱" className="flex-1 px-2 py-1.5 text-sm border rounded-lg" />
                <button className="px-2 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><Search size={14} /></button>
              </div>
            </div>

            <div className="border-t pt-4">
              <button onClick={() => setBottleOpen(true)} className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                🍶 漂流瓶
              </button>
            </div>

            <div>
              <button
                onClick={() => setRightPanel(rightPanel === 'treehole' ? 'chatlist' : 'treehole')}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${rightPanel === 'treehole' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
              >
                🌲 树洞 {rightPanel === 'treehole' && '(当前选中)'}
              </button>
            </div>
          </div>
        </aside>

        {/* 右栏 */}
        <main className="flex-1 overflow-y-auto">
          {rightPanel === 'chatlist' && <ChatListPanel />}
          {rightPanel === 'search' && <SearchResultsPanel results={searchResults} />}
          {rightPanel === 'treehole' && <TreeHolePanel />}
        <BottleModal open={bottleOpen} onClose={() => setBottleOpen(false)} />
        </main>
      </div>
    </div>
  )
}

/* ── 聊天列表：从数据库读 ── */
function ChatListPanel() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadChats()
  }, [user])

  const loadChats = async () => {
    if (!user) { setLoading(false); return }
    try {
      const items: ChatItem[] = []

      const { data: convos, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (!convErr && convos) {
        for (const c of convos) {
          const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id
          const { data: otherProfile } = await supabase.from('profiles').select('nickname').eq('id', otherId).single()
          const { data: lastMsg } = await supabase.from('messages').select('text_content, created_at').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).single()

          items.push({
            id: c.id,
            name: otherProfile?.nickname || '未知用户',
            isGroup: false,
            lastMsg: lastMsg?.text_content || '',
            time: lastMsg ? formatTime(lastMsg.created_at) : '',
            otherUserId: otherId,
          })
        }
      }

      const { data: myGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (myGroups) {
        for (const gm of myGroups) {
          const { data: group } = await supabase.from('groups').select('*').eq('id', gm.group_id).single()
          const { data: lastMsg } = await supabase.from('group_messages').select('text_content, created_at').eq('group_id', gm.group_id).order('created_at', { ascending: false }).limit(1).single()
          if (group) {
            items.push({ id: `group-${group.id}`, name: group.name, isGroup: true, lastMsg: lastMsg?.text_content || '', time: lastMsg ? formatTime(lastMsg.created_at) : '' })
          }
        }
      }

      setChats(items)
    } catch (e) {
      console.error('加载聊天列表出错:', e)
    }
    setLoading(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>
  if (chats.length === 0) return <div className="p-8 text-center text-gray-400">还没有对话，去搜索一下吧</div>

  return (
    <div className="p-4 space-y-2">
      {chats.map(chat => (
        <div
          key={chat.id}
          onClick={() => navigate(`/chat/${chat.id}`)}
          className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-blue-200 cursor-pointer transition-colors"
        >
          <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0 flex items-center justify-center text-lg">
            {chat.isGroup ? '👥' : '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">{chat.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{chat.time}</span>
            </div>
            <p className="text-xs text-gray-500 truncate">{chat.lastMsg}</p>
          </div>
          {!chat.isGroup && (
            <button onClick={e => { e.stopPropagation() }} className="text-xs text-red-400 hover:text-red-600 shrink-0">
              删除
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── 搜索结果：从数据库读 ── */
function SearchResultsPanel({ results }: { results: Profile[] }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleSayHi = async (targetId: string) => {
    if (!user) return
    const convId = await getOrCreateConversation(user.id, targetId)
    if (convId) navigate(`/chat/${convId}`)
  }

  if (results.length === 0) return <div className="p-8 text-center text-gray-400">没有找到匹配的用户</div>

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">搜索结果（{results.length}人）</h3>
      <div className="space-y-2">
        {results.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-blue-200 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0 flex items-center justify-center">
              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" /> : '👤'}
            </div>
            <div className="flex-1">
              <span className="font-medium text-sm">{u.nickname || '未设置昵称'}</span>
              {u.age && <span className="text-xs text-gray-400 ml-2">{u.age}岁</span>}
              {u.province && <span className="text-xs text-gray-400 ml-2">{u.province}</span>}
            </div>
            <button onClick={() => handleSayHi(u.id)} className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
              打招呼
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 树洞：从数据库读 ── */
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
        const { data: authorProfile } = await supabase.from('profiles').select('nickname').eq('id', post.user_id).single()
        const { count } = await supabase.from('treehole_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
        return { ...post, author_name: authorProfile?.nickname || '匿名', comment_count: count || 0 }
      }))
      setPosts(enriched)
    }
    setLoading(false)
  }

  const handlePost = async () => {
    if (!newPostContent.trim() || !user) return
    setPosting(true)
    await supabase.from('treehole_posts').insert({ user_id: user.id, text_content: newPostContent.trim() })
    setNewPostContent('')
    setShowPostForm(false)
    setPosting(false)
    loadPosts()
  }

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">🌲 树洞</h3>
        <button onClick={() => setShowPostForm(!showPostForm)} className="px-3 py-1 text-sm bg-green-500 text-white rounded-full hover:bg-green-600">+ 发帖</button>
      </div>

      {showPostForm && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
            placeholder="写下你的心声..." rows={3}
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-400 outline-none text-sm" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowPostForm(false)} className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
            <button onClick={handlePost} disabled={!newPostContent.trim() || posting} className="px-4 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-30">
              {posting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="p-8 text-center text-gray-400">还没有树洞内容，发第一条吧</div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">👤</div>
                <span className="text-sm font-medium">{post.author_name}</span>
                <span className="text-xs text-gray-400">{formatTime(post.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{post.text_content}</p>
              <div className="flex items-center justify-between">
                <button onClick={() => navigate(`/treehole/${post.id}`)} className="text-xs text-blue-500 hover:text-blue-700">💬 评论({post.comment_count})</button>
                <button className="text-xs text-red-400 hover:text-red-600">举报</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}
