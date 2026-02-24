import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
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
    }
  }, [profile])

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
      setTimeout(() => setMessage(''), 2000)
    }
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
          <div className="relative w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="头像" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Camera size={32} className="text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">点击更换头像</p>
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">省</label>
              <input
                value={province}
                onChange={e => setProvince(e.target.value)}
                placeholder="省"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">市</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="市"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">区</label>
              <input
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="区"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {message && (
          <p className={`text-sm text-center ${message.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
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
      </div>
    </div>
  )
}
