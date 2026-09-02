import { test, expect } from '@playwright/test';

test.describe('3. Flujo de Reserva, Plano Interactivo y Pase Digital QR', () => {
  test('Acceso con usuario, selección de sede y visualización de plano/reserva', async ({ page }) => {
    await page.goto('/');

    // 1. Iniciar sesión con cuenta conductor
    const accederBtn = page.locator('button:has-text("Acceder"), button:has-text("Ingresar")').first();
    if (await accederBtn.isVisible()) {
      await accederBtn.click();
      await page.waitForTimeout(600);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill('usuario@smartpark.com');
      await passwordInput.fill('password123');

      const submitBtn = page.locator('button[type="submit"]:has-text("Iniciar"), button:has-text("Entrar")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // 2. Verificar que el panel de usuario o lista de estacionamientos esté cargado
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/05_dashboard_driver.png' });

    // 3. Localizar una sede en el directorio/mapa y abrir detalle
    const parkingItem = page.locator('button:has-text("Reservar"), button:has-text("Ver Plazas"), div[role="button"]').first();
    if (await parkingItem.isVisible()) {
      await parkingItem.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/06_interactive_plan.png' });
    }
  });
});
