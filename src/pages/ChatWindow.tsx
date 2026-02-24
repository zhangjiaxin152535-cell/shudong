import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Image, Mic, File, Video, Send, ShieldAlert, Ban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import PageHeader from '../components/common/PageHeader'
import type { Message } from '../types/database'

export default function ChatWindow() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatName, setChatName] = useState('')
  const [conversationStatus, setConversationStatus] = useState<'stranger' | 'friend'>('stranger')
  const [loading, setLoading] = useState(true)
  const [mySentCount, setMySentCount] = useState(0)

  const isGroup = id?.startsWith('group-')
  const realId = isGroup ? id?.replace('group-', '') : id
  const maxStrangerMessages = 3
  const isLocked = conversationStatus === 'stranger' && mySentCount >= maxStrangerMessages

  useEffect(() => {
    if (!user || !realId) return
    loadChatData()
    const cleanup = subscribeToMessages()
    return () => { cleanup?.then(sub => sub?.()) }
  }, [user, realId])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadChatData = async () => {
    if (!user || !realId) return
    if (isGroup) {
      const { data: group } = await supabase.from('groups').select('name').eq('id', realId).single()
      if (group) setChatName(group.name)
      const { data: msgs } = await supabase.from('group_messages').select('*').eq('group_id', realId).order('created_at', { ascending: true })
      if (msgs) setMessages(msgs as Message[])
    } else {
      const { data: conv } = await supabase.from('conversations').select('*').eq('id', realId).single()
      if (conv) {
        setConversationStatus(conv.status)
        const otherId = conv.user_a_id === user.id ? conv.user_b_id : conv.user_a_id
        const { data: p } = await supabase.from('profiles').select('nickname').eq('id', otherId).single()
        setChatName(p?.nickname || '未知用户')
      }
      const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', realId).order('created_at', { ascending: true })
      if (msgs) {
        setMessages(msgs as Message[])
        if (conv?.status === 'stranger') setMySentCount(msgs.filter(m => m.sender_id === user.id).length)
      }
    }
    setLoading(false)
  }

  const subscribeToMessages = () => {
    if (!realId) return
    const table = isGroup ? 'group_messages' : 'messages'
    const column = isGroup ? 'group_id' : 'conversation_id'
    const channel = supabase.channel(`chat-${realId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `${column}=eq.${realId}` }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        if (!isGroup && newMsg.sender_id !== user?.id && conversationStatus === 'stranger') {
          setConversationStatus('friend')
          supabase.from('conversations').update({ status: 'friend' }).eq('id', realId)
        }
      }).subscribe()
    return Promise.resolve(() => { supabase.removeChannel(channel) })
  }

  const handleSend = async () => {
    if (!input.trim() || !user || !realId || isLocked) return
    const table = isGroup ? 'group_messages' : 'messages'
    const { data, error } = await supabase.from(table).insert({
      sender_id: user.id, content_type: 'text' as const, text_content: input.trim(),
      ...(isGroup ? { group_id: realId } : { conversation_id: realId }),
    }).select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data as Message])
      setInput('')
      if (!isGroup && conversationStatus === 'stranger') setMySentCount(prev => prev + 1)
      await supabase.from(isGroup ? 'groups' : 'conversations').update({ updated_at: new Date().toISOString() }).eq('id', realId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleFileSelect = (accept: string) => { if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click() } }
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !realId) return
    const type = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'voice' : 'file'
    const table = isGroup ? 'group_messages' : 'messages'
    await supabase.from(table).insert({ sender_id: user.id, content_type: type, text_content: `[${type === 'image' ? '图片' : type === 'video' ? '视频' : type === 'voice' ? '语音' : '文件'}] ${file.name}`, ...(isGroup ? { group_id: realId } : { conversation_id: realId }) })
    e.target.value = ''
  }

  if (loading) return <div className="page"><div className="flex-center page-scroll text-gray">加载中...</div></div>

  return (
    <div className="page" style={{ background: '#f3f4f6' }}>

      {/* ====== 区域1：顶部 ====== */}
      <PageHeader
        title={chatName}
        subtitle={!isGroup && conversationStatus === 'stranger' ? '陌生人 · 回复后成为好友' : undefined}
        backTo="/real-person"
        right={!isGroup ? (<>
          <button className="icon-btn icon-btn-danger" title="拉黑"><Ban size={18} /></button>
          <button className="icon-btn icon-btn-warning" title="举报"><ShieldAlert size={18} /></button>
        </>) : undefined}
      />

      {/* ====== 区域2：消息（可滚动） ====== */}
      <div className="page-scroll" style={{ padding: '12px 16px' }}>
        <div className="container-lg" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && <div className="empty-state">开始聊天吧</div>}
          {messages.map(msg => {
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

      {/* ====== 区域3：底部输入（固定，70%居中） ====== */}
      <div className="page-footer">
        {!isGroup && conversationStatus === 'stranger' && (
          <div className="text-center text-xs text-gray" style={{ padding: '4px 0' }}>
            {isLocked ? '对方回复前最多发送3条消息' : `已发送 ${mySentCount}/${maxStrangerMessages} 条`}
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
      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime(), min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}小时前`
  return d.toLocaleDateString('zh-CN')
}
