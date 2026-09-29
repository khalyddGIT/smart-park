import { test, expect } from '@playwright/test';

test.describe('2. Módulo de Autenticación y Login', () => {
  test('Apertura de modal de acceso y formulario de credenciales', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 1. Presionar el acceso principal por su nombre visible actual.
    const accederBtn = page.getByRole('button', { name: /Ingresar|Acceder/i }).first();
    await expect(accederBtn).toBeVisible({ timeout: 10000 });
    await accederBtn.click({ force: true });

    // 2. Esperar que aparezca el modal de autenticación
    const emailInput = page.getByRole('textbox', { name: /Correo o Nombre de Usuario/i });
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    const passwordInput = page.getByPlaceholder('••••••••');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // 3. Escribir credenciales de prueba
    await emailInput.fill('usuario@smartpark.com');
    await passwordInput.fill('password123');

    try {
      await page.screenshot({ path: 'e2e/screenshots/03_login_form.png', animations: 'disabled', timeout: 3000 });
    } catch {}

    // 4. Presionar "Iniciar Sesión"
    const submitBtn = page.getByRole('button', { name: /Ingresar al Sistema/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    try {
      await page.screenshot({ path: 'e2e/screenshots/04_authenticated_session.png', animations: 'disabled', timeout: 3000 });
    } catch {}
  });
});
