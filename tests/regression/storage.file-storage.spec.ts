// 직접 작성 (2026-09-23). 시나리오: scenarios/storage/file-storage.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/storage/file-storage.yaml',
  route: '#/filestorage/filestorage/list',
  createButton: '서비스 생성',
  fields: [{ label: '볼륨명', value: '{{name}}' }],
  // 프로토콜은 NFS/CIFS 토글 버튼. CIFS 는 비밀번호 설정이 필요하므로 NFS 를 명시적으로 고른다.
  beforeSubmit: async (page) => {
    const nfs = page.getByRole('button', { name: 'NFS', exact: true }).first();
    if (await nfs.count()) await nfs.click();
  },
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light'],
});
