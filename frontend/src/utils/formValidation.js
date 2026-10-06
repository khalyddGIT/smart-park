/**
 * Utilidades Centralizadas de Validación de Formularios y Campos de Entrada
 * Sistema Smart-Park (Huamanga / Ayacucho - Normativa Peruana)
 *
 * Valida de forma rigurosa y pura:
 * - Correos electrónicos (Email RFC 5322)
 * - Contraseñas seguras y PINs de seguridad (4-6 dígitos)
 * - Documentos peruanos de identidad (DNI de 8 dígitos y RUC de 11 dígitos)
 * - Placas vehiculares peruanas (MTC)
 * - Años de vehículos (1970 a año corriente + 1)
 * - Nombres completos y razones sociales
 * - Horarios (formato HH:MM de 24 horas)
 * - Porcentajes y comisiones (0% a 100%)
 * - Números positivos y tarifas
 * - Coordenadas geográficas (Lat/Lng)
 * - Textos descriptivos, notas e incidencias
 */

import {
  isValidPeruvianPlate,
  formatPlateInput,
  validatePhoneInput as rawValidatePhoneInput,
  validateCapacityInput,
  validateRateInput
} from './garitaValidation.js';

/**
 * Validador de teléfono para formularios con soporte para celulares peruanos (9 dígitos)
 * y líneas comerciales fijas (7-9 dígitos).
 */
export const validatePhoneInput = (val, options = { allowLandline: true }) => {
  return rawValidatePhoneInput(val, options);
};

// Re-exportar validadores de garita para uso unificado
export {
  isValidPeruvianPlate,
  formatPlateInput,
  validateCapacityInput,
  validateRateInput
};

/**
 * Helper interno para formatear resultados con compatibilidad dual
 * (isValid/error y valid/message)
 */
function toResult(isValid, error, extra = {}) {
  return {
    isValid,
    valid: isValid,
    error: error || null,
    message: error || '',
    ...extra
  };
}

/**
 * Valida un correo electrónico con formato estándar y límites de longitud.
 * @param {string} email
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validateEmail(email, isRequired = true) {
  if (email === null || email === undefined || String(email).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, 'El correo electrónico es obligatorio.', { value: '' });
  }

  const clean = String(email).trim().toLowerCase();

  if (clean.length > 254) {
    return toResult(false, 'El correo electrónico es demasiado largo (máximo 254 caracteres).', { value: clean });
  }

  // RFC 5322 simplificada pero estricta con dominio y TLD de al menos 2 letras
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(clean)) {
    return toResult(false, 'Ingresa un correo electrónico válido (ej: usuario@empresa.com).', { value: clean });
  }

  return toResult(true, null, { value: clean });
}

/**
 * Valida contraseñas de usuario o administrador.
 * @param {string} password
 * @param {number} minLength - Por defecto 8 caracteres
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string }}
 */
export function validatePassword(password, minLength = 8, isRequired = true) {
  if (password === null || password === undefined || String(password).trim() === '') {
    if (!isRequired) return toResult(true, null);
    return toResult(false, 'La contraseña es obligatoria.');
  }

  const str = String(password);

  if (str.length < minLength) {
    return toResult(false, `La contraseña debe tener al menos ${minLength} caracteres.`);
  }

  if (str.length > 128) {
    return toResult(false, 'La contraseña no puede exceder los 128 caracteres.');
  }

  return toResult(true, null);
}

/**
 * Valida DNI peruano (Documento Nacional de Identidad): exactamente 8 dígitos numéricos.
 * @param {any} dni
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validateDni(dni, isRequired = true) {
  if (dni === null || dni === undefined || String(dni).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, 'El DNI es obligatorio.', { value: '' });
  }

  const clean = String(dni).replace(/\D/g, '');

  if (clean.length !== 8) {
    return toResult(false, `El DNI debe tener exactamente 8 dígitos numéricos (ingresaste ${clean.length}).`, { value: clean });
  }

  return toResult(true, null, { value: clean });
}

/**
 * Valida RUC peruano (Registro Único de Contribuyentes): exactamente 11 dígitos numéricos.
 * Prefijos válidos en Perú: 10, 15, 17 (personas naturales) o 20 (personas jurídicas).
 * @param {any} ruc
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validateRuc(ruc, isRequired = true) {
  if (ruc === null || ruc === undefined || String(ruc).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, 'El RUC es obligatorio.', { value: '' });
  }

  const clean = String(ruc).replace(/\D/g, '');

  if (clean.length !== 11) {
    return toResult(false, `El RUC debe tener exactamente 11 dígitos numéricos (ingresaste ${clean.length}).`, { value: clean });
  }

  const prefix = clean.slice(0, 2);
  const validPrefixes = ['10', '15', '16', '17', '20'];
  if (!validPrefixes.includes(prefix)) {
    return toResult(false, 'El RUC debe iniciar con 10, 15, 17 o 20 (normativa SUNAT).', { value: clean });
  }

  return toResult(true, null, { value: clean });
}

/**
 * Valida documento que puede ser DNI (8 dígitos) o RUC (11 dígitos).
 * @param {any} doc
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, type: 'DNI' | 'RUC' | null, value: string }}
 */
