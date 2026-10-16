# IAM 사용자·그룹·역할·정책: 콘솔 사실 (2026-10-16, agent C 프로브)

API 검증·UI 미대응 동작(iam/createiamuser·updateiamuser·updateiamuserpassword·deleteiamuser·deletebulkiamuser·addgroupmember·removegroupmember·
adduserpolicybinding·removeuserpolicybinding·removerolepolicybinding·deleterole·deletepolicy·addpermission·setpermission·removepermission·setresourcepolicy·deleteresourcepolicy)에
화면 시나리오를 붙일 수 있는지 실제 콘솔(Global)에서 확인한 결과. 출처 표기: "콘솔:" = 프로브(test-results/encode-test/agentc-iamuser-*.ts, 커밋 안 함), "API:" = data/api-coverage.json 경로.

## 1. 사용자 (`#/iam/user/list`)

- 목록: 버튼 "삭제"(행 선택 후) · "사용자 생성", 검색 "사용자 ID를 입력하세요.", 열 사용자 ID | 사용자 그룹 | 인증키 | 마지막 로그인 | 생성 일시. 계정에 사용자 0명(10-16 아침 기준).
- 생성 폼 `#/iam/user/create`: "사용자 ID"(영문·숫자·+.@-_ 64자) — **이것만 채우면 "생성" 활성**. "설명"(textarea), "비밀번호" 라디오 자동 생성(기본, "생성 완료 시점에 확인 가능")/직접 입력(9~20자 대·소·숫자·특수),
  "사용자 최초 로그인 시 비밀번호 변경"(기본 켜짐), "권한 설정 방식" 라디오 사용자 그룹에 추가(기본, 그룹 표 선택 — 선택 안 해도 됨)/권한 복사(사용자 선택 표)/정책 직접 연결(정책 표 33개, 검색·상세 검색), 태그.
  "생성" → "알림" 확인 모달(취소/확인) → `POST /console/api/iam/v1/accounts/{id}/users`(API createiamuser 경로와 같음) → **완료·비밀번호 모달 없이 폼에 그대로 머문다**(폼 값은 유지; 목록으로 직접 이동해야 행이 보인다. 자동 생성 비밀번호는 어디에도 표시되지 않았다).
- 상세 `#/iam/user/detail/<id>/basic`: 버튼 "사용자 삭제". 기본 정보 라벨 서비스·자원 유형(User)·SRN(`srn:e::<account>:::iam:user/<id>`)·자원명·자원 ID·생성자·생성/수정 일시·사용자 ID·마지막 로그인·
  **[연필] 설명**(모달 "설명 수정", textarea, 취소/확인) · **[연필] 비밀번호**(모달 "비밀번호 재설정": 자동 생성/직접 입력 라디오 + 최초 로그인 시 변경 체크, 확인) · **[연필] 비밀번호 재사용 제한**(드롭다운 "최근 사용 1개 사용 불가") · 이메일/휴대전화 번호(미인증).
  탭 "사용자 그룹 (n)"(버튼 제외 · 사용자 그룹 추가 → `#/iam/user/<id>/groups/update`: 그룹 표 선택 → 완료) · "권한 (n)"(버튼 연결 해제 · 상세 검색 · 권한 추가 → `#/iam/user/<id>/policy/update`: 정책 표(검색 "정책명을 입력하세요.") 선택 → 완료; 열 정책명·유형·설명·연결 방식·수정 일시)
  · "인증키 (n)"(열 Access key·Secret Vault·생성/만료 일시·상태, 버튼 없음) · "태그 (n)"(태그 수정).
- **삭제는 막힌다(자동화 관점)**: 목록 "삭제" 와 상세 "사용자 삭제" 모두 모달 **"비밀번호 확인 — 사용자를 삭제하려면 비밀번호 확인이 필요합니다. 5회 연속 불일치 시 자동 로그아웃됩니다."**(input[type=password], 취소/확인).
  로그인 계정의 비밀번호를 쳐야 하므로(자격 증명은 코드·LLM 에 두지 않는 원칙) spec 이 사용자를 지울 수 없다 → **spec 은 사용자를 만들지 않는다.**
  확인 없이 "확인" 을 눌러도 요청이 나가지 않는다(60초 기다려도 행 그대로). 프로브가 만든 `usr-cprobe-1016-1442` 는 **사람이 비밀번호를 쳐서 지워야 한다**(또는 지정 테스트 사용자로 계속 쓴다).
