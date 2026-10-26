/* 아주 작은 다면체 3D 뷰어 (SVG, 드래그 회전) — 11·12·13장 공용 */
const Poly3D = (() => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const sub = (a, b) => a.map((x, i) => x - b[i]), add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map(x => x * k);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

  /* ---- 정다면체 (꼭짓점, 면: 바깥쪽에서 볼 때 반시계) ---- */
  function orient(V, F) { // 면 방향을 중심에서 바깥으로 통일
    return F.map(f => { const c = f.reduce((s, i) => add(s, V[i]), [0, 0, 0]).map(x => x / f.length); const n = cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]])); return dot(n, c) < 0 ? [...f].reverse() : f; });
  }
  function hullFaces(V) { // 볼록 껍질 (작은 n용, O(n^4)) — 공면 삼각형은 다각형으로 합침
    const n = V.length, tris = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      const nn = cross(sub(V[j], V[i]), sub(V[k], V[i])); if (Math.hypot(...nn) < 1e-9) continue; const d = dot(nn, V[i]); let pos = 0, neg = 0;
      for (let m = 0; m < n; m++) { const s = dot(nn, V[m]) - d; if (s > 1e-7) pos++; else if (s < -1e-7) neg++; } if (pos && neg) continue; tris.push({ n: pos ? nn.map(x => -x) : nn, d: pos ? -d : d, i: [i, j, k] }); }
    // 같은 평면끼리 묶어 다각형으로
    const planes = []; tris.forEach(t => { const nn = norm(t.n); const dd = t.d / Math.hypot(...t.n); let p = planes.find(q => Math.abs(dot(q.n, nn) - 1) < 1e-6 && Math.abs(q.d - dd) < 1e-6); if (!p) { p = { n: nn, d: dd, ids: new Set() }; planes.push(p); } t.i.forEach(x => p.ids.add(x)); });
    return planes.map(p => { const ids = [...p.ids]; const c = ids.reduce((s, i) => add(s, V[i]), [0, 0, 0]).map(x => x / ids.length); const u = norm(sub(V[ids[0]], c)); const w = cross(p.n, u); ids.sort((a, b) => Math.atan2(dot(sub(V[a], c), w), dot(sub(V[a], c), u)) - Math.atan2(dot(sub(V[b], c), w), dot(sub(V[b], c), u))); return ids; });
  }
  const P = {};
  P.tetra = (() => { const V = [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v => mul(v, 1 / Math.sqrt(3))); return { V, F: hullFaces(V) }; })();
  P.cube = (() => { const V = []; for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) V.push(mul([x,y,z], 1 / Math.sqrt(3))); return { V, F: hullFaces(V) }; })();
  P.octa = (() => { const V = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]; return { V, F: hullFaces(V) }; })();
  P.ico = (() => { const V = []; for (const a of [-1,1]) for (const b of [-phi,phi]) { V.push([0,a,b]); V.push([a,b,0]); V.push([b,0,a]); } const s = 1 / Math.hypot(1, phi); return { V: V.map(v => mul(v, s)), F: hullFaces(V.map(v => mul(v, s))) }; })();
  P.dodeca = (() => { const V = []; for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) V.push([x,y,z]); for (const a of [-1/phi,1/phi]) for (const b of [-phi,phi]) { V.push([0,a,b]); V.push([a,b,0]); V.push([b,0,a]); } const s = 1 / Math.sqrt(3); return { V: V.map(v => mul(v, s)), F: hullFaces(V.map(v => mul(v, s))) }; })();

  /* ---- 변형: 깎기(t), 부풀리기 등 ---- */
  function edgesOf(F) { const E = new Set(); F.forEach(f => f.forEach((a, i) => { const b = f[(i + 1) % f.length]; E.add(a < b ? a + '-' + b : b + '-' + a); })); return [...E].map(e => e.split('-').map(Number)); }
  function truncate(p, t) { // 각 모서리 양 끝에서 t 지점 → 새 꼭짓점, 볼록껍질로 면 재구성
    const V = []; edgesOf(p.F).forEach(([a, b]) => { V.push(add(p.V[a], mul(sub(p.V[b], p.V[a]), t))); if (t !== .5) V.push(add(p.V[b], mul(sub(p.V[a], p.V[b]), t))); });
    const s = 1 / Math.max(...V.map(v => Math.hypot(...v))); const VV = V.map(v => mul(v, s)); return { V: VV, F: hullFaces(VV) }; }
  function expand(p, k) { // 면을 바깥으로 밀어내기 (부풀리기: 마름모육팔면체 등)
    const V = []; p.F.forEach(f => { const c = f.reduce((s, i) => add(s, p.V[i]), [0,0,0]).map(x => x / f.length); const n = norm(c); f.forEach(i => V.push(add(p.V[i], mul(n, k)))); });
    const s = 1 / Math.max(...V.map(v => Math.hypot(...v))); const VV = V.map(v => mul(v, s)); return { V: VV, F: hullFaces(VV) }; }
  const t3 = 1 / 3, tOcta = 1 / 3, tCube = 1 / (2 + Math.sqrt(2)), tDod = 1 / (2 + phi), tIco = 1 / 3;
  const CAT = {
    '정사면체': () => P.tetra, '정육면체': () => P.cube, '정팔면체': () => P.octa, '정십이면체': () => P.dodeca, '정이십면체': () => P.ico,
    '깎은 정사면체 (3,6,6)': () => truncate(P.tetra, t3), '깎은 정육면체 (3,8,8)': () => truncate(P.cube, tCube), '깎은 정팔면체 (4,6,6)': () => truncate(P.octa, tOcta),
    '깎은 정십이면체 (3,10,10)': () => truncate(P.dodeca, tDod), '깎은 정이십면체 (5,6,6)': () => truncate(P.ico, tIco),
    '육팔면체 (3,4,3,4)': () => truncate(P.cube, .5), '십이이십면체 (3,5,3,5)': () => truncate(P.dodeca, .5),
    '부풀린 육팔면체 (3,4,4,4)': () => expand(P.cube, .65 / Math.sqrt(3) * 1.0), '부풀린 십이이십면체 (3,4,5,4)': () => expand(P.dodeca, .42),
    '깎은 육팔면체 (4,6,8)': () => truncate(truncate(P.cube, .5), .3), '깎은 십이이십면체 (4,6,10)': () => truncate(truncate(P.dodeca, .5), .3),
  };
  const cache = {}; const get = name => cache[name] || (cache[name] = CAT[name]());

  /* ---- 뷰어 ---- */
  function viewer(svg, opts = {}) {
    let poly = null, rx = -.5, ry = .6, drag = null, extra = null; const size = opts.size || 300, R = size * .4;
    function rot(v) { const [x, y, z] = v; const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx); const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx; return [x1, y2, z2]; }
    function proj(v) { const d = 3.2; const s = d / (d - v[2]); return [size / 2 + v[0] * R * s, size / 2 - v[1] * R * s]; }
    function draw() { if (!poly) return; const RV = poly.V.map(rot); const faces = poly.F.map(f => { const n = cross(sub(RV[f[1]], RV[f[0]]), sub(RV[f[2]], RV[f[0]])); const z = f.reduce((s, i) => s + RV[i][2], 0) / f.length; return { f, n: norm(n), z }; }).sort((a, b) => a.z - b.z);
      const light = norm([.4, .7, 1]); let h = '';
      faces.forEach(({ f, n }) => { const front = n[2] > 0; const k = Math.max(0, dot(n, light)); const col = opts.color ? opts.color(f.length) : [.98, .66, .14]; const shade = .45 + .55 * k; const fill = `rgb(${col.map(c => Math.round(c * 255 * shade)).join(',')})`; const pts = f.map(i => proj(RV[i]).join(',')).join(' ');
        h += `<polygon points="${pts}" fill="${front ? fill : '#fff'}" fill-opacity="${front ? .96 : .08}" stroke="${front ? '#2C2A26' : '#bbb'}" stroke-width="${front ? 1.6 : .8}" stroke-dasharray="${front ? '' : '4 3'}" stroke-linejoin="round"/>`; });
      if (extra) h += extra(RV, proj); svg.innerHTML = h; }
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    let down = null, moved = false, spin = null;
    svg.style.touchAction = 'none';
    svg.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; down = [e.clientX, e.clientY]; moved = false; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', e => { if (!drag) return; if (!moved && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) return; if (!moved && spin) { clearInterval(spin); spin = null; } moved = true; ry += (e.clientX - drag[0]) * .01; rx += (e.clientY - drag[1]) * .01; drag = [e.clientX, e.clientY]; draw(); });
    // 탭(드래그 없이 떼기) → 그 자리의 요소를 'poly-pick' 이벤트로 알려 줌 (extra()로 그린 .edge 등 선택용)
    svg.addEventListener('pointerup', e => { const wasTap = drag && !moved; drag = null; if (wasTap) { const el = document.elementFromPoint(e.clientX, e.clientY); svg.dispatchEvent(new CustomEvent('poly-pick', { detail: { target: el, x: e.clientX, y: e.clientY } })); } });
    svg.addEventListener('pointercancel', () => drag = null);
    return { set(p, ex) { poly = p; extra = ex || null; draw(); }, redraw: draw, get poly() { return poly; }, spin(on) { clearInterval(spin); if (on) spin = setInterval(() => { ry += .012; draw(); }, 40); }, setAngles(a, b) { rx = a; ry = b; draw(); } };
  }
  const stats = p => ({ V: p.V.length, E: edgesOf(p.F).length, F: p.F.length, faces: p.F.reduce((m, f) => { m[f.length] = (m[f.length] || 0) + 1; return m; }, {}) });
  return { P, CAT, get, viewer, stats, edgesOf, truncate, expand, hullFaces, add, sub, mul, norm, cross, dot };
})();
