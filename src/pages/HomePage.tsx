import { useNavigate } from 'react-router-dom'
import { Mail, User, Settings } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { setShowLoginModal } = useUIStore()
  const isLoggedIn = !!user
  const isAdmin = profile?.role === 'admin'
  const devMode = useAuthStore(s => s.devMode)

  const handleNeedAuth = (path: string) => {
    if (!isLoggedIn) {
      setShowLoginModal(true)
      return
    }
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">首页</h1>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="系统通知"
              >
                <Mail size={22} />
                {/* TODO: 未读数角标 */}
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <User size={18} />
                <span className="text-sm">{profile?.nickname || '个人资料'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              登录
            </button>
          )}
        </div>
      </header>

      {/* 管理员 + 开发者入口 */}
      {isLoggedIn && (isAdmin || devMode) && (
        <div className="px-6 flex gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <Settings size={16} /> 管理后台
            </button>
          )}
          {devMode && (
            <button onClick={() => navigate('/dev-tools')} className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              🛠 开发者工具
            </button>
          )}
        </div>
      )}

      {/* 主入口 */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <button
          onClick={() => handleNeedAuth('/real-person')}
          className="w-full max-w-sm py-6 bg-white rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 transition-all hover:-translate-y-1"
        >
          <div className="text-center">
            <span className="text-4xl mb-2 block">👥</span>
            <span className="text-xl font-semibold text-gray-800">真人区</span>
            <p className="text-sm text-gray-500 mt-1">交友 · 漂流瓶 · 树洞</p>
          </div>
        </button>

        <button
          onClick={() => handleNeedAuth('/ai')}
          className="w-full max-w-sm py-6 bg-white rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 transition-all hover:-translate-y-1"
        >
          <div className="text-center">
            <span className="text-4xl mb-2 block">🤖</span>
            <span className="text-xl font-semibold text-gray-800">Ai角色区</span>
            <p className="text-sm text-gray-500 mt-1">角色卡 · 世界书 · 预设</p>
          </div>
        </button>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        树洞 · 你的秘密花园
      </footer>
    </div>
  )
}
