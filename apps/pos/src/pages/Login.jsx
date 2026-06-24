import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coffee, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [mode, setMode] = useState('login')
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

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/vender', { replace: true })
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Cuenta creada. Revisa tu correo para confirmar.' })
        setMode('login')
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#2C1810] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#D4A853] p-4 rounded-2xl mb-4 shadow-lg">
            <Coffee size={40} className="text-[#2C1810]" />
          </div>
          <h1 className="text-3xl font-bold text-[#2C1810]">Soulbrew</h1>
          <p className="text-[#8B5A3C] mt-1 text-sm">Sistema de Cafetería</p>
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
            <label className="block text-sm font-medium text-[#2C1810] mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#D4A853] bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-[#D4A853] bg-white"
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
            className="w-full bg-[#D4A853] hover:bg-[#c49843] disabled:opacity-60 text-[#2C1810] font-bold py-4 rounded-xl text-lg transition-colors min-h-[56px] mt-2"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setMessage(null)
            }}
            className="text-[#D4A853] font-semibold hover:underline"
          >
            {mode === 'login' ? 'Registrarse' : 'Iniciar sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
