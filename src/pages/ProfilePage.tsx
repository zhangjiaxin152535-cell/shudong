import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setMessage('图片不能超过 5MB')
      return
    }
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
    // TODO: 上传到 R2，拿到 URL 后更新 profile.avatar_url
  }

  const handleAreaChange = (prov: string, c: string, dist: string) => {
    setProvince(prov)
    setCity(c)
    setDistrict(dist)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const result = await updateProfile({
      nickname: nickname || null,
      gender: (gender as 'male' | 'female' | 'other') || null,
      age: age ? parseInt(age) : null,
      province: province || null,
      city: city || null,
      district: district || null,
    })
    setSaving(false)
    if (result.error) {
      setMessage('保存失败：' + result.error)
    } else {
      setMessage('保存成功！')
      setTimeout(() => setMessage(''), 3000)
    }
    console.log('保存结果:', result)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">个人资料</h1>
      </header>

      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* 头像 */}
        <div className="flex flex-col items-center">
          <div
            onClick={handleAvatarClick}
            className="relative w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors overflow-hidden group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <Camera size={32} className="text-gray-400" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">点击更换头像</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* 表单 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">请选择</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="输入年龄"
              min="1"
              max="150"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">地区</label>
            <ChinaAreaPicker
              province={province}
              city={city}
              district={district}
              onChange={handleAreaChange}
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm text-center ${message.includes('失败') || message.includes('不能') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>

        <div className="border-t pt-4 mt-4">
          <button
            onClick={async () => {
              await logout()
              navigate('/')
            }}
            className="w-full py-3 border border-red-300 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors"
          >
            退出登录
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            所有数据按账号保存在云端，换设备登录同一账号即可恢复
          </p>
        </div>
      </div>
    </div>
  )
}
