# Security Group · Internet Gateway · Public IP: 의존관계·필수 항목·제약 (2026-09-22)

VPC → Subnet → Virtual Server 스택(`compute-vm-stack.md`)을 Security Group 부착과 Public IP 연결로 확장하기 위한 근거.
출처 표기는 `compute-vm-stack.md` 와 같다 ("API:" = `kyle-agent/api-test-automation`, "콘솔:" = 실제 콘솔 프로브).

## 1. 순서

생성: Security Group(VPC 무관) → VPC → **Internet Gateway(VPC 당 1개)** → Subnet(PUBLIC/PRIMARY) → **Public IP 예약(RESERVED)** → 서버(SG 선택) → 서버 포트에 Public IP 연결(static NAT, IGW 필수).
삭제(API 로 검증된 순서): **static NAT 해제 → Public IP 상태가 RESERVED/DETACHED 로 돌아올 때까지 대기(≤240s) → Public IP 삭제 → IGW 삭제 → 서버 인터페이스/포트 → 서버 → Subnet → VPC → SG**.
IGW 는 VPC 보다 먼저, SG 는 VPC 뒤에 지운다(서버가 살아 있으면 409).

## 2. Security Group
- API: `POST /v1/security-groups {name, description, loggable:false, tags}`; 필수는 `name` 뿐. 계정/리전 스코프(VPC 불필요). 서버에는 **생성 시 `security_groups:[id]`** 로 붙이는 경로만 검증됨. 규칙(rule)은 부착에 불필요. 삭제는 동기(204), 서버가 붙어 있으면 409 → 서버 소멸 뒤 삭제.
- 한도(문서 기준): 계정당 100개, SG 당 규칙 100개, 계정당 규칙 1,000개.
- 콘솔: 목록 `#/securitygroup/securitygroup/list`, 버튼 "서비스 생성" → 폼 "Security Group명"(255자), "로그 저장 여부"(기본 미사용, 켜면 로그 저장소 선행 필요), "설명" → "생성".
  VM 생성 폼의 Security Group "선택" 은 모달(검색 input, 최대 5개, 목록 새로고침 버튼) → 행 체크 → "확인". SG 가 없으면 "데이터가 없습니다".
- 콘솔 실측(2026-09-22): **"로그 저장 여부 — 사용" 체크박스가 기본 켜짐**이라 그대로 생성하면 "로그 저장소를 먼저 설정해야 합니다" 안내만 뜨고 생성되지 않는다.
  체크박스는 커스텀(`.scp-select`, 켜짐 = `scp-select-checked`; `src/console/ui.ts` `setCheckbox`). 끄고 "생성" 을 누르면 모달 두 개가 이어진다:
  "로그 저장 사용을 선택하지 않았습니다. 진행하시겠습니까?" → "Security Group을 생성하시겠습니까?" → 목록("생성이 성공하였습니다").
  **목록에는 행 선택 아이콘·행 버튼·삭제 버튼이 없다.** 삭제는 이름(`div.link-underline-not-item`) 클릭 → 상세(`#/securitygroup/securitygroup/detail/info?...`, 상태 Active, 탭 상세 정보/규칙/태그/작업 이력)
  → "서비스 해지" → "Security Group을 해지하시겠습니까?" → "확인" → 목록에서 즉시 사라짐. 규칙 한도 표기 "0개/최대 200개".
- VPC CIDR: 콘솔이 **10.251.0.0/20, 10.252.0.0/20 을 "사용할 수 없는 IP 대역입니다" 로 막는다**(관리용). 10.250.0.0/20, 10.250.0.0/16 은 허용. 스택 시나리오는 10.250.0.0/20 을 쓴다.

## 3. Internet Gateway
- API: `POST /v1/internet-gateways {vpc_id, type:"IGW", firewall_enabled, firewall_loggable:false, description, tags}`; **name 없음**, 플랫폼이 `IGW_<vpc명>` 으로 자동 명명. VPC 당 1개(두 번째는 400 already-associated).
  `firewall_enabled:true` 면 파생 방화벽 `FW_IGW_<vpc명>` 이 생기고, 그 규칙이 남으면 IGW 삭제 409 → VPC 삭제 409 연쇄. 상태 ACTIVE 까지 폴링(300s/15s). 삭제는 VPC 보다 먼저.
- 콘솔: 목록 `#/vpc/internet-gateway/list`, 버튼 "Internet Gateway 생성" / 상단 "삭제"(행 선택 후) / **행 끝 "삭제"**. 폼: "VPC명" 드롭다운(Default 라우팅이 없는 VPC 만),
  "구분" 드롭다운(Internet Gateway / Secured Internet Gateway; **VPC 선택 뒤 비동기로 채워짐** → `pickOption` 이 비어 있으면 재시도), "Internet Gateway명"(자동 `IGW_<vpc명>`, 입력 불가), "설명",
  "Firewall 사용"·"Firewall 로그 저장 여부" 커스텀 체크박스 **둘 다 기본 켜짐**.
  목록 열: Internet Gateway명 | VPC명 | 구분 | Multi-AZ 사용 여부 | 생성 일시 | 상태.
