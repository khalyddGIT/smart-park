import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ANPRMonitor } from '../components/ANPRMonitor';

describe('ANPRMonitor - Monitor de Visión Computacional & Garita', () => {
  it('debe renderizar el panel del monitor con opciones de escáner LPR y QR', () => {
    render(<ANPRMonitor />);

    expect(screen.getByText(/Control de Garita & Lector LPR Inteligente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lector LPR de Placas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escáner de Pases QR/i })).toBeInTheDocument();
  });

  it('debe permitir ingresar placa manualmente y simular detección', async () => {
    const user = userEvent.setup();
    render(<ANPRMonitor />);

    const input = screen.getByDisplayValue('ABC-123');
    await user.clear(input);
    await user.type(input, 'XYZ-999');

    expect(input.value).toBe('XYZ-999');
  });

  it('debe mostrar los botones de verificación de ingreso y control de barrera', () => {
    render(<ANPRMonitor />);

    expect(screen.getByRole('button', { name: /Verificar Ingreso/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verificar Salida/i })).toBeInTheDocument();
    expect(screen.getByText(/Control de Barrera/i)).toBeInTheDocument();
  });
});
