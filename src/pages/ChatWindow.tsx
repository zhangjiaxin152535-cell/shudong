import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Image, Mic, File, Video, Send, ShieldAlert, Ban } from 'lucide-react'

interface ChatMessage {
  id: string
  senderId: string
  content: string
  contentType: 'text' | 'image' | 'voice' | 'file' | 'video'
  mediaUrl?: string
  timestamp: string
  isMine: boolean
}

export default function ChatWindow() {
  const navigate = useNavigate()
  const { id } = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [input, setInput] = useState('')
  const [isStranger, setIsStranger] = useState(true)
  const [sentCount, setSentCount] = useState(1)
  const maxStrangerMessages = 3
  const isLocked = isStranger && sentCount >= maxStrangerMessages

  // TODO: 替换为真实数据
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', senderId: 'other', content: '（这是模拟的对话窗口）', contentType: 'text', timestamp: '11:00', isMine: false },
    { id: '2', senderId: 'me', content: '你好！很高兴认识你', contentType: 'text', timestamp: '11:01', isMine: true },
  ])

  const chatName = '用户A'
  const isGroup = id?.startsWith('group-')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isLocked) return
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      content: input.trim(),
      contentType: 'text',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    if (isStranger) setSentCount(prev => prev + 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // TODO: 上传到 R2，拿到 URL 后发送媒体消息
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      content: `[${file.type.startsWith('image') ? '图片' : file.type.startsWith('video') ? '视频' : file.type.startsWith('audio') ? '语音' : '文件'}] ${file.name}`,
      contentType: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'voice' : 'file',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    }
    setMessages(prev => [...prev, newMsg])
    if (isStranger) setSentCount(prev => prev + 1)
    e.target.value = ''
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部栏 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-semibold">{chatName}</h1>
            {isStranger && (
              <span className="text-xs text-orange-500">陌生人 · 回复后成为好友</span>
            )}
          </div>
        </div>
        {!isGroup && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* TODO: 拉黑 */}}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="拉黑"
            >
              <Ban size={18} />
            </button>
            <button
              onClick={() => {/* TODO: 举报 */}}
              className="p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
              title="举报"
            >
              <ShieldAlert size={18} />
            </button>
          </div>
        )}
      </header>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-2 max-w-[70%] ${msg.isMine ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 bg-gray-300 rounded-full shrink-0 flex items-center justify-center text-xs">
                  {msg.isMine ? '我' : '👤'}
                </div>
                <div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.isMine
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-xs text-gray-400 mt-1 ${msg.isMine ? 'text-right' : ''}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3条消息限制提示 */}
      {isStranger && (
        <div className="text-center py-1.5 bg-gray-200/50">
          <span className="text-xs text-gray-500">
            {isLocked
              ? '对方回复前最多发送3条消息'
              : `已发送 ${sentCount}/${maxStrangerMessages} 条`
            }
          </span>
        </div>
      )}

      {/* 输入区 */}
      <div className="bg-white border-t px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto">
          {/* 媒体按钮 */}
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => handleFileSelect('image/*')}
              disabled={isLocked}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
              title="图片"
            >
              <Image size={18} />
            </button>
            <button
              onClick={() => {/* TODO: 语音录制 */}}
              disabled={isLocked}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
              title="语音"
            >
              <Mic size={18} />
            </button>
            <button
              onClick={() => handleFileSelect('*/*')}
              disabled={isLocked}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
              title="文件"
            >
              <File size={18} />
            </button>
            <button
              onClick={() => handleFileSelect('video/*')}
              disabled={isLocked}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
              title="视频"
            >
              <Video size={18} />
            </button>
          </div>

          {/* 输入框 + 发送 */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLocked}
              placeholder={isLocked ? '等待对方回复...' : '输入消息...'}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={isLocked || !input.trim()}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-30 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  )
}
