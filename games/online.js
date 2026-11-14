/* 부산의 활동수학 축전 · 공용 온라인 대전 모듈 (Firebase Realtime DB, compat SDK)
   - 팝잇이 쓰는 Firebase 프로젝트·DB 규칙을 그대로 씀: rooms/<S|N><4자리> (팝잇 방은 6자리라 겹치지 않음)
   - 2인 턴제 게임이면 어떤 게임이든 붙일 수 있음

   사용법:
     Online.init({ game:'stone' });                       // 1회
     Online.create(settings)   → Promise<code>            // 방장(1번)
     Online.join(code)         → Promise<settings>        // 손님(2번)
     Online.on(ev => ...)      // {type:'joined'} {type:'move', move, by} {type:'reset', settings} {type:'left', reason}  {type:'conn', connected}
     Online.sendMove(move)     // 내 수 전송(아무 JSON)
     Online.reset(settings)    // 방장만: 새 판 시작(설정 갱신 가능)
     Online.leave()
     Online.myNum (1|2)  Online.active (bool)  Online.code

   🎓 조교와의 대결 (고정 번호 방 rooms/T<1111|2222|3333|4444>, kind:'ta')
     Online.openTa(code, name) → Promise<settings>   // 조교(방장): 방 열기 = 없으면 만들고, 있으면 넘겨받아 비움(새 판 번호·새 sid). 다음 도전자 받기도 이것
     Online.joinTa(code, name) → Promise<settings>   // 도전자: 조교가 기다리는 중(phase:'wait')이고 비어 있을 때만. 실패 시 e.code = 'away' | 'busy'
     · 방 모양은 보통 방과 같음. 진행 상태는 settings 안에만 넣음: { ta:1, sid, phase:'wait'|'pick'|'play', game, …그 게임 설정 }
     · 나감 표시는 left:<내 id> 하나만 씀 (열 때·들어올 때마다 새 id → 예전 기기의 늦은 onDisconnect는 무시됨)
     · {type:'left', reason}: 'opponent'(상대 나감 — 조교는 방에 남음) · 'self'(조교: 내 끊김 표시가 남음) · 'ended'(도전자: 조교가 방을 새로 엶) · 'busy'(도전자: 다른 도전자가 먼저) · 'replaced'(조교: 다른 기기가 엶)
*/
window.Online = (function () {
  const CONFIG = {
    apiKey: "AIzaSyDAaY-3LEVWphoxuSwoBjupK2lj1Mhov6w",
    authDomain: "popit-88756.firebaseapp.com",
    databaseURL: "https://popit-88756-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "popit-88756",
    storageBucket: "popit-88756.firebasestorage.app",
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  let db = null, game = 'game', roomRef = null, code = '', myNum = 0, handlers = [], applied = 0, gameNo = 0, sub = null, active = false, names = {}, seen = new Set();
  const rid = () => Math.random().toString(36).slice(2, 10);
  let myId = rid();
  let ta = false, taSid = '', taHostId = '';   // 🎓 조교 방 안인가 · (도전자) 들어올 때의 sid·조교 id
  const TA_CODES = ['1111', '2222', '3333', '4444'];

  function loadScript(src) {
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.head.appendChild(s); });
  }
  async function ensureDb() {
    if (db) return db;
    if (typeof firebase === 'undefined') await loadScript(SDK + 'firebase-app-compat.js');
    if (!firebase.database) await loadScript(SDK + 'firebase-database-compat.js');
    if (!firebase.apps.length) firebase.initializeApp(CONFIG);
    db = firebase.database();
    return db;
  }
  function emit(ev) { handlers.forEach(h => { try { h(ev); } catch (e) { console.error(e); } }); }
  const PREFIX = { stone: 'S', notakto: 'N', popit: 'P', queen: 'Q' };
  function base() { return db.ref('rooms'); }
  function key(c) { return (PREFIX[game] || game[0].toUpperCase()) + c; }
  function newCode() { for (;;) { const c = String(1000 + Math.floor(Math.random() * 9000)); if (!TA_CODES.includes(c)) return c; } } // 조교 번호는 보통 방에 안 씀 (헷갈리지 않게)
  const TS = () => firebase.database.ServerValue.TIMESTAMP;

  function listen() {
    let lastGuest = null, lastGameNo = null, lastGone = null, selfGone = false;
    sub = snap => {
      const r = snap.val();
      if (!r) { if (active) { active = false; emit({ type: 'left', reason: 'closed' }); } return; }
      if (ta) { // 내 자리가 아직 내 것인가 (조교: 다른 기기가 엶 · 도전자: 조교가 방을 새로 엶 / 다른 도전자가 먼저 들어감)
        if (!active) return;
        if (myNum === 1 && !(r.host && r.host.id === myId)) { active = false; emit({ type: 'left', reason: 'replaced' }); return; }
        if (myNum === 2 && !(r.guest && r.guest.id === myId && r.host && r.host.id === taHostId)) {
          const same = r.host && r.host.id === taHostId && r.settings && r.settings.sid === taSid && r.guest && r.guest.id;
          active = false; emit({ type: 'left', reason: same ? 'busy' : 'ended' }); return;
        }
      }
      if (r.gameNo !== lastGameNo) {
        const first = lastGameNo === null;
        lastGameNo = r.gameNo; gameNo = r.gameNo; applied = 0; seen = new Set();
        if (!first) emit({ type: 'reset', settings: r.settings || {} });
      }
      const nn = { 1: r.host && r.host.name, 2: r.guest && r.guest.name };
      if (nn[1] !== names[1] || nn[2] !== names[2]) { names = nn; emit({ type: 'names', names: nn }); }
      const gid = r.guest && r.guest.id;
      if (myNum === 1 && gid && gid !== lastGuest) { lastGuest = gid; emit({ type: 'joined' }); }
      if (ta && myNum === 1 && !gid) lastGuest = null;
      if (myNum === 2 && lastGuest === null) lastGuest = gid;
      const moves = (r.moves && r.moves[gameNo]) || {};
      const keys = Object.keys(moves).map(Number).sort((a, b) => a - b);
      // 번호 순서대로 한 번씩만 처리 (동시에 보낸 수가 다른 번호로 밀려 들어와도 놓치지 않게)
      // 상대가 마지막 수를 두고 바로 나가도 그 수가 먼저 반영되게 'left'보다 먼저 처리
      for (const k of keys) {
        if (seen.has(k)) continue;
        const m = moves[k]; if (!m) continue;
        seen.add(k); if (k + 1 > applied) applied = k + 1;
        if (m.by !== myNum) emit({ type: 'move', move: m.move, by: m.by, idx: k });
      }
      if (!active) return;
      if (ta) { // 나감 = left 가 지금 상대의 id 일 때만 (예전 사람의 늦은 표시는 무시). 조교는 방에 남아 다음 도전자를 받음
        if (myNum === 1) {
          if (r.left === myId) { if (!selfGone) { selfGone = true; emit({ type: 'left', reason: 'self' }); } }   // 내 끊김 표시가 남아 있음(잠깐 끊겼다 이어짐) → 조교가 방을 다시 열어야 함
          else if (gid && r.left === gid && gid !== lastGone) { lastGone = gid; emit({ type: 'left', reason: 'opponent' }); }
        }
        else if (r.left === r.host.id || r.host.online === false) { active = false; emit({ type: 'left', reason: 'opponent' }); }
        return;
      }
      if (r.left && r.left !== myId) { active = false; emit({ type: 'left', reason: 'opponent' }); return; }
      // 상대 접속 표시(online)가 꺼짐 = 나감 (onDisconnect)
      const opp = myNum === 1 ? r.guest : r.host;
      if (opp && opp.id && opp.id !== myId && opp.online === false) { active = false; emit({ type: 'left', reason: 'opponent' }); return; }
    };
    roomRef.on('value', sub);
    watchConn();
  }
  // 내 연결 상태 (.info/connected): 한 번 연결된 뒤부터 바뀔 때마다 {type:'conn', connected}
  let connRef = null, connSub = null;
  function watchConn() {
    unwatchConn();
    try {
      let was = null;
      connRef = db.ref('.info/connected');
      connSub = s => { const v = !!(s && s.val()); if (was === null && !v) return; if (v === was) return; was = v; emit({ type: 'conn', connected: v }); };
      connRef.on('value', connSub);
    } catch (e) { connRef = null; connSub = null; }
  }
  function unwatchConn() { if (connRef) { try { connRef.off('value', connSub); } catch (e) { } } connRef = null; connSub = null; }
  // 지금 방 듣기만 끊기 (방에는 아무것도 안 씀) — 조교 방을 다시 열거나 다시 들어가기 전에
  function detach() {
    unwatchConn();
    if (roomRef) { try { roomRef.off('value', sub); roomRef.onDisconnect().cancel(); } catch (e) { } }
    roomRef = null; active = false; applied = 0; seen = new Set();
  }

  return {
    get myNum() { return myNum; }, get active() { return active; }, get code() { return code; }, get names() { return names; }, get gameNo() { return gameNo; },
    init(o) { game = (o && o.game) || game; },
    on(h) { handlers.push(h); },
    async create(settings, name) {
      await ensureDb();
      // 비어 있는 코드 찾기
      for (let i = 0; i < 8; i++) {
        const c = newCode(); const ref = base().child(key(c));
        const s = await ref.get();
        if (!s.exists() || (Date.now() - (s.val().createdAt || 0)) > 3 * 3600 * 1000) {
          ta = false; code = c; roomRef = ref; myNum = 1; applied = 0; seen = new Set(); active = true; gameNo = 1;
          await ref.set({ createdAt: TS(), updatedAt: TS(), lobby: null, host: { name: name || '방장', online: true, id: myId }, guest: null });
          await ref.update({ kind: game, settings: settings || {}, gameNo: 1, updatedAt: TS() });
          ref.onDisconnect().update({ left: myId, 'host/online': false, updatedAt: TS() });
          listen();
          return code;
        }
      }
      throw new Error('코드를 만들지 못했어요. 다시 시도해 주세요.');
    },
    async join(c, name) {
      await ensureDb();
      c = String(c || '').trim();
      const ref = base().child(key(c)); const s = await ref.get();
      if (!s.exists() || !s.val().gameNo) throw new Error('그 번호의 방이 없어요.');
      const r = s.val();
      if (r.guest || r.left) throw new Error('이미 꽉 찼거나 끝난 방이에요.');
      ta = false; code = c; roomRef = ref; myNum = 2; applied = 0; seen = new Set(); active = true; gameNo = r.gameNo;
      await ref.update({ guest: { name: name || '손님', online: true, id: myId }, updatedAt: TS() });
      ref.onDisconnect().update({ left: myId, 'guest/online': false, updatedAt: TS() });
      listen();
      return r.settings || {};
    },
    // 🎓 조교: 고정 번호 방 열기 (처음 · 다음 도전자 받기 · 다시 연결 모두 이것). 항상 성공 — 있던 방은 넘겨받아 비움
    async openTa(c, name) {
      await ensureDb();
      c = String(c || '').trim();
      if (!TA_CODES.includes(c)) throw new Error('조교 번호가 아니에요.');
      detach();
      const ref = base().child('T' + c);
      const r = (await ref.get()).val();
      const id = rid(), settings = { ta: 1, phase: 'wait', sid: rid() };
      const host = { name: name || '조교', online: true, id };
      let no = 1;
      if (!r) {
        await ref.set({ createdAt: TS(), updatedAt: TS(), lobby: null, host, guest: null });
        await ref.update({ kind: 'ta', settings, gameNo: 1, updatedAt: TS() });
      } else {
        no = (parseInt(r.gameNo) || 0) + 1;
        await ref.update({ host, guest: null, left: null, gameNo: no, moves: null, settings, kind: 'ta', updatedAt: TS() });
      }
      ta = true; myId = id; taSid = settings.sid; taHostId = id;
      code = c; roomRef = ref; myNum = 1; applied = 0; seen = new Set(); active = true; gameNo = no; names = {};
      try { ref.onDisconnect().update({ left: id, updatedAt: TS() }); } catch (e) { }
      listen();
      return settings;
    },
    // 🎓 도전자: 조교 방에 들어가기
    async joinTa(c, name) {
      await ensureDb();
      c = String(c || '').trim();
      detach();
      const err = (code, msg) => { const e = new Error(msg); e.code = code; return e; };
      const ref = base().child('T' + c);
      const r = (await ref.get()).val();
      if (!r || r.kind !== 'ta' || !r.gameNo || !r.host || !r.host.id || r.host.online === false || r.left === r.host.id) throw err('away', '조교가 자리에 없어요');
      const st = r.settings || {};
      if ((r.guest && r.guest.id) || st.phase !== 'wait') throw err('busy', '대결 중이에요. 잠시 후 다시 눌러 주세요');
      const id = rid();
      await ref.update({ guest: { name: name || '도전자', online: true, id }, updatedAt: TS() });
      ta = true; myId = id; taSid = st.sid || ''; taHostId = r.host.id;
      code = c; roomRef = ref; myNum = 2; applied = 0; seen = new Set(); active = true; gameNo = r.gameNo; names = {};
      try { ref.onDisconnect().update({ left: id, updatedAt: TS() }); } catch (e) { }
      listen();
      return st;
    },
    get ta() { return ta; }, get taSid() { return taSid; },
    // 다른 게임의 방인지 찾아보기: 들어갈 수 있는 방이면 그 게임 이름(stone|notakto|popit|queen), 조교 방이면 'ta', 없으면 null
    async probe(c) {
      await ensureDb();
      c = String(c || '').trim();
      for (const g in PREFIX) {
        if (g === game) continue;
        try {
          const s = await base().child(PREFIX[g] + c).get();
          const r = s.val();
          if (r && r.gameNo && !r.guest && !r.left && (Date.now() - (r.createdAt || 0)) < 3 * 3600 * 1000) return g;
        } catch (e) { }
      }
      if (TA_CODES.includes(c)) { // 🎓 조교 번호: 조교가 자리에 있으면 조교와의 대결로 안내
        try {
          const r = (await base().child('T' + c).get()).val();
          if (r && r.kind === 'ta' && r.gameNo && r.host && r.host.id && r.host.online !== false && r.left !== r.host.id) return 'ta';
        } catch (e) { }
      }
      return null;
    },
    // 내 수 전송: 빈 번호에만 씀(transaction). 두 사람이 같은 번호에 동시에 쓰면(가위바위보·제한시간 켜기 등) 늦은 쪽이 다음 번호로 밀림
    sendMove(move) {
      if (!active || !roomRef) return;
      const gn = gameNo, ref0 = roomRef, data = { by: myNum, move, t: Date.now() };
      const tryAt = (idx, n) => {
        if (idx + 1 > applied) applied = idx + 1;
        const path = 'moves/' + gn + '/' + idx;
        const plain = () => ref0.update({ [path]: data, updatedAt: TS() });
        const ref = ref0.child(path);
        if (typeof ref.transaction !== 'function') return plain();
        ref.transaction(cur => (cur === null || cur === undefined) ? data : undefined, (err, ok) => {
          if (err) { console.warn('sendMove', err); return plain(); }
          if (!ok) { if (roomRef === ref0 && gameNo === gn && n < 20) tryAt(Math.max(applied, idx + 1), n + 1); return; }
          ref0.update({ updatedAt: TS() }).catch(() => { });
        }, false);
      };
      tryAt(applied, 0);
    },
    async reset(settings) {
      if (!active || !roomRef || myNum !== 1) return;
      const no = gameNo + 1;
      await roomRef.update({ gameNo: no, settings: settings || {}, ['moves/' + no]: null, updatedAt: TS() });
    },
    leave() {
      unwatchConn();
      if (roomRef) { try { roomRef.off('value', sub); roomRef.onDisconnect().cancel(); if (active) roomRef.update({ left: myId, updatedAt: TS() }); } catch (e) { } }
      roomRef = null; code = ''; myNum = 0; active = false; applied = 0; gameNo = 0; names = {}; seen = new Set(); ta = false;
    },
  };
})();
