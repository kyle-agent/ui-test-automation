/**
 * Jev(OpenRouter decisions) 연결 진단. 작은 가짜 화면 상태로 결정 한 번을 요청한다 (약 $0.00003).
 *
 *   npm run jev:ping                 # 자동: HTTPS_PROXY 환경 변수 → npm proxy 설정 → 직접 연결
 *   npm run jev:ping -- --no-proxy   # 프록시를 무시하고 직접 연결
 *
 * 실패하면 실제 원인(DNS, 연결 거부, 인증서)과 어떤 경로를 썼는지 찍는다. 키 값은 절대 출력하지 않는다.
 */
import '../src/console/env';
import {
  DEFAULT_DECISIONS_URL,
  DEFAULT_MODEL,
  choose,
  proxyDispatcher,
  setProxyMode,
  type PageState,
} from '../src/jev/decide';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
if (flags['no-proxy']) setProxyMode('direct');

const state: PageState = {
  url: 'https://console.kr-west1.e.samsungsdscloud.com/console/#/vpc/vpc/list',
  title: 'VPC 목록 | VPC | kr-west1 | Console',
  w: 1440,
  h: 900,
  text: 'VPC\n총 0\n검색\n삭제\nVPC 생성',
  scroll: { y: 0, height: 900 },
  actions: [
    { id: 'e1', kind: 'click', node: 1, role: 'button', label: '삭제', value: '' },
    { id: 'e2', kind: 'click', node: 2, role: 'button', label: 'VPC 생성', value: '' },
    { id: 'e3', kind: 'fill', node: 3, role: 'searchbox', label: '검색', value: '' },
    { id: 'wait', kind: 'wait', label: 'Wait for the page to update' },
  ],
  marker: [],
  page_key: [],
  guards: {},
  omitted_actions: 0,
  fingerprint: 'ping',
};

async function main(): Promise<void> {
  const keySource = process.env.TYPESAFE_API_KEY
    ? 'TYPESAFE_API_KEY'
    : process.env.OPENROUTER_API_KEY
      ? 'OPENROUTER_API_KEY'
      : '(없음)';
  console.log(`엔드포인트: ${process.env.TYPESAFE_API_URL || DEFAULT_DECISIONS_URL}`);
  console.log(`모델: ${process.env.TYPESAFE_MODEL || DEFAULT_MODEL}, 키: ${keySource}`);
  console.log(`경로: ${proxyDispatcher().source}`);
  console.log(
    `TLS 설정: NODE_OPTIONS=${process.env.NODE_OPTIONS ?? '(없음)'}, NODE_USE_SYSTEM_CA=${process.env.NODE_USE_SYSTEM_CA ?? '(없음)'}, NODE_EXTRA_CA_CERTS=${process.env.NODE_EXTRA_CA_CERTS ?? '(없음)'}`,
  );
  const started = Date.now();
  const d = await choose(state, 'VPC 생성 버튼을 눌러 생성 화면을 연다', []);
  const chosen = state.actions.find((a) => a.id === d.choice);
  console.log(
    `\n성공 (${Date.now() - started}ms): ${d.operation}${chosen ? ` → [${chosen.id}] ${chosen.label}` : ''} p=${(d.probabilities[d.choice] ?? 0).toFixed(2)} conf=${d.confidence.toFixed(2)}`,
  );
  console.log(`모델 응답: ${d.model}, 비용 $${Number((d.usage as { cost?: number }).cost ?? 0).toFixed(6)}`);
  if (chosen?.id !== 'e2')
    console.log('주의: 기대한 "VPC 생성" 이 아닌 다른 요소를 골랐습니다. 연결은 정상입니다.');
}

main().catch((err: unknown) => {
  console.error(`\n실패: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
