/**
 * 유치원 후기 수집 통합 워크플로우
 *
 * 실행 순서:
 * 1. 수집 (collect:reviews:v3)
 * 2. URL 중복 제거 (dedupe:reviews)
 * 3. 큐레이션 (curate:reviews)
 * 4. 본문 추출 (fetch:review-content) — --with-content 옵션
 * 5. 스팸 필터링 (filter:reviews)
 * 6. 시군구 분할 (split:reviews)
 *
 * 사용법:
 *   pnpm collect:all -- --sido 11                # 서울 전체 프로세스 실행
 *   pnpm collect:all -- --sido 11 --with-content # 본문 추출 포함
 *   pnpm collect:all -- --sido 11 --test         # 테스트 모드
 */

import { spawn } from 'child_process';

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ 실행: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`명령어 실패 (code: ${code}): ${command}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  
  if (sidoIdx === -1 || !args[sidoIdx + 1]) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    console.error('사용법: pnpm collect:all -- --sido 11');
    process.exit(1);
  }
  
  const sidoCode = args[sidoIdx + 1];
  const isTest = args.includes('--test');
  const withContent = args.includes('--with-content');

  try {
    console.log(`=== 유치원 후기 수집 통합 워크플로우 시작 (시도: ${sidoCode}) ===`);
    if (withContent) console.log('  본문 추출 포함 모드');

    // 1. 수집 (collect:reviews:v3 - 지역 검증 + URL 중복 체크)
    const collectArgs = ['scripts/collect-reviews-v3.ts', '--sido', sidoCode];
    if (isTest) collectArgs.push('--test');
    if (!isTest) collectArgs.push('--max', '3');

    await runCommand('tsx', collectArgs);

    // 2. URL 중복 제거 (dedupe:reviews)
    await runCommand('tsx', ['scripts/dedupe-review-urls.ts', '--sido', sidoCode]);

    // 3. 큐레이션 (curate:reviews)
    await runCommand('tsx', ['scripts/curate-reviews.ts']);

    // 4. 본문 추출 (선택적 - Jina Reader API)
    if (withContent) {
      const fetchArgs = ['scripts/fetch-review-content.ts', '--sido', sidoCode];
      if (isTest) fetchArgs.push('--limit', '10');

      await runCommand('tsx', fetchArgs);
    }

    // 5. 스팸 필터링 (filter:reviews)
    await runCommand('tsx', ['scripts/filter-reviews.ts', '--sido', sidoCode]);

    // 6. 시군구 분할 (split:reviews)
    await runCommand('tsx', ['scripts/split-reviews.ts', '--sido', sidoCode]);

    console.log('\n=== 통합 워크플로우 완료! ===');
    console.log(`결과 확인: public/data/reviews/${sidoCode}/`);

  } catch (err) {
    console.error('\n워크플로우 실패:', err);
    process.exit(1);
  }
}

main();
