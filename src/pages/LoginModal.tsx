import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

export default function LoginModal() {
  const { login, register, loading } = useAuthStore()
  const { showLoginModal, setShowLoginModal } = useUIStore()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!showLoginModal) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    if (!isLogin) {
      if (password.length < 6) { setError('密码至少6位'); return }
      if (password !== confirmPassword) { setError('两次输入的密码不一致'); return }
      const r = await register(email, password)
      if (r.error) setError(r.error); else setSuccess('注册成功！请检查邮箱确认链接')
    } else {
      const r = await login(email, password)
      if (r.error) setError(r.error); else { setShowLoginModal(false); resetForm() }
    }
  }

  const resetForm = () => { setEmail(''); setPassword(''); setConfirmPassword(''); setError(''); setSuccess('') }
  const close = () => { setShowLoginModal(false); resetForm() }

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={close} />
      <div className="modal-content modal-content-sm">
        <button className="icon-btn" onClick={close} style={{ position: 'absolute', top: 16, right: 16 }}><X size={20} /></button>
        <h2 className="text-2xl text-bold text-center mb-4">{isLogin ? '登录' : '注册'}</h2>

        <div className="tab-switch">
          <button className={`tab-switch-item ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(''); setSuccess('') }}>登录</button>
          <button className={`tab-switch-item ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(''); setSuccess('') }}>注册</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label className="label">邮箱</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" /></div>
          <div><label className="label">密码</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isLogin ? '输入密码' : '至少6位'} /></div>
          {!isLogin && <div><label className="label">确认密码</label><input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再输入一次" /></div>}

          {error && <p className="text-sm text-red text-center">{error}</p>}
          {success && <p className="text-sm text-green text-center">{success}</p>}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: '12px' }}>{loading ? '请稍候...' : isLogin ? '登录' : '注册'}</button>
          {isLogin && <p className="text-center text-sm text-gray-dark" style={{ cursor: 'pointer' }}>忘记密码？</p>}
        </form>
      </div>
    </div>
  )
}
