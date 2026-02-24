import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  backTo?: string
  onBack?: () => void
  right?: React.ReactNode
}

export default function PageHeader({ title, subtitle, backTo, onBack, right }: Props) {
  const navigate = useNavigate()
  const handleBack = () => {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header className="page-header">
      <div className="page-header-left">
        <button className="icon-btn" onClick={handleBack}><ArrowLeft size={20} /></button>
        <div>
          <h1>{title}</h1>
          {subtitle && <span className="text-xs text-orange">{subtitle}</span>}
        </div>
      </div>
      {right && <div className="page-header-right">{right}</div>}
    </header>
  )
}
