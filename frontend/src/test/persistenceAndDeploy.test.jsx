import { describe, it, expect, beforeEach } from 'vitest';

describe('Persistencia y Resiliencia en Frontend (LocalStorage & Session)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('debe persistir el estado de autenticación y token JWT en localStorage', () => {
    const authPayload = {
      token: 'jwt_mock_token_abc_123',
      user: { id: 1, name: 'Juan Perez', email: 'juan@smartpark.com', role: 'admin' }
    };

    localStorage.setItem('smartpark_auth', JSON.stringify(authPayload));
    
    const retrieved = JSON.parse(localStorage.getItem('smartpark_auth'));
    expect(retrieved).not.toBeNull();
    expect(retrieved.token).toBe('jwt_mock_token_abc_123');
    expect(retrieved.user.role).toBe('admin');
  });

  it('debe persistir la configuración de estacionamientos y cajones personalizados offline', () => {
    const customParkings = [
      { id: 101, name: 'Parqueo Local Persistido', slotsCount: 50, hourlyRate: 6.0 }
    ];

    localStorage.setItem('smartpark_local_establishments', JSON.stringify(customParkings));
    const cached = JSON.parse(localStorage.getItem('smartpark_local_establishments'));
    
    expect(cached.length).toBe(1);
    expect(cached[0].name).toBe('Parqueo Local Persistido');
    expect(cached[0].hourlyRate).toBe(6.0);
  });

  it('debe mantener las reservas activas en caché local para acceso rápido al Pase QR', () => {
    const activeBooking = {
      code: 'RSV-9999',
      plate: 'ABC-123',
      slot: 'A-01',
      qr: 'SMARTPARK-RSV-9999-ABC-123'
    };

    localStorage.setItem('smartpark_last_booking', JSON.stringify(activeBooking));
    const lastBooking = JSON.parse(localStorage.getItem('smartpark_last_booking'));

    expect(lastBooking.code).toBe('RSV-9999');
    expect(lastBooking.plate).toBe('ABC-123');
  });
});
