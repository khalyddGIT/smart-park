/**
 * Utilidades de Validación y Formateo para Control de Garita y Registro de Placas
 * Normativa oficial MTC (Perú) - Placa Única Nacional de Rodaje
 * 
 * Reglas de Placas Peruanas:
 * 1. Exactamente 6 caracteres alfanuméricos separados por un guión (-).
 * 2. Vehículos mayores (Auto, SUV, Camioneta, Camión, Taxi):
 *    Formato: XXX-XXX (3 caracteres alfanuméricos + '-' + 3 caracteres alfanuméricos).
 *    Ejemplos: ABC-123, A1B-234, B8Z-910, D4E-567.
 * 3. Vehículos menores (Moto Lineal, Mototaxi, Trimóvil):
 *    Formato: 1234-5A (4-2), AB-1234 (2-4) o ABC-123 (3-3).
 * 4. Conductor / Teléfono opcional:
 *    - Nombre de conductor: letras, acentos, espacios, apóstrofe, puntos o guiones.
 *    - O teléfono peruano: 9 dígitos (9XXXXXXXX o +51 9XXXXXXXX).
 *    - Bloqueo de caracteres repetitivos basura (ej: fffffffffffff7777777).
 */

// Expresión regular oficial para vehículos mayores (Autos, SUVs, etc.): 3 alfanuméricos + '-' + 3 alfanuméricos
export const RE_AUTO_PLATE = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;

// Expresión regular oficial para vehículos menores (Motos, Mototaxis): 4-2, 2-4 o 3-3
export const RE_MOTO_PLATE = /^([A-Z0-9]{4}-[A-Z0-9]{2}|[A-Z0-9]{2}-[A-Z0-9]{4}|[A-Z0-9]{3}-[A-Z0-9]{3})$/;

// Expresión regular general de placas peruanas válidas (MTC)
export const RE_PERU_PLATE = /^([A-Z0-9]{3}-[A-Z0-9]{3}|[A-Z0-9]{4}-[A-Z0-9]{2}|[A-Z0-9]{2}-[A-Z0-9]{4})$/;

/**
 * Limpia y normaliza texto eliminando acentos, caracteres especiales y espacios.
 * Retorna solo letras mayúsculas A-Z y números 0-9.
 * @param {string} val
 * @param {number} maxChars - Límite de caracteres alfanuméricos (por defecto 6)
 * @returns {string}
 */
export function cleanAlphanumeric(val, maxChars = 6) {
  if (val === null || val === undefined) return '';
  return String(val)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxChars);
}

/**
 * Formatea en tiempo real la placa vehicular según los estándares peruanos (MTC):
 * - Convierte a mayúsculas
 * - Elimina caracteres no permitidos
 * - Inserta el guión (-) automáticamente en la posición adecuada:
 *     * 4 números iniciales -> moto 4-2 (ej: 1234-5A)
 *     * 2 letras seguidas de números -> moto 2-4 (ej: AB-1234)
 *     * Formato general -> 3-3 (ej: ABC-123)
 * - Respeta si el usuario ya escribió un guión
 * - Longitud máxima con guión: 7 caracteres (6 alfanuméricos + 1 guión)
 * 
 * @param {string} raw - Entrada en crudo del usuario
 * @returns {string} - Placa formateada
 */
export function formatPlateInput(raw) {
  if (!raw) return '';

  // 1. Limpieza inicial: permitir solo letras, números y un guión
  const sanitized = String(raw)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9-]/g, '');

  if (!sanitized) return '';

  // 2. Si el usuario escribió manualmente exactamente un guión (-):
  const hyphensCount = (sanitized.match(/-/g) || []).length;
  if (hyphensCount === 1) {
    const parts = sanitized.split('-');
    const part1 = parts[0].slice(0, 4);
    const part2 = parts[1].slice(0, 6 - part1.length);
    
    if (sanitized.endsWith('-') && part2.length === 0 && part1.length >= 2 && part1.length <= 4) {
      return `${part1}-`;
    }
    
    // Si la primera parte tiene entre 2 y 4 caracteres válidos
    if (part1.length >= 2 && part1.length <= 4) {
      return part2 ? `${part1}-${part2}` : part1;
    }
  }

  // 3. Si no hay guión único válido, extraer caracteres alfanuméricos puros
  const alnum = sanitized.replace(/-/g, '').slice(0, 6);

  // Formato moto 4-2: Si empieza con 4 dígitos (ej: 1234-5A)
  if (/^[0-9]{4}/.test(alnum)) {
    if (alnum.length > 4) {
      return `${alnum.slice(0, 4)}-${alnum.slice(4)}`;
    }
    return alnum;
  }

  // Formato moto 2-4: Si empieza con 2 letras seguidas de dígitos (ej: AB-1234)
  if (/^[A-Z]{2}[0-9]/.test(alnum)) {
    if (alnum.length > 2) {
      return `${alnum.slice(0, 2)}-${alnum.slice(2)}`;
    }
    return alnum;
  }

  // Formato estándar para autos y camionetas 3-3: (ej: ABC-123)
  if (alnum.length > 3) {
    return `${alnum.slice(0, 3)}-${alnum.slice(3)}`;
  }

  return alnum;
}

