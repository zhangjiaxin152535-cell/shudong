import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Image, Mic, File, Video, Send, ShieldAlert, Ban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        const { data: otherProfile } = await supabase.from('profiles').select('nickname').eq('id', otherId).single()
        setChatName(otherProfile?.nickname || '未知用户')
      }
      const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', realId).order('created_at', { ascending: true })
      if (msgs) {
        setMessages(msgs as Message[])
        if (conv?.status === 'stranger') {
          setMySentCount(msgs.filter(m => m.sender_id === user.id).length)
        }
      }
    }
    setLoading(false)
  }

  const subscribeToMessages = () => {
    if (!realId) return
    const table = isGroup ? 'group_messages' : 'messages'
    const column = isGroup ? 'group_id' : 'conversation_id'
    const channel = supabase
      .channel(`chat-${realId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `${column}=eq.${realId}` }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        if (!isGroup && newMsg.sender_id !== user?.id && conversationStatus === 'stranger') {
          setConversationStatus('friend')
          supabase.from('conversations').update({ status: 'friend' }).eq('id', realId)
        }
      })
      .subscribe()
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFileSelect = (accept: string) => {
    if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click() }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !realId) return
    const type = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'voice' : 'file'
    const table = isGroup ? 'group_messages' : 'messages'
    await supabase.from(table).insert({
      sender_id: user.id, content_type: type,
      text_content: `[${type === 'image' ? '图片' : type === 'video' ? '视频' : type === 'voice' ? '语音' : '文件'}] ${file.name}`,
      ...(isGroup ? { group_id: realId } : { conversation_id: realId }),
    })
    e.target.value = ''
  }

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400">加载中...</div>

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* 固定顶部 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/real-person')} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-semibold">{chatName}</h1>
            {!isGroup && conversationStatus === 'stranger' && (
              <span className="text-xs text-orange-500">陌生人 · 回复后成为好友</span>
            )}
          </div>
        </div>
        {!isGroup && (
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="拉黑"><Ban size={18} /></button>
            <button className="p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50" title="举报"><ShieldAlert size={18} /></button>
          </div>
        )}
      </header>

      {/* 可滚动消息区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-xl mx-auto space-y-3">
          {messages.length === 0 && <p className="text-center text-gray-400 py-8">开始聊天吧</p>}
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 bg-gray-300 rounded-full shrink-0 flex items-center justify-center text-xs">
                    {isMine ? '我' : '👤'}
                  </div>
                  <div>
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMine ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                    }`}>
                      {msg.text_content}
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : ''}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 固定底部输入区 */}
      <div className="shrink-0 bg-white border-t">
        {!isGroup && conversationStatus === 'stranger' && (
          <div className="text-center py-1 bg-gray-100">
            <span className="text-xs text-gray-500">
              {isLocked ? '对方回复前最多发送3条消息' : `已发送 ${mySentCount}/${maxStrangerMessages} 条`}
            </span>
          </div>
        )}
        <div className="max-w-xl mx-auto px-4 py-2">
          <div className="flex items-center gap-1 mb-1.5">
            <button onClick={() => handleFileSelect('image/*')} disabled={isLocked} className="p-1.5 text-gray-500 hover:text-blue-500 rounded disabled:opacity-30"><Image size={16} /></button>
            <button disabled={isLocked} className="p-1.5 text-gray-500 hover:text-blue-500 rounded disabled:opacity-30"><Mic size={16} /></button>
            <button onClick={() => handleFileSelect('*/*')} disabled={isLocked} className="p-1.5 text-gray-500 hover:text-blue-500 rounded disabled:opacity-30"><File size={16} /></button>
            <button onClick={() => handleFileSelect('video/*')} disabled={isLocked} className="p-1.5 text-gray-500 hover:text-blue-500 rounded disabled:opacity-30"><Video size={16} /></button>
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isLocked}
              placeholder={isLocked ? '等待对方回复...' : '输入消息...'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400" />
            <button onClick={handleSend} disabled={isLocked || !input.trim()} className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-30">
              <Send size={16} />
            </button>
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
