import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { formatApiCoverageJson, type ApiCoverageSnapshot } from '../../src/report/api-coverage';
import { isWriteOp, operationsByCategory, parseUiOperations, productOperations } from '../../src/report/operations';

const snap = (services: ApiCoverageSnapshot['services']): ApiCoverageSnapshot => ({
  source: 't',
  source_commit: 'abc',
  source_date: '2026-10-07',
  imported: '2026-10-07',
  services,
});

const ske = {
  category: 'container',
  service: 'ske',
  total: 6,
  verified: 4,
  ok2xx: 4,
  ops: [
    { name: 'createcluster', method: 'POST', verified: true },
    { name: 'deletecluster', method: 'DELETE', verified: true },
    { name: 'setnodepool', method: 'PUT', verified: false },
    { name: 'listclusters', method: 'GET', verified: true },
    { name: 'createclusterkubeconfig', method: 'GET', verified: true },
    { name: 'setclusterupgrade', method: 'PUT', verified: false },
  ],
};

test.describe('동작 단위 커버리지', () => {
  test('쓰기 동작 규칙: GET 은 읽기, 비 GET 이어도 읽기 동사(서비스 접두어 뗀 뒤)면 읽기', () => {
    expect(isWriteOp('ske', { name: 'createcluster', method: 'POST' })).toBe(true);
    expect(isWriteOp('ske', { name: 'deletenodepool', method: 'DELETE' })).toBe(true);
    expect(isWriteOp('ske', { name: 'createclusterkubeconfig', method: 'GET' })).toBe(false);
    expect(isWriteOp('iam', { name: 'querypolicy', method: 'POST' })).toBe(false);
    expect(isWriteOp('secretsmanager', { name: 'showsecretsmanagersecretvalue', method: 'POST' })).toBe(false);
    expect(isWriteOp('mysql', { name: 'mysqllistclusters', method: 'POST' })).toBe(false);
    expect(isWriteOp('mysql', { name: 'mysqlcreatecluster', method: 'POST' })).toBe(true);
    expect(isWriteOp('servicewatch', { name: 'listmetricdata', method: 'POST' })).toBe(false);
  });

  test('대응표 파서: 서비스·동작·spec 쉼표 목록·확인 필요 주석', () => {
    const m = parseUiOperations(
      [
        '# 머리말 # 주석',
        'ske:',
        '  createcluster: container.ske-cluster',
        '  setnodepool: a.b, c.d  # 확인 필요 — 스케일',
        '  setclusterupgrade:',
        '',
        'vpc:',
        '  createvpc: [x.y, "z.w"]',
        '  createvpc: x.y, q.r',
      ].join('\r\n'),
    );
    expect([...m.keys()]).toEqual(['ske', 'vpc']);
    expect(m.get('ske')!.get('createcluster')).toEqual({ specs: ['container.ske-cluster'], uncertain: false });
    expect(m.get('ske')!.get('setnodepool')).toEqual({ specs: ['a.b', 'c.d'], uncertain: true });
    expect(m.get('ske')!.has('setclusterupgrade')).toBe(false);
    expect(m.get('vpc')!.get('createvpc')!.specs).toEqual(['x.y', 'z.w', 'q.r']);
  });

  test('상품별 지표: 쓰기 동작만 모수, API 검증·UI 대응 수, 모르는 동작·spec 보고', () => {
    const mapping = parseUiOperations(
      ['ske:', '  createcluster: container.ske-cluster', '  deletecluster: container.ske-cluster', '  listclusters: container.ske-cluster', '  nosuchop: x', 'ghost:', '  createx: y'].join('\n'),
    );
    const s = productOperations(snap([ske]), mapping, new Set(['container.ske-cluster']));
    expect(s.products).toHaveLength(1);
    const p = s.products[0]!;
    expect(p).toMatchObject({ product: 'Kubernetes Engine', category: 'Container', services: ['ske'], opsTotal: 4, apiVerified: 2, uiCovered: 2 });
    expect(p.ops.map((o) => o.name)).toEqual(['createcluster', 'deletecluster', 'setnodepool', 'setclusterupgrade']);
    expect(s.unknown).toEqual(['ske/listclusters', 'ske/nosuchop']);
    expect(s.unknownServices).toEqual(['ghost']);
    expect(s.unknownSpecs).toEqual(['x', 'y']);
    expect(operationsByCategory(s.products).get('Container')).toEqual({ opsTotal: 4, apiVerified: 2, uiCovered: 2 });
  });

  test('API_SERVICE 가 null 이어도 서비스 맵 상품이 있으면 붙인다, ops 없는 옛 스냅샷은 빠진다', () => {
    const sw = { category: 'management', service: 'servicewatch', total: 1, verified: 0, ok2xx: 0, ops: [{ name: 'createalert', method: 'POST', verified: false }] };
    const old = { category: 'networking', service: 'vpc', total: 10, verified: 5, ok2xx: 5 };
    const s = productOperations(snap([sw, old]), new Map());
    expect(s.products.map((p) => [p.product, p.opsTotal, p.uiCovered])).toEqual([['ServiceWatch', 1, 0]]);
    expect(productOperations(null, new Map()).products).toEqual([]);
  });

  test('스냅샷 JSON 은 동작 하나를 한 줄로 쓰고 다시 읽힌다', () => {
    const text = formatApiCoverageJson(snap([ske]));
    expect(text).toContain('{ "name": "createcluster", "method": "POST", "verified": true }');
    expect(JSON.parse(text)).toEqual(snap([ske]));
  });

  test('data/ui-operations.yaml 이 읽히고 동작이 비어 있지 않다', () => {
    const file = path.resolve(process.cwd(), 'data', 'ui-operations.yaml');
    const m = parseUiOperations(fs.readFileSync(file, 'utf8'));
    expect(m.get('ske')?.get('createcluster')?.specs).toContain('container.ske-cluster');
    for (const [svc, ops] of m) for (const [op, v] of ops) expect(v.specs.length, `${svc}/${op}`).toBeGreaterThan(0);
  });
});
