import { test, expect } from '@playwright/test';

test.describe('Driver Reservation UX Verification', () => {
  test('La vista de Mis Reservas del conductor carga componentes de alta experiencia sin excepciones', async ({ page }) => {
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errorLogs.push(err.message);
    });

    const mockDriver = {
      id: 'usr-driver-test',
      name: 'Carlos Conductor',
      full_name: 'Carlos Conductor',
      email: 'conductor@smartpark.pe',
      role: 'user',
      is_active: true,
      phone: '+51 966 123 456'
    };

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600000);
    const mockReservations = [
      {
        id: 1001,
        code: 'RSV-ACT-001',
        qr_code: 'RSV-ACT-001',
        parking_name: 'Cochera San Martín Centro',
        parking_id: 'EST-01',
        slot_code: 'A-02',
        license_plate: 'ABC-123',
        plate: 'ABC-123',
        customer_name: 'Carlos Conductor',
        status: 'ACTIVE',
        start_time: now.toISOString(),
        end_time: oneHourLater.toISOString(),
        startTime: now.toISOString(),
        expiresAt: oneHourLater.toISOString(),
        total_cost: 10.00,
        cost: 10.00,
        ratePerHour: 5.00,
        prepaid: true,
        payNow: true,
        latitude: -13.1631,
        longitude: -74.2236
      },
      {
        id: 1002,
        code: 'RSV-CMP-002',
        qr_code: 'RSV-CMP-002',
        parking_name: 'Estacionamiento 9 de Diciembre',
        parking_id: 'EST-02',
        slot_code: 'B-05',
        license_plate: 'ABC-123',
        plate: 'ABC-123',
        customer_name: 'Carlos Conductor',
        status: 'COMPLETED',
        start_time: new Date(now.getTime() - 86400000).toISOString(),
        end_time: new Date(now.getTime() - 82800000).toISOString(),
        startTime: new Date(now.getTime() - 86400000).toISOString(),
        expiresAt: new Date(now.getTime() - 82800000).toISOString(),
        total_cost: 15.00,
        cost: 15.00,
        ratePerHour: 5.00,
        prepaid: true,
        payNow: true
      }
    ];

    // Interceptar llamadas al API con el prefijo real /api/v1/
    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDriver)
      });
    });

    await page.route('**/api/v1/reservations/my-reservations', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReservations)
      });
    });

    await page.route('**/api/v1/reservations', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReservations)
      });
    });

    await page.route('**/api/v1/payments/my', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Inyectar usuario conductor en localStorage usando las keys oficiales
    await page.addInitScript(({ driver, res }) => {
      window.localStorage.setItem('smart_park_user_session', JSON.stringify(driver));
      window.localStorage.setItem('smart_park_access_token', 'mock-driver-jwt-token');
      window.localStorage.setItem('smart_park_reservations', JSON.stringify(res));
    }, { driver: mockDriver, res: mockReservations });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Navegar a la pestaña "Mis Reservas" desde la barra lateral
    const navReservasBtn = page.locator('button:has-text("Mis Reservas")');
    await expect(navReservasBtn.first()).toBeVisible({ timeout: 15000 });
    await navReservasBtn.first().click();

    // 1. Comprobar que no hay Error Boundary ni React Error #310
    const errorBoundary = page.locator('text=Minified React error #310');
    await expect(errorBoundary).not.toBeVisible();

    // 2. Verificar KPI Cards para conductor: "Mis Estancias" y "En Cochera Ahora"
    const kpiEstancias = page.locator('text=Mis Estancias').or(page.locator('text=Total Reservas'));
    await expect(kpiEstancias.first()).toBeVisible({ timeout: 10000 });

    // 3. Verificar pestañas orientadas al conductor: "En Curso & Próximas"
    const tabProximas = page.locator('text=En Curso & Próximas');
    await expect(tabProximas.first()).toBeVisible();

    // 4. Verificar chip de placa estilo peruano (PE • ABC-123)
    const peruvianPlate = page.locator('text=ABC-123');
    await expect(peruvianPlate.first()).toBeVisible();

    // 5. Verificar botón de Pase QR
    const qrPassBtn = page.locator('button:has-text("Pase QR")').or(page.locator('text=Pase QR'));
    await expect(qrPassBtn.first()).toBeVisible();

    // 6. Verificar botón "Cómo llegar" (GPS Navigation)
    const gpsBtn = page.locator('button:has-text("Cómo llegar")');
    await expect(gpsBtn.first()).toBeVisible();

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
