import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { formatApiCoverageJson, type ApiCoverageSnapshot } from '../../src/report/api-coverage';
import {
  consoleOnlyWrites,
  isWriteOp,
  operationsByCategory,
  parseUiOperations,
  pathMatches,
  productOperations,
  splitConsoleWrite,
} from '../../src/report/operations';

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
    expect(isWriteOp('secretsmanager', { name: 'showsecretsmanagersecretvalue', method: 'POST' })).toBe(
      false,
    );
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
    expect(m.get('ske')!.get('createcluster')).toEqual({
      specs: ['container.ske-cluster'],
      uncertain: false,
    });
    expect(m.get('ske')!.get('setnodepool')).toEqual({ specs: ['a.b', 'c.d'], uncertain: true });
    expect(m.get('ske')!.has('setclusterupgrade')).toBe(false);
    expect(m.get('vpc')!.get('createvpc')!.specs).toEqual(['x.y', 'z.w', 'q.r']);
  });

  test('상품별 지표: 쓰기 동작만 모수, API 검증·UI 대응 수, 모르는 동작·spec 보고', () => {
    const mapping = parseUiOperations(
      [
        'ske:',
        '  createcluster: container.ske-cluster',
        '  deletecluster: container.ske-cluster',
        '  listclusters: container.ske-cluster',
        '  nosuchop: x',
        'ghost:',
        '  createx: y',
      ].join('\n'),
    );
    const s = productOperations(snap([ske]), mapping, new Set(['container.ske-cluster']));
    expect(s.products).toHaveLength(1);
    const p = s.products[0]!;
    expect(p).toMatchObject({
      product: 'Kubernetes Engine',
      category: 'Container',
      services: ['ske'],
      opsTotal: 4,
      apiVerified: 2,
      uiCovered: 2,
    });
    expect(p.ops.map((o) => o.name)).toEqual([
      'createcluster',
      'deletecluster',
      'setnodepool',
      'setclusterupgrade',
    ]);
    expect(s.unknown).toEqual(['ske/listclusters', 'ske/nosuchop']);
    expect(s.unknownServices).toEqual(['ghost']);
    expect(s.unknownSpecs).toEqual(['x', 'y']);
    expect(operationsByCategory(s.products).get('Container')).toEqual({
      opsTotal: 4,
      apiVerified: 2,
      uiCovered: 2,
    });
  });

  test('API_SERVICE 가 null 이어도 서비스 맵 상품이 있으면 붙인다, ops 없는 옛 스냅샷은 빠진다', () => {
    const sw = {
      category: 'management',
      service: 'servicewatch',
      total: 1,
      verified: 0,
      ok2xx: 0,
      ops: [{ name: 'createalert', method: 'POST', verified: false }],
    };
    const old = { category: 'networking', service: 'vpc', total: 10, verified: 5, ok2xx: 5 };
    const s = productOperations(snap([sw, old]), new Map());
    expect(s.products.map((p) => [p.product, p.opsTotal, p.uiCovered])).toEqual([['ServiceWatch', 1, 0]]);
    expect(productOperations(null, new Map()).products).toEqual([]);
  });

  test('스냅샷 JSON 은 동작 하나를 한 줄로 쓰고 다시 읽힌다', () => {
    const text = formatApiCoverageJson(snap([ske]));
    expect(text).toContain('{ "name": "createcluster", "method": "POST", "verified": true }');
    expect(JSON.parse(text)).toEqual(snap([ske]));
    const withPath = {
      ...ske,
      ops: [{ name: 'createcluster', method: 'POST', verified: true, path: '/v1/clusters' }],
    };
    const t2 = formatApiCoverageJson(snap([withPath]));
    expect(t2).toContain(
      '{ "name": "createcluster", "method": "POST", "verified": true, "path": "/v1/clusters" }',
    );
    expect(JSON.parse(t2)).toEqual(snap([withPath]));
  });

  test('콘솔 전용 쓰기 동작: 통과한 실행의 쓰기 요청 중 카탈로그 경로에 없는 것만, {id} 는 {…} 와 맞춘다', () => {
    expect(splitConsoleWrite('PUT /console/api/firewall/v1/firewalls/rules/bulk')).toEqual({
      method: 'PUT',
      service: 'firewall',
      path: '/v1/firewalls/rules/bulk',
    });
    expect(splitConsoleWrite('POST /sso/login')).toBeNull();
    expect(pathMatches('/v1/vpcs/{vpc_id}', '/v1/vpcs/{id}')).toBe(true);
    expect(pathMatches('/v1/firewalls/rules/{firewall_rule_id}', '/v1/firewalls/rules/bulk')).toBe(false); // strict: 식별자 파라미터는 식별자꼴과만
    expect(
      pathMatches(
        '/v1/apis/{api_id}/stages/{stage_name}/config',
        '/v1/apis/{id}/stages/stg-1014-1128-f0b5/config',
      ),
    ).toBe(true); // 이름 파라미터는 아무 세그먼트
    expect(
      pathMatches(
        '/v1/apis/{api_id}/resources/{resource_id}/methods/{method_type}',
        '/v1/apis/{id}/resources/{id}/methods/GET',
      ),
    ).toBe(true);
    expect(
      pathMatches(
        '/v1/tags/{region}/{service}/{resource_type}/{resource_identifier}',
        '/v1/tags/global/iam/role/{id}',
      ),
    ).toBe(true);
    expect(
      splitConsoleWrite(
        'PUT /console/api/resourcemanager/v1/tags/c3JuOmU6OjE3ZTY0MjIzOTg4YjQxNDY5YTY1NjJlNGZmY2E5YmM0OmtyLXdlc3QxOjprbXM6a21zLzg0M2MwZDIyNWI4YzQwMmNiYTQ5MWJlNmU3MjhjMDU3/bulk',
      )?.path,
    ).toBe('/v1/tags/{id}/bulk');
    expect(splitConsoleWrite('DELETE /console/api/scr/v1/container-registries/pjkpjr{id}')?.path).toBe(
      '/v1/container-registries/{id}',
    );
    expect(splitConsoleWrite('DELETE /console/api/objectstorage/v1/buckets/bkt-1014-1207-31bd')?.path).toBe(
      '/v1/buckets/{id}',
    );
    expect(pathMatches('/v1/firewalls/rules/{firewall_rule_id}', '/v1/firewalls/rules/bulk', 'loose')).toBe(
      true,
    );
    expect(
      pathMatches('/v1/clusters/{id}/public-access-control', '/v1/clusters/{id}/service-watch-logging'),
    ).toBe(false);
    expect(pathMatches('/v1/vpcs', '/v1/vpcs/{id}')).toBe(false);
    const api = snap([
      {
        category: 'networking',
        service: 'firewall',
        total: 3,
        verified: 3,
        ok2xx: 3,
        ops: [
          {
            name: 'setfirewallrule',
            method: 'PUT',
            verified: true,
            path: '/v1/firewalls/rules/{firewall_rule_id}',
          },
          {
            name: 'deletefirewallrule',
            method: 'DELETE',
            verified: true,
            path: '/v1/firewalls/rules/{firewall_rule_id}',
          },
          { name: 'createfirewallrule', method: 'POST', verified: true, path: '/v1/firewalls/rules' },
          { name: 'listfirewallrules', method: 'GET', verified: true, path: '/v1/firewalls/rules' },
        ],
      },
      {
        ...ske,
        ops: [
          {
            name: 'setclusterlogging',
            method: 'PUT',
            verified: false,
            path: '/v1/clusters/{cluster_id}/logging',
          },
        ],
      },
    ]);
    const rows = consoleOnlyWrites(api, [
      {
        spec: 'networking.firewall',
        status: 'pass',
        started: '2026-10-14T01:00:00Z',
        api_writes: [
          'PUT /console/api/firewall/v1/firewalls/rules/{id}',
          'POST /console/api/firewall/v1/firewalls/rules',
          'DELETE /console/api/firewall/v1/firewalls/rules/bulk',
        ],
      },
      {
        spec: 'container.ske-cluster',
        status: 'pass',
        started: '2026-10-14T02:00:00Z',
        api_writes: [
          'PUT /console/api/ske/v1/clusters/{id}/service-watch-logging',
          'PUT /console/api/ske/v1/clusters/{id}/logging',
        ],
      },
      {
        spec: 'container.ske-cluster',
        status: 'fail',
        started: '2026-10-14T03:00:00Z',
        api_writes: ['POST /console/api/ske/v1/only-in-failed-run'],
      },
      {
        spec: 'storage.object-storage-bucket',
        status: 'pass',
        started: '2026-10-14T04:00:00Z',
        api_writes: [
          'POST /console/api/objectstorage/v1/buckets',
          'PUT /console/api/objectstorage/v1/buckets/bkt-1014-1207-31bd/versioning',
        ],
      },
    ]);
    expect(
      rows.map((r) => `${r.method} ${r.path} <- ${r.specs.join(',')}${r.loose ? ' ?' : ''} [${r.kind}]`),
    ).toEqual([
      'DELETE /v1/firewalls/rules/bulk <- networking.firewall ? [write]', // deletefirewallrule 의 {id} 자리에 bulk → 느슨한 일치 = 콘솔 전용 의심
      'PUT /v1/clusters/{id}/service-watch-logging <- container.ske-cluster [write]',
      'POST /v1/buckets <- storage.object-storage-bucket [no-api-service]', // objectstorage 는 카탈로그에 서비스가 없다
      'PUT /v1/buckets/{id}/versioning <- storage.object-storage-bucket [no-api-service]',
    ]);
    expect(rows[2]!.product).toBe('Object Storage');
    expect(rows[1]!.product).toBe('Kubernetes Engine');
    expect(
      consoleOnlyWrites(snap([ske]), [
        { spec: 'a', status: 'pass', started: '', api_writes: ['PUT /console/api/x/v1/y'] },
      ]),
    ).toEqual([]); // 경로 없는 옛 스냅샷이면 판단 불가 → 빈 목록
  });

  test('data/ui-operations.yaml 이 읽히고 동작이 비어 있지 않다', () => {
    const file = path.resolve(process.cwd(), 'data', 'ui-operations.yaml');
    const m = parseUiOperations(fs.readFileSync(file, 'utf8'));
    expect(m.get('ske')?.get('createcluster')?.specs).toContain('container.ske-cluster');
    for (const [svc, ops] of m)
      for (const [op, v] of ops) expect(v.specs.length, `${svc}/${op}`).toBeGreaterThan(0);
  });
});
