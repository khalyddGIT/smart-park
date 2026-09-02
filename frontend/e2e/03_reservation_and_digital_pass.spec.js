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
    await page.waitForTimeout(1000);

    // 2. Localizar sede "Smart Park Plaza Mayor" y hacer click en "Ver Plano & Reservar"
    const verPlanoBtn = page.locator('button:has-text("Ver Plano & Reservar")').first();
    await expect(verPlanoBtn).toBeVisible({ timeout: 10000 });
    await verPlanoBtn.click({ force: true });

    // 3. Esperar a que el visor arquitectónico del plano cargue sus elementos
    await page.waitForTimeout(1500);

    // 4. Verificar que el plano y la leyenda arquitectónica están visibles
    const tuPlazaText = page.locator('text=Tu Plaza').first();
    await expect(tuPlazaText).toBeVisible({ timeout: 10000 });

    // 5. Verificar elementos de reserva directa y limpia (anti-slop)
    const totalEstimado = page.locator('text=Total estimado al salir').first();
    await expect(totalEstimado).toBeVisible({ timeout: 10000 });

    const confirmBtn = page.locator('button:has-text("Confirmar Reserva")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
  });
});
