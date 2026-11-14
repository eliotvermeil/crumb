const V="crumb-v13",SHELL=["/","/icon.svg","/icon-192.png","/apple-touch-icon.png","/manifest.webmanifest","/config.js","/legal.js","/i18n.js","/legal.html","/vendor/fonts.css","/vendor/leaflet/leaflet.css","/vendor/leaflet/leaflet.js","/vendor/fonts/inter-tight-latin-500-normal.woff2","/vendor/fonts/inter-tight-latin-600-normal.woff2","/vendor/fonts/inter-tight-latin-700-normal.woff2","/vendor/fonts/inter-tight-latin-800-normal.woff2","/vendor/fonts/manrope-latin-400-normal.woff2","/vendor/fonts/manrope-latin-500-normal.woff2","/vendor/fonts/manrope-latin-600-normal.woff2","/vendor/fonts/manrope-latin-700-normal.woff2","/vendor/fonts/space-grotesk-latin-500-normal.woff2","/vendor/fonts/space-grotesk-latin-600-normal.woff2","/vendor/fonts/space-grotesk-latin-700-normal.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
const CDN=/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET")return;
  if(u.origin===location.origin){
    if(u.pathname.startsWith("/api")||u.pathname.startsWith("/.netlify"))return;
    e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(k=>k.put(r,c))}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match("/"):Response.error()))));
  }else if(CDN.test(u.hostname)){
    e.respondWith(caches.match(r).then(m=>{const n=fetch(r).then(x=>{if(x.ok||x.type==="opaque"){const c=x.clone();caches.open(V).then(k=>k.put(r,c))}return x}).catch(()=>m);return m||n}));
  }
});
