import { useState, useEffect, useMemo } from 'react'
import provinces from 'china-division/dist/provinces.json'
import cities from 'china-division/dist/cities.json'
import areas from 'china-division/dist/areas.json'

interface Props {
  province: string
  city: string
  district: string
  onChange: (province: string, city: string, district: string) => void
}

export default function ChinaAreaPicker({ province, city, district, onChange }: Props) {
  const [selectedProvince, setSelectedProvince] = useState(province)
  const [selectedCity, setSelectedCity] = useState(city)
  const [selectedDistrict, setSelectedDistrict] = useState(district)

  const filteredCities = useMemo(() => {
    const prov = (provinces as any[]).find(p => p.name === selectedProvince)
    if (!prov) return []
    return (cities as any[]).filter(c => c.provinceCode === prov.code)
  }, [selectedProvince])

  const filteredAreas = useMemo(() => {
    const c = (cities as any[]).find(c => c.name === selectedCity && filteredCities.includes(c))
    if (!c) return []
    return (areas as any[]).filter(a => a.cityCode === c.code)
  }, [selectedCity, filteredCities])

  useEffect(() => {
    setSelectedProvince(province)
    setSelectedCity(city)
    setSelectedDistrict(district)
  }, [province, city, district])

  const handleProvince = (val: string) => {
    setSelectedProvince(val)
    setSelectedCity('')
    setSelectedDistrict('')
    onChange(val, '', '')
  }

  const handleCity = (val: string) => {
    setSelectedCity(val)
    setSelectedDistrict('')
    onChange(selectedProvince, val, '')
  }

  const handleDistrict = (val: string) => {
    setSelectedDistrict(val)
    onChange(selectedProvince, selectedCity, val)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={selectedProvince}
        onChange={e => handleProvince(e.target.value)}
        className="px-2 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        <option value="">选择省</option>
        {(provinces as any[]).map(p => (
          <option key={p.code} value={p.name}>{p.name}</option>
        ))}
      </select>

      <select
        value={selectedCity}
        onChange={e => handleCity(e.target.value)}
        disabled={!selectedProvince}
        className="px-2 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
      >
        <option value="">选择市</option>
        {filteredCities.map((c: any) => (
          <option key={c.code} value={c.name}>{c.name}</option>
        ))}
      </select>

      <select
        value={selectedDistrict}
        onChange={e => handleDistrict(e.target.value)}
        disabled={!selectedCity}
        className="px-2 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
      >
        <option value="">选择区</option>
        {filteredAreas.map((a: any) => (
          <option key={a.code} value={a.name}>{a.name}</option>
        ))}
      </select>
    </div>
  )
}
