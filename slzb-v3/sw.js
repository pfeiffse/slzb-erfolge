// ============================================================
// SLZB-Erfolge v3 – Service Worker
// Ermöglicht PWA-Installation und Offline-Grundfunktion
// ============================================================

const CACHE_NAME = 'slzb-erfolge-v3';
const CACHE_VERSION = '1.0.0';
const FULL_CACHE_NAME = `${CACHE_NAME}-${CACHE_VERSION}`;

// Dateien die beim Installieren gecacht werden (App-Shell)
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './app2.js',
  './backend.js',
  './config.js',
  './data.js',
  './poster.js',
  './termine.js',
  './user-admin.js',
  './supabase.min.js',
  './slzb-sport-erfolge-logo.png',
  './slzb-logo.png',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
];

// ── Installation ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installiere Version:', FULL_CACHE_NAME);
  event.waitUntil(
    caches.open(FULL_CACHE_NAME).then((cache) => {
      console.log('[SW] App-Shell wird gecacht...');
      // Einzeln cachen damit ein Fehler nicht alles blockiert
      return Promise.allSettled(
        APP_SHELL.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Konnte nicht cachen:', url, err.message)
          )
        )
      );
    }).then(() => {
      console.log('[SW] Installation abgeschlossen');
      return self.skipWaiting();
    })
  );
});

// ── Aktivierung ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktiviere:', FULL_CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith(CACHE_NAME) && name !== FULL_CACHE_NAME)
          .map(name => {
            console.log('[SW] Lösche alten Cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch-Strategie ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase-Anfragen: IMMER online (nie cachen)
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('supabase.io')) {
    return; // Netzwerk direkt nutzen
  }

  // Google Fonts: Cache-First
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(FULL_CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // App-Shell & statische Dateien: Cache-First mit Netzwerk-Fallback
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // Im Hintergrund aktualisieren (Stale-While-Revalidate)
          fetch(event.request).then(response => {
            if (response && response.status === 200) {
              caches.open(FULL_CACHE_NAME).then(cache =>
                cache.put(event.request, response)
              );
            }
          }).catch(() => {});
          return cached;
        }
        // Nicht im Cache: Netzwerk versuchen
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(FULL_CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline-Fallback: Hauptseite zurückgeben
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});

// ── Offline-Seite bei Netzwerkfehler ─────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
// ── Push-Benachrichtigungen empfangen ─────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch(e) {}

  const title   = data.title  || 'SLZB-Erfolge';
  const options = {
    body:    data.body   || 'Neue Benachrichtigung',
    icon:    data.icon   || './icons/icon-192x192.png',
    badge:   data.badge  || './icons/icon-72x72.png',
    tag:     data.tag    || 'slzb-notification',
    renotify: true,
    data:    { url: data.url || './' },
    actions: [
      { action: 'open',  title: '📋 Öffnen'    },
      { action: 'close', title: 'Schließen' }
    ],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Klick auf Notification ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Bereits offenes Fenster fokussieren
      for (const client of clientList) {
        if (client.url.includes('slzb-erfolge') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Neues Fenster öffnen
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
