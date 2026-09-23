/**
 * 입력값 변형 생성. 콘솔 폼이 라벨 아래에 써 주는 규칙("영문, 숫자와 특수문자(-)를 사용하여 3~20자", "CIDR 형식으로 /16~/28",
 * "8GB 단위로 제공되는 Unit") 을 읽어 유효값·경계값·금지값을 순서대로 낸다. 같은 필드를 여러 번 만나면 다음 변형으로 넘어간다.
 *
 * 이름은 정리 스크립트(src/console/inventory.ts)가 알아보는 규칙(<종류>-MMDD-HHMM-xxxx)을 따른다. 그래야 탐색 중 실제로 생성된
 * 리소스를 `npm run stacks:cleanup` 이 지울 수 있다.
 */

export interface Variation {
  value: string;
  /** 왜 이 값인지 (보고서용) */
  why: string;
  /** 폼이 받아들일 것으로 기대하는지. 서버가 다르게 판단하면 정보 항목으로 남긴다 */
  expectAccept: boolean;
}

const KIND_BY_ROUTE: [RegExp, string][] = [
  [/vpc\/vpc/, 'vpc'],
  [/vpc\/subnet/, 'sub'],
  [/virtualserver\/virtualserver/, 'vm'],
  [/block-storage/, 'vol'],
  [/securitygroup/, 'sg'],
];

export function resourceKind(route: string): string {
  return KIND_BY_ROUTE.find(([re]) => re.test(route))?.[1] ?? 'xp';
}

export function variationsFor(label: string, hint: string, runId: string, kind: string): Variation[] {
  const base = `${kind}-${runId}`;
  const h = hint.replace(/\s+/g, ' ');
  const range = h.match(/(\d+)\s*~\s*(\d+)\s*자/);
  if (/cidr|\/1[0-9]~\/2[0-9]|IP 대역/i.test(h) || /IP 대역|CIDR/i.test(label)) {
    const m = h.match(/\/(\d+)\s*~\s*\/(\d+)/);
    const lo = m ? Number(m[1]) : 16;
    const hi = m ? Number(m[2]) : 28;
    return [
      { value: `10.250.0.0/${lo + 4}`, why: `유효 CIDR (/${lo + 4})`, expectAccept: true },
      { value: `10.250.0.0/${lo - 1}`, why: `범위 밖 (/${lo - 1})`, expectAccept: false },
      { value: `10.250.0.0/${hi + 1}`, why: `범위 밖 (/${hi + 1})`, expectAccept: false },
      { value: '10.251.0.0/20', why: '관리용 대역 (콘솔이 막음)', expectAccept: false },
      { value: '999.0.0.0/20', why: '형식 오류', expectAccept: false },
    ];
  }
  if (/gateway ip|게이트웨이/i.test(label)) {
    return [
      { value: '10.250.0.1', why: '대역의 첫 IP', expectAccept: true },
      { value: '10.250.0.0', why: 'Network address (금지)', expectAccept: false },
      { value: '192.168.1.1', why: '대역 밖', expectAccept: false },
    ];
  }
  if (/unit|용량|GB/i.test(h) || /용량/.test(label)) {
    return [
      { value: '1', why: '최소 unit', expectAccept: true },
      { value: '0', why: '0 unit', expectAccept: false },
      { value: '2', why: '2 unit', expectAccept: true },
      { value: '-1', why: '음수', expectAccept: false },
      { value: '99999', why: '상한 초과', expectAccept: false },
    ];
  }
  if (/서버 수/.test(label)) {
    return [
      { value: '1', why: '1대', expectAccept: true },
      { value: '0', why: '0대', expectAccept: false },
    ];
  }
  if (/설명|description/i.test(label)) {
    const max = h.match(/(\d+)자 이내/)?.[1];
    const n = max ? Number(max) : 50;
    return [
      { value: `탐색 ${runId}`, why: '짧은 설명', expectAccept: true },
      { value: 'x'.repeat(n + 1), why: `${n + 1}자 (최대 ${n})`, expectAccept: false },
      { value: '<b>bold</b> & "quote"', why: 'HTML·따옴표', expectAccept: true },
    ];
  }
  // 이름류 (기본)
  const min = range ? Number(range[1]) : 3;
  const max = range ? Number(range[2]) : 20;
  const fit = (s: string) => s.slice(0, max);
  return [
    { value: fit(base), why: `유효 이름 (${min}~${max}자)`, expectAccept: true },
    {
      value: fit(base).slice(0, Math.max(1, min - 1)),
      why: `${min - 1}자 (최소 ${min})`,
      expectAccept: false,
    },
    {
      value: `${base}-${'x'.repeat(max)}`.slice(0, max + 1),
      why: `${max + 1}자 (최대 ${max})`,
      expectAccept: false,
    },
    { value: `${fit(base).slice(0, max - 3)}_@#`, why: '허용되지 않는 특수문자', expectAccept: false },
    { value: `한글${fit(base).slice(0, max - 2)}`, why: '한글', expectAccept: false },
    { value: '', why: '빈 값', expectAccept: false },
  ];
}