export function validateDniOrRuc(doc, isRequired = true) {
  if (doc === null || doc === undefined || String(doc).trim() === '') {
    if (!isRequired) return toResult(true, null, { type: null, value: '' });
    return toResult(false, 'El DNI o RUC es obligatorio.', { type: null, value: '' });
  }

  const clean = String(doc).replace(/\D/g, '');

  if (clean.length === 8) {
    return toResult(true, null, { type: 'DNI', value: clean });
  }

  if (clean.length === 11) {
    const rucVal = validateRuc(clean, true);
    return toResult(rucVal.isValid, rucVal.error, { type: rucVal.isValid ? 'RUC' : null, value: clean });
  }

  return toResult(false, `El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos (ingresaste ${clean.length} dígitos).`, { type: null, value: clean });
}

/**
 * Valida un PIN de seguridad numérico para garita u operaciones de supervisión.
 * @param {any} pin
 * @param {number} minDigits - Por defecto 4
 * @param {number} maxDigits - Por defecto 6
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validatePin(pin, minDigits = 4, maxDigits = 6, isRequired = true) {
  if (pin === null || pin === undefined || String(pin).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, 'El PIN de seguridad es obligatorio.', { value: '' });
  }

  const raw = String(pin).trim();
  const digits = raw.replace(/\D/g, '');

  if (digits !== raw) {
    return toResult(false, 'El PIN solo debe contener dígitos numéricos.', { value: digits });
  }

  if (digits.length < minDigits || digits.length > maxDigits) {
    return toResult(false, `El PIN debe tener entre ${minDigits} y ${maxDigits} dígitos numéricos.`, { value: digits });
  }

  return toResult(true, null, { value: digits });
}

/**
 * Valida el año de fabricación de un vehículo.
 * @param {any} year
 * @param {number} minYear - Por defecto 1970
 * @param {number} maxYear - Por defecto año actual + 1
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: number | null }}
 */
export function validateVehicleYear(year, minYear = 1970, maxYear = null, isRequired = true) {
  const currentMax = maxYear || (new Date().getFullYear() + 1);

  if (year === null || year === undefined || String(year).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: null });
    return toResult(false, 'El año del vehículo es obligatorio.', { value: null });
  }

  const clean = String(year).trim();
  if (!/^\d{4}$/.test(clean)) {
    return toResult(false, 'El año del vehículo debe ser un número de 4 dígitos (ej: 2022).', { value: null });
  }

  const numYear = parseInt(clean, 10);
  if (numYear < minYear || numYear > currentMax) {
    return toResult(false, `El año del vehículo debe estar entre ${minYear} y ${currentMax}.`, { value: null });
  }

  return toResult(true, null, { value: numYear });
}

/**
 * Valida nombres de personas o titulares.
 * Rechaza números, símbolos caóticos o cadenas excesivamente repetitivas.
 * @param {string} name
 * @param {number} minLength
 * @param {number} maxLength
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validateName(name, minLength = 2, maxLength = 100, isRequired = true) {
  if (name === null || name === undefined || String(name).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, 'El nombre es obligatorio.', { value: '' });
  }

  const clean = String(name).trim();

  if (clean.length < minLength) {
    return toResult(false, `El nombre debe tener al menos ${minLength} caracteres.`, { value: clean });
  }

  if (clean.length > maxLength) {
    return toResult(false, `El nombre no puede exceder ${maxLength} caracteres.`, { value: clean });
  }

  if (/\d/.test(clean)) {
    return toResult(false, 'El nombre no debe contener números.', { value: clean });
  }

  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(clean)) {
    return toResult(false, 'El nombre contiene caracteres especiales no válidos.', { value: clean });
  }

  if (/(.)\1{3,}/i.test(clean)) {
    return toResult(false, 'El nombre contiene caracteres repetitivos no válidos.', { value: clean });
  }

  return toResult(true, null, { value: clean });
}

/**
 * Valida formatos de hora HH:MM (24 horas).
 * @param {string} timeStr
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validateTime(timeStr, isRequired = true) {
  if (!timeStr || String(timeStr).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, 'La hora es obligatoria.', { value: '' });
  }

  const clean = String(timeStr).trim();
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(clean)) {
    return toResult(false, 'Formato de hora inválido. Usa el formato HH:MM de 24 horas (ej: 08:30 o 20:00).', { value: clean });
  }

  return toResult(true, null, { value: clean });
}

/**
 * Valida porcentajes de comisión o descuentos (0% a 100%).
 * @param {any} val
 * @param {number} min
 * @param {number} max
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: number | null }}
 */
