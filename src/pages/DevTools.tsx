import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const TEST_USERS = [
  { email: 'xiaoming@shudong.test', password: 'shudong123', nickname: '小明', gender: 'male', age: 22, province: '广东', city: '广州', district: '天河' },
  { email: 'xiaohong@shudong.test', password: 'shudong123', nickname: '小红', gender: 'female', age: 20, province: '上海', city: '上海', district: '浦东' },
  { email: 'zhangsan@shudong.test', password: 'shudong123', nickname: '张三', gender: 'male', age: 25, province: '浙江', city: '杭州', district: '西湖' },
  { email: 'lisi@shudong.test', password: 'shudong123', nickname: '李四', gender: 'female', age: 23, province: '四川', city: '成都', district: '武侯' },
]

export default function DevTools() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])

  const seedTestUsers = async () => {
    if (!user) return
    setRunning(true)
    setLog([])
    const userIds: string[] = []

    addLog('开始创建测试用户...')

    // 先保存当前 session
    const { data: { session: mySession } } = await supabase.auth.getSession()

    for (const u of TEST_USERS) {
      addLog(`注册 ${u.nickname} (${u.email})...`)
      const { data, error } = await supabase.auth.signUp({ email: u.email, password: u.password })
      if (error) {
        if (error.message.includes('already registered')) {
          addLog(`  → ${u.nickname} 已存在，查找ID...`)
          // 通过 profiles 表查找（如果之前注册过）
          const { data: profiles } = await supabase.from('profiles').select('id').eq('nickname', u.nickname).limit(1)
          if (profiles?.[0]) userIds.push(profiles[0].id)
          continue
        }
        addLog(`  → 失败: ${error.message}`)
        continue
      }
      if (data.user) {
        userIds.push(data.user.id)
        addLog(`  → 成功! ID: ${data.user.id.slice(0, 8)}...`)
      }
    }

    // 恢复自己的 session
    if (mySession) {
      await supabase.auth.setSession({
        access_token: mySession.access_token,
        refresh_token: mySession.refresh_token,
      })
    }

    addLog('更新测试用户资料...')
    for (let i = 0; i < userIds.length && i < TEST_USERS.length; i++) {
      const u = TEST_USERS[i]
      await supabase.from('profiles').update({
        nickname: u.nickname, gender: u.gender, age: u.age,
        province: u.province, city: u.city, district: u.district,
        is_online: Math.random() > 0.5,
      }).eq('id', userIds[i])
      addLog(`  → ${u.nickname} 资料已更新`)
    }

    if (userIds.length > 0) {
      addLog('创建对话和消息...')

      for (let i = 0; i < userIds.length; i++) {
        const otherId = userIds[i]
        const [userA, userB] = user.id < otherId ? [user.id, otherId] : [otherId, user.id]
        const status = i < 2 ? 'friend' : 'stranger'

        const { data: conv } = await supabase.from('conversations')
          .upsert({ user_a_id: userA, user_b_id: userB, status, initiator_id: otherId }, { onConflict: 'user_a_id,user_b_id' })
          .select('id').single()

        if (conv) {
          const msgs = i === 0 ? [
            { sender_id: otherId, text_content: '你好！你也喜欢看书吗？' },
            { sender_id: user.id, text_content: '是啊，最近在看《三体》' },
            { sender_id: otherId, text_content: '太巧了！我也刚看完第一部' },
          ] : i === 1 ? [
            { sender_id: otherId, text_content: '嗨～我看到你的树洞了' },
            { sender_id: user.id, text_content: '哈哈是哪一条？' },
            { sender_id: otherId, text_content: '就是那条关于旅行的，我也特别想去大理' },
          ] : [
            { sender_id: otherId, text_content: '你好，看到你的资料觉得很有缘' },
            { sender_id: otherId, text_content: '可以认识一下吗？' },
          ]

          for (const msg of msgs) {
            await supabase.from('messages').insert({
              conversation_id: conv.id, sender_id: msg.sender_id,
              content_type: 'text', text_content: msg.text_content,
            })
          }
          addLog(`  → 和 ${TEST_USERS[i].nickname} 的对话已创建 (${status})`)
        }
      }

      addLog('创建漂流瓶...')
      if (userIds[1]) {
        await supabase.from('bottles').insert({
          creator_id: userIds[1],
          content: '如果你看到这个瓶子，说明缘分让我们相遇了。今天下雨了，我一个人在咖啡店里发呆，你在做什么呢？',
        })
        addLog('  → 小红的漂流瓶已创建')
      }
      if (userIds[3]) {
        await supabase.from('bottles').insert({
          creator_id: userIds[3],
          content: '有没有人和我一样，深夜睡不着的时候特别想找个人聊天？不聊什么正经的，就随便说说话就好。',
        })
        addLog('  → 李四的漂流瓶已创建')
      }

      addLog('创建树洞帖子...')
      const treeholePosts = [
        { user_id: userIds[1], text: '终于攒够钱买了梦想中的相机📷 虽然是入门款，但拍出来的照片已经让我很满足了。' },
        { user_id: userIds[3], text: '今天被老板夸了，虽然只是一句"做得不错"，但开心了一整天。小小的认可原来这么有力量。' },
        { user_id: userIds[0], text: '推荐一部纪录片《人生果实》，讲一对老夫妇的慢生活。看完之后觉得好治愈。' },
      ]

      for (const tp of treeholePosts) {
        if (!tp.user_id) continue
        const { data: post } = await supabase.from('treehole_posts').insert({
          user_id: tp.user_id, text_content: tp.text,
        }).select('id').single()

        if (post) {
          const commenters = userIds.filter(id => id !== tp.user_id).slice(0, 2)
          const commentTexts = ['好棒！', '同感！', '赞一个', '太有共鸣了']
          for (const cid of commenters) {
            await supabase.from('treehole_comments').insert({
              post_id: post.id, user_id: cid,
              content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
            })
          }
        }
      }
      addLog('  → 树洞帖子和评论已创建')

      addLog('创建通知...')
      await supabase.from('notifications').insert([
        { user_id: user.id, type: 'message', title: '小明 给你发了消息', content: '太巧了！我也刚看完第一部', reference_type: 'conversation' },
        { user_id: user.id, type: 'treehole_comment', title: '有人评论了树洞帖子', content: '好棒！', reference_type: 'treehole_post' },
        { user_id: user.id, type: 'bottle_reply', title: '你的漂流瓶被回复了', reference_type: 'bottle' },
      ])
      addLog('  → 通知已创建')
    }

    addLog('✅ 全部完成！刷新页面即可看到数据')
    setRunning(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-semibold">🛠 开发者工具</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-2">创建测试用户和数据</h2>
          <p className="text-sm text-gray-500 mb-4">
            会注册4个虚拟用户（小明/小红/张三/李四），创建对话、消息、漂流瓶、树洞帖子。全部走真实注册和数据库写入。
          </p>
          <button
            onClick={seedTestUsers}
            disabled={running}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {running ? '执行中...' : '一键创建测试数据'}
          </button>
        </div>

        {log.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-2">测试账号信息</h2>
          <div className="text-sm text-gray-600 space-y-1">
            {TEST_USERS.map(u => (
              <div key={u.email}>
                <span className="font-medium">{u.nickname}</span>：{u.email} / shudong123
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">可以用这些账号登录，模拟其他用户的视角来测试</p>
        </div>
      </div>
    </div>
  )
}
