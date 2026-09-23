// 직접 작성 (2026-09-23). 시나리오: scenarios/storage/object-storage-bucket.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/storage/object-storage-bucket.yaml',
  route: '#/objectstorage/objectstorage/list',
  createButton: '서비스 생성',
  fields: [{ label: '버킷명', value: '{{name}}' }],
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light'],
  // 2026-09-23 실측: 계정에 Object Storage 인증키(IAM > My Info > 인증키, 영구)가 있어야 버킷명 조회·생성이 된다. 인증키는 계정 자격 증명이라 테스트가 만들지 않는다.
});
