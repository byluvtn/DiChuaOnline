/* Service worker: cache-first cho tĩnh, network-first cho Three.js CDN.
   Khi mất mạng hoàn toàn, trả về một trang báo nhẹ nhàng thay vì màn hình trắng. */
const CACHE = 'niemphat-v7-offline';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './css/garden-hud.css',
  './js/app.js',
  './js/kinh.js',
  './js/minimap.js',
  './js/scene.js',
  './js/characters.js',
  './js/campus.js',
  './js/glow.js',
  './js/audio.js',
  './js/storage.js',
  './js/three.module.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

/* Trang dự phòng khi offline: không cache, chỉ trả về khi fetch thất bại. */
const OFFLINE_HTML =
  '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="theme-color" content="#160d08"><title>Chùa Vô Lượng</title><style>' +
  'html,body{margin:0;height:100%}' +
  'body{display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#2a1810,#0c0603 70%);' +
  'color:#f3e3c0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px;' +
  'box-sizing:border-box}' +
  'h2{margin:0 0 10px;font-size:20px;color:#ffd375;letter-spacing:.5px}' +
  'p{margin:0;max-width:320px;line-height:1.6;font-size:14px;color:#c9b393}' +
  'button{margin-top:22px;padding:12px 30px;border:0;border-radius:99px;' +
  'background:linear-gradient(180deg,#ffd375,#c9962f);color:#2a1808;font-weight:700;' +
  'font-size:15px;font-family:inherit;cursor:pointer}' +
  '.lotus{font-size:34px;margin-bottom:14px;opacity:.85}' +
  '</style></head><body><div id="fallback">' +
  '<div class="lotus">\u{1FAB7}</div>' +
  '<h2>Mất kết nối mạng</h2>' +
  '<p>Chùa cần mạng ở lần tải đầu tiên. Sau đó bạn có thể tụng kinh và niệm Phật hoàn toàn offline.</p>' +
  '<button onclick="location.reload()">Thử lại</button>' +
  '</div></body></html>';

/* Trả trang dự phòng, hoặc chính index.html đã cache nếu có. */
function offlineFallback(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    if (request.mode === 'navigate') {
      return new Response(OFFLINE_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  });
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    // Không sao chép tài nguyên cũ từ HTTP cache sang cache phiên bản mới.
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((asset) => new Request(asset, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('niemphat-') && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Chỉ xử lý GET; bỏ qua các method khác để không phá request gốc.
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // CDN (Three.js): network-first, fallback cache
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => offlineFallback(e.request))
    );
    return;
  }

  // nội bộ: cache-first, luôn có phương án dự phòng khi mất mạng
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          })
          .catch(() => offlineFallback(e.request))
    )
  );
});
