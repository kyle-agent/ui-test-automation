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
| Compute | servers interfaces · static-nats | compute.vm-stack-net 의 Public NAT IP 연결과 겹쳐 별도 spec 없음 | ✅ |
| Compute | scf cloud-functions | compute.cloud-function | ✅ |
| Compute | scf triggers cronjob · apigateway | compute.cloud-function (Cronjob 트리거 + 실행 로그 L3). API Gateway 트리거는 미포함 | ✅ |
| Container | ske clusters | container.ske-cluster | ✅ |
| Container | ske nodepools | container.ske-cluster steps[3] (노드 1대 추가·Running·삭제, L3) | ✅ |
| Container | scr container-registries · repositories | container.container-registry · container.repository | ✅ |
| Database | postgresql · mysql · mariadb · epas · cachestore clusters | database.* 5종 | ✅ |
| Data Analytics | eventstreams clusters | data-analytics.event-streams (공유 VPC) | ✅ |
| Networking | vpcs · subnets | networking.vpc.create-delete · 모든 VPC 체인 | ✅ |
| Networking | internet-gateways · publicips | compute.vm-stack-net · networking.nat-gateway | ✅ |
| Networking | nat-gateways · vpc-peerings · private-dns · hosted-zones | networking.nat-gateway · vpc-peering · private-dns · dns-hosted-zone | ✅ |
| Networking | security-groups · security-group-rules · address-groups | compute.vm-stack-net · security.security-group-rule · security.address-group | ✅ |
| Networking | loadbalancers · lb-server-groups · members · lb-listeners · static-nats | networking.load-balancer (2026-09-30 PASS). 멤버는 실제 VM 필요로 미포함 | ✅ |
| Networking | firewalls rules | networking.firewall (규칙 추가·삭제 L3) | ✅ |
| Networking | transit-gateways · vpc-connections | networking.transit-gateway (VPC 연결 추가·해제 L3) | ✅ |
| Networking | vpn gateways · tunnels | networking.vpn (게이트웨이 + 터널) | ✅ |
| Networking | vpc endpoints | networking.vpc-endpoint | ✅ |
| Networking | direct-connects | networking.direct-connect (규칙 추가·삭제 L3, 시간 과금이라 즉시 해지) | ✅ |
| Storage | filestorage volumes | storage.file-storage | ✅ |
| Storage | filestorage snapshots | storage.file-storage-snapshot | ✅ |
| Storage | object storage bucket | storage.object-storage-bucket | ✅ |
| Storage | backup backups | 제외 — 콘솔은 Agent 방식만(OS 안에 NetBackup 클라이언트 설치 필요). API 도 생성 성공 없음(createbackup 500, createbackupagent 404) | ⏭ |
| Application Service | queueservice queues | application-service.queue | ✅ |
| Application Service | apigateway apis · resources · methods · stages · usage-plans | application-service.api-gateway (리소스·메서드·스테이지 배포 L3, usage-plan 은 미포함) | ✅ |
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