export function validatePercentage(val, min = 0, max = 100, isRequired = true) {
  if (val === null || val === undefined || String(val).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: null });
    return toResult(false, 'El porcentaje es obligatorio.', { value: null });
  }

  const clean = String(val).replace(/%/g, '').trim();
  const num = parseFloat(clean);

  if (isNaN(num)) {
    return toResult(false, 'Ingresa un valor numérico de porcentaje válido.', { value: null });
  }

  if (num < min || num > max) {
    return toResult(false, `El porcentaje debe estar entre ${min}% y ${max}%.`, { value: null });
  }

  return toResult(true, null, { value: Number(num.toFixed(2)) });
}

/**
 * Valida que un número sea positivo (>= 0).
 * @param {any} val
 * @param {string} fieldName
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: number }}
 */
export function validatePositiveNumber(val, fieldName = 'Monto', isRequired = true) {
  if (val === null || val === undefined || String(val).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: 0 });
    return toResult(false, `${fieldName} es obligatorio.`, { value: 0 });
  }

  const num = Number(val);
  if (isNaN(num) || num < 0) {
    return toResult(false, `${fieldName} debe ser un número mayor o igual a 0.`, { value: 0 });
  }

  return toResult(true, null, { value: num });
}

/**
 * Valida una placa vehicular peruana estándar o menor con guión.
 * @param {string} plate
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, cleanPlate: string }}
 */
export function validatePlateInput(plate, autoFormat = false) {
  const p = String(plate || '').trim().toUpperCase();
  if (!p) {
    return toResult(false, 'La placa vehicular es requerida.', { cleanPlate: '' });
  }
  if (!autoFormat) {
    if (!isValidPeruvianPlate(p)) {
      const formatted = formatPlateInput(p);
      return toResult(false, 'Formato de placa inválido (ej: ABC-123 o 1234-5A). Debe incluir un guión.', { cleanPlate: formatted });
    }
    return toResult(true, null, { cleanPlate: p });
  }
  const formatted = formatPlateInput(p);
  const ok = isValidPeruvianPlate(formatted);
  if (!ok) {
    return toResult(false, 'Formato de placa inválido (ej: ABC-123 o 1234-5A). Debe incluir un guión.', { cleanPlate: formatted });
  }
  return toResult(true, null, { cleanPlate: formatted });
}

/**
 * Valida coordenadas geográficas (Latitud y Longitud).
 * @param {any} lat
 * @param {any} lng
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, lat: number | null, lng: number | null }}
 */
export function validateCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return toResult(false, 'Las coordenadas de latitud y longitud son obligatorias.', { lat: null, lng: null });
  }

  const nLat = Number(lat);
  const nLng = Number(lng);

  if (isNaN(nLat) || isNaN(nLng)) {
    return toResult(false, 'Las coordenadas deben ser números válidos.', { lat: null, lng: null });
  }

  if (nLat < -90 || nLat > 90) {
    return toResult(false, 'La latitud debe estar entre -90 y 90 grados.', { lat: null, lng: null });
  }

  if (nLng < -180 || nLng > 180) {
    return toResult(false, 'La longitud debe estar entre -180 y 180 grados.', { lat: null, lng: null });
  }

  return toResult(true, null, { lat: Number(nLat.toFixed(6)), lng: Number(nLng.toFixed(6)) });
}

/**
 * Valida campos de texto genérico (descripciones, notas, títulos, mensajes).
 * @param {string} text
 * @param {number} minLength
 * @param {number} maxLength
 * @param {string} fieldLabel
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, valid: boolean, error: string | null, message: string, value: string }}
 */
