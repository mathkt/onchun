#!/usr/bin/env python3
"""sw.js 생성: 사이트의 html/css/js/이미지를 미리 캐시 목록에 넣는다. 커밋 전에 실행."""
import os, subprocess, hashlib, json
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files=[]
for d,_,fs in os.walk(root):
    rel=os.path.relpath(d,root)
    if rel.startswith(('.git','src','tools','node_modules')): continue
    for f in fs:
        if f=='sw.js' or f.startswith('.'): continue
        if f.rsplit('.',1)[-1].lower() in ('html','css','js','jpg','jpeg','png','svg','webp','json'):
            files.append(os.path.normpath(os.path.join(rel,f)).replace('\\','/'))
files=sorted(('./'+f if not f.startswith('.') else f).replace('./','',1) for f in files)
h=hashlib.md5()
for f in files: h.update(open(os.path.join(root,f),'rb').read())
ver=h.hexdigest()[:10]
sw=f'''/* 부산의 활동수학 축전 · 오프라인 대비 서비스 워커 (tools/build-sw.py 가 생성) */
const VERSION = 'onchun-{ver}';
const PRECACHE = {json.dumps(files, ensure_ascii=False)};
self.addEventListener('install', e => {{
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u).catch(() => {{}})))).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
// 같은 사이트 + 폰트/파이어베이스 SDK: 네트워크 우선, 실패하면 캐시 (최신 유지 + 오프라인 동작)
self.addEventListener('fetch', e => {{
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheable = url.origin === location.origin || /gstatic\\.com|googleapis\\.com|cdnjs\\.cloudflare\\.com|cdn\\.tailwindcss\\.com/.test(url.host);
  if (!cacheable || url.host.includes('firebasedatabase')) return;
  e.respondWith((async () => {{
    const cache = await caches.open(VERSION);
    try {{
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }} catch (err) {{
      const hit = await cache.match(req, {{ ignoreSearch: true }});
      if (hit) return hit;
      if (req.mode === 'navigate') {{ const idx = await cache.match('index.html'); if (idx) return idx; }}
      throw err;
    }}
  }})());
}});
'''
open(os.path.join(root,'sw.js'),'w',encoding='utf-8').write(sw)
print('sw.js', ver, len(files), 'files')
