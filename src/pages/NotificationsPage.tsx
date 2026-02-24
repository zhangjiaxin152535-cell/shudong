import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Notification } from '../types/database'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadNotifications()
  }, [user])

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data)
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const typeLabel: Record<string, string> = {
    message: '💬',
    bottle_reply: '🍶',
    bottle_returned: '📦',
    treehole_comment: '🌲',
    report_result: '📋',
    system: '📢',
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">系统通知</h1>
      </header>

      <div className="flex-1 overflow-y-auto"><div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <p className="text-center text-gray-500 py-8">加载中...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">暂无通知</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-4 bg-white rounded-lg border cursor-pointer transition-colors ${
                  n.is_read ? 'border-gray-100' : 'border-blue-200 bg-blue-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{typeLabel[n.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                      <p className="font-medium text-gray-800 truncate">{n.title}</p>
                    </div>
                    {n.content && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{n.content}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div></div>
  )
}
