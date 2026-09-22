# VPC → Subnet → Virtual Server 스택: 의존관계·필수 항목·제약 (2026-09-21)

콘솔 UI 회귀 시나리오 `scenarios/compute/vm-stack.yaml` / `tests/regression/compute.vm-stack.spec.ts` 의 근거.
출처는 두 가지다.

- **API**: `kyle-agent/api-test-automation` (API 기준 회귀 플랫폼). `knowledge/resource-dependencies.md`, `knowledge/service-dependencies.md`,
  `knowledge/validated-facts.md`, `knowledge/domain-constraints.md`, `regression/scenarios/dependencies.json`,
  `regression/scenarios/lifecycles/generated__heavy-vs.json`, `compute__virtualserver-actions.json`. 아래 "API:" 표시.
- **콘솔**: 2026-09-21 실제 콘솔(kr-west1, root 계정) 프로브. 아래 "콘솔:" 표시.

다른 서비스를 추가할 때도 같은 순서로 한다: API 저장소의 `dependencies.json` 과 lifecycle 의 `_note` 로 의존관계·제약을 뽑고,
콘솔 화면을 프로브해 라벨·버튼·모달 문구를 확인한 뒤 spec 을 쓴다.

## 1. 생성 순서와 대기

| 순서 | 리소스 | 근거 |
| --- | --- | --- |
| 1 | Keypair (무과금, 이름으로 참조) | API: `dependencies.json` prerequisites `compute-virtualserver-full` = vpc, subnet, security-group, keypair, image, server-type |
| 2 | VPC (PUBLIC) → ACTIVE | API: `heavy-vs.json` `wait-vpc` 180s/10s. 콘솔: 생성 직후 Active |
| 3 | Subnet (PUBLIC, PRIMARY, VPC CIDR 의 하위 /24) → ACTIVE | API: `wait-subnet` 180s/10s, 실측 ≈2분(128~238s). 같은 VPC 의 서브넷은 백엔드가 직렬화 |
| 4 | Virtual Server → ACTIVE | API: `wait-server` 600s/15s. 전체 라이프사이클 ≈17분 |

Security Group 은 API 로는 필수(계정/리전 스코프, VPC 불필요)지만 **콘솔에서는 선택 사항**("설정하지 않으면 기본적으로 모든 접속을 차단")이라 스택 시나리오에서는 넣지 않는다.
Public IP 는 VM 생성에 불필요(IGW → public IP → static NAT 는 별도 체인).

## 2. 역순 삭제

`delete-server` → 서버 소멸(404) 확인(≤600s) → `delete-subnet` → 서브넷 소멸 확인(30초~3분, ≤240s) → `delete-vpc` → keypair (API: `virtualserver-actions.json` teardown, `service-dependencies.md` "Wait for subnet 404 before deleting vpc").

- Subnet 삭제는 비동기. 소멸 전에 VPC 를 지우면 409 `scp-network.vpc.related-resource` (본문 `related_resources` 가 홀더를 알려줌).
- 기본 서브넷 목록 API 는 `VPC_ENDPOINT` 타입을 숨긴다(콘솔엔 보임). VPC 삭제가 막히면 이 타입을 의심.
- VM 에 Lock 을 걸면 해지 불가. 콘솔 폼의 Lock "사용" 은 건드리지 않는다.
- boot 볼륨 `delete_on_termination` 캐스케이드가 안 끝날 수 있음 → 서버 소멸 후 Block Storage 목록에 잔여 볼륨이 있는지 확인할 것.

## 3. 필수 항목과 검증된 값

### VPC
- API: `{name, cidr, zone_type: "PUBLIC"}`. `zone_type` 필수(1.4~), PUBLIC 에 `zones` 를 같이 주면 400. 서버가 `kr-west1-b` 자동 배정. 관례 CIDR `/20`, 계정 내 VPC 끼리 겹치면 안 됨.
- 콘솔: 라벨 "VPC명"(3~20자, 영문·숫자·-), "IP 대역"(/16~/28), Availability Zone 은 "Public Zone" 고정. 버튼 "서비스 생성" → 폼 "생성" → 모달 "VPC를 생성하시겠습니까?" → "확인". 목록 행 끝 "서비스 해지" → "VPC를 해지하시겠습니까?" → "확인".

### Subnet
- API: `{name, cidr, type: PUBLIC|PRIVATE|LOCAL|VPC_ENDPOINT, category: PRIMARY|SECONDARY, vpc_id}`. `category` 필수. SECONDARY 는 `primary_subnet_id` 필수. VPC 당 PRIMARY 3개.
- 콘솔: 목록 버튼 "Subnet 생성"/"삭제"(행 선택 후). 폼: "VPC명"(드롭다운, 항목 "vpc명 / AZ: kr-west1-b"), "Subnet 유형"(Public/Private/Local/VPC Endpoint), "Subnet 구분"(유형 선택 후 활성), "Subnet명"(3~20자), "IP 대역"(/16~/28, VPC 내 미사용), "Gateway IP"(필수, 기본값은 대역의 첫 IP), "IP 할당 범위"(기본 "IP 대역 전체").

