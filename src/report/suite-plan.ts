/**
 * 병렬 스위트 실행기(scripts/run-suite.ts)가 쓰는 spec 별 자원·시간 정보.
 *  - vpc: 그 spec 이 스스로 만드는 VPC 수 (계정 한도 5 안에서 동시 실행 수를 정한다)
 *  - shared: true 면 자기 VPC 대신 런처가 만든 공유 VPC+Subnet 을 채택한다(SHARED_VPC/SHARED_SUBNET, src/console/shared.ts)
 *  - minutes: 통과 실행의 중앙값(reports/runs, 2026-09-29 기준). 오래 걸리는 것부터 띄워 전체 시간을 줄인다.
 * 여기 없는 spec(새로 추가된 것)은 DEFAULT_PLAN 으로 본다: VPC 없음, 3분.
 */
export interface SpecPlan {
  vpc: number;
  shared?: boolean;
  minutes: number;
  /** 같은 lock 을 가진 spec 은 동시에 띄우지 않는다(계정 쿼터 등). 예: 프라이빗 레지스트리 1개 */
  lock?: string;
}

export const DEFAULT_PLAN: SpecPlan = { vpc: 0, minutes: 3 };

export const SUITE_PLAN: Record<string, SpecPlan> = {
  'networking.vpc.create-delete': { vpc: 1, minutes: 1 },
  'compute.vm-stack': { vpc: 1, minutes: 18 }, // 09-30 Image·포트·Dump 단계 추가 (에이전트 C)
  'compute.vm-volume': { vpc: 1, minutes: 16.5 },
  'compute.vm-stack-net': { vpc: 1, minutes: 14.5 },
  'compute.server-group': { vpc: 0, minutes: 1.5 },
  'security.address-group': { vpc: 0, minutes: 1.5 },
  'storage.object-storage-bucket': { vpc: 0, minutes: 1.5 },
  'management.resource-group': { vpc: 0, minutes: 1 },
  'iam.user-group': { vpc: 0, minutes: 1 },
  'compute.launch-configuration': { vpc: 0, minutes: 1.5 },
  'networking.vpc-port': { vpc: 1, minutes: 15.5 }, // VIP·Port 연결·Public NAT 단계 포함(2026-09-30, IGW·Public IP 도 만든다)
  'networking.private-dns': { vpc: 0, minutes: 7 },
  'storage.file-storage': { vpc: 0, minutes: 2 },
  'networking.dns-hosted-zone': { vpc: 0, minutes: 8.5 }, // 레코드 추가·삭제 포함(2026-09-30)
  'security.security-group-rule': { vpc: 0, minutes: 2 },
  'networking.nat-gateway': { vpc: 1, minutes: 11.5 },
  'compute.auto-scaling-group': { vpc: 1, minutes: 15 },
  'networking.vpc-peering': { vpc: 2, minutes: 14 }, // 규칙 단계 포함(2026-09-30), VPC 2개
  'container.ske-cluster': { vpc: 1, minutes: 30 }, // 노드 풀 단계 포함(2026-09-30)
  'database.postgresql': { vpc: 0, shared: true, minutes: 40 }, // 09-30 Replica 단계 추가 (에이전트 C, 단독 45분)
  'database.mysql': { vpc: 0, shared: true, minutes: 40 }, // 09-30 Replica 단계 추가 (에이전트 C)
  'database.mariadb': { vpc: 0, shared: true, minutes: 40 }, // 10-01 Replica 단계 켬(추정)
  'database.epas': { vpc: 0, shared: true, minutes: 40 }, // 10-01 Replica 단계 켬(추정)
  'database.cachestore': { vpc: 0, shared: true, minutes: 15.5 },
  // 2026-09-29 커버리지 확장(단독 통과 실측). 나머지(queue·notification-group·cloud-function·certificate)는 기본값 3분
  'container.repository': { vpc: 0, minutes: 11, lock: 'private-registry' }, // 3C 2026-10-06 L3 단계 포함 실측 10.7분. 프라이빗 레지스트리 쿼터 1 — registry spec 과 동시 실행 불가
  'container.container-registry': { vpc: 0, minutes: 14, lock: 'private-registry' }, // 3C 2026-10-06 엔드포인트 변경(Editing 2회) 포함 실측 13.8분
  'iam.role': { vpc: 0, minutes: 4.5 },
  // 에이전트 B(네트워킹): 모두 자기 VPC 1개. load-balancer 는 본 단계 실측 11분, 나머지는 콘솔 프로브 시간으로 추정(아직 SUITE_ORDER 밖)
  'networking.load-balancer': { vpc: 1, minutes: 24 }, // Public NAT IP 단계 + 헬스 체크·서버 그룹·Listener 수정(L3) 포함 실측 23분(2026-10-06)
  'networking.firewall': { vpc: 1, minutes: 5 },
  'networking.transit-gateway': { vpc: 1, minutes: 12 }, // 규칙 단계 포함(2026-09-30)
  'networking.vpn': { vpc: 1, minutes: 11 }, // Gateway·Tunnel 수정(L3) 포함 실측 10.5분(2026-10-06)
  'networking.vpc-endpoint': { vpc: 1, minutes: 5 }, // 설명 수정(L3) 포함 실측 4분(2026-10-06)
  'networking.direct-connect': { vpc: 1, minutes: 6.5 }, // Private NAT 단계 포함(2026-09-30)
  'data-analytics.event-streams': { vpc: 0, shared: true, minutes: 26 }, // defineDbaasSpec → 공유 VPC 채택. 중지·시작(L3) 포함 단독 실측 26분(2026-10-06)
  'application-service.api-gateway': { vpc: 0, minutes: 9.5 }, // 에이전트 A: API Creating ≈4분, 2026-09-30 JWT·접근 제어·사용량 정책·API Key·함수 트리거 포함. 나머지 A spec(KMS·Secrets·IAM 정책·ServiceWatch 4종·Network Logging·Budget·Message Hub 2종)은 1~2분이라 기본값
  // 에이전트 C (2026-09-29 단독 통과): Cronjob 실행 확인·스냅샷 L3
  'compute.cloud-function': { vpc: 0, minutes: 4 },
  'storage.file-storage-snapshot': { vpc: 0, minutes: 3.5 }, // 스냅샷 스케줄 포함(2026-09-30)
  'compute.volume-snapshot': { vpc: 0, minutes: 5 },
  // 에이전트 B 2차 (2026-09-30): VPC 1개(+Subnet)
  'networking.privatelink-service': { vpc: 1, minutes: 17 }, // 설명 수정·차단·재연결(L3) 포함 실측 16분(2026-10-06)
  // 에이전트 A 2차 (2026-09-30): VPC 없음. CDN 은 배포·중지 대기로 ≈25분
  'networking.cdn': { vpc: 0, minutes: 30 }, // 3C 2026-10-06 설정 수정·재배포(L3) 포함 실측 30분
  'networking.gslb': { vpc: 0, minutes: 2 },
  // 에이전트 3B (2026-10-06): VPC 없음. Cloud LAN-DC 는 vDevice 2개 Creating·Deleting 으로 ≈8분 (Failed 재시도 시 더)
  'networking.cloud-lan-data-center': { vpc: 0, minutes: 9 },
};

export function planFor(spec: string): SpecPlan {
  return SUITE_PLAN[spec] ?? DEFAULT_PLAN;
}
