# 인수인계: SCP 콘솔 회귀 테스트 자동화 (2026-09-21 기준)

새 세션(클라우드)에서 이어받을 때 이 문서와 `docs/DESIGN.md`, `scenarios/_FORMAT.md` 를 먼저 읽는다.

## 1. 목표와 합의된 구조

- 목표: Samsung Cloud Platform v2 Enterprise 콘솔(https://console.e.samsungsdscloud.com) 전체 기능 UI 테스트 자동화 + 회귀 스위트.
- 역할 분담
  - **Jev**(TypeSafe 결정 모델, OpenRouter 경유): 화면에서 "어느 요소를 어떤 동작으로" 고르는 것만. 최초 경로 기록과, 회귀 중 로케이터가 깨진 step 의 fallback 복구에 사용.
  - **Claude**: 시나리오 작성, Jev 트레이스 → Playwright spec 변환, 실패 분류(drift vs regression), TYPE_TEXT 값 생성.
  - **Playwright(코드, LLM 없음)**: 회귀 판정. url / text / document.title 단언.
- 변경 감지는 Jev 가 아니라 결정적 스크립트의 실패 + 메뉴 API diff 로 한다.
- 원칙: 자격 증명·OTP 는 LLM 이나 코드에 절대 전달하지 않는다. 테스트 언어는 한국어 고정(로케이터가 텍스트 기반). CRUD 시나리오는 실제 과금 리소스를 만들므로 `destructive` 태그, CI 기본 제외, `{{run_id}}` 로 이름 붙이고 teardown 필수.

## 2. Jev / OpenRouter 사실 (검증됨)

- OpenRouter 모델 ID `typesafe/jev-1.13`. `chat/completions` 로는 호출 불가, **`POST https://openrouter.ai/api/alpha/decisions`** 만 됨. 헤더 `Authorization: Bearer <OPENROUTER_API_KEY>`.
- 요청: `{model, state:{page:{url,title,text}, elements:[{index,label,role,value,operations}], recent_actions:[]}, questions:{<name>:{type:"choice", criteria:{<id>:"<문자열>"}, instructions:"<문자열>"}}}`.
  criteria 값과 instructions 는 **문자열이어야** 함(구조체는 JSON.stringify).
- 응답: `{model, answers:{<name>:{choice, probabilities:{id:p}, confidence}}, usage:{cost}}`. 실측 0.6초, 요청당 약 $0.00003.
- 참조 구현: https://github.com/browser-use/jev-ultrafast (Python, uv). 원본은 TypeSafe 직접 API 만 지원.
  포크 https://github.com/zhanxin-xu/jev-ultrafast 브랜치 `openrouter-decisions-endpoint` 가 `TYPESAFE_API_URL` 오버라이드와 문자열 인코딩을 추가함(머지 안 됨, 이 브랜치를 쓴다).
  env: `TYPESAFE_API_KEY`(=OpenRouter 키), `TYPESAFE_MODEL=typesafe/jev-1.13`, `TYPESAFE_API_URL=https://openrouter.ai/api/alpha/decisions`,
  `TEXT_MODEL_API_KEY`(=OpenRouter 키), `TEXT_MODEL_BASE_URL=https://openrouter.ai/api/v1`, `TEXT_MODEL=inception/mercury-2.5`, `TEXT_MODEL_REASONING=none`.
- jev-ultrafast 의 `snapshot.js` 는 `a, button, input, select, [role=...]` 만 수집한다. 콘솔 SSO 로그인 화면의 버튼은 div 라 놓치지만, 서비스 내부 좌측 메뉴는 실제 `button` 이라 보인다. 폼/테이블 액션은 기록 단계에서 확인 필요.
- 재사용할 코드: `jev_ultrafast/model.py` 의 `action_space()`, `choose()`, `validate_choice()`; `browser.py` 의 신선도·가림 가드; `questions.py` 의 프롬프트.
- OpenRouter 무료 모델 중 채팅 테스트에 정상 응답한 것: `nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, `nex-agi/nex-n2.5-pro:free`. TYPE_TEXT 용으로 쓰려면 JSON 출력 안정성 별도 확인.

## 3. 콘솔 사실 (로그인 후 확인)

- 진입 URL → `https://console.kr-west1.e.samsungsdscloud.com/console/#/home/dashboard` 로 리다이렉트. 라우팅은 hash. 환경 5종(dev2/e/g/k/s) 번들에 하드코딩.
- 프론트: Vue 3 + vue-router + pinia, 셸이 23개 서비스를 micro-app 으로 로드. **data-testid 류 속성 전무** → role/label/text 로케이터만 사용, CSS 클래스 금지.
- 인증: Keycloak(realm `scp`) SSO, Root/IAM 사용자, 비밀번호 + MFA(이메일/SMS 인증번호), 최초 로그인 시 캡차·약관. 계정에 "접근 IP 제어" 옵션 있음.
- **메뉴 API**: `GET /console/api/product/v1/menus?page=N&size=100` (5페이지, 89개). 각 항목의 `service_menu_ko` 가 좌측 메뉴 JSON 문자열. 결과 평탄화본이 `service-map/screens.txt`, 카테고리/라우트가 `service-map/catalog.yaml`. 13 카테고리, 89 서비스, 193 화면.
  이 API 를 매일 저장해 diff 하면 브라우저 없이 메뉴 변경을 감지할 수 있다.
- `document.title` 형식이 안정적: `"<화면명> | <서비스명> | <리전> | Console"` (예: `사용자 목록 | Identity and Access Management(IAM) | Global | Console`). 가장 싼 단언.
- 화면 직접 진입(hash URL) 정상 동작 확인: `#/virtualserver/virtualserver/list`, `#/iam/user/list`. 목록 화면은 공통 레이아웃(총 N, 페이지 크기, 삭제, 검색, `<리소스> 생성` 버튼, 테이블).
- 서비스별로 리전형(kr-west1)과 Global 형이 섞여 있다(IAM 은 Global).
- 확인에 쓴 계정: `API_RegressionTest`(리소스 0, 비용 0). 사용자는 **별도 전용 테스트 계정을 새로 준비**하기로 함. 요청 시 MFA 예외 + 클라우드/러너 IP 허용 가능 여부를 함께 문의할 것.

## 4. 클라우드 환경에서의 제약 (문서 확인 결과)

- 클라우드 세션은 브라우저 대화형 SSO/MFA 로그인을 지원하지 않는다. 계정 IP 제어까지 있으면 로그인 페이지부터 막힌다.
  → 코드 작성·시나리오 설계·Jev 호출·트레이스 분석은 클라우드, **콘솔을 실제로 여는 기록/회귀 실행은 로컬 PC 또는 회사망 러너**.
  사람이 로그인해 만든 Playwright `storageState` 파일을 러너가 재사용하고, 만료 시 사람이 갱신.
- 클라우드 환경 설정: env 에 `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, `TEXT_MODEL_API_KEY`(모두 같은 OpenRouter 키). Network access Custom 에 `openrouter.ai`, `github.com`, (시도용) `*.samsungsdscloud.com`. Setup script 에 `uv sync`, `npx playwright install`.
- 실행 결과(트레이스, 스크린샷, 실패 로그)를 git 에 올려 클라우드 세션이 분석·수정하는 식으로 두 쪽을 잇는다.

## 5. 저장소 상태

- 이 저장소: 로컬 `C:\jev\scp-console-tests`, 브랜치 `main`, 초기 커밋 1개. 원격 `https://github.com/kyle-agent/ui-test-automation.git` (푸시는 사용자가 수동으로).
  공개 저장소라면 사내 콘솔 구조가 노출되므로 **비공개 확인** 필요.
- 내용: `docs/DESIGN.md`(설계·분석), `scenarios/_FORMAT.md`(시나리오 형식), `scenarios/auth/login-page-smoke.yaml`, `scenarios/smoke/*.yaml`(89개 자동 생성, `runner/gen_smoke.sh` 로 재생성), `service-map/`.
- 로컬 PC 전용 지식(클라우드에선 불필요): 회사 프록시 TLS 가로채기 때문에 uv 는 `UV_SYSTEM_CERTS=1`, Python httpx 는 `truststore` 주입, Windows 는 `PYTHONUTF8=1` 필요. jev-ultrafast 클론에 `run_openrouter.ps1` 래퍼가 있음(로컬 커밋만).

## 6. 다음 단계 (합의됨, 순서대로)

1. 메뉴 API 스냅샷 + diff 스크립트 (변경 감지, 브라우저 불필요).
2. Playwright 프로젝트 초기화. `storageState` 재사용 절차. 스모크 89개를 URL 직접 진입 + title/text 단언으로 spec 변환(Jev 기록 불필요).
3. 전용 테스트 계정 준비 후 서비스 하나(예: Virtual Server 또는 IAM)부터: Jev 기록 파이프라인을 생성 폼 같은 CRUD 흐름에 적용. 그 전에 snapshot.js 가 콘솔 폼 요소를 잡는지 확인, 필요하면 `cursor:pointer`/클릭 핸들러 div 수집 확장.
4. 치유·분류 루프: 로케이터 실패 → Jev fallback → drift/regression 분류 → spec 갱신.

## 7. 클라우드 세션 진행 기록 (2026-09-21, 브랜치 `claude/laughing-gauss-6nuvax`)

이 저장소(로컬 `C:\jev\scp-console-tests` 의 두 커밋)를 그대로 이어받아 아래를 추가했다. 자세한 사용법은 `README.md`.

- **Playwright 프로젝트 초기화**: `@playwright/test@1.56.1`(파이썬 playwright 1.56 과 같은 Chromium 1194 를 쓴다), `playwright.config.ts`
  (프로젝트 `unit` / `auth-public` / `session` / `smoke` / `regression`, `RUN_DESTRUCTIVE=1` 이 아니면 `@destructive` 제외).
- **storageState 절차**: `npm run auth:login -- --session root|iam` 이 headed 브라우저를 열고 사람이 SSO/MFA 로그인을 마치면
  `recordings/session-<type>.json` 을 저장한다(자격 증명을 읽지 않는다). `session` 프로젝트(`tests/setup/session.setup.ts`)가
  파일 존재·만료를 먼저 확인하고, 실패하면 smoke/regression 전체를 건너뛴다. **클라우드 세션에서는 창을 못 띄우므로 로컬에서만.**
- **메뉴 API 스냅샷 + diff**: `npm run menu:snapshot`(로그인 세션으로 `/console/api/product/v1/menus` 전 페이지 수집 →
  `service-map/raw/<date>.json`(gitignore), `service-map/snapshots/<date>.json`, `screens.json`, `screens.txt` 갱신 → 직전 스냅샷과 diff),
  `npm run menu:diff [-- --fail-on-change]`. API 항목의 실제 키 이름은 아직 모르므로 `src/service-map/screens.ts` 의 `KEYS`
  후보 목록으로 관대하게 읽고, 못 읽은 항목은 경고한다. 첫 실제 응답을 받으면 KEYS 를 좁힐 것.
  첫 스냅샷 `snapshots/2026-09-21.json` 은 기존 `screens.txt` 를 `npm run menu:import-txt` 로 변환한 것(89 서비스, 276 화면, Service Home 포함).
- **스모크 spec**: `scenarios/smoke/*.yaml`(89) → `npm run gen:smoke-specs` → `tests/smoke/*.spec.ts`(282 테스트).
  각 테스트는 `expect.url` 로 직접 진입 → SSO 튕김 감지 → `document.title` 형식 단언 → `service-map/titles.json` 에 등록된 라우트면 정확 일치
  → `text`/`not_text`. 관측한 제목은 `test-results/observed-titles.jsonl` 에 쌓이고 `npm run titles:merge` 로 레지스트리에 반영한다.
  `titles.json` 은 `/iam/user/list` 하나로 시작한다.
- **공개 로그인 페이지 스모크** (`tests/auth/login-page.spec.ts`, 세션 불필요): 클라우드 세션에서 실제 SSO 페이지에 대해 5/5 통과.
  확인된 사실: 제목 `로그인 | Samsung Cloud Platform Console`(영문 `Sign-In | …`), 버튼은 전부 div, IAM 선택 시 "Account 정보" 와
  placeholder "Account Id 또는 별칭을 입력하세요.", 같은 placeholder 입력란이 숨겨진 다음 단계 폼에도 있어 `filter({ visible: true })` 필요,
  빈 이메일로 "다음" 을 눌러도 검증 문구가 뜨지 않음(이동 없음만 판정), 언어 메뉴는 `#dropdownMenuButton`(English/한국어),
  하단 링크 href 는 테마 JS 가 로드 후 `signup.e.samsungsdscloud.com/accounts-management/#/…` 로 바꿔 쓴다.
- **클라우드 환경 확인**: `OPENROUTER_API_KEY` 만 설정돼 있고 `TYPESAFE_API_KEY`/`TEXT_MODEL_API_KEY` 는 비어 있다(러너는 OpenRouter 키로
  fallback 하게 만들 것). `openrouter.ai` decisions 엔드포인트 실호출 확인(0.46 초, $0.000025, 응답에 `usage.input_tokens/output_tokens/cost`,
  `id`, `provider: "TypeSafe"` 포함). `*.samsungsdscloud.com` 은 클라우드에서 열린다(로그인 페이지까지). 헤드리스 Chromium 이 세션 프록시 CA 를
  신뢰하려면 `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n ccr-agent-proxy -i /root/.ccr/agent-proxy-ca.crt` 가 필요했다(세션마다 다시).
- **세션 재사용 방식 변경(중요)**: 콘솔은 브라우저를 닫거나 시간이 지나면 서버 세션을 무효화하고("권한 없음 / Session Invalid" 모달, `#/login`),
  "확인" 을 누르면 SSO 까지 로그아웃시킨다(KEYCLOAK_IDENTITY/SESSION 쿠키 소멸). 그래서 storageState 파일 재생은 로그인 직후만 동작한다.
  지금은 `npm run auth:login -- --keep-open` 이 **영구 프로필(recordings/profile-<type>/) + --remote-debugging-port 9222** 로 브라우저를 띄우고,
  테스트·스크립트는 `.env` 의 `PW_CDP_URL` 로 그 브라우저에 붙어 기본 컨텍스트에 새 탭을 연다(`src/fixtures/test.ts`, `src/console/browser.ts`).
  `browser.newContext()` 로 만든 컨텍스트는 시크릿 창처럼 분리돼 CDP 클라이언트의 새 탭에 쿠키가 없으므로 반드시 `launchPersistentContext` 여야 한다.
  로컬 PC 의 Node 24 는 사내 프록시 CA 가 약해 `docs/windows-node-proxy.md` 의 OpenSSL 설정이 필요했고, 브라우저는 `PW_CHANNEL=msedge` 로 설치된 Edge 를 쓴다.
- **Jev 기록 파이프라인(3단계) 구현, TypeScript**: 인수인계의 Python/uv 대신 TS 로 옮겼다(로그인 브라우저 연결·판정·시나리오 로더가 전부 TS 이고
  로컬 PC 에 런타임을 하나 더 얹지 않기 위해). jev-ultrafast 의 `model.py` → `src/jev/decide.ts`, `snapshot.js` → `src/jev/snapshot.js`(cursor:pointer div 확장),
  `browser.py` 의 신선도·가림 가드 → `src/jev/browser.ts`, `questions.py` → `src/jev/questions.ts`. 루프는 `src/jev/recorder.ts`, CLI 는 `npm run record`,
  트레이스 → spec 초안은 `npm run gen:spec`. 가짜 VPC 콘솔 픽스처(`tests/fixtures/fake-vpc.html`)에 대해 실제 Jev 로 기록(결정 7회, $0.00077)하고
  생성된 spec 을 재생해 통과시켰다. 첫 실제 시나리오는 `scenarios/networking/vpc-create-delete.yaml` (VPC 생성 → 목록 확인 → 삭제, destructive).
- **실제 콘솔 첫 기록 결과와 대응**: `npm run record -- scenarios/networking/vpc-create-delete.yaml --confirm` 에서 step 0(목록 직접 진입)은
  통과, step 1 에서 Jev 가 BLOCKED(p=0.74, 입력 토큰 600 수준 = 요소 표가 거의 비어 있음). 콘솔 셸이 서비스를 micro-app 으로 띄우므로
  "VPC 생성" 버튼이 iframe 또는 shadow DOM 안에 있어 최상위 문서만 훑는 snapshot 이 못 본 것으로 판단했다. 대응:
  `snapshot.js` 가 shadow root 를 뚫고 수집하고(hit-test 도 shadow 호환), `src/jev/browser.ts` 가 같은 출처의 자식 iframe 마다 snapshot 을 돌려
  하나의 요소 표로 합친다(동작에 `frame` 인덱스, 클릭 좌표는 iframe 위치 보정). 판정(`text`/`not_text`/`count`)도 모든 프레임과 shadow DOM 을
  본다(`src/console/frames.ts`). 트레이스의 각 결정에 `observed`(요소 표 요약, 프레임, shadow host 수)를 남기고, BLOCKED 면 터미널에도 찍는다.
  spec 생성기는 iframe 요소를 `page.frameLocator(<iframe 셀렉터>)` 로 감싼다. 픽스처 `tests/fixtures/fake-vpc.html?mode=plain|shadow|iframe`
  세 구조 모두 실제 Jev 로 기록·재생을 통과시켰다. **실제 콘솔에서는 아직 재확인 전**: 다음 기록 실행에서 BLOCKED 가 또 나오면 트레이스의
  `observed.sample` 과 `observed.frames` 로 버튼이 어디 있는지(다른 출처 iframe? 캔버스? 지연 렌더?) 바로 볼 수 있다.
- **tsx 주의**: `page.evaluate(() => …)` 안에 이름 있는 함수(`const f = () => {}`)를 두면 esbuild 의 `__name` helper 때문에 브라우저에서
  `__name is not defined` 로 깨진다. 브라우저에서 돌 코드는 문자열 표현식으로 넘긴다(`snapshot.js`, `frames.ts` 의 `ALL_TEXT`).
- **Jev 호출 경로**: 사내망은 명시 프록시(70.10.15.10:8080)로만 나간다. Node 내장 fetch 는 HTTPS_PROXY 를 무시하므로 `src/jev/decide.ts` 는
  undici 로 환경 변수 프록시 → npm proxy 설정 → 직접 연결 순으로 시도한다. `npm run jev:ping [-- --no-proxy]` 로 1초 만에 진단한다.

## 8. 로컬 Claude Code CLI 로 이어받기 (2026-09-21 결정)

클라우드 ↔ 로컬 붙여넣기 왕복이 느려서, 기록·회귀 실행이 필요한 작업은 로컬 PC 의 Claude Code CLI 에서 진행한다. 로컬 세션이 시작할 때 알아야 할 것:

1. 저장소: `C:\jev\scp-console-tests`, 브랜치 `claude/laughing-gauss-6nuvax` (원격에 `main` 은 없음). `git pull` 후 `npm install`.
2. 터미널 환경(사내 프록시): `set NODE_OPTIONS=--openssl-config=C:\jev\node-openssl.cnf`, `set NODE_USE_SYSTEM_CA=1`, `set NODE_EXTRA_CA_CERTS=C:\SDS.crt`,
   `HTTPS_PROXY` 는 환경에 이미 있음. `.env` 에 `PW_CHANNEL=msedge`, `PW_CDP_URL=http://127.0.0.1:9222`, `OPENROUTER_API_KEY` 가 있다(커밋 금지).
3. 로그인 브라우저: 별도 터미널에서 `npm run auth:login -- --session root --channel msedge --keep-open` 을 띄워 두고 사람이 로그인한다.
   창을 닫으면 콘솔 세션이 무효화되고 SSO 도 끊긴다. 확인은 `npm run auth:check`.
4. 지금 할 일: `npm run record -- scenarios/networking/vpc-create-delete.yaml --confirm` 을 돌려 step 1 이 통과하는지 본다.
   BLOCKED 면 `recordings/networking.vpc.create-delete/trace.json` 의 `steps[1].actions[0].observed` 를 읽고 원인을 고친다
   (다른 출처 iframe 이면 `src/console/frames.ts` 의 `contentFrames` 필터를 넓힌다). 통과하면 `npm run gen:spec -- recordings/networking.vpc.create-delete/trace.json`
   → `tests/regression/networking.vpc.create-delete.spec.ts` 를 다듬고 `RUN_DESTRUCTIVE=1 npx playwright test --project=regression` 으로 재생한다.
5. 원칙은 그대로: 자격 증명·OTP 는 코드/LLM 에 넣지 않는다. Jev 는 고르기만, 판정은 코드. destructive 는 `{{run_id}}` 이름 + teardown.
6. 클라우드 세션에서 검증 가능한 것: `npm run check`(typecheck·prettier·unit 18개), `npm run test:auth-public`(실제 SSO 페이지),
   픽스처 기록·재생(`--base-url file://…/fake-vpc.html?mode=iframe`). 실제 콘솔이 필요한 것은 전부 로컬.

## 9. 로컬 세션 진행 기록 (2026-09-21 저녁, 실제 콘솔 기록)

8절 4번을 실행한 결과와 대응. 모두 `claude/laughing-gauss-6nuvax` 작업 트리에 있다(커밋 전).

- **step 1 BLOCKED 의 원인은 iframe/shadow DOM 이 아니라 로딩 오버레이였다.** 라우트 진입·화면 전환 직후 2~3초 동안 전체 화면
  `.loader-overlay`(z-index 9999) 가 뜨고 앱 루트가 `[inert]` 가 되어 snapshot 이 요소 0개를 본다. 생성 화면에서는 같은 클래스의
  섹션 단위 오버레이(absolute, z 1001)가 클릭 후 약 0.4초 뒤에 붙고 `.tem-container-contents[inert]` 가 된다.
  → `src/console/overlays.ts`: `waitForIdle`(오버레이 사라질 때까지, 동작 직후에는 0.5초 등장 유예), `dismissNotices`(공지 모달
  `.scp-modal.notice-info-container` 를 닫기 아이콘 `.modal-header-icon` 또는 "확인" 으로 닫음; "오늘 하루 보지 않기" 는 건드리지 않음),
  `settleConsole`. `gotoRoute` 와 기록 루프의 매 관측 앞에서 호출한다. 공지 모달은 새 탭(sessionStorage `isFirstView`)으로 홈에 들어갈 때 뜬다.
- **레코더 보강** (`src/jev/recorder.ts`): 요소 0개 관측이면 최대 10초 재관측(Jev 호출 없음), BLOCKED 는 1.5초 간격으로 3회 연속일 때만 포기,
  BLOCKED 시 스크린샷 `screenshots/<phase>-<n>-<k>-blocked.jpg` 저장, step 에 `notices_closed` 기록.
- **폼 라벨**: 콘솔 폼은 label/aria 연결이 없다(`.scp-form-group-label` "VPC명" 뒤에 `.field-wrap > .scp-textfield > input`). snapshot.js 가
  조상들의 앞 형제에서 짧은 라벨을 찾아 "VPC명"/"IP 대역"/"설명" 으로 이름 붙인다(`nearbyLabel`). spec 생성기는 `input:below(:text-is("VPC명"))` 로케이터를 낸다.
  `pickVarForField` 의 name 힌트가 "…명" 도 받는다("설명" 제외).
- **가려진 요소 제외**: 생성 확인 모달("VPC를 생성하시겠습니까?")은 뒤 화면을 inert 로 만들지 않아 뒤의 "생성" 과 모달의 "확인" 이 같이 관측됐고
  Jev 가 가려진 "생성" 을 골라 hit-test 에서 계속 실패했다. snapshot.js 가 중심점 hit-test 로 가려진 요소를 후보에서 뺀다(`occluded` 수 반환).
  이후 기록에서 Jev 가 "확인" 을 p=0.99 로 골랐다.
- **VPC명 20자 제한**: `qa-vpc-<run_id>`(21자)가 잘려 판정이 어긋났다. 시나리오 이름을 `vpc-{{run_id}}`(18자)로 바꿨다.
- **세 번째 전체 기록 결과**: steps 0~2 통과(VPC 생성 성공), teardown 1 막힘. 삭제 버튼 라벨이 **"서비스 해지"** 인데 goal 에 "삭제" 만 있어
  안전장치(`DANGER_GROUPS` 의 해지)가 후보에서 뺐고, Jev 는 이름 링크(상세 화면 이동)만 반복했다. 남은 VPC 는 행의 "서비스 해지" → 모달 "확인" 으로
  직접 지웠다(해지 후 수 초 안에 목록에서 사라짐). teardown goal 을 "…행의 서비스 해지 버튼을 누르고 … 확인을 눌러 해지를 확정한다 (이름 링크는 누르지 않는다)" 로 바꿨다.
  **아직 이 goal 로 재기록하지 않았다.** 다음 실행: `npm run record -- scenarios/networking/vpc-create-delete.yaml` → 통과하면 `npm run gen:spec` → 재생.
- **목록 화면 구조**: 행 `tr.scp-body-row`, 행 앞 선택 아이콘 `i.table-select`(텍스트 없음, cursor:pointer), 행 끝 "서비스 해지" 버튼(항상 활성),
  상단 "서비스 해지" 는 행 선택 전까지 비활성. 이름은 `span.scp-hypertext[role=button]` 링크(상세로 이동).
- **주의**: 프로브 스크립트에서 `replace(/\s+/g)` 를 문자열 evaluate 에 넣을 때 백슬래시가 빠져 출력의 's' 가 지워진 적이 있다("kr-we t1", "cp-body-row").
  콘솔 클래스는 전부 `scp-` 접두어다.
- **작업 트리의 기존 변경**: `service-map/screens.json`/`screens.txt` 가 이전 `menu:snapshot` 실행으로 서비스 0개로 덮여 있어 `tests/unit/screens.spec.ts` 가 실패한다
  (이번 작업과 무관, 되돌리지 않음). `prettier --check .` 도 기존 36개 파일(CRLF)에 경고를 낸다.

### 9.1 Jev 활용 판단과 직접 작성 결과 (2026-09-21 저녁)

- **판단**: 오늘 막힌 문제는 모두 관측 계층(오버레이, 라벨, 가림)과 goal 문구였고 Jev 의 판단 자체가 병목은 아니었다. 그러나 같은 디자인 시스템에서는
  DOM 프로브 → spec 직접 작성이 더 빠르고 결정적이다. 합의: **spec 은 직접 쓴다. 레코더는 낯선 화면의 초안과 치유 용도로 한정**하고,
  다음 3~5개 시나리오에서 "통과까지 기록 1회, 생성 spec 손질 5줄 이하" 가 아니면 Jev 경로는 접는다.
- **`tests/regression/networking.vpc.create-delete.spec.ts` 를 직접 작성해 실제 콘솔에서 통과** (`RUN_DESTRUCTIVE=1 npx playwright test --project=regression`, 18.6초).
  재생하며 알게 된 콘솔 사실 두 가지:
  1. 생성 화면 진입 직후 섹션 로더가 걷히기 전에 `fill()` 하면 로딩이 끝나며 폼이 초기화되어 값이 사라진다 → 입력 전에 `settleConsole(page, { appearGraceMs: 800 })`.
  2. `fill()` 만으로는 "생성" 버튼(aria-disabled)이 살아나지 않는다. 검증이 change/blur 에서 돌기 때문 → 각 입력 뒤 `press('Tab')`. 레코더는 키보드 입력 + 다음 클릭으로 우연히 blur 가 났던 것.
  spec 생성기(`trace-to-spec.ts`)가 내는 `fill()` 초안에는 이 두 가지가 없으므로, 콘솔 폼 spec 은 항상 settle + Tab 을 붙여야 한다(생성기에 반영은 아직).
- 트레이스 `recordings/networking.vpc.create-delete/trace.json` 은 세 번째 기록(steps 통과, teardown 막힘) 상태 그대로 둔다.

### 9.2 VPC → Subnet → Virtual Server 스택 시나리오 (2026-09-21 밤)

- 참조 저장소 `kyle-agent/api-test-automation` 을 분석해 의존관계·필수 항목·검증된 제약을 `docs/service-facts/compute-vm-stack.md` 에 정리했다
  (순서 keypair → vpc(PUBLIC) → subnet(PUBLIC/PRIMARY, 하위 /24, ACTIVE ≈2분) → server(ubuntu, s1v1m2, 볼륨 8의 배수, AZ kr-west1-b); 삭제는 서버 소멸 → 서브넷 소멸 → vpc).
  다른 서비스도 같은 절차로: 그 저장소의 `regression/scenarios/dependencies.json` + lifecycle 의 `_note` → 콘솔 프로브 → spec.
- **공통 UI 헬퍼 `src/console/ui.ts`**: 라벨 아래 컨트롤(`:visible:below(:text-is(...))`, fill + Tab + 값 확인), 커스텀 드롭다운(`.scp-dropdown` → `.scp-menu` → `.scp-menu-item`),
  확인 모달, 행 선택 `i.table-select`·상단 버튼, 목록 새로고침 폴링 `waitForRow`(등장/상태/소멸). `gotoRoute` 는 same-document 해시 이동도 해시 일치 + 로더 종료까지 기다리게 고쳤다.
- **시나리오 `scenarios/compute/vm-stack.yaml` + spec `tests/regression/compute.vm-stack.spec.ts`**: 테스트 타임아웃 60분, afterEach 가 역순 정리를 단계별 try/catch 로 돌고 실패를 모아 보고한다.
- **로그인 브라우저(Edge 153) 크래시**: 콘솔의 Keypair `.pem` 다운로드 순간 CDP 로 붙은 Edge 가 프로세스째 죽는 일이 4회 중 3회(다운로드 이벤트를 구독한 경우). 새 프로필의 data: 다운로드는 안 죽는다.
  **크래시는 로그아웃이 아니라서 브라우저만 다시 띄우면 세션이 돌아온다**(사용자 확인 + 실측). `src/console/browser.ts` 의 `connectLiveBrowser` 가 연결 실패 시
  `scripts/auth-login.ts --keep-open` 을 분리 프로세스로 띄워 자동 복구한다(`PW_AUTO_RELAUNCH=0` 으로 끔, 로그는 `test-results/auth-login.relaunch.log`).
  스택 시나리오는 공유 Keypair `qa-shared-keypair`(생성해 둠, 무과금)를 재사용해 다운로드 자체를 피한다.
- **실행 시 주의**: 20분 넘게 걸리는 실행은 Claude Code 의 Bash 백그라운드(최대 10분)가 아니라 PowerShell `Start-Process` 로 분리해 띄우고 로그 파일을 지켜본다.
  Playwright 의 `test.use({ trace })` 는 describe 안에서 못 쓴다(새 워커 강제).
- **결과 (2026-09-21 21:34 실행)**: `RUN_DESTRUCTIVE=1 npx playwright test tests/regression/compute.vm-stack.spec.ts --project=regression` **2/2 통과, 11.7분**
  (Keypair 재사용 → VPC Active → Subnet Active ≈3.5분 → VM Active ≈1분 → 서버 해지 소멸 ≈40초 → Subnet 소멸 ≈6분 → VPC 해지). 목록에 남은 리소스 없음(공유 Keypair 만).
  앞선 실패 원인 두 가지를 고쳤다: Virtual Server 목록은 행 버튼이 없어 행 선택 → 상단 "서비스 해지" 여야 하고, 서버를 담았던 Subnet 의 Deleting 은 5분을 넘긴다(대기 20분).
  콘솔의 서버 완료 상태는 "Active" 다("Running" 아님).

### 9.3 SG · Internet Gateway · Public IP 확장 스택 (2026-09-22~23)

- 참조 저장소 조사 + 콘솔 프로브 결과는 `docs/service-facts/networking-sg-publicip.md`. 시나리오 `scenarios/compute/vm-stack-net.yaml`, spec `tests/regression/compute.vm-stack-net.spec.ts`.
- **결과 (2026-09-23 08:00)**: `RUN_DESTRUCTIVE=1 npx playwright test tests/regression/compute.vm-stack-net.spec.ts --project=regression` **2/2 통과, 14.5분**, 남은 리소스 없음.
  순서: Keypair 확인 → SG(로그 저장 해제, 모달 2개) → VPC → IGW(Firewall·로그 해제, 경고 모달 동의 체크, 생성 확인) → Subnet(Active ≤15분 대기) → Public IP 예약(새 IP 폴링으로 특정)
  → VM(SG 선택 모달) → 서버 상세 "Public NAT IP ✎" → "Public NAT 사용" 체크 → IP 드롭다운 → 확인 → Public IP 목록에 서버명 표시 확인.
  정리: 서버 해지(포트·NAT 함께 소멸) → IP Reserved 확인 후 반납 → IGW 행 "삭제" → Subnet → VPC → SG 상세 "서비스 해지". 정리 판정 전 새로고침(토스트에 이름이 남는 문제).
- **공통 헬퍼 추가** (`src/console/ui.ts`): 커스텀 체크박스 `checkbox/isChecked/setCheckbox`, `confirmModal(..., { agree: true })`(모달 안 동의 체크), `pickOption` 이 항목 0개면 닫았다 다시 열기(앞 필드에 따라 비동기로 채워지는 드롭다운).
- **콘솔 사실 요약**: SG 목록엔 선택·삭제가 없다(상세에서 해지). IGW 는 로그 저장이 켜진 채면 토스트로 실패, 둘 다 끄면 동의 체크 모달. Public IP 상세엔 연결 버튼이 없고 서버 상세에서 NAT 로 연결. VPC CIDR 10.251/10.252 는 콘솔이 막는다(10.250.0.0/20 사용).
- **세션**: 콘솔 세션은 하루가 지나면(또는 몇 시간 유휴) 만료돼 SSO 재로그인이 필요하다. 브라우저 크래시와 달리 이건 사람이 해야 한다. 브라우저를 띄우는 명령은 `npm run auth:login -- --session root --channel msedge --keep-open`.

### 9.4 Block Storage 볼륨 생성·연결·분리·삭제 (2026-09-23)

- 시나리오 `scenarios/compute/vm-volume.yaml`, spec `tests/regression/compute.vm-volume.spec.ts`, 사실 `docs/service-facts/compute-block-storage.md`.
- **결과 (2026-09-23 09:25)**: 2/2 통과, 15.8분, 남은 리소스 없음. VPC → Subnet → 서버 → 볼륨(SSD 1 unit = 8GB) Available → 서버 상세 "추가" 모달에서 이름 검색 후 연결 → 볼륨 목록 "In Use" 확인
  → 정리: 서버 상세 행 ⋮ "연결 해제" → Available → 볼륨 삭제(모달에 "삭제" 입력) → 서버 해지 → Subnet → VPC.
- 새로 확인한 콘솔 사실: 삭제 모달의 **입력 확인**("확인을 위해 삭제를 입력해주세요") — `confirmModal(..., { agree: true })` 가 문구를 읽어 자동 입력한다.
  상태 표기는 "In Use"(띄어쓰기). 서버 상세의 "Block Storage" 텍스트는 숨은 내비게이션에도 있어 `:visible` 필요. 추가 모달은 검색 전엔 빈 표.
- 반복 4회(서버 상세 텍스트 매칭 → 모달 검색 → 상태 표기 → 통과). 각 반복 12~24분. 실패해도 정리는 매번 완료됐다(볼륨 1개 수동 삭제 2회).

### 9.5 스위트 런처와 세션 유지 (2026-09-23)

- `npm run test:stacks`(`scripts/run-stacks.ts`): spec 을 정해진 순서로 하나씩 직렬 실행(vpc → vm-stack → vm-volume → vm-stack-net, 약 45분). 사전 점검으로 VPC 5개 한도·잔여 리소스를 확인.
  `--only a,b` / `--from x` / `--no-preflight`. Windows 에서 spec 경로는 슬래시로 넘겨야 한다(역슬래시는 "No tests found").
- `npm run stacks:check` / `npm run stacks:cleanup`(`src/console/inventory.ts`): 이름 규칙(`<종류>-MMDD-HHMM-xxxx`, `IGW_vpc-…`, Reserved·미연결 Public IP)에 맞는 잔여 리소스를 찾고 의존관계 역순으로 지운다.
- **세션 만료 원인은 약 30분 유휴 타임아웃**(절대 수명 아님): 테스트가 연속으로 도는 동안엔 끊긴 적이 없고 35~60분 비면 SSO 로그인 폼까지 갔다.
  `auth-login --keep-open` 이 로그인 후 5분마다 대시보드 탭을 새로 고친다(`--keepalive <분>`, 0 이면 끔). 자동 재기동이 띄우는 브라우저에도 적용. 로그에 "keep-alive: OK/세션 만료로 보임" 이 찍힌다.
- 커밋: `9d5e8aa`(볼륨), `667efe4`(런처·정리), `23dd27a`(keep-alive), `3bc72f4`(경로 수정).

### 9.6 커버리지 기준과 결과 정리 (2026-09-23)

- **모집단은 커밋된 서비스 맵**(`service-map/screens.txt`, `git show HEAD:` 기준): 서비스 89 · 화면 276(Service Home 83, 그 외 193) · 스모크 진입 282(서비스 진입 89 + 비홈 화면 193) ·
  목록 화면 100, 그중 **리소스 키가 붙은 목록 화면 80개**가 커버리지 단위다. 작업 트리의 `screens.txt` 가 비어 있으면(실패한 `menu:snapshot`) `loadServiceMap` 이 git HEAD 를 대신 읽는다.
- **장부 `service-map/coverage.yaml`**(`src/report/coverage.ts`): 리소스마다 `key`·`service`·`category`·`route`·`level`(0 없음/1 진입/2 CRUD/3 동작/4 통합)·`specs`·`last_pass`·`note`.
  resource_type 이 겹치는 것(volume 6, image·keypair·user·group·bucket 각 2)은 key 가 `keypair@virtual-server` 처럼 서비스 slug 를 단다. `npm run coverage` 가 맵과 대조(빠짐·모르는 route·틀린 key·없는 spec id·level 에 맞지 않는 specs/last_pass)하고 요약한다.
- **오늘 수치**: 80개 중 L4 5(vpc·subnet·virtual-server·security-group·internet-gateway), L3 2(publicip 는 서버 NAT 연결/해제, volume@virtual-server 는 서버 연결/분리), 나머지 73 은 L1(스모크만).
  **L2 이상 7/80 = 9%, L3 이상(L3+L4) 7/80 = 9%, 정확히 L3 은 2개.** keypair@virtual-server 는 공유 `qa-shared-keypair` 재사용만이라 L1 에 두고 note 에 이유를 적었다(.pem 다운로드가 Edge 를 죽임, 9.2 절).
- **갱신 규칙**: spec 이 실제 콘솔에서 통과하면 (1) 그 spec 이 다루는 리소스의 `level` 을 올리고 (2) `specs` 에 spec id 를 더하고 (3) `last_pass` 를 그 날짜로 바꾼 뒤 (4) `npm run coverage` 로 검증, (5) `npm run results` 로 RESULTS.md 갱신.
  level 을 올리는 기준: 2 는 생성·확인·삭제(teardown 포함)가 통과, 3 은 상태를 바꾸는 동작까지, 4 는 다른 리소스와의 의존 체인 안에서 통과. 스모크만 있으면 1.
- **실행 기록**: `npm run test:stacks` 가 spec 마다 `--reporter=line,json`(`PLAYWRIGHT_JSON_OUTPUT_FILE` → `test-results/stacks/`) 으로 돌리고 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 을 쓴다
  (`src/report/run-record.ts`: step 제목·상태·시간, annotation scenario/run_id/phase, 오류 첫 줄, 첨부 경로, `class`). 실패 분류는 `data/known-issues.yaml` 매칭 → 세션·브라우저 문구(`세션이 끝났습니다`, `SSO 로그인 페이지로 이동`, `PW_CDP_URL`, `connectOverCDP`) → `unclassified`.
  아직 기록이 없다(이 구조를 넣은 뒤 스위트를 돌리지 않았다). 다음 `npm run test:stacks` 가 첫 기록을 남긴다.
- **`reports/RESULTS.md`** 는 `npm run results` 의 생성물(`src/report/results.ts`): spec 별 최근 상태(최근 5회 `PPFPP`, 통과 평균), 최근 실패, 적용된 알려진 이슈, 커버리지 요약. 지금은 spec 4개 모두 "기록 없음" + 커버리지 절.
- **알려진 이슈** `data/known-issues.yaml`: 확인된 제품 결함이 없어 비활성 예시 `KI-000` 만 있다. 항목이 매칭돼도 실패는 `FAIL(known: KI-xxx)` 로 남긴다(숨기지 않음).
- 단위 테스트 `tests/unit/coverage.spec.ts`(장부 검증·요약 수치, 알려진 이슈 매칭, JSON 리포트 → 기록, 결과 표).

### 9.7 Jev 탐색 모드 (Level 5) (2026-09-23)

- 합의: 탐색은 모수(80 리소스) 밖. Jev 는 "다음에 뭘 눌러볼지" 만 고르고 판정·안전·예산·보고서는 코드. 발견이 단언으로 승격될 때만 L2/L3 숫자에 반영.
- 구현: `src/jev/explorer.ts`(루프), `src/explore/values.ts`(폼 힌트 기반 입력 변형), `src/explore/oracles.ts`(치명/이상/정보), `scripts/explore.ts`(`npm run explore`).
  Git Bash 는 `MSYS_NO_PATHCONV=1`, Jev 호출은 8절의 프록시 CA 환경 변수가 필요(`npm run jev:ping` 으로 확인).
- 파일럿(VPC 생성 폼): 11회·20회 결정, $0.0014·$0.0025, 이상 0, 검증 문구 2·6건. 모달 안 "취소/확인" 은 폼과 별도 서명으로 취급해야 탐색이 이어진다.
- 다음 개선: 드롭다운은 열기만 하고 항목을 안 고르는 경우가 있음 → 열기+선택을 한 동작으로; 목록 화면(행 링크·정렬·검색) 탐색; Subnet·VM 폼으로 확대; 발견 → 단언 승격 절차.

### 9.8 가벼운 L2 spec 과 탐색 확장 (2026-09-23 저녁)

- `npm run probe -- --route '#/…/list'`(`scripts/probe-form.ts`): 리소스를 만들지 않고 목록 버튼·헤더·생성 폼 라벨·힌트·드롭다운 항목을 찍는다. 결과 `recordings/probe/<slug>.md`.
  새 서비스는 프로브 → `src/console/simple-crud.ts` 팩토리로 spec 작성(선행 리소스가 없으면 10줄) → 실행 → `coverage.yaml` 갱신 순서로 붙인다.
- 새 spec: `compute.server-group`(정책 Anti-Affinity), `security.address-group`(대상 주소 CIDR) 통과(각 ≈1분). `storage.object-storage-bucket` 은 **계정에 Object Storage 인증키가 없어**
  버킷명 조회가 실패("사용할 수 있는 인증키가 없습니다")하고 생성이 비활성 → 인증키는 자격 증명이라 테스트가 만들지 않고 `skipReason` 으로 건너뛴다. 인증키를 만들면 그 줄을 지운다.
  Secret Vault(인증키 필요)·Private DNS(VPC 연결 필요)는 프로브만 해 두었다.
- 탐색기 개선: 드롭다운을 열면 안 고른 항목을 코드가 이어서 고른다(보고서 입력 열 `→ 항목`), `--prereq vpc[,subnet]` 로 선행 리소스를 만들고 끝나면 run_id 이름을 자동 정리.
  발견 → 단언 승격 절차는 README §6.
- 커버리지: L2 이상 9/80(11%). 전체 스위트 실행 기록은 `reports/runs/`, 정리는 `npm run results` → `reports/RESULTS.md`.

### 9.9 자율 진행: 인증키·대시보드·가벼운 spec 3종·탐색 배치 (2026-09-23 저녁~밤)

- **Object Storage 인증키**: 사용자 승인으로 IAM > My Info > 인증키(`#/iam/my-info/detail/auth-key`, Object Storage 생성 폼의 "인증키 관리 바로가기" 링크가 여기로 온다)에서
  **영구** 옵션으로 1개 생성(만료 9999-12-31, 상태 사용). 비밀키는 어디에도 기록하지 않았다. 그 뒤 `storage.object-storage-bucket` 의 `skipReason` 을 지우고 통과 → bucket@object-storage L2.
  버킷 해지 모달은 "확인을 위해 버킷명을 입력" — 단어 '버킷명' 이 아니라 **실제 버킷 이름**을 쳐야 한다(사용자 지적). `confirmModal` 이 "라벨 : 값" 에서 값을 찾거나 `resourceName` 을 쓴다.
- **스위트 run 1**(`npm run test:stacks`, 17:09~17:55): vpc 42초 PASS · vm-stack 13분 PASS · vm-volume 15분 PASS · **vm-stack-net 16분 FAIL** — 본 단계 8개 모두 통과, teardown "Public IP 반납" 에서
  `waitForRow` 가 행 텍스트를 읽는 사이 행이 사라져 `innerText` 15초 타임아웃(리소스는 다 지워짐, 잔여 0). `waitForRow` 가 5초 제한으로 읽고 못 읽으면 다시 세도록 고쳤다. 다음 스위트에서 확인.
- **HTML 대시보드** `reports/dashboard.html`(`src/report/dashboard.ts`, `npm run results` 가 RESULTS.md 와 함께 생성, `npm run dashboard` 로 열기): 요약 카드·날짜별 막대·spec 별 최근 10회·실행 기록(필터)·
  카테고리/리소스별 level·탐색 목록·알려진 이슈. 외부 요청 없는 한 파일이라 그대로 공유 가능. 단위 테스트 `tests/unit/dashboard.spec.ts`.
- **가벼운 L2 spec 3종**(프로브 → `simple-crud` 팩토리): `management.resource-group`(그룹 정의 태그 key/value + "태그 추가" 가 생성 조건 → `beforeSubmit` 훅),
  `iam.user-group`(이름·설명만, Global 화면), `compute.launch-configuration`(Standard-1/s1v1m2, **기본 OS 디스크를 SSD 로** — 기본값 SSD_Provisioned 는 Max IOPS·Throughput 필수라 생성이 비활성, 공유 Keypair).
  셋 다 통과(각 ≈1분). 정리 스크립트 이름 규칙에 `rg-`/`grp-`/`lc-` 추가. 프로브만 한 후보: Secrets Manager·KMS(요금 확인 버튼·삭제 예정일 = 과금/지연 삭제라 보류), IAM 정책(다단계 마법사),
  LB 서버 그룹·LB 헬스 체크·Port·Private DNS(VPC/Subnet 선행 → 네트워크 확장 스택 후보), Backup(서버 필요).
- **런처 없이 직접 돌린 결과**는 `scripts/run-record-import.ts --spec <id> --json <playwright json> --rm` 으로 실행 기록으로 바꾼다(원본 JSON 을 `reports/runs/` 에 두면 `readRunRecords` 가 건너뛴다).
- **탐색 배치** `scripts/explore-batch.ts --plan plans/explore-default.json`(Subnet 폼·VM 폼·VPC 목록·Server Group 폼). 첫 Subnet 폼 탐색은 Jev 가 빵부스러기 "VPC" 를 눌러 폼을 떠난 뒤 BLOCKED 2회로 끝났다(결정 3회) →
  `snapshot.js` 가 header/nav/aside/`.scp-breadcrumb` 안의 컨트롤을 후보에서 빼고, `--open` 폼에서 URL 이 바뀌면 폼으로 되돌아오도록 고쳤다(`plans/explore-followup.json` 으로 재실행).
  주의: `spawnSync(..., {shell:true})` 는 "Subnet 생성" 같은 공백 인자를 쪼갠다 → node 로 tsx 를 직접 부른다. Windows 에서 오래 도는 배치는 PowerShell `Start-Process cmd '/c …'` 로 띄운다(Git Bash `-lc` 로 띄우면 멈춤).

**9.9 (계속) 밤 진행분 — 스택 확장과 탐색 결과**

- 새 spec(모두 실제 콘솔 통과, 실행 기록 `reports/runs/`): `networking.vpc-port`(VPC → Subnet → Port, 9.5분, port L4), `networking.private-dns`(6.5분, Creating 3~5분 → 상세 "서비스 해지"),
  `storage.file-storage`(1.3분, NFS/Single-AZ/HDD, 이름 뒤에 6자리 UUID → `run_id_compact`), `networking.vpc-peering`(11.6분, VPC 2개 → 동일 Account Peering → 상세 "VPC Peering 삭제" → VPC 해지),
  `networking.dns-hosted-zone`(6.9분, Private DNS → Private 용도 .com 존 → 행 삭제 → DNS 해지). **커버리지 L2+ 18/80(23%), L3+ 11/80(14%)**, 스위트 16개 spec(순서 `src/report/suite.ts`).
- 콘솔 사실(새로 확인): Private DNS 는 목록에 삭제가 없고 상세 "서비스 해지" 만 있으며 Creating 동안 비활성. VPC Peering 도 목록 선택·삭제가 없고 상세 버튼만.
  **Peering 을 지운 직후의 VPC 해지는 확인을 눌러도 조용히 무시**된다(행이 Active 로 남고 토스트 없음) → 60초 간격 최대 5회 재시도(`deleteVpc`, inventory vpc). Hosted Zone 은 "사용 가능 여부 조회" 를 눌러야 생성이 활성.
  LB 헬스 체크·LB 서버 그룹은 "Service Subnet"(LB 전용) 이 필요해 일반 Subnet 으로는 못 만든다(보류). Secrets Manager·KMS 는 "요금 확인" 과 삭제 예정일(지연 삭제)이 있어 보류. IAM 정책은 3단계 마법사(기본 정보 → 권한 설정(JSON 모드 있음) → 확인).
- 정리 스크립트 종류 추가: port·pdns·fs·hz·peer(+ vpcb 접두어). 프로브·탐색이 만든 리소스도 같은 규칙이라 `npm run stacks:cleanup` 이 지운다.
  **주의: spec 이 도는 동안 `stacks:cleanup --yes` 를 돌리면 그 spec 의 리소스를 지워 버린다**(오늘 Private DNS 2차 실행이 이렇게 깨져 기록을 지웠다). 정리는 반드시 실행이 끝난 뒤에.
- 탐색 배치 결과(2·3차, 8건: Subnet·VM·SG·Address Group·Resource Group·Server Group 폼, VPC·VM 목록): 결정 15~27회, 건당 $0.0016~0.0035, **이상 0건**, 정보 1~5건. 정보는 대부분 항상 보이는 힌트 문구(3~20자 등)라 노이즈 →
  오라클이 오류 스타일 요소(`.scp-form-group-error` 등)를 `validation-error` 로 따로 올리고, 힌트만 있으면 `validation-text` 로 남기도록 고쳤다(다음 탐색부터 적용). Jev 응답 불량은 3회 재시도로 흡수(2회 발생, 모두 회복).
- 스위트 run 2(16 spec, 약 2시간)를 20:03 에 시작했다 — 끝나면 `npm run results` 로 RESULTS.md·dashboard.html 을 갱신하고 실행 기록을 커밋한다. run 1 의 vm-stack-net 실패(waitForRow) 재현 여부를 여기서 확인.
- 다음 후보: Auto-Scaling Group(LC + VPC/Subnet, 최소 0대로), NAT Gateway(Public IP + Subnet, 과금), IAM 정책(JSON 모드), Public 도메인·인증서(외부 의존), LB(Service Subnet 필요).

**9.9 (계속) 스위트 run 2 결과 (20:03~22:27, 16 spec)**

- PASS 14 / FAIL 2. 실패 둘 다 teardown: `compute.vm-stack` 은 VPC 는 지워졌는데 성공 토스트("VPC명: vpc-…")가 본문에 남아 not_text 검사가 실패(새로 고침 누락),
  `compute.vm-stack-net` 은 서버 "서비스 해지" 확인이 **조용히 무시**되어 서버가 10분간 Active → Subnet(20분)·VPC 까지 연쇄 실패(63분). 리소스는 run_id 로 골라 지웠다(스위트 도중이라 전체 정리는 안 함).
- 대응: `terminateVpc`·`terminateServer`(`src/console/ui.ts`) — 해지 확인 뒤 1~2분 안에 안 사라지면 다시 누르고(각 5회/3회), 사라진 뒤 새로 고쳐 토스트를 지운다. VM 스택 3종·Port·정리 스크립트가 모두 이 둘을 쓴다.
  **콘솔 사실: VPC·서버·(Peering 직후) 해지 요청이 가끔 무시된다. 요청 후 상태 변화를 확인하고 재시도하는 것이 규칙.** 22:29 에 vm-stack·vm-stack-net 만 다시 돌려 확인 중.
- IAM 정책은 보류: 마법사 2단계의 JSON 모드 편집기(ACE)에 값을 넣어도(타이핑·붙여넣기·API) "다음" 이 활성화되지 않고, 기본 모드는 서비스 선택 뒤 액션 그룹(Create/Delete/List…)을 펼쳐 개별 액션을 골라야 한다. spec·기록은 지웠다.
- 탐색 4차(선행 없는 폼 5건)까지 합쳐 오늘 탐색 20회, 이상 0. 대시보드 "탐색" 절에 모두 보인다.

### 9.10 스택 확장 2차 — ASG · NAT · 동작(L3) (2026-09-28 오전)

- 새 spec(모두 통과): `compute.auto-scaling-group`(VPC → Subnet → SG → LC → ASG Min0/Desired0/Max1 "In Service" → 상세 "Auto-Scaling Group 삭제" → 역순, 14.6분, 무과금),
  `networking.nat-gateway`(VPC → **IGW 필수** → Subnet → Public IP **구분 "NAT Gateway"** → NAT(Multi-AZ 끔, 이름 자동 `NAT_GW_<subnet>`) → 삭제 → IGW → IP 반납 → Subnet → VPC, 11.3분, 시간 과금),
  `security.security-group-rule`(SG → 상세 규칙 탭 → "규칙 추가" 화면: 프로토콜 TCP 체크 → 포트 22 → "추가" → Inbound → "완료" → "규칙을 추가하시겠습니까?" → 행 삭제 → SG 해지, 1.7분).
  동작 step 추가: `compute.vm-stack` 상세 "중지"(Powering Off → Stopped) → "시작"(Powering On → Active), `security.address-group` 상세 "대상 주소 (n)" 탭 → "대상 주소 추가" 모달.
- **커버리지 L2+ 20/80(25%), L3+ 15/80(19%)** — auto-scaling-group·launch-configuration·nat-gateway L4, address-group L3, security-group·virtual-server 에 동작 기록.
- 콘솔 사실(새로): NAT 폼은 IGW 없는 VPC 를 고를 수 없고("Internet Gateway가 연결되어 있지 않은 VPC는 선택이 불가합니다"), Internet Gateway 구분으로 예약한 IP 는 NAT 폼 목록에 안 나온다.
  SG 규칙 화면의 포트 입력란은 라벨·placeholder 가 없어(힌트만) 보이는 텍스트 입력란 순서(검색창 → 대상 주소 → 포트)로 잡는다. "ALL" 유형은 경고 모달. ASG 목록엔 삭제가 없고 상세 버튼만.
  Address Group 상세엔 "수정" 이 없고 대상 주소 탭의 "대상 주소 추가" 모달만 있다(행 삭제 없음).
- 도구 교훈: `hasText: /^라벨$/` 로 버튼을 잡으면 안 맞는 경우가 있다(안쪽 공백·아이콘) → `getByRole('button', { name })`. 드롭다운 항목도 `^` 앵커 금지(항목 텍스트 앞뒤 공백).
  하단 고정 버튼("완료"·"다음")과 일부 모달 "확인" 은 활성인데도 Playwright "stable" 판정이 안 나 15초 타임아웃 → `submitForm`/`confirmModal` 이 10초 뒤 강제 클릭으로 넘어간다.
- 탐색: 오라클이 `.scp-error` 래퍼를 잡아 거부값 → 문구를 보고하고(VPC 폼 19건 확인), 거부 기대값을 먼저 내고, 같은 오류는 한 번만 센다. BLOCKED 두 번이면 코드가 다음 후보를 고른다.
- 보류 그대로: IAM 정책(액션 선택 UI), LB(Service Subnet), Secrets Manager·KMS(과금·지연 삭제).

### 9.11 무거운 서비스 — Kubernetes Engine · PostgreSQL(DBaaS) (2026-09-28 오후)

- `container.ske-cluster`(VPC → Subnet → SG → 클러스터, 노드 풀 없음): **PASS 22.6분**. Running 까지 ≈7분, 해지 ≈12분. 목록 "서비스 해지"(행 선택).
  폼 사실: "생성" 은 StorageClass 설정의 **"NFS 볼륨 — 사용" 체크(기본 켜짐, 볼륨 미선택)를 꺼야** 활성. Security Group 은 두 번째 "선택" 모달(검색 → 행 체크 → 확인). 제어 영역만이라 월 ₩62,780 예상(시간 과금).
- `database.postgresql`(VPC → Subnet → 단일 서버 db1v2m4): 1차 실패 → 프로브로 원인 둘 확인 → **2차 PASS 23.8분**. Running ≈8분, 해지는 상세 "서비스 해지"(목록엔 없음).
  폼 사실: **클러스터명은 영문만**(숫자 있으면 문구 없는 `.scp-error`), **Block Storage DATA 용량이 기본 0GB 라 필수**(요약 "추가(DATA) SSD | 0GB"). 폼이 절 단위로 늦게 그려져 "Database 사용자명" 이 보일 때까지(최대 60초) 기다린 뒤 채운다.
  비밀번호는 `Qa!<run_id_compact>x9` 로 실행 중 만들고 기록하지 않는다(`run_id_alpha` = 숫자를 a~j 로 바꾼 run_id 를 `scenarioVars` 에 추가). 월 ₩152,570 예상(시간 과금).
- 커버리지 **L2+ 21/80(26%), L3+ 16/80(20%)** — postgresql L4. **SKE 클러스터는 장부 모집단 밖**: `/ske/cluster` 는 `/list` 로 끝나지 않아 `keyedListScreens` 가 뺀다. 같은 이유로 빠진 키 있는 화면이 32개
  (Container Registry `/scr/registry`, Cloud Functions `/scf/cloudfunctions`, IAM 역할 `/iam/role`, Queue, Cloud WAN/LAN, Oracle Services, Trail …). 모집단을 "키 있는 화면 전부(112)" 로 넓힐지는 사용자 결정 사항 — 넓히면 분모가 80 → 112.
- 정리 스크립트 종류 추가: `ske`(Active 대기 → 목록 해지), `pg`(Active 대기 → 상세 해지). 스위트 21개 spec, 전체 약 3시간 40분 — 무거운 둘은 `@heavy` 태그.
- **동시 실행 확인(15:13~15:40)**: SKE 클러스터와 PostgreSQL 을 같은 로그인 브라우저의 별도 탭(별도 `run-stacks --only` 프로세스)에서 동시에 돌려 둘 다 PASS(17.5분·26.5분). 잔여 0.
  리소스 이름이 run_id 로 분리되고 VPC 한도(5)만 지키면 무거운 스택끼리 병렬이 된다. 단, `stacks:cleanup --yes` 는 실행 중엔 금지(9.9 참고).
- 장부 모집단을 **키 있는 화면 전부(112)** 로 넓혔다(사용자 결정, `keyedListScreens` 에서 `/list` 조건 제거). L2+ 22/112(20%), L3+ 17/112(15%), L4 14. `policy`→`policy@iam`, `port`→`port@vpc`.

### 9.12 공유 VPC 병렬 실행 · DBaaS 5종 · SKE 탐색 (2026-09-28 저녁)

- **`scripts/run-parallel.ts --specs a,b,c --max N`**: api-test-automation 의 shared-infra 방식. 런처가 VPC+Subnet 을 한 번 만들고 `SHARED_VPC`/`SHARED_SUBNET` 으로 넘기면
  spec(`src/console/shared.ts` `ensureNetwork`)은 자기 네트워크를 만들지도 지우지도 않는다. 끝나면 런처가 Subnet → VPC 를 지운다. 한 브라우저의 탭을 나눠 쓴다.
- **DBaaS 팩토리 `src/console/dbaas.ts`** + spec 5종 모두 공유 VPC 위 병렬 PASS: PostgreSQL·MariaDB·EPAS(16:12 배치, 각 ≈16분 동시), MySQL·CacheStore(18:52 배치, 각 ≈16분 동시). 전부 L4.
  폼 사실: 클러스터명 영문만, **DATA 디스크는 8GB 배수(100 거부)·CacheStore 는 64GB 이상** → 128GB 로 통일. EPAS 는 License(BYOL) 확인 체크. 네트워크 절이 비동기로 늦게 채워지며 폼을 다시 그려
  먼저 채운 값이 사라진다 → VPC/Subnet 을 먼저 고르고 가라앉힌 뒤 입력. 보류: Search Engine(Elasticsearch BYOL 키만), SQL Server(BYOL 입력 3개), Vertica(노드 3개 필수).
- **`below()` 버그 수정**: `:below` 는 뷰포트 좌표라 라벨이 스크롤로 사라지면 고정 헤더 검색창을 잡았다(SG 규칙 포트·DBaaS DATA 오류의 진짜 원인). 라벨을 먼저 스크롤하고 헤더 요소를 뺀다.
- **SKE 탐색(별도 에이전트, Jev)**: 9회 83결정 이상 0, $0.011, 실제 클러스터 4회. 사실·후보는 `docs/service-facts/container-ske.md`. **결함 후보**: 워크로드·서비스 및 인그레스·스토리지·구성·권한
  라우트 직접 진입 시 홈으로 리다이렉트(TypeError+404). 에이전트는 사용량 한도로 3번째 사이클 중 멈췄고 남은 클러스터는 없다.
- 커버리지 **L2+ 26/112(23%), L3+ 21/112(19%)**.

### 9.13 Jev 호출을 OpenRouter → TypeSafe 공식 API 로 전환 (2026-09-29)

- 기본 엔드포인트 `POST https://api.typesafe.ai/v1/systemone`, 모델 `jev-1.13.0`(별칭 `jev-latest` 대신 버전 고정 — 재현성), 키 `TYPESAFE_API_KEY`(`src/jev/decide.ts`).
  요청·응답 계약은 docs.typesafe.ai/api 와 같아 질문 형식은 그대로다(choice → `choice`/`probabilities`/`confidence`).
- 키는 엔드포인트에 맞는 것만 보낸다: TypeSafe URL → `TYPESAFE_API_KEY`, OpenRouter URL → `OPENROUTER_API_KEY`. 예전처럼 OpenRouter 키가 TypeSafe 로 새어 가지 않는다.
- 비용: TypeSafe 응답은 `usage: { input_tokens, output_tokens }` 만 준다 → `normalizeUsage` 가 입력 토큰 × $0.042/Mtok 로 `cost` 를 채워 탐색·레코더 비용 예산이 계속 동작한다.
- 사내 프록시(70.10.15.10:8080)는 api.typesafe.ai 를 통과시킨다(키 없이 호출 → TypeSafe 403 "Must supply an API key", 틀린 키 → 401). 키를 넣은 뒤 `npm run jev:ping` 으로 확인.
- 되돌리기: `.env` 에 `TYPESAFE_API_URL=https://openrouter.ai/api/alpha/decisions`, `TYPESAFE_MODEL=typesafe/jev-1.13`, `OPENROUTER_API_KEY`. TYPE_TEXT 소형 텍스트 모델은 여전히 OpenRouter(`TEXT_MODEL_*`).

### 9.14 "유효값인데 오류" 재현 → 제품 결함 아님, 입력 헬퍼 보강 (2026-09-29)

- 탐색에서 두 번 본 현상(잘못된 VPC명 뒤 유효값을 넣어도 "입력 조건에 맞지 않습니다" 가 남음)을 재현했다. 값이 실제로 들어갔는지 확인하며 넣으면
  2자·21자·특수문자·한글·빈 값 → 유효값 5가지 × 3회 = 15/15 모두 오류가 사라지고 "생성" 이 활성화된다. **콘솔 결함 아님.**
- 진짜 원인: 프로그램식 `fill()` 이 scp 입력란에 가끔 반영되지 않는다(이전 값 유지, 다시 fill 해도 그대로). 실제 키보드 타이핑은 매번 반영.
  → `fillField` 가 fill 두 번 뒤에도 값이 다르면 전체 선택 → 지우기 → 키보드 입력으로 넘어간다. 탐색기(`src/jev/browser.ts` act)의 입력은 아직 fill 만 쓴다(같은 보강 후보).
- `below()`: 콘솔 상단 전역 검색창은 `<header>` 태그 밖에 있어 기존 헤더 제외가 효과가 없었다 → placeholder("서비스명, 마켓플레이스…")로도 거른다. 선택자 끝 `:not()` 제거.
- 참고: VPC명 21자는 maxlength 20 으로 잘려 들어가 오류 없이 유효값이 된다(거부가 아니라 절단).
- (추가) 탐색기 입력도 보강(`src/jev/browser.ts` act): insertText 뒤 포커스된 칸의 값을 확인해 다르면 키보드로 다시 치고(maxlength 절단은 정상), **입력 후 Tab 으로 칸을 벗어난다**.
  콘솔은 blur 때 검증하므로, 벗어나지 않으면 직전 값의 오류 표시를 새 값의 판정으로 읽는다 — 이것이 "유효값인데 오류" 경보의 두 번째 원인이었다.
  보강 후 VPC 폼 탐색: 정보 9건 → 3건, 남은 3건("vp", /15, /29)은 모두 실제 거부. 자동완성 콤보박스는 확인·Tab 을 하지 않는다.

### 9.15 병렬 스위트 실행기 `npm run test:suite` (2026-09-29)

- `scripts/run-suite.ts`: SUITE_ORDER 전부를 한 로그인 브라우저의 탭 여러 개로 동시에 돌린다. spec 별 VPC 수·예상 시간은 `src/report/suite-plan.ts`
  (통과 실행 중앙값, 없는 spec 은 VPC 0·3분으로 본다 — 새 spec 이 VPC 를 만들면 여기에 적을 것).
- 규칙: VPC 여유 = 5 − 시작 시점 VPC 수 − (공유 VPC 가 살아 있는 동안 1). 오래 걸리는 spec 부터, 탭 ≤ `--max`(기본 5). 공유 VPC+Subnet 은 시작하자마자
  뒤에서 만들고(DBaaS 5종이 채택), DBaaS 가 다 끝나면 지워 VPC 한 칸을 돌려준다. 각 spec 은 `run-stacks.ts --only <id> --no-preflight` 로 떠서 reports/runs 기록이 같다.
- 로그: `reports/suite/suite-<stamp>.log`(커밋 안 함). 직렬 예상 224분.
- **첫 실측(2026-09-29 오후) — 아직 통과 못 함.** 드러난 문제와 조치:
  1. 부하 중 공유 네트워크 Subnet 폼 5초 대기 초과 → 공유 네트워크를 다른 spec 보다 먼저 만들고, 실패하면 정리 후 1회 재시도.
  2. 실패 뒤 스케줄러가 이미 끝난 promise 로 경쟁해 빈 루프 → 힙 4GB 초과로 런처가 죽고 자식 spec 도 정리 없이 같이 죽음 → 루프 수정.
  3. 9개가 동시에 세션 확인 → 콘솔 첫 로딩이 90초 초과 → session 프로젝트 timeout 180초 + 띄우는 간격 `--stagger`(기본 20초).
  4. 모든 spec 이 `test-results/artifacts` 를 같이 써서 새 spec 이 시작할 때 폴더를 비워 먼저 돌던 spec 의 trace 가 지워짐(ENOENT, 컨텍스트 닫힘)
     → run-stacks 가 `PW_OUTPUT_DIR=test-results/artifacts/<spec>` 로 나눈다.
  5. 탭 9개 + trace 상태에서 13:50 경 CDP 브라우저의 컨텍스트가 통째로 사라짐(Edge 프로세스는 살아 있음) → 진행 중 spec 전부 정리 없이 실패.
     동시 탭은 5~6 이하로 시작해 올려 볼 것. 남은 리소스 13개(PostgreSQL 1 Running, VPC 5/5) 는 `npm run stacks:cleanup` 로 정리 필요.
- 결과 요약(2차): PASS queue · cloud-function · server-group · object-storage-bucket · file-storage · security-group-rule / 나머지는 위 원인으로 실패·중단.
- (사용자 안내 2026-09-29) 목록 대기 중 새로 고침은 페이지 전체를 다시 읽지 않고 목록 제목 오른쪽 위 작은 아이콘(`i.i-refresh`)을 누른다 → `refreshList()` (ui.ts).
  목록 API 만 다시 부르고 페이지 이동이 없다(실측). 아이콘이 없으면 page.reload 로 대신한다. 삭제 뒤 토스트를 지우는 1회 reload 는 그대로 둔다(not_text 검사).
  확인: queue · vpc create-delete PASS. 남은 테스트 리소스 0 (VPC 0/5).
- **3차 실측(2026-09-29 15:57~16:58, 탭 5): 31개 중 28 PASS, 벽시계 60분 (직렬 예상 254분).** 컨텍스트 소실·세션 확인 시간 초과는 없었다.
  실패 3건과 재실행(탭 3, 13분): 3/3 PASS.
  - vm-stack: 서버 해지 뒤 not_text 가 토스트에 걸림 — 목록 아이콘 새로 고침은 토스트를 지우지 않는다(내 변경의 회귀)
    → `waitForRow` 가 소멸 대기 중 목록을 한 번이라도 새로 고쳤으면 끝날 때 page.reload 1회. 재실행 PASS.
  - file-storage: 생성 확인 모달이 10초 안에 안 뜸, container-registry: 생성 후 600초 동안 목록에 행 없음 → 둘 다 단독 재실행 PASS(부하성 간헐 실패로 본다).
- 쓰는 법: `npm run test:suite` (기본 탭 5) → 실패한 것만 `npm run test:suite -- --only a,b --max 3` → `npm run results`.

### 9.16 API 자동화 대비 화면 자동화 확장 (2026-09-29 저녁 ~ 09-30 아침)

- 사용자 결정: API 자동화(kyle-agent/api-test-automation)에서 생성·삭제가 검증된 리소스는 모두 화면 자동화도 한다. 라이선스·자원 부재로 API 도 접근성만 보는 서비스는 제외.
  대응표 `docs/api-ui-parity.md`. 에이전트 3개(관리·보안 / VPC 네트워킹 / 동작·무거운 서비스)로 나눠 진행.
- 새로 통과: KMS · Secrets Manager(해지 7일 예약, 즉시 삭제 불가) · IAM 정책(그룹 연결 L3) · ServiceWatch 대시보드·로그 그룹·이벤트 규칙·알람 · Network Logging · Budget ·
  API Gateway(스테이지 배포 L3) · MessageHub 도메인·이메일 · File Storage/볼륨 스냅샷 · Cloud Functions Cronjob 트리거 · ASG 정책·스케줄 ·
  Load Balancer · Transit Gateway · VPN · VPC Endpoint · Direct Connect · Event Streams(공유 VPC) · Firewall.
- 남은 것: SKE 노드 풀(폼 사실만 확보), Backup(Agent 방식, VM + Agent 체인 필요). 건너뜀: MessageHub Phone(SMS), ASG 알림(실사용자 메일), LB 멤버(실 VM).
- 커버리지: L2+ 26 → 47/112 (42%), L3+ 21 → 30/112 (27%).
- 09-29 20:55 SSO 세션 만료로 에이전트 전원 중단 → 재로그인 후 남은 리소스(SKE 클러스터·노드 풀 포함 8개) 정리.
- 이번에 고친 공통 문제:
  - `row()` 를 `tr.scp-body-row:visible` 로: 콘솔이 앞 화면의 표를 숨긴 채 DOM 에 남겨, 같은 이름(IGW 행의 VPC명 등)이 든 숨은 행이 먼저 잡혀 클릭이 30초 시간 초과.
  - 방화벽 규칙이 남아 있으면 IGW 삭제가 막힌다 → `clearIgwFirewallRules()` (inventory.ts) 를 정리 도구와 `deleteIgw()` 가 먼저 부른다.
  - 규칙 추가 직후 방화벽이 동기화 중이면 "규칙 수정" 이 눌려도 화면이 안 바뀐다 → 넘어갈 때까지 다시 연다.
  - VPC 해지가 딸린 자원 때문에 거절되면 콘솔이 그 자원(IGW 링크 등)을 안내한다(사용자 확인) → `terminateVpc` 가 안내 문구를 오류로 올리고 재시도하지 않는다.
  - 정리 도구 이름 정규식 버그 2개(NAT `\d` 누락, File Storage 접미사 `_`).
- SKE "직접 주소 진입 시 홈으로 튕김" 은 결함 아님(메뉴 그룹 이름일 뿐, 실제 화면 9개 정상) — docs/service-facts/container-ske.md.
- **4차 스위트(09-30 09:44~11:00, 52개, 탭 5): 43 PASS, 벽시계 76분(직렬 예상 370분).** 실패 9개 → 고친 뒤 재실행으로 모두 PASS.
  - 부하 중 늦은 재렌더가 방금 넣은 값을 지움(Subnet IP 대역 ×3, Firewall 목적지 주소) → `fillField`·새 `fillStable` 이 1.5초 뒤 다시 보고 최대 3회 다시 친다.
  - `waitForRow` 가 "주소에 목록 경로 포함"으로 판단해 생성 폼(`#/scr/registry/create`)에 머묾 → 해시 경로 일치로 비교.
  - 아이콘 새로 고침 직후 표가 잠깐 비어 "소멸" 로 오판(VPN 해지) → 소멸 판단 뒤 페이지를 다시 읽고 한 번 더 센다. 소멸이면 항상 1회 reload(토스트 제거).
  - 중간에 죽은 실행이 Network Logging 저장소를 (지워진) 버킷으로 남김 → spec 이 시작 전에 미사용으로 되돌린다.
  - **미해결: 11:01 에 공유 CDP 브라우저의 탭이 한꺼번에 닫힘**(09-29 13:50 에 이어 두 번째). Edge 재시작 아님, 메모리 여유 20GB, 세션 복구 없음.
    같은 초에 다른 spec 하나가 끝나고 두 개가 시작했다. 원인 미상 — 재발하면 그 시각 전후의 spec 시작·종료와 Edge 탭 수를 같이 기록할 것.
- SKE 노드 풀(L3) 1차: 노드 풀 생성 → 1/1 Running 까지 PASS(서버 타입 기본값이 이미 s1v1m2). 삭제는 확인 뒤 30분간 무반응 → 모달 문구 기록 + 최대 3회 재시도로 바꿔 재실행 중.
- **SKE 노드 풀 PASS (09-30 14:26, 30분)**: 삭제가 두 번 "조용히 무시" 된 원인은 콘솔이 아니라 `confirmModal` 이었다 — "확인을 위해 **노드 풀명**을 입력" 의 공백 든 라벨을 못 읽어
  아무것도 안 치고 비활성 "확인" 을 강제 클릭했다. 이제 공백 라벨을 읽고 입력값을 확인하며, 칠 값을 못 찾으면 오류를 낸다.
  (교훈: "해지·삭제가 무시된다" 로 보이면 먼저 확인 모달의 입력·버튼 활성 상태를 로그로 볼 것. VM·VPC 재시도 로직도 같은 원인이었을 수 있다.)
- API 대비 대응표에서 남은 것: Backup(Agent 방식, VM + Backup Agent 체인) 하나. 의도적 제외: MessageHub Phone · ASG 알림 · LB 멤버.
- **Backup 제외 (09-30, 사용자 지적)**: Backup Agent 는 OS 안에 NetBackup 클라이언트를 설치해야 하는 상품이다. API 자동화도 생성에 성공한 적이 없다
  (마지막 응답 createbackup 500 · createbackupagent 404, AGENTLESS 로 시도했으나 콘솔엔 Agent 방식만 남음). 콘솔 폼 사실: Agent 생성은 AZ → 대상 서버(모달) →
  필수 Subnet 절(서버 선택 뒤 나타남, Agent 마다 Backup IP·Port 생성), Agent명은 자동. spec 은 만들지 않았다.
- **모수 기준 정정**: "lifecycle 에 필수 단계로 적힌 생성" 이 아니라 **API 의 마지막 실행에서 생성이 2xx 로 성공한 것**(api-test-automation `data/endpoint_status.json`)을 기준으로 한다.
  이 기준으로 화면 자동화가 아직 없는 것: CDN · GSLB, Hosted Zone 레코드, Subnet VIP(+NAT IP·포트), Transit Gateway 규칙, Peering 규칙, Private NAT, Private Link Service,
  LB Public NAT IP, VM 커스텀 이미지(+공유·멤버)·서버 인터페이스(+NAT)·볼륨 이전·덤프, API Gateway 인증·API 키·사용량 계획, Cloud Functions API Gateway 트리거,
  File Storage 스냅샷 스케줄·복제, DB 복제본 4종. (의도적 제외: IAM 사용자 · Trail · ASG 알림 · SKE kubeconfig 다운로드)

### 9.17 2차 확장 (09-30 오후, 에이전트 3개) + 탭 동시 소멸 원인

- 기준: API 의 마지막 생성 응답이 2xx 인 것. 결과(단독 PASS):
  - A: CDN(새, 25분: 배포 ≈6분 뒤 "중지" ≈15분 → 해지), GSLB(새), Hosted Zone 레코드(L3), API Gateway 인증·접근 제어·사용량 정책·API Key(L3),
    Cloud Functions API Gateway 트리거(api-gateway spec steps[8]), File Storage 스냅샷 스케줄. 건너뜀: File Storage 복제(다른 리전 kr-east1 만 가능).
  - B: Subnet VIP·VIP Port·VIP NAT IP(vpc-port), Transit Gateway 규칙, LB Public NAT IP, Private Link Service + Endpoint 승인(새, L3), Private NAT(direct-connect).
    VPC Peering 규칙은 본 단계 통과·정리 중 SSO 만료 → 재확인 필요. **TGW·Peering 은 규칙이 남아 있으면 삭제가 조용히 무시된다** → 정리 도구가 규칙부터 지운다.
  - C: VM Image 생성·Shared 전환·삭제, 포트 추가·제거, Dump(vm-stack steps[6~8]), 볼륨 이전·취소(volume-snapshot), PostgreSQL Replica(45분).
    MySQL Replica 는 본 단계 통과·정리 중 SSO 만료. MariaDB·EPAS Replica 는 작성만(주석으로 꺼 둠).
    **Replica 는 Master 백업이 켜져 있어야 한다**(꺼져 있으면 POST …/replicas 500, 화면 안내 없음). 건너뜀: 이미지 멤버·볼륨 이전 받기(다른 Account 필요),
    공유용 Image(Snapshot-Based 만), 서버 인터페이스 NAT(vm-stack-net 과 중복).
- **탭 동시 소멸 원인**: `connectLiveBrowser` 가 (a) 연결 20초 초과 또는 (b) 브라우저 내부 탭(edge://downloads-hub)을 보면 살아 있는 공유 브라우저를 강제 종료·재기동했다.
  16:26 에는 볼륨 이전 "승인 Key" 확인(키 파일 다운로드)이 내부 탭을 만들었고, 다른 실행의 연결이 그걸 보고 브라우저를 죽였다.
  → 기본은 살아 있는 브라우저를 죽이지 않는다(`PW_FORCE_RELAUNCH=1` 일 때만). 연결 초과는 60초 더 기다려 다시 붙는다. 내부 탭이 있으면 사람에게 닫아 달라고 오류를 낸다.
  → volume-snapshot 은 승인 Key 모달의 확인을 누르지 않는다.
- 09-30 19:23 SSO 만료로 전원 중단. 재로그인 후: 잔여 확인(vpc/sub-0930-1839-74ce, vpc/vpcb/peer-0930-1910-70b3, MySQL mycajdabidjhece·rep0930183974ce),
  Peering·MySQL 재실행, MariaDB·EPAS replica 켜서 1회씩.

### 9.18 대시보드 1단계 (2026-10-02)

- 첫 화면: 마지막 스위트 · 핵심 카드(현재 녹색 / 스위트 첫 시도 / 최근 7일 실패 원인 / 불안정 / 커버리지 / API 대응 / UI 쓰기 동작) · **조치 필요** 목록 · 실패 분류(오류 시그니처 묶음).
  파생 지표는 `src/report/insights.ts`(단위 테스트 tests/unit/insights.spec.ts), 화면은 `src/report/dashboard.ts`.
- **API 대응 카드는 리소스 단위**(docs/api-ui-parity.md 의 ✅ ÷ (전체 − ⏭)). 사용자가 "API 대비 100%" 를 작업 단위로 오해한 뒤(2026-10-14) 두 가지를 고쳤다:
  카드 이름에 "(리소스 단위 · 실행 연동)" 을 붙이고 옆에 **UI 쓰기 동작(작업 단위 · API 대비)** 카드(350/485 = 72%, 모수 881)를 추가; 대응표의 손 표시 ✅ 는 `judgeParity` 가 UI spec 칸의 spec id 마지막 실행과 맞춰
  ✅ 통과 확인 / ⚠ 깨짐(조치 필요에 뜸) / ❔ 미확인(실행 기록 있는 spec 없음) 으로 다시 판정한다. "마지막 스위트 첫 시도" 카드는 같은 날 spec 별 첫 결과 합산으로 고침(§9.23).
- 실패 원인은 화면에서 다시 판정: 알려진 이슈(product/test/environment) > 환경 문구(탭·컨텍스트 소멸, CDP, 세션, 산출물 폴더 ENOENT 추가) > 정리 실패 > 다음 실행 48시간 안 통과(간헐) > 미분류.
  **제품 결함은 data/known-issues.yaml 에 kind: product 로 등록한 것만.**
- 실행 기록에 `suite_id`·`attempt`·`git_sha` 추가(run-stacks 가 SUITE_ID·SUITE_ATTEMPT 환경 변수로 받음). 병렬 실행기가 `reports/suites/<id>-a<n>.json` 요약(벽시계·직렬 예상·결과·끝난 뒤 남은 리소스)을 남긴다.
  실패만 다시 돌릴 때: `npm run test:suite -- --only a,b --suite-id <처음 id> --attempt 2` → 대시보드가 첫 시도/최종을 같은 묶음으로 계산.
- 불안정 spec 은 스위트 실행 기록(suite_id 있음)만으로 판정(개발 중 재실행까지 넣으면 거의 전부 불안정으로 나옴). 첨부 링크는 그 spec 자신의 스크린샷·trace·error-context 만
  (공유 CDP 브라우저에서 test-failed-N.png 는 다른 탭을 찍는다).
- 다음(2단계 이후): 탐색 발견 사항 목록·상태, 커버리지 추세, 팀 공유(같은 HTML 을 사내 호스팅).

### 9.19 세션 수명 측정 · 만료 알림 (2026-10-06)

- 10-02 16:40 로그인 → 10-03 04:40:54 마지막 OK → 04:45:58 만료. keep-alive 가 밤새 5분마다 새로 고쳤는데도 끊겼다 → **절대 수명 약 12시간 확정**(docs/session-log.md).
- keep-alive 오탐 수정: 새로 고친 뒤 3초 만에 제목을 봐서 낮에도 24회 "만료" 로 찍혔다 → 최대 20초 기다림 + 2회 연속일 때만 확정.
- 만료 확정 시 Windows 알림(로그인 자동화 논의 A 안). 자격 증명은 다루지 않는다.
- 남은 일: 10-02 스위트가 남긴 ServiceWatch 로그 그룹 2개(swl-1002-1840-2d0e, swl-1002-1857-5b40)는 사용자 정리 대기. 정리 도구는 이제 여러 페이지 목록을 읽어 이 둘을 찾는다.

### 9.20 커버리지 3·4차, 대시보드 2단계, 불안정 spec (2026-10-06)

- 3차(에이전트 4개): L1→L2 SAML·Trail·DevOps·Cloud WAN Network·CFC 3종·Cloud LAN-DC 3종, L2→L3 22개. 회귀 스위트 S20261006-1401: 첫 시도 60/61, 최종 61/61, 136분.
- 4차: SAML(설명·메타데이터 교체)·DevOps(태그) L3. Cloud WAN Network 상세 진입 실패로 L2 유지(다음엔 상세 주소 형식부터 프로브).
- 불안정 spec: Private DNS 실패 2회 모두 dns-hosted-zone 이 자기 Private DNS 를 Creating 중일 때 겹침(계정에서 동시 생성 거부로 추정) → suite-plan lock 'private-dns'.
  Private NAT 정리 전에 예약 IP 를 반납(`releasePrivateNatIps`, 강제 실패로 검증). Cloud LAN-DC 는 실패 시 하위 자원부터 정리.
- **결함 후보(사람 판단 필요, known-issues 미등록)**: Cloud LAN-DC vDevice 가 입력 오류 없이 Failed (10-06 09:25 vRouter 생성, 09:48 vSwitch 삭제), 같은 순서 재실행은 정상.
  3번째 관측 10-08 11:50: 스위트가 2시간 한도로 끊긴 뒤 cleanup 이 vRouter cldr-1008-1148-af1e 를 삭제 → Failed. Failed vRouter 가 남으면 Network 해지가 조용히 안 되어(Active 유지) cleanup 이 300초 초과로 실패.
  → inventory 의 cldc/cldv 삭제에 spec 과 같은 "Failed 면 다시 삭제(3회)" 를 넣음(`deleteCloudLanRow`, 10-13). 10-14 아침 사용자가 `npm run stacks:cleanup -- --yes` 실행: Failed 상태였던 vRouter 가 첫 "삭제" 로 약 45초 만에 지워지고(이번엔 Failed 없음) Network 해지도 바로 Deleting → 정리 완료. 재시도 로직은 아직 Failed 분기를 실제로 타 보진 않음. 10-14 기준 잔여 0.
- 대시보드 2단계: 탐색 발견 사항 목록(data/findings.yaml 로 검토 상태), 커버리지 추세(coverage.yaml git 이력).

### 9.21 동작 단위 커버리지 · 상품별 판단표 · 6차 확대 (2026-10-07)

- 지표: API 카탈로그의 쓰기 동작(POST/PUT/PATCH/DELETE, 읽기 동사 제외)을 상품별 모수로, 화면 시나리오가 한 동작을 data/ui-operations.yaml 에 기록(통과 기록 있는 spec 만 셈).
  불가 동작은 같은 파일에 `# 불가: <동작> — <이유>`. 모수 제외 상품은 data/population-exclusions.yaml(Vertica). 판단은 data/coverage-decisions.yaml.
- 6차(에이전트 5개): 화면 쓰기 동작 245 → 326/881 (API 485/881). 6A DBaaS(PostgreSQL·CacheStore 상세 동작, MySQL·MariaDB·EPAS 는 옵션만 준비),
  6B VM·Block Storage·ASG·Event Streams 19개, 6C IAM·ServiceWatch·Trail·KMS·Secrets 19개, 6D Queue·Functions·API GW·Repository·File Storage 26개.
  6E(네트워킹·SKE 나머지)는 권한 판단으로 점검·실행 명령이 거부되어 미착수(사용자 결정 대기).
- 동작 대응은 추측 대신 화면이 보내는 요청 경로로 확인(`src/console/api-log.ts` logWriteRequests). IAM 삭제는 bulk API, VM 볼륨 연결은 /servers/{id}/volumes.
- 알게 된 위험: Cloud Functions 는 PrivateLink Service 가 켜져 있으면 해지가 조용히 무시된다. DBaaS 동작 PASS 는 DBAAS_SOFT=1 로 확인(실패 0) — 다음 회귀에서 기본 모드 확인 필요.
- SKE: 주간 spec container.ske-upgrade(--weekly), ske-cluster 에 노드 수·레이블·테인트·로깅. 네임스페이스는 클러스터 드롭다운 위치 문제로 미완.

### 9.22 6E 네트워킹·SKE 동작 확대 (2026-10-13)

- 방법: 기존 spec 끝에 "상세 설명 연필 → 수정 → 되돌림" 단계(`editDescriptionRoundTrip`, detail-edit.ts)를 붙이고 `logWriteRequests` 로 실제 PUT 경로를 확인해 data/ui-operations.yaml 에 적었다.
  첫 실행은 `PROBE_EDITS=1` 로 돌려 상세 연필 라벨·모달 구조를 로그(reports/6e/*.log, 커밋 안 함)에 남겼다.
- 새로 대응(모두 단독 PASS): VPC setvpc · setsubnet · setport · setinternetgateway · setpublicip · setsubnetvip · setnatgateway · settransitgateway · setvpcpeering,
  LB setloadbalancer, Firewall setfirewallrule(규칙 수정 화면 비활성화→활성화, PUT /firewalls/rules/bulk — 삭제도 같은 bulk), GSLB setgslb · setgslbhealthcheck(Timeout 10→20→10),
  Direct Connect setdirectconnect, DNS sethostedzone · setprivatedns, CDN updatedescriptionofcdnservice(PUT …/description), Security Group setsecuritygroup · setaddressgroup ·
  addaddressgroupcidrs · removeaddressgroupcidrs(대상 주소 탭 이름 없는 아이콘 메뉴 "삭제" → …/remove_addresses). 네트워킹 대상 10개 상품 동작 UI 120/157.
- 불가로 적음: setfirewall(크기 변경 과금·로그 저장소), sethostedzonerecord(레코드 탭에 수정 버튼 없음), 퍼블릭 도메인 4종(실제 도메인 구매), approvalvpcpeering(다른 Account),
  TGW Firewall·Uplink 규칙 6종(유료 자원·회선), LB 멤버 4종(실 VM)·L7 Listener 3종, CDN purge. 미실시: startcdnservice(시간), LB Private NAT IP, activateprivatedns(VPC 연결 연필).
- 알게 된 것: **Hosted Zone 에 레코드가 남아 있으면 삭제 요청이 조용히 무시되고 Private DNS 해지도 막힌다** → `clearHostedZoneRecords`(inventory.ts) 를 spec teardown 과 정리 도구가 먼저 부른다.
  GSLB Health Check 모달은 Timeout ≤ Interval 이면 안내 없이 "확인" 이 안 닫힌다. Address Group 대상 주소 탭 상단 "Address Group 삭제" 는 그룹 자체 삭제(1차 실행에서 잘못 눌러 그룹이 지워짐).
  `saveModal` 은 이제 보이는 모달이 여럿이면 수정 모달이 아닌 것(경고)부터 누른다(SKE 퍼블릭 엔드포인트 경고가 DOM 앞에 있어 90초 대기하던 문제).
- SKE(container.ske-cluster PASS 10-13 14:26, 40.7분 — SKE_SCALE=0 SKE_LABELS=0; 5번째 시도): 노드 풀 "우선 IP 지정"(setnodepoolpreferredips, PUT …/nodepools/{id}/preferred-ips),
  퍼블릭 엔드포인트 켬→끔(setclusterpublicaccesscontrol, PUT …/clusters/{id}/public-access-control: 사용 체크 → 동의 체크가 있는 경고 모달 → 접근 허용 IP 범위 1개 필수),
  두 번째 SG sgb-<run_id> 추가→제거(setclustersecuritygroups, PUT …/clusters/{id}/security-groups: "Security Group 선택" 모달은 이름을 검색해야 행이 나오고 선택 여부는 "n/4 개" 로 판단).
  ServiceWatch 로그 수집 경로는 …/service-watch-logging(setclusterlogging 아님). 불가·미실시 사유는 data/ui-operations.yaml ske 절. 전부 돌리면 ≈55분(suite-plan 55).

### 9.23 콘솔 전용 쓰기 동작 자동 집계 · 스위트 첫 시도 합산 · 대응표 실행 연동 (2026-10-14)

- 배경: 대시보드 "API 대응 100%" 를 사용자가 작업 단위로 오해("api 대비 100%라고 되어 있던데 어떻게 그렇지?"). 리소스 단위(대응표 ✅ 67/67)였다.
  이어서 "api 가 없는 화면 액션도 있는 거 아닌가" → 모수(API 쓰기 동작 881) 밖의 콘솔 전용 동작을 **자동으로** 세기로 결정.
- 콘솔 전용 쓰기 동작(모수 밖, 따로 센다):
  1. `src/fixtures/test.ts` page fixture 가 `collectWriteRequests`(api-log.ts)로 그 페이지의 쓰기 요청 "METHOD /console/api/<svc>/v1/…/{id}" 를 모아
     annotation `api_writes` 로 붙이고, `buildRunRecord` 가 테스트별 annotation 을 걷어 `RunRecord.api_writes`(중복 제거) 한 곳에 넣는다. 본문·쿼리는 안 남긴다.
     모든 spec 에 적용(spec 이 `logWriteRequests` 를 따로 부르지 않아도). 숫자만인 세그먼트도 {id} 로 줄인다.
  2. `scripts/import-api-coverage.ts` 가 API 저장소 `api_catalog.json` 의 `http_path` 를 `ops[].path` 로 함께 가져온다(1490/1490, 같은 커밋 65bb173 — 숫자 변화 없음).
     API 저장소는 로컬에 없어 scratchpad 에 `git clone --depth 1 https://github.com/kyle-agent/api-test-automation` 해서 `--repo` 로 넘겼다.
  3. `consoleOnlyWrites`(operations.ts): 통과한 실행의 api_writes 중 같은 메서드의 카탈로그 경로와 **strict** 하게 맞지 않는 것.
     strict = 카탈로그 `{…}` 는 콘솔 `{id}` 와만, 나머지는 글자 그대로. `{…}` 자리에 bulk 같은 글자가 와서 **loose** 로만 맞으면 "?" 표시(콘솔 전용 의심, 예 firewall PUT /rules/bulk).
     POST 인데 경로에 조회 낱말(search·query·analysis·list·check·…, `READ_LIKE_PATH`)이 있으면 `read-like` 로 분류해 세지 않고 접힌 목록에만(콘솔 홈 예산 위젯 POST /cost-analysis/budget 이 첫 예).
  4. 대시보드: "UI 쓰기 동작" 카드 설명 끝에 `콘솔 전용 +N`(링크) · "화면 vs API" 섹션 아래 표(상품·메서드·경로·spec·마지막). RESULTS.md §5.
  5. 검증: networking.vpc.create-delete 단독 PASS(10-14 08:52) → api_writes 4건(budget POST 는 read-like, VPC POST/PUT/DELETE 는 카탈로그와 맞음) · networking.firewall 로 bulk "?" 확인(아래).
  한계: 2026-10-14 이전 실행 기록에는 api_writes 가 없어 전체 스위트를 한 번 돌려야 표가 찬다. 콘솔 ID 가 UUID·숫자가 아니면(이름 세그먼트) strict 가 어긋나 콘솔 전용으로 잘못 보일 수 있다 — 그때 `shortenIds` 에 규칙 추가.
- "마지막 스위트 첫 시도" 카드: S20261008-0951 1차가 2시간 한도로 죽어 요약 파일(a1.json)이 없었고 2차 42/42 만 보였다. `synthesizeSuiteSummaries` 가 요약 파일 없는 시도를
  실행 기록(suite_id·attempt)으로 채우고, 첫 시도 = **spec 별로 그 스위트에서 처음 나온 결과**가 pass 인 수(분모 = 모든 시도 spec 합집합) → 61/61. 카드 설명에 "a1 는 요약 파일 없이 실행 기록으로 채움" 표시.
- 대응표 ✅ 실행 연동(`judgeParity`)은 9.18 보충 참고. 카드 두 장 모두 "(리소스 단위 · 실행 연동)" / "(작업 단위 · API 대비)" 로 단위를 이름에 적었다.
