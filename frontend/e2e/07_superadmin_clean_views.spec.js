import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Clean Views Verification', () => {
  test('El rol SuperAdmin no tiene vista de Monitoreo Cámara ni Padrón de Reservas', async ({ page }) => {
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errorLogs.push(msg.text());
    });
    page.on('pageerror', err => {
      errorLogs.push(err.message);
    });

    const mockSuperAdmin = {
      id: 'usr-superadmin-test',
      name: 'Super Admin',
      full_name: 'Super Admin',
      email: 'superadmin@smartpark.com',
      role: 'platform',
      is_active: true
    };

    // Interceptar llamadas al API con el prefijo /api/v1/
    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuperAdmin)
      });
    });

    await page.route('**/api/v1/establishments**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Inyectar usuario superadmin en localStorage
    await page.addInitScript(({ admin }) => {
      window.localStorage.setItem('smart_park_user_session', JSON.stringify(admin));
      window.localStorage.setItem('smart_park_access_token', 'mock-superadmin-jwt-token');
    }, { admin: mockSuperAdmin });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Comprobar que no hay Error Boundary ni React Error #310
    const errorBoundary = page.locator('text=Minified React error #310');
    await expect(errorBoundary).not.toBeVisible();

    // 2. Verificar que "Monitoreo Cámara" NO exista en la navegación
    const cameraNav = page.locator('button:has-text("Monitoreo Cámara")').or(page.locator('button:has-text("Cámara")'));
    await expect(cameraNav).toHaveCount(0);

    // 3. Verificar que "Padrón Reservas" NO exista en la navegación del superadmin
    const padronReservasNav = page.locator('button:has-text("Padrón Reservas")');
    await expect(padronReservasNav).toHaveCount(0);

    // 4. Verificar que las secciones permitidas del superadmin sigan presentes (Panel Global, Finanzas, etc.)
    const panelGlobalNav = page.locator('button:has-text("Panel Global")');
    await expect(panelGlobalNav.first()).toBeVisible({ timeout: 15000 });

    // Comprobar que no hubo react errors de hooks
    const hookErrors = errorLogs.filter(e => 
      e.includes('310') || 
      e.includes('Rendered more hooks than during the previous render') ||
      e.includes('Rendered fewer hooks than during the previous render') ||
      e.includes('Rules of Hooks')
    );
    expect(hookErrors).toEqual([]);
  });
});
