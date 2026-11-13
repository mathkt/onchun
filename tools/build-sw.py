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
# 처음 접속 때 미리 받는 것은 꼭 필요한 작은 파일만 (사진·책 페이지는 열 때 받음)
CORE=['index.html','common.css','common.js','games/arcade/index.html','games/online.js','challenge/index.html','challenge/stages.js','challenge/layer.js']
core=[f for f in CORE if f in files]
sw=f"""/* 부산의 활동수학 축전 · 서비스 워커 (tools/build-sw.py 가 생성)
   - 받아 둔 파일은 캐시에서 즉시 열기(네트워크를 기다리지 않음)
   - 처음에는 꼭 필요한 파일만 미리 받고, 나머지는 열 때 받아서 저장
   - 새 버전은 파일이 바뀌면 VERSION 이 바뀌어 다음 방문부터 적용 */
const VERSION = 'onchun-{ver}';
const PRECACHE = {json.dumps(core, ensure_ascii=False)};
self.addEventListener('install', e => {{
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(PRECACHE.map(u => fetch(new Request(u, {{ cache: 'reload' }})).then(r => {{ if (r && r.ok) return c.put(new URL(u, self.registration.scope).href, r); }}).catch(() => {{}})))).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
const OFFLINE = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>연결 확인</title><body style="font-family:sans-serif;background:#FDF6DC;color:#2C2A26;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><div><p style="font-size:3rem;margin:0">📶</p><h1 style="font-size:1.3rem">연결이 느리거나 끊겼어요</h1><p>잠시 후 다시 시도해 주세요.</p><button onclick="location.reload()" style="font-size:1.1rem;padding:12px 28px;border-radius:999px;border:0;background:#F5A623;color:#fff">다시 시도</button></div></body></html>';
self.addEventListener('fetch', e => {{
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const ext = /(^|\\.)fonts\\.gstatic\\.com$|(^|\\.)fonts\\.googleapis\\.com$|^www\\.gstatic\\.com$/.test(url.host);   // 글꼴 · Firebase SDK
  if (!same && !ext) return;
  e.respondWith((async () => {{
    const cache = await caches.open(VERSION);
    const key = same ? url.origin + url.pathname.replace(/\\/$/, '/index.html') : req;   // ?game= ?ch= ?v= 는 같은 파일
    const hit = await cache.match(key);
    if (hit) return hit;
    try {{
      const res = await fetch(req);
      if (res && !res.redirected && (res.ok || res.type === 'opaque')) cache.put(key, res.clone()).catch(() => {{}});
      return res;
    }} catch (err) {{
      if (req.mode === 'navigate') return new Response(OFFLINE, {{ status: 503, headers: {{ 'Content-Type': 'text/html; charset=utf-8' }} }});
      throw err;
    }}
  }})());
}});
"""
open(os.path.join(root,'sw.js'),'w',encoding='utf-8').write(sw)
print('sw.js', ver, len(files), 'files (precache', len(core), ')')
