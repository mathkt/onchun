/* 부산의 활동수학 축전 · 공용 온라인 대전 모듈 (Firebase Realtime DB, compat SDK)
   - 팝잇이 쓰는 Firebase 프로젝트·DB 규칙을 그대로 씀: rooms/<S|N><4자리> (팝잇 방은 6자리라 겹치지 않음)
   - 2인 턴제 게임이면 어떤 게임이든 붙일 수 있음

   사용법:
     Online.init({ game:'stone' });                       // 1회
     Online.create(settings)   → Promise<code>            // 방장(1번)
     Online.join(code)         → Promise<settings>        // 손님(2번)
     Online.on(ev => ...)      // {type:'joined'} {type:'move', move, by} {type:'reset', settings} {type:'left'}
     Online.sendMove(move)     // 내 수 전송(아무 JSON)
     Online.reset(settings)    // 방장만: 새 판 시작(설정 갱신 가능)
     Online.leave()
     Online.myNum (1|2)  Online.active (bool)  Online.code
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
  let db = null, game = 'game', roomRef = null, code = '', myNum = 0, handlers = [], applied = 0, gameNo = 0, sub = null, active = false, names = {};
  const myId = Math.random().toString(36).slice(2, 10);

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
  function newCode() { return String(1000 + Math.floor(Math.random() * 9000)); }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;

  function listen() {
    let lastGuest = null, lastGameNo = null;
    sub = snap => {
      const r = snap.val();
      if (!r) { if (active) { active = false; emit({ type: 'left', reason: 'closed' }); } return; }
      if (r.gameNo !== lastGameNo) {
        const first = lastGameNo === null;
        lastGameNo = r.gameNo; gameNo = r.gameNo; applied = 0;
        if (!first) emit({ type: 'reset', settings: r.settings || {} });
      }
      const nn = { 1: r.host && r.host.name, 2: r.guest && r.guest.name };
      if (nn[1] !== names[1] || nn[2] !== names[2]) { names = nn; emit({ type: 'names', names: nn }); }
      const gid = r.guest && r.guest.id;
      if (myNum === 1 && gid && gid !== lastGuest) { lastGuest = gid; emit({ type: 'joined' }); }
      if (myNum === 2 && lastGuest === null) lastGuest = gid;
      if (r.left && r.left !== myId) { active = false; emit({ type: 'left', reason: 'opponent' }); return; }
      const moves = (r.moves && r.moves[gameNo]) || {};
      const keys = Object.keys(moves).map(Number).sort((a, b) => a - b);
      for (const k of keys) {
        if (k < applied) continue;
        const m = moves[k]; applied = k + 1;
        if (m.by !== myNum) emit({ type: 'move', move: m.move, by: m.by, idx: k });
      }
    };
    roomRef.on('value', sub);
  }

  return {
    get myNum() { return myNum; }, get active() { return active; }, get code() { return code; }, get names() { return names; },
    init(o) { game = (o && o.game) || game; },
    on(h) { handlers.push(h); },
    async create(settings, name) {
      await ensureDb();
      // 비어 있는 코드 찾기
      for (let i = 0; i < 8; i++) {
        const c = newCode(); const ref = base().child(key(c));
        const s = await ref.get();
        if (!s.exists() || (Date.now() - (s.val().createdAt || 0)) > 3 * 3600 * 1000) {
          code = c; roomRef = ref; myNum = 1; applied = 0; active = true;
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
      code = c; roomRef = ref; myNum = 2; applied = 0; active = true;
      await ref.update({ guest: { name: name || '손님', online: true, id: myId }, updatedAt: TS() });
      ref.onDisconnect().update({ left: myId, 'guest/online': false, updatedAt: TS() });
      listen();
      return r.settings || {};
    },
    sendMove(move) {
      if (!active || !roomRef) return;
      const idx = applied; applied = idx + 1;
      roomRef.update({ ['moves/' + gameNo + '/' + idx]: { by: myNum, move, t: Date.now() }, updatedAt: TS() });
    },
    async reset(settings) {
      if (!active || !roomRef || myNum !== 1) return;
      const no = gameNo + 1;
      await roomRef.update({ gameNo: no, settings: settings || {}, ['moves/' + no]: null, updatedAt: TS() });
    },
    leave() {
      if (roomRef) { try { roomRef.off('value', sub); roomRef.onDisconnect().cancel(); if (active) roomRef.update({ left: myId, updatedAt: TS() }); } catch (e) { } }
      roomRef = null; code = ''; myNum = 0; active = false; applied = 0; gameNo = 0; names = {};
    },
  };
})();
