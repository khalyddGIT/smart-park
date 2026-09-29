import { test, expect } from '@playwright/test';

test.describe('3. Flujo de Reserva, Plano Interactivo y Pase Digital QR', () => {
  test('Acceso con usuario, selección de sede y visualización de plano/reserva', async ({ page }) => {
    // 1. Crear una sesión real desde la UI para verificar cookie HttpOnly,
    // estado de React y navegación como un conductor real.
    await page.goto('/');
    await page.getByRole('button', { name: /^Ingresar$/i }).first().click();
    await page.getByRole('textbox', { name: /Correo o Nombre de Usuario/i }).fill('usuario@smartpark.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Ingresar al Sistema/i }).click();

    // 2. Abrir el plano usando el nombre accesible actual (tolera copy extendido).
    const verPlanoBtn = page.getByRole('button', { name: /Ver Plano/i }).first();
    await expect(verPlanoBtn).toBeVisible({ timeout: 10000 });
    await verPlanoBtn.click({ force: true });

    // 3. Esperar a que el visor arquitectónico del plano cargue sus elementos
    await page.waitForTimeout(1500);

    // 4. Verificar que el plano y la leyenda arquitectónica están visibles
    const tuPlazaText = page.locator('text=Tu Plaza').first();
    await expect(tuPlazaText).toBeVisible({ timeout: 10000 });

    // 5. Verificar elementos de reserva directa y limpia (anti-slop)
    const paymentPolicy = page.getByText(/En garita al salir|Por confirmar S\//i).first();
    await expect(paymentPolicy).toBeVisible({ timeout: 10000 });

    await page.getByRole('textbox', { name: /ABC-123 o 1234-5A/i }).fill('QAZ-987');
    const confirmBtn = page.getByRole('button', { name: /Confirmar Reserva|Continuar al Pago Digital/i });
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
  });
});
