import { expect, test } from '@playwright/test';

test('location permission dialog owns keyboard focus and closes with Escape', async ({ page }) => {
  await page.goto('/search/?mode=location');

  const dialog = page.getByRole('dialog', { name: '주변 유치원을 찾기 위해' });
  const allowButton = page.getByRole('button', { name: '위치 허용하기' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(allowButton).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '나중에' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('desktop detail drawer stays inside the viewport and receives focus', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 768, 'desktop drawer assertion');

  await page.goto(
    '/search/?lat=35.2377227705893&lng=129.015079597986&address=' +
      encodeURIComponent('부산광역시 북구 금곡대로330번길 20')
  );

  await page.getByText('21세기유치원', { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: '21세기유치원 상세 정보' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: '상세 정보 닫기' })).toBeFocused();
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });

  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(await dialog.evaluate((element) => element.parentElement === document.body)).toBe(true);

  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('mobile detail drawer is modal and traps keyboard focus', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, 'mobile drawer assertion');

  await page.goto(
    '/search/?lat=35.2377227705893&lng=129.015079597986&address=' +
      encodeURIComponent('부산광역시 북구 금곡대로330번길 20')
  );

  await page.getByText('21세기유치원', { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: '21세기유치원 상세 정보' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByRole('button', { name: '상세 정보 닫기' })).toBeFocused();
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });

  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(await dialog.evaluate((element) => element.parentElement === document.body)).toBe(true);

  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
