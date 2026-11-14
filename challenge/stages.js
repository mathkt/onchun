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
  // label: 카드·상단바에 보이는 단계 이름(중/상) — id는 저장 호환용으로 그대로 · glyph: 도장 가운데 그림 종류
  // 돌 가져가기: n 돌 개수(없으면 nRange에서 랜덤) · mode 폭탄/보석 — 최대 개수는 판마다 3~5 랜덤, 선공(나)이 이기는 판만
  // 황금비 퀸: size 판 크기(그런 칸이 없으면 더 큰 판) · target 최선으로 두면 내 몇 번째 수에 구석에 넣는가
  // 팝잇: rows 고정 줄(hard면 도장판 카드 그림에만 씀) · hard: 판마다 어려운 랜덤 판(선공 승리, 이기는 수 1~2개)
  const STAGES = [
    { id: '1-1', label: '1(중)', k: 'nt', glyph: 'x' },
    { id: '2-1', label: '2(중)', k: 'st', n: 14, mode: 'bomb', glyph: 'bomb' },
    { id: '2-2', label: '2(상)', k: 'st', nRange: [20, 30], mode: 'gem', glyph: 'gem' },
    { id: '3-1', label: '3(중)', k: 'qn', size: 8, target: 3, glyph: 'queen' },
    { id: '3-2', label: '3(상)', k: 'qn', size: 12, target: 4, glyph: 'queenstar' },
    { id: '4-1', label: '4(중)', k: 'pp', rows: [3, 4, 3], glyph: 'bubble' },
    { id: '4-2', label: '4(상)', k: 'pp', rows: [3, 4, 5], hard: true, glyph: 'bubbles' },
  ];
  function label(id) { const S = stage(id); return S ? S.label : String(id); }
  function cardTitle(id) { const S = stage(id); return S ? `${S.label} ${GAME[S.k].name}` : String(id); }
  // 칭호(도장 수) · 축하 말(새 도장 수마다 한 번)
  const TITLES = [[6, '🏆', '필즈상 후보'], [4, '🧠', '수학자'], [2, '🔥', '전략가'], [0, '🌱', '수학 새싹']];
  function title(n) { const t = TITLES.find(t => n >= t[0]); return { ico: t[1], name: t[2], text: t[1] + ' ' + t[2] }; }
  const CELEB = { 1: ['🎉', '첫 도장! 시작이 반이에요'], 2: ['✨', '감 잡았네요!'], 3: ['🔥', 'AI가 긴장하기 시작했어요'], 4: ['💪', '하나만 더! 상품이 보여요'],
    5: ['🎆', '전략가시네요! 🎁 상품 받으러 가세요'], 6: ['🏅', '수학자예요? AI가 두 손 들었어요'], 7: ['🏆', '미래 필즈상 대상자입니다! 전 미션 클리어'] };
  // AI의 한마디
  const AI_SAY = { win: ['졌다… 다음엔 안 봐줘 😤', '어떻게 알았지?!', '내 계산이 틀렸다고…?', '인정. 잘 뒀어 👏'], lose: ['아직 멀었어 😏', '한 수 더 생각해 봐', '이 판은 내가 가져갈게', '필승 전략, 알고 있어?'] };
  function aiSay(win) { const a = AI_SAY[win ? 'win' : 'lose']; return a[Math.floor(Math.random() * a.length)]; }
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
  // 판을 시작할 때마다 새 시작 칸 — 바로 전 판의 칸(과 그 대칭)은 피함. 고른 칸은 r.qn[id]에 적어 둠 (다음 판에서 피하려고)
  const QN_FALLBACK = { '3-1': { N: 8, s: [3, 6] }, '3-2': { N: 12, s: [4, 9] } };
  function nextQueen(id) {
    const S = stage(id), r = load(), prev = Array.isArray(r.qn[id]) ? r.qn[id] : null;
    const q = pickCell(S.size, S.target, prev) || QN_FALLBACK[id];
    r.qn[id] = q.s.slice(); save(r);
    return { N: q.N, s: q.s.slice() };
  }

  /* ---------- 돌 가져가기: 판마다 돌 개수·최대 개수 뽑기 (선공이 이기는 판만) ---------- */
  // 지는 개수: 폭탄 (n-1) % (L+1) === 0 · 보석 n % (L+1) === 0 — 메인 게임 stIsLosingN과 같음
  function stLosing(n, L, mode) { return mode === 'bomb' ? (n - 1) % (L + 1) === 0 : n % (L + 1) === 0; }
  function nextStone(id) {
    const S = stage(id), rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    let n = S.n || 20, limit = 3;
    for (let i = 0; i < 200; i++) {
      n = S.n || rnd(S.nRange[0], S.nRange[1]); limit = rnd(3, 5);
      if (!stLosing(n, limit, S.mode)) break;
    }
    return { n, limit };
  }

  /* ---------- 팝잇 4(상): 판마다(첫 판·다시하기 모두) 어려운 랜덤 판 (선공 승리 = XOR ≠ 0) ---------- */
  // 선공이 이기는 수(줄 i에서 k개 가져가면 XOR이 0이 되는 수)의 개수 — 메인 게임의 필승 수 판정과 같음
  function ppWinMoves(rows) {
    const x = rows.reduce((a, b) => a ^ b, 0); let c = 0;
    for (let i = 0; i < rows.length; i++) for (let k = 1; k <= rows[i]; k++) if ((x ^ rows[i] ^ (rows[i] - k)) === 0) c++;
    return c;
  }
  // 3~5줄 · 줄마다 2~7개 · XOR ≠ 0 · 서로 다른 값 3개 이상 · 합 12 이상 · "어려움" = 이기는 수가 1~2개뿐
  // (조건을 만족하는 판이 전체의 약 10%라 금방 뽑힘 · 못 뽑으면 3·4·5 — XOR 2, 이기는 수 1개로 조건 만족)
  function hardRows() {
    for (let i = 0; i < 2000; i++) {
      const k = 3 + Math.floor(Math.random() * 3), rows = Array.from({ length: k }, () => 2 + Math.floor(Math.random() * 6));
      const x = rows.reduce((a, b) => a ^ b, 0), total = rows.reduce((a, b) => a + b, 0);
      if (x !== 0 && new Set(rows).size >= 3 && total >= 12 && ppWinMoves(rows) <= 2) return rows;
    }
    return [3, 4, 5];
  }
  function nextPopit(id) {
    const S = stage(id);
    return S.hard ? hardRows() : S.rows.slice();
  }

  /* ---------- 기록 ---------- */
  let mem = null; // localStorage를 못 쓰면 메모리에만
  // stamps[id] 도장 찍은 시각 · loss[id] 연속으로 진 횟수 · att[id] 끝까지 둔 판 수 · winAt[id] 몇 번째 판에 도장 · sec[id] 도장 받은 판의 걸린 초 · perfect[id] 최소 수 승리
  // celebrated 축하창을 띄운 도장 수 · seen 상품창을 본 도장 수 · qn[id] 황금비 퀸 바로 전 판의 시작 칸 · guided 첫 안내 창을 봄
  function blank() { return { v: 1, name: '', stamps: {}, loss: {}, att: {}, winAt: {}, sec: {}, perfect: {}, celebrated: 0, qn: {}, created: Date.now(), seen: 0, fresh: '', guided: false, rules: {} }; }   // rules[게임] = 규칙 창을 다시 안 보기
  function load() {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { r = mem; }
    if (!r || typeof r !== 'object' || r.v !== 1) { r = blank(); save(r); }
    if (!r.stamps || typeof r.stamps !== 'object') r.stamps = {};
    if (!r.qn || typeof r.qn !== 'object' || Array.isArray(r.qn)) r.qn = {};
    for (const k of ['loss', 'att', 'winAt', 'sec', 'perfect']) if (!r[k] || typeof r[k] !== 'object') r[k] = {};
    if (!(r.celebrated >= 0)) r.celebrated = 0;
    return r;
  }
  // 승패 뒤 연속으로 진 횟수 (이기면 0) — 돌려주는 값: 지금까지 연속으로 진 횟수. 끝까지 둔 판 수(att)도 하나 올림
  function result(id, win) {
    const r = load();
    r.loss[id] = win ? 0 : (r.loss[id] || 0) + 1;
    r.att[id] = (r.att[id] || 0) + 1;
    save(r); return r.loss[id];
  }
  function save(r) { mem = r; try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
  function clear() { mem = null; try { localStorage.removeItem(KEY); } catch (e) {} }
  function count(r) { return STAGES.filter(s => r.stamps[s.id]).length; }
  // 도장 찍기: 새로 찍었으면 true. o: { sec 걸린 초, perfect 최소 수 승리, att 몇 번째 판 } — result() 보다 먼저 불리므로 att는 +1 해서 받음
  function stamp(id, o) {
    const r = load(); if (r.stamps[id]) return false;
    o = o || {};
    r.stamps[id] = Date.now(); r.fresh = id;
    r.winAt[id] = o.att || (r.att[id] || 0) + 1;
    if (o.sec >= 0) r.sec[id] = Math.round(o.sec);
    if (o.perfect) r.perfect[id] = true;
    save(r); return true;
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
  // 도장 가운데 그림 (단계마다 다름) — 빨간 단색, 잉크 번짐 필터 안
  const GLYPH = {
    x: `<path d="M44 42l32 32M76 42l-32 32" stroke-width="9" stroke-linecap="round"/>`,
    bomb: `<circle cx="58" cy="63" r="19" fill="#D7263D" stroke="none"/><path d="M68 48l6-8" stroke-width="5" stroke-linecap="round"/><path d="M72 40q4-6 10-3" stroke-width="3.5" stroke-linecap="round"/><circle cx="84" cy="34" r="3" fill="#D7263D" stroke="none"/><path d="M50 57q2-7 9-9" stroke="#FFFDF6" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
    gem: `<path d="M44 52l8-11h16l8 11-16 23z" fill="#D7263D" stroke="none"/><path d="M44 52h32M52 41l6 11 2-11M68 41l-6 11-2-11M52 52l8 23M68 52l-8 23" stroke="#FFFDF6" stroke-width="1.8" opacity=".75"/>`,
    queen: `<text x="60" y="76" text-anchor="middle" font-family="'Noto Sans KR','Segoe UI Symbol',sans-serif" font-size="42" fill="#D7263D" stroke="none">♛</text>`,
    queenstar: `<text x="60" y="78" text-anchor="middle" font-family="'Noto Sans KR','Segoe UI Symbol',sans-serif" font-size="38" fill="#D7263D" stroke="none">♛</text><path d="M60 30l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#D7263D" stroke="none"/>`,
    bubble: `<circle cx="60" cy="60" r="19" fill="#D7263D" stroke="none"/><circle cx="53" cy="53" r="5" fill="#FFFDF6" stroke="none" opacity=".8"/>`,
    bubbles: `<circle cx="43" cy="61" r="11" fill="#D7263D" stroke="none"/><circle cx="60" cy="61" r="11" fill="#D7263D" stroke="none"/><circle cx="77" cy="61" r="11" fill="#D7263D" stroke="none"/><circle cx="39" cy="57" r="3" fill="#FFFDF6" stroke="none" opacity=".8"/><circle cx="56" cy="57" r="3" fill="#FFFDF6" stroke="none" opacity=".8"/><circle cx="73" cy="57" r="3" fill="#FFFDF6" stroke="none" opacity=".8"/>`,
  };
  // stage: 단계 번호(그림 종류·아래 글씨) · big: 그림 대신 가운데 큰 글씨 · small: 아래 작은 글씨
  function stampSVG(o) {
    o = o || {};
    const st = o.stage ? stage(o.stage) : null;
    const small = o.small != null ? o.small : (st ? '도전 ' + st.label : '');
    const mid = st && GLYPH[st.glyph] ? GLYPH[st.glyph]
      : `<text x="60" y="58" text-anchor="middle" font-family="Jua, 'Noto Sans KR', sans-serif" font-size="17" fill="#D7263D" stroke="none">${o.big || '참 잘했어요'}</text><path d="M47 71 l8 8 l19 -17" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<svg class="ch-stamp-svg" viewBox="0 0 120 120" aria-hidden="true">
      <g filter="url(#chInk)" fill="none" stroke="#D7263D">
        <circle cx="60" cy="60" r="55" stroke-width="5"/>
        <circle cx="60" cy="60" r="47" stroke-width="1.6"/>
        <text font-family="Jua, 'Noto Sans KR', sans-serif" font-size="11" fill="#D7263D" stroke="none" letter-spacing="1.5"><textPath href="#chArcTop" startOffset="50%" text-anchor="middle">★ 부산 활동수학 축전 ★</textPath></text>
        ${mid}
        ${small ? `<text x="60" y="98" text-anchor="middle" font-family="Jua, 'Noto Sans KR', sans-serif" font-size="10" fill="#D7263D" stroke="none">${small}</text>` : ''}
      </g>
    </svg>`;
  }

  window.CH = { KEY, GAME, STAGES, GOAL, CELEB, LEARN_EVERY: 4, stage, label, cardTitle, title, aiSay, load, save, clear, count, stamp, result, nextQueen, nextStone, nextPopit, hardRows, ppWinMoves, fitCells, getName, setName, fmtTime, fmtClock, inkDefs, stampSVG };
})();
