import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useBottleStore } from '../stores/bottleStore'
import { getOrCreateConversation } from '../lib/chat'
import { useNavigate } from 'react-router-dom'

interface Props { open: boolean; onClose: () => void }
type View = 'main' | 'throw' | 'catch' | 'myBottle'

export default function BottleModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const isVip = profile?.is_vip ?? false
  const store = useBottleStore()

  const [view, setView] = useState<View>('main')
  const [throwContent, setThrowContent] = useState('')
  const [caughtBottle, setCaughtBottle] = useState<Awaited<ReturnType<typeof store.getBottleDetail>> | null>(null)
  const [selectedMyBottle, setSelectedMyBottle] = useState<Awaited<ReturnType<typeof store.getBottleDetail>> | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open && user) { store.loadMyBottles(user.id); store.loadDailyLimits(user.id) }
  }, [open, user])

  const handleThrow = async () => {
    if (!throwContent.trim() || !user) return
    const result = await store.throwBottle(user.id, throwContent.trim(), isVip)
    if (result.error) { setMessage(result.error); return }
    setThrowContent(''); setMessage('瓶子已扔进大海！🌊')
    setTimeout(() => { setMessage(''); setView('main') }, 1500)
  }

  const handleCatch = async () => {
    if (!user) return
    const result = await store.catchBottle(user.id, isVip)
    if (result.error) { setMessage(result.error); return }
    if (result.bottle) { setCaughtBottle(result.bottle); setView('catch') }
  }

  const handleReplyAndThrow = async () => {
    if (!caughtBottle || !user) return
    await store.replyToBottle(caughtBottle.id, user.id, replyInput, caughtBottle.pick_count)
    setReplyInput(''); setMessage('瓶子已扔回大海！🌊')
    setTimeout(() => { setMessage(''); setView('main') }, 1200)
  }

  const handleReplyAndSayHi = async (targetUserId: string) => {
    if (!user) return
    if (targetUserId === user.id) { setMessage('不能和自己打招呼'); return }
    if (caughtBottle) await store.replyToBottle(caughtBottle.id, user.id, replyInput, caughtBottle.pick_count)
    const convId = await getOrCreateConversation(user.id, targetUserId)
    if (convId) { onClose(); navigate(`/chat/${convId}`) }
  }

  const viewMyBottleDetail = async (bottle: typeof store.myBottles[0]) => {
    const detail = await store.getBottleDetail(bottle)
    setSelectedMyBottle(detail); setView('myBottle')
  }

  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content modal-content-lg" style={{ background: 'linear-gradient(to bottom, #cffafe, #bfdbfe)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div className="flex-between" style={{ padding: '16px 20px 8px' }}>
          <h2 className="text-lg text-bold" style={{ color: '#1e40af' }}>🍶 漂流瓶</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {message && <div className="card text-center text-sm text-bold mb-3" style={{ background: 'rgba(255,255,255,.5)', color: '#1e40af' }}>{message}</div>}

          {view === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="text-center" style={{ padding: '24px 0', fontSize: 36 }}>🌊🌊🌊</div>
              <div className="flex gap-3">
                {/* !!! 上线前改回 /3 */}
                <button className="btn btn-primary btn-full" onClick={() => setView('throw')}>扔瓶子 {!isVip && `(${store.todayThrows}/50)`}</button>
                <button className="btn btn-full" style={{ background: '#06b6d4', color: '#fff' }} onClick={handleCatch}>捞瓶子 {!isVip && `(${store.todayCatches}/50)`}</button>
              </div>
              {store.myBottles.length > 0 && (
                <div>
                  <h3 className="text-sm text-bold mb-2" style={{ color: '#1e40af' }}>🏖️ 沙滩上的瓶子</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {store.myBottles.map(b => (
                      <button key={b.id} className="card card-hover text-center" style={{ background: 'rgba(255,255,255,.7)' }} onClick={() => viewMyBottleDetail(b)}>
                        <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>🫙</span>
                        <span className="text-xs">{b.status === 'returned' ? '已回来' : `流浪中(${b.pick_count}次)`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'throw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 className="text-medium" style={{ color: '#1e40af' }}>写点什么放进瓶子里吧</h3>
              <textarea className="textarea" value={throwContent} onChange={e => setThrowContent(e.target.value)} placeholder="写下你的心声..." rows={4} />
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-full" onClick={() => setView('main')}>取消</button>
                <button className="btn btn-primary btn-full" onClick={handleThrow} disabled={!throwContent.trim()}>扔出去！🌊</button>
              </div>
            </div>
          )}

          {view === 'catch' && caughtBottle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 className="text-medium" style={{ color: '#1e40af' }}>你捞到了一个瓶子！</h3>
              <div className="card" style={{ background: 'rgba(255,255,255,.8)' }}>
                <div className="flex items-center gap-2 mb-2"><div className="avatar avatar-md">👤</div><span className="text-sm text-medium">{caughtBottle.creator_name}</span></div>
                <p className="text-sm" style={{ marginLeft: 40 }}>{caughtBottle.content}</p>
                {caughtBottle.replies.map(r => (
                  <div key={r.id} className="flex items-start gap-2" style={{ marginLeft: 24, paddingLeft: 16, borderLeft: '2px solid #bfdbfe', marginTop: 8 }}>
                    <div className="avatar avatar-sm" style={{ background: '#dbeafe', marginTop: 2 }}>👤</div>
                    <div><span className="text-sm text-medium text-blue">{r.author_name}</span><p className="text-sm">{r.content}</p></div>
                  </div>
                ))}
                <p className="text-xs text-gray mt-2">已被打捞 {caughtBottle.pick_count}/{caughtBottle.max_picks} 次</p>
              </div>
              <textarea className="textarea" value={replyInput} onChange={e => setReplyInput(e.target.value)} placeholder="写你的回复（可选）..." rows={2} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => { setView('main'); setReplyInput(''); setCaughtBottle(null) }}>① 扔回海里（不回复）</button>
                <button className="btn btn-full" style={{ background: '#60a5fa', color: '#fff' }} onClick={handleReplyAndThrow}>② 回复后扔回海里</button>
                <button className="btn btn-success btn-full" onClick={() => handleReplyAndSayHi(caughtBottle.creator_id)}>③ 回复 + 和原作者打招呼</button>
              </div>
            </div>
          )}

          {view === 'myBottle' && selectedMyBottle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 className="text-medium" style={{ color: '#1e40af' }}>我的瓶子</h3>
              <div className="card" style={{ background: 'rgba(255,255,255,.8)' }}>
                <p className="text-xs text-gray mb-2">状态：{selectedMyBottle.status === 'returned' ? '已回来' : `流浪中（已捞${selectedMyBottle.pick_count}次）`}</p>
                <p className="text-sm text-medium mb-2">我写的：</p>
                <p className="text-sm mb-3">{selectedMyBottle.content}</p>
                {selectedMyBottle.replies.length > 0 ? (
                  <div className="divider" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedMyBottle.replies.map(r => (
                      <div key={r.id} className="flex items-start gap-2">
                        <div className="avatar avatar-sm" style={{ background: '#dbeafe', marginTop: 2 }}>👤</div>
                        <div><span className="text-sm text-medium text-blue">{r.author_name}</span><p className="text-sm">{r.content}</p></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray">还没有人回复</p>}
              </div>
              <button className="btn btn-ghost btn-full" onClick={() => setView('main')}>返回</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
