import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CulqiPaymentModal } from '../components/CulqiPaymentModal';

describe('CulqiPaymentModal - Pasarela de Pagos', () => {
  const mockBookingData = {
    parkingName: 'Smart Park Central San Isidro',
    slotCode: 'A-01',
    plate: 'ABC-123',
    hourlyRate: 5.0,
    hours: 2,
    total: 10.0,
    startTime: '14:00',
    endTime: '16:00'
  };

  it('debe renderizar los 4 métodos de pago disponibles en pestañas', () => {
    render(
      <CulqiPaymentModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
        bookingData={mockBookingData}
      />
    );

    expect(screen.getByRole('button', { name: /Tarjeta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yape/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agentes CIP/i })).toBeInTheDocument();
  });

  it('debe calcular y mostrar correctamente el monto total en Soles (S/)', () => {
    render(
      <CulqiPaymentModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
        bookingData={mockBookingData}
      />
    );

    const amounts = screen.getAllByText(/10\.00/i);
    expect(amounts.length).toBeGreaterThan(0);
  });

  it('debe permitir seleccionar métodos de pago alternativos como Yape y Plin', async () => {
    const user = userEvent.setup();
    render(
      <CulqiPaymentModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
        bookingData={mockBookingData}
      />
    );

    // Cambiar a Yape
    const yapeBtn = screen.getByRole('button', { name: /Yape/i });
    await user.click(yapeBtn);
    expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();

    // Cambiar a Plin
    const plinBtn = screen.getByRole('button', { name: /Plin/i });
    await user.click(plinBtn);
    expect(screen.getByText(/Escanea el QR con Plin/i)).toBeInTheDocument();
  });
});
