# simple-cal frontend

개인용 일정 관리 웹앱의 프론트엔드. 설계는 [`../docs/superpowers/specs/2026-11-22-simple-cal-design.md`](../docs/superpowers/specs/2026-11-22-simple-cal-design.md).

## 실행

```bash
npm install
npm run dev     # 개발 서버 — MSW 가짜 API가 켜지고 데이터는 브라우저 localStorage에 저장
npm test        # 테스트
npm run build   # 프로덕션 빌드 (MSW 미포함)
npm run test:e2e  # 브라우저 e2e (Playwright, 개발 서버 자동 실행)
```

e2e는 `e2e/`에 있고, 실제 Chromium으로 빠른 생성·드래그·보기 전환·밀린 할 일 등을 확인한다. '오늘'은 2026-11-25로 고정되고 테스트마다 빈 가짜 DB로 시작한다. 처음 한 번은 `npx playwright install chromium`이 필요하다.

가짜 데이터를 지우려면 브라우저 개발자 도구에서 `localStorage.removeItem('simple-cal:db')` 후 새로고침.

## 실제 백엔드로 실행

백엔드(`../backend`)를 먼저 띄운 뒤:

```bash
VITE_MOCK=off npm run dev   # /api 요청이 Vite 프록시를 통해 localhost:8080으로 간다
```

- `VITE_MOCK=off` 이면 MSW를 시작하지 않는다. 백엔드 주소를 바꾸려면 `VITE_API_TARGET`.
- 예전에 MSW 개발 모드로 띄운 적이 있으면 브라우저에 서비스 워커가 남아 있을 수 있다. 개발자 도구 Application → Service Workers에서 해제하면 확실하다.
- API 계약은 설계 문서 **3.4** 절, 오류 응답(RFC 9457 Problem Details, 상태 코드 기준)은 [백엔드 설계서 3.4](../docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md). MSW도 같은 형식으로 응답한다(`src/mocks/problems.ts`).
