import { useState, useEffect, useMemo } from 'react'
import provinces from 'china-division/dist/provinces.json'
import cities from 'china-division/dist/cities.json'
import areas from 'china-division/dist/areas.json'

interface Props {
  province: string; city: string; district: string
  onChange: (province: string, city: string, district: string) => void
}

export default function ChinaAreaPicker({ province, city, district, onChange }: Props) {
  const [sp, setSp] = useState(province)
  const [sc, setSc] = useState(city)
  const [sd, setSd] = useState(district)

  const fc = useMemo(() => {
    const p = (provinces as any[]).find(p => p.name === sp)
    return p ? (cities as any[]).filter(c => c.provinceCode === p.code) : []
  }, [sp])

  const fa = useMemo(() => {
    const c = (cities as any[]).find(c => c.name === sc && fc.includes(c))
    return c ? (areas as any[]).filter(a => a.cityCode === c.code) : []
  }, [sc, fc])

  useEffect(() => { setSp(province); setSc(city); setSd(district) }, [province, city, district])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      <select className="select input-sm" value={sp} onChange={e => { setSp(e.target.value); setSc(''); setSd(''); onChange(e.target.value, '', '') }}>
        <option value="">选择省</option>
        {(provinces as any[]).map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
      </select>
      <select className="select input-sm" value={sc} disabled={!sp} onChange={e => { setSc(e.target.value); setSd(''); onChange(sp, e.target.value, '') }}>
        <option value="">选择市</option>
        {fc.map((c: any) => <option key={c.code} value={c.name}>{c.name}</option>)}
      </select>
      <select className="select input-sm" value={sd} disabled={!sc} onChange={e => { setSd(e.target.value); onChange(sp, sc, e.target.value) }}>
        <option value="">选择区</option>
        {fa.map((a: any) => <option key={a.code} value={a.name}>{a.name}</option>)}
      </select>
    </div>
  )
}
