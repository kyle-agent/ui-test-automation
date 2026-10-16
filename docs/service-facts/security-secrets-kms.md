# Secrets Manager · KMS: API 검증 쓰기 동작 중 콘솔 화면 유무 (2026-10-16, 에이전트 B)

`data/ui-operations.yaml` 의 secretsmanager · kms 절 "불가" 주석의 근거. 2026-10-07(6C) 판단을 실제 콘솔에서 다시 확인했다.
프로브 스크립트(읽기 전용 + 시크릿·키 1개 생성 후 정리): `test-results/encode-test/agentB-secrets-probe*.ts`, `agentB-kms-probe.ts`(gitignore), 로그 `reports/agentB-probe-*-20261016.log`.

## 1. Secrets Manager (`#/secretsmanager/secretsmanager/list`)

- 생성 폼 `#/secretsmanager/secretsmanager/request`: Secret명 · **유형 드롭다운 항목은 "일반 유형의 Secret" 하나** · Key/Value(최대 1쌍, "추가" 버튼) · 암호화 키 · 퍼블릭 접근 제어(허용 IP 필수, 최대 10)
  · 프라이빗 접근 제어(기본 **켜짐**, "프라이빗 접근 허용 리소스" 표 + "추가") · 설명(100자) · 태그. 폼 버튼: 요금 확인 · 취소 · 생성.
  **임의 비밀번호 생성 버튼·링크 없음** → `generaterandompassword`(POST /v1/secrets/random-password) 는 콘솔 화면 없음.
- "프라이빗 접근 허용 리소스 추가" 모달(폼·상세 공통): 머리 "서비스 **Virtual Server** (0개 선택)" — 서비스 선택 드롭다운이 아니라 고정 문구, 검색란 "정확한 리소스명을 입력하세요.",
  표 서비스 | 리소스명, 리소스가 없으면 "데이터가 없습니다". 즉 **허용 리소스는 Virtual Server 만**이고 정확한 서버 이름으로 검색해야 행이 나온다.
  → `setprivateacl`(PUT /v1/secrets/{id}/private-acl) 을 "사용" 으로 저장하려면 실제 VM(VPC·Subnet 포함 스택, ≈12분·VPC 1)이 필요. 리소스 0 이면 "확인" 이 닫히지 않음(10-07 실측 그대로).
- 상세 `#/secretsmanager/secretsmanager/detail/info?secretsmanagerId=…`: 상단 버튼 "서비스 해지" · **"보기"**(Secret값). 연필: 암호화 키 · 퍼블릭 접근 제어 · 프라이빗 접근 제어 · 설명.
  탭(div.tabs-header): 상세 정보 / 버전 (n) / 태그 (n) / 작업 이력. To be terminated 상태에서는 "보기" 가 비활성, 상단에 "해지 취소".
- **"보기" → "비밀번호 확인" 모달**("Secret 값을 확인하려면 비밀번호 확인이 필요합니다. 5회 연속 불일치 시 자동 로그아웃됩니다.", input[type=password], 취소/확인).
  값 확인·수정은 이 뒤에만 가능 → `updatesecretsmanagersecretvalue`(PUT …/values) 는 자격 증명 입력 금지 원칙상 자동화 불가(계정 비밀번호를 코드·LLM 에 넘기지 않는다).
- 버전 탭 `…/detail/version`: 표 버전 ID | 레이블 | 마지막 접근 일시 | 생성 일시, 행 예 `<id> CURRENT <일시> <일시>`. 행 버튼 없음, 행 아이콘은 ID 복사(`i-clipboard`)와 레이블 칩(`chip-icon`, 눌러도 모달 없음).
  상단 버튼은 "서비스 해지" 뿐. 라벨 "레이블을 사용하여 Secret 버전을 추적할 수 있습니다." 옆 아이콘은 안내용. → `setsecretsmanagerlabel`(PUT …/label) 콘솔 화면 없음(10-07 판단 유지).
- 해지 예약은 spec 과 같다(행 선택 → "서비스 해지" → 해지 대기 기간 7 → 확인 → To be terminated). 프로브가 만든 `sec-1016-1437-68b5` 도 7일 예약으로 남겨 두었다(목록에 To be terminated).

## 2. KMS (`#/kms/kms/list`)

- 상세 `#/kms/kms/detail/info?kmsId=…` 상단 버튼: **키 회전 · 키 비활성화 · 서비스 해지** (더보기 메뉴 없음). 탭: 상세 정보 / 태그 (n) / 작업 이력.
  연필: 키명 · 공공 인증 알고리즘 · 용도 · 현재 버전 · 자동 회전 · 다음 회전일 · 퍼블릭 접근 제어 · 프라이빗 접근 제어 · 설명.
- 화면 어디에도 암호화·복호화·서명·검증·데이터 키·HMAC·재암호화 문구가 없다(태그·작업 이력 탭 포함). 좌측 메뉴도 "고객 관리형 키" 하나.
  → `encryptdata` · `decryptdata` · `datakey` · `hmac` · `signdata` · `verifydata` · `rewrapdata`(모두 POST /v1/kms/openapi/…/{key_id}) 는 **콘솔 화면 없음** — OpenAPI 전용(10-07 판단 유지).
- 참고(이번 범위 밖): 퍼블릭/프라이빗 접근 제어 연필은 카탈로그의 미검증 동작 `kmssetaclcidr` · `kmssetprivateacl`(PUT /v1/kms/transit/{id}/acl-cidr · /private-acl) 에 대응할 것으로 보인다.
  프라이빗 접근 제어 허용 리소스는 Secrets Manager 와 같은 구조(Virtual Server)일 가능성이 높다(미확인).
