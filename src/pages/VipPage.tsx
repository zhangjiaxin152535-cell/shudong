import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'

const plans = [
  { id: '1day', label: '1天', price: '¥3' },
  { id: '7day', label: '7天', price: '¥15' },
  { id: '30day', label: '30天', price: '¥45' },
  { id: '90day', label: '90天', price: '¥99' },
  { id: '1year', label: '一年', price: '¥299', popular: true },
]

const benefits = [
  '搜索可用全部条件（性别+年龄+地区+在线）',
  '漂流瓶无限制',
  '树洞看全世界',
]

export default function VipPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('30day')

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-yellow-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">👑 会员充值</h1>
      </header>

      <div className="flex-1 overflow-y-auto"><div className="max-w-lg mx-auto p-6 space-y-6">
        {/* VIP特权 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-3">VIP 特权</h2>
          <div className="space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check size={16} className="text-yellow-500 shrink-0" />
                <span className="text-sm text-gray-600">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 套餐选择 */}
        <div className="grid grid-cols-3 gap-3">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative py-4 rounded-xl border-2 transition-all ${
                selected === plan.id
                  ? 'border-yellow-400 bg-yellow-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-yellow-200'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  推荐
                </span>
              )}
              <div className="text-center">
                <p className="font-semibold text-gray-800">{plan.label}</p>
                <p className="text-lg font-bold text-yellow-600 mt-1">{plan.price}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 支付区域 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-3">支付方式</h2>
          <div className="space-y-2 text-sm text-gray-500">
            <p>🚧 支付功能暂未开通</p>
            <p>微信 / 支付宝 / 发卡购买 — 后期对接</p>
          </div>
        </div>
      </div>
    </div></div>
  )
}
