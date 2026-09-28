// 직접 작성 (2026-09-28). 시나리오: scenarios/database/mysql.yaml. 공용 팩토리: src/console/dbaas.ts
// PostgreSQL 과 같은 구조(프로브 2026-09-28). 캐릭터셋·Table 대소문자 구분은 기본값.
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/database/mysql.yaml',
  route: '#/mysql/mysql/list',
  readyLabel: 'Database 사용자명',
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '128' }, // DATA 는 8GB 배수(100 거부), CacheStore 는 64GB 이상 (2026-09-28 실측)
    { label: 'Database명', value: 'qadb' },
    { label: 'Database 사용자명', value: 'qauser' },
    { label: 'Database Port번호', value: '3306' },
  ],
});
