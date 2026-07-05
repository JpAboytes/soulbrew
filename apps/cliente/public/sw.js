/* Service Worker de Soulbrew — recibe Web Push y abre la app al tocar la notificación.
   Se sirve desde la raíz (/sw.js) para poder controlar todo el scope del sitio. */

// Activa la versión nueva de inmediato y toma control de las pestañas abiertas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Solo permitimos rutas internas ("/…"): un `url` absoluto en el payload abriría un sitio
// externo con la marca Soulbrew (phishing). Cualquier otra cosa cae a la home.
function rutaSegura(u) {
  return typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') ? u : '/'
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Soulbrew'
  const options = {
    body: data.body || '',
    icon: '/notif-icon.png',    // logo de marca (grande, a color)
    badge: '/notif-badge.png',  // silueta monocroma para la barra de estado
    vibrate: [80, 40, 80],
    data: { url: rutaSegura(data.url) },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = rutaSegura(event.notification.data?.url)
  const destino = new URL(url, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          // Si la pestaña abierta no está ya en el destino, navégala al deep link.
          if ('navigate' in client && client.url !== destino) {
            return client.navigate(url).then((c) => (c || client).focus()).catch(() => client.focus())
          }
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
