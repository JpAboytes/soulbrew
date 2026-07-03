/* Service Worker de Soulbrew — recibe Web Push y abre la app al tocar la notificación.
   Se sirve desde la raíz (/sw.js) para poder controlar todo el scope del sitio. */

// Activa la versión nueva de inmediato y toma control de las pestañas abiertas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

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
    icon: data.icon || '/notif-icon.png',   // logo de marca (grande, a color)
    badge: '/notif-badge.png',               // silueta monocroma para la barra de estado
    vibrate: [80, 40, 80],
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