### Virtual Server
- API: `{name, image_id, server_type_id, keypair_name, zone: "kr-west1-b", networks:[{subnet_id}], security_groups, volumes:[{boot_index:0, size, type, delete_on_termination}]}`.
  `zone` 필수(계정 유일 AZ kr-west1-b, 문서 예시 kr-west1-a 는 400). 볼륨 size 8의 배수. 이미지는 ubuntu 표준(빠른 부팅, Windows 라이선스 회피). 최소 타입 `s1v1m2`. 응답은 `$.servers[0].id`.
- 콘솔: 목록 버튼 "서비스 생성"/"서비스 해지". 폼 순서: 이미지 탭(표준: Alma/Oracle/RHEL/Rocky/Ubuntu/Windows) → "Image 버전"(Ubuntu 24.04 / 2025-01-09 기본) → "서버 수"(1) →
  "서버 타입" 드롭다운 2단(1단 "Standard-1 / AZ: kr-west1-b", 2단 "s1v1m2 (vCPU 1 | Memory 2G)") → Block Storage "기본 OS" 유형(SSD/SSD_KMS/SSD_Provisioned, 기본 SSD_Provisioned 는 Max IOPS/Throughput 필수 → SSD 로) →
  "서버명"(63자) → 네트워크 "VPC명" 드롭다운, "일반 Subnet명" 드롭다운, IP "자동 생성" → Security Group "선택"(선택 사항) → "Keypair명" 드롭다운(계정에 keypair 가 없으면 항목 0개, "신규 생성" 있음) → "요금 확인" / "생성".

- 콘솔 실측(2026-09-21 run 0921-1946-604e): 생성 요청 후 목록 상태 "Block Device Mapping" → "Build"(사설 IP 배정) → **"Active"**(≈1분). 완료 상태는 Running 이 아니라 Active.
  **Virtual Server 목록 행에는 버튼이 없다.** 해지는 행 선택(`i.table-select`) → 상단 "서비스 해지" → 모달 "Virtual Server 1대를 해지하시겠습니까? … LB 서버 그룹 연결됨 / Lock 설정됨 서버는 해지 불가 …
  연결된 스토리지의 해지는 Delete on termination 설정에 따름" → "확인". 소멸까지 ≈40초.
- Subnet 삭제 모달: "Subnet을 삭제하시겠습니까? 규모에 따라 수십 분 걸릴 수 있습니다." 서버를 담았던 서브넷은 Deleting 상태가 **5분을 넘겼다(≈6분)**. 서버가 아직 있으면 삭제가 접수되지 않는다(상태 Active 그대로).

### Keypair
- API: `POST /v1/keypairs {name}`; 소비자는 `keypair_name` 문자열로 참조. private_key 는 생성 응답에서만.
- 콘솔: 목록 `#/virtualserver/keypair/list`, "Keypair 생성" → "Keypair명"(255자), 유형 SSH 고정 → "생성" → "Keypair를 생성하시겠습니까?" → "확인" → `<이름>.pem` 다운로드 → 목록. 삭제는 행 선택(`i.table-select`) → 상단 "삭제" → "Keypair 1개를 삭제하시겠습니까?" → "확인".

### 주의: Keypair 다운로드와 로그인 브라우저 (2026-09-21 두 차례 실측)
Keypair 생성은 `.pem` 다운로드를 동반하고, Edge 는 그때 `edge://downloads-hub/` 내부 페이지를 연다. CDP 로 붙어 있는 로그인 브라우저가
CDP 로 붙어 있는 로그인 브라우저(Edge 153)가 네 번 중 세 번 다운로드 시작 직후 프로세스째 종료됐다(trace 유무와 무관, `page.on('download')`/`waitForEvent('download')`
를 걸었던 경우에 죽었고, 아무 리스너 없이 만든 한 번은 살아남았다. 새 프로필의 data: URL 다운로드는 죽지 않는다). 정확한 원인은 Edge 내부라 확정하지 못했다.
대응 두 가지:
- 스택 시나리오는 고정 이름의 공유 Keypair `qa-shared-keypair`(2026-09-21 생성, 무과금, 남겨 둠)를 재사용한다. 없을 때만 만들며 그때는 trace 를 끄고 다운로드 파일을 건드리지 않는다.
- **크래시는 로그아웃이 아니다.** 영구 프로필의 쿠키가 살아 있어 브라우저만 다시 띄우면 콘솔 세션이 돌아온다(재로그인 불필요, 실측). `connectLiveBrowser` 가 연결 실패 시
  `scripts/auth-login.ts --keep-open` 을 분리 프로세스로 띄워 자동 복구한다(`PW_AUTO_RELAUNCH=0` 이면 끔). 세션이 정말 만료됐을 때만 사람이 로그인한다.

## 4. 한도와 알려진 문제
- 계정당 VPC 5개(`scp-network.vpc.exceed-max-count`), VPC 당 PRIMARY 서브넷 3개, VPC 당 IGW 1개.
- vpc/subnet/server 생성 자체에는 known_issues 없음. `POST /v1/volume-transfer` 500, 백업 대상 목록(VM_IMAGE) 500 은 기지 버그.
- 이름 정규식·길이는 API 저장소에 기록이 없고 콘솔 폼 힌트로 확인했다(위 각 항목).
