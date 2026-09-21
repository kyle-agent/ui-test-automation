# SCP 콘솔 UI 회귀 테스트

Samsung Cloud Platform v2 Enterprise 콘솔(https://console.e.samsungsdscloud.com)의 화면 진입 스모크와 회귀 스위트.
설계와 역할 분담은 `docs/DESIGN.md`, 인수인계는 `docs/HANDOFF.md`, 시나리오 형식은 `scenarios/_FORMAT.md` 를 본다.

- **Playwright(코드, LLM 없음)** 가 회귀를 판정한다: url / `document.title` / 텍스트 단언.
- **Jev**(TypeSafe 결정 모델, OpenRouter) 는 기록 단계와 로케이터 복구에서 "어느 요소를 어떤 동작으로" 만 고른다.
- 로그인은 자동화하지 않는다. 사람이 로컬 PC 에서 SSO/MFA 로그인한 세션(`storageState`)을 러너가 재사용한다.
- 자격 증명과 OTP 는 코드·LLM·트레이스 어디에도 들어가지 않는다.

## 구성

```
service-map/            서비스·화면 트리 (메뉴 API 스냅샷). screens.json 이 기준, screens.txt 는 사람용
  snapshots/<date>.json 날짜별 정규화 스냅샷 (커밋) → npm run menu:diff 로 변경 감지
  titles.json           라우트별로 확인된 document.title. 있으면 정확히 일치해야 한다
scenarios/              사람이 읽는 시나리오 YAML (goal + 결정적 expect)
  smoke/                89개 서비스 화면 진입 스모크 (runner/gen_smoke.sh 가 screens.txt 에서 생성)
  auth/                 로그인 전 공개 화면 (세션 불필요)
tests/
  smoke/                scenarios/smoke → 자동 생성 spec (npm run gen:smoke-specs)
  auth/                 공개 로그인 페이지 spec
  setup/                세션 유효성 확인 (smoke/regression 의 선행 조건)
  regression/           Jev 트레이스에서 변환한 회귀 spec (예정)
  unit/                 파서·diff·시나리오 로더 테스트 (브라우저 불필요)
src/console/            콘솔 URL/세션 env, 결정적 expect, 제목 레지스트리
src/service-map/        메뉴 트리 파서·정규화·diff
src/scenario/           YAML 로더, {{run_id}} 치환
scripts/                auth-login, menu-snapshot, menu-diff, gen-smoke-specs, titles-merge
recordings/             session-*.json (gitignore) 와 Jev 기록 트레이스
```

## 시작하기 (로컬 PC)

```bash
npm install
npx playwright install chromium   # PW_CHANNEL=msedge 를 쓰면 생략 가능
cp .env.example .env              # CONSOLE_URL, SESSION 확인
```

### Windows PowerShell 에서

- Node.js LTS 가 필요하다. `winget install OpenJS.NodeJS.LTS` 후 PowerShell 을 새로 연다 (`node -v` 확인). 없으면 https://nodejs.org 설치 파일.
- PowerShell 5 는 `&&` 를 지원하지 않는다. 명령을 한 줄씩 실행하거나 `;` 로 잇는다. `cp` 대신 `copy .env.example .env`.
- 사내 프록시가 TLS 를 가로채면 `npm install` 이 `CA certificate key too weak` 또는 `self signed certificate in chain` 을 낸다.
  프록시 CA 의 키가 약해 Node 의 OpenSSL 기본 보안 수준(2)에 걸리는 것이므로, Node 전용 OpenSSL 설정으로 수준을 낮추고
  Windows 인증서 저장소를 쓰게 한다 (`docs/windows-node-proxy.md` 에 그대로 붙여 넣을 수 있는 명령이 있다).
  이 설정은 `npm install` 과 `npx playwright install` 같은 Node 쪽 다운로드에만 필요하고, 테스트·로그인은 브라우저가 TLS 를 처리하므로 영향이 없다.
  `npm config set strict-ssl false` 는 검증 자체를 끄므로 마지막 수단으로만.
- 브라우저 다운로드(`npx playwright install`)가 막히면 `.env` 에 `PW_CHANNEL=msedge` (또는 `chrome`) 를 넣어 설치된 브라우저를 그대로 쓴다.
  이 경우 `npx playwright install` 은 건너뛴다.

### 1. 로그인 세션 저장 (사람이 직접 로그인)

```bash
npm run auth:login -- --session root     # 창이 열리면 비밀번호·MFA·캡차를 직접 입력
```

대시보드가 뜨면 `recordings/session-root.json` 이 저장된다. 이 파일은 로그인 세션 자체이므로 커밋·공유하지 않는다.
만료되면 같은 명령으로 다시 저장한다. 유효성 확인은 `npm run auth:check`.

클라우드 세션(Claude Code on the web)에서는 브라우저 창을 띄울 수 없으므로 이 단계는 반드시 로컬에서 한다.

### 2. 메뉴 스냅샷과 변경 감지

```bash
npm run menu:snapshot        # 로그인 세션으로 메뉴 API 를 받아 service-map/ 갱신 + 직전 스냅샷과 diff 출력
npm run menu:diff            # 최근 두 스냅샷 비교 (--fail-on-change 로 CI 게이트)
```

첫 실행 후 `service-map/raw/<date>.json`(gitignore) 의 실제 키 이름을 보고 `src/service-map/screens.ts` 의 `KEYS` 를 좁힌다.
정규화하지 못한 항목이 있으면 스크립트가 경고한다.

### 3. 화면 진입 스모크

```bash
npm run gen:smoke-scenarios  # screens.txt → scenarios/smoke/*.yaml (bash 필요, Windows 는 Git Bash)
npm run gen:smoke-specs      # scenarios/smoke → tests/smoke/*.spec.ts
npm run test:smoke           # 세션 확인 → 89 서비스 282 화면 직접 진입 + title/text 단언
npm run titles:merge         # 관측한 제목을 service-map/titles.json 에 반영 (이후 정확 일치로 판정)
npm run report               # HTML 리포트
```

### 세션 없이 되는 것 (클라우드/CI)

```bash
npm run check                # typecheck + prettier + unit
npm run test:auth-public     # 공개 로그인 페이지 스모크 (자격 증명 없음)
```

## 판정 규칙

- `expect.url` 부분 일치, `expect.title` 정확 일치, `expect.text` 는 모두 보여야, `expect.not_text` 는 화면 텍스트에 없어야, `expect.count` 는 role 개수.
- 콘솔 화면은 `document.title` 이 `"<화면명> | <서비스명> | <리전> | Console"` 형식이어야 하고, `service-map/titles.json` 에 등록된 라우트는 정확히 같아야 한다.
- SSO 로그인 페이지로 튕기면 세션 만료로 보고 즉시 실패시킨다(테스트 실패가 아니라 환경 문제).
- `destructive` 태그(과금 리소스 생성/삭제)는 `RUN_DESTRUCTIVE=1` 일 때만 실행된다. 이름은 `{{run_id}}` 로 짓고 teardown 을 반드시 둔다.

## 환경 변수

`.env.example` 참조. 회귀 실행에는 `CONSOLE_URL`, `SESSION` 만 필요하다. OpenRouter 키는 Jev 기록/치유 단계에서만 쓴다.
