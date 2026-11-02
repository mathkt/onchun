/* 🏆 도전 모드 레이어 — 메인 게임(games/arcade/index.html) 맨 끝에서 불림. 주소에 ?ch=단계 가 있을 때만 동작.
   · 이름·규칙·튜토리얼 창 없이 정해진 조건(선공 · AI 최상 · 제한시간 끔 · 무르기 없음)으로 바로 시작
   · 저장된 보통 설정(localStorage)은 건드리지 않음 — 메모리 값만 이번 페이지에서 바꿈
   · 이기면 도장 쾅 → 도장판(challenge/index.html)으로 */
(function () {
  const id = new URLSearchParams(location.search).get('ch');
  if (!id || !window.CH) return;
  const BOARD = '../../challenge/index.html';
  const S = CH.stage(id);
  if (!S) { location.replace(BOARD); return; }
  const G = CH.GAME[S.k], k = S.k;
  const $ = x => document.getElementById(x);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.CH_MODE = id;

  /* ---------- 화면: 판 + 버튼 두 개만 ---------- */
  const css = document.createElement('style');
  css.textContent = `
    body.ch-mode #home-screen, body.ch-mode [id$="-menu-screen"], body.ch-mode [id$="-analysis-screen"],
    body.ch-mode .game-section .section-title, body.ch-mode .game-section .rule-subtitle,
    body.ch-mode .tm-row, body.ch-mode .ai-diff, body.ch-mode [id$="-timer-display"], body.ch-mode .player-record,
    body.ch-mode .action-buttons.ab-game, body.ch-mode #pp-undo, body.ch-mode [id$="-undo-btn"],
    body.ch-mode #top-rules-btn, body.ch-mode #top-up-games, body.ch-mode .bk-top__sub, body.ch-mode #victory-modal,
    body.ch-mode #stars-canvas, body.ch-mode #victory-canvas { display:none !important; }
    .ch-bar { display:flex; align-items:center; justify-content:center; gap:6px 10px; flex-wrap:wrap; width:100%; max-width:760px; margin:0 auto 6px; box-sizing:border-box;
      background:#fff; border:2.5px solid ${G.color}; border-radius:16px; padding:6px 12px; box-shadow:0 3px 0 ${G.deep}; font-family:'Noto Sans KR',sans-serif; }
    .ch-bar .ch-id { font-family:'Jua',sans-serif; font-size:1.05rem; color:#fff; background:${G.color}; border-radius:9px; padding:1px 9px; box-shadow:inset 0 -3px 0 rgba(0,0,0,.14); flex:none; }
    .ch-bar .ch-m { font-family:'Jua',sans-serif; font-size:1.1rem; color:#2C2A26; }
    .ch-bar .ch-c { font-size:.85rem; font-weight:800; color:${G.deep}; }
    .ch-bar .ch-done { font-size:.8rem; font-weight:900; color:#D7263D; white-space:nowrap; }
    .ch-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; width:100%; margin:8px 0 4px; }
    .ch-btn { font-family:'Jua',sans-serif; font-size:1.12rem; min-height:50px; padding:10px 22px; border-radius:16px; cursor:pointer; border:2.5px solid ${G.color};
      background:#fff; color:#2C2A26; box-shadow:0 4px 0 ${G.deep}; display:inline-flex; align-items:center; gap:6px; -webkit-tap-highlight-color:transparent; }
    .ch-btn:active { transform:translateY(3px); box-shadow:0 1px 0 ${G.deep}; }
    .ch-btn--main { background:${G.color}; color:#fff; }
    #ch-up { border-color:${G.color} !important; box-shadow:0 3px 0 ${G.deep} !important; }
    /* 결과 창 */
    #ch-res { position:fixed; inset:0; z-index:20000; display:none; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; background:rgba(60,45,10,.5); backdrop-filter:blur(3px); }
    #ch-res.on { display:flex; animation:chFade .2s ease-out; }
    @keyframes chFade { from { opacity:0 } to { opacity:1 } }
    .ch-res-box { position:relative; width:100%; max-width:420px; background:#FFFDF6; border:3px solid ${G.color}; border-radius:26px; padding:22px 18px 18px; text-align:center;
      box-shadow:0 16px 44px rgba(0,0,0,.28); font-family:'Noto Sans KR',sans-serif; box-sizing:border-box; overflow:hidden;
      background-image:linear-gradient(rgba(91,184,232,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(91,184,232,.10) 1px,transparent 1px); background-size:20px 20px; }
    .ch-res-box.shake { animation:chShake .4s ease-out; }
    @keyframes chShake { 0%{transform:translate(0,0)} 15%{transform:translate(-7px,5px) rotate(-1deg)} 30%{transform:translate(6px,-4px) rotate(1deg)} 45%{transform:translate(-5px,3px)} 60%{transform:translate(4px,-2px)} 80%{transform:translate(-2px,1px)} 100%{transform:none} }
    .ch-res-stamp { position:relative; width:190px; height:190px; margin:0 auto 4px; display:grid; place-items:center; }
    .ch-res-stamp .ch-stamp-svg { width:100%; height:100%; transform:rotate(-12deg); }
    .ch-res-stamp.go .ch-stamp-svg { animation:chStampIn .5s cubic-bezier(.2,.8,.3,1.15) both; }
    @keyframes chStampIn { 0%{transform:scale(3.2) rotate(-34deg);opacity:0} 55%{transform:scale(.9) rotate(-12deg);opacity:1} 72%{transform:scale(1.06) rotate(-12deg)} 100%{transform:scale(1) rotate(-12deg);opacity:1} }
    .ch-res-stamp .ink { position:absolute; inset:16%; border-radius:50%; border:6px solid rgba(215,38,61,.35); opacity:0; }
    .ch-res-stamp.go .ink { animation:chInk .6s .26s ease-out both; }
    @keyframes chInk { 0%{transform:scale(.7);opacity:.9} 100%{transform:scale(1.5);opacity:0} }
    .ch-res-stamp.old .ch-stamp-svg { opacity:.55; }
    .ch-res-ico { font-size:4.2rem; line-height:1; margin:6px 0 8px; }
    .ch-res-t { font-family:'Jua',sans-serif; font-size:2rem; line-height:1.2; margin:0 0 4px; color:#2C2A26; }
    .ch-res-p { font-family:'Jua',sans-serif; font-size:1.15rem; color:#5F5B55; margin:0; }
    .ch-res-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:16px; }
    .ch-res-btns .ch-btn { flex:1 1 150px; justify-content:center; }
    .ch-auto { height:6px; border-radius:3px; background:#F1E8CF; margin-top:12px; overflow:hidden; }
    .ch-auto i { display:block; height:100%; width:0; background:${G.color}; }
    .ch-auto.run i { width:100%; transition:width var(--t,2.8s) linear; }
    @media (max-width:640px) {
      .ch-bar { padding:5px 8px; gap:4px 8px; margin-bottom:4px; }
      .ch-bar .ch-m { font-size:1rem; } .ch-bar .ch-c { font-size:.78rem; }
      .ch-btn { font-size:1rem; min-height:46px; padding:8px 16px; }
      .ch-res-stamp { width:160px; height:160px; } .ch-res-t { font-size:1.7rem; }
    }
    @media (prefers-reduced-motion:reduce) { .ch-res-stamp.go .ch-stamp-svg, .ch-res-box.shake, .ch-res-stamp.go .ink { animation:none !important; } }
  `;
  document.head.appendChild(css);
  document.body.classList.add('ch-mode');
  document.body.insertAdjacentHTML('afterbegin', CH.inkDefs());

  /* ---------- 보통 설정을 이번 페이지에서만 덮어쓰기 (localStorage 저장 함수는 부르지 않음) ---------- */
  const _fp = firstPlayer;
  firstPlayer = function (game, mode) { return mode === 'bot' ? 1 : _fp(game, mode); };   // 항상 내가 먼저
  tmRunning = function () { return false; };                                               // 제한시간 끔
  undoVisible = function () { return false; };                                             // 무르기 없음
  const _gn = getMyName;
  getMyName = function () { try { return CH.load().name || _gn(); } catch (e) { return _gn(); } };
  // 승패: 원래 결과 창(전적 기록 포함) 대신 도전 결과
  showVictoryModal = function (w, r, isLoss) { onEnd(!isLoss); };
  showStartToast = function () {};                                                         // 미션 줄이 있으니 "선공" 알림은 생략

  /* ---------- 판 시작 ---------- */
  let resT = null, autoT = null, limit = 0;
  function condText() {
    if (k === 'nt') return '3×3 · 한 줄을 만들면 패배';
    if (k === 'st') return `돌 ${S.n}개 · ${S.mode === 'bomb' ? '💣 마지막 폭탄 돌을 가져가면 패배' : '💎 마지막 보석 돌을 가져가면 승리'} · 한 번에 1~${limit}개`;
    if (k === 'qn') { const q = CH.load().qn; return `${q.N}×${q.N} 판 · 퀸을 구석 (0,0)에 넣으면 승리`; }
    return `줄 ${S.rows.join('·')} · 마지막 버블을 누르면 승리`;
  }
  function renderBar() {
    const done = CH.load().stamps[id];
    bar.innerHTML = `<span class="ch-id">${esc(id)}</span><span class="ch-m">${esc(S.mission)}</span><span class="ch-c">${esc(condText())}</span>${done ? '<span class="ch-done">✓ 도장 받음</span>' : ''}`;
  }
  function start() {
    hideRes();
    botDifficulty = '최상'; isBranchPlay = false; aiHuman = 1; olAiP = null;
    try { rndLast[k] = null; } catch (e) {}
    try { window[k + 'StopTimer'](); } catch (e) {}
    if (k === 'nt') { ntSize = 3; }
    else if (k === 'st') { limit = 3 + Math.floor(Math.random() * 3); stNSetting = String(S.n); stLimitSetting = String(limit); stModeType = S.mode; stOneShot = false; }
    else if (k === 'qn') { qnWinRule = 'last'; qnStartSetting = 'rand'; }
    else { ppRowsSetting = S.rows.join(' '); ppWinRule = 'last'; ppMaxTake = 0; ppOneShot = null; }
    renderBar();
    if (k === 'nt') ntStartGame('bot');
    else if (k === 'st') stStartGame('bot');
    else if (k === 'qn') { const q = CH.load().qn, s = id === '3-1' ? q.s31 : q.s32; qnStartGame('bot', { size: q.N, start: s.slice() }); }
    else ppStartGame('bot');
  }

  /* ---------- 도장판으로 (도장판에서 왔으면 뒤로 가기 — 기록이 쌓이지 않게) ---------- */
  function goBoard() {
    clearTimeout(autoT);
    let fromBoard = false;
    try { const u = new URL(document.referrer); fromBoard = u.origin === location.origin && /\/challenge\/(index\.html)?$/.test(u.pathname); } catch (e) {}
    if (fromBoard && history.length > 1) history.back();
    else location.href = BOARD;
  }
  window.chGoBoard = goBoard;

  /* ---------- 결과 ---------- */
  const res = document.createElement('div'); res.id = 'ch-res'; res.setAttribute('role', 'dialog'); res.setAttribute('aria-modal', 'true');
  document.body.appendChild(res);
  function hideRes() { clearTimeout(resT); clearTimeout(autoT); res.classList.remove('on'); res.innerHTML = ''; }
  function onEnd(win) {
    clearTimeout(resT);
    const fresh = win ? CH.stamp(id) : false; // 기록은 바로 (창이 뜨기 전에 나가도 도장은 남음)
    resT = setTimeout(() => showRes(win, fresh), win ? 650 : 900);
  }
  function showRes(win, fresh) {
    const t = CH.load().stamps[id];
    const btnAgain = `<button type="button" class="ch-btn" data-act="again">↻ 다시하기</button>`;
    const btnBoard = l => `<button type="button" class="ch-btn ch-btn--main" data-act="board">📋 ${l}</button>`;
    if (win && fresh) {
      res.innerHTML = `<div class="ch-res-box"><div class="ch-res-stamp"><span class="ink"></span>${CH.stampSVG({ small: '도전 ' + id })}</div>
        <h2 class="ch-res-t">🎉 도전 ${esc(id)} 성공!</h2><p class="ch-res-p">도장 쾅! ${CH.fmtClock(t)}</p>
        <div class="ch-res-btns">${btnBoard('도장판으로')}</div><div class="ch-auto"><i></i></div></div>`;
    } else if (win) {
      res.innerHTML = `<div class="ch-res-box"><div class="ch-res-stamp old">${CH.stampSVG({ small: '도전 ' + id })}</div>
        <h2 class="ch-res-t">🎉 이겼어요!</h2><p class="ch-res-p">이미 도장을 받았어요${t ? ` (${CH.fmtClock(t)})` : ''}</p>
        <div class="ch-res-btns">${btnAgain}${btnBoard('도장판 보기')}</div></div>`;
    } else {
      res.innerHTML = `<div class="ch-res-box"><div class="ch-res-ico">😢</div>
        <h2 class="ch-res-t">아쉬워요!</h2><p class="ch-res-p">다시 도전해 봐요</p>
        <div class="ch-res-btns">${btnAgain}${btnBoard('도장판 보기')}</div></div>`;
    }
    res.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { try { playSfx('click'); } catch (e) {} if (b.dataset.act === 'again') start(); else goBoard(); });
    res.classList.add('on');
    if (win && fresh) {
      const st = res.querySelector('.ch-res-stamp'), box = res.querySelector('.ch-res-box'), au = res.querySelector('.ch-auto');
      requestAnimationFrame(() => {
        st.classList.add('go');
        setTimeout(() => { box.classList.add('shake'); try { playPlaceStone(); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {} }, 270);
        setTimeout(() => { try { playWinSound(); } catch (e) {} }, 420);
        au.style.setProperty('--t', '2.6s'); requestAnimationFrame(() => au.classList.add('run'));
      });
      autoT = setTimeout(goBoard, 3200); // 쾅(0.5초) + 2.6초 뒤 도장판으로
    } else if (!win) { try { playLoseSound(); } catch (e) {} }
    else { try { playWinSound(); } catch (e) {} }
  }

  /* ---------- 게임 화면 꾸미기: 미션 줄 + [다시하기] [📋 도장판 보기] ---------- */
  const scr = $(k + '-game-screen');
  const bar = document.createElement('div'); bar.className = 'ch-bar'; bar.id = 'ch-bar';
  scr.insertBefore(bar, scr.firstChild);
  const acts = document.createElement('div'); acts.className = 'ch-actions'; acts.id = 'ch-actions';
  acts.innerHTML = `<button type="button" class="ch-btn" id="ch-again">↻ 다시하기</button><button type="button" class="ch-btn ch-btn--main" id="ch-board">📋 도장판 보기</button>`;
  const ab = scr.querySelector('.action-buttons'); if (ab) ab.after(acts); else scr.appendChild(acts);
  $('ch-again').onclick = () => { try { playSfx('click'); } catch (e) {} start(); };
  $('ch-board').onclick = () => { try { playSfx('click'); } catch (e) {} goBoard(); };

  /* ---------- 상단바: "도전 1-1 노탁토" + ⬆ 도장판 ---------- */
  function topBar() {
    const nm = document.querySelector('.bk-top__name'); if (nm) nm.textContent = `도전 ${id} ${G.name}`;
    const num = document.querySelector('.bk-top__num'); if (num) num.textContent = '🏆';
    if (!$('ch-up')) {
      const up = document.createElement('a'); up.id = 'ch-up'; up.className = 'bk-top__home bk-top__up'; up.href = BOARD; up.title = '도장판으로';
      up.innerHTML = '⬆ <span>도장판</span>';
      up.addEventListener('click', e => { e.preventDefault(); goBoard(); });
      document.querySelector('.bk-top__home')?.after(up);
    }
    document.title = `도전 ${id} ${G.name} · 부산의 활동수학 축전`;
  }

  /* ---------- 들어가기 ---------- */
  try { closeVictoryModal(true); } catch (e) {}
  currentGame = G.g; skipRulesOnce = true;
  openGameSection(G.g);
  topBar();
  start();
  // 뒤로 가기 캐시로 돌아왔을 때(드묾): 끝난 판이면 새로
  window.addEventListener('pageshow', e => { if (e.persisted) { topBar(); renderBar(); } });
})();
