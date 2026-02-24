import { useState, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getOrCreateConversation } from '../lib/chat'
import { useNavigate } from 'react-router-dom'
import type { Bottle, BottleReply } from '../types/database'

interface Props {
  open: boolean
  onClose: () => void
}

type View = 'main' | 'throw' | 'catch' | 'myBottle'

export default function BottleModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const isVip = profile?.is_vip ?? false

  const [view, setView] = useState<View>('main')
  const [throwContent, setThrowContent] = useState('')
  const [caughtBottle, setCaughtBottle] = useState<(Bottle & { replies: (BottleReply & { author_name: string })[], creator_name: string }) | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [myBottles, setMyBottles] = useState<Bottle[]>([])
  const [selectedMyBottle, setSelectedMyBottle] = useState<(Bottle & { replies: (BottleReply & { author_name: string })[] }) | null>(null)
  const [todayThrows, setTodayThrows] = useState(0)
  const [todayCatches, setTodayCatches] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open && user) { loadDailyLimits(); loadMyBottles() }
  }, [open, user])

  const loadDailyLimits = async () => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('bottle_daily_limits').select('*').eq('user_id', user.id).eq('date', today).single()
    if (data) { setTodayThrows(data.throws); setTodayCatches(data.catches) }
    else { setTodayThrows(0); setTodayCatches(0) }
  }

  const updateDailyLimit = async (field: 'throws' | 'catches') => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('bottle_daily_limits').select('*').eq('user_id', user.id).eq('date', today).single()
    if (existing) {
      await supabase.from('bottle_daily_limits').update({ [field]: existing[field] + 1 }).eq('user_id', user.id).eq('date', today)
    } else {
      await supabase.from('bottle_daily_limits').insert({ user_id: user.id, date: today, [field]: 1 })
    }
  }

  const loadMyBottles = async () => {
    if (!user) return
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('bottles').select('*').eq('creator_id', user.id).gte('created_at', threeDaysAgo).order('created_at', { ascending: false })
    if (data) setMyBottles(data)
  }

  const handleThrow = async () => {
    if (!throwContent.trim() || !user) return
    if (!isVip && todayThrows >= 3) { setMessage('今天已扔满3个瓶子，开通VIP可无限'); return }

    await supabase.from('bottles').insert({ creator_id: user.id, content: throwContent.trim() })
    await updateDailyLimit('throws')
    setThrowContent('')
    setTodayThrows(prev => prev + 1)
    setMessage('瓶子已扔进大海！🌊')
    loadMyBottles()
    setTimeout(() => { setMessage(''); setView('main') }, 1500)
  }

  const handleCatch = async () => {
    if (!user) return
    if (!isVip && todayCatches >= 3) { setMessage('今天已捞满3个瓶子，开通VIP可无限'); return }

    const { data: bottles } = await supabase.from('bottles').select('*')
      .eq('status', 'floating').neq('creator_id', user.id).lt('pick_count', 10)

    if (!bottles || bottles.length === 0) { setMessage('大海空空的，没有捞到瓶子~'); return }

    const bottle = bottles[Math.floor(Math.random() * bottles.length)]
    const { data: replies } = await supabase.from('bottle_replies').select('*').eq('bottle_id', bottle.id).order('created_at', { ascending: true })
    const { data: creator } = await supabase.from('profiles').select('nickname').eq('id', bottle.creator_id).single()

    const enrichedReplies = replies ? await Promise.all(replies.map(async r => {
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', r.user_id).single()
      return { ...r, author_name: p?.nickname || '匿名' }
    })) : []

    await supabase.from('bottles').update({ pick_count: bottle.pick_count + 1 }).eq('id', bottle.id)
    if (bottle.pick_count + 1 >= bottle.max_picks) {
      await supabase.from('bottles').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', bottle.id)
    }

    await updateDailyLimit('catches')
    setTodayCatches(prev => prev + 1)
    setCaughtBottle({ ...bottle, replies: enrichedReplies, creator_name: creator?.nickname || '匿名' })
    setView('catch')
  }

  const handleReplyAndThrow = async () => {
    if (!caughtBottle || !user) return
    if (replyInput.trim()) {
      await supabase.from('bottle_replies').insert({
        bottle_id: caughtBottle.id, user_id: user.id,
        content: replyInput.trim(), pick_number: caughtBottle.pick_count,
      })
    }
    setReplyInput('')
    setMessage('瓶子已扔回大海！🌊')
    setTimeout(() => { setMessage(''); setView('main') }, 1200)
  }

  const handleReplyAndSayHi = async (targetUserId: string) => {
    if (!user) return
    if (replyInput.trim() && caughtBottle) {
      await supabase.from('bottle_replies').insert({
        bottle_id: caughtBottle.id, user_id: user.id,
        content: replyInput.trim(), pick_number: caughtBottle.pick_count,
      })
    }
    const convId = await getOrCreateConversation(user.id, targetUserId)
    if (convId) { onClose(); navigate(`/chat/${convId}`) }
  }

  const viewMyBottleDetail = async (bottle: Bottle) => {
    const { data: replies } = await supabase.from('bottle_replies').select('*').eq('bottle_id', bottle.id).order('created_at', { ascending: true })
    const enriched = replies ? await Promise.all(replies.map(async r => {
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', r.user_id).single()
      return { ...r, author_name: p?.nickname || '匿名' }
    })) : []
    setSelectedMyBottle({ ...bottle, replies: enriched })
    setView('myBottle')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gradient-to-b from-cyan-100 to-blue-200 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-blue-800">🍶 漂流瓶</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {message && <div className="text-center py-2 text-sm font-medium text-blue-700 bg-white/50 rounded-lg mb-3">{message}</div>}

          {view === 'main' && (
            <div className="space-y-4">
              <div className="text-center py-6 text-4xl">🌊🌊🌊</div>
              <div className="flex gap-3">
                <button onClick={() => setView('throw')} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
                  扔瓶子 {!isVip && `(${todayThrows}/3)`}
                </button>
                <button onClick={handleCatch} className="flex-1 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors">
                  捞瓶子 {!isVip && `(${todayCatches}/3)`}
                </button>
              </div>

              {myBottles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">🏖️ 沙滩上的瓶子（我的）</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {myBottles.map(b => (
                      <button key={b.id} onClick={() => viewMyBottleDetail(b)}
                        className="p-3 bg-white/70 rounded-xl text-center hover:bg-white transition-colors">
                        <span className="text-2xl block mb-1">🫙</span>
                        <span className="text-xs text-gray-600">
                          {b.status === 'returned' ? `已回来` : `流浪中(${b.pick_count}次)`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'throw' && (
            <div className="space-y-3">
              <h3 className="font-medium text-blue-800">写点什么放进瓶子里吧</h3>
              <textarea value={throwContent} onChange={e => setThrowContent(e.target.value)}
                placeholder="写下你的心声..." rows={4}
                className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-blue-400 outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setView('main')} className="flex-1 py-2.5 bg-gray-200 rounded-xl hover:bg-gray-300">取消</button>
                <button onClick={handleThrow} disabled={!throwContent.trim()} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-30">扔出去！🌊</button>
              </div>
            </div>
          )}

          {view === 'catch' && caughtBottle && (
            <div className="space-y-3">
              <h3 className="font-medium text-blue-800">你捞到了一个瓶子！</h3>
              <div className="bg-white/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧑 {caughtBottle.creator_name}：</span>
                </div>
                <p className="text-sm text-gray-700 pl-6">{caughtBottle.content}</p>
                {caughtBottle.replies.map(r => (
                  <div key={r.id} className="pl-6">
                    <span className="text-sm text-blue-600">👤 {r.author_name}：</span>
                    <span className="text-sm text-gray-700">{r.content}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">已被打捞 {caughtBottle.pick_count}/{caughtBottle.max_picks} 次</p>
              </div>

              <textarea value={replyInput} onChange={e => setReplyInput(e.target.value)}
                placeholder="写你的回复（可选）..." rows={2}
                className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-blue-400 outline-none" />

              <div className="space-y-2">
                <button onClick={() => { setView('main') }} className="w-full py-2.5 bg-gray-200 rounded-xl hover:bg-gray-300 text-sm">① 扔回海里（不回复）</button>
                <button onClick={handleReplyAndThrow} className="w-full py-2.5 bg-blue-400 text-white rounded-xl hover:bg-blue-500 text-sm">② 回复后扔回海里</button>
                <button onClick={() => handleReplyAndSayHi(caughtBottle.creator_id)} className="w-full py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 text-sm">
                  ③ 回复 + 和原作者打招呼
                </button>
              </div>
            </div>
          )}

          {view === 'myBottle' && selectedMyBottle && (
            <div className="space-y-3">
              <h3 className="font-medium text-blue-800">我的瓶子</h3>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">
                  状态：{selectedMyBottle.status === 'returned' ? '已回来' : `在海里流浪中（已捞${selectedMyBottle.pick_count}次）`}
                </p>
                <p className="text-sm font-medium mb-2">我写的：</p>
                <p className="text-sm text-gray-700 mb-3">{selectedMyBottle.content}</p>
                {selectedMyBottle.replies.length > 0 ? (
                  <div className="space-y-2 border-t pt-2">
                    {selectedMyBottle.replies.map(r => (
                      <div key={r.id}>
                        <span className="text-sm text-blue-600">👤 {r.author_name}：</span>
                        <span className="text-sm text-gray-700">{r.content}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400">还没有人回复</p>}
              </div>
              <button onClick={() => setView('main')} className="w-full py-2.5 bg-gray-200 rounded-xl hover:bg-gray-300">返回</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
