import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (session) navigate('/vender', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Solo login. El alta de cajeros es por invitación del dueño (dashboard de Supabase);
    // no hay auto-registro público — daría acceso total de lectura/escritura al negocio.
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/vender', { replace: true })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#42241A] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-light.png" alt="Soulbrew" className="h-24 w-auto mb-3" />
          <p className="text-[#7C5A43] text-sm">Sistema de Cafetería</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 min-h-[44px] flex items-center"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-4 rounded-xl text-lg transition-colors min-h-[56px] mt-2"
          >
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-gray-400">
          ¿Necesitas una cuenta? Pídela al administrador.
        </p>
      </div>
    </div>
  )
}
