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
});
