import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanAlphanumeric,
  formatPlateInput,
  isValidPeruvianPlate,
  getPlateValidationState,
  sanitizeDriverInput,
  validateDriverInput,
  validateGaritaEntryForm,
  RE_AUTO_PLATE,
  RE_MOTO_PLATE,
  RE_PERU_PLATE
} from './garitaValidation.js';

// ============================================================================
// 1. Limpieza Alfanumérica
// ============================================================================
test('cleanAlphanumeric - convierte a mayúsculas y filtra símbolos o espacios', () => {
  assert.equal(cleanAlphanumeric('abc-123'), 'ABC123');
  assert.equal(cleanAlphanumeric('  a1b - 234  '), 'A1B234');
  assert.equal(cleanAlphanumeric('fbbbbbbffffffffffffffff'), 'FBBBBB'); // Trunca a 6
  assert.equal(cleanAlphanumeric('áéíóú123'), 'AEIOU1');
  assert.equal(cleanAlphanumeric(null), '');
  assert.equal(cleanAlphanumeric(undefined), '');
  assert.equal(cleanAlphanumeric(''), '');
});

// ============================================================================
// 2. Formateo en Vivo de Placa (formatPlateInput)
// ============================================================================
test('formatPlateInput - formatea progresivamente placas estándar de autos (3-3)', () => {
  assert.equal(formatPlateInput('a'), 'A');
  assert.equal(formatPlateInput('ab'), 'AB');
  assert.equal(formatPlateInput('abc'), 'ABC');
  assert.equal(formatPlateInput('abc1'), 'ABC-1');
  assert.equal(formatPlateInput('abc12'), 'ABC-12');
  assert.equal(formatPlateInput('abc123'), 'ABC-123');
});

test('formatPlateInput - formatea placas de vehículos menores (motos 4-2 y 2-4)', () => {
  // Moto 4-2 (1234-5A)
  assert.equal(formatPlateInput('1234'), '1234');
  assert.equal(formatPlateInput('12345'), '1234-5');
  assert.equal(formatPlateInput('12345a'), '1234-5A');
  assert.equal(formatPlateInput('1234ab'), '1234-AB');

  // Moto 2-4 (AB-1234)
  assert.equal(formatPlateInput('ab1'), 'AB-1');
  assert.equal(formatPlateInput('ab1234'), 'AB-1234');
});

test('formatPlateInput - respeta guión manual del usuario sin duplicarlo', () => {
  assert.equal(formatPlateInput('ABC-'), 'ABC-');
  assert.equal(formatPlateInput('ABC-123'), 'ABC-123');
  assert.equal(formatPlateInput('1234-5A'), '1234-5A');
  assert.equal(formatPlateInput('AB-1234'), 'AB-1234');
  assert.equal(formatPlateInput('ABC--123'), 'ABC-123');
});

test('formatPlateInput - trunca y bloquea entradas excesivas basura', () => {
  // Caso exacto del reporte del usuario con 'FBBBBBBFFFFFFFFFFFFFFFF'
  const result = formatPlateInput('FBBBBBBFFFFFFFFFFFFFFFF');
  assert.equal(result, 'FBB-BBB');
  assert.equal(result.length, 7);
  assert.equal(result.replace('-', '').length, 6);
});

test('formatPlateInput - elimina caracteres ilegales y símbolos extraños', () => {
  assert.equal(formatPlateInput('ABC@#$123'), 'ABC-123');
  assert.equal(formatPlateInput('  abc 123  '), 'ABC-123');
  assert.equal(formatPlateInput('A-B-C-1-2-3'), 'ABC-123');
});

// ============================================================================
// 3. Validación Estricta de Placa Peruana (isValidPeruvianPlate)
// ============================================================================
test('isValidPeruvianPlate - valida placas estándar de autos y camionetas peruanas', () => {
  assert.equal(isValidPeruvianPlate('ABC-123'), true);
  assert.equal(isValidPeruvianPlate('A1B-234'), true);
  assert.equal(isValidPeruvianPlate('B8Z-910'), true);
  assert.equal(isValidPeruvianPlate('XYZ-789'), true);
  assert.equal(isValidPeruvianPlate('abc-123'), true); // Insensible a mayúsculas
});

