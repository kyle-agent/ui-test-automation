import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  collectNodes,
  countScreens,
  diffScreenMaps,
  diffScreens,
  formatDiffMarkdown,
  formatScreensTxt,
  hasChanges,
  normalizeMenusApi,
  parseScreensTxt,
  type ScreenMap,
} from '../../src/service-map/screens';
import { SCREENS_TXT } from '../../src/service-map/io';

test.describe('screens.txt 파서', () => {
  test('실제 screens.txt 를 읽고 다시 써도 같은 트리가 나온다', () => {
    const text = fs.readFileSync(SCREENS_TXT, 'utf8');
    const map = parseScreensTxt(text);
    expect(map.services.length).toBe(89);
    expect(countScreens(map)).toBeGreaterThan(190);
    const again = parseScreensTxt(formatScreensTxt(map));
    expect(again.services).toEqual(map.services);
  });

  test('resource_type 과 [folder] 표기를 읽는다', () => {
    const map = parseScreensTxt(
      [
        '## Compute > Virtual Server | /virtualserver/dashboard [folder]',
        'Service Home | /virtualserver/dashboard',
        'Image | /virtualserver/image/list (image)',
      ].join('\n'),
    );
    expect(map.services[0]).toEqual({
      category: 'Compute',
      name: 'Virtual Server',
      route: '/virtualserver/dashboard',
      screens: [
        { name: 'Service Home', route: '/virtualserver/dashboard' },
        { name: 'Image', route: '/virtualserver/image/list', resource_type: 'image' },
      ],
    });
  });

  test('형식이 깨진 줄은 명확한 오류를 낸다', () => {
    expect(() => parseScreensTxt('Image /virtualserver/image/list')).toThrow(/서비스 헤더/);
    expect(() => parseScreensTxt('## Compute Virtual Server')).toThrow(/서비스 줄 형식/);
  });
});

test.describe('메뉴 API 정규화', () => {
  test('service_menu_ko JSON 문자열에서 화면을 수집한다', () => {
    const menu = JSON.stringify([
      { name: 'Service Home', path: '/iam/dashboard' },
      {
        name: '사용자 관리',
        children: [
          { name: '사용자', path: '#/iam/user/list', resource_type: 'user' },
          { name: '정책', path: '/iam/policy/list' },
        ],
      },
      { name: '외부 링크', url: 'https://example.com' },
    ]);
    const { map, unresolved } = normalizeMenusApi([
      {
        service_name_ko: 'IAM',
        category_name_ko: 'Management',
        service_route: '/iam',
        service_menu_ko: menu,
      },
      { garbage: true },
    ]);
    expect(unresolved).toHaveLength(1);
    expect(map.services).toEqual([
      {
        category: 'Management',
        name: 'IAM',
        route: '/iam',
        screens: [
          { name: 'Service Home', route: '/iam/dashboard' },
          { name: '사용자', route: '/iam/user/list', resource_type: 'user' },
          { name: '정책', route: '/iam/policy/list' },
        ],
      },
    ]);
  });

  test('진입 라우트가 없으면 첫 화면 라우트를 쓴다', () => {
    const { map } = normalizeMenusApi([
      {
        name: 'Backup',
        category: 'Storage',
        service_menu_ko: [{ name: 'Service Home', route: '/backup/dashboard' }],
      },
    ]);
    expect(map.services[0]?.route).toBe('/backup/dashboard');
    expect(collectNodes({ items: [{ label: 'A', to: '/a' }] })).toEqual([{ name: 'A', route: '/a' }]);
  });
});

test.describe('스냅샷 diff', () => {
  const base = (services: ScreenMap['services']): ScreenMap => ({
    generated_at: '2026-09-21T00:00:00.000Z',
    source: 'menus-api',
    services,
  });
  const vm = (screens: ScreenMap['services'][number]['screens']) => ({
    category: 'Compute',
    name: 'Virtual Server',
    route: '/virtualserver/dashboard',
    screens,
  });

  test('화면 추가/삭제/이름 변경/경로 변경을 구분한다', () => {
    const before = [
      { name: 'Image', route: '/vs/image/list' },
      { name: 'Keypair', route: '/vs/keypair/list' },
      { name: 'Server Group', route: '/vs/server-group/list' },
      { name: 'Old', route: '/vs/old' },
    ];
    const after = [
      { name: 'Image', route: '/vs/image/list' },
      { name: 'Key Pair', route: '/vs/keypair/list' },
      { name: 'Server Group', route: '/vs/servergroup/list' },
      { name: 'New', route: '/vs/new' },
    ];
    const kinds = diffScreens(before, after).map((c) => `${c.kind}:${c.after?.name ?? c.before?.name}`);
    expect(kinds).toEqual(['renamed:Key Pair', 'route_changed:Server Group', 'removed:Old', 'added:New']);
  });

  test('서비스 단위 추가/삭제와 요약, 마크다운 출력', () => {
    const before = base([
      vm([{ name: 'Image', route: '/vs/image/list' }]),
      { category: 'Security', name: 'WAF', route: '/waf', screens: [] },
    ]);
    const after = base([
      vm([
        { name: 'Image', route: '/vs/image/list' },
        { name: 'Snapshot', route: '/vs/snapshot/list' },
      ]),
      { category: 'AI-ML', name: 'AIOS', route: '/aios', screens: [] },
    ]);
    const diff = diffScreenMaps(before, after);
    expect(hasChanges(diff)).toBe(true);
    expect(diff.added_services.map((s) => s.name)).toEqual(['AIOS']);
    expect(diff.removed_services.map((s) => s.name)).toEqual(['WAF']);
    expect(diff.changed_services[0]?.changes[0]?.kind).toBe('added');
    expect(diff.summary).toEqual({
      services_before: 2,
      services_after: 2,
      screens_before: 1,
      screens_after: 2,
    });
    const md = formatDiffMarkdown(diff, 'a', 'b');
    expect(md).toContain('서비스 추가: AI-ML > AIOS');
    expect(md).toContain('화면 추가: Snapshot');
    expect(hasChanges(diffScreenMaps(before, before))).toBe(false);
    expect(formatDiffMarkdown(diffScreenMaps(before, before), 'a', 'a')).toContain('변경 없음');
  });
});
