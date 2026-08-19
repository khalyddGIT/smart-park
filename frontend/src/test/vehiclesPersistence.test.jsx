import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehiclesModule } from '../components/VehiclesModule';

const STORAGE_KEY = 'smart_park_vehicles_v2';

describe('VehiclesModule - Persistencia y Gestión', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe renderizar la lista inicial de vehículos cuando localStorage está vacío', () => {
    render(<VehiclesModule />);
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();
    expect(screen.getByText('AYC-501')).toBeInTheDocument();
  });

  it('debe permitir eliminar un vehículo y persistir la eliminación en localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VehiclesModule />);

    // Verificar que el vehículo ABC-123 existe inicialmente
    expect(screen.getByText('ABC-123')).toBeInTheDocument();

    // Obtener todos los botones con texto 'Eliminar'
    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar/i });
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Hacer clic en eliminar el primer vehículo (ABC-123)
    await user.click(deleteButtons[0]);

    // Verificar que el vehículo ABC-123 fue removido del DOM
    expect(screen.queryByText('ABC-123')).toBeNull();

    // Verificar que localStorage se actualizó
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved).not.toBeNull();
    expect(saved.some(v => v.license_plate === 'ABC-123')).toBe(false);

    // Desmontar y volver a montar (simulando recarga de página / F5)
    unmount();
    render(<VehiclesModule />);

    // Verificar que ABC-123 NO reaparece tras recargar
    expect(screen.queryByText('ABC-123')).toBeNull();
  });

  it('debe registrar un nuevo vehículo y persistirlo tras recargar', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VehiclesModule />);

    // Abrir modal de agregar
    const addBtn = screen.getByRole('button', { name: /Nuevo Vehículo/i });
    await user.click(addBtn);

    // Llenar formulario
    const plateInput = screen.getByPlaceholderText('ABC-123');
    const brandInput = screen.getByPlaceholderText('Toyota');
    const modelInput = screen.getByPlaceholderText('Corolla');

    await user.type(plateInput, 'PER-777');
    await user.type(brandInput, 'Nissan');
    await user.type(modelInput, 'Sentra');

    // Guardar
    const saveBtn = screen.getByRole('button', { name: /Guardar Vehículo/i });
    await user.click(saveBtn);

    // Verificar que aparece en pantalla
    expect(screen.getByText('PER-777')).toBeInTheDocument();

    // Desmontar y volver a montar (F5)
    unmount();
    render(<VehiclesModule />);

    // Verificar que el nuevo auto persiste
    expect(screen.getByText('PER-777')).toBeInTheDocument();
  });
});
