# 시나리오 파일 형식

한 파일 = 한 사용자 여정. 파일명은 `<service>/<screen>-<intent>.yaml`.
LLM이 아니라 사람이 읽고 검토할 수 있어야 하므로 짧게 유지한다.

```yaml
id: compute.vm.create-basic          # 고유 ID (서비스.화면.의도)
title: VM 기본 생성
service: compute                     # service-map.yaml 의 id 와 일치
tags: [smoke, create]                # smoke | regression | destructive | readonly
precondition:
  session: root                      # root | iam  (recordings/session-*.json 재사용)
  region: kr-west1
  cleanup: true                      # 생성 리소스는 teardown 에서 삭제

steps:
  - goal: "Compute > Virtual Server 메뉴로 이동한다"
    expect:                          # 결정적 검사. LLM 없이 코드로 판정한다.
      url: "/compute/virtual-server"
      text: ["Virtual Server"]
  - goal: "생성 버튼을 눌러 생성 폼을 연다"
    expect:
      text: ["Virtual Server 생성"]
  - goal: "이름에 {{name}} 을 입력하고 나머지는 기본값으로 두고 생성한다"
    vars:
      name: "qa-vm-{{run_id}}"
    expect:
      text: ["{{name}}"]
      not_text: ["오류", "실패"]

teardown:
  - goal: "{{name}} 을 선택하고 삭제한다"
    expect:
      not_text: ["{{name}}"]
```

## 필드 규칙

- `goal`: 자연어 한 문장. 최초 기록 때 Jev 에이전트에게 그대로 전달된다.
  구체적인 셀렉터나 좌표는 쓰지 않는다. Jev가 화면에서 찾는다.
- `expect`: 반드시 코드로 판정 가능한 것만. `url`(부분 일치), `text`(모두 보여야 함),
  `not_text`(하나도 보이면 안 됨), `count`(예: `{ "table row": ">=1" }`).
  "정상적으로 보인다" 같은 모호한 기대는 금지.
- `vars`와 `{{run_id}}`: 실행마다 고유한 이름을 만들어 병렬 실행과 정리를 가능하게 한다.
- `tags: destructive`가 붙은 시나리오는 CI 기본 실행에서 제외한다.

## 생명주기

1. **작성**: Claude Code가 service-map.yaml 의 screens 와 기존 문서를 보고 초안을 만든다. 사람이 검토한다.
2. **기록**: `record` 러너가 각 step 의 goal 을 Jev 에 넘겨 실제 콘솔에서 완주시키고
   `recordings/<id>/trace.json`(요소 테이블, 선택, 확률, 스크린샷)을 남긴다.
3. **고정**: Claude Code가 trace 를 Playwright 테스트(`tests/<id>.spec.ts`)로 변환한다.
   로케이터는 role/label/text 기반. 콘솔에 data-testid 가 없으므로 CSS 클래스는 쓰지 않는다.
4. **회귀**: CI 는 Playwright 만 돈다. 어떤 step 의 로케이터가 실패하면 그 step 만 Jev fallback
   으로 재시도하고, 성공하면 `drift` 로 표시해 Claude Code 가 spec 을 갱신하도록 큐에 넣는다.
   Jev 도 실패하면 `regression` 후보로 사람에게 올린다.
