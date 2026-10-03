/* sw.js — كاش ذكي لتسريع التنقل بين الصفحات (واجهة الطالب)
   - الصفحات (HTML): الشبكة أولًا مع الرجوع للكاش لو النت بطيء/مقطوع
   - ملفات الموقع (css/js/صور): تظهر من الكاش فورًا وتتحدّث في الخلفية
   - مكتبات Firebase والخطوط وFont Awesome: من الكاش مباشرة (روابطها ثابتة بإصدار)
   - Firebase Realtime Database نفسها مش بتعدّي من هنا (WebSocket) فالبيانات دايمًا حيّة */
var V = 'asb-v1', ASSETS = V + '-assets', PAGES = V + '-pages', EXT = V + '-ext';
var EXT_FIRST = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|fonts\.gstatic\.com\/|cdnjs\.cloudflare\.com\/)/;
var EXT_SWR = /^https:\/\/fonts\.googleapis\.com\//;

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf(V) !== 0; }).map(function (k) { return caches.delete(k); }));
    try { if (self.registration.navigationPreload) await self.registration.navigationPreload.enable(); } catch (x) {}
    await self.clients.claim();
  })());
});

function put(name, req, res) {
  if (!res || res.status !== 200 || (res.type !== 'basic' && res.type !== 'cors')) return res;
  var copy = res.clone();
  caches.open(name).then(function (c) { c.put(req, copy); }).catch(function () {});
  return res;
}
async function swr(req, name) {
  var c = await caches.open(name), hit = await c.match(req);
  var net = fetch(req).then(function (r) { return put(name, req, r); }).catch(function () { return null; });
  if (hit) { net.catch(function () {}); return hit; }
  return (await net) || Response.error();
}
async function cacheFirst(req, name) {
  var c = await caches.open(name), hit = await c.match(req);
  if (hit) return hit;
  var r = await fetch(req);
  return put(name, req, r);
}
async function pages(e) {
  var req = e.request;
  try {
    var pre = e.preloadResponse ? await e.preloadResponse : null;
    var r = pre || await fetch(req);
    return put(PAGES, req, r);
  } catch (x) {
    var c = await caches.open(PAGES), hit = await c.match(req, { ignoreSearch: false }) || await c.match(req, { ignoreSearch: true });
    return hit || Response.error();
  }
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (req.mode === 'navigate' || /\.html$/.test(u.pathname)) { e.respondWith(pages(e)); return; }
    if (/\.(css|js|png|jpg|jpeg|webp|svg|ico|json|woff2?)$/.test(u.pathname) && u.pathname.indexOf('firebase-rules') < 0) { e.respondWith(swr(req, ASSETS)); return; }
    return;
  }
  if (EXT_FIRST.test(req.url)) { e.respondWith(cacheFirst(req, EXT)); return; }
  if (EXT_SWR.test(req.url)) { e.respondWith(swr(req, EXT)); }
});
