import { describe, it, expect } from 'vitest';
import {
  normalizarPlaca,
  clasificarTipoPlaca,
  corregirCaracteresPlaca,
  formatearPlacaConGuion
} from '../utils/plateOcr';

describe('Utilidades de OCR y Reconocimiento de Placas (ANPR)', () => {
  it('normalizarPlaca: debe limpiar caracteres especiales, espacios y pasar a mayúsculas', () => {
    expect(normalizarPlaca('abc-123')).toBe('ABC123');
    expect(normalizarPlaca('  xyz . 987 ')).toBe('XYZ987');
    expect(normalizarPlaca('a#b$c%4&5*6')).toBe('ABC456');
    expect(normalizarPlaca(null)).toBe('');
  });

  it('clasificarTipoPlaca: debe identificar correctamente carros y motos', () => {
    expect(clasificarTipoPlaca('ABC-123')).toBe('carro');
    expect(clasificarTipoPlaca('XYZ-45A')).toBe('moto');
    expect(clasificarTipoPlaca('INVALIDO12345')).toBeNull();
  });

  it('corregirCaracteresPlaca: debe corregir confusiones típicas de OCR (letras por números y viceversa)', () => {
    // Confusión: '0' en vez de 'O' al inicio, y 'O' en vez de '0' al final
    expect(corregirCaracteresPlaca('0BC12O')).toBe('OBC120');
    // Confusión: '1' en vez de 'I', '8' en vez de 'B', 'S' en vez de '5'
    expect(corregirCaracteresPlaca('18CS23')).toBe('IBC523');
  });

  it('formatearPlacaConGuion: debe formatear con guión estándar (ABC-123)', () => {
    expect(formatearPlacaConGuion('ABC123')).toBe('ABC-123');
    expect(formatearPlacaConGuion('abc123')).toBe('ABC-123');
    expect(formatearPlacaConGuion('XYZ45A')).toBe('XYZ-45A');
  });
});
