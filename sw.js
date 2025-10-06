const CACHE_NAME="morrgolf-v1";
const ASSETS=["./","index.html","manifest.json","app.js","sw.js","icons/icon-192.png","icons/icon-512.png","icons/icon-1024.png","icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const ks=await caches.keys(); await Promise.all(ks.map(k=>k===CACHE_NAME?null:caches.delete(k))); await self.clients.claim();})());});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
