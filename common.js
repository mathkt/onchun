/* 부산의 활동수학 · 축전 공통 스크립트
   사용법: <script src="../../common.js" data-num="02" data-name="팝잇 게임" data-sub="필승 전략" data-home="../../" data-up="../index.html" data-up-name="게임 목록"></script>
   → body 맨 위에 공통 상단바를 끼워 넣는다. */
(function () {
  const me = document.currentScript;
  const num  = me?.dataset.num  || '';
  const name = me?.dataset.name || document.title;
  const sub  = me?.dataset.sub  || '';
  const home = me?.dataset.home || './';
  const extra = me?.dataset.extra || ''; // 오른쪽에 넣을 HTML (선택)
  const up    = me?.dataset.up    || '';  // 상위 페이지 경로 (선택)
  const upName= me?.dataset.upName|| '상위';

  function mount() {
    if (document.querySelector('.bk-top')) return;
    const bar = document.createElement('div');
    bar.className = 'bk-top';
    bar.innerHTML = `
      <div class="bk-top__in">
        <a class="bk-top__home" href="${home}index.html" title="축전 처음 화면으로">🏠 <span>홈</span></a>
        ${up ? `<a class="bk-top__home bk-top__up" href="${up}" title="${upName}로">⬆ <span>${upName}</span></a>` : ''}
        <div class="bk-top__title">
          ${num ? `<span class="bk-top__num">${num}</span>` : ''}
          <span class="bk-top__name">${name}</span>
          ${sub ? `<span class="bk-top__sub">· ${sub}</span>` : ''}
        </div>
        <div class="bk-top__right">${extra}</div>
      </div>`;
    document.body.prepend(bar);
    document.body.classList.add('bk-has-top');
    const setH = () => document.documentElement.style.setProperty('--bk-top-h', bar.offsetHeight + 'px');
    setH(); window.addEventListener('resize', setH);
    window.BK_TOP_H = () => bar.offsetHeight;
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // 공통: 두 번 탭 확대 방지(터치 기기)
  let last = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - last < 300 && e.target.closest('button,.bubble,.cell,.ttt-cell,.stone')) e.preventDefault();
    last = now;
  }, { passive: false });
})();
