/* 🎓 조교와의 대결 레이어 — 메인 게임(games/arcade/index.html) 맨 끝에서, 주소에 ?ta=host|join&c=번호 가 있을 때만 불림.
   · 조교(host): 고정 번호 방(rooms/T1111·T2222·T3333·T4444)을 열고 기다림 → 도전자가 들어오면 게임을 골라 줌 → 가위바위보 → 대결
   · 도전자(join): 그 방에 들어가 조교가 게임을 고르기를 기다림
   · 판 진행(가위바위보·수 주고받기·무르기 요청·제한시간)은 원래 온라인 대전 그대로. 이 파일은 방 열기/들어가기, 화면, 결과, 나감 처리만 맡음
   · 상대가 나가도 AI가 대신 두지 않음 — 조교는 대기 화면으로, 도전자는 안내 화면으로
   · 방 데이터: games/online.js 의 openTa / joinTa 설명 참고 (진행 상태는 settings 안에만: {ta, sid, phase, game, …게임 설정}) */
(function () {
  const q = new URLSearchParams(location.search);
  const role = q.get('ta'), code = (q.get('c') || '').trim();
  if (role !== 'host' && role !== 'join') return;
  const LANDING = '../../ta/index.html', HOME = '../../index.html', PROMO = '../../ta/promo.html';
  const CODES = ['1111', '2222', '3333', '4444'];
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  if (!CODES.includes(code)) { location.replace(LANDING); return; }
  const isHost = role === 'host', NO = CODES.indexOf(code) + 1;
  if (isHost && lsGet('onchun_ta_ok') !== '1') { location.replace(LANDING); return; }          // 조교 비밀번호를 거치지 않은 기기
  if (!isHost && !getMyName()) { location.replace(LANDING + '?j=' + code); return; }            // 닉네임부터
  // 예전 online.js 가 기기에 저장돼 있으면(서비스 워커 캐시) 조교 방 기능이 없음 → 저장분을 지우고 한 번만 새로 받음
  if (typeof Online.openTa !== 'function') {
    let tried = false; try { tried = sessionStorage.getItem('onchun_ta_reload') === '1'; sessionStorage.setItem('onchun_ta_reload', '1'); } catch (e) { tried = true; }
    if (tried) { location.replace(LANDING); return; }
    (async () => { try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.unregister(); } catch (e) {} try { for (const k of await caches.keys()) await caches.delete(k); } catch (e) {} location.reload(); })();
    return;
  }
  const taName = lsGet('onchun_ta_name').trim().slice(0, 6);
  const TA_I = '조교 ' + NO + (NO % 2 ? '이' : '가');                    // 조교 1이 · 조교 2가 · 조교 3이 · 조교 4가
  const hostLabel = '조교 ' + NO + (taName ? ' · ' + taName : '');     // 화면 안내용
  const hostRoomName = '조교' + NO + (taName ? ' ' + taName : '');      // 방에 쓰는 이름 (게임 화면 이름표)
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GM = {
    notakto: { p: 'nt', N: 'Nt', name: '노탁토', ico: '❌', c: '#F5A623', d: '#C76A00', s: '#FFF1DC' },
    stone:   { p: 'st', N: 'St', name: '돌 가져가기', ico: '💣', c: '#2F8FC9', d: '#1F6FA3', s: '#E6F3FB' },
    queen:   { p: 'qn', N: 'Qn', name: '황금비 퀸', ico: '👑', c: '#E9533F', d: '#B53A2A', s: '#FDE8EC' },
    popit:   { p: 'pp', N: 'Pp', name: '팝잇', ico: '🟣', c: '#8E5CC9', d: '#5A3496', s: '#F1E8FB' },
  };
  const GORDER = ['notakto', 'stone', 'queen', 'popit'];
  // phase: conn(여는 중) · wait(조교 대기) · pick(게임 고르기) · gwait(도전자: 고르기를 기다림) · play · stop(안내 화면)
  const T = { role, code, on: true, phase: 'conn', opp: '', sid: '', offline: false, lastWin: null, played: 0 };
  window.TA_MODE = role; window.TA = T;

  /* ---------- 모양 ---------- */
  const css = document.createElement('style');
  css.textContent = `
    body.ta-mode #home-screen, body.ta-mode [id$="-menu-screen"], body.ta-mode [id$="-analysis-screen"], body.ta-mode #top-up-games, body.ta-mode .bk-top__sub,
    body.ta-mode .action-buttons.ab-game .back-btn, body.ta-mode .action-buttons.ab-game [id$="-restart-btn"], body.ta-mode [id$="-resume-analysis-btn"] { display:none !important; }
    body.ta-mode.ta-panel main { display:none !important; }
    body.ta-guest .ta-only-host, body.ta-host .ta-only-guest { display:none !important; }
    #ta-screen { display:none; position:relative; z-index:10; box-sizing:border-box; width:100%; max-width:1100px; margin:0 auto; padding:clamp(10px,2.4vh,22px) 16px max(16px,env(safe-area-inset-bottom));
      min-height:calc(100dvh - var(--bk-top-h, 56px)); flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:'Noto Sans KR',sans-serif; color:#2C2A26; word-break:keep-all; overflow-wrap:anywhere; }
    body.ta-panel #ta-screen { display:flex; }
    body.ta-mode.ta-panel { background-color:#FDF6DC; background-image:linear-gradient(rgba(91,184,232,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(91,184,232,.14) 1px,transparent 1px); background-size:22px 22px; }
    .ta-j { font-family:'Jua','Noto Sans KR',sans-serif; font-weight:400; }
    .ta-btn { font-family:'Jua','Noto Sans KR',sans-serif; font-size:1.08rem; min-height:50px; padding:8px 20px 6px; border-radius:16px; cursor:pointer; border:2.5px solid #F5A623; background:#fff; color:#2C2A26;
      box-shadow:0 4px 0 #E8891B; display:inline-flex; align-items:center; justify-content:center; gap:6px; -webkit-tap-highlight-color:transparent; touch-action:manipulation; text-decoration:none; white-space:nowrap; }
    .ta-btn:active { transform:translateY(3px); box-shadow:0 1px 0 #E8891B; }
    .ta-btn--main { background:#F5A623; color:#fff; }
    .ta-btn--ghost { border-color:#E7DFC9; box-shadow:0 4px 0 #d8cfb3; color:#5F5B55; } .ta-btn--ghost:active { box-shadow:0 1px 0 #d8cfb3; }
    .ta-btn--red { border-color:#E9533F; box-shadow:0 4px 0 #B53A2A; background:#E9533F; color:#fff; } .ta-btn--red:active { box-shadow:0 1px 0 #B53A2A; }
    .ta-btn--sm { font-size:.95rem; min-height:42px; padding:6px 14px 4px; border-radius:13px; }
    .ta-row { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
    .ta-badge { display:inline-flex; align-items:center; gap:6px; max-width:100%; background:#fff; border:2.5px solid #2C2A26; border-radius:999px; padding:4px 18px 2px; font-family:'Jua',sans-serif; font-size:clamp(1.05rem,2.6vw,1.5rem); box-shadow:3px 3px 0 #2C2A26; }
    .ta-dots::after { content:"…"; display:inline-block; width:1.2em; text-align:left; animation:taDots 1.5s steps(4,end) infinite; clip-path:inset(0 100% 0 0); }
    @keyframes taDots { to { clip-path:inset(0 -10% 0 0); } }

    /* 조교 대기 화면 */
    .ta-wait { width:100%; display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); align-items:center; gap:clamp(12px,2.4vh,24px) clamp(16px,4vw,56px); }
    .ta-wait__l { display:flex; flex-direction:column; align-items:center; gap:clamp(4px,1.2vh,12px); min-width:0; }
    .ta-wait__lab { font-family:'Jua',sans-serif; font-size:clamp(1rem,2.2vw,1.35rem); color:#5F5B55; margin-top:4px; }
    .ta-num { font-family:'Jua',sans-serif; font-size:clamp(5rem,15.5vw,11.5rem); line-height:.95; letter-spacing:.04em; color:#E9533F; -webkit-text-stroke:clamp(7px,.9vw,12px) #2C2A26; paint-order:stroke fill;
      text-shadow:clamp(4px,.5vw,7px) clamp(4px,.5vw,7px) 0 #FFE27A; padding:.04em .08em 0; }
    .ta-wait__st { font-family:'Jua',sans-serif; font-size:clamp(1.25rem,3.2vw,2rem); color:#2C2A26; }
    .ta-wait__how { margin:0; font-size:clamp(.88rem,1.9vw,1.08rem); font-weight:700; color:#5F5B55; background:rgba(255,255,255,.88); border:1.5px dashed #E7DFC9; border-radius:14px; padding:6px 14px; line-height:1.5; }
    .ta-wait__how b { color:#c93f2e; }
    .ta-wait__r { display:flex; flex-direction:column; align-items:center; gap:8px; min-width:0; }
    .ta-qr { background:#fff; border:4px solid #2C2A26; border-radius:26px; padding:clamp(8px,1.4vw,16px); box-shadow:7px 7px 0 #F5A623; line-height:0; }
    .ta-qr svg { display:block; width:min(44vh,30vw,340px); height:auto; }
    .ta-qr__cap { font-family:'Jua',sans-serif; font-size:clamp(.95rem,2vw,1.25rem); color:#1e6f9c; }
    .ta-wait__btns { grid-column:1 / -1; }
    .ta-tm { font-size:.86rem; font-weight:800; color:#5F5B55; }

    /* 게임 고르기 (조교) · 기다리기 (도전자) */
    .ta-pick { width:100%; display:flex; flex-direction:column; align-items:center; gap:clamp(8px,2vh,18px); }
    .ta-pick__h { margin:0; font-family:'Jua',sans-serif; font-weight:400; font-size:clamp(1.6rem,4.6vw,2.8rem); line-height:1.2; }
    .ta-pick__h b { font-weight:400; color:#c93f2e; background:linear-gradient(transparent 58%,#FFE27A 58%); padding:0 4px; }
    .ta-pick__p { margin:0; font-family:'Jua',sans-serif; font-size:clamp(1rem,2.4vw,1.35rem); color:#5F5B55; }
    .ta-games { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:clamp(10px,1.8vw,18px); width:100%; }
    .ta-game { --c:#F5A623; --d:#C76A00; --s:#FFF1DC; display:flex; flex-direction:column; gap:8px; min-width:0; }
    .ta-game__go { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:clamp(120px,26vh,210px); padding:14px 8px 10px; border-radius:24px; border:3px solid var(--c);
      background:#fff; color:#2C2A26; cursor:pointer; box-shadow:0 7px 0 var(--d), 0 10px 30px rgba(90,70,20,.12); font-family:'Jua',sans-serif; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
    .ta-game__go::before { content:""; position:absolute; left:0; right:0; top:0; height:10px; background:var(--c); }
    .ta-game__go:active { transform:translateY(5px); box-shadow:0 2px 0 var(--d); }
    .ta-game__go .i { font-size:clamp(2rem,5vw,3rem); line-height:1.15; }
    .ta-game__go .n { font-size:clamp(1.25rem,3.4vw,1.9rem); line-height:1.15; }
    .ta-game__go .s { font-family:'Noto Sans KR',sans-serif; font-size:clamp(.7rem,1.5vw,.84rem); font-weight:800; color:var(--d); background:var(--s); border-radius:999px; padding:2px 10px; margin-top:4px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ta-game__set { font:800 .84rem 'Noto Sans KR',sans-serif; min-height:38px; border-radius:12px; border:2px solid var(--c); background:var(--s); color:var(--d); cursor:pointer; touch-action:manipulation; }
    .ta-chips { display:flex; flex-wrap:wrap; gap:8px 10px; justify-content:center; }
    .ta-chip { --c:#F5A623; --d:#C76A00; font-family:'Jua',sans-serif; font-size:clamp(1rem,2.6vw,1.3rem); color:#fff; background:var(--c); border:2.5px solid #2C2A26; border-radius:999px; padding:4px 16px 2px; box-shadow:0 4px 0 var(--d); white-space:nowrap; }
    .ta-big { font-size:clamp(3.2rem,11vw,5rem); line-height:1.1; }
    .ta-spin { display:inline-block; animation:taBob 1.4s ease-in-out infinite; }
    @keyframes taBob { 0%,100% { transform:translateY(0) rotate(-6deg); } 50% { transform:translateY(-10px) rotate(6deg); } }

    /* 안내 화면 */
    .ta-card { width:100%; max-width:460px; background:#FFFDF6; border:3px solid #F5A623; border-radius:26px; padding:24px 18px 20px; box-shadow:0 10px 30px rgba(90,70,20,.14); display:flex; flex-direction:column; align-items:center; gap:10px; }
    .ta-card h2 { margin:0; font-family:'Jua',sans-serif; font-weight:400; font-size:clamp(1.5rem,5.4vw,2rem); line-height:1.25; }
    .ta-card p { margin:0; font-size:1rem; font-weight:700; color:#5F5B55; line-height:1.5; }
    .ta-card .ta-row { margin-top:8px; width:100%; } .ta-card .ta-row .ta-btn { flex:1 1 150px; }

    /* 게임 화면 아래 버튼 */
    body.ta-guest .action-buttons.ab-game .ab-break { display:none !important; }
    @media (max-width:560px) { body.ta-guest .action-buttons.ab-game > button { flex:0 1 auto !important; min-width:128px !important; } }

    /* 결과 */
    #ta-res { position:fixed; inset:0; z-index:99998; display:none; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; background:rgba(60,45,10,.55); backdrop-filter:blur(3px); overflow:auto; }
    #ta-res.on { display:flex; animation:taFade .2s ease-out; }
    @keyframes taFade { from { opacity:0; } to { opacity:1; } }
    .ta-res-box { position:relative; width:100%; max-width:520px; margin:auto; background:#FFFDF6; border:4px solid #F5A623; border-radius:30px; padding:24px 18px 18px; text-align:center; box-shadow:0 18px 50px rgba(0,0,0,.3); box-sizing:border-box;
      background-image:linear-gradient(rgba(91,184,232,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(91,184,232,.10) 1px,transparent 1px); background-size:20px 20px; word-break:keep-all; overflow-wrap:anywhere; }
    .ta-res-box.win { border-color:#E9533F; animation:taPop .5s cubic-bezier(.2,.9,.3,1.25) both; }
    @keyframes taPop { from { transform:scale(.6) rotate(-4deg); opacity:0; } to { transform:none; opacity:1; } }
    .ta-res-ico { font-size:clamp(4rem,16vw,6rem); line-height:1; }
    .ta-res-box.win .ta-res-ico { animation:taTrophy 1.2s ease-in-out infinite alternate; display:inline-block; }
    @keyframes taTrophy { from { transform:rotate(-8deg) scale(1); } to { transform:rotate(8deg) scale(1.12); } }
    .ta-res-t { margin:4px 0 6px; font-family:'Jua',sans-serif; font-weight:400; font-size:clamp(2.2rem,9.5vw,3.6rem); line-height:1.1; color:#2C2A26; }
    .ta-res-box.win .ta-res-t { color:#E9533F; -webkit-text-stroke:5px #2C2A26; paint-order:stroke fill; text-shadow:4px 4px 0 #FFE27A; letter-spacing:.02em; }
    .ta-res-p { margin:0; font-family:'Jua',sans-serif; font-size:clamp(1.1rem,4.2vw,1.5rem); line-height:1.35; color:#2C2A26; }
    .ta-res-p b { font-weight:400; color:#c93f2e; }
    .ta-res-s { margin:8px 0 0; font-size:.9rem; font-weight:700; color:#5F5B55; }
    .ta-res-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:16px; }
    .ta-res-btns .ta-btn { flex:1 1 140px; }
    .ta-res-x { margin-top:10px; font:800 .86rem 'Noto Sans KR',sans-serif; color:#5F5B55; background:none; border:0; text-decoration:underline; cursor:pointer; min-height:40px; padding:0 12px; }
    .ta-fw { position:absolute; left:50%; top:26%; width:0; height:0; pointer-events:none; }
    .ta-fw i { position:absolute; font-style:normal; font-size:1.7rem; opacity:0; animation:taFw 1.5s ease-out infinite; }
    @keyframes taFw { 0% { transform:translate(-50%,-50%) scale(.3); opacity:0; } 15% { opacity:1; } 100% { transform:translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.15) rotate(var(--r)); opacity:0; } }

    /* 홍보 화면 (조교 대기 화면 위에 덮음 — 방은 그대로 열려 있음) */
    #ta-promo { position:fixed; inset:0; z-index:15000; display:none; background:#FDF6DC; }
    #ta-promo.on { display:block; }
    #ta-promo iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
    #ta-promo .ta-promo-x { position:absolute; inset:0; cursor:pointer; background:transparent; border:0; padding:0; width:100%; height:100%; }
    .ta-set-row { display:flex !important; flex-direction:row !important; justify-content:flex-start !important; align-items:center; gap:10px; cursor:pointer; }
    .ta-set-row input { width:22px; height:22px; flex:none; accent-color:#F5A623; }

    @media (max-width:760px) {
      .ta-wait { grid-template-columns:1fr; gap:10px; }
      .ta-qr svg { width:min(22vh,42vw,170px); } .ta-qr { border-radius:18px; box-shadow:4px 4px 0 #F5A623; border-width:3px; }
      .ta-num { font-size:clamp(4.4rem,25vw,6.4rem); }
      .ta-games { grid-template-columns:1fr 1fr; }
      .ta-game__go { min-height:clamp(104px,17vh,150px); }
      .ta-btn { font-size:1rem; min-height:46px; padding:6px 14px 4px; }
      .ta-res-box.win .ta-res-t { -webkit-text-stroke-width:4px; }
    }
    @media (max-height:600px) and (min-width:761px) { .ta-game__go { min-height:110px; } .ta-num { font-size:clamp(4rem,11vw,7rem); } .ta-qr svg { width:min(40vh,26vw,240px); } }
    @media (prefers-reduced-motion:reduce) { .ta-spin, .ta-fw i, .ta-res-box.win, .ta-res-box.win .ta-res-ico, .ta-dots::after { animation:none !important; } .ta-dots::after { clip-path:none; } }
  `;
  document.head.appendChild(css);
  document.body.classList.add('ta-mode', isHost ? 'ta-host' : 'ta-guest', 'ta-panel');
  const screen = document.createElement('div'); screen.id = 'ta-screen';
  const mainEl = document.querySelector('main'); mainEl.parentNode.insertBefore(screen, mainEl);
  mainEl.style.visibility = '';   // (불러오는 동안 가려 둔 것 — 이제부터는 ta-panel 이 숨김)
  const res = document.createElement('div'); res.id = 'ta-res'; res.setAttribute('role', 'dialog'); res.setAttribute('aria-modal', 'true'); document.body.appendChild(res);

  function panel(html) { screen.innerHTML = html; document.body.classList.add('ta-panel'); try { window.scrollTo(0, 0); } catch (e) {} }
  function hidePanel() { document.body.classList.remove('ta-panel'); screen.innerHTML = ''; }
  function topName(t) { const el = document.querySelector('.bk-top__name'); if (el) el.textContent = t; }
  const _syncTop = syncTopName;
  syncTopName = function (g) { _syncTop(g); if (!g) topName('조교와의 대결'); const num = document.querySelector('.bk-top__num'); if (num) num.textContent = '🎓'; };
  const go = url => { location.href = url; };
  function act(fn) { return function (e) { try { playSfx('click'); } catch (er) {} fn(e); }; }

  /* ---------- 원래 온라인 흐름에서 바꾸는 것 ---------- */
  // 게임 화면을 나갈 때(메뉴로·게임 바꾸기) 방에서 나가지 않게: 정리만 하고 방은 그대로
  olLeaveIfAny = function () { for (const k in rndLast) rndLast[k] = null; try { rpsHide(); oluReset(); } catch (e) {} olConnClear(); olAiP = null; aiHuman = 1; olRestoreOrig(); };
  // 상대가 나가도 AI가 대신 두지 않음 (나감·끊김은 아래 onEvent 가 처리)
  olOppGone = function () {};
  olConn = function () {};
  // 조교가 보내는 새 판 설정에는 조교 방 표시를 늘 붙임 (한 판 더·🎲 랜덤·⚙️ 설정 후 다시하기 모두 이 길)
  const _reset = Online.reset;
  Online.reset = function (s) {
    if (Online.ta && Online.myNum === 1) { s = Object.assign({}, s || {}, { ta: 1, sid: T.sid }); if (!s.phase) { s.phase = 'play'; s.game = s.game || olGame; } }
    return _reset.call(this, s);
  };
  if (isHost) getMyName = function () { return hostRoomName; };   // 조교 기기의 전적·이름표는 조교 이름으로

  /* ---------- 조교 기기의 판 설정 기억 (돌 개수·팝잇 줄·판 크기·규칙) — 조교 방에서만 쓰는 저장값, 보통 게임 설정과 따로 ---------- */
  const SETS_KEY = 'onchun_ta_sets', TM_ALL = ['nt', 'st', 'qn', 'pp'];
  function setsSave() { if (!isHost) return; try { const o = {}; TM_ALL.forEach(p => { o[p] = (olOrig && olOrig[p]) || SETV[p].get(); }); localStorage.setItem(SETS_KEY, JSON.stringify(o)); } catch (e) {} }
  if (isHost) try {
    const o = JSON.parse(lsGet(SETS_KEY) || 'null');
    if (o && typeof o === 'object') TM_ALL.forEach(p => {
      const v = o[p], cur = SETV[p].get(); if (!v || typeof v !== 'object') return;
      if (Object.keys(cur).some(k => k !== 't' && k !== 'u' && (v[k] === undefined || typeof v[k] !== typeof cur[k]))) return;   // 모양이 다르면 건너뜀
      SETV[p].set(Object.assign({}, v, { t: cur.t, u: cur.u }));                                                             // 제한시간·무르기는 원래 저장값
      try { SET_SUB[p](); } catch (e) {}
    });
  } catch (e) {}

  // 게임 화면 정리 → 조교 화면(대기·고르기·안내)으로 갈 준비. 내 원래 설정으로 되돌림
  function leaveGameUI() {
    hideRes(); closePromo();
    try { if (openModalSet.has('confirm-modal')) confirmAnswer(false); } catch (e) {}
    try { rpsHide(); oluReset(); } catch (e) {}
    olStarted = false;
    if (currentGame) returnToHome(); else olRestoreOrig();
    olGame = null; olCur = null;
    setsSave();
    syncTopName(null);
  }
  function inPlay() { try { return T.phase === 'play' && olGame && OLG[olGame].mode() === 'online' && !OLG[olGame].over() && !olRpsBlocking(); } catch (e) { return false; } }
  function sure(text, yes, fn) { if (inPlay()) askConfirm(text, fn, yes); else fn(); }

  /* ---------- 판 시작 (두 기기 모두: 방의 reset 이벤트에서) ---------- */
  function startGame(s) {
    const g = s.game; if (!OLG[g]) return;
    hideRes(); closePromo(); hidePanel();
    T.phase = 'play'; T.played++;
    if (currentGame !== g) { if (currentGame) returnToHome(); skipRulesOnce = true; openGameSection(g); }
    olGame = g;
    if (!olOrig) olSaveOrig();
    setsSave();
    olStart(s);
  }

  /* ---------- 방 이벤트 ---------- */
  const _ev = olEvent;
  olEvent = function (ev) {
    if (!T.on) return;
    if (ev.type === 'move') { if (T.phase === 'play' && olGame) _ev(ev); return; }
    if (ev.type === 'names') { const nm = ev.names || {}; if (nm[isHost ? 2 : 1]) T.opp = nm[isHost ? 2 : 1]; const hb = $('ta-host-badge'); if (hb && nm[1]) hb.textContent = '🎓 ' + nm[1]; if (T.phase === 'play' && olGame) _ev(ev); return; }
    if (ev.type === 'reset') {
      const s = ev.settings || {}; if (!s.ta) return;
      if (s.phase === 'play') startGame(s);
      else if (s.phase === 'pick') { leaveGameUI(); if (isHost) showPick(); else showGwait(); }
      return;
    }
    if (ev.type === 'joined') { if (!isHost) return; T.opp = (Online.names || {})[2] || '도전자'; T.lastWin = null; T.played = 0; leaveGameUI(); showPick(); showNote(`🙋 도전자 ${T.opp} 입장!`, 2200); return; }
    if (ev.type === 'conn') { onConn(ev.connected); return; }
    if (ev.type === 'left') {
      if (isHost) {
        if (ev.reason === 'replaced') { stop(); showReplaced(); }
        else if (ev.reason === 'opponent') { showNote('👋 도전자가 나갔어요', 2600); hostOpen(); }
        else hostOpen();   // 'self'(내 끊김 표시가 남음) · 'closed'(방이 지워짐) → 다시 열기
      } else {
        const hadDrop = T.offline;
        stop();
        if (ev.reason === 'busy') showJoinErr({ code: 'busy' });
        else if (ev.reason === 'ended') showEnded(hadDrop);
        else showHostGone();
      }
    }
  };
  // 더는 방을 듣지 않음 (안내 화면으로 가기 전)
  function stop() { clearTimeout(connT); try { Online.leave(); } catch (e) {} leaveGameUI(); T.phase = 'stop'; }

  // 내 연결: 조교는 다시 연결되면 방을 새로 엶(끊긴 동안 도전자는 안내를 받고 나감) · 도전자는 8초 넘게 끊기면 안내 화면
  let connT = null;
  function onConn(on) {
    clearTimeout(connT);
    if (!on) {
      if (T.phase === 'stop') return;
      T.offline = true; showNote('📶 연결이 끊겼어요… 다시 연결하는 중', 4000);
      if (!isHost) connT = setTimeout(() => { if (T.on && T.offline && T.phase !== 'stop') { stop(); showDropped(); } }, 8000);
      return;
    }
    if (isHost && T.offline && T.phase !== 'stop') { T.offline = false; showNote('📶 다시 연결됐어요 — 방을 새로 열어요', 2600); hostOpen(); }
    else if (!isHost && T.offline) { T.offline = 'was'; connT = setTimeout(() => { if (T.offline === 'was') T.offline = false; }, 6000); }   // 다시 이어짐: 그새 조교가 방을 새로 열었으면 곧 '끝났어요'가 옴 → 그 안내 글에만 씀
  }

  /* ---------- 조교: 방 열기 / 다음 도전자 받기 (한 번에 하나씩) ---------- */
  let opening = false, openT = null;
  async function hostOpen() {
    if (opening) return;            // 여는 중이면 그걸로 충분 (끝나면 새 대기 방이 됨)
    opening = true;
    leaveGameUI(); T.phase = 'conn'; T.opp = ''; T.on = true;
    showWait(true);
    clearTimeout(openT); openT = setTimeout(() => { if (opening) { const st = $('ta-wait-st'); if (st) st.innerHTML = '연결이 느려요… 잠시만요'; } }, 9000);
    let err = null;
    try { await Online.openTa(code, hostRoomName); } catch (e) { err = e; }
    clearTimeout(openT); opening = false;
    if (err) { T.phase = 'stop'; card('📶', '방을 열지 못했어요', esc(err && err.message || '연결을 확인해 주세요'), [['다시 시도', 'main', () => hostOpen()], ['나가기', 'ghost', () => go(LANDING)]]); return; }
    T.sid = Online.taSid; T.offline = false;
    if (T.phase === 'conn') { T.phase = 'wait'; showWait(false); }   // 그새 도전자가 들어왔으면(joined) 고르기 화면 그대로
  }
  function hostLeave() { T.on = false; try { Online.leave(); } catch (e) {} setTimeout(() => go(LANDING), 250); }

  function tmText() { const on = TM_ALL.every(p => tmPref[p].on), any = TM_ALL.some(p => tmPref[p].on); return any ? `⏱ 제한시간 ${on ? '' : '(게임마다 다름) '}${tmPref.nt.s}초` : '⏱ 제한시간 끔'; }
  function showWait(openingNow) {
    panel(`<div class="ta-wait">
      <div class="ta-wait__l">
        <span class="ta-badge">🎓 ${esc(hostLabel)}</span>
        <div class="ta-wait__lab">방 번호</div>
        <div class="ta-num" id="ta-num">${code}</div>
        <div class="ta-wait__st" id="ta-wait-st">${openingNow ? '방을 여는 중<span class="ta-dots"></span>' : '도전자를 기다리는 중<span class="ta-dots"></span>'}</div>
        <p class="ta-wait__how">📱 홈 → <b>조교와의 대결</b> → <b>조교 ${NO}</b> 누르기<br>또는 온라인 대전 번호 칸에 <b>${code}</b></p>
      </div>
      <div class="ta-wait__r"><div class="ta-qr" id="ta-qr"></div><div class="ta-qr__cap">📷 QR을 찍으면 바로 도전!</div></div>
      <div class="ta-wait__btns"><div class="ta-row">
        <button type="button" class="ta-btn ta-btn--sm" id="ta-b-set">⚙️ 조교 설정</button>
        <button type="button" class="ta-btn ta-btn--sm" id="ta-b-promo">📢 홍보 화면</button>
        <button type="button" class="ta-btn ta-btn--sm ta-btn--ghost" id="ta-b-leave">나가기</button>
      </div><div class="ta-tm" id="ta-tm" style="margin-top:8px">${tmText()}</div></div>
    </div>`);
    $('ta-b-set').onclick = act(openSet); $('ta-b-promo').onclick = act(openPromo); $('ta-b-leave').onclick = act(hostLeave);
    drawQr();
  }
  let qrLoad = null;
  function drawQr() {
    const put = () => { const el = $('ta-qr'); if (el && window.TA_QR_SVG) el.innerHTML = TA_QR_SVG(code); };
    if (window.TA_QR_SVG) return put();
    if (!qrLoad) qrLoad = new Promise(ok => { const s = document.createElement('script'); s.src = '../../ta/qrs.js'; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
    qrLoad.then(put);
  }

  /* ---------- 조교: 게임 고르기 ---------- */
  let picking = false;   // 고른 직후 두 번 눌림 막기 (고르기 화면이 다시 뜨면 풀림)
  function gameSummary(g) {
    try {
      if (g === 'notakto') return `${ntSize}×${ntSize} 판`;
      if (g === 'stone') return `돌 ${stNSetting === 'random' ? '랜덤' : stNSetting + '개'} · 최대 ${stLimitSetting === 'random' ? '랜덤' : stLimitSetting + '개'} · ${stModeType === 'gem' ? '보석' : '폭탄'}`;
      if (g === 'queen') return `${qnSizeSetting === 'random' ? '랜덤 판' : qnSizeSetting + '×' + qnSizeSetting}${qnWinRule === 'misere' ? ' · 거꾸로' : ''}`;
      return `줄 ${ppRowsSetting === 'random' ? '랜덤' : ppParseRows(ppRowsSetting).join('·')}${ppWinRule === 'misere' ? ' · 거꾸로' : ''}`;
    } catch (e) { return ''; }
  }
  function showPick() {
    T.phase = 'pick'; picking = false;
    panel(`<div class="ta-pick">
      <h2 class="ta-pick__h">🙋 도전자 <b>${esc(T.opp || '도전자')}</b> 입장!</h2>
      <p class="ta-pick__p">도전자가 하고 싶은 게임을 눌러 주세요</p>
      <div class="ta-games">${GORDER.map(g => { const m = GM[g]; return `<div class="ta-game" style="--c:${m.c};--d:${m.d};--s:${m.s}">
        <button type="button" class="ta-game__go" data-g="${g}"><span class="i">${m.ico}</span><span class="n">${m.name}</span><span class="s" id="ta-sum-${g}">${esc(gameSummary(g))}</span></button>
        <button type="button" class="ta-game__set" data-set="${g}">⚙️ 판 설정</button></div>`; }).join('')}</div>
      <div class="ta-row">
        <button type="button" class="ta-btn ta-btn--sm" id="ta-b-set">⚙️ 조교 설정</button>
        <button type="button" class="ta-btn ta-btn--sm ta-btn--ghost" id="ta-b-next">👋 다음 도전자 받기</button>
      </div>
      <div class="ta-tm" id="ta-tm">${tmText()}</div>
    </div>`);
    screen.querySelectorAll('[data-g]').forEach(b => { b.onclick = act(() => hostPick(b.dataset.g)); });
    screen.querySelectorAll('[data-set]').forEach(b => { b.onclick = act(() => openBoardSet(b.dataset.set)); });
    $('ta-b-set').onclick = act(openSet); $('ta-b-next').onclick = act(() => hostOpen());
  }
  function hostPick(g) {
    if (picking || T.phase !== 'pick' || !Online.active || !OLG[g]) return;
    const p = OLG[g].p;
    olRestoreOrig(); pendApply(p);                       // 조교 기기에 저장된 그 게임 설정으로
    const s = Object.assign({}, OLG[g].settings(), { phase: 'play', game: g });
    picking = true; setTimeout(() => { picking = false; }, 1500);
    Promise.resolve(Online.reset(s)).catch(() => { picking = false; showNote('연결을 확인해 주세요', 2200); });   // 시작은 reset 이벤트에서 (두 기기 같은 길)
  }
  // ⚙️ 판 설정: 그 게임의 원래 설정 창 (저장하면 조교 기기에 저장 → 다음에 고를 때 적용)
  function openBoardSet(g) {
    const keep = currentGame; currentGame = g;
    try { window['open' + GM[g].N + 'Settings'](); } finally { currentGame = keep; }
  }
  GORDER.forEach(g => {
    const N = GM[g].N, fs = window['save' + N + 'Settings'];
    window['save' + N + 'Settings'] = function (...a) { const r = fs.apply(this, a); if (!olStarted && !olOrig) setsSave(); refreshPick(); return r; };
  });
  function refreshPick() { GORDER.forEach(g => { const el = $('ta-sum-' + g); if (el) el.textContent = gameSummary(g); }); const t = $('ta-tm'); if (t) t.textContent = tmText(); }

  /* ---------- ⚙️ 조교 설정: 턴 제한시간 (네 게임 공통 — 원래 제한시간 설정값을 씀) ---------- */
  document.body.insertAdjacentHTML('beforeend', `<div id="ta-set-modal" class="modal-overlay" onclick="if(event.target === this) closeModal('ta-set-modal', 'ta-set-box')">
    <div class="modal-content" id="ta-set-box" style="max-width:420px;">
      <h2 style="margin-top:0; text-align:center;">⚙️ 조교 설정</h2>
      <div class="settings-group">
        <label class="ta-set-row"><input type="checkbox" id="ta-set-on"> ⏱ 턴 제한시간 쓰기</label>
        <label>한 턴 시간:
          <select id="ta-set-sec"><option value="3">3초</option><option value="5">5초</option><option value="10">10초</option><option value="20">20초</option><option value="30">30초</option></select>
        </label>
        <div class="set-note">네 게임 모두에 적용돼요. 대결 중에는 게임 화면의 <b>⏱ 제한시간</b> 체크로 바로 켜고 끌 수 있어요. 시간이 다 되면 아무 수나 자동으로 둬요.</div>
      </div>
      <div style="text-align:center; margin-top:22px;"><button class="help-close-btn" id="ta-set-save">저장</button></div>
    </div></div>`);
  function openSet() { $('ta-set-on').checked = TM_ALL.some(p => tmPref[p].on); $('ta-set-sec').value = tmSan(tmPref.nt.s); openModal('ta-set-modal', 'ta-set-box'); }
  $('ta-set-save').onclick = act(() => {
    const on = $('ta-set-on').checked, s = tmSan($('ta-set-sec').value);
    if (olStarted || olOrig) { closeModal('ta-set-modal', 'ta-set-box'); return; }   // (대기·고르기 화면에서만 열림)
    TM_ALL.forEach(p => { tmPref[p].on = on; tmPref[p].s = s; });
    ntTimeSetting = stTimeSetting = qnTimeSetting = ppTimeSetting = s; tmSave();
    TM_ALL.forEach(p => { try { SET_SUB[p](); } catch (e) {} });
    closeModal('ta-set-modal', 'ta-set-box'); refreshPick();
    showNote(on ? `⏱ 제한시간 ${s}초 — 다음 판부터` : '⏱ 제한시간 끔', 1800);
  });

  /* ---------- 📢 홍보 화면: 대기 화면 위에 덮어 보여 줌 (방은 열린 채 — 도전자가 들어오면 자동으로 닫힘) ---------- */
  let promo = null;
  function openPromo() {
    if (!promo) {
      promo = document.createElement('div'); promo.id = 'ta-promo';
      promo.innerHTML = `<iframe title="홍보 화면" src="${PROMO}?embed=1&c=${code}"></iframe><button type="button" class="ta-promo-x" aria-label="홍보 화면 닫기"></button>`;
      promo.querySelector('button').onclick = closePromo;
      document.body.appendChild(promo);
    }
    promo.classList.add('on');
  }
  function closePromo() { if (promo) promo.classList.remove('on'); }
  window.addEventListener('message', e => { if (e.origin === location.origin && e.data === 'ta-promo-close') closePromo(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePromo(); });

  /* ---------- 도전자: 들어가기 ---------- */
  let joining = false;
  async function guestJoin() {
    if (joining) return; joining = true;
    leaveGameUI(); T.on = true; T.phase = 'conn'; T.offline = false; T.lastWin = null; T.played = 0;
    panel(`<div class="ta-pick"><div class="ta-big"><span class="ta-spin">🎓</span></div><h2 class="ta-pick__h" id="ta-join-t">조교 ${NO} 방에 들어가는 중<span class="ta-dots"></span></h2>
      <div class="ta-row" id="ta-join-back" hidden><button type="button" class="ta-btn ta-btn--sm ta-btn--ghost" id="ta-b-back">돌아가기</button></div></div>`);
    $('ta-b-back').onclick = act(() => go(LANDING));
    const slow = setTimeout(() => { if (joining && $('ta-join-t')) { $('ta-join-t').innerHTML = '연결이 느려요… 잠시만요<span class="ta-dots"></span>'; $('ta-join-back').hidden = false; } }, 9000);
    let err = null;
    try { await Online.joinTa(code, getMyName()); } catch (e) { err = e; }
    clearTimeout(slow); joining = false;
    if (err) { T.phase = 'stop'; showJoinErr(err); return; }
    T.sid = Online.taSid; T.opp = (Online.names || {})[1] || T.opp;
    if (T.phase === 'conn') showGwait();
  }
  // 안내 화면: 큰 그림 + 제목 + 설명 + 버튼들 [글, 모양, 할 일]
  function card(ico, title, sub, btns) {
    panel(`<div class="ta-card" role="alert"><div class="ta-big">${ico}</div><h2 id="ta-card-t">${title}</h2><p>${sub}</p><div class="ta-row">${btns.map((b, i) => `<button type="button" class="ta-btn ta-btn--${b[1]}" id="ta-cb-${i}">${b[0]}</button>`).join('')}</div></div>`);
    btns.forEach((b, i) => { $('ta-cb-' + i).onclick = act(b[2]); });
  }
  function showJoinErr(e) {
    T.phase = 'stop';
    const c = e && e.code;
    const retry = ['다시 시도', 'main', () => guestJoin()], back = ['돌아가기', 'ghost', () => go(LANDING)];
    if (c === 'busy') card('⚔️', '대결 중이에요', `${TA_I} 다른 도전자와 대결하고 있어요.<br>잠시 후 다시 눌러 주세요.`, [retry, back]);
    else if (c === 'away') card('🪑', '조교가 자리에 없어요', `${TA_I} 방을 열면 들어올 수 있어요.<br>다른 조교에게 도전해 볼까요?`, [retry, back]);
    else card('📶', '연결이 잘 안 돼요', '인터넷 연결을 확인하고 다시 시도해 주세요.' + (e && e.message ? `<br><small style="font-weight:500;opacity:.7">(${esc(e.message)})</small>` : ''), [retry, back]);
  }
  function showGwait() {
    T.phase = 'gwait';
    const host = T.opp || (Online.names || {})[1] || ('조교 ' + NO);
    panel(`<div class="ta-pick">
      <span class="ta-badge" id="ta-host-badge">🎓 ${esc(host)}</span>
      <div class="ta-big"><span class="ta-spin">🤔</span></div>
      <h2 class="ta-pick__h">조교가 게임을 고르는 중<span class="ta-dots"></span></h2>
      <p class="ta-pick__p">하고 싶은 게임을 조교에게 말해 주세요!</p>
      <div class="ta-chips">${GORDER.map(g => `<span class="ta-chip" style="--c:${GM[g].c};--d:${GM[g].d}">${GM[g].name}</span>`).join('')}</div>
      <div class="ta-row" style="margin-top:6px"><button type="button" class="ta-btn ta-btn--sm ta-btn--ghost" id="ta-b-leave">나가기</button></div>
    </div>`);
    $('ta-b-leave').onclick = act(guestLeave);
  }
  function guestLeave() { T.on = false; clearTimeout(connT); try { Online.leave(); } catch (e) {} setTimeout(() => go(LANDING), 250); }
  const rejoin = ['다시 들어가기', 'main', () => guestJoin()], home = ['홈으로', 'ghost', () => go(HOME)];
  function showEnded(hadDrop) {
    if (hadDrop) card('📶', '연결이 끊겨 대결이 끝났어요', '조교가 다음 도전자를 받고 있어요.<br>다시 도전하려면 아래 버튼을 눌러 주세요.', [rejoin, home]);
    else card('👋', '대결이 끝났어요 👋', T.lastWin === true ? '🏆 조교 격파 성공! 보상을 꼭 받아 가세요 🎁' : '도전해 줘서 고마워요! 다른 게임도 즐겨 보세요.', [['홈으로', 'main', () => go(HOME)]]);
  }
  function showHostGone() { card('🔌', '조교와 연결이 끊겼어요', `${TA_I} 다시 방을 열면 들어올 수 있어요.`, [rejoin, home]); }
  function showDropped() { card('📶', '연결이 끊겼어요', '인터넷 연결을 확인하고 다시 들어가 주세요.', [rejoin, home]); }
  function showReplaced() { card('💻', `다른 기기에서 조교 ${NO} 방을 열었어요`, '이 기기의 방은 멈췄어요. 조교 한 명은 기기 하나에서만 방을 열 수 있어요.', [['이 기기에서 다시 열기', 'main', () => hostOpen()], ['나가기', 'ghost', () => go(LANDING)]]); }

  /* ---------- 게임 화면 아래 버튼: 조교 [한 판 더][게임 바꾸기][다음 도전자 받기] · 도전자 [나가기] ---------- */
  function hostAgain() { const p = olGame && OLG[olGame].p; if (!p || !Online.active) return; sure('지금 판을 그만두고 새 판을 시작할까요?', '한 판 더', () => { hideRes(); window[p + 'RestartGame'](); }); }
  function hostChange() { if (!Online.active) return; sure('지금 판을 그만두고 게임을 바꿀까요?', '게임 바꾸기', () => { hideRes(); Online.reset({ phase: 'pick' }); }); }
  function hostNext() { sure('지금 대결을 끝내고 다음 도전자를 받을까요?', '다음 도전자 받기', () => hostOpen()); }
  function guestQuit() { sure('대결을 그만두고 나갈까요?', '나가기', guestLeave); }
  const mk = (cls, html, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls + ' ta-act'; b.innerHTML = html; b.onclick = act(fn); return b; };
  TM_ALL.forEach(p => {
    const ab = document.querySelector('#' + p + '-game-screen .action-buttons.ab-game'); if (!ab) return;
    const rb = $(p + '-restart-btn'), sb = $(p + '-restart-set-btn');
    if (isHost) {
      rb.after(mk('restart-btn', '🔁 한 판 더', hostAgain));
      sb.after(mk('restart-btn', '🎮 게임 바꾸기', hostChange), mk('restart-btn', '👋 다음 도전자<span class="rnd-long"> 받기</span>', hostNext));
    } else {
      const b = mk('restart-btn', '나가기', guestQuit); ab.appendChild(b);
    }
  });

  /* ---------- 결과: 도전자가 이기면 두 화면 모두 🏆 조교 격파! ---------- */
  let fwT = null;
  function hideRes() { clearTimeout(fwT); if (res.classList.contains('on')) { res.classList.remove('on'); res.innerHTML = ''; try { stopConfetti(); stopStars(); } catch (e) {} } }
  function fireworks(n) { try { startConfetti(); } catch (e) {} if (n > 1) fwT = setTimeout(() => { if (res.classList.contains('on')) fireworks(n - 1); }, 1900); }
  function showResult(guestWon) {
    T.lastWin = isHost ? !guestWon : guestWon;
    const opp = esc(T.opp || (isHost ? '도전자' : '조교'));
    let ico, title, p, s = '';
    if (guestWon) {
      ico = '🏆'; title = '조교 격파!';
      p = isHost ? `도전자 <b>${opp}</b> 승리 — <span style="white-space:nowrap">보상을 주세요 🎁</span>` : '축하해요! <span style="white-space:nowrap">조교에게 보상을 받으세요 🎁</span>';
    } else if (isHost) { ico = '😎'; title = '조교의 승리!'; p = `도전자 <b>${opp}</b>에게 한 판 더 권해 볼까요?`; }
    else { ico = '😢'; title = '아쉬워요!'; p = '조교의 승리 😎<br>한 판 더 도전해 볼까요?'; s = '조교에게 “한 판 더!”라고 말해 보세요'; }
    const fw = guestWon ? `<div class="ta-fw" aria-hidden="true">${['🎉', '✨', '🎊', '⭐', '🎆', '✨', '🎉', '🌟'].map((e, i) => { const a = i * Math.PI / 4, r = 150 + (i % 2) * 40; return `<i style="--x:${Math.round(Math.cos(a) * r)}px;--y:${Math.round(Math.sin(a) * r * .8)}px;--r:${i % 2 ? 40 : -40}deg;animation-delay:${(i % 4) * .22}s">${e}</i>`; }).join('')}</div>` : '';
    res.innerHTML = `<div class="ta-res-box${guestWon ? ' win' : ''}">${fw}
      <div class="ta-res-ico">${ico}</div>
      <h2 class="ta-res-t" id="ta-res-t">${title}</h2>
      <p class="ta-res-p" id="ta-res-p">${p}</p>${s ? `<p class="ta-res-s">${s}</p>` : ''}
      <div class="ta-res-btns">${isHost
        ? '<button type="button" class="ta-btn ta-btn--main" id="ta-r-again">🔁 한 판 더</button><button type="button" class="ta-btn" id="ta-r-change">🎮 게임 바꾸기</button><button type="button" class="ta-btn ta-btn--ghost" id="ta-r-next">👋 다음 도전자 받기</button>'
        : '<button type="button" class="ta-btn ta-btn--ghost" id="ta-r-quit">나가기</button>'}</div>
      <button type="button" class="ta-res-x" id="ta-r-x">판 다시 보기</button></div>`;
    res.classList.add('on');
    if (isHost) { $('ta-r-again').onclick = act(hostAgain); $('ta-r-change').onclick = act(hostChange); $('ta-r-next').onclick = act(hostNext); }
    else $('ta-r-quit').onclick = act(guestLeave);
    $('ta-r-x').onclick = act(hideRes);
    if (guestWon) { try { startStars(); } catch (e) {} fireworks(3); }
  }
  const _svTa = showVictoryModal;
  showVictoryModal = function (w, r, l, winNum) {
    const ta = T.on && T.phase === 'play' && olGame && OLG[olGame].mode() === 'online' && Online.active;
    _svTa.apply(this, arguments);            // 전적(온라인 대전으로 기록)·효과음은 원래대로
    if (!ta) return;
    const wn = winNum === 1 || winNum === 2 ? winNum : (/2/.test(w) ? 2 : 1);
    closeVictoryModal(true);                 // 원래 결과 창 대신 조교 대결 결과
    showResult(wn === 2);
  };

  /* ---------- 시작 ---------- */
  syncTopName(null);
  if (isHost) hostOpen(); else guestJoin();
})();
