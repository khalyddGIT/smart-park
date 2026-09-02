import { test, expect } from '@playwright/test';

test.describe('3. Flujo de Reserva, Plano Interactivo y Pase Digital QR', () => {
  test('Acceso con usuario, selección de sede y visualización de plano/reserva', async ({ page }) => {
    await page.goto('/');

    // 1. Iniciar con sesión de conductor autenticado
    await page.addInitScript(() => {
      window.localStorage.setItem('smart_park_user_session', JSON.stringify({
        id: 1,
        name: 'Usuario Conductor Demo',
        email: 'usuario@smartpark.com',
        role: 'user',
        isGoogleAuth: false
      }));
    });

    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/05_dashboard_driver.png' });

    // 2. Localizar sede "Smart Park Plaza Mayor" y hacer click en "Ver Plano & Reservar"
    const verPlanoBtn = page.locator('button:has-text("Ver Plano & Reservar")').first();
    await expect(verPlanoBtn).toBeVisible({ timeout: 10000 });
    await verPlanoBtn.scrollIntoViewIfNeeded();
    await verPlanoBtn.click({ force: true });

    // 3. Esperar a que el visor arquitectónico del plano cargue sus elementos
    await page.waitForTimeout(2000);
    try {
      await page.screenshot({ path: 'e2e/screenshots/06_interactive_plan.png', animations: 'disabled', timeout: 5000 });
    } catch {}

    // 4. Verificar que el plano y la leyenda arquitectónica están visibles
    const tuPlazaText = page.locator('text=Tu Plaza').first();
    await expect(tuPlazaText).toBeVisible({ timeout: 10000 });

    // 5. Verificar elementos de reserva sin pago previo
    const tiemposText = page.locator('text=Dinámica de Tiempos').first();
    await expect(tiemposText).toBeVisible({ timeout: 10000 });

    const freeBookingBanner = page.locator('text=Reserva 100% Sin Pago Previo').first();
    await expect(freeBookingBanner).toBeVisible({ timeout: 10000 });

    const zeroNowBadge = page.locator('text=S/ 0.00 ahora').first();
    await expect(zeroNowBadge).toBeVisible({ timeout: 10000 });
  });
});
