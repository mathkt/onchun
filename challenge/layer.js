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
    .ch-res-perf { display:inline-block; margin-top:8px; font-family:'Jua',sans-serif; font-size:1.05rem; color:#6B4A00; background:linear-gradient(90deg,#FFE27A,#FFD15C); border:2px solid #E8B21B; border-radius:999px; padding:4px 14px; box-shadow:0 3px 0 #D9A514; animation:chPerf .6s .5s cubic-bezier(.3,1.4,.5,1) both; }
    @keyframes chPerf { from { transform:scale(.4); opacity:0 } to { transform:none; opacity:1 } }
    .ch-res-stamp .ch-perf-badge { position:absolute; right:8px; top:14px; width:46px; height:46px; border-radius:50%; background:#fff; border:3px solid #E8B21B; box-shadow:0 3px 8px rgba(0,0,0,.25); display:grid; place-items:center; font-size:1.6rem; transform:rotate(12deg); z-index:2; }
    /* AI의 한마디 */
    .ch-ai { display:flex; align-items:flex-start; gap:8px; margin:14px auto 0; max-width:340px; text-align:left; }
    .ch-ai .ch-ai-ico { flex:none; width:38px; height:38px; border-radius:50%; background:#EEF4FA; border:2px solid #C9D7E6; display:grid; place-items:center; font-size:1.35rem; }
    .ch-ai .ch-ai-bub { position:relative; flex:1; background:#fff; border:2px solid #C9D7E6; border-radius:14px; border-top-left-radius:4px; padding:8px 12px; font-size:.98rem; font-weight:800; color:#2C2A26; line-height:1.35; }
    .ch-ai .ch-ai-bub::before { content:""; position:absolute; left:-9px; top:10px; border:5px solid transparent; border-right-color:#C9D7E6; border-left:0; }
    .ch-ai .ch-ai-bub small { display:block; font-size:.7rem; color:#7A8A9A; font-weight:700; margin-bottom:1px; }
    .ch-res-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:16px; }
    .ch-res-btns .ch-btn { flex:1 1 150px; justify-content:center; }
    .ch-auto { height:6px; border-radius:3px; background:#F1E8CF; margin-top:12px; overflow:hidden; }
    .ch-auto i { display:block; height:100%; width:0; background:${G.color}; }
    .ch-auto.run i { width:100%; transition:width var(--t,2.8s) linear; }
    /* 규칙 창 */
    #ch-rules { position:fixed; inset:0; z-index:20001; display:none; align-items:center; justify-content:center; padding:14px; box-sizing:border-box; background:rgba(60,45,10,.5); overflow:auto; }
    #ch-rules.on { display:flex; animation:chFade .2s ease-out; }
    .ch-rules-box { max-width:440px; padding:16px 16px 14px; margin:auto; }
    .ch-rules-tag { display:inline-block; font-family:'Jua',sans-serif; font-size:.95rem; color:#fff; background:${G.color}; border-radius:999px; padding:3px 14px; margin-bottom:6px; }
    .ch-rules-box .ch-res-t { font-size:1.7rem; margin-bottom:6px; }
    .ch-rules-pic { background:#fff; border:2px solid ${G.color}; border-radius:16px; padding:8px 10px; margin:0 auto 8px; display:flex; align-items:center; gap:12px; }
    .ch-rules-pic svg { display:block; height:auto; max-width:100%; }
    .ch-rules-cap { flex:1; min-width:0; text-align:left; font-family:'Jua',sans-serif; font-size:1rem; line-height:1.35; display:flex; flex-direction:column; gap:6px; word-break:keep-all; }
    .ch-rules-cap b, .ch-rules-row b { font-weight:400; }
    .ch-rules-cap span { color:#5F5B55; font-size:.9rem; }
    .ch-rules-col { flex:1; min-width:0; }
    .ch-rules-col svg { width:100%; }
    .ch-rules-row { display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; font-family:'Jua',sans-serif; font-size:.98rem; margin-top:4px; word-break:keep-all; }
    .ch-rules-list { list-style:none; margin:0; padding:0; text-align:left; display:flex; flex-direction:column; gap:6px; }
    .ch-rules-list li { display:flex; gap:9px; align-items:flex-start; font-size:1.02rem; font-weight:700; line-height:1.4; color:#2C2A26; word-break:keep-all; }
    .ch-rules-list li i { flex:none; width:26px; height:26px; border-radius:50%; background:${G.color}; color:#fff; font-style:normal; font-family:'Jua',sans-serif; display:grid; place-items:center; font-size:.95rem; margin-top:1px; }
    .ch-rules-list li b { color:${G.deep}; }
    .ch-rules-foot { font-family:'Jua',sans-serif; font-size:1rem; color:#5F5B55; margin:10px 0 0; }
    .ch-rules-chk { display:inline-flex; align-items:center; gap:8px; margin-top:10px; font-size:.95rem; font-weight:700; color:#5F5B55; cursor:pointer; min-height:36px; -webkit-tap-highlight-color:transparent; }
    .ch-rules-chk input { width:22px; height:22px; accent-color:${G.color}; margin:0; }
    .ch-rules-box .ch-res-btns { margin-top:10px; }
    @media (max-width:640px) {
      .ch-btn { font-size:1rem; min-height:46px; padding:8px 16px; }
      .ch-actions { gap:6px; flex-wrap:nowrap; } .ch-actions .ch-btn { padding:8px 10px; font-size:.95rem; white-space:nowrap; flex:1 1 auto; justify-content:center; min-width:0; }
      /* 황금비 퀸: 판이 폰 폭을 꽉 채우게 (옆 여백 최소) */
      body.ch-mode.ch-qn main { padding-left:8px !important; padding-right:8px !important; }
      body.ch-mode.ch-qn #qn-board .qn-boardWrap { width:100% !important; }
      .ch-res-stamp { width:160px; height:160px; } .ch-res-t { font-size:1.7rem; }
    }
    @media (prefers-reduced-motion:reduce) { .ch-res-stamp.go .ch-stamp-svg, .ch-res-box.shake, .ch-res-stamp.go .ink { animation:none !important; } }
    /* 크롬북처럼 가로·세로가 넉넉하면(700px↑): 상단바 아래 남는 공간 가운데에 판(상대 패널 + 판 + 내 패널 + 버튼)을 세로로 가운데 맞춤 — 폰(좁은 화면)은 그대로 */
    @media (min-height:700px) and (min-width:700px) {
      body.ch-mode main { min-height:calc(100dvh - var(--bk-top-h, 56px)); box-sizing:border-box; justify-content:center; padding-top:16px !important; padding-bottom:16px !important; }
      body.ch-mode .game-section { flex:0 0 auto; }
    }
  `;
  document.head.appendChild(css);
  document.body.classList.add('ch-mode', 'ch-' + k);
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
  showStartToast = function () {};                                                         // 도전은 늘 선공 — "선공" 알림 생략
  // AI가 실제로 둔 횟수 세기 → 내 수 = AI 수 + (내가 이겼으면 1). 황금비 퀸 ⚡ 최소 수 판정에 씀
  let aiMoves = 0;
  const _qb = qnBotTurn; qnBotTurn = function () { if (!qnOver && qnCur === qnBotNum() && qnPhase === 'play' && qnMode === 'bot') aiMoves++; return _qb.apply(this, arguments); };
  const _pb = ppBotTurn; ppBotTurn = function () { if (!ppOver && ppCur === ppBotNum() && ppMode === 'bot') aiMoves++; return _pb.apply(this, arguments); };
  const _nb = ntBotTurn; ntBotTurn = function () { if (!ntGameOver) aiMoves++; return _nb.apply(this, arguments); };
  const _sb = stBotTurn; stBotTurn = function () { if (!stGameOver && !stIsAnimating) aiMoves++; return _sb.apply(this, arguments); };

  /* ---------- 판 시작 ---------- */
  let resT = null, autoT = null, startAt = 0;
  function start() {
    hideRes();
    aiMoves = 0; startAt = Date.now();
    botDifficulty = '최상'; isBranchPlay = false; aiHuman = 1; olAiP = null;
    try { rndLast[k] = null; } catch (e) {}
    try { window[k + 'StopTimer'](); } catch (e) {}
    if (k === 'nt') { ntSize = 3; }
    else if (k === 'st') { const o = CH.nextStone(id); stNSetting = String(o.n); stLimitSetting = String(o.limit); stModeType = S.mode; stOneShot = false; } // 판마다 돌·최대 개수 새로 (선공 승리 판만)
    else if (k === 'qn') { qnWinRule = 'last'; qnStartSetting = 'rand'; }
    else { ppRowsSetting = CH.nextPopit(id).join(' '); ppWinRule = 'last'; ppMaxTake = 0; ppOneShot = null; } // 4(상): 판마다 어려운 랜덤 판 (이기는 수 1~2개)
    if (k === 'nt') ntStartGame('bot');
    else if (k === 'st') stStartGame('bot');
    else if (k === 'qn') { const q = CH.nextQueen(id); qnStartGame('bot', { size: q.N, start: q.s }); } // 판마다 새 시작 칸
    else ppStartGame('bot');
  }
  // 판이 끝났나 · 한 수라도 뒀나 (다시하기를 "포기"로 셀지 판단)
  function isOver() { try { return k === 'nt' ? !!ntGameOver : k === 'st' ? !!stGameOver : k === 'qn' ? !!qnOver : !!ppOver; } catch (e) { return true; } }
  function hasMoved() {
    try {
      if (aiMoves > 0) return true;
      if (k === 'nt') return ntGameBoardMask !== 0;
      if (k === 'st') return stStonesArr.length !== stN;
      if (k === 'qn') return qnQ + '' !== qnStart + '';
      return ppRows.join() !== ppInit.join();
    } catch (e) { return false; }
  }
  // [다시하기]: 두다 만 판은 진 걸로 셈 → 4번째(8, 12…)면 바로 다시 시작하지 않고 "배우러 갈래요?" 창
  function restart() {
    if (!isOver() && hasMoved()) {
      const losses = CH.result(id, false);
      if (losses > 0 && losses % CH.LEARN_EVERY === 0) { showLearn(losses); return; }
    }
    start();
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
    const my = aiMoves + (win ? 1 : 0);                       // 내가 둔 수
    const perfect = win && k === 'qn' && my <= S.target;      // 황금비 퀸: 최소 수(이하)로 이김 ⚡ — AI가 지는 자리에서 조금씩 움직이면 더 빨리 끝날 수도 있음
    const sec = (Date.now() - startAt) / 1000;
    const fresh = win ? CH.stamp(id, { sec, perfect, att: (CH.load().att[id] || 0) + 1 }) : false; // 기록은 바로 (창이 뜨기 전에 나가도 도장은 남음)
    const losses = CH.result(id, win);        // 연속으로 진 횟수 (이기면 0)
    resT = setTimeout(() => showRes(win, fresh, losses, perfect), win ? 650 : 900);
  }
  // 📘 필승 전략 배우기: 보통 화면을 전략 카드가 열린 채로 (back=ch:단계 → 카드에 "도전으로 돌아가기" 버튼)
  function goLearn() {
    clearTimeout(autoT);
    location.href = `${location.pathname}?game=${encodeURIComponent(G.g)}&lesson=1&back=${encodeURIComponent('ch:' + id)}`;
  }
  const aiBub = win => `<div class="ch-ai"><span class="ch-ai-ico">🤖</span><div class="ch-ai-bub"><small>AI의 한마디</small>${esc(CH.aiSay(win))}</div></div>`;
  function bindRes() {
    res.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { try { playSfx('click'); } catch (e) {} const a = b.dataset.act; if (a === 'again') start(); else if (a === 'learn') goLearn(); else goBoard(); });
    res.classList.add('on');
  }
  // 4번째(8, 12…)로 진 판(두다 만 판 포함): 전략 배우러 가기 권유
  function showLearn(losses) {
    clearTimeout(resT); clearTimeout(autoT);
    try { window[k + 'StopTimer'](); } catch (e) {}
    res.innerHTML = `<div class="ch-res-box"><div class="ch-res-ico">😅</div>
      <h2 class="ch-res-t">${losses}번이나 아쉬웠어요</h2><p class="ch-res-p">필승 전략을 배우러 가볼까요?</p>${aiBub(false)}
      <div class="ch-res-btns"><button type="button" class="ch-btn ch-btn--main" data-act="learn">📘 필승 전략 배우기</button><button type="button" class="ch-btn" data-act="again">🔁 다시 도전</button></div></div>`;
    bindRes();
    try { playLoseSound(); } catch (e) {}
  }
  function showRes(win, fresh, losses, perfect) {
    const rec = CH.load(), t = rec.stamps[id];
    const ai = aiBub(win);
    const perf = perfect ? `<div class="ch-res-perf">⚡ 완벽한 수! 최소 수로 이겼어요</div>` : '';
    const badge = (perfect || (win && rec.perfect[id])) ? '<span class="ch-perf-badge">⚡</span>' : '';
    const btnAgain = `<button type="button" class="ch-btn" data-act="again">↻ 다시하기</button>`;
    const btnBoard = l => `<button type="button" class="ch-btn ch-btn--main" data-act="board">📋 ${l}</button>`;
    if (!win && losses > 0 && losses % CH.LEARN_EVERY === 0) { showLearn(losses); return; }
    if (win && fresh) {
      res.innerHTML = `<div class="ch-res-box"><div class="ch-res-stamp"><span class="ink"></span>${CH.stampSVG({ stage: id })}${badge}</div>
        <h2 class="ch-res-t">🎉 도전 ${esc(S.label)} 성공!</h2><p class="ch-res-p">도장 쾅! ${CH.fmtClock(t)}</p>${perf}${ai}
        <div class="ch-res-btns">${btnBoard('도장판으로')}</div><div class="ch-auto"><i></i></div></div>`;
    } else if (win) {
      res.innerHTML = `<div class="ch-res-box"><div class="ch-res-stamp old">${CH.stampSVG({ stage: id })}${badge}</div>
        <h2 class="ch-res-t">🎉 이겼어요!</h2><p class="ch-res-p">이미 도장을 받았어요${t ? ` (${CH.fmtClock(t)})` : ''}</p>${perf}${ai}
        <div class="ch-res-btns">${btnAgain}${btnBoard('도장판 보기')}</div></div>`;
    } else {
      res.innerHTML = `<div class="ch-res-box"><div class="ch-res-ico">😢</div>
        <h2 class="ch-res-t">아쉬워요!</h2><p class="ch-res-p">다시 도전해 봐요</p>${ai}
        <div class="ch-res-btns">${btnAgain}${btnBoard('도장판 보기')}</div></div>`;
    }
    bindRes();
    if (win && fresh) {
      const st = res.querySelector('.ch-res-stamp'), box = res.querySelector('.ch-res-box'), au = res.querySelector('.ch-auto');
      requestAnimationFrame(() => {
        st.classList.add('go');
        setTimeout(() => { box.classList.add('shake'); try { playPlaceStone(); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {} }, 270);
        setTimeout(() => { try { playWinSound(); } catch (e) {} }, 420);
        au.style.setProperty('--t', '2.6s'); requestAnimationFrame(() => au.classList.add('run'));
      });
      autoT = setTimeout(goBoard, 3200); // 쾅(0.5초) + 2.6초 뒤 도장판으로 (축하는 도장판에서)
    } else if (!win) { try { playLoseSound(); } catch (e) {} }
    else { try { playWinSound(); } catch (e) {} }
  }

  /* ---------- 게임 화면 꾸미기: [다시하기] [📋 도장판 보기] (미션 줄 없음 — 제목은 상단바에) ---------- */
  const scr = $(k + '-game-screen');
  const acts = document.createElement('div'); acts.className = 'ch-actions'; acts.id = 'ch-actions';
  acts.innerHTML = `<button type="button" class="ch-btn" id="ch-again">↻ 다시하기</button><button type="button" class="ch-btn" id="ch-rules-btn">📖 규칙</button><button type="button" class="ch-btn ch-btn--main" id="ch-board">📋 도장판 보기</button>`;
  const ab = scr.querySelector('.action-buttons'); if (ab) ab.after(acts); else scr.appendChild(acts);
  $('ch-again').onclick = () => { try { playSfx('click'); } catch (e) {} restart(); };
  $('ch-board').onclick = () => { try { playSfx('click'); } catch (e) {} goBoard(); };
  $('ch-rules-btn').onclick = () => { try { playSfx('click'); } catch (e) {} showRules(false); };

  /* ---------- 게임 규칙 창: 그 게임에 처음 들어올 때 한 번 + [📖 규칙] 버튼 ----------
     "다음부터 이 규칙 안 보기"(기본 체크)를 도전 기록 안에 저장 → 도장판을 비우면(다음 도전자) 다시 뜸.
     돌 가져가기는 폭탄·보석 규칙이 달라서 따로 셈. */
  const RK = k === 'st' ? 'st-' + S.mode : k;
  function rulesSeen() { try { const r = CH.load(); return !!(r.rules && r.rules[RK]); } catch (e) { return false; } }
  function rulesSet(v) { try { const r = CH.load(); if (!r.rules || typeof r.rules !== 'object') r.rules = {}; r.rules[RK] = !!v; CH.save(r); } catch (e) {} }
  // 그림(SVG)에는 글자를 넣지 않고, 설명은 옆(HTML)에 둠 → 글꼴이 달라도 넘치지 않음
  function rulesPic() {
    const c = G.color, d = G.deep, ink = '#2C2A26';
    const cap = (...ls) => `<div class="ch-rules-cap">${ls.join('')}</div>`;
    if (k === 'nt') {
      let g = ''; const o = 6, z = 28;
      for (let i = 0; i < 9; i++) { const x = o + (i % 3) * z, y = 6 + Math.floor(i / 3) * z; g += `<rect x="${x}" y="${y}" width="${z}" height="${z}" fill="${i === 2 ? '#FDE3DF' : '#fff'}" stroke="${ink}" stroke-width="1.5"${i === 2 ? ' stroke-dasharray="4 3"' : ''}/>`; }
      const X = (i, col, op) => { const x = o + (i % 3) * z + z / 2, y = 6 + Math.floor(i / 3) * z + z / 2; return `<g stroke="${col}" stroke-width="4.5" stroke-linecap="round" opacity="${op}"><line x1="${x - 8}" y1="${y - 8}" x2="${x + 8}" y2="${y + 8}"/><line x1="${x + 8}" y1="${y - 8}" x2="${x - 8}" y2="${y + 8}"/></g>`; };
      return `<svg viewBox="0 0 96 96" style="flex:0 0 96px" role="img" aria-label="X 두 개 옆 칸에 두면 한 줄이 되어 패배">${g}${X(0, ink, 1)}${X(1, ink, 1)}${X(2, '#E9533F', .55)}${X(4, ink, 1)}</svg>`
        + cap(`<b style="color:#E9533F">빨간 칸에 두면<br>한 줄 완성 → 패배!</b>`, `<span>한 줄을 만들지 않고 버티기</span>`);
    }
    if (k === 'st') {
      const bomb = S.mode === 'bomb'; let g = '';
      for (let i = 0; i < 8; i++) g += `<circle cx="${14 + i * 25}" cy="16" r="10" fill="${i < 3 ? c : '#3a3a3a'}" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<text x="${14 + 8 * 25}" y="25" font-size="25" text-anchor="middle">${bomb ? '💣' : '💎'}</text>`;
      g += `<path d="M4 31 v6 h70 v-6" fill="none" stroke="${d}" stroke-width="2"/>`;
      return `<div class="ch-rules-col"><svg viewBox="0 0 232 40" role="img" aria-label="돌을 번갈아 가져가기">${g}</svg>
        <div class="ch-rules-row"><b style="color:${d}">한 번에 몇 개씩</b><b style="color:${bomb ? '#E9533F' : '#2E9E5B'}">마지막 ${bomb ? '폭탄 → 패배 💥' : '보석 → 승리 ✨'}</b></div></div>`;
    }
    if (k === 'qn') {
      let g = ''; const o = 4, z = 15, N = 6;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g += `<rect x="${o + x * z}" y="${3 + (N - 1 - y) * z}" width="${z}" height="${z}" fill="${x === 0 && y === 0 ? '#FFD23F' : (x + y) % 2 ? '#F8D9D3' : '#fff'}" stroke="${ink}" stroke-width=".6"/>`;
      const px = x => o + x * z + z / 2, py = y => 3 + (N - 1 - y) * z + z / 2, qx = 4, qy = 3;
      const ar = (x, y) => `<line x1="${px(qx)}" y1="${py(qy)}" x2="${px(x)}" y2="${py(y)}" stroke="${c}" stroke-width="2.6" marker-end="url(#chrA)"/>`;
      return `<svg viewBox="0 0 98 96" style="flex:0 0 98px" role="img" aria-label="퀸은 왼쪽, 아래, 왼쪽 아래 대각선으로 움직이고 구석에 넣으면 승리">
        <defs><marker id="chrA" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker></defs>${g}
        ${ar(1.4, 3)}${ar(4, .4)}${ar(1.4, .4)}<text x="${px(qx)}" y="${py(qy) + 6}" font-size="18" text-anchor="middle">♛</text><text x="${px(0)}" y="${py(0) + 4}" font-size="11" text-anchor="middle">★</text></svg>`
        + cap(`<b style="color:${d}">← 왼쪽 · ↓ 아래<br>↙ 대각선</b>`, `<b style="color:#B8860B">★ 구석에 넣으면 승리!</b>`);
    }
    let g = ''; const rows = [3, 4, 3];
    rows.forEach((n, r) => { for (let i = 0; i < n; i++) { const on = r === 1 && i < 2; g += `<circle cx="${16 + i * 26}" cy="${15 + r * 27}" r="${on ? 8 : 10.5}" fill="${on ? '#D8CDEB' : c}" stroke="${ink}" stroke-width="1.5"${on ? ' stroke-dasharray="3 2"' : ''}/>`; } });
    return `<svg viewBox="0 0 112 84" style="flex:0 0 112px" role="img" aria-label="한 줄에서 원하는 만큼 누르기">${g}<rect x="2" y="28.5" width="108" height="27" rx="13.5" fill="none" stroke="${d}" stroke-width="2" stroke-dasharray="5 4"/></svg>`
      + cap(`<b style="color:${d}">한 줄만 골라<br>원하는 만큼 꾹!</b>`, `<b style="color:#2E9E5B">마지막 버블 → 승리 ✨</b>`);
  }
  function rulesLines() {
    if (k === 'nt') return ['나와 AI가 번갈아 <b>둘 다 X</b>를 놓아요.', '가로·세로·대각선으로 <b>X 3개가 한 줄</b>이 되게 놓은 사람이 <b>져요</b>.', '끝까지 한 줄을 만들지 않고 버티면 승리!'];
    if (k === 'st') {
      let lim = 0; try { lim = +stLimit || 0; } catch (e) {}
      const one = lim ? `이번 판은 한 번에 <b>1~${lim}개</b>까지 가져갈 수 있어요. (판마다 3~5개로 달라져요)` : '한 번에 가져갈 수 있는 개수는 판마다 달라요(버튼 확인).';
      return ['나와 AI가 번갈아 돌을 가져가요.', one, S.mode === 'bomb' ? '<b>마지막 돌(폭탄 💣)</b>을 가져가는 사람이 <b>져요</b>.' : '<b>마지막 돌(보석 💎)</b>을 가져가는 사람이 <b>이겨요</b>.'];
    }
    if (k === 'qn') return ['나와 AI가 번갈아 <b>같은 퀸 하나</b>를 옮겨요.', '<b>왼쪽 · 아래 · 왼쪽 아래 대각선</b> 중 한 방향으로 원하는 칸만큼 갈 수 있어요.', '퀸을 <b>왼쪽 아래 구석(★)</b>에 넣는 사람이 <b>이겨요</b>.'];
    return ['나와 AI가 번갈아 버블을 눌러요.', '<b>한 줄만</b> 골라 그 줄에서 원하는 만큼 누른 뒤 <b>[선택 완료]</b>.', '<b>마지막 버블</b>을 누르는 사람이 <b>이겨요</b>.'];
  }
  const rulesEl = document.createElement('div'); rulesEl.id = 'ch-rules'; rulesEl.setAttribute('role', 'dialog'); rulesEl.setAttribute('aria-modal', 'true'); rulesEl.setAttribute('aria-label', G.name + ' 규칙');
  document.body.appendChild(rulesEl);
  function hideRules() {
    if (!rulesEl.classList.contains('on')) return;
    const ck = $('ch-rules-no'); rulesSet(!!(ck && ck.checked));
    rulesEl.classList.remove('on'); rulesEl.innerHTML = '';
  }
  // auto: 들어올 때 자동으로 뜬 창(체크 기본 켜짐 → 한 번만 뜸) · 버튼으로 열면 지금 저장된 상태 그대로
  function showRules(auto) {
    const lines = rulesLines().map((t, i) => `<li><i>${i + 1}</i><span>${t}</span></li>`).join('');
    rulesEl.innerHTML = `<div class="ch-res-box ch-rules-box"><div class="ch-rules-tag">📖 게임 규칙</div>
      <h2 class="ch-res-t">${esc(G.name)}</h2><div class="ch-rules-pic">${rulesPic()}</div><ol class="ch-rules-list">${lines}</ol>
      <p class="ch-rules-foot">내가 먼저 시작! AI를 이기면 도장 🏆</p>
      <label class="ch-rules-chk"><input type="checkbox" id="ch-rules-no"${auto || rulesSeen() ? ' checked' : ''}> 다음부터 이 규칙 안 보기</label>
      <div class="ch-res-btns"><button type="button" class="ch-btn ch-btn--main" id="ch-rules-ok">${auto ? '▶ 시작하기' : '닫기'}</button></div></div>`;
    $('ch-rules-ok').onclick = () => { try { playSfx('click'); } catch (e) {} hideRules(); };
    rulesEl.classList.add('on');
    try { $('ch-rules-ok').focus({ preventScroll: true }); } catch (e) {}
  }
  rulesEl.addEventListener('click', e => { if (e.target === rulesEl) hideRules(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && rulesEl.classList.contains('on')) hideRules(); });

  /* ---------- 상단바: "도전 2(상) 돌 가져가기" + ⬆ 도장판 ---------- */
  function topBar() {
    const nm = document.querySelector('.bk-top__name'); if (nm) nm.textContent = `도전 ${S.label} ${G.name}`;
    const num = document.querySelector('.bk-top__num'); if (num) num.textContent = '🏆';
    if (!$('ch-up')) {
      const up = document.createElement('a'); up.id = 'ch-up'; up.className = 'bk-top__home bk-top__up'; up.href = BOARD; up.title = '도장판으로';
      up.innerHTML = '⬆ <span>도장판</span>';
      up.addEventListener('click', e => { e.preventDefault(); goBoard(); });
      document.querySelector('.bk-top__home')?.after(up);
    }
    document.title = `도전 ${S.label} ${G.name} · 부산의 활동수학 축전`;
  }

  /* ---------- 들어가기 ---------- */
  try { closeVictoryModal(true); } catch (e) {}
  currentGame = G.g; skipRulesOnce = true;
  openGameSection(G.g);
  topBar();
  start();
  if (!rulesSeen()) showRules(true);   // 이 게임 규칙을 아직 안 봤으면 한 번 보여 주기
  // 뒤로 가기 캐시로 돌아왔을 때(드묾): 끝난 판이면 새로
  window.addEventListener('pageshow', e => { if (e.persisted) topBar(); });
})();
