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
| Compute | server-groups | compute.server-group | ✅ |
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
| Container | scr container-registries · repositories | container.container-registry · container.repository | ✅ |
| Database | postgresql · mysql · mariadb · epas · cachestore clusters | database.* 5종 | ✅ |
| Database | postgresql · mysql · mariadb · epas replicas (읽기 복제본) | database.postgresql·mysql·mariadb·epas steps[3]·[4] (백업 켠 Master → 상세 더보기 Replica 구성 → Running → 해지). 10-01 4종 모두 PASS(공유 VPC 병렬 35분) | ✅ |
| Data Analytics | eventstreams clusters | data-analytics.event-streams (공유 VPC) | ✅ |
| Networking | vpcs · subnets | networking.vpc.create-delete · 모든 VPC 체인 | ✅ |
| Networking | internet-gateways · publicips | compute.vm-stack-net · networking.nat-gateway | ✅ |
| Networking | nat-gateways · vpc-peerings · private-dns · hosted-zones · hosted-zone records | networking.nat-gateway · vpc-peering · private-dns · dns-hosted-zone (A 레코드 추가·삭제 L3, 2026-09-30) | ✅ |
| Networking | security-groups · security-group-rules · address-groups | compute.vm-stack-net · security.security-group-rule · security.address-group | ✅ |
| Networking | loadbalancers · lb-server-groups · members · lb-listeners · static-nats | networking.load-balancer (2026-09-30 PASS). 멤버는 실제 VM 필요로 미포함 | ✅ |
| Networking | firewalls rules | networking.firewall (규칙 추가·삭제 L3) | ✅ |
| Networking | transit-gateways · vpc-connections | networking.transit-gateway (VPC 연결 추가·해제 L3) | ✅ |
| Networking | vpn gateways · tunnels | networking.vpn (게이트웨이 + 터널) | ✅ |
| Networking | vpc endpoints | networking.vpc-endpoint | ✅ |
| Networking | direct-connects | networking.direct-connect (규칙 추가·삭제 L3, 시간 과금이라 즉시 해지) | ✅ |
| Networking | cdn services | networking.cdn (원본 example.com, 배포 대기 → 중지 → 해지 ≈25분, 2026-09-30) | ✅ |
| Networking | gslbs | networking.gslb (연결 대상 192.0.2.10, 2026-09-30) | ✅ |
| Networking | subnet vips · vip connected-ports · vip static-nat-ips (createsubnetvip·port·natip 2xx) | networking.vpc-port steps[4~10] (IGW·Public IP → VIP 예약 → Port 연결 → Public NAT IP 연결·해제 → 역순, 2026-09-30 PASS 15.5분) | ✅ |
| Networking | transit-gateway routing-rules (createtransitgatewayrule 2xx) | networking.transit-gateway steps[4~5] (VPC→TGW 목적지 규칙 추가·삭제, 2026-09-30 PASS 11.7분. 규칙이 남으면 VPC 연결 해제가 조용히 무시됨) | ✅ |
| Networking | vpc-peering routing-rules (createvpcpeeringrule 2xx) | networking.vpc-peering steps[3~4] (요청→승인 VPC 규칙 추가·삭제, L3). 10-01 PASS 13.6분 | ✅ |
| Networking | loadbalancer public-nat-ip (createloadbalancerpublicnatip 2xx) | networking.load-balancer steps[6~8] (IGW·Public IP → LB Public NAT IP 설정·해제, 공유 네트워크면 건너뜀, 2026-09-30 PASS 22분) | ✅ |
| Networking | privatelink-services (+ endpoints: API 는 404) | networking.privatelink-service (IP 연결 Service → 같은 계정 Endpoint 요청 → 승인 L3 → 역순, 2026-09-30 PASS 14분. Endpoint 도 콘솔에선 생성됨) | ✅ |
| Networking | private-nats (createprivatenat 202) | networking.direct-connect steps[5~6] (이 spec 의 DC 를 연결 자원으로 Private NAT 생성·삭제, 2026-09-30 PASS 6.5분) | ✅ |
| Storage | filestorage volumes | storage.file-storage | ✅ |
| Storage | filestorage snapshots · snapshot-schedules | storage.file-storage-snapshot (스냅샷 스케줄 켜기·끄기, 2026-09-30) | ✅ |
| Storage | filestorage replications | — 복제 위치가 kr-east1-a 뿐(리전간 복제, 전송 요금). 정리가 DR 리전에서 일시중지→삭제 + 복제본 볼륨 삭제를 요구해 단일 리전 도구 범위 밖 | ⏭ |
| Storage | object storage bucket | storage.object-storage-bucket | ✅ |
| Storage | backup backups | 제외 — 콘솔은 Agent 방식만(OS 안에 NetBackup 클라이언트 설치 필요). API 도 생성 성공 없음(createbackup 500, createbackupagent 404) | ⏭ |
| Application Service | queueservice queues | application-service.queue | ✅ |
| Application Service | apigateway apis · resources · methods · stages · auths · access-controls · usage-plans · api-keys | application-service.api-gateway (리소스·메서드·스테이지 배포 L3, JWT 인증·접근 제어·사용량 정책+API Key 생성·삭제 L3 2026-09-30) | ✅ |
| Application Service | messagehub domains · emails | application-service.messagehub-domain · messagehub-email (소유 확인·인증 메일 발송은 하지 않음) | ✅ |
| Application Service | messagehub phones | — | ⏭ SMS 인증 필요 |
| Management | iam groups · roles | iam.user-group · iam.role | ✅ |
| Management | iam policies · group policy-bindings | iam.policy (그룹 연결·해제 L3) | ✅ |
| Management | resource-groups | management.resource-group | ✅ |
| Management | notification groups | management.notification-group | ✅ |
| Management | servicewatch dashboards · log-groups · log-streams · event-rules · alerts | management.servicewatch-dashboard · -log-group(+스트림) · -event-rule · -alert | ✅ |
| Management | network-logging storages | management.network-logging (버킷 체인, Firewall Logging 적용·해제) | ✅ |
| Financial Management | budgets account | financial-management.budget (금액 수정 L3) | ✅ |
| Security | certificatemanager self-sign | security.certificate | ✅ |
| Security | kms keys | security.kms-key | ✅ |
| Security | secretsmanager secrets | security.secrets-manager (해지는 7일 예약, 해지 취소 L3) | ✅ |
