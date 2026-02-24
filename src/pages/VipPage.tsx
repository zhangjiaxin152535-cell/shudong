import { useState } from 'react'
import { Check } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'

const plans = [
  { id: '1day', label: '1天', price: '¥3' },
  { id: '7day', label: '7天', price: '¥15' },
  { id: '30day', label: '30天', price: '¥45' },
  { id: '90day', label: '90天', price: '¥99' },
  { id: '1year', label: '一年', price: '¥299', popular: true },
]
const benefits = ['搜索可用全部条件（性别+年龄+地区+在线）', '漂流瓶无限制', '树洞看全世界']

export default function VipPage() {
  const [selected, setSelected] = useState('30day')

  return (
    <div className="page" style={{ background: 'linear-gradient(to bottom, #fffbeb, #fff)' }}>
      <PageHeader title="👑 会员充值" />
      <div className="page-scroll">
        <div className="container-sm p-6" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h2 className="text-bold mb-3">VIP 特权</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check size={16} color="#eab308" /><span className="text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {plans.map(p => (
              <button key={p.id} className={`plan-card ${selected === p.id ? 'selected' : ''}`} onClick={() => setSelected(p.id)}>
                {p.popular && <span className="plan-badge">推荐</span>}
                <div className="text-bold">{p.label}</div>
                <div className="text-lg text-bold mt-1" style={{ color: '#ca8a04' }}>{p.price}</div>
              </button>
            ))}
          </div>

          <div className="card">
            <h2 className="text-bold mb-3">支付方式</h2>
            <p className="text-sm text-gray">🚧 支付功能暂未开通</p>
            <p className="text-sm text-gray mt-1">微信 / 支付宝 / 发卡购买 — 后期对接</p>
          </div>
        </div>
      </div>
    </div>
  )
}
