/**
 * 유치원 후기 수집 통합 워크플로우
 * 
 * 실행 순서:
 * 1. 수집 (collect:reviews)
 * 2. 큐레이션 (curate:reviews)
 * 3. 스팸 필터링 (filter:reviews)
 * 4. 시군구 분할 (split:reviews)
 * 
 * 사용법:
 *   pnpm collect:all -- --sido 11    # 서울 전체 프로세스 실행
 */

import { spawn } from 'child_process';
import * as path from 'path';

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
  
  try {
    console.log(`=== 유치원 후기 수집 통합 워크플로우 시작 (시도: ${sidoCode}) ===`);
    
    // 1. 수집 (collect:reviews)
    const collectArgs = ['scripts/collect-reviews.ts', '--sido', sidoCode];
    if (isTest) collectArgs.push('--test');
    // 테스트 모드가 아니면 max 3개 정도로 설정 (API 쿼터 고려)
    if (!isTest) collectArgs.push('--max', '3'); 
    
    await runCommand('tsx', collectArgs);
    
    // 2. 큐레이션 (curate:reviews)
    // 큐레이션은 수집된 raw 파일 전체를 처리하므로 별도 인자 불필요하지만
    // 명시적으로 실행됨을 알림
    await runCommand('tsx', ['scripts/curate-reviews.ts']);
    
    // 3. 스팸 필터링 (filter:reviews)
    // 수집 직후 필터링하여 품질 확보
    await runCommand('tsx', ['scripts/filter-reviews.ts', '--sido', sidoCode]);
    
    // 4. 시군구 분할 (split:reviews)
    await runCommand('tsx', ['scripts/split-reviews.ts', '--sido', sidoCode]);
    
    console.log('\n=== 통합 워크플로우 완료! ===');
    console.log(`결과 확인: public/data/reviews/${sidoCode}/`);
    
  } catch (err) {
    console.error('\n❌ 워크플로우 실패:', err);
    process.exit(1);
  }
}

main();
