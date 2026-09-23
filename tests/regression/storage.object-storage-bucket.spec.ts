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
  // 2026-09-23 실측: 계정에 Object Storage 인증키가 없으면 "Object Storage 조회에 실패하였습니다 — 사용할 수 있는 인증키가 없습니다" 로
  // 버킷명 검증(조회)이 실패하고 "생성" 이 비활성 상태로 남는다. 인증키는 계정 자격 증명이라 테스트가 만들지 않는다 → 사람이 인증키를 만든 뒤 이 줄을 지운다.
  skipReason: 'Object Storage 인증키(인증키 관리 > 생성)가 계정에 없어 버킷 생성이 막힘 — 환경 전제 미충족',
});
