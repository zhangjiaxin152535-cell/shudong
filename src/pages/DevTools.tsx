import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import PageHeader from '../components/common/PageHeader'

const TEST_USERS = [
  { email: 'shudong.xiaoming@qq.com', password: 'shudong123', nickname: '小明', gender: 'male', age: 22, province: '广东', city: '广州', district: '天河' },
  { email: 'shudong.xiaohong@qq.com', password: 'shudong123', nickname: '小红', gender: 'female', age: 20, province: '上海', city: '上海', district: '浦东' },
  { email: 'shudong.zhangsan@qq.com', password: 'shudong123', nickname: '张三', gender: 'male', age: 25, province: '浙江', city: '杭州', district: '西湖' },
  { email: 'shudong.lisi@qq.com', password: 'shudong123', nickname: '李四', gender: 'female', age: 23, province: '四川', city: '成都', district: '武侯' },
]

export default function DevTools() {
  const { user, profile } = useAuthStore()
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])

  const seedTestUsers = async () => {
    if (!user) return
    setRunning(true); setLog([])
    const userIds: string[] = []
    addLog('开始创建测试用户...')
    const { data: { session: mySession } } = await supabase.auth.getSession()
    for (const u of TEST_USERS) {
      addLog(`注册 ${u.nickname} (${u.email})...`)
      const { data, error } = await supabase.auth.signUp({ email: u.email, password: u.password })
      if (error) {
        if (error.message.includes('already registered')) {
          addLog(`  → ${u.nickname} 已存在，查找ID...`)
          const { data: profiles } = await supabase.from('profiles').select('id').eq('nickname', u.nickname).limit(1)
          if (profiles?.[0]) userIds.push(profiles[0].id)
        } else addLog(`  → 失败: ${error.message}`)
        continue
      }
      if (data.user) { userIds.push(data.user.id); addLog(`  → 成功!`) }
    }
    if (mySession) await supabase.auth.setSession({ access_token: mySession.access_token, refresh_token: mySession.refresh_token })
    addLog('更新资料...')
    for (let i = 0; i < userIds.length && i < TEST_USERS.length; i++) {
      const u = TEST_USERS[i]
      await supabase.from('profiles').update({ nickname: u.nickname, gender: u.gender, age: u.age, province: u.province, city: u.city, district: u.district, is_online: Math.random() > 0.5 }).eq('id', userIds[i])
      addLog(`  → ${u.nickname} 资料已更新`)
    }
    addLog('✅ 全部完成！刷新页面即可看到数据'); setRunning(false)
  }

  return (
    <div className="page">
      <PageHeader title="🛠 开发者工具" backTo="/" />
      <div className="page-scroll p-4">
        <div className="container-lg" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h2 className="text-bold mb-2">我的账号</h2>
            <p className="text-sm text-gray mb-1">ID: {user?.id}</p>
            <p className="text-sm text-gray mb-1">邮箱: {user?.email}</p>
            <p className="text-sm text-gray mb-3">角色: {profile?.role || '未知'} | VIP: {profile?.is_vip ? '是' : '否'}</p>
            {profile?.role !== 'admin' ? (
              <button className="btn btn-danger" onClick={async () => {
                if (!user) return
                const { error } = await supabase.from('profiles').update({ role: 'admin', is_vip: true, vip_expires_at: '2099-12-31T00:00:00Z' }).eq('id', user.id)
                if (error) alert('失败: ' + error.message)
                else { alert('已设为管理员！刷新页面生效'); window.location.reload() }
              }}>设置我为超级管理员 + VIP</button>
            ) : <span className="text-sm text-green text-bold">✅ 已是管理员</span>}
          </div>

          <div className="card">
            <h2 className="text-bold mb-2">创建测试用户和数据</h2>
            <p className="text-sm text-gray mb-4">会注册4个虚拟用户，全部走真实注册和数据库写入。</p>
            <button className="btn btn-full" style={{ background: '#f97316', color: '#fff' }} onClick={seedTestUsers} disabled={running}>{running ? '执行中...' : '一键创建测试数据'}</button>
          </div>

          {log.length > 0 && (
            <div style={{ background: '#111827', color: '#4ade80', borderRadius: 12, padding: 16, fontFamily: 'monospace', fontSize: 12, maxHeight: 384, overflowY: 'auto' }}>
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="card">
            <h2 className="text-bold mb-2">测试账号信息</h2>
            {TEST_USERS.map(u => (
              <div key={u.email} className="text-sm" style={{ color: '#4b5563' }}><span className="text-medium">{u.nickname}</span>：{u.email} / shudong123</div>
            ))}
            <p className="text-xs text-gray mt-3">可以用这些账号登录，模拟其他用户视角来测试</p>
          </div>
        </div>
      </div>
    </div>
  )
}
