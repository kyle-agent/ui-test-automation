# API Gateway: 수정·삭제 동작의 콘솔 경로 (2026-10-16, 에이전트 B)

`scenarios/application-service/api-gateway.yaml` steps[5]~[7]·[13] 과 `data/ui-operations.yaml` apigateway 절의 근거. 2026-10-07(6D) 에 "불가" 로 적었던 동작을 다시 프로브해 경로를 찾았다.
프로브 스크립트(API 1개 생성 → 조사 → 해지): `test-results/encode-test/agentB-apigw-probe*.ts`(gitignore), 로그 `reports/agentB-probe-apigw*-20261016.log`. "[API]" 는 `logWriteRequests` 로 본 실제 요청 경로.

## 1. 목록 행의 ⋮ 메뉴 (인증 · 접근 제어 · 연결된 API Key)

- 세 표 모두 행 끝에 `i.i-card-handle`(menu-icon) 아이콘이 있고, 누르면 `.scp-menu`(teleport, menu-right) 로 **"수정 | 삭제"** 두 항목이 뜬다. 행 이름 글자는 링크가 아니다(클릭해도 변화 없음), 상세 화면도 없다.
  6D 가 "수정 버튼·상세 화면이 없음" 으로 본 것은 이 아이콘을 버튼으로 세지 않았기 때문.
- **인증(JWT)** `#/apigateway/authentication`: ⋮ → 수정 → 모달 "JSON Web Token 수정"(JWT명 input · 연결할 스테이지 "사용" 체크 · 스테이지명 드롭다운 "전체")
  → 확인 → 알림 "JSON Web Token을 수정하시겠습니까?" → `PUT /console/api/apigateway/v1/apis/{id}/auths/{id}` (**setauth**).
  "사용" 을 끄면 행의 연결 스테이지 수가 1 → 0 (행: `<JWT명> JWT(JSON WEB TOKEN) <연결 수> <만료 일시>`). 만료 기간(31 Days)은 생성 모달에만 있고 수정 모달엔 없다.
- **접근 제어** `#/apigateway/accessControl`: ⋮ → 수정 → 모달 "접근 제어 수정"(접근 제어명 · Public 접근 허용 IP · 연결할 스테이지 사용/스테이지명 · 설명 textarea 50자)
  → 확인 → "접근 제어를 수정하시겠습니까?" → `PUT …/apis/{id}/access-controls/{id}` (**setaccesscontrol**). 목록에 설명 열이 없어 spec 은 수정 모달을 다시 열어 textarea 값으로 확인한다.
- **연결된 API Key**(사용량 정책 상세 `#/apigateway/usagePlan/detail?…` 표): 열 API Key명 | API Key ID | Key 설명, 행 버튼 "복사하기". ⋮ → 수정 → 모달 "연결된 API Key 수정"(설명 textarea 50자)
  → 확인 → "API Key를 수정하시겠습니까?" → `PUT …/usage-plans/{id}/api-keys/{id}/description` (**setapikeydescription**). 저장 뒤 행 "Key 설명" 열에 바로 보인다.
  API Key 생성 모달(API Key 추가)에도 설명 칸이 있다.

## 2. 리소스 정책 `#/apigateway/resourcePolicy` (6D 가 못 찾은 화면 — 좌측 메뉴 "리소스 정책", service-map/screens.txt 에 있음)

- 제목 옆 API 드롭다운 + "조회"(다른 API Gateway 화면과 같은 `selectApi`). **API 를 만들면 기본 정책이 이미 들어 있다**:
  `{"Statement":[{"Action":["apigateway:InvokeApigatewayRegion"],"Effect":"Allow","Principal":"*","Resource":["srn:…:apigateway:api/<id>"],"Sid":"DefaultStatement"}],"Version":"2024-07-01"}` 가 "정책 세부 정보"(코드 복사 · 줄 번호 1~16) 에 보이고 버튼은 **"삭제 | 수정"**.
- "삭제" → 알림 "API명: <이름> 리소스 정책을 삭제하시겠습니까?" → 확인 → `DELETE …/apis/{id}/resource-policies` (**deleteresourcepolicy**) → 화면이 "리소스 정책을 생성하세요." + 버튼 **"리소스 정책 생성"** 으로 바뀐다.
- "리소스 정책 생성" → `#/apigateway/resourcePolicy/request`: 정책 템플릿 드롭다운(**사용자 지정 | 기본 정책 | 계정 허용 목록 | IP 범위 거부 목록**) + JSON 편집기(textarea, 템플릿을 고르면 채워짐) → "완료"(내용이 있어야 활성)
  → "리소스 정책을 생성하시겠습니까?" → `POST /console/api/iam/v1/resource-policies/validate` → `PUT …/apis/{id}/resource-policies` (**setresourcepolicy**) → 다시 "삭제 | 수정".
- JSON 편집기는 Monaco(`textarea[data-mprt]`, 가상 스크롤): `textarea` 의 value 에는 **보이는 줄만** 들어가 뒤쪽 `"Sid": "DefaultStatement"` 줄이 잘린다 → 템플릿 확인은 앞쪽 `apigateway:InvokeApigatewayRegion` 으로(1차 실행 실패 원인).
- "수정" → `#/apigateway/resourcePolicy/edit`(같은 폼, 현재 정책이 채워짐): 내용을 바꿔야 "완료" 가 활성. 템플릿을 "IP 범위 거부 목록" 으로 바꾸면 `{{stageNameOrWildcard*}}` 같은 자리표시자가 남아
  validate 만 호출되고 PUT 이 가지 않는다(정책이 그대로). → spec 은 "삭제 → 기본 정책으로 재생성" 으로 두 동작을 덮고 "수정" 화면은 쓰지 않는다.

## 3. 리소스 삭제(deleteresource) — 여전히 불가

- 리소스 화면 `#/apigateway/resource`: 트리 위 버튼 "조회 · API 배포 · 전체 열기 · 전체 닫기 · 리소스 생성 · **삭제(비활성)**", 리소스 상세 아래 메서드 표에도 "삭제"(메서드용).
  트리 노드는 `span.tem-hyperlink-flash` 글자뿐(체크박스·아이콘·우클릭 메뉴 없음). **메서드가 없는 새 리소스 /items 를 골라도, hover 해도, 우클릭해도 트리 "삭제" 는 비활성**(2026-10-16 재확인; 6D 는 메서드·스테이지 삭제 뒤에도 비활성).
  콘솔에서 리소스는 API 해지로만 지워진다.

## 4. PrivateLink Endpoint `#/apigateway/privatelink-endpoint` (미실시)

- 목록 열 PrivateLink Endpoint명 | ID | PrivateLink Service ID | 생성 일시 | 상태, 버튼 "삭제"(행 선택) · "PrivateLink Endpoint 생성".
- 폼 `…/privatelink-endpoint/request`: PrivateLink Endpoint명(영문·숫자 3~20) · 설명(50) · **PrivateLink Service ID**(3~60, "제공자에게 사전에 Service ID 를 확인… Endpoint 생성 이후 Endpoint ID 를 제공자에게 전달") → "생성".
  VPC 선택은 없지만 다른 쪽(네트워킹 PrivateLink Service = VPC·Subnet 필요, 또는 Cloud Functions PrivateLink Service) 의 Service ID 가 필요하다.
  Cloud Functions 쪽 Service 를 쓰면 연결된 Endpoint 때문에 Service 끄기·함수 해지가 막힐 위험(2026-10-07: PrivateLink Service 켜진 함수는 해지가 조용히 무시됨) → 이번엔 하지 않음.
