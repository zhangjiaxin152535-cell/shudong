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
    if (!isLoggedIn) { setShowLoginModal(true); return }
    navigate(path)
  }

  return (
    <div className="page" style={{ background: 'linear-gradient(to bottom, #eff6ff, #fff)' }}>
      {/* 顶部 */}
      <header className="page-header">
        <h1 style={{ fontSize: 20 }}>首页</h1>
        <div className="flex gap-3 items-center">
          {isLoggedIn ? (<>
            <button className="icon-btn" onClick={() => navigate('/notifications')} title="系统通知"><Mail size={20} /></button>
            <button className="flex items-center gap-2 icon-btn" onClick={() => navigate('/profile')}>
              <User size={16} /><span className="text-sm">{profile?.nickname || '个人资料'}</span>
            </button>
          </>) : (
            <button className="btn btn-outline" onClick={() => setShowLoginModal(true)}>登录</button>
          )}
        </div>
      </header>

      {/* 管理员入口 */}
      {isLoggedIn && (isAdmin || devMode) && (
        <div className="flex gap-2 flex-wrap" style={{ padding: '0 24px', marginTop: 8 }}>
          {isAdmin && <button className="btn btn-sm btn-yellow" onClick={() => navigate('/admin')}><Settings size={14} /> 管理后台</button>}
          {devMode && isAdmin && <button className="btn btn-sm" style={{ background: '#f3e8ff', color: '#7c3aed' }} onClick={() => navigate('/dev-tools')}>🛠 开发者工具</button>}
        </div>
      )}

      {/* 主入口 */}
      <div className="page-scroll flex-center" style={{ flexDirection: 'column', gap: 24 }}>
        <button className="entry-card" onClick={() => handleNeedAuth('/real-person')}>
          <div className="entry-card-icon">👥</div>
          <div className="entry-card-title">真人区</div>
          <div className="entry-card-desc">交友 · 漂流瓶 · 树洞</div>
        </button>
        <button className="entry-card" onClick={() => handleNeedAuth('/ai')}>
          <div className="entry-card-icon">🤖</div>
          <div className="entry-card-title">Ai角色区</div>
          <div className="entry-card-desc">角色卡 · 世界书 · 预设</div>
        </button>
      </div>

      <footer className="text-center text-xs text-gray" style={{ padding: 16 }}>树洞 · 你的秘密花园</footer>
    </div>
  )
}
