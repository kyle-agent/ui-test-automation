// 직접 작성 (2026-09-28). 시나리오: scenarios/database/postgresql.yaml. 공용 팩토리: src/console/dbaas.ts
// 실측: 클러스터명은 영문만(run_id_alpha), DATA 디스크 GB 필수(기본 0), 폼이 늦게 그려져 "Database 사용자명" 이 보일 때까지 기다린다.
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/database/postgresql.yaml',
  route: '#/postgresql/postgresql/list',
  readyLabel: 'Database 사용자명',
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '128' }, // DATA 는 8GB 배수(100 거부), CacheStore 는 64GB 이상 (2026-09-28 실측)
    { label: 'Database명', value: 'qadb' },
    { label: 'Database 사용자명', value: 'qauser' },
    { label: 'Database Port번호', value: '5432' },
  ],
  replica: true, // 2026-09-30: 백업 켠 채 생성 → Replica 추가 → Running → 해지 (steps[3]·[4])
});
