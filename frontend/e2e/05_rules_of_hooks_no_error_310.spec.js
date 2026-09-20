import { test, expect } from '@playwright/test';

test.describe('Rules of Hooks and Digital Access Pass Verification', () => {
  test('La aplicación carga sin Error #310 ni excepciones de renderizado de hooks', async ({ page }) => {
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Comprobar que no hay Error Boundary en pantalla ("Minified React error #310" u "Ocurrió un error inesperado")
    const errorBoundary = page.locator('text=Minified React error #310');
    await expect(errorBoundary).not.toBeVisible();

    const exceptionText = page.locator('text=La aplicación encontró una excepción al renderizar la vista');
    await expect(exceptionText).not.toBeVisible();

    // Navegar o interactuar con el estado para comprobar estabilidad
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Comprobar que no hubo react errors de hooks en consola
    const hookErrors = errorLogs.filter(e => 
      e.includes('310') || 
      e.includes('Rendered more hooks than during the previous render') ||
      e.includes('Rendered fewer hooks than during the previous render') ||
      e.includes('Rules of Hooks')
    );
    expect(hookErrors).toEqual([]);
  });

  test('Página de Verificación de Reserva (/verify) carga de forma limpia y sin errores de hooks', async ({ page }) => {
    const errorLogs = [];
    page.on('pageerror', err => {
      errorLogs.push(err.message);
    });

    await page.goto('/verify/RSV-TEST-123');
    await page.waitForLoadState('domcontentloaded');

    // Debe mostrar la vista de verificación sin error boundary
    const errorBoundary = page.locator('text=Minified React error #310');
    await expect(errorBoundary).not.toBeVisible();

    const title = page.locator('text=Verificación de Reserva').or(page.locator('text=Reserva No Encontrada'));
    await expect(title.first()).toBeVisible({ timeout: 10000 });
  });
});
