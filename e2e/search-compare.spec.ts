import { test, expect } from '@playwright/test';

test.describe('모바일 검색에서 비교까지', () => {
  test.skip(({ isMobile }) => !isMobile, '모바일 플로우 전용');

  test.use({
    geolocation: {
      latitude: 37.5665,
      longitude: 126.978,
    },
    permissions: ['geolocation'],
  });

  test('랜딩에서 검색을 시작하고 상세를 거쳐 비교 페이지로 진입한다', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('link', { name: /내 주변 유치원 찾기/ }).click();

    await expect(page).toHaveURL(/\/search\//);
    await expect(page.getByText('서울덕수초등학교병설유치원')).toBeVisible({
      timeout: 20000,
    });

    await page.getByText('서울덕수초등학교병설유치원').first().click();

    await expect(page.getByRole('button', { name: '상세 정보 닫기' })).toBeVisible();
    await expect(page.getByText('비용 보기')).toBeVisible();

    await page.getByRole('button', { name: '+ 비교함에 담기' }).click();
    await page.getByRole('button', { name: '상세 정보 닫기' }).click({ force: true });

    await expect(page.getByText('1개 기관을 비교할 준비가 됐어요')).toBeVisible();

    await page.getByRole('link', { name: /비교하기/ }).click();

    await expect(page).toHaveURL(/\/compare\/\?/);
    await expect(page.getByText('기관 비교하기')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '서울덕수초등학교병설유치원' }).first()
    ).toBeVisible();
  });
});
