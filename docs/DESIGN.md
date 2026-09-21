# SCP v2 Enterprise 콘솔 회귀 테스트 자동화 설계

작성일 2026-09-21. 대상: https://console.e.samsungsdscloud.com (→ console.kr-west1.e.samsungsdscloud.com/console/)

## 1. 역할 분담

| 역할 | 담당 | 언제 |
|---|---|---|
| 시나리오 초안 작성, 기대결과 정의 | Claude Code | 개발 시점 |
| 최초 경로 탐색(어느 요소를 어떤 동작으로) | Jev (`typesafe/jev-1.13`, OpenRouter decisions API) | 기록 시점 |
| TYPE_TEXT 값 생성 | Claude API (소형 모델) | 기록 시점 |
| 트레이스 → Playwright spec 변환 | Claude Code | 기록 직후 |
| 회귀 판정 (url/text/count 단언) | Playwright 코드, LLM 없음 | CI |
| 로케이터 실패 시 복구 | Jev fallback (실패한 step 만) | CI |
| 실패 분류 (drift vs regression), spec 갱신 | Claude Code | CI 후 |

Jev 는 "화면에서 고르기"만 한다. 시나리오도, 판정도 하지 않는다.

## 2. 콘솔 분석 결과 (2026-09-21, 로그인 전 관찰 + JS 번들 분석)

- **프레임워크**: Vue 3 + vue-router + pinia + axios + echarts. 셸이 23개 서비스를 micro-app 으로 로드
  (`service-map/service-map.yaml`). 각 서비스는 별도 번들(`scp-<svc>-user-console`)이라 UI 관례가 서비스마다 다를 수 있다.
- **환경**: dev2 / e / g / k / s 다섯 환경이 번들에 하드코딩. 회귀는 `e`(Enterprise) 기준, 환경은 설정으로 바꿀 수 있게 한다.
- **인증**: Keycloak(realm `scp`) OIDC. Root / IAM 두 사용자 유형. 비밀번호 + MFA(이메일/SMS 인증번호),
  최초 로그인 시 캡차("자동 입력 방지") + 약관 동의.
  → **테스트는 로그인을 자동화하지 않는다.** 사람이 한 번 로그인한 세션(쿠키/스토리지)을 `recordings/session-<type>.json` 으로
  저장하고 Playwright `storageState` 로 재사용한다. 세션 만료 시 사람이 갱신. 자격 증명과 OTP 는 코드나 LLM 에 절대 전달하지 않는다.
  CI 에서 무인 실행이 필요하면 MFA 예외가 걸린 전용 테스트 계정을 플랫폼 팀에 요청해야 한다.
- **테스트 훅 없음**: `data-testid`/`data-test`/`data-cy` 속성이 번들에 하나도 없다. 로케이터는 role/label/text 기반으로만 쓴다.
  CSS 클래스는 빌드마다 바뀔 수 있으므로 금지.
- **버튼이 div**: 로그인 화면의 "다음" 버튼이 `<button>` 이 아니라 generic div 로 렌더링된다.
  → jev-ultrafast 의 `snapshot.js` 는 `a, button, input, [role=...]` 만 수집하므로 이 콘솔에서는 클릭 대상을 놓친다.
  **snapshot.js 확장 필요**: `cursor:pointer` 이거나 클릭 핸들러가 붙은 div/span 을 `button` 역할로 추가 수집.
  Playwright 쪽도 `getByRole('button')` 대신 `getByText()` 를 써야 하는 경우가 많을 것.
- **i18n**: 한국어/English 전환 가능. 텍스트 기반 로케이터를 쓰므로 테스트 언어를 한국어로 고정한다.
- **메뉴가 API 로 제공됨** (로그인 후 확인): `GET /console/api/product/v1/menus?page=N&size=100` 이 89개 서비스와
  각 서비스의 좌측 메뉴(`service_menu_ko` JSON 문자열)를 돌려준다. `service-map/screens.txt` 가 그 결과다.
  → 두 가지 활용: (1) 화면 진입 스모크 시나리오를 사람 손 없이 자동 생성 (`scenarios/smoke/*.yaml`, 89개).
  (2) **UI 없이 메뉴 변경 감지**: 이 API 응답을 매일 저장해 diff 하면 화면 추가/삭제/경로 변경을 브라우저를 열기 전에 안다.
  Jev 로 "변경 파악" 하는 것보다 훨씬 싸고 정확하다. Jev 는 화면 안의 요소 변경에만 쓴다.
