import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import PageHeader from '../components/common/PageHeader'
import ChinaAreaPicker from '../components/common/ChinaAreaPicker'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, updateProfile, logout } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setGender(profile.gender || '')
      setAge(profile.age?.toString() || '')
      setProvince(profile.province || '')
      setCity(profile.city || '')
      setDistrict(profile.district || '')
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile])

  const handleAvatarClick = () => fileInputRef.current?.click()
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMessage('图片不能超过 5MB'); return }
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true); setMessage('')
    const result = await updateProfile({
      nickname: nickname || null,
      gender: (gender as 'male' | 'female' | 'other') || null,
      age: age ? parseInt(age) : null,
      province: province || null, city: city || null, district: district || null,
    })
    setSaving(false)
    if (result.error) setMessage('保存失败：' + result.error)
    else { setMessage('保存成功！'); setTimeout(() => setMessage(''), 3000) }
  }

  return (
    <div className="page">
      <PageHeader title="个人资料" backTo="/" />
      <div className="page-scroll">
        <div className="container-sm p-6" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 头像 */}
          <div className="text-center">
            <div className="avatar avatar-xl avatar-upload" onClick={handleAvatarClick} style={{ margin: '0 auto' }}>
              {avatarPreview ? <img src={avatarPreview} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <Camera size={32} color="#9ca3af" />}
              <div className="avatar-hover-mask"><Camera size={20} color="#fff" /></div>
            </div>
            <p className="text-sm text-gray mt-2">点击更换头像</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          {/* 表单 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label className="label">姓名</label><input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="输入你的昵称" /></div>
            <div>
              <label className="label">性别</label>
              <select className="select" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">请选择</option><option value="male">男</option><option value="female">女</option><option value="other">其他</option>
              </select>
            </div>
            <div><label className="label">年龄</label><input className="input" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="输入年龄" min="1" max="150" /></div>
            <div><label className="label mb-2">地区</label><ChinaAreaPicker province={province} city={city} district={district} onChange={(p,c,d) => { setProvince(p); setCity(c); setDistrict(d) }} /></div>
          </div>

          {message && <p className={`text-sm text-center ${message.includes('失败') || message.includes('不能') ? 'text-red' : 'text-green'}`}>{message}</p>}

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving} style={{ padding: 12 }}>{saving ? '保存中...' : '保存'}</button>

          <div className="divider">
            <button className="btn btn-full" onClick={async () => { await logout(); navigate('/') }} style={{ border: '1px solid #fca5a5', color: '#ef4444', background: 'none', padding: 12 }}>退出登录</button>
            <p className="text-xs text-gray text-center mt-2">所有数据按账号保存在云端，换设备登录同一账号即可恢复</p>
          </div>
        </div>
      </div>
    </div>
  )
}
