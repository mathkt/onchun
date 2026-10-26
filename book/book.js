/* 조사 붙이기: josa(5,'을/를') → '5를', josa('책','이/가') → '책이' */
window.josa = function (w, pair) { const s = String(w); const ch = s[s.length - 1]; const code = ch.charCodeAt(0); let bat; if (code >= 0xAC00 && code <= 0xD7A3) bat = (code - 0xAC00) % 28 !== 0; else if (/[0-9]/.test(ch)) bat = '013678'.includes(ch); else bat = /[^aeiouAEIOU\s]/.test(ch) && /[a-zA-Z]/.test(ch) ? true : false; const [a, b] = pair.split('/'); return s + (bat ? a : b); };
/* 책 활동 페이지 공통: 장 소개(한 화면) ↔ 활동 모드(탭 상단 고정) 전환 */
(function () {
  function init() {
    const intro = document.querySelector('.ch-intro'), tabs = document.getElementById('tabs');
    if (!intro || !tabs) return;
    const body = document.body;
    const slot = document.createElement('div'); slot.className = 'ch-intro__tabs';
    const slotH = document.createElement('div'); slotH.className = 'ch-intro__tabs-h'; slotH.textContent = '활동을 골라 시작하세요 👇';
    slot.appendChild(slotH);
    intro.querySelector('.ch-intro__text').appendChild(slot);
    const anchor = document.createElement('div'); anchor.className = 'tabs-anchor'; tabs.before(anchor);
    const back = document.createElement('button'); back.type = 'button'; back.className = 'tab tab--intro';
    back.innerHTML = '<span class="tab__n">≡</span><span class="tab__l">장 소개</span><span class="tab__s">소개</span>';
    back.addEventListener('click', () => setMode(false));

    function setMode(act) {
      body.classList.toggle('act-mode', act);
      if (act) { anchor.after(tabs); if (!back.parentNode) tabs.prepend(back); }
      else {
        back.remove(); slot.appendChild(tabs);
        document.querySelectorAll('.act-page').forEach(p => { p.hidden = true; p.style.display = 'none'; });
        tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        window.scrollTo(0, 0);
      }
    }
    tabs.addEventListener('click', e => {
      const b = e.target.closest('.tab'); if (!b || b === back) return;
      if (!body.classList.contains('act-mode')) { setMode(true); setTimeout(() => window.scrollTo({ top: 0 }), 0); }
      if (b.dataset.t) history.replaceState(null, '', '#' + b.dataset.t);
    }, true);
    const h0 = location.hash.slice(1);
    setMode(false);
    const b0 = h0 && tabs.querySelector(`.tab[data-t="${h0}"]`);
    if (b0) b0.click();
    window.addEventListener('hashchange', () => {
      const h = location.hash.slice(1); const b = h && tabs.querySelector(`.tab[data-t="${h}"]`);
      if (b && !b.classList.contains('on')) b.click();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
