import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Image, Mic, File, Video, Send, ShieldAlert, Ban } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import PageHeader from '../components/common/PageHeader'

export default function ChatWindow() {
  const navigate = useNavigate()
  const { id: convId } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const { messages, conversations, loadMessages, sendMessage, getStrangerSentCount } = useChatStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  const isGroup = convId?.startsWith('group-') || false
  const conv = conversations.find(c => c.id === convId)
  const chatName = conv?.otherName || ''
  const status = conv?.status || 'stranger'
  const msgs = convId ? (messages[convId] || []) : []
  const sentCount = convId && user ? getStrangerSentCount(convId, user.id) : 0
  const isLocked = !isGroup && status === 'stranger' && sentCount >= 3

  useEffect(() => {
    if (convId) loadMessages(convId, isGroup)
  }, [convId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  const handleSend = async () => {
    if (!input.trim() || !user || !convId || isLocked) return
    await sendMessage(convId, user.id, input.trim(), isGroup)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleFileSelect = (accept: string) => { if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click() } }

  return (
    <div className="page" style={{ background: '#f3f4f6' }}>
      <PageHeader title={chatName} subtitle={!isGroup && status === 'stranger' ? '陌生人 · 回复后成为好友' : undefined} backTo="/real-person"
        right={!isGroup ? (<>
          <button className="icon-btn icon-btn-danger" title="拉黑"><Ban size={18} /></button>
          <button className="icon-btn icon-btn-warning" title="举报"><ShieldAlert size={18} /></button>
        </>) : undefined}
      />

      <div className="page-scroll" style={{ padding: '12px 16px' }}>
        <div className="container-lg" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.length === 0 && <div className="empty-state">开始聊天吧</div>}
          {msgs.map(msg => {
            const isMine = msg.sender_id === user?.id
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '75%', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                  <div className="avatar avatar-md">{isMine ? '我' : '👤'}</div>
                  <div>
                    <div className={isMine ? 'bubble bubble-mine' : 'bubble bubble-other'}>{msg.text_content}</div>
                    <div className="text-xs text-gray mt-1" style={{ textAlign: isMine ? 'right' : 'left' }}>{formatTime(msg.created_at)}</div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="page-footer">
        {!isGroup && status === 'stranger' && (
          <div className="text-center text-xs text-gray" style={{ padding: '4px 0' }}>
            {isLocked ? '对方回复前最多发送3条消息' : `已发送 ${sentCount}/3 条`}
          </div>
        )}
        <div className="container-70 py-3">
          <div className="flex gap-2" style={{ marginBottom: 6 }}>
            <button className="icon-btn" onClick={() => handleFileSelect('image/*')} disabled={isLocked}><Image size={16} /></button>
            <button className="icon-btn" disabled={isLocked}><Mic size={16} /></button>
            <button className="icon-btn" onClick={() => handleFileSelect('*/*')} disabled={isLocked}><File size={16} /></button>
            <button className="icon-btn" onClick={() => handleFileSelect('video/*')} disabled={isLocked}><Video size={16} /></button>
          </div>
          <div className="flex gap-2">
            <input className="input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isLocked} placeholder={isLocked ? '等待对方回复...' : '输入消息...'} />
            <button className="btn btn-primary" onClick={handleSend} disabled={isLocked || !input.trim()}><Send size={16} /></button>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" className="hidden" />
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime(), min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'; if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60); if (h < 24) return `${h}小时前`
  return d.toLocaleDateString('zh-CN')
}
