// 직접 작성 (2026-09-28). 시나리오: scenarios/database/cachestore.yaml. 공용 팩토리: src/console/dbaas.ts
// Redis 는 Database명/사용자명이 없고 "Redis Port 번호"·"Redis 비밀번호" 를 쓴다. 고가용성(Master-Replica)은 끈다.
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/database/cachestore.yaml',
  route: '#/cachestore/cachestore/list',
  readyLabel: 'Redis 비밀번호',
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '16' },
    { label: 'Redis Port 번호', value: '6379' },
  ],
  uncheck: ['고가용성', '백업', 'ServiceWatch 로그 수집'],
});
