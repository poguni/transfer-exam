# CLAUDE.md — 편입 캘린더(TExam Calendar)

## 문서 위치 (폴더 구조 유지)
- 기능 명세: `docs/편입 캘린더(TExam Calendar) PRD.md` (이하 PRD). 기능·데이터는 PRD가 우선.
- 시각 디자인: `design/DESIGN.md`. 시각 표현은 DESIGN이 우선.
- 시안: `design/design-mockup.html`(모바일·인쇄), `design/desktop-mockup.html`(데스크톱).
- `docs/`에는 문서(PRD, 개발 보고서 등), `design/`에는 디자인 가이드·시안만 둔다. 이 두 폴더 구조를 바꾸지 않는다.

## 화면 원칙 (사용자 결정, 2026-11-16)
- **데스크톱을 먼저 구현**하고, 반응형으로 아이폰(393×852)까지 맞춘다. 입력은 주로 데스크톱, 아이폰은 확인용.
- 데스크톱은 **화면 전체 폭을 사용**한다. 콘텐츠를 가운데에 모으는 `max-width` 틀을 쓰지 않는다.
- 데스크톱 달력 기본 보기는 **1개월 크게 + 오른쪽 상세 패널**. 2개월·4개월 보기는 선택.
- 일정 입력은 **오른쪽 패널**(달력을 보면서), 대학 등록은 **화면 폭 전체 페이지**.
- 대학 등록 폼은 처음에 A·B 섹션을 펼친다(DESIGN 기준).

## Supabase (Link Plan 프로젝트 공유, ref `sobpuuaxqnkyfbkgfyxq`)
- **`tcal_` 접두사가 붙은 객체만** 만들고 고친다. Link Plan의 기존 테이블(`plans`, `tasks`, `task_plan_links`, `profiles`, `user_settings`)·함수·트리거·정책·Auth 설정(Site URL 등)은 읽기만 한다.
- `auth.users`에는 Link Plan의 `on_auth_user_created` 트리거(→ `private.handle_new_user`, `profiles` 생성)가 있다. 이 앱은 회원가입을 하지 않고, `auth.users`에 트리거를 달지 않는다.
- 로그인은 이메일 + 비밀번호(Link Plan과 같음).
- 스키마 변경은 반드시 `supabase/migrations/`의 SQL 파일로 남긴다.
- 이 프로젝트는 **새 테이블에 `anon`·`authenticated` 데이터 권한을 자동으로 주지 않는다.** 새 `tcal_` 테이블을 만들면 `authenticated`에 필요한 권한만 `grant`하고, `anon`에는 주지 않는다(`20261117000100_tcal_grants.sql` 참고).
- RLS 검증은 `do $$ ... raise exception 'RESULT: %' ... $$` 블록 안에서 `set local role authenticated` + `request.jwt.claims`로 사용자를 바꿔 확인하고, 마지막 예외로 전부 되돌린다(운영 DB에 테스트 데이터를 남기지 않음).
- 클라이언트에는 anon(공개) 키만 쓴다. service_role 키는 어디에도 넣지 않는다.

## 구현 규칙
- 날짜·시간 계산은 모두 `Asia/Seoul` 기준이고, 관련 함수에는 단위 테스트(Vitest)를 둔다.
- 컴포넌트는 디자인 토큰(CSS 변수)만 참조한다. 테마는 `<html data-theme="wongoji|planner">`.
- 화면 확인은 Playwright로 데스크톱(1920×1080, 1440×900, 1280×800)과 `iPhone 15 Pro`(393×852)에서 한다.
- 인쇄 화면은 Playwright `page.pdf({ format: 'A4' })`로 확인한다.
- 화면 흐름 확인은 `npm run build` 후 Playwright MCP `browser_run_code`에 `tests/e2e/mock-backend.pw.js`(가짜 Supabase + dist 제공)를 실행하고 `http://app.local/`을 연다. 로그인은 아무 이메일 + 비밀번호(`wrong`이면 실패)로 한다.
- 배포는 GitHub Pages(정적 SPA). Vite `base` 경로와 SPA 경로 처리(404.html 또는 해시 라우팅)를 고려한다.

## Git
- **Git·GitHub 작업은 사용자가 직접 한다.** Claude는 `git` 명령을 실행하지 않고, 작업 단계가 끝날 때 커밋하기 좋은 시점과 커밋 메시지(한국어)만 알려 준다.
