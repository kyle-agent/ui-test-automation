// 직접 작성 (2026-09-29, 에이전트 C). 시나리오: scenarios/data-analytics/event-streams.yaml. 공용 팩토리: src/console/dbaas.ts
// Kafka 클러스터: Broker 1대(기본 3 → 1), 최소 서버 타입(기본 ess1v2m4), Zookeeper 별도 설치·AKHQ·유지 관리·ServiceWatch 끔. SASL 비밀번호 4칸.
import { defineDbaasSpec } from '../../src/console/dbaas';

defineDbaasSpec({
  scenario: 'scenarios/data-analytics/event-streams.yaml',
  route: '#/eventstreams/eventstreams/list',
  readyLabel: 'Broker SASL 비밀번호',
  fields: [
    { label: '서버명 prefix', value: '{{prefix}}' },
    { label: '클러스터명', value: '{{name}}' },
    { label: 'DATA', value: '128' },
    { label: 'Zookeeper SASL 계정', value: 'qazk' },
    { label: 'Zookeeper Port 번호', value: '2181' },
    { label: 'Broker SASL 계정', value: 'qabroker' },
    { label: 'Broker Port 번호', value: '9092' },
  ],
  dropdowns: [{ label: 'Broker Node 수', option: '1' }],
  passwordInputs: 4, // Zookeeper 비밀번호·확인, Broker 비밀번호·확인
  uncheck: ['Zookeeper 별도 설치', 'AKHQ', '유지 관리 기간', 'ServiceWatch 로그 수집'],
  stopStart: true, // steps[3] 중지 → 시작 (L3, 2026-10-06)
});
