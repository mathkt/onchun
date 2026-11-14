#!/usr/bin/env python3
"""ta/qrs.js 생성: 조교와의 대결 QR(조교 번호 4개 + 처음 화면)을 SVG path 로 미리 만들어 둔다. (pip install qrcode)
   주소가 바뀌면 BASE 를 고치고 다시 실행 → tools/build-sw.py 도 다시 실행."""
import os, json, qrcode
BASE = 'https://mathkt.github.io/onchun/ta/'
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def path(url):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0, box_size=1)
    q.add_data(url); q.make(fit=True)
    m = q.get_matrix(); n = len(m); d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                x0 = x
                while x < n and row[x]: x += 1
                d.append(f'M{x0} {y}h{x - x0}v1h-{x - x0}z')
            else: x += 1
    return {'n': n, 'd': ''.join(d)}
out = {'home': path(BASE)}
for c in ('1111', '2222', '3333', '4444'): out[c] = path(BASE + '?j=' + c)
js = ("/* 🎓 조교와의 대결 QR (tools/build-ta-qr.py 가 생성) — n: 한 변 칸 수, d: SVG path. home = " + BASE + " · 번호 = " + BASE + "?j=번호 */\n"
      "window.TA_QR = " + json.dumps(out, separators=(',', ':')) + ";\n"
      "/* TA_QR_SVG('1111') → <svg> 문자열 (흰 바탕 + 여백 2칸) */\n"
      "window.TA_QR_SVG = function (k, cls) { var q = window.TA_QR[k]; if (!q) return ''; var n = q.n + 4;\n"
      "  return '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 ' + n + ' ' + n + '\" shape-rendering=\"crispEdges\" role=\"img\" aria-label=\"QR 코드\"' + (cls ? ' class=\"' + cls + '\"' : '') + '><rect x=\"-2\" y=\"-2\" width=\"' + n + '\" height=\"' + n + '\" fill=\"#fff\"/><path fill=\"#000\" d=\"' + q.d + '\"/></svg>'; };\n")
open(os.path.join(root, 'ta', 'qrs.js'), 'w', encoding='utf-8').write(js)
print('ta/qrs.js', {k: v['n'] for k, v in out.items()}, len(js), 'bytes')
