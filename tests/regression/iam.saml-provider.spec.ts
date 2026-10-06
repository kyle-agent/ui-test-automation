// 직접 작성 (2026-10-06). 시나리오: scenarios/iam/saml-provider.yaml. 공용 팩토리: src/console/simple-crud.ts
// 메타데이터는 실행 중 메모리에서 만든 더미 SAML IdP 문서(파일로 남기지 않음). 역할 신뢰 관계를 만들지 않으므로 계정 로그인(SSO)에 영향 없음.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { setCheckbox } from '../../src/console/ui';
import { expect } from '@playwright/test';
import { editDetailText, logDetail, openDetail, openLabelEdit, probeEdits, saveModal } from '../../src/console/detail-edit';

// 더미 IdP 서명 인증서(공개 인증서만, CN=scp-console-tests-dummy-idp.example.invalid, 10년). 개인 키는 만든 즉시 버렸다 — 비밀 아님.
// 2026-10-06 실측: KeyDescriptor(X509) 가 없으면 "메타데이터가 형식에 맞지 않습니다" 로 생성 실패.
const DUMMY_CERT =
  'MIIDTTCCAjWgAwIBAgIUWa4gLnExaBwH50vR5vCTVbmND2gwDQYJKoZIhvcNAQELBQAwNjE0MDIGA1UEAwwrc2NwLWNvbnNvbGUtdGVzdHMtZHVtbXktaWRwLmV4YW1wbGUuaW52YWxpZDAeFw0yNjEwMDUyMzQwNTNaFw0zNjEwMDIyMzQwNTNaMDYxNDAyBgNVBAMMK3NjcC1jb25zb2xlLXRlc3RzLWR1bW15LWlkcC5leGFtcGxlLmludmFsaWQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCm86bHu4/my2MiZLb/H78EAi2/UVISNUbMKTDK3mxvm6l+t/diA6BlGa42TXmLUyjBW9F8Gq+G1yk3gfHrj2owVp07q7xH6G1YEAEWe/nS/sMYSsUzGqFSEqx6VqSX8kyqzbXx/TMtc3cSQwy9rXtwfWtZ8TwKF8zmQgrEGut5u2HhZsrUf73gOMNVkqP/EuuRaWuKXqmB+Jy6QTC6R2kLK+MfCod2bNoYLobHlCNjF7zumcxE9ftXpIewUab9+fOGWJFNkOejqZtiZfeFR9qmCsvVGGp2c2ol58GWeFaGIwNFwDnW8RARB4G6QSsVEwl8GsbzPI6q0HsvWicYeU0ZAgMBAAGjUzBRMB0GA1UdDgQWBBS3uKEsws3nyIc3ye/ZceQuxJGJMjAfBgNVHSMEGDAWgBS3uKEsws3nyIc3ye/ZceQuxJGJMjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQADjgxSSkRcsV+Qycz6vvNU7J2pzQ8u0vIfIOMD57KxF/NrKHp7O7vRpydnNRBbWIUOMMShm33lAW0h4HdSVTah/cnqFV2zmRYxbdNQz/TjlHVogCtXHGpmQXNn8OBlZCQbrXTN62sYJGcaAmLP6ZUYHfDRY83/G8dzXUKzyYmrS5V5CoIJP03fnZW25yEX9htBCtyLwExE3PZRHRsUm7EzdECaRSrnyxnvDQmd5oH4sPm9yD9dE/VlIflfoi1a4mWXWWtNOYAEWJc7XvjI0UKxmOrIAPln8d2oR1JJef2e2IwNgE365GInN/Pv+MyenlX7reGzrTAN8KFG3Ytw3qLz';

const metadata = (name: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://${name}.example.invalid/saml">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>${DUMMY_CERT}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://${name}.example.invalid/sso"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://${name}.example.invalid/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
`;

defineSimpleCrudSpec({
  scenario: 'scenarios/iam/saml-provider.yaml',
  route: '#/iam/idp/list',
  createButton: '자격 증명 공급자 생성',
  fields: [
    { label: '자격 증명 공급자명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}} dummy', selector: 'textarea' },
  ],
  actions: [
    // steps[2] 상세에서 설명 수정
    async (page, vars, log) => {
      await openDetail(page, '#/iam/idp/list', vars.name!);
      await logDetail(page, log);
      await probeEdits(page, log);
      await editDetailText(page, '설명', `edited ${vars.run_id}`, { log });
    },
    // steps[3] 메타데이터 교체 (entityID 가 다른 더미 문서). 상세 화면은 "메타데이터 보기" 링크만 보여 값 비교 대신 저장 성공(모달 닫힘)으로 확인
    async (page, vars, log) => {
      const modal = await openLabelEdit(page, '메타데이터');
      const inModal = modal.locator('input[type=file]');
      await ((await inModal.count()) ? inModal.first() : page.locator('input[type=file]').last()).setInputFiles({
        name: `${vars.name}-v2.xml`,
        mimeType: 'text/xml',
        buffer: Buffer.from(metadata(`${vars.name}-v2`), 'utf8'),
      });
      await expect(modal, '첨부한 새 메타데이터 파일이 모달에 보여야 합니다').toContainText(/총 1/, { timeout: 10_000 });
      log(`    모달: ${((await modal.innerText()) || '').replace(/\s+/g, ' ').slice(0, 200)}`);
      await saveModal(page, log);
      log(`    메타데이터 ${vars.name}-v2.xml 로 교체 저장`);
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
  beforeSubmit: async (page, vars) => {
    await setCheckbox(page, '유형', true, 0); // 첫 칸 = SAML
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: `${vars.name}.xml`,
        mimeType: 'text/xml',
        buffer: Buffer.from(metadata(vars.name!), 'utf8'),
      });
    await page.waitForTimeout(1_000);
  },
});