test('isValidPeruvianPlate - valida placas de motos y mototaxis peruanas (MTC)', () => {
  assert.equal(isValidPeruvianPlate('1234-5A'), true);
  assert.equal(isValidPeruvianPlate('1234-AB'), true);
  assert.equal(isValidPeruvianPlate('AB-1234'), true);
  assert.equal(isValidPeruvianPlate('12-34AB'), true);
});

test('isValidPeruvianPlate - rechaza placas incompletas, malformadas o inválidas', () => {
  // Sin guión obligatorio
  assert.equal(isValidPeruvianPlate('ABC123'), false);
  assert.equal(isValidPeruvianPlate('123456'), false);
  
  // Basura desbordada (caso screenshot usuario)
  assert.equal(isValidPeruvianPlate('FBBBBBBFFFFFFFFFFFFFFFF'), false);
  assert.equal(isValidPeruvianPlate('FFFF-FFFF'), false);

  // Demasiado cortas
  assert.equal(isValidPeruvianPlate(''), false);
  assert.equal(isValidPeruvianPlate('   '), false);
  assert.equal(isValidPeruvianPlate('A-1'), false);
  assert.equal(isValidPeruvianPlate('AB-12'), false);
  assert.equal(isValidPeruvianPlate('ABC-1'), false);

  // Demasiado largas o con caracteres ilegales
  assert.equal(isValidPeruvianPlate('ABCD-123'), false);
  assert.equal(isValidPeruvianPlate('ABC-1234'), false);
  assert.equal(isValidPeruvianPlate('AB@-123'), false);
  assert.equal(isValidPeruvianPlate(null), false);
  assert.equal(isValidPeruvianPlate(undefined), false);
});

// ============================================================================
// 4. Estados de Validación en Tiempo Real (getPlateValidationState)
// ============================================================================
test('getPlateValidationState - provee feedback progresivo al usuario', () => {
  // Vacío
  const emptyState = getPlateValidationState('');
  assert.equal(emptyState.isValid, false);
  assert.equal(emptyState.type, 'idle');

  // En progreso de tipeo (3 de 6 caracteres)
  const partialState = getPlateValidationState('ABC');
  assert.equal(partialState.isValid, false);
  assert.equal(partialState.isPartial, true);
  assert.equal(partialState.charCount, 3);
  assert.equal(partialState.type, 'warning');

  // Completada y válida (ABC-123)
  const validState = getPlateValidationState('ABC-123');
  assert.equal(validState.isValid, true);
  assert.equal(validState.isPartial, false);
  assert.equal(validState.charCount, 6);
  assert.equal(validState.type, 'success');

  // Completada pero formato inválido (ej: 1-12345)
  const invalidState = getPlateValidationState('1-12345');
  assert.equal(invalidState.isValid, false);
  assert.equal(invalidState.type, 'error');
});

// ============================================================================
// 5. Sanitización y Validación de Conductor / Teléfono
// ============================================================================
test('sanitizeDriverInput - limpia caracteres extraños y reduce spam repetitivo', () => {
  // Spam repetitivo del screenshot: fffffffffffffffffffffffffffff7777777777777
  const cleanedSpam = sanitizeDriverInput('fffffffffffffffffffffffffffff7777777777777');
  // Se reduce a máximo 3 repeticiones por caracter y no excede longitud
  assert.equal(cleanedSpam, 'fff777');

  // Nombres reales con tildes y espacios
  assert.equal(sanitizeDriverInput('Carlos Mendoza'), 'Carlos Mendoza');
  assert.equal(sanitizeDriverInput('María José de la Vega'), 'María José de la Vega');
  assert.equal(sanitizeDriverInput('O\'Connor'), 'OConnor'); // Filtra comillas simples si no están permitidas
  
  // Teléfonos
  assert.equal(sanitizeDriverInput('+51 987654321'), '+51 987654321');
  assert.equal(sanitizeDriverInput('987654321'), '987654321');

  // Null y undefined
  assert.equal(sanitizeDriverInput(null), '');
  assert.equal(sanitizeDriverInput(undefined), '');
});