- 콘솔 실측(2026-09-22): 로그 저장을 켠 채 "생성" 을 누르면 모달 없이 토스트 "Internet Gateway 생성이 실패하였습니다. 로그 저장을 사용하는 경우 로그 저장소를 먼저 설정해야 합니다".
  둘 다 끄고 누르면 **경고 모달("Firewall 및 Firewall 로그 저장 여부 설정을 선택하지 않았습니다 … 진행하시겠습니까?")에 동의 체크박스가 있어 체크해야 "확인" 이 통한다**
  (`confirmModal(page, /선택하지 않았습니다/, '확인', { agree: true })`) → "Internet Gateway를 생성하시겠습니까? 규모에 따라 수십 분 걸릴 수 있습니다." → 확인 → 목록.
  상태 Creating → Active ≈40초. 삭제는 행 끝 "삭제" 버튼(상단 "삭제" 는 행 선택 직후 활성화가 불안정했다).

## 4. Public IP
- API: `POST /v1/publicips {zone:"kr-west1-b", type:"IGW", description, tags}`; zone 필수(1.3~), 유효 zone 은 kr-west1-b 뿐. 생성 직후 RESERVED. 서버 연결은 `POST /v1/servers/{id}/interfaces/{port_id}/static-nats {publicip_id}` (서버에 붙은 포트, 같은 VPC 에 IGW 필수). 해제 = static NAT 삭제(202 비동기) → 상태가 돌아온 뒤에야 삭제 가능(ATTACHED 상태 삭제는 400, "구조적" 지연 → 재시도 규약).
- 콘솔: 목록 `#/vpc/public-ip/list`, 버튼 "Public IP 예약" / 상단 "반납"(행 선택 후). 예약 폼: "구분"(Internet Gateway / Secured Internet Gateway), "Availability Zone"(kr-west1-b), "설명", "요금 확인" → "생성".
  목록 열: IP 주소 | 구분 | 연결 리소스 타입 | 연결 리소스명 | Availability Zone | 생성 일시 | 상태.
- 콘솔 실측(2026-09-22): "생성" → 모달 "Public IP를 예약하시겠습니까?" → 확인 → 목록. 행 예: `123.41.35.18 Internet Gateway - - kr-west1-b … Reserved 반납`(행 끝 "반납").
  상세(`#/vpc/public-ip/detail/info?publicIpId=…`)에는 **"Public IP 반납" 만 있고 연결 버튼이 없다** → 서버 연결은 서버 쪽 화면에서 한다.
  반납 모달 "Public IP를 반납하시겠습니까? 반납 시 복구가 불가능합니다." → 확인 → 5초 안에 목록에서 사라짐.
- VM 생성 폼의 네트워크 "IP" 드롭다운은 "자동 생성"/"입력" 뿐이라 생성 시 Public IP 를 붙이는 옵션은 없다(생성 후 연결).

## 4.1 서버 상세의 네트워크 섹션 (2026-09-22 덤프)
`#/virtualserver/virtualserver/detail/info?virtualServerId=…` 의 "상세 정보" 탭 하단 "네트워크" 박스: VPC명(링크) | 일반 Subnet명(링크) | IP ✎ (사설 IP "(Default)") | **Public NAT IP ✎** | Private NAT IP ✎ | Security Group명 ✎ | Virtual IP.
아래 버튼 "신규 네트워크 포트로 추가" / "기존 네트워크 포트로 추가". 즉 **Public IP 연결은 "Public NAT IP" 옆 편집 아이콘**으로 한다(static NAT). Security Group 은 생성 시 선택한 이름이 그대로 표시된다.
상단 버튼: 시작 / 중지 / 재시작 / Image 생성 / 콘솔 로그 / Dump 생성 / ⋮ / 서비스 해지. 탭: 상세 정보 / 모니터링 / 태그 / 작업 이력.

## 5. 알려진 문제
- static NAT 상세 조회 403 "Action definition is not found" (PF-15, 제품 결함). 콘솔에서 NAT 상세가 안 보일 수 있음.
- Public IP 삭제는 해제 직후 400(ATTACHED) 가 구조적으로 난다 → 상태 폴링 후 반납.
- 테스트가 중간에 죽으면 `IGW_<vpc>`/`FW_IGW_<vpc>` 가 남아 VPC 해지가 막힌다 → 정리에서 IGW 를 먼저 지운다.