- 결정(2026-10-16): 사용자 관련 동작은 **사람이 지정한 테스트 사용자(환경 변수 `IAM_TEST_USER`=사용자 ID)** 를 대상으로 삭제 외 동작만 한다(scenarios/iam/user.yaml, tests/regression/iam.user.spec.ts). 없으면 skip.
  대상 동작: 설명 연필(updateiamuser, `PUT …/accounts/{id}/users/{id}` 예상) · 그룹 상세 "사용자 추가"/"제외"(addgroupmember/removegroupmember) · 사용자 상세 "권한 추가"/"연결 해제"(adduserpolicybinding/removeuserpolicybinding).
  하지 않는 것: 비밀번호 재설정(updateiamuserpassword — 자격 증명 변경, 생성된 비밀번호가 화면에 뜰 수 있음) · 인증키 생성(accesskeycreate, 비밀 값 표시) · 삭제 2종(비밀번호 확인).
  실제 요청 경로(iam.user 1차 실행 10-16 15:00 로그): 설명 연필 → **`PUT /v1/accounts/{id}/users/{id}`**(= updateiamuser), 그룹 "사용자 추가" → **`POST /v1/groups/{id}/members/bulk`**,
  "제외" → **`DELETE /v1/groups/{id}/members/bulk`**(카탈로그 addgroupmember `…/members` · removegroupmember `…/members/{user_id}` 의 bulk 변형 — 콘솔 전용 표에 "?" 로 보일 것).
- **"권한 추가" 화면(`#/iam/user/<id>/policy/update`)은 생성 폼과 같은 라디오 "사용자 그룹에 추가"(기본) · "권한 복사" · "정책 직접 연결" 로 시작한다** — 정책 표(검색 "정책명을 입력하세요.")는 "정책 직접 연결" 을 눌러야 나온다
  (1차 실행은 기본 상태의 그룹 표에서 정책명 검색칸을 찾다 실패). 라디오는 `.scp-select` 커스텀, 라벨 글자 클릭으로 바뀐다.

## 2. 사용자 그룹 (`#/iam/group/list`)

- 생성: "사용자 그룹 생성" → "사용자 그룹명"·"설명" → 생성 → `POST /v1/groups`. 목록 "삭제" → **`DELETE /v1/groups/bulk`**(1건 선택도 bulk; 비밀번호 확인 없음).
- 상세 `#/iam/group/detail/<id>/basic`: 버튼 "사용자 그룹 삭제". 탭 "사용자 (n)"(버튼 제외 · 사용자 추가 → `#/iam/group/<id>/users/update`: 사용자 표(검색 "정확한 사용자 ID를 입력하세요.", 열 사용자 ID·사용자 그룹·생성 일시) 선택 → 완료(선택 전 비활성)) · "정책 (n)" · "태그 (n)".

## 3. 역할 · 정책 상세의 단건 삭제 버튼

- 역할 상세 `#/iam/role/<id>/info`: 상단 **"역할 삭제"** 버튼(목록 "삭제" 는 `DELETE /v1/roles/bulk`). 기존 OrganizationAccountAccessRole·SCPServiceRoleFor* 는 건드리지 않는다(상세에 "타 서비스에서 설정된 역할" 경고).
- 정책 상세 `#/iam/policy/detail/<id>/basic`: 상단 **"정책 삭제"** 버튼(목록 "삭제" 는 `DELETE /v1/policies/bulk`). 기본 정책도 버튼이 보인다(누르지 않음).
- 역할 정책 탭 "연결 해제" 는 `DELETE /v1/roles/{id}/policy-bindings`(bulk, 6C 실측) → 단건 removerolepolicybinding(`…/policy-bindings/{policy_id}`) 을 부르는 화면은 없다.

## 4. 리소스 기반 정책 (API `/v1/resource-policies/{srn}`, addpermission·setpermission·removepermission·setresourcepolicy·deleteresourcepolicy)

- IAM 메뉴(사용자·사용자 그룹·역할·정책·자격 증명 공급자)에 리소스 정책 화면 없음. 콘솔의 "리소스 정책" 메뉴는 API Gateway(`apigateway/resourcePolicy`)와 Cloud Functions 구성 탭인데 각각 그 서비스의 API 를 부른다(6D 대응표 참조).
  6C(10-07)가 본 KMS 키 상세(API 테스트가 쓴 SRN 종류)에도 탭이 없음. → 2026-10-16 재확인: 콘솔 화면 없음.

## 5. ServiceWatch · Virtual Server (같은 날 확인, 참고)

- ServiceWatch 왼쪽 메뉴: Service Home · 대시보드(목록·즐겨찾기) · 경보(이력·정책) · 지표(`#/service-watch/metric`: 지표비교·날짜비교 조회 전용) · 로그(로그 그룹 `#/service-watch/log/group`, 로그 그룹 내보내기 `…/log/group/export`: 버킷으로 내보내기 목록) · 이벤트 규칙.
  사용자 정의 로그 스트림/로그 이벤트/지표 메타(createcustomlogstream·createcustomlogevents·createcustommetricmetas)를 넣는 화면 없음(OpenAPI 전용).
- Virtual Server "Image 생성"(`#/virtualserver/image/request`): "Image명", **"URL"(Object Storage 에 올린 qcow2 파일 URL 필수)**, OS 타입, 최소 디스크/RAM, Visibility(Private/Shared), Protected, 태그 → createimage 는 파일 업로드 전제라 spec 으로 하지 않는다.
- Resource Groups 왼쪽 메뉴는 "Resource Groups"(Resource Group 목록) 하나뿐 → 여러 자원 일괄 태그(`/v1/tags/bulk`, `/v1/tags`) 화면 없음.
