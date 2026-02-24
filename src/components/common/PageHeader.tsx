import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  backTo?: string
  onBack?: () => void
  right?: React.ReactNode
}

export default function PageHeader({ title, backTo, onBack, right }: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header className="h-14 bg-white border-b px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