/**
 * Valida estrictamente si una placa cumple con la normativa vehicular peruana.
 * @param {string} plate
 * @returns {boolean}
 */
export function isValidPeruvianPlate(plate) {
  if (!plate || typeof plate !== 'string') return false;
  const p = plate.trim().toUpperCase();
  
  // Debe tener exactamente 7 caracteres (6 alfanuméricos + 1 guión)
  if (p.length !== 7) return false;
  if (!p.includes('-')) return false;

  const parts = p.split('-');
  if (parts.length !== 2) return false;
  if (parts[0].length + parts[1].length !== 6) return false;

  return RE_PERU_PLATE.test(p);
}

/**
 * Devuelve el estado de validación en tiempo real para feedback en la interfaz.
 * @param {string} plate
 * @returns {{
 *   isValid: boolean,
 *   isPartial: boolean,
 *   charCount: number,
 *   message: string,
 *   type: 'idle' | 'warning' | 'error' | 'success'
 * }}
 */
export function getPlateValidationState(plate) {
  if (!plate || plate.trim() === '') {
    return {
      isValid: false,
      isPartial: false,
      charCount: 0,
      message: 'Ingresa la placa del vehículo (ej: ABC-123)',
      type: 'idle'
    };
  }

  const clean = plate.trim().toUpperCase();
  const alnumCount = clean.replace(/[^A-Z0-9]/g, '').length;

  if (alnumCount < 6) {
    return {
      isValid: false,
      isPartial: true,
      charCount: alnumCount,
      message: `Completando placa (${alnumCount}/6 caracteres)`,
      type: 'warning'
    };
  }

  if (isValidPeruvianPlate(clean)) {
    return {
      isValid: true,
      isPartial: false,
      charCount: 6,
      message: 'Placa peruana válida',
      type: 'success'
    };
  }

  return {
    isValid: false,
    isPartial: false,
    charCount: alnumCount,
    message: 'Formato no válido (ej: ABC-123 o 1234-5A)',
    type: 'error'
  };
}

/**
 * Sanitiza la entrada del conductor / teléfono:
 * - Limita la longitud a un máximo razonable (50 caracteres)
 * - Previene repetición infinita de caracteres idénticos (antispam: máx 3 seguidos)
 * - Elimina símbolos no estándar ni permitidos en nombres o teléfonos
 * @param {string} val
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeDriverInput(val, maxLength = 50) {
  if (val === null || val === undefined) return '';
  let str = String(val)
    // Permitir letras, acentos, números, espacios, +, -, .
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s+\-.]/g, '')
    // Reducir caracteres repetidos consecutivos (ej: fffffff -> fff)
    .replace(/(.)\1{3,}/g, '$1$1$1')
    .slice(0, maxLength);

  // Evitar múltiples espacios en blanco consecutivos
  return str.replace(/\s{2,}/g, ' ');
}

/**
 * Valida si la entrada del conductor (opcional) es coherente:
 * - Si está vacío: válido (es campo opcional).
 * - Si es teléfono: debe tener 9 dígitos numéricos (ej: 987654321).
 * - Si es nombre: debe contener al menos 2 letras y no ser una mezcla caótica de letras y números repetitivos.
 * @param {string} val
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateDriverInput(val) {
  if (!val || val.trim() === '') {
    return { isValid: true, error: null };
  }

  const trimmed = val.trim();

  // Caso 1: Ingreso como número telefónico
  const onlyDigits = trimmed.replace(/\D/g, '');
  const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(trimmed);

  if (!hasLetters && onlyDigits.length > 0) {
    let cleanPhone = onlyDigits;
    if (cleanPhone.startsWith('51') && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (cleanPhone.length !== 9 || !cleanPhone.startsWith('9')) {
      return {
        isValid: false,
        error: 'El teléfono debe ser un celular de 9 dígitos que inicie con 9'
      };
    }
    return { isValid: true, error: null };
  }

  // Caso 2: Ingreso como nombre de conductor
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'El nombre debe tener al menos 2 caracteres'
    };
  }

  // Si contiene dígitos mezclados con letras de forma anómala (ej: ffffff777777)
  if (hasLetters && /\d/.test(trimmed)) {
    return {
      isValid: false,
      error: 'El nombre no debe contener números (o ingresa solo teléfono)'
    };
  }

  // Si tiene más de 3 consonantes idénticas seguidas
  if (/([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])\1{2,}/i.test(trimmed)) {
    return {
      isValid: false,
      error: 'Nombre con caracteres repetitivos no válido'
    };
  }

  return { isValid: true, error: null };
}

/**
 * Valida integralmente el formulario de registro de entrada en Garita.
 * @param {{
 *   plate: string,
 *   slot: string,
 *   driverName?: string,
 *   hours?: number,
 *   time?: string
 * }} formData
 * @returns {{
 *   isValid: boolean,
 *   errors: {
 *     plate?: string,
 *     slot?: string,
 *     driver?: string,
 *     hours?: string,
 *     time?: string
 *   }
 * }}
 */
