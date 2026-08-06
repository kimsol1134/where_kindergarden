import { test, expect } from '@playwright/test';

test.describe('홈페이지', () => {
  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/우리동네 유치원/);
  });

  test('내 주변 유치원 찾기 링크가 위치 검색으로 연결된다', async ({ page }) => {
    await page.goto('/');
    const searchLink = page.getByRole('link', { name: '내 주변 유치원 찾기' }).first();
    await expect(searchLink).toBeVisible();
    await expect(searchLink).toHaveAttribute('href', /^\/search\/?\?mode=location$/);
  });
});
