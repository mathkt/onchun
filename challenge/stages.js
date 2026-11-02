/* 🏆 도전 모드 공통 — 도장판(challenge/index.html)과 메인 게임 도전 레이어(challenge/layer.js)가 같이 씀
   · 단계 정의 · 도장 기록(localStorage 'onchun_challenge_v1', 기기마다) · 황금비 퀸 시작 칸 고르기 */
(function () {
  const KEY = 'onchun_challenge_v1', NAME_KEY = 'onchun_name';
  const GAME = {
    nt: { name: '노탁토', g: 'notakto', color: '#F5A623', deep: '#C76A00' },
    st: { name: '돌 가져가기', g: 'stone', color: '#5BB8E8', deep: '#2A7FB0' },
    qn: { name: '황금비 퀸', g: 'queen', color: '#E9533F', deep: '#B53A2A' },
    pp: { name: '팝잇', g: 'popit', color: '#9B6BD6', deep: '#6E44AE' },
  };
  // mission: 카드 한 줄 · cond: 조건 칩
  const STAGES = [
    { id: '1-1', k: 'nt', mission: '선공으로 AI를 이겨라', cond: '3×3 판' },
    { id: '2-1', k: 'st', mission: '선공으로 AI를 이겨라', cond: '돌 14개 · 💣 폭탄', n: 14, mode: 'bomb' },
    { id: '2-2', k: 'st', mission: '선공으로 AI를 이겨라', cond: '돌 26개 · 💎 보석', n: 26, mode: 'gem' },
    // 황금비 퀸: size 판 크기(그런 칸이 없으면 더 큰 판) · target 최선으로 두면 내 몇 번째 수에 구석에 넣는가 — 칩에는 "N×N · " 가 앞에 붙음
    { id: '3-1', k: 'qn', mission: '선공으로 AI를 이겨라', cond: '3수 만에 이길 수 있는 자리', size: 8, target: 3 },
    { id: '3-2', k: 'qn', mission: '선공으로 AI를 이겨라', cond: '4수 만에 이길 수 있는 자리', size: 12, target: 4 },
    { id: '4-1', k: 'pp', mission: '선공으로 AI를 이겨라', cond: '줄 3·4·3', rows: [3, 4, 3] },
    { id: '4-2', k: 'pp', mission: '선공으로 AI를 이겨라', cond: '줄 3·4·5', rows: [3, 4, 5] },
  ];
  const GOAL = 5; // 도장 5개면 상품

  /* ---------- 황금비 퀸: 남은 수(remoteness) — 메인 게임 qnRemote와 같은 계산 (기본 규칙 'last') ---------- */
  function moves(x, y) { const m = []; for (let k = 1; k <= x; k++) m.push([x - k, y]); for (let k = 1; k <= y; k++) m.push([x, y - k]); for (let k = 1; k <= Math.min(x, y); k++) m.push([x - k, y - k]); return m; }
  function remote(N) {
    const W = Array.from({ length: N }, () => new Array(N).fill(false)), R = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let s = 1; s <= 2 * (N - 1); s++) for (let x = 0; x < N; x++) {
      const y = s - x; if (y < 0 || y >= N) continue;
      let minL = Infinity, maxW = 0;
      for (const [a, b] of moves(x, y)) { if (W[a][b]) maxW = Math.max(maxW, R[a][b]); else minL = Math.min(minL, R[a][b]); }
      if (minL < Infinity) { W[x][y] = true; R[x][y] = 1 + minL; } else { W[x][y] = false; R[x][y] = 1 + maxW; }
    }
    return { W, R };
  }
  // 선공(나)이 최선으로 두면 내 3번째 수에 구석에 넣는 칸들
  function fitCells(N, target) {
    const { W, R } = remote(N), c = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x || y) && W[x][y] && Math.ceil(R[x][y] / 2) === target) c.push([x, y]);
    return c;
  }
  // 단계 size 이상에서 그런 칸이 있는 가장 작은 N에서 한 칸 고르기 (avoid: 피할 칸 — 대각선 대칭(x,y)↔(y,x)도 사실상 같은 문제라서 피함)
  function pickCell(size, target, avoid) {
    for (let N = size; N <= 15; N++) {
      const all = fitCells(N, target);
      if (!all.length) continue;
      let c = avoid ? all.filter(([x, y]) => !(x === avoid[0] && y === avoid[1]) && !(x === avoid[1] && y === avoid[0])) : all;
      if (!c.length) c = all;
      return { N, s: c[Math.floor(Math.random() * c.length)] };
    }
    return null;
  }
  // 3-1: 8×8 · 3수 (N, s31) · 3-2: 12×12 · 4수 (N2, s32) — 3-2는 3-1과 다른 칸
  function pickQueen() {
    const a = pickCell(stage('3-1').size, stage('3-1').target) || { N: 8, s: [3, 6] };
    const b = pickCell(stage('3-2').size, stage('3-2').target, a.s) || { N: 12, s: [4, 9] };
    return { N: a.N, s31: a.s, N2: b.N, s32: b.s };
  }
  // 단계별 판 크기·시작 칸
  function queenOf(r, id) { return id === '3-2' ? { N: r.qn.N2, s: r.qn.s32 } : { N: r.qn.N, s: r.qn.s31 }; }

  /* ---------- 기록 ---------- */
  let mem = null; // localStorage를 못 쓰면 메모리에만
  function blank() { return { v: 1, name: '', stamps: {}, loss: {}, qn: pickQueen(), created: Date.now(), seen: 0, fresh: '' }; }
  function load() {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { r = mem; }
    if (!r || typeof r !== 'object' || r.v !== 1) { r = blank(); save(r); }
    if (!r.stamps || typeof r.stamps !== 'object') r.stamps = {};
    if (!r.qn || !Array.isArray(r.qn.s31) || !Array.isArray(r.qn.s32) || !(r.qn.N >= 8) || !(r.qn.N2 >= 12)) { r.qn = pickQueen(); save(r); }
    if (!r.loss || typeof r.loss !== 'object') r.loss = {};
    return r;
  }
  // 승패 뒤 연속으로 진 횟수 (이기면 0) — 돌려주는 값: 지금까지 연속으로 진 횟수
  function result(id, win) {
    const r = load();
    r.loss[id] = win ? 0 : (r.loss[id] || 0) + 1;
    save(r); return r.loss[id];
  }
  function save(r) { mem = r; try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
  function clear() { mem = null; try { localStorage.removeItem(KEY); } catch (e) {} }
  function count(r) { return STAGES.filter(s => r.stamps[s.id]).length; }
  // 도장 찍기: 새로 찍었으면 true
  function stamp(id) {
    const r = load(); if (r.stamps[id]) return false;
    r.stamps[id] = Date.now(); r.fresh = id; save(r); return true;
  }
  function stage(id) { return STAGES.find(s => s.id === id) || null; }
  function getName() { try { return (localStorage.getItem(NAME_KEY) || '').trim(); } catch (e) { return ''; } }
  function setName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) {} }
  function fmtTime(t) { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; }
  function fmtClock(t) { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; }

  /* ---------- 빨간 도장 그림 (SVG) — 잉크 번짐 필터는 inkDefs()를 페이지에 한 번 넣어 둠 ---------- */
  function inkDefs() {
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      <filter id="chInk" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="1" seed="3" result="n2"/>
        <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="holes"/>
        <feComposite in="d" in2="holes" operator="in"/>
      </filter>
      <path id="chArcTop" d="M 20 60 A 40 40 0 0 1 100 60"/>
      <path id="chArcBot" d="M 22 62 A 38 38 0 0 0 98 62"/>
    </defs></svg>`;
  }
  // big: 가운데 큰 글씨 · small: 아래 작은 글씨(단계 번호 등)
  function stampSVG(o) {
    o = o || {};
    const big = o.big || '참 잘했어요', small = o.small || '';
    return `<svg class="ch-stamp-svg" viewBox="0 0 120 120" aria-hidden="true">
      <g filter="url(#chInk)" fill="none" stroke="#D7263D">
        <circle cx="60" cy="60" r="55" stroke-width="5"/>
        <circle cx="60" cy="60" r="47" stroke-width="1.6"/>
        <text font-family="Jua, 'Noto Sans KR', sans-serif" font-size="11" fill="#D7263D" stroke="none" letter-spacing="1.5"><textPath href="#chArcTop" startOffset="50%" text-anchor="middle">★ 부산 활동수학 축전 ★</textPath></text>
        <text x="60" y="58" text-anchor="middle" font-family="Jua, 'Noto Sans KR', sans-serif" font-size="17" fill="#D7263D" stroke="none">${big}</text>
        <path d="M47 71 l8 8 l19 -17" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${small ? `<text x="60" y="98" text-anchor="middle" font-family="Jua, 'Noto Sans KR', sans-serif" font-size="10" fill="#D7263D" stroke="none">${small}</text>` : ''}
      </g>
    </svg>`;
  }

  window.CH = { KEY, GAME, STAGES, GOAL, LEARN_EVERY: 4, stage, load, save, clear, count, stamp, result, pickQueen, queenOf, fitCells, getName, setName, fmtTime, fmtClock, inkDefs, stampSVG };
})();