export function validateGaritaEntryForm({ plate, slot, driverName, hours, time }) {
  const errors = {};

  // 1. Validación de placa
  if (!plate || !plate.trim()) {
    errors.plate = 'La placa del vehículo es obligatoria';
  } else if (!isValidPeruvianPlate(plate)) {
    errors.plate = 'Formato de placa inválido (ej: ABC-123 o 1234-5A)';
  }

  // 2. Validación de cajón
  if (!slot || !String(slot).trim()) {
    errors.slot = 'Debes seleccionar un cajón disponible';
  }

  // 3. Validación de conductor (opcional)
  if (driverName && driverName.trim()) {
    const driverVal = validateDriverInput(driverName);
    if (!driverVal.isValid) {
      errors.driver = driverVal.error || 'Dato de conductor no válido';
    }
  }

  // 4. Validación de tiempo de permanencia
  if (hours !== undefined && hours !== null) {
    const numHours = Number(hours);
    if (isNaN(numHours) || numHours <= 0) {
      errors.hours = 'Las horas de permanencia deben ser mayores a 0';
    } else if (numHours > 168) {
      errors.hours = 'El tiempo no puede exceder 168 horas (7 días)';
    }
  }

  // 5. Validación de hora de entrada (formato HH:MM)
  if (time && time.trim()) {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim())) {
      errors.time = 'Hora de entrada inválida (formato HH:MM)';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Sanitiza y formatea el teléfono en tiempo real para usuarios y conductores:
 * - Filtra cualquier letra o símbolo no permitido al escribir o pegar.
 * - Soporta formato celular nacional peruano (9 dígitos: 9XX XXX XXX).
 * - Soporta formato internacional con prefijo (+51 9XX XXX XXX).
 * - Permite borrar (backspace) libremente sin forzar prefijos bloqueantes.
 * @param {string} val
 * @returns {string}
 */
export function sanitizePhoneInput(val) {
  if (!val) return '';
  const str = String(val);
  if (str === '+' || str === '+5' || str === '+51') return str;
  const startsWithPlus = str.trim().startsWith('+');
  const digits = str.replace(/\D/g, '');
  if (!digits && startsWithPlus) return '+';
  if (!digits) return '';

  if (startsWithPlus || (digits.startsWith('51') && digits.length > 9)) {
    let national = digits;
    if (national.startsWith('51')) national = national.slice(2);
    national = national.slice(0, 9);
    if (national.length === 0) return '+51 ';
    if (national.length <= 3) return `+51 ${national}`;
    if (national.length <= 6) return `+51 ${national.slice(0, 3)} ${national.slice(3)}`;
    return `+51 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }

  const national = digits.slice(0, 9);
  if (national.length <= 3) return national;
  if (national.length <= 6) return `${national.slice(0, 3)} ${national.slice(3)}`;
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/**
 * Valida si el teléfono cumple con los estándares oficiales peruanos (9 dígitos, inicia con 9).
 * Si el campo está vacío, es válido (campo opcional).
 * @param {string} val
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validatePhoneInput(val) {
  if (!val || String(val).trim() === '') {
    return { isValid: true, error: null };
  }
  const raw = String(val).trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('51') && digits.length === 11) {
    digits = digits.slice(2);
  }
  if (!/^\d+$/.test(digits)) {
    return { isValid: false, error: 'El número de teléfono solo debe contener números.' };
  }
  if (digits.length < 9) {
    return { isValid: false, error: `El teléfono debe tener exactamente 9 dígitos (ingresaste ${digits.length}).` };
  }
  if (digits.length > 9) {
    return { isValid: false, error: `El teléfono no debe exceder 9 dígitos (ingresaste ${digits.length}).` };
  }
  if (!digits.startsWith('9')) {
    return { isValid: false, error: 'El celular debe iniciar con 9 (ej: 987 654 321 o +51 987 654 321).' };
  }
  return { isValid: true, error: null };
}
