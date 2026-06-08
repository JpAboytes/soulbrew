import { useEffect } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-medium max-w-sm animate-fade-in ${
        message.type === 'error' ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {message.type === 'error'
        ? <AlertTriangle size={20} className="shrink-0" />
        : <CheckCircle size={20} className="shrink-0" />
      }
      {message.text}
    </div>
  )
}
