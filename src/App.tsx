import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginModal from './pages/LoginModal'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import RealPersonPage from './pages/RealPersonPage'
import ChatWindow from './pages/ChatWindow'
import VipPage from './pages/VipPage'
import TreeHoleComments from './pages/TreeHoleComments'
import DevTools from './pages/DevTools'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized, devMode } = useAuthStore()
  if (!initialized) return <div className="flex-center" style={{ height: '100%', color: '#9ca3af' }}>加载中...</div>
  if (!user && !devMode) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize, initialized, devMode } = useAuthStore()
  const profile = useAuthStore(s => s.profile)

  useEffect(() => { initialize() }, [])

  if (!initialized) return <div className="flex-center" style={{ height: '100%', color: '#9ca3af' }}>加载中...</div>

  return (
    <BrowserRouter>
      <LoginModal />
      {devMode && profile?.role === 'admin' && <div className="dev-banner">开发模式 · 上线前在 .env 里把 VITE_DEV_MODE 改为 false</div>}
      <div style={{ height: '100%', paddingTop: devMode && profile?.role === 'admin' ? 24 : 0 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
          <Route path="/real-person" element={<AuthGuard><RealPersonPage /></AuthGuard>} />
          <Route path="/vip" element={<AuthGuard><VipPage /></AuthGuard>} />
          <Route path="/create-group" element={<AuthGuard><Placeholder name="创建群聊" /></AuthGuard>} />
          <Route path="/chat/:id" element={<AuthGuard><ChatWindow /></AuthGuard>} />
          <Route path="/treehole/:postId" element={<AuthGuard><TreeHoleComments /></AuthGuard>} />
          <Route path="/ai" element={<AuthGuard><Placeholder name="AI角色区" /></AuthGuard>} />
          <Route path="/admin" element={<AuthGuard><Placeholder name="管理后台" /></AuthGuard>} />
          <Route path="/dev-tools" element={<AuthGuard><DevTools /></AuthGuard>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="page">
      <div className="flex-center page-scroll" style={{ flexDirection: 'column', gap: 8 }}>
        <span className="text-2xl text-bold text-gray">{name}</span>
        <span className="text-gray">开发中...</span>
        <button className="btn btn-ghost" onClick={() => window.history.back()}>← 返回</button>
      </div>
    </div>
  )
}
