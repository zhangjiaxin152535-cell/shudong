import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getOrCreateConversation } from '../lib/chat'
import { useNavigate } from 'react-router-dom'
import type { Bottle, BottleReply } from '../types/database'

interface Props { open: boolean; onClose: () => void }
type View = 'main' | 'throw' | 'catch' | 'myBottle'

export default function BottleModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const isVip = profile?.is_vip ?? false
  const [view, setView] = useState<View>('main')
  const [throwContent, setThrowContent] = useState('')
  const [caughtBottle, setCaughtBottle] = useState<(Bottle & { replies: (BottleReply & { author_name: string })[]; creator_name: string }) | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [myBottles, setMyBottles] = useState<Bottle[]>([])
  const [selectedMyBottle, setSelectedMyBottle] = useState<(Bottle & { replies: (BottleReply & { author_name: string })[] }) | null>(null)
  const [todayThrows, setTodayThrows] = useState(0)
  const [todayCatches, setTodayCatches] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => { if (open && user) { loadDailyLimits(); loadMyBottles() } }, [open, user])

  const loadDailyLimits = async () => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('bottle_daily_limits').select('*').eq('user_id', user.id).eq('date', today).single()
    if (data) { setTodayThrows(data.throws); setTodayCatches(data.catches) } else { setTodayThrows(0); setTodayCatches(0) }
  }

  const updateDailyLimit = async (field: 'throws' | 'catches') => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('bottle_daily_limits').select('*').eq('user_id', user.id).eq('date', today).single()
    if (existing) await supabase.from('bottle_daily_limits').update({ [field]: existing[field] + 1 }).eq('user_id', user.id).eq('date', today)
    else await supabase.from('bottle_daily_limits').insert({ user_id: user.id, date: today, [field]: 1 })
  }

  const loadMyBottles = async () => {
    if (!user) return
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('bottles').select('*').eq('creator_id', user.id).gte('created_at', threeDaysAgo).order('created_at', { ascending: false })
    if (data) setMyBottles(data)
  }

  const handleThrow = async () => {
    if (!throwContent.trim() || !user) return
    // !!! 上线前改回 3
    if (!isVip && todayThrows >= 50) { setMessage('今天已扔满，开通VIP可无限'); return }
    await supabase.from('bottles').insert({ creator_id: user.id, content: throwContent.trim() })
    await updateDailyLimit('throws')
    setThrowContent(''); setTodayThrows(prev => prev + 1); setMessage('瓶子已扔进大海！🌊')
    loadMyBottles(); setTimeout(() => { setMessage(''); setView('main') }, 1500)
  }

  const handleCatch = async () => {
    if (!user) return
    // !!! 上线前改回 3
    if (!isVip && todayCatches >= 50) { setMessage('今天已捞满，开通VIP可无限'); return }
    const { data: bottles } = await supabase.from('bottles').select('*').eq('status', 'floating').neq('creator_id', user.id).lt('pick_count', 10)
    if (!bottles || bottles.length === 0) { setMessage('大海空空的，没有捞到瓶子~'); return }
    const bottle = bottles[Math.floor(Math.random() * bottles.length)]
    const { data: replies } = await supabase.from('bottle_replies').select('*').eq('bottle_id', bottle.id).order('created_at', { ascending: true })
    const { data: creator } = await supabase.from('profiles').select('nickname').eq('id', bottle.creator_id).single()
    const enrichedReplies = replies ? await Promise.all(replies.map(async r => {
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', r.user_id).single()
      return { ...r, author_name: p?.nickname || '匿名' }
    })) : []
    await supabase.from('bottles').update({ pick_count: bottle.pick_count + 1 }).eq('id', bottle.id)
    if (bottle.pick_count + 1 >= bottle.max_picks) await supabase.from('bottles').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', bottle.id)
    await updateDailyLimit('catches'); setTodayCatches(prev => prev + 1)
    setCaughtBottle({ ...bottle, replies: enrichedReplies, creator_name: creator?.nickname || '匿名' }); setView('catch')
  }

  const handleReplyAndThrow = async () => {
    if (!caughtBottle || !user) return
    if (replyInput.trim()) await supabase.from('bottle_replies').insert({ bottle_id: caughtBottle.id, user_id: user.id, content: replyInput.trim(), pick_number: caughtBottle.pick_count })
    setReplyInput(''); setMessage('瓶子已扔回大海！🌊'); setTimeout(() => { setMessage(''); setView('main') }, 1200)
  }

  const handleJustThrowBack = () => { setView('main'); setReplyInput(''); setCaughtBottle(null) }

  const handleReplyAndSayHi = async (targetUserId: string) => {
    if (!user) return
    if (targetUserId === user.id) { setMessage('不能和自己打招呼'); return }
    if (replyInput.trim() && caughtBottle) await supabase.from('bottle_replies').insert({ bottle_id: caughtBottle.id, user_id: user.id, content: replyInput.trim(), pick_number: caughtBottle.pick_count })
    const convId = await getOrCreateConversation(user.id, targetUserId)
    if (convId) { onClose(); navigate(`/chat/${convId}`) }
  }

  const viewMyBottleDetail = async (bottle: Bottle) => {
    const { data: replies } = await supabase.from('bottle_replies').select('*').eq('bottle_id', bottle.id).order('created_at', { ascending: true })
    const enriched = replies ? await Promise.all(replies.map(async r => {
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', r.user_id).single()
      return { ...r, author_name: p?.nickname || '匿名' }
    })) : []
    setSelectedMyBottle({ ...bottle, replies: enriched }); setView('myBottle')
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
                <button className="btn btn-primary btn-full" onClick={() => setView('throw')}>扔瓶子 {!isVip && `(${todayThrows}/50)`}</button>
                {/* !!! 上线前改回 /3 */}
                <button className="btn btn-full" style={{ background: '#06b6d4', color: '#fff' }} onClick={handleCatch}>捞瓶子 {!isVip && `(${todayCatches}/50)`}</button>
              </div>
              {myBottles.length > 0 && (
                <div>
                  <h3 className="text-sm text-bold mb-2" style={{ color: '#1e40af' }}>🏖️ 沙滩上的瓶子（我的）</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {myBottles.map(b => (
                      <button key={b.id} className="card card-hover text-center" style={{ background: 'rgba(255,255,255,.7)' }} onClick={() => viewMyBottleDetail(b)}>
                        <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>🫙</span>
                        <span className="text-xs" style={{ color: '#4b5563' }}>{b.status === 'returned' ? '已回来' : `流浪中(${b.pick_count}次)`}</span>
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
                <button className="btn btn-ghost btn-full" onClick={handleJustThrowBack}>① 扔回海里（不回复）</button>
                <button className="btn btn-full" style={{ background: '#60a5fa', color: '#fff' }} onClick={handleReplyAndThrow}>② 回复后扔回海里</button>
                <button className="btn btn-success btn-full" onClick={() => handleReplyAndSayHi(caughtBottle.creator_id)}>③ 回复 + 和原作者打招呼</button>
              </div>
            </div>
          )}

          {view === 'myBottle' && selectedMyBottle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 className="text-medium" style={{ color: '#1e40af' }}>我的瓶子</h3>
              <div className="card" style={{ background: 'rgba(255,255,255,.8)' }}>
                <p className="text-xs text-gray mb-2">状态：{selectedMyBottle.status === 'returned' ? '已回来' : `在海里流浪中（已捞${selectedMyBottle.pick_count}次）`}</p>
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
