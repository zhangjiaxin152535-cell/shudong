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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized, devMode } = useAuthStore()
  if (!initialized) return <Loading />
  if (!user && !devMode) return <Navigate to="/" replace />
  return <>{children}</>
}

function Loading() {
  return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>
}

export default function App() {
  const { initialize, initialized, devMode } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (!initialized) return <Loading />

  return (
    <BrowserRouter>
      <LoginModal />
      {devMode && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-xs text-center py-1 z-50">
          开发模式 · 免登录 · 所有功能可用 · 上线前在 .env 里把 VITE_DEV_MODE 改为 false
        </div>
      )}
      <div className={devMode ? 'pt-6' : ''}>
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
        </Routes>
      </div>
    </BrowserRouter>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-300 mb-2">{name}</p>
        <p className="text-gray-400">开发中...</p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 text-sm text-blue-500 hover:text-blue-700"
        >
          ← 返回
        </button>
      </div>
    </div>
  )
}
