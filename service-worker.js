const CACHE='sujalaga-__RELEASE__',PRECACHE=__PRECACHE__;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sujalaga-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 // Let the browser/CDN handle video byte ranges; never cache partial movie responses.
 if(u.pathname.endsWith('.mp4'))return;
 if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith(new URL('./',self.location).pathname))return;
 e.respondWith(fetch(e.request,{cache:e.request.mode==='navigate'?'no-cache':'default'}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}return r;}).catch(()=>caches.match(e.request)));
});
