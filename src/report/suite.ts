/**
 * 회귀 스택 스위트의 spec 실행 순서. scripts/run-stacks.ts(실행)와 scripts/results.ts(표 순서)가 같이 쓴다.
 * 각 항목은 spec 파일 id 이며 tests/regression/<id>.spec.ts 에 있다. 싼 것부터.
 */
export const SUITE_ORDER: readonly string[] = [
  'networking.vpc.create-delete', // ≈20초. VPC 생성·해지
  'compute.vm-stack', // ≈12분. Keypair(공유) → VPC → Subnet → 서버 → 역순 정리
  'compute.vm-volume', // ≈16분. 위 스택 + 볼륨 생성·연결·분리·삭제
  'compute.vm-stack-net', // ≈15분. SG · IGW · Public IP 까지
  'compute.server-group', // ≈1분. Server Group 생성·삭제 (선행 리소스 없음)
  'security.address-group', // ≈1분. Address Group 생성·삭제 (선행 리소스 없음)
  'storage.object-storage-bucket', // 전제: 계정에 Object Storage 인증키 1개 (2026-09-23 생성)
  'management.resource-group',
  'iam.user-group',
  'compute.launch-configuration',
  'networking.vpc-port', // VPC → Subnet → Port (≈10분)
  'networking.private-dns', // ≈2분. 생성 → Active → 상세 서비스 해지
  'storage.file-storage', // ≈2분. NFS 볼륨 생성·해지 (용량 과금, 짧게)
  'networking.dns-hosted-zone', // ≈8분. Private DNS → Hosted Zone(Private) → 역순 삭제
  'security.security-group-rule', // ≈3분. SG 생성 → 규칙 추가·삭제 → 해지 (L3)
  'networking.nat-gateway', // ≈12분. VPC → Subnet → Public IP → NAT → 역순 (시간 과금, 즉시 삭제)
  'compute.auto-scaling-group', // ≈15분. VPC → Subnet → SG → LC → ASG(0대) → 역순. 무과금
  'networking.vpc-peering',
  'container.ske-cluster', // ≈40분. VPC → Subnet → SG → SKE 클러스터(노드 없음) → 역순. 시간 과금
  'database.postgresql', // ≈25분. VPC → Subnet → PostgreSQL 단일 서버 → 역순. 시간 과금 (공유 VPC 병렬 가능: scripts/run-parallel.ts)
  'database.mysql', // ≈25분. 위와 같은 구조
  'database.mariadb', // ≈25분
  'database.epas', // ≈25분. License 확인 체크
  'database.cachestore', // ≈20분. Redis Sentinel 단일, 고가용성 끔
  'application-service.queue', // Queue(기본 유형) 생성·해지. 선행 리소스 없음
  'management.notification-group', // 알림 그룹(수신자 없음) 생성·삭제. Global
  'compute.cloud-function', // Function(새로 작성, Node.js) 생성·해지. 호출 과금
  'container.container-registry', // Registry(프라이빗) 생성·상세 해지. 빈 채로 즉시 해지
  'iam.role', // 역할(수행 주체 현재 Account, 정책 없음) 생성·삭제. Global
  'security.certificate', // 자체 발급 인증서(한 달) 생성·해지. 무과금
  'container.repository', // Registry → Repository → 역순. ≈8분
];
