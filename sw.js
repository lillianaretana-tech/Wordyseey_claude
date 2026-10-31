// Wordyssey PWA: installability only. Network and Supabase remain authoritative.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
