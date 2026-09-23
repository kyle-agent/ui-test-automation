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
  coverage.yaml         커버리지 장부: 리소스 키가 있는 목록 화면(80개)별 level 0~4 · spec · last_pass (npm run coverage 로 검증)
data/known-issues.yaml  알려진 이슈 (실패 분류에 쓰는 오류 메시지 정규식)
reports/                runs/<시각>-<spec id>.json 실행 기록(런처가 남김, 커밋) · RESULTS.md 결과 정리(npm run results 생성물)
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
src/jev/                Jev 결정 클라이언트(decide), 관측·실행(browser, snapshot.js), 기록 루프(recorder)
src/fixtures/test.ts    콘솔 테스트용 test 객체 (PW_CDP_URL 이면 살아 있는 로그인 브라우저에 붙는다)
scripts/                auth-login, menu-snapshot, menu-diff, gen-smoke-specs, titles-merge, record, trace-to-spec
recordings/             profile-*/ 와 session-*.json (gitignore), Jev 기록 트레이스 <id>/trace.json (커밋)
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

### 1. 로그인 브라우저 띄우기 (사람이 직접 로그인)

```bash
npm run auth:login -- --session root --keep-open   # 창이 열리면 비밀번호·MFA·캡차를 직접 입력하고, 그 창을 그대로 둔다
```

브라우저는 `recordings/profile-root/` 영구 프로필(gitignore)로 뜬다. 대시보드가 뜨면 `recordings/session-root.json` 을 저장하고,
브라우저를 닫지 않은 채 CDP 포트(기본 9222)를 열어 둔다.
`.env` 에 `PW_CDP_URL=http://127.0.0.1:9222` 가 있으면 테스트와 스크립트는 **이 브라우저에 붙어 같은 세션 안에서 새 탭을 연다**.
다른 터미널에서 `npm run auth:check` 로 확인한다.

왜 이렇게 하나: 콘솔은 브라우저를 닫거나 시간이 지나면 서버 세션을 무효화하고("권한 없음 / Session Invalid") SSO 까지 로그아웃시킨다.
그래서 쿠키를 파일로 복사해 새 브라우저에서 재생하는 방식(storageState)은 로그인 직후 잠깐만 동작한다. `PW_CDP_URL` 이 없을 때만
그 파일을 차선책으로 쓴다. 로그인 브라우저를 닫으면(Ctrl+C) 세션이 끝나므로 다시 로그인해야 한다.

세션 파일은 로그인 세션 자체이므로 커밋·공유하지 않는다. 클라우드 세션(Claude Code on the web)에서는 브라우저 창을 띄울 수 없으므로
이 단계는 반드시 로컬에서 한다.

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

### 4. Jev 기록 → spec 고정 (CRUD 시나리오)

```bash
npm run record -- scenarios/networking/vpc-create-delete.yaml --confirm   # 로그인 브라우저에 붙어 기록. 동작마다 y/n/q
npm run gen:spec -- recordings/networking.vpc.create-delete/trace.json    # 트레이스 → tests/regression/<id>.spec.ts 초안
RUN_DESTRUCTIVE=1 npx playwright test --project=regression                 # 결정적 재생 (Jev 없음)
```

- 기록 러너는 step 의 `goal` 을 Jev 에게 주고, Jev 가 관측 요소 표에서 고른 동작(CLICK / TYPE_TEXT / SELECT / DONE …)을 코드가 실행한다.
  매 동작 뒤 코드가 `expect` 를 판정하고, 만족되면 다음 step 으로 넘어간다. `goto` 가 있는 step 은 Jev 없이 직접 이동한다.
