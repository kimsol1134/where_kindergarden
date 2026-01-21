import { test, expect } from '@playwright/test';

test.describe('홈페이지', () => {
  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/우리동네 유치원/);
  });

  test('현재 위치로 검색 버튼이 표시된다', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /현재 위치로 검색/ })
    ).toBeVisible();
  });
});
