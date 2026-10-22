import { expect, test } from '@playwright/test';
import {
  buttonsOf,
  classifyButton,
  countTree,
  DIS,
  productMenu,
  renderTreeMarkdown,
  screenTitle,
  type ScreenTree,
} from '../../src/service-map/screen-tree';

test.describe('화면 트리(순수 부분)', () => {
  test('버튼 분류: 여는 것만 누르고 위험한 것은 라벨만', () => {
    expect(classifyButton('VPC 생성')).toBe('opens');
    expect(classifyButton('서비스 생성')).toBe('opens');
    expect(classifyButton('IP 대역 추가')).toBe('opens');
    expect(classifyButton('삭제')).toBe('destructive');
    expect(classifyButton('서비스 해지')).toBe('destructive');
    expect(classifyButton('재시작')).toBe('destructive');
    expect(classifyButton('생성 후 배포')).toBe('destructive'); // 배포가 섞이면 안 누른다
    expect(classifyButton('수정', true)).toBe('needs-row');
    expect(classifyButton('새로고침')).toBe('other');
    expect(classifyButton('초기화')).toBe('destructive');
  });

  test('프로브 버튼 라벨의 비활성 표시 분리', () => {
    expect(buttonsOf({ buttons: ['VPC 생성', `삭제${DIS}`, `수정${DIS}`] })).toEqual([
      { label: 'VPC 생성', kind: 'opens', disabled: undefined },
      { label: '삭제', kind: 'destructive', disabled: true },
      { label: '수정', kind: 'needs-row', disabled: true },
    ]);
    expect(screenTitle('VPC 목록 | VPC | kr-west1 | Console')).toBe('VPC 목록');
  });

  test('왼쪽 메뉴에서 이 상품의 메뉴만, 하위 메뉴는 들여쓰기', () => {
    const menu = [
      { label: 'VPC', route: '/vpc/vpc/list', depth: 1 },
      { label: 'Subnet', route: '/vpc/subnet/list', depth: 1 },
      { label: '고급', route: '/vpc/advanced', depth: 1 },
      { label: 'Port', route: '/vpc/port/list', depth: 2 },
      { label: 'Server', route: '/virtualserver/virtualserver/list', depth: 1 },
    ];
    expect(productMenu(menu, '/vpc/dashboard')).toEqual([
      { label: 'VPC', route: '/vpc/vpc/list' },
      { label: 'Subnet', route: '/vpc/subnet/list' },
      { label: '고급', route: '/vpc/advanced' },
      { label: '  Port', route: '/vpc/port/list' },
    ]);
  });

  test('집계·마크다운', () => {
    const tree: ScreenTree = {
      generatedAt: '2026-10-22T05:00:00.000Z',
      services: [
        {
          category: 'Networking',
          name: 'VPC',
          screens: [
            {
              name: 'VPC',
              route: '/vpc/vpc/list',
              title: 'VPC 목록',
              tabs: [],
              rows: 2,
              buttons: [
                {
                  label: 'VPC 생성',
                  kind: 'opens',
                  opens: { type: 'page', route: '/vpc/vpc/create', title: 'VPC 생성', controls: 3 },
                },
                { label: '삭제', kind: 'destructive', disabled: true },
              ],
              rowActions: ['서비스 해지'],
              detail: {
                route: '/vpc/vpc/detail',
                title: 'VPC 상세',
                tabs: [
                  { label: '기본 정보' },
                  { label: 'IP 대역 관리', route: '/vpc/vpc/detail/ip-range', buttons: ['IP 대역 추가'] },
                ],
                buttons: [],
                edits: ['설명'],
              },
              menu: [
                { label: 'VPC', route: '/vpc/vpc/list' },
                { label: '  Port', route: '/vpc/port/list' },
              ],
              crawledAt: '2026-10-22T05:00:00.000Z',
            },
            {
              name: 'Subnet',
              route: '/vpc/subnet/list',
              tabs: [],
              buttons: [],
              rowActions: [],
              error: '시간 초과',
              crawledAt: '2026-10-22T05:00:00.000Z',
            },
          ],
        },
      ],
    };
    expect(countTree(tree)).toEqual({
      services: 1,
      screens: 2,
      tabs: 0,
      detailScreens: 1,
      detailTabs: 1,
      createPages: 1,
      modals: 0,
      subMenus: 1,
      edits: 1,
      errors: 1,
      total: 5,
    });
    const md = renderTreeMarkdown(tree);
    expect(md).toContain('화면 합계 5');
    expect(md).toContain('▶VPC 생성 → 화면 `/vpc/vpc/create` "VPC 생성" (입력 3)');
    expect(md).toContain('✕삭제');
    expect(md).toContain('탭 IP 대역 관리 `/vpc/vpc/detail/ip-range`');
    expect(md).toContain('⚠ 시간 초과');
  });
});
