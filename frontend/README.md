# simple-cal frontend

개인용 일정 관리 웹앱의 프론트엔드. 설계는 [`../docs/superpowers/specs/2026-11-22-simple-cal-design.md`](../docs/superpowers/specs/2026-11-22-simple-cal-design.md).

## 실행

```bash
npm install
npm run dev     # 개발 서버 — MSW 가짜 API가 켜지고 데이터는 브라우저 localStorage에 저장
npm test        # 테스트
npm run build   # 프로덕션 빌드 (MSW 미포함)
```

가짜 데이터를 지우려면 브라우저 개발자 도구에서 `localStorage.removeItem('simple-cal:db')` 후 새로고침.

## 스프링부트 백엔드 연결

```bash
VITE_MOCK=off VITE_API_TARGET=http://localhost:8080 npm run dev
```

- `VITE_MOCK=off` 이면 MSW를 시작하지 않고, `/api` 요청은 Vite 프록시를 통해 `VITE_API_TARGET`으로 간다.
- API 계약은 설계 문서 **3.4** 절이 기준이다 (경로, 포함 범위 규칙, PATCH의 "빠진 필드 = 유지 / null = 비움", 오류 `{ "message": string }`).
- 첫 실행 시 캘린더가 없으면 `{ name: '내 캘린더', color: '#4a7bd8', visible: true }` 하나를 만드는 규칙(`src/mocks/db.ts`)을 백엔드에서도 같게 구현한다.
- MSW 핸들러(`src/mocks/handlers.ts`)와 그 테스트가 계약의 실행 가능한 예시다.