- TYPE_TEXT 값은 시나리오 `vars` 에서만 온다(필드 라벨로 매칭). 못 고르면 소형 텍스트 모델이 `vars` 값 중 하나를 고르고, 그것도 없으면 멈춘다.
- 안전장치: 삭제·결제·승인 라벨은 goal 이 그 단어를 쓸 때만 후보에 들어가고, 로그아웃은 절대 후보가 아니다. 첫 `goto` 의 라우트 접두어를
  벗어나면 멈춘다. `--confirm` 이면 사람이 모든 동작을 승인한다. `--dry-run` 은 첫 선택만 보여준다.
- teardown 은 앞 step 이 실패해도 실행된다(리소스가 남았을 수 있으므로). `--no-teardown` 은 리소스가 남을 수 있으니 주의.
- 트레이스(`recordings/<id>/trace.json`)는 커밋한다. 클라우드 세션이 이걸 읽고 spec 을 다듬는다. 스크린샷은 gitignore.
- 콘솔 화면 내용이 micro-app 의 iframe 이나 shadow DOM 안에 있어도 관측·판정·spec 로케이터가 모두 그 안을 본다.
  BLOCKED 가 나오면 트레이스의 `observed`(요소 표 요약, 프레임 목록)와 `screenshot`(`screenshots/<phase>-<n>-<k>-blocked.jpg`)으로 Jev 가 무엇을 봤는지 확인한다.
- 콘솔 셸의 로딩 오버레이(`.loader-overlay`, 진입 직후 2~3초, 앱 루트 `[inert]`)와 공지 모달(`.scp-modal.notice-info-container`)은
  `src/console/overlays.ts` 가 관측·판정 전에 걷어낸다(`gotoRoute` 와 기록 루프의 매 관측 앞). 요소가 0개로 보이면 최대 10초 동안
  Jev 에게 묻지 않고 다시 관측한다. 닫은 공지 수는 트레이스 step 의 `notices_closed` 에 남는다.
- 파이프라인 검증용 픽스처: `tests/fixtures/fake-vpc.html?mode=plain|shadow|iframe` (가짜 VPC 콘솔, 세 가지 구조). 콘솔 없이 기록과 재생을 끝까지 돌려볼 수 있다.
  `&shell=loader,notice` 를 붙이면 로딩 오버레이와 공지 모달까지 흉내 낸다(`tests/unit/overlays.spec.ts`).

```bash
npm run record -- scenarios/networking/vpc-create-delete.yaml --base-url "file:///$PWD/tests/fixtures/fake-vpc.html?mode=iframe" --out recordings/tmp
CONSOLE_URL="file:///$PWD/tests/fixtures/fake-vpc.html?mode=iframe" CONSOLE_BASE_PATH= RUN_DESTRUCTIVE=1 npx playwright test --project=regression
```

### 5. 회귀 스택 스위트 한 번에 돌리기 (실제 콘솔, 과금 리소스 생성·삭제)

```bash
npm run stacks:check                       # 남은 테스트 리소스와 VPC 개수(계정 한도 5) 점검. 변경 없음
npm run test:stacks                        # 아래 순서로 spec 을 하나씩 직렬 실행 (약 45분). 별도 터미널에서
npm run test:stacks -- --only vm-volume    # 일부만 (콤마 구분). --from vm-stack 은 그 spec 부터
npm run stacks:cleanup                     # 실패로 남은 리소스를 의존관계 역순으로 정리 (이름 규칙에 맞는 것만)
```

| 순서 | spec | 만드는 것 | 소요(실측) |
| --- | --- | --- | --- |
| 1 | `networking.vpc.create-delete` | VPC | 약 20초 |
| 2 | `compute.vm-stack` | VPC → Subnet → 서버 (Keypair 는 공유 `qa-shared-keypair` 재사용) | 약 12분 |
| 3 | `compute.vm-volume` | 2 + 볼륨 생성·연결·분리·삭제 | 약 16분 |
| 4 | `compute.vm-stack-net` | 2 + Security Group·Internet Gateway·Public IP 연결 | 약 15분 |

