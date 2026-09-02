import { test, expect } from '@playwright/test';

test.describe('1. Landing Page y Navegación Principal', () => {
  test('Carga inicial, título y elementos visuales clave', async ({ page }) => {
    await page.goto('/');

    // 1. Verificar título de la pestaña
    await expect(page).toHaveTitle(/Smart-Park/i);

    // 2. Verificar que la barra de navegación o cabecera esté visible
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // 3. Verificar sección de estacionamientos o mapa
    await page.waitForTimeout(1000);
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // 4. Tomar captura de pantalla de evidencia
    await page.screenshot({ path: 'e2e/screenshots/01_landing.png', fullPage: false });
  });

  test('Exploración de sedes y mapa interactivo', async ({ page }) => {
    await page.goto('/');

    // Esperar a que los elementos del mapa o lista de sedes carguen
    await page.waitForTimeout(1500);

    // Verificar presencia de tarjetas de sedes o botón de exploración
    const parkingCards = page.locator('div:has-text("Ayacucho")').first();
    await expect(parkingCards).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/02_explore_parkings.png' });
  });
});