test('validateDriverInput - valida nombres y teléfonos, y rechaza spam caótico', () => {
  // Es opcional: vacío es válido
  assert.equal(validateDriverInput('').isValid, true);
  assert.equal(validateDriverInput('   ').isValid, true);
  assert.equal(validateDriverInput(null).isValid, true);

  // Nombres válidos
  assert.equal(validateDriverInput('Juan Pérez').isValid, true);
  assert.equal(validateDriverInput('Carlos Morales').isValid, true);
  assert.equal(validateDriverInput('Ana María').isValid, true);

  // Teléfonos peruanos válidos
  assert.equal(validateDriverInput('987654321').isValid, true);
  assert.equal(validateDriverInput('+51 987654321').isValid, true);
  assert.equal(validateDriverInput('51987654321').isValid, true);

  // Teléfonos inválidos (menos de 9 dígitos o no inician con 9)
  assert.equal(validateDriverInput('12345').isValid, false);
  assert.equal(validateDriverInput('887654321').isValid, false); // No inicia con 9

  // Nombres demasiado cortos (< 2 caracteres)
  assert.equal(validateDriverInput('A').isValid, false);

  // Nombres con números mezclados o basura caótica (como en el screenshot)
  assert.equal(validateDriverInput('fffffffffffffffffffffffffffff7777777777777').isValid, false);
  assert.equal(validateDriverInput('Carlos123').isValid, false);
  assert.equal(validateDriverInput('fff777').isValid, false);
});

// ============================================================================
// 6. Validación Integral de Formulario de Garita (validateGaritaEntryForm)
// ============================================================================
test('validateGaritaEntryForm - aprueba formulario de garita válido', () => {
  const result = validateGaritaEntryForm({
    plate: 'ABC-123',
    slot: 'A-01',
    driverName: 'Juan Pérez',
    hours: 2,
    time: '14:30'
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('validateGaritaEntryForm - aprueba formulario con conductor omitido (opcional)', () => {
  const result = validateGaritaEntryForm({
    plate: 'ABC-123',
    slot: 'B-05',
    hours: 3,
    time: '10:00'
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('validateGaritaEntryForm - rechaza cuando faltan placa o cajón', () => {
  // Falta placa
  const noPlate = validateGaritaEntryForm({
    plate: '',
    slot: 'A-01'
  });
  assert.equal(noPlate.isValid, false);
  assert.ok(noPlate.errors.plate);

  // Placa inválida (ejemplo del screenshot)
  const invalidPlate = validateGaritaEntryForm({
    plate: 'FBBBBBBFFFFFFFFFFFFFFFF',
    slot: 'A-01'
  });
  assert.equal(invalidPlate.isValid, false);
  assert.ok(invalidPlate.errors.plate);

  // Falta cajón
  const noSlot = validateGaritaEntryForm({
    plate: 'ABC-123',
    slot: ''
  });
  assert.equal(noSlot.isValid, false);
  assert.ok(noSlot.errors.slot);
});

test('validateGaritaEntryForm - rechaza cuando conductor o tiempo tienen datos inválidos', () => {
  // Conductor con datos caóticos
  const badDriver = validateGaritaEntryForm({
    plate: 'ABC-123',
    slot: 'A-01',
    driverName: 'fffffffffffffffffffffffffffff7777777777777'
  });
  assert.equal(badDriver.isValid, false);
  assert.ok(badDriver.errors.driver);

  // Horas negativas o cero
  const badHours = validateGaritaEntryForm({
    plate: 'ABC-123',
    slot: 'A-01',
    hours: 0
  });
  assert.equal(badHours.isValid, false);
  assert.ok(badHours.errors.hours);

  // Hora de entrada corrupta
  const badTime = validateGaritaEntryForm({
    plate: 'ABC-123',
    slot: 'A-01',
    time: '25:99'
  });
  assert.equal(badTime.isValid, false);
  assert.ok(badTime.errors.time);
});
