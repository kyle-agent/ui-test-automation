# API 자동화 대비 화면(UI) 자동화 대응표

목표(사용자 결정 2026-09-29): `kyle-agent/api-test-automation` 에서 API 로 생성·삭제가 검증된 리소스는 모두 콘솔 화면으로도 자동화한다.
라이선스·물리자원이 없어 API 쪽에서도 기능 테스트를 하지 않는 서비스는 여기서도 제외한다(그 저장소의 `data/baselines/untestable_services.json`).

기준: API lifecycle(`regression/scenarios/lifecycles/*.json` + `scenarios.json`)에서 **필수 단계(optional 아님)로 POST 생성 + cleanup** 이 있는 리소스.
선택 단계(4xx 도 허용하는 추측성 호출)는 제외했다. 상태: ✅ UI spec 통과 · 🔧 진행 중 · ⏭ 건너뜀(이유) · — 선행 리소스(다른 spec 에서 다룸).

## 제외 (라이선스·자원 없음, API 도 접근성만)

SQL Server · Vertica · Search Engine · Bare Metal · Multi-node GPU Cluster · Archive Storage · Baremetal Block Storage · Parallel File Storage ·
IAM Identity Center · Cloud Control · Cloud Monitoring(deprecate 예정)

## 대응표

| 분류 | API 리소스 | UI spec | 상태 |
| --- | --- | --- | --- |
| Compute | virtualserver servers · keypairs · volumes · volume attach | compute.vm-stack · compute.vm-volume | ✅ |
| Compute | virtualserver security-groups · publicips · ports | compute.vm-stack-net · networking.vpc-port | ✅ |
| Compute | server-groups | compute.server-group (태그 추가·삭제 + 작업 이력 확인 L3, 2026-10-06 3C — 상세에 수정 항목 없음) | ✅ |
| Compute | launch-configurations · auto-scaling-groups | compute.launch-configuration · compute.auto-scaling-group | ✅ |
| Compute | auto-scaling-groups policies · schedules · notifications | compute.auto-scaling-group steps[3] (정책·스케줄 L3). 알림은 ⏭ 수신자가 로그인 이력 있는 사용자만 가능 + 실제 메일 | ✅ |
| Compute | snapshots (볼륨 스냅샷) | compute.volume-snapshot (스냅샷 복구 L3) | ✅ |
| Compute | servers interfaces · static-nats | compute.vm-stack steps[7] (같은 Subnet 신규 네트워크 포트 추가·삭제, 2026-09-30). static NAT 는 compute.vm-stack-net 의 Public NAT IP 연결 | ✅ |
| Compute | images (서버 커스텀 Image · updateimage) | compute.vm-stack steps[6] (Image 생성 → Visibility Shared → 삭제, 2026-09-30). 멤버 추가(createimagemember)는 공유 대상 Account 가 없어 ⏭, 공유용 Image(createsharingimage)는 Snapshot-Based 이미지만 가능해 ⏭ | ✅ |
| Compute | servers dump | compute.vm-stack steps[8] (Dump 생성, 파일은 서버 안 — 다운로드 없음) | ✅ |
| Compute | volume-transfer | compute.volume-snapshot (이전 신청 → Awaiting Transfer → 취소, 2026-09-30). 받기(accept)는 다른 Account 필요 ⏭ | ✅ |
| Compute | scf cloud-functions | compute.cloud-function | ✅ |
| Compute | scf triggers cronjob · apigateway | compute.cloud-function (Cronjob 트리거 + 실행 로그 L3) · application-service.api-gateway steps[8] (API Gateway 트리거: API·스테이지 선택 → 메서드 7종 트리거 확인·삭제, 2026-09-30) | ✅ |
| Container | ske clusters | container.ske-cluster | ✅ |
| Container | ske nodepools | container.ske-cluster steps[3] (노드 1대 추가·Running·삭제, L3) | ✅ |
| Container | scr container-registries · repositories | container.container-registry (엔드포인트 프라이빗↔프라이빗&퍼블릭·태그 L3) · container.repository (태그 삭제 정책·이미지 잠금·설명·태그 L3), 2026-10-06 3C. 계정 쿼터: 프라이빗 레지스트리 1개 → 두 spec 동시 실행 불가 | ✅ |
| Database | postgresql · mysql · mariadb · epas · cachestore clusters | database.* 5종 | ✅ |
| Database | postgresql · mysql · mariadb · epas replicas (읽기 복제본) | database.postgresql·mysql·mariadb·epas steps[3]·[4] (백업 켠 Master → 상세 더보기 Replica 구성 → Running → 해지). 10-01 4종 모두 PASS(공유 VPC 병렬 35분) | ✅ |
| Data Analytics | eventstreams clusters (+ 중지·시작) | data-analytics.event-streams (공유 VPC; 2026-10-06 L3: 상세 중지→Stopped→시작→Running, 단독 PASS 26분) | ✅ |
| Networking | vpcs · subnets | networking.vpc.create-delete · 모든 VPC 체인 | ✅ |
| Networking | internet-gateways · publicips | compute.vm-stack-net · networking.nat-gateway | ✅ |
| Networking | nat-gateways · vpc-peerings · private-dns · hosted-zones · hosted-zone records | networking.nat-gateway · vpc-peering · private-dns · dns-hosted-zone (A 레코드 추가·삭제 L3, 2026-09-30) | ✅ |
| Networking | security-groups · security-group-rules · address-groups | compute.vm-stack-net · security.security-group-rule · security.address-group | ✅ |
| Networking | loadbalancers · lb-server-groups · members · lb-listeners · static-nats (+ 수정) | networking.load-balancer (2026-09-30 PASS; 2026-10-06 L3: 헬스 체크 탐지 횟수 · 서버 그룹 부하 분산 · Listener 세션 유지 시간 · 설명 수정→반영→되돌림, PASS 23분). 멤버는 실제 VM 필요로 미포함 | ✅ |
| Networking | firewalls rules | networking.firewall (규칙 추가·삭제 L3) | ✅ |
| Networking | transit-gateways · vpc-connections | networking.transit-gateway (VPC 연결 추가·해제 L3) | ✅ |
| Networking | vpn gateways · tunnels (+ 수정) | networking.vpn (게이트웨이 + 터널, 2026-10-06 L3: Gateway 설명 · Tunnel DPD·Peer IP·IKE SA LifeTime·설명 수정→반영→되돌림, PASS 10.5분) | ✅ |
| Networking | vpc endpoints (+ 설명 수정) | networking.vpc-endpoint (2026-10-06 L3: 설명 수정→반영→되돌림, 콘솔 수정 항목은 설명뿐. PASS 4분) | ✅ |
| Networking | direct-connects | networking.direct-connect (규칙 추가·삭제 L3, 시간 과금이라 즉시 해지) | ✅ |
| Networking | cdn services | networking.cdn (원본 example.com, 배포 대기 → 중지 → 해지 ≈25분, 2026-09-30; Cache 만료시간 수정 → 설정 버전 2 재배포 L3 steps[2], 2026-10-06 3C, ≈30분) | ✅ |
| Networking | gslbs | networking.gslb (연결 대상 192.0.2.10, 2026-09-30; 연결 대상 Weight 1→5·설명 수정 L3 steps[3], 2026-10-06 3C) | ✅ |
| Networking | subnet vips · vip connected-ports · vip static-nat-ips (createsubnetvip·port·natip 2xx) | networking.vpc-port steps[4~10] (IGW·Public IP → VIP 예약 → Port 연결 → Public NAT IP 연결·해제 → 역순, 2026-09-30 PASS 15.5분) | ✅ |
| Networking | transit-gateway routing-rules (createtransitgatewayrule 2xx) | networking.transit-gateway steps[4~5] (VPC→TGW 목적지 규칙 추가·삭제, 2026-09-30 PASS 11.7분. 규칙이 남으면 VPC 연결 해제가 조용히 무시됨) | ✅ |
| Networking | vpc-peering routing-rules (createvpcpeeringrule 2xx) | networking.vpc-peering steps[3~4] (요청→승인 VPC 규칙 추가·삭제, L3). 10-01 PASS 13.6분 | ✅ |
| Networking | loadbalancer public-nat-ip (createloadbalancerpublicnatip 2xx) | networking.load-balancer steps[6~8] (IGW·Public IP → LB Public NAT IP 설정·해제, 공유 네트워크면 건너뜀, 2026-09-30 PASS 22분) | ✅ |
| Networking | privatelink-services (+ endpoints: API 는 404) | networking.privatelink-service (IP 연결 Service → 같은 계정 Endpoint 요청 → 승인 L3 → 설명 수정 · 연결 차단→Disconnected→재연결 L3(2026-10-06) → 역순, PASS 16분. Endpoint 도 콘솔에선 생성됨) | ✅ |
| Networking | private-nats (createprivatenat 202) | networking.direct-connect steps[5~7] (이 spec 의 DC 를 연결 자원으로 Private NAT 생성 → 설명 수정 · Private NAT IP 예약·반납(createprivatenatip, 2026-10-06 L3) → 삭제, PASS 6.5분) | ✅ |
| Networking | gslbs regional-routing-control (setgslbregionalroutingcontrol 202) | networking.gslb steps[2] (RRC 목록에서 위치 행 중지 → 사용 복귀 L3, 2026-10-06 에이전트 3B) | ✅ |
| Networking | Cloud WAN network (API 없음) | networking.cloud-wan-network (2026-10-06 3B). Segment 는 월 ₩356,240 → ⏭, Attachment·Site VPN 은 Segment 필요 → ⏭ | ✅ |
| Networking | Cloud Fabric Connect fabric · policy · connection (API 없음) | networking.cloud-fabric-connect (2026-10-06 3B). Port 는 1G/10G 물리 포트 → ⏭ | ✅ |
| Networking | Cloud LAN-Data Center network · vDevice · vCable (API 없음) | networking.cloud-lan-data-center (2026-10-06 3B). Interface 는 1G-T/1G-F 물리 인터페이스·약정 → ⏭ | ✅ |
| Networking | Cloud Secured SD-LAN · SASE(+Lastmile) · Cloud Last Mile(+Circuit and Edge) (API 없음) | — | ⏭ 계약 기간(4~7년)·약정·설치 주소/요청일(회선 설치) 필수 |
| Networking | DNS public-domain-name (createpublicdomainname 500) | — | ⏭ 실제 도메인 구매(구매기간·등록인 정보) |
| Hybrid Cloud | Dedicated Cloud · Private Zone · Oracle Services (API 없음) | — | ⏭ 영업 검토 신청(랙·약정)/ Oracle 은 Organization 소속 + 새 OCI 테넌시 |
| Storage | filestorage volumes | storage.file-storage | ✅ |
| Storage | filestorage snapshots · snapshot-schedules | storage.file-storage-snapshot (스냅샷 스케줄 켜기·끄기, 2026-09-30) | ✅ |
| Storage | filestorage replications | — 복제 위치가 kr-east1-a 뿐(리전간 복제, 전송 요금). 정리가 DR 리전에서 일시중지→삭제 + 복제본 볼륨 삭제를 요구해 단일 리전 도구 범위 밖 | ⏭ |
| Storage | object storage bucket | storage.object-storage-bucket (폴더·파일 업로드→삭제, 버전 관리 사용→미사용, 태그 L3, 2026-10-06 3C) | ✅ |
| Storage | backup backups | 제외 — 콘솔은 Agent 방식만(OS 안에 NetBackup 클라이언트 설치 필요). API 도 생성 성공 없음(createbackup 500, createbackupagent 404) | ⏭ |
| Application Service | queueservice queues | application-service.queue (메시지 설정 수정·IP 접근 허용 추가→삭제 L3, 2026-10-06 3C. 메시지 송수신·purge 는 콘솔에 없음) | ✅ |
| Application Service | apigateway apis · resources · methods · stages · auths · access-controls · usage-plans · api-keys | application-service.api-gateway (리소스·메서드·스테이지 배포 L3, JWT 인증·접근 제어·사용량 정책+API Key 생성·삭제 L3 2026-09-30) | ✅ |
| Application Service | messagehub domains · emails | application-service.messagehub-domain · messagehub-email (소유 확인·인증 메일 발송은 하지 않음) | ✅ |
| Application Service | messagehub phones | — | ⏭ SMS 인증 필요 |
| Management | iam groups · roles | iam.user-group · iam.role (역할: 정책 연결·해제, 수행 주체 추가·제거, 세션 시간, 태그 L3, 2026-10-06 3C) | ✅ |
| Management | iam policies · group policy-bindings | iam.policy (그룹 연결·해제 L3) | ✅ |
| Management | resource-groups | management.resource-group (그룹 정의 태그 조건 추가·제거, 그룹 태그 L3, 2026-10-06 3C) | ✅ |
| Management | notification groups | management.notification-group (설명·외부 수신자 example.com 저장→비움 L3, 2026-10-06 3C) | ✅ |
| Management | servicewatch dashboards · log-groups · log-streams · event-rules · alerts | management.servicewatch-dashboard · -log-group(+스트림) · -event-rule · -alert | ✅ |
| Management | network-logging storages | management.network-logging (버킷 체인, Firewall Logging 적용·해제) | ✅ |
| Management | loggingaudit trails (createtrail 201 · stoptrail · deletetrail) | management.trail (버킷 → Trail → 중지 L3 → 삭제 → 버킷 해지, 2026-10-06) | ✅ |
| Management | iam identity-providers (SAML) | iam.saml-provider (더미 메타데이터, 역할 신뢰 없음, 2026-10-06) | ✅ |
| DevOps Tools | devopsservice (API createdevopsservice 409) | devops-tools.devops-service (콘솔은 생성·해지 됨, 2026-10-06) | ✅ |
| Management | organization OU · control-policy (API 403) | — | ⏭ 콘솔도 "권한 없음"(조직 마스터 필요) |
| Security | secretvault (API 400) · configinspection (API 400) | — | ⏭ 월 예상 요금(₩39,904 · ₩77,400)·계정 인증키 묶임/설정 변경 필요 |
| Compute | keypairs (UI 생성) | — | ⏭ 콘솔 생성은 .pem 다운로드 필수(가져오기 없음), Edge 종료 위험 |
| Financial Management | budgets account | financial-management.budget (금액 수정 L3) | ✅ |
| Security | certificatemanager self-sign | security.certificate (태그 L3, 2026-10-06 3C. 갱신 버튼 없음, 만료 알림은 실제 메일이라 ⏭) | ✅ |
| Security | kms keys | security.kms-key (키 회전·비활성화→활성화·설명·태그 L3, 2026-10-06 3C) | ✅ |
| Security | secretsmanager secrets | security.secrets-manager (해지는 7일 예약, 해지 취소 L3) | ✅ |
