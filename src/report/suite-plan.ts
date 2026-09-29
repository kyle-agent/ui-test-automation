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
}

export const DEFAULT_PLAN: SpecPlan = { vpc: 0, minutes: 3 };

export const SUITE_PLAN: Record<string, SpecPlan> = {
  'networking.vpc.create-delete': { vpc: 1, minutes: 1 },
  'compute.vm-stack': { vpc: 1, minutes: 13 },
  'compute.vm-volume': { vpc: 1, minutes: 16.5 },
  'compute.vm-stack-net': { vpc: 1, minutes: 14.5 },
  'compute.server-group': { vpc: 0, minutes: 1.5 },
  'security.address-group': { vpc: 0, minutes: 1.5 },
  'storage.object-storage-bucket': { vpc: 0, minutes: 1.5 },
  'management.resource-group': { vpc: 0, minutes: 1 },
  'iam.user-group': { vpc: 0, minutes: 1 },
  'compute.launch-configuration': { vpc: 0, minutes: 1.5 },
  'networking.vpc-port': { vpc: 1, minutes: 11 },
  'networking.private-dns': { vpc: 0, minutes: 7 },
  'storage.file-storage': { vpc: 0, minutes: 2 },
  'networking.dns-hosted-zone': { vpc: 0, minutes: 7 },
  'security.security-group-rule': { vpc: 0, minutes: 2 },
  'networking.nat-gateway': { vpc: 1, minutes: 11.5 },
  'compute.auto-scaling-group': { vpc: 1, minutes: 15 },
  'networking.vpc-peering': { vpc: 2, minutes: 12 },
  'container.ske-cluster': { vpc: 1, minutes: 22.5 },
  'database.postgresql': { vpc: 0, shared: true, minutes: 17 },
  'database.mysql': { vpc: 0, shared: true, minutes: 16 },
  'database.mariadb': { vpc: 0, shared: true, minutes: 16 },
  'database.epas': { vpc: 0, shared: true, minutes: 16 },
  'database.cachestore': { vpc: 0, shared: true, minutes: 15.5 },
  // 2026-09-29 커버리지 확장(단독 통과 실측). 나머지(queue·notification-group·cloud-function·certificate)는 기본값 3분
  'container.repository': { vpc: 0, minutes: 7 },
  'container.container-registry': { vpc: 0, minutes: 6.5 },
  'iam.role': { vpc: 0, minutes: 4.5 },
};

export function planFor(spec: string): SpecPlan {
  return SUITE_PLAN[spec] ?? DEFAULT_PLAN;
}
