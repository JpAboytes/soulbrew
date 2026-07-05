import { useState, useEffect } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'
import { isIOS, isStandalone } from '../lib/push'

// Banner para instalar la app como PWA ("Agregar a inicio").
// - Android/Chrome: captura `beforeinstallprompt` y muestra un botón "Instalar" nativo.
// - iPhone/Safari: no hay API de instalación → muestra el instructivo Compartir → Agregar a inicio.
// - Se oculta si ya está instalada (standalone) o si el usuario la cerró antes.

const DISMISS_KEY = 'sb_install_dismissed'

export default function InstalarBanner() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return                       // ya está instalada
    try { if (localStorage.getItem(DISMISS_KEY)) return } catch { /* storage bloqueado */ }

    if (isIOS()) {
      setIos(true)
      setVisible(true)
      return
    }

    // Android/Chrome: el navegador dispara este evento cuando la app es instalable.
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    const onInstalled = () => setVisible(false)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const cerrar = () => {
    setVisible(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* noop */ }
  }

  const instalar = async () => {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* el usuario cerró el diálogo */ }
    setDeferred(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mx-[18px] mt-4 flex items-center gap-3 rounded-[20px] border border-line bg-paper p-3.5 pl-4">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-olive text-cream">
        <Download size={20} />
      </div>

      {ios ? (
        <p className="text-[13px] leading-snug text-coffee-medium">
          <strong className="font-semibold text-coffee-dark">Lleva el menú en tu teléfono.</strong>{' '}
          Toca{' '}
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-cream px-1.5 py-px font-semibold text-coffee-dark align-middle">
            Compartir <Share size={11} />
          </span>{' '}
          y luego{' '}
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-cream px-1.5 py-px font-semibold text-coffee-dark align-middle">
            <Plus size={11} /> Agregar a inicio
          </span>.
        </p>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-coffee-medium">
            <strong className="font-semibold text-coffee-dark">Instala el menú de Soulbrew</strong> para abrirlo con un toque.
          </p>
          <button
            onClick={instalar}
            className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-olive px-4 font-semibold text-cream text-sm hover:bg-[#3E4A30] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-paper focus:ring-olive"
          >
            <Download size={15} /> Instalar
          </button>
        </div>
      )}

      <button
        onClick={cerrar}
        aria-label="Ocultar"
        className="ml-auto flex h-8 w-8 flex-none items-center justify-center self-start rounded-lg text-coffee-light hover:bg-cream focus:outline-none focus:ring-2 focus:ring-olive"
      >
        <X size={17} />
      </button>
    </div>
  )
}
