import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'desktop-2560', width: 2560, height: 1440 },
];

async function expectNoPageOverflow(page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(metrics.documentWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function openLanding(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
}

async function openDriverDashboard(page) {
  const driver = {
    id: 'responsive-driver',
    name: 'Usuario Responsive',
    email: 'responsive@smartpark.pe',
    role: 'user',
    is_active: true,
  };

  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const body = url.includes('/auth/me') ? driver : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript((user) => {
    window.localStorage.setItem('smart_park_user_session', JSON.stringify(user));
    window.localStorage.setItem('smart_park_access_token', 'responsive-test-token');
  }, driver);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Estacionamientos Inteligentes en Ayacucho')).toBeVisible({ timeout: 15000 });
}

test.describe('8. Composición responsive', () => {
  for (const viewport of viewports) {
    test(`landing sin desbordamiento en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openLanding(page);
      await expectNoPageOverflow(page);
      await page.screenshot({
        path: `e2e/screenshots/responsive-${viewport.name}.png`,
        fullPage: false,
        animations: 'disabled',
      });
    });
  }

  test('modal de acceso usable en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openLanding(page);
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByRole('textbox', { name: /Correo o Nombre de Usuario/i })).toBeVisible();
    await expectNoPageOverflow(page);
    await page.screenshot({
      path: 'e2e/screenshots/responsive-mobile-login.png',
      fullPage: false,
      animations: 'disabled',
    });
  });

  for (const viewport of [viewports[0], viewports[1], viewports[3]]) {
    test(`panel autenticado adaptable en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openDriverDashboard(page);

      await expectNoPageOverflow(page);
      if (viewport.width < 1024) {
        await expect(page.getByRole('navigation', { name: 'Navegación Móvil Principal' })).toBeVisible();
      } else {
        await expect(page.getByTitle('Colapsar menú lateral')).toBeVisible();
      }
      await page.screenshot({
        path: `e2e/screenshots/responsive-dashboard-${viewport.name}.png`,
        fullPage: false,
        animations: 'disabled',
      });
    });
  }
});
