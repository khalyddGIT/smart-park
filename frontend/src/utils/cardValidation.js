/**
 * Utilidades para Validación y Formateo Estricto de Tarjetas Bancarias (PCI-DSS)
 * Garantiza que solo se admitan dígitos, formato de 16 números en bloques de 4,
 * validación Luhn, fecha de expiración MM/AA y código de seguridad CVC.
 */

/**
 * Elimina cualquier caracter no numérico y limita a 16 dígitos.
 * @param {string|number} val
 * @param {number} maxDigits
 * @returns {string}
 */
export function cleanCardNumber(val, maxDigits = 16) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\D/g, '').slice(0, maxDigits);
}

/**
 * Formatea el número de tarjeta en bloques de 4 dígitos separados por un espacio:
 * Ejemplo: "4557 1234 5678 9012"
 * Si el usuario escribe letras o símbolos, se eliminan automáticamente.
 * @param {string|number} val
 * @returns {string}
 */
export function formatCardNumber(val) {
  const digits = cleanCardNumber(val, 16);
  if (!digits) return '';
  const chunks = digits.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : '';
}

/**
 * Detecta la franquicia de la tarjeta según el BIN oficial.
 * @param {string|number} val
 * @returns {'Visa' | 'Mastercard' | 'Amex' | 'Diners' | 'Discover' | 'Tarjeta'}
 */
export function detectCardBrand(val) {
  const digits = cleanCardNumber(val, 16);
  if (!digits) return 'Tarjeta';

  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(36|38|30[0-5])/.test(digits)) return 'Diners';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover';

  return 'Tarjeta';
}

/**
 * Algoritmo de Luhn (ISO/IEC 7812) para validar la integridad matemática del número.
 * @param {string|number} val
 * @returns {boolean}
 */
export function luhnCheck(val) {
  const digits = cleanCardNumber(val, 19);
  if (digits.length < 13) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Valida integralmente el número de tarjeta.
 * @param {string|number} val
 * @returns {{ isValid: boolean, clean: string, brand: string, error: string | null }}
 */
export function validateCardNumber(val) {
  const clean = cleanCardNumber(val, 16);
  const brand = detectCardBrand(clean);

  if (!clean) {
    return { isValid: false, clean, brand, error: 'El número de tarjeta es obligatorio.' };
  }

  if (clean.length < 16) {
    return {
      isValid: false,
      clean,
      brand,
      error: `Faltan dígitos. Deben ser 16 números (llevas ${clean.length}/16).`
    };
  }

  if (!luhnCheck(clean)) {
    return {
      isValid: false,
      clean,
      brand,
      error: 'Número de tarjeta inválido (falló checksum bancario Luhn).'
    };
  }

  return { isValid: true, clean, brand, error: null };
}

/**
 * Sanitiza el nombre del titular: solo letras, tildes y espacios.
 * Convierte a mayúsculas automáticamente.
 * @param {string} val
 * @returns {string}
 */
export function cleanCardHolder(val) {
  if (!val) return '';
  return String(val)
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 45)
    .toUpperCase();
}

/**
 * Valida el nombre del titular.
 * @param {string} val
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateCardHolder(val) {
  const cleaned = cleanCardHolder(val).trim();
  if (!cleaned) {
    return { isValid: false, value: '', error: 'El nombre del titular es obligatorio.' };
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (cleaned.length < 4 || parts.length < 2) {
    return {
      isValid: false,
      value: cleaned,
      error: 'Ingresa nombres y apellidos completos (como figura en la tarjeta).'
    };
  }

  return { isValid: true, value: cleaned, error: null };
}

/**
 * Formatea la fecha de expiración en MM/AA.
 * Solo acepta dígitos y formatea la barra automáticamente.
 * @param {string} val
 * @returns {string}
 */
export function formatExpiry(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  if (digits.length === 1) {
    // Si escribe 2-9, auto-agrega el cero adelante
    if (parseInt(digits, 10) > 1) {
      return `0${digits}/`;
    }
    return digits;
  }

  let month = digits.slice(0, 2);
  let mNum = parseInt(month, 10);
  if (mNum > 12) month = '12';
  if (mNum === 0) month = '01';

  if (digits.length === 2) {
    return `${month}/`;
  }

  const year = digits.slice(2, 4);
  return `${month}/${year}`;
}

/**
 * Valida si la fecha de expiración (MM/AA) es correcta y vigente.
 * @param {string} val
 * @returns {{ isValid: boolean, month: number, year: number, error: string | null }}
 */
export function validateExpiry(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length < 4) {
    return { isValid: false, month: 0, year: 0, error: 'Ingresa mes y año de expiración completo (MM/AA).' };
  }

  const month = parseInt(digits.slice(0, 2), 10);
  const year2Digits = parseInt(digits.slice(2, 4), 10);

  if (month < 1 || month > 12) {
    return { isValid: false, month, year: year2Digits, error: 'Mes inválido. Debe estar entre 01 y 12.' };
  }

  // Comparar con fecha actual (considerando año de 2 dígitos)
  const now = new Date();
  const currentYear2Digits = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year2Digits < currentYear2Digits || (year2Digits === currentYear2Digits && month < currentMonth)) {
    return { isValid: false, month, year: year2Digits, error: 'La tarjeta se encuentra expirada.' };
  }

  // Máximo 20 años a futuro
  if (year2Digits > currentYear2Digits + 20) {
    return { isValid: false, month, year: year2Digits, error: 'Año de expiración demasiado lejano.' };
  }

  return { isValid: true, month, year: year2Digits, error: null };
}

/**
 * Sanitiza el código CVC / CVV a solo dígitos (3 o 4 según marca).
 * @param {string|number} val
 * @param {string} brand
 * @returns {string}
 */
export function cleanCVC(val, brand = 'Tarjeta') {
  const max = brand === 'Amex' ? 4 : 4;
  return String(val || '').replace(/\D/g, '').slice(0, max);
}

/**
 * Valida el código CVC / CVV.
 * @param {string|number} val
 * @param {string} brand
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateCVC(val, brand = 'Tarjeta') {
  const cleaned = cleanCVC(val, brand);
  const requiredLen = brand === 'Amex' ? 4 : 3;

  if (!cleaned) {
    return { isValid: false, error: 'El código de seguridad CVV es obligatorio.' };
  }

  if (cleaned.length < 3 || cleaned.length > 4) {
    return { isValid: false, error: `El código CVV debe tener ${requiredLen} dígitos.` };
  }

  return { isValid: true, error: null };
}