- **서비스 진입 방식**: 모든 서비스 항목은 `<a>` 가 아닌 클릭 div 이지만, 라우트는 hash(`#/virtualserver/dashboard`) 이므로
  Playwright 에서는 메뉴 클릭 대신 URL 직접 이동으로 진입해도 된다. 메뉴 클릭 자체를 검증하는 시나리오만 클릭을 쓴다.
- **테스트 계정**: `API_RegressionTest` 계정(kyuh.choi+areg1)으로 확인. 리소스 없음(비용 0), 회귀용 전용 계정으로 적합.
- **실화면 검증 (Virtual Server 목록, IAM 사용자 목록)**: hash URL 직접 진입이 정상 동작하고 오류 문구 없음.
  `document.title` 이 `"<화면명> | <서비스명> | <리전> | Console"` 형식(예: `사용자 목록 | Identity and Access Management(IAM) | Global | Console`)
  으로 안정적이라 **가장 싼 결정적 단언**으로 쓴다. 서비스 안의 좌측 메뉴 항목은 실제 `button` 이라 Jev snapshot 이 그대로 본다.
  div 버튼 문제는 SSO 로그인 화면과 일부 위젯에 한정될 가능성이 크지만, 화면별 폼/테이블 액션은 기록 단계에서 다시 확인한다.
- **리전 스코프**: 서비스마다 리전형(kr-west1)과 Global 형이 섞여 있다(IAM 은 Global). 타이틀에 리전이 찍히므로 시나리오 precondition 의 region 은 참고값이다.

## 3. 디렉터리

```
scp-console-tests/
  service-map/service-map.yaml   서비스·화면 목록 (screens 는 로그인 후 탐색해서 채움)
  scenarios/<service>/*.yaml     자연어 goal + 결정적 expect (형식: scenarios/_FORMAT.md)
  recordings/<scenario-id>/      Jev 기록 트레이스, 스크린샷
  recordings/session-*.json      사람이 만든 로그인 세션 (gitignore)
  tests/<scenario-id>.spec.ts    Claude Code 가 트레이스에서 생성한 Playwright 회귀 테스트
  runner/                        record(Jev) · replay(Playwright) · heal(fallback) · triage
```

## 4. 단계별 계획

1. **환경 준비**: 로그인 세션 저장 방식 확정, snapshot.js 확장, Playwright 프로젝트 초기화.
2. **서비스 맵 완성**: 로그인 후 각 서비스의 좌측 메뉴를 긁어 `screens` 채움 (읽기 전용 크롤링, Jev 불필요).
3. **읽기 전용 스모크**: 화면마다 "메뉴로 이동 → 목록이 보인다" 시나리오. 23개 서비스 × N 화면. 파괴적 작업 없음.
   여기서 Jev 기록 → Playwright 고정 파이프라인을 검증한다.
4. **CRUD 회귀**: 서비스별 생성/수정/삭제 시나리오. `cleanup: true` 와 `{{run_id}}` 로 리소스 정리. `destructive` 태그는 CI 기본 제외.
5. **치유·분류 루프**: 로케이터 실패 → Jev fallback → drift/regression 분류 → Claude Code 가 spec 갱신 PR 초안.

## 5. 리스크

- Jev 는 OpenRouter 에서 베타(alpha 엔드포인트). 호출부를 `runner/decide.py` 한 곳에 격리.
- Jev 의 확률적 선택이 회귀를 가릴 수 있으므로 CI 판정은 항상 Playwright 결정적 단언이 한다.
- 콘솔이 실제 클라우드 리소스를 만든다. CRUD 시나리오는 비용과 정리 실패 위험이 있어 전용 프로젝트/계정에서만 돌린다.
- 회사 프록시의 TLS 가로채기: Python 은 `truststore`, uv 는 `UV_SYSTEM_CERTS=1` 필요 (jev-ultrafast 설정과 동일).
