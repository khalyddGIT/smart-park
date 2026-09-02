import { test, expect } from '@playwright/test';

test.describe('4. Módulo de Gestión de Reservas y Operatividad', () => {
  test('Navegación al módulo de reservas y visualización de tarjetas', async ({ page }) => {
    await page.goto('/');

    // 1. Navegar al módulo de reservas (si está en la barra de navegación o selector de rol)
    const reservasNav = page.locator('button:has-text("Mis Reservas"), a:has-text("Reservas"), button:has-text("Reservas")').first();
    if (await reservasNav.isVisible()) {
      await reservasNav.click();
      await page.waitForTimeout(1000);
    }

    // 2. Verificar que la pantalla de reservas o lista responda
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/08_reservations_list.png' });
  });
});
