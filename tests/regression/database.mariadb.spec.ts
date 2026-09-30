// 직접 작성 (2026-09-28). 시나리오: scenarios/database/mariadb.yaml. 공용 팩토리: src/console/dbaas.ts
// PostgreSQL 과 같은 구조(프로브 2026-09-28). 기본 서버 타입 db1v1m2.
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/database/mariadb.yaml',
  route: '#/mariadb/mariadb/list',
  readyLabel: 'Database 사용자명',
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '128' }, // DATA 는 8GB 배수(100 거부), CacheStore 는 64GB 이상 (2026-09-28 실측)
    { label: 'Database명', value: 'qadb' },
    { label: 'Database 사용자명', value: 'qauser' },
    { label: 'Database Port번호', value: '3306' },
  ],
  // replica: true, // 2026-09-30 준비만 함: 단독 실행 전 SSO 세션 만료로 미검증. 켜고 단독 PASS 확인 후 유지 (시나리오 steps[3]·[4] 는 작성됨)
});
