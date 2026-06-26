// Înregistrare Service Worker pentru PWA
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW înregistrat:', reg.scope))
        .catch((err) => console.log('SW eroare:', err));
    });
  }
}