- **직렬이어야 하는 이유**: 계정당 VPC 5개 한도, 로그인 브라우저 하나를 공유(탭 순서), 한 spec 이 만든 리소스를 그 spec 의 afterEach 가 지운다. `PW_CDP_URL` 이 있으면 워커는 이미 1이지만
  Playwright 는 파일 순서를 보장하지 않으므로 런처(`scripts/run-stacks.ts`)가 spec 을 한 개씩 순서대로 띄운다. 하나가 실패해도 다음 spec 은 새 run_id 로 독립 실행된다.
- 각 spec 은 실패해도 afterEach 에서 역순 정리를 끝까지 시도하고, 못 지운 것을 "정리 중 실패" 로 보고한다. 그때는 `npm run stacks:check` → `npm run stacks:cleanup`.
- 시간이 오래 걸리는 대기: Subnet Active 최대 15분(IGW 가 붙은 VPC 는 5분 이상), 서버를 담았던 Subnet 삭제 약 6분, 볼륨 연결·분리 각 약 30초.
- 콘솔 세션은 몇 시간~하루 뒤 만료된다(SSO 재로그인 필요). 브라우저 크래시는 `connectLiveBrowser` 가 자동 재기동하지만 세션 만료는 사람이 로그인해야 한다.

#### 커버리지 장부와 결과 정리 (콘솔 불필요)

```bash
npm run coverage             # service-map/coverage.yaml 을 서비스 맵과 맞춰 검증하고 level 별 수치·카테고리 표 출력 (--md 로 Markdown)
npm run results              # reports/runs/*.json → reports/RESULTS.md (spec 별 최근 상태, 최근 실패, 알려진 이슈, 커버리지)
```

- **`service-map/coverage.yaml`**: 모집단은 `screens.txt` 의 "리소스 키가 붙은 목록 화면"(`… | /x/y/list (key)`, 80개)이고 한 줄이 리소스 하나다.
  `level` 은 0 없음 · 1 진입(스모크가 화면에 들어간다) · 2 CRUD(생성·확인·삭제, teardown 포함) · 3 동작(연결/분리·시작/중지·크기 변경 같은 상태 변화) ·
  4 통합(다른 리소스와 의존관계를 맺는 스택 안에서 통과). `specs` 는 `tests/regression/<id>.spec.ts` 또는 시나리오 id, `last_pass` 는 그 level 로 마지막 통과한 날짜.
  같은 resource_type 이 여러 서비스에 있으면(volume·image·keypair·user·group·bucket) key 가 `keypair@virtual-server` 처럼 서비스 slug 를 달고 있다.
  **갱신 규칙**: spec 이 실제 콘솔에서 통과하면 그 spec 이 다루는 리소스의 level 을 올리고 `specs` 에 id 를 더하고 `last_pass` 를 그 날짜로 바꾼 뒤 `npm run coverage` 로 검증한다.
- **`reports/runs/<YYYYMMDD-HHMM>-<spec id>.json`**: `npm run test:stacks` 가 spec 하나를 마칠 때마다 남기는 실행 기록(커밋 대상). 시작·종료 시각, 소요, PASS/FAIL,
  test.step 제목·상태·시간, annotation(scenario/run_id/phase), 실패 시 오류 첫 줄과 첨부 경로, 실패 분류 `class`(기본 `unclassified`, 세션 만료·SSO 이동·브라우저 연결 실패 문구면 `environment`,
  알려진 이슈에 맞으면 그 항목의 kind 와 `known_issue`). stdout 은 넣지 않는다.
- **`reports/RESULTS.md`**: `npm run results` 가 만드는 생성 파일. spec 별 마지막 실행·결과·소요·최근 5회(`PPFPP`)·통과 평균, 최근 실패, 적용된 알려진 이슈, 커버리지 요약.
  기록이 없으면 "기록 없음". 스위트를 돌린 뒤 `npm run results` 로 다시 만든다.
