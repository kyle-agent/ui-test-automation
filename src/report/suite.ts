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
];
