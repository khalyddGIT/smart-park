import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DigitalAccessPassModal } from '../components/DigitalAccessPassModal';

describe('DigitalAccessPassModal - Pase Digital con Código QR', () => {
  const mockReservation = {
    code: 'RSV-7788',
    token: 'SPK-7788-ABC',
    parking: 'Smart Park Central San Isidro',
    slot: 'A-05',
    plate: 'PE-9876',
    hours: 3,
    cost: 25.50,
    startTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString()
  };

  it('debe renderizar la información de la reserva, cajón, placa y monto', () => {
    render(
      <DigitalAccessPassModal
        isOpen={true}
        onClose={() => {}}
        reservation={mockReservation}
      />
    );

    expect(screen.getByText(/Smart Park Central San Isidro/i)).toBeInTheDocument();
    expect(screen.getByText(/A-05/i)).toBeInTheDocument();
    expect(screen.getByText(/PE-9876/i)).toBeInTheDocument();
    expect(screen.getByText(/RSV-7788/i)).toBeInTheDocument();
  });

  it('debe contener botones de copia de token e impresión de pase', () => {
    render(
      <DigitalAccessPassModal
        isOpen={true}
        onClose={() => {}}
        reservation={mockReservation}
      />
    );

    expect(screen.getByRole('button', { name: /Imprimir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copiar Token/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Listo, Entendido/i })).toBeInTheDocument();
  });
});
