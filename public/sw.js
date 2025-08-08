/* Enhanced SW */
const STATIC_CACHE = 'static-v2';
const AUDIO_CACHE = 'audio-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(STATIC_CACHE).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>![STATIC_CACHE, AUDIO_CACHE].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  if(req.destination === 'audio') { e.respondWith(caches.open(AUDIO_CACHE).then(async cache=>{ const cached=await cache.match(req); if(cached) return cached; try{ const res=await fetch(req); cache.put(req,res.clone()); return res; }catch{ return cached||Response.error(); } })); return; }
  if(req.mode === 'navigate') { e.respondWith(fetch(req).then(res=>{ const copy=res.clone(); caches.open(STATIC_CACHE).then(c=>c.put(req, copy)); return res; }).catch(()=>caches.match(req).then(r=>r||caches.match('/index.html')))); return; }
  e.respondWith(caches.match(req).then(cached=>{ const fetchPromise = fetch(req).then(res=>{ caches.open(STATIC_CACHE).then(c=>c.put(req,res.clone())); return res; }).catch(()=>cached); return cached || fetchPromise; }));
});
