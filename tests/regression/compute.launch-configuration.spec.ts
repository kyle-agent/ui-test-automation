// 직접 작성 (2026-09-23). 시나리오: scenarios/compute/launch-configuration.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/compute/launch-configuration.yaml',
  route: '#/virtualserver/launch-configuration/list',
  createButton: 'Launch Configuration 생성',
  fields: [{ label: 'Launch Configuration명', value: '{{name}}' }],
  dropdowns: [
    { label: '서비스 유형', option: /^Standard-1/ },
    { label: '서버 타입', option: /./ }, // 서비스 유형을 고르면 채워진다: 첫 항목
    { label: '기본 OS', option: /^SSD$/ }, // 기본값 SSD_Provisioned 는 Max IOPS·Throughput 입력이 필수라 생성이 비활성 → SSD
    { label: 'Keypair명', option: /qa-shared-keypair/ },
  ],
  deleteButton: '삭제',
  tags: ['@light'],
});
