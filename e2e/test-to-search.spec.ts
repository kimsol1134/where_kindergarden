import { test, expect } from '@playwright/test';

test.describe('모바일 성향 테스트에서 추천 검색까지', () => {
  test.skip(({ isMobile }) => !isMobile, '모바일 플로우 전용');

  test('테스트 결과에서 추천 조건 검색으로 이동한다', async ({ page }) => {
    await page.goto('/test', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: '테스트 시작하기' }).click();

    for (let index = 0; index < 7; index += 1) {
      await page.locator('button').nth(0).click();
    }

    await expect(page.getByText('우리 아이는 사교형 탐험가!')).toBeVisible();

    await page.getByRole('button', { name: '추천 조건으로 기관 보기' }).click();

    await expect(page).toHaveURL(/\/search\/\?hasBus=1&sort=capacity/);
    await expect(page.getByText('유치원 검색을 시작해보세요')).toBeVisible();
    await expect(page.getByRole('button', { name: /셔틀버스/ })).toBeVisible();
  });
});