- **`data/known-issues.yaml`**: 알려진 이슈(id `KI-000` 형식, `spec` 또는 `*`, 오류 메시지 정규식 `match`, `kind` product|test|environment, `since`, `note`, 선택 `expires`·`enabled`).
  매칭된 실패는 숨기지 않고 `FAIL(known: KI-xxx)` 로 표시한다. 지금은 형식을 보여 주는 비활성 예시(`KI-000`)만 있다.

### 6. Jev 탐색 (Level 5, 모수 밖의 탐색적 확장)

```bash
MSYS_NO_PATHCONV=1 npm run explore -- --route '#/vpc/vpc/list' --open '서비스 생성' --name vpc-form --budget 30
# Git Bash 는 '#/…' 인자를 Windows 경로로 바꾸므로 MSYS_NO_PATHCONV=1 이 필요. Jev 호출은 프록시 CA 설정(docs/HANDOFF.md 8절) 필요.
```

- 이미 확보된 화면에서 Jev 가 "아직 시도하지 않은 컨트롤" 을 골라 동작시키고, 코드가 판정한다. 입력값은 폼이 써 준 규칙(3~20자, /16~/28, 8GB 단위)을 읽어
  유효·경계·금지값을 순서대로 낸다(`src/explore/values.ts`). 판정은 치명(세션 상실·빈 화면 → 중단) / 이상(오류 문구·HTTP 5xx·JS 예외) / 정보(서버 거부·검증 문구)(`src/explore/oracles.ts`).
- 안전: 삭제·해지·결제 등 기존 필터에 더해 리전/계정/설정/요금·구매·신청/화면 이탈 링크/이름 없는 버튼 제외, 라우트 접두어 이탈 시 복귀, 결정·비용·시간 예산.
  유효 이름은 정리 규칙을 따르므로 탐색 중 실제로 생성된 리소스는 `npm run stacks:cleanup` 이 지운다.
- 결과: `recordings/explore/<이름>-<시각>/report.md`(단계 표, 판정, 미시도 컨트롤, 스크린샷). 발견은 사람이 제품 결함 후보 / 새 단언 후보 / 노이즈로 분류하고,
  단언으로 승격되면 `coverage.yaml` 의 L2/L3 에 반영된다. 탐색 자체는 커버리지 분모에 넣지 않는다.
- 파일럿(2026-09-23, VPC 생성 폼): 결정 11회·20회, 비용 $0.0014·$0.0025, 이상 0, 검증 문구 2·6건, 생성 확정·취소·화면 이동 모달 처리.

### 세션 없이 되는 것 (클라우드/CI)

```bash
npm run check                # typecheck + prettier + unit
npm run test:auth-public     # 공개 로그인 페이지 스모크 (자격 증명 없음)
```

## 판정 규칙

- `expect.url` 부분 일치, `expect.title` 정확 일치, `expect.text` 는 모두 보여야, `expect.not_text` 는 화면 텍스트에 없어야, `expect.count` 는 role 개수.
- 콘솔 화면은 `document.title` 이 `"<화면명> | <서비스명> | <리전> | Console"` (셸 화면은 서비스명 없이 `"<화면명> | <리전> | Console"`) 형식이어야 하고,
  `service-map/titles.json` 에 등록된 라우트는 정확히 같아야 한다.
- SSO 로그인 페이지로 튕기면 세션 만료로 보고 즉시 실패시킨다(테스트 실패가 아니라 환경 문제).
- `destructive` 태그(과금 리소스 생성/삭제)는 `RUN_DESTRUCTIVE=1` 일 때만 실행된다. 이름은 `{{run_id}}` 로 짓고 teardown 을 반드시 둔다.

## 환경 변수

`.env.example` 참조. 회귀 실행에는 `CONSOLE_URL`, `SESSION` 만 필요하다. OpenRouter 키는 Jev 기록/치유 단계에서만 쓴다.
