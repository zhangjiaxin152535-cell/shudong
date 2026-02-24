import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, Search, Mail } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

type RightPanel = 'chatlist' | 'search' | 'treehole'

export default function RealPersonPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const isVip = profile?.is_vip ?? false

  const [rightPanel, setRightPanel] = useState<RightPanel>('chatlist')
  const [searchGender, setSearchGender] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [searchProvince, setSearchProvince] = useState('')
  const [emailSearch, setEmailSearch] = useState('')

  const handleSearch = () => {
    setRightPanel('search')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部栏 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-red-500">交友区</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/create-group')}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            创建群聊
          </button>
          <button
            onClick={() => navigate('/vip')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <Crown size={14} />
            会员充值
          </button>
        </div>
      </header>

      {/* 主体：左栏 + 右栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== 左栏 ===== */}
        <aside className="w-64 bg-white border-r flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 space-y-4">
            {/* 按条件搜索 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">按条件搜索</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">性别</label>
                  <select
                    value={searchGender}
                    onChange={e => setSearchGender(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-white"
                  >
                    <option value="">不限</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>

                <div className={!isVip ? 'opacity-50' : ''}>
                  <label className="text-xs text-gray-500">
                    年龄 {!isVip && '🔒'}
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={ageMin}
                      onChange={e => setAgeMin(e.target.value)}
                      disabled={!isVip}
                      placeholder="最小"
                      min="1"
                      max="150"
                      className="w-full px-2 py-1.5 text-sm border rounded-lg"
                    />
                    <span className="text-gray-400 text-xs">~</span>
                    <input
                      type="number"
                      value={ageMax}
                      onChange={e => setAgeMax(e.target.value)}
                      disabled={!isVip}
                      placeholder="最大"
                      min="1"
                      max="150"
                      className="w-full px-2 py-1.5 text-sm border rounded-lg"
                    />
                  </div>
                </div>

                <div className={!isVip ? 'opacity-50' : ''}>
                  <label className="text-xs text-gray-500">
                    地区 {!isVip && '🔒'}
                  </label>
                  <input
                    value={searchProvince}
                    onChange={e => setSearchProvince(e.target.value)}
                    disabled={!isVip}
                    placeholder="省/市/区"
                    className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleSearch}
                  className="w-full flex items-center justify-center gap-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Search size={14} />
                  搜索
                </button>
              </div>
            </div>

            {/* 邮箱搜索 */}
            <div className="border-t pt-4">
              <label className="text-xs text-gray-500">邮箱搜索（免费）</label>
              <div className="flex gap-1 mt-1">
                <input
                  value={emailSearch}
                  onChange={e => setEmailSearch(e.target.value)}
                  placeholder="输入邮箱"
                  className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                />
                <button className="px-2 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200">
                  <Mail size={14} />
                </button>
              </div>
            </div>

            {/* 漂流瓶 */}
            <div className="border-t pt-4">
              <button
                onClick={() => {/* TODO: 打开漂流瓶弹框 */}}
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                🍶 漂流瓶
              </button>
            </div>

            {/* 树洞 */}
            <div>
              <button
                onClick={() => setRightPanel(rightPanel === 'treehole' ? 'chatlist' : 'treehole')}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                  rightPanel === 'treehole'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                🌲 树洞 {rightPanel === 'treehole' && '(当前选中)'}
              </button>
            </div>
          </div>
        </aside>

        {/* ===== 右栏 ===== */}
        <main className="flex-1 overflow-y-auto">
          {rightPanel === 'chatlist' && <ChatListPanel />}
          {rightPanel === 'search' && <SearchResultsPanel />}
          {rightPanel === 'treehole' && <TreeHolePanel />}
        </main>
      </div>
    </div>
  )
}

/* ── 右栏：聊天列表（默认） ── */
function ChatListPanel() {
  const navigate = useNavigate()

  const mockChats = [
    { id: '1', name: '小明', isGroup: false, lastMsg: '你好呀~', time: '刚刚' },
    { id: '2', name: '闲聊群', isGroup: true, lastMsg: '有人在吗？', time: '5分钟前' },
    { id: '3', name: '小红', isGroup: false, lastMsg: '明天见！', time: '1小时前' },
  ]

  return (
    <div className="p-4">
      <div className="space-y-2">
        {mockChats.map(chat => (
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
              <button
                onClick={e => { e.stopPropagation(); /* TODO: 删除好友 */ }}
                className="text-xs text-red-400 hover:text-red-600 shrink-0"
              >
                删除
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 右栏：搜索结果 ── */
function SearchResultsPanel() {
  const mockResults = [
    { id: '1', name: '用户A', age: 22, location: '北京' },
    { id: '2', name: '用户B', age: 25, location: '上海' },
    { id: '3', name: '用户C', age: 20, location: '广州' },
  ]

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">搜索结果</h3>
      <div className="space-y-2">
        {mockResults.map(user => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-blue-200 cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0 flex items-center justify-center">
              👤
            </div>
            <div className="flex-1">
              <span className="font-medium text-sm">{user.name}</span>
              <span className="text-xs text-gray-400 ml-2">{user.age}岁</span>
              <span className="text-xs text-gray-400 ml-2">{user.location}</span>
            </div>
            <button className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
              打招呼
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 右栏：树洞 ── */
function TreeHolePanel() {
  const mockPosts = [
    { id: '1', author: '匿名', content: '今天天气真好，心情也很好~', image: null, commentCount: 3 },
    { id: '2', author: '匿名', content: '有没有人想一起看电影？', image: null, commentCount: 1 },
  ]

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">🌲 树洞</h3>
        <button className="px-3 py-1 text-sm bg-green-500 text-white rounded-full hover:bg-green-600">
          + 发帖
        </button>
      </div>
      <div className="space-y-3">
        {mockPosts.map(post => (
          <div key={post.id} className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">👤</div>
              <span className="text-sm font-medium">{post.author}</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{post.content}</p>
            <div className="flex items-center justify-between">
              <button className="text-xs text-blue-500 hover:text-blue-700">
                💬 评论({post.commentCount})
              </button>
              <button className="text-xs text-red-400 hover:text-red-600">举报</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
