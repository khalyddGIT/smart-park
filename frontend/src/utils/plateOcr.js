/**
 * Algoritmo de normalización y corrección de caracteres confusos de OCR
 * Adaptado del proyecto Cristiancano1236/parqueadero-lector-placas
 */

// Formatos estándar: 3 letras + 3 dígitos (Autos) o 3 letras + 2 dígitos + 1 letra (Motos)
const RE_CARRO = /^[A-Z]{3}\d{3}$/;
const RE_MOTO = /^[A-Z]{3}\d{2}[A-Z]$/;

const LETTER_FIX = { '0': 'O', '1': 'I', '8': 'B', '5': 'S', '2': 'Z', '6': 'G' };
const DIGIT_FIX = { 'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6' };

/**
 * Limpia y normaliza el texto extraído
 */
export function normalizarPlaca(placa) {
  if (!placa) return '';
  return String(placa)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Clasifica si es placa de auto, moto o formato inválido
 */
export function clasificarTipoPlaca(placa) {
  const p = normalizarPlaca(placa);
  if (RE_CARRO.test(p)) return 'carro';
  if (RE_MOTO.test(p)) return 'moto';
  return null;
}

/**
 * Corrige errores típicos de OCR (confusión entre letras y números por posición)
 */
export function corregirCaracteresPlaca(rawText) {
  const s = normalizarPlaca(rawText);
  if (s.length !== 6) return s;

  // Intentar corregir como Auto: 3 Letras + 3 Números
  let carro = '';
  let okCarro = true;
  for (let i = 0; i < 6; i++) {
    const ch = s[i];
    if (i < 3) {
      const v = /[A-Z]/.test(ch) ? ch : (LETTER_FIX[ch] || null);
      if (!v) { okCarro = false; break; }
      carro += v;
    } else {
      const v = /[0-9]/.test(ch) ? ch : (DIGIT_FIX[ch] || null);
      if (!v) { okCarro = false; break; }
      carro += v;
    }
  }
  if (okCarro && RE_CARRO.test(carro)) return carro;

  // Intentar corregir como Moto: 3 Letras + 2 Números + 1 Letra
  let moto = '';
  let okMoto = true;
  for (let i = 0; i < 6; i++) {
    const ch = s[i];
    if (i < 3 || i === 5) {
      const v = /[A-Z]/.test(ch) ? ch : (LETTER_FIX[ch] || null);
      if (!v) { okMoto = false; break; }
      moto += v;
    } else {
      const v = /[0-9]/.test(ch) ? ch : (DIGIT_FIX[ch] || null);
      if (!v) { okMoto = false; break; }
      moto += v;
    }
  }
  if (okMoto && RE_MOTO.test(moto)) return moto;

  return s;
}

/**
 * Formatea la placa con guión estético (ej. ABC-123)
 */
export function formatearPlacaConGuion(placa) {
  const limpia = normalizarPlaca(placa);
  if (limpia.length === 6) {
    return `${limpia.slice(0, 3)}-${limpia.slice(3)}`;
  }
  return placa;
}
