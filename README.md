# 부산의 활동수학 · 수학 축전 웹

『부산의 활동수학』 책 속 게임을 웹에서 바로 해 볼 수 있게 모은 축전 부스용 사이트.

- `index.html` — 메인 허브 (메인 게임 3개 + 책 목차)
- `common.css`, `common.js` — 책 지면 스타일 공통 테마, 공통 상단바
- `games/arcade/` — 메인 게임 3종(팝잇·돌 가져가기·노탁토), `games/online.js` 공용 온라인 대전
- `games/arcade/` — 노탁토 · 돌 가져가기 (`?game=notakto`, `?game=stone`)
- `games/queen/` — 황금비 퀸
- `src/` — 학생 원본 파일 보관
- `img/` — 책 단원 도입 이미지

배포: GitHub Pages → https://mathkt.github.io/onchun/

## 운영 메모
- `qr.html` — 부스 대기 화면(홈 QR). 크롬북에서 F11 전체 화면으로 띄워 두면 됨.
- 오프라인 대비: `sw.js`(서비스 워커)가 사이트 전체를 캐시. 파일을 고친 뒤에는 `python3 tools/build-sw.py`로 sw.js를 다시 만들고 커밋.
- 온라인 대전: 팝잇 Firebase(popit-88756) 재사용, 방은 `rooms/S1234`(돌)·`N1234`(노탁토)·`P1234`(팝잇).
- 이름·전적·"규칙 다시 안 보기"는 기기(localStorage)에 저장.
