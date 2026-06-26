// Service Worker minimal - doar pentru a îndeplini cerințele PWA
// Nu face cache, necesită internet pentru funcționare

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Nu interceptăm fetch-uri - tot traficul merge direct la server
// Aplicația necesită conexiune la internet