export function validateTextMinLength(text, minLength = 3, maxLength = 1000, fieldLabel = 'El campo', isRequired = true) {
  if (text === null || text === undefined || String(text).trim() === '') {
    if (!isRequired) return toResult(true, null, { value: '' });
    return toResult(false, `${fieldLabel} es obligatorio.`, { value: '' });
  }

  const clean = String(text).trim();

  if (clean.length < minLength) {
    return toResult(false, `${fieldLabel} debe tener al menos ${minLength} caracteres.`, { value: clean });
  }

  if (clean.length > maxLength) {
    return toResult(false, `${fieldLabel} no puede exceder ${maxLength} caracteres.`, { value: clean });
  }

  return toResult(true, null, { value: clean });
}

/**
 * Validador integral para formulario de registro de vehículo.
 * @param {{ license_plate: string, vehicle_type?: string, brand?: string, model?: string, color?: string, year?: any }} data
 * @returns {{ isValid: boolean, valid: boolean, errors: Record<string, string>, cleanPlate: string, cleanData: any }}
 */
export function validateVehicleForm(data = {}) {
  const errors = {};
  const cleanData = {};

  // 1. Placa vehicular
  const plateVal = validatePlateInput(data?.license_plate);
  if (!plateVal.valid) {
    errors.license_plate = plateVal.message;
  } else {
    cleanData.license_plate = plateVal.cleanPlate;
  }

  // 2. Tipo de vehículo
  const validTypes = ['auto', 'suv', 'mototaxi', 'moto', 'truck'];
  const vType = String(data.vehicle_type || 'auto').toLowerCase();
  cleanData.vehicle_type = validTypes.includes(vType) ? vType : 'auto';

  // 3. Marca y Modelo
  const brandVal = validateTextMinLength(data.brand, 2, 50, 'La marca', false);
  if (!brandVal.valid && data.brand) errors.brand = brandVal.message;
  cleanData.brand = brandVal.value || 'Toyota';

  const modelVal = validateTextMinLength(data.model, 1, 50, 'El modelo', false);
  if (!modelVal.valid && data.model) errors.model = modelVal.message;
  cleanData.model = modelVal.value || 'Modelo';

  // 4. Color
  cleanData.color = String(data.color || 'Gris').trim();

  // 5. Año
  if (data.year) {
    const yearVal = validateVehicleYear(data.year, 1970, new Date().getFullYear() + 1, false);
    if (!yearVal.valid) {
      errors.year = yearVal.message;
    } else {
      cleanData.year = yearVal.value;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
    cleanPlate: plateVal.cleanPlate || '',
    cleanData
  };
}

/**
 * Validador integral para formulario de personal / colaborador.
 * @param {{ full_name: string, dni: string, position?: string, parking_id?: any, email?: string, password?: string, security_pin?: string }} data
 * @returns {{ isValid: boolean, valid: boolean, errors: Record<string, string>, cleanData: any }}
 */
export function validateStaffForm(data = {}) {
  const errors = {};
  const cleanData = {};

  // 1. Nombre completo
  const nameVal = validateName(data.full_name, 2, 100, true);
  if (!nameVal.valid) {
    errors.full_name = nameVal.message;
  } else {
    cleanData.full_name = nameVal.value;
  }

  // 2. DNI peruano
  const dniVal = validateDni(data.dni, true);
  if (!dniVal.valid) {
    errors.dni = dniVal.message;
  } else {
    cleanData.dni = dniVal.value;
  }

  // 3. Cargo
  cleanData.position = String(data.position || 'Operador de Garita').trim();

  // 4. Sede asignada
  if (!data.parking_id || isNaN(Number(data.parking_id))) {
    errors.parking_id = 'Debes seleccionar una sede válida para el personal.';
  } else {
    cleanData.parking_id = Number(data.parking_id);
  }

  // 5. Correo (opcional)
  if (data.email && String(data.email).trim() !== '') {
    const emailVal = validateEmail(data.email, false);
    if (!emailVal.valid) {
      errors.email = emailVal.message;
    } else {
      cleanData.email = emailVal.value;
    }
  }

  // 6. Contraseña (opcional o si se activa acceso)
  if (data.password && String(data.password).trim() !== '') {
    const pwdVal = validatePassword(data.password, 8, false);
    if (!pwdVal.valid) {
      errors.password = pwdVal.message;
    } else {
      cleanData.password = String(data.password);
    }
  }

  // 7. PIN de seguridad (opcional para garita)
  if (data.security_pin && String(data.security_pin).trim() !== '') {
    const pinVal = validatePin(data.security_pin, 4, 4, false);
    if (!pinVal.valid) {
      errors.security_pin = pinVal.message;
    } else {
      cleanData.security_pin = pinVal.value;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
    cleanData
  };
}
