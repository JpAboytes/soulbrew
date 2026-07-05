// Web Push (Fase 1): registro del service worker + suscripción del navegador.
// La suscripción se guarda vía la Edge Function `push-subscribe` (service_role),
// ligada al teléfono del cliente cuando está disponible.
import { supabase } from './supabase'
import { mensajeFnError } from './fnError'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// ¿El navegador soporta Web Push? (Chrome/Android sí; iOS solo como app instalada.)
export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// iOS solo entrega push si el sitio se agregó a la pantalla de inicio (PWA instalada).
export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// El applicationServerKey debe ir como Uint8Array (base64url → bytes).
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Registra el service worker (idempotente). Llamar al cargar la app.
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

// Pide permiso, suscribe al navegador y guarda la suscripción en el backend.
// Devuelve la respuesta de la función; lanza Error con mensaje claro si falla.
export async function subscribeToPush({ telefono } = {}) {
  if (!pushSupported()) {
    throw new Error('Tu navegador no soporta notificaciones.')
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Falta configurar las notificaciones (VAPID).')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('No activaste el permiso de notificaciones.')
  }

  // `serviceWorker.ready` nunca resuelve si el SW no llegó a activarse (registro fallido,
  // storage bloqueado…). Resolvemos el registro nosotros y ponemos un tope de tiempo para
  // no dejar el botón en spinner infinito.
  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) reg = await registerServiceWorker()
  if (!reg) throw new Error('No se pudo preparar el navegador para los avisos.')
  if (!reg.active) {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('El navegador tardó demasiado en activar los avisos.')), 8000)),
    ])
  }

  // Reusar la suscripción existente si el applicationServerKey no cambió. Solo
  // desuscribimos si difiere: matar la previa antes de tener una nueva dejaría al
  // usuario sin avisos si `subscribe()` falla.
  const appKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  const previa = await reg.pushManager.getSubscription()
  let sub = previa
  const mismaLlave =
    previa &&
    previa.options?.applicationServerKey &&
    new Uint8Array(previa.options.applicationServerKey).every((b, i) => b === appKey[i])
  if (previa && !mismaLlave) {
    try { await previa.unsubscribe() } catch { /* ignore */ }
    sub = null
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appKey,
    })
  }

  const { keys } = sub.toJSON()
  const { data, error } = await supabase.functions.invoke('push-subscribe', {
    body: {
      telefono,
      subscription: { endpoint: sub.endpoint, keys },
      userAgent: navigator.userAgent,
    },
  })
  if (error) throw new Error(await mensajeFnError(error, 'No se pudieron activar los avisos.'))
  if (data?.error) throw new Error(data.error)
  return data
}
