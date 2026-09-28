// 직접 작성 (2026-09-28). 시나리오: scenarios/database/searchengine.yaml. 공용 팩토리: src/console/dbaas.ts
// 이미지는 OpenSearch(라이선스 키 불필요). Node 수 기본 1, MasterNode 별도설치 끔.
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/database/searchengine.yaml',
  route: '#/searchengine/searchengine/list',
  readyLabel: 'Elastic 사용자명',
  imageOption: /OpenSearch/,
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '16' },
    { label: '클러스터 Port 번호', value: '9200' },
    { label: 'Elastic 사용자명', value: 'qauser' },
  ],
  uncheck: ['MasterNode 별도설치', '백업', 'ServiceWatch 로그 수집'],
});
