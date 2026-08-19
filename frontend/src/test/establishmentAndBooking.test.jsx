import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstablishmentProvider, useEstablishments } from '../context/EstablishmentContext';

const TestBookingConsumer = () => {
  const { establishments, reservations, createReservation } = useEstablishments();

  return (
    <div>
      <span data-testid="est-count">{establishments.length}</span>
      <span data-testid="res-count">{reservations.length}</span>
      <button
        onClick={() => {
          createReservation({
            establishmentId: 'EST-01',
            slotId: 'slot-1',
            plate: 'TEST-999',
            totalAmount: 15.0,
            startTime: '10:00',
            endTime: '12:00',
            durationHours: 2,
            paymentMethod: 'Culqi Visa',
            status: 'active'
          });
        }}
      >
        Crear Reserva Test
      </button>
    </div>
  );
};

describe('EstablishmentContext & Reservas - Pruebas de Integración', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe inicializar las cocheras registradas por defecto', () => {
    render(
      <EstablishmentProvider>
        <TestBookingConsumer />
      </EstablishmentProvider>
    );

    const count = screen.getByTestId('est-count');
    expect(Number(count.textContent)).toBeGreaterThan(0);
  });

  it('debe registrar una nueva reserva y persistirla en localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <EstablishmentProvider>
        <TestBookingConsumer />
      </EstablishmentProvider>
    );

    const initialResCount = Number(screen.getByTestId('res-count').textContent);

    // Crear reserva
    const createBtn = screen.getByText('Crear Reserva Test');
    await user.click(createBtn);

    // Verificar que aumentó la cuenta de reservas
    expect(Number(screen.getByTestId('res-count').textContent)).toBe(initialResCount + 1);

    // Verificar que localStorage tiene la reserva
    const saved = JSON.parse(localStorage.getItem('smart_park_unified_reservations_v2'));
    expect(saved).not.toBeNull();
    expect(saved.some(r => r.plate === 'TEST-999')).toBe(true);

    // Desmontar y volver a montar (simulando F5)
    unmount();
    render(
      <EstablishmentProvider>
        <TestBookingConsumer />
      </EstablishmentProvider>
    );

    // Debe seguir persistida
    expect(Number(screen.getByTestId('res-count').textContent)).toBe(initialResCount + 1);
  });
});
