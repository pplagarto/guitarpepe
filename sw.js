const CACHE = 'seis-cuerdas-v3';
const ROOT = new URL('./',self.location.href).href;
const FILES = ['./','./index.html','./styles.css','./app.js','./core.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate',event => event.waitUntil((async()=>{
  for(const name of await caches.keys()) if(name.startsWith('seis-cuerdas-') && name!==CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event => {
  if(event.request.method!=='GET' || !event.request.url.startsWith(ROOT))return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{return await fetch(event.request);}catch(error){
      if(event.request.mode==='navigate')return caches.match(new URL('./index.html',ROOT));
      throw error;
    }
  })());
});
