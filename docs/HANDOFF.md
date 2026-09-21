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
- **미완/보류**: Jev 기록 러너(Python, `uv`)는 `decide.py`(OpenRouter decisions 클라이언트, jev-ultrafast model.py 기반)와 프롬프트까지
  작성했으나 사용자가 시나리오를 다시 정하기로 해 이번 푸시에서 제외했다. 시나리오가 정해지면 record → trace → spec 변환 → heal 순으로 잇는다.
