import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginModal from './pages/LoginModal'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize, initialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>
  }

  return (
    <BrowserRouter>
      <LoginModal />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
        {/* 后续页面占位 */}
        <Route path="/real-person" element={<AuthGuard><Placeholder name="真人区" /></AuthGuard>} />
        <Route path="/ai" element={<AuthGuard><Placeholder name="AI角色区" /></AuthGuard>} />
        <Route path="/admin" element={<AuthGuard><Placeholder name="管理后台" /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-300 mb-2">{name}</p>
        <p className="text-gray-400">开发中...</p>
      </div>
    </div>
  )
}
