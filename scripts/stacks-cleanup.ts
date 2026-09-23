/**
 * 테스트가 남긴 리소스 점검·정리.
 *   npm run stacks:check              남은 리소스와 VPC 개수만 보여준다 (변경 없음)
 *   npm run stacks:cleanup            이름 규칙(<종류>-MMDD-HHMM-xxxx, IGW_vpc-…, Reserved 미연결 Public IP)에 맞는 것만 의존관계 역순으로 지운다
 * 사람이 만든 리소스(이름 규칙 불일치)는 목록에도 넣지 않는다. 로그인 브라우저(PW_CDP_URL)가 필요하다.
 */
import '../src/console/env';
import { connectLiveBrowser } from '../src/console/browser';
import { cleanupLeftovers, listLeftovers } from '../src/console/inventory';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const doCleanup = !!flags.yes;

async function main(): Promise<void> {
  const browser = await connectLiveBrowser();
  const page = await browser.contexts()[0]!.newPage();
  try {
    const { leftovers, vpcTotal } = await listLeftovers(page);
    console.log(`VPC ${vpcTotal}/5 (계정 한도)`);
    if (leftovers.length === 0) {
      console.log('남은 테스트 리소스 없음');
      return;
    }
    console.log(`남은 테스트 리소스 ${leftovers.length}개:`);
    for (const l of leftovers) console.log(`  ${l.kind.padEnd(6)} ${l.name}  ← ${l.rowText.slice(0, 90)}`);
    if (!doCleanup) {
      console.log('지우려면: npm run stacks:cleanup');
      return;
    }
    const errors = await cleanupLeftovers(page, leftovers);
    if (errors.length) {
      console.error(`정리 실패 ${errors.length}건:\n  ${errors.join('\n  ')}`);
      process.exitCode = 1;
    } else console.log('정리 완료');
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
