import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import PageHeader from '../components/common/PageHeader'

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const { notifications, loaded, loadNotifications, markAsRead } = useNotificationStore()

  useEffect(() => { if (user) loadNotifications(user.id) }, [user])

  const typeLabel: Record<string, string> = { message: '💬', bottle_reply: '🍶', bottle_returned: '📦', treehole_comment: '🌲', report_result: '📋', system: '📢' }

  return (
    <div className="page">
      <PageHeader title="系统通知" backTo="/" />
      <div className="page-scroll p-4">
        <div className="container-lg">
          {!loaded ? <div className="empty-state">加载中...</div> :
           notifications.length === 0 ? <div className="empty-state">暂无通知</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => markAsRead(n.id)}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{typeLabel[n.type] || '📌'}</span>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        {!n.is_read && <span className="notif-dot" />}
                        <span className="text-medium truncate">{n.title}</span>
                      </div>
                      {n.content && <p className="text-sm text-gray-dark mt-1">{n.content}</p>}
                      <p className="text-xs text-gray mt-1">{new Date(n.created_at).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
