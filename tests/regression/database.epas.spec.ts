// 직접 작성 (2026-09-28). 시나리오: scenarios/database/epas.yaml. 공용 팩토리: src/console/dbaas.ts
// PostgreSQL 과 같은 구조 + "License" 확인 체크(BYOL) (프로브 2026-09-28).
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/database/epas.yaml',
  route: '#/epas/epas/list',
  readyLabel: 'Database 사용자명',
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '128' }, // DATA 는 8GB 배수(100 거부), CacheStore 는 64GB 이상 (2026-09-28 실측)
    { label: 'Database명', value: 'qadb' },
    { label: 'Database 사용자명', value: 'qauser' },
    { label: 'Database Port번호', value: '5432' },
  ],
  check: ['License'], // BYOL 확인 체크
  replica: true, // 2026-10-01 켬: 백업 켠 채 생성 → Replica 추가 → Running → 해지 (steps[3]·[4])
  // 2026-10-14 7차: PostgreSQL 과 같은 상세 공통 동작(steps[5], Replica 전에 실행). EPAS 는 PostgreSQL 계열이라 cpu_tuple_cost 기본값 그대로.
  ops: ['backup', 'parameter', 'archive', 'sync', 'restart', 'maintenance', 'audit', 'ipAcl', 'stopStart'],
});
