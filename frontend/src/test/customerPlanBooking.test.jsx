import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerInteractivePlanBooking } from '../components/CustomerInteractivePlanBooking';

describe('CustomerInteractivePlanBooking - Selección Interactiva en Plano CAD', () => {
  const mockParking = {
    id: 1,
    name: 'Smart Park Central San Isidro',
    address: 'Av. Javier Prado Este 456',
    hourlyRate: 8.50,
    hourly_rate: 8.50,
    tolerance_minutes: 15
  };

  it('debe renderizar el plano con selector rápido de plazas libres', () => {
    render(
      <CustomerInteractivePlanBooking
        parking={mockParking}
        onReserveSlot={vi.fn()}
      />
    );

    expect(screen.getByText(/Smart Park Central San Isidro/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmar Reserva de Plaza/i)).toBeInTheDocument();
    expect(screen.getByText(/Selector Rápido de Cajones Libres/i)).toBeInTheDocument();
  });

  it('debe permitir seleccionar un cajón libre y mostrar el botón de pago con Culqi', async () => {
    const user = userEvent.setup();
    render(
      <CustomerInteractivePlanBooking
        parking={mockParking}
        onReserveSlot={vi.fn()}
      />
    );

    // Seleccionar cajón libre A-01 usando el botón del selector rápido
    const quickSlotBtn = screen.getByRole('button', { name: /A-01/i });
    await user.click(quickSlotBtn);

    const matches = screen.getAllByText(/Cajón Seleccionado/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Pagar con Culqi/i })).toBeInTheDocument();
  });
});
