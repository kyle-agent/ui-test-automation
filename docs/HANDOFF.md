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
