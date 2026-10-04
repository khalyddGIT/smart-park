import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validateDni,
  validateRuc,
  validateDniOrRuc,
  validatePin,
  validateVehicleYear,
  validateName,
  validateTime,
  validatePercentage,
  validateCoordinates,
  validateTextMinLength,
  validateVehicleForm,
  validateStaffForm
} from './formValidation.js';

// ============================================================================
// 1. Validación de Correo Electrónico (validateEmail)
// ============================================================================
test('validateEmail - valida correos electrónicos con formato estándar', () => {
  const validEmails = [
    'usuario@smartpark.com',
    'admin.local@cochera.pe',
    'cliente_123@gmail.com',
    'test+tag@outlook.com',
    '  espacios@correo.com  '
  ];

  for (const email of validEmails) {
    const res = validateEmail(email);
    assert.equal(res.isValid, true, `Debe ser válido: ${email}`);
    assert.equal(res.error, null);
    assert.equal(res.value, email.trim().toLowerCase());
  }
});

test('validateEmail - rechaza correos malformados, vacíos o sin dominio', () => {
  const invalidEmails = [
    '',
    '   ',
    'sin-arroba.com',
    'arroba@',
    '@dominio.com',
    'usuario@dominio',
    'usuario@.com',
    'usuario@dominio..com',
    null,
    undefined
  ];

  for (const email of invalidEmails) {
    const res = validateEmail(email, true);
    assert.equal(res.isValid, false, `Debe ser inválido: ${email}`);
    assert.ok(res.error);
  }

  // Opcional: vacío debe ser válido
  assert.equal(validateEmail('', false).isValid, true);
  assert.equal(validateEmail(null, false).isValid, true);
});

// ============================================================================
// 2. Validación de Contraseña (validatePassword)
// ============================================================================
test('validatePassword - valida contraseñas de longitud segura (8+ caracteres)', () => {
  assert.equal(validatePassword('Password123!').isValid, true);
  assert.equal(validatePassword('12345678').isValid, true);
  assert.equal(validatePassword('segura_clave_2026').isValid, true);
});

test('validatePassword - rechaza contraseñas cortas o vacías', () => {
  assert.equal(validatePassword('').isValid, false);
  assert.equal(validatePassword('1234567').isValid, false); // 7 caracteres
  assert.equal(validatePassword('abc').isValid, false);
  assert.equal(validatePassword(null).isValid, false);

  // Opcional: vacío pasa si no es obligatorio
  assert.equal(validatePassword('', 8, false).isValid, true);
});

// ============================================================================
// 3. Validación de DNI Peruano (validateDni)
// ============================================================================
test('validateDni - valida exactamente 8 dígitos numéricos', () => {
  const validDnis = ['72345678', '40123456', '01234567', ' 72345678 '];
  for (const dni of validDnis) {
    const res = validateDni(dni);
    assert.equal(res.isValid, true, `DNI válido: ${dni}`);
    assert.equal(res.value, dni.trim());
  }
});

test('validateDni - rechaza DNIs incompletos, excedidos o con letras', () => {
  const invalidDnis = [
    '1234567',        // 7 dígitos
    '123456789',      // 9 dígitos
    '7234567A',       // Letra incluida
    'abcdefgh',       // Solo letras
    '',               // Vacío
    null,
    undefined
  ];
  for (const dni of invalidDnis) {
    const res = validateDni(dni, true);
    assert.equal(res.isValid, false, `Debe rechazar DNI: ${dni}`);
    assert.ok(res.error);
  }

  // Campo opcional
  assert.equal(validateDni('', false).isValid, true);
  assert.equal(validateDni(null, false).isValid, true);
});

// ============================================================================
// 4. Validación de RUC Peruano (validateRuc)
// ============================================================================
test('validateRuc - valida 11 dígitos con prefijos SUNAT válidos (10, 20)', () => {
  const validRucs = ['20601234567', '10723456789', '20100055551', ' 20601234567 '];
  for (const ruc of validRucs) {
    const res = validateRuc(ruc);
    assert.equal(res.isValid, true, `RUC válido: ${ruc}`);
    assert.equal(res.value, ruc.trim());
  }
});

test('validateRuc - rechaza RUCs con longitud errónea o prefijo no autorizado', () => {
  assert.equal(validateRuc('12345678901').isValid, false); // Prefijo 12 no existe en SUNAT
  assert.equal(validateRuc('2060123456').isValid, false);  // 10 dígitos
  assert.equal(validateRuc('206012345678').isValid, false); // 12 dígitos
  assert.equal(validateRuc('2060123456A').isValid, false); // Con letra
  assert.equal(validateRuc('').isValid, false);

  // Opcional
  assert.equal(validateRuc('', false).isValid, true);
});

// ============================================================================
// 5. Validación Combinada DNI o RUC (validateDniOrRuc)
// ============================================================================
test('validateDniOrRuc - acepta 8 dígitos como DNI y 11 dígitos como RUC', () => {
  const dniRes = validateDniOrRuc('72345678');
  assert.equal(dniRes.isValid, true);
  assert.equal(dniRes.type, 'DNI');

  const rucRes = validateDniOrRuc('20601234567');
  assert.equal(rucRes.isValid, true);
  assert.equal(rucRes.type, 'RUC');

  // Longitud inválida (ej. 9 o 10 dígitos)
  const badRes = validateDniOrRuc('123456789');
  assert.equal(badRes.isValid, false);
  assert.ok(badRes.error);
});

// ============================================================================
// 6. Validación de PIN de Seguridad (validatePin)
// ============================================================================
test('validatePin - valida PINs de 4 a 6 dígitos numéricos', () => {
  assert.equal(validatePin('1234').isValid, true);
  assert.equal(validatePin('123456').isValid, true);
  assert.equal(validatePin('0000').isValid, true);
  assert.equal(validatePin(' 4567 ').value, '4567');
});

test('validatePin - rechaza caracteres no numéricos o longitudes fuera de rango', () => {
  assert.equal(validatePin('123').isValid, false);       // Menos de 4
  assert.equal(validatePin('1234567').isValid, false);   // Más de 6
  assert.equal(validatePin('12A4').isValid, false);      // Letras
  assert.equal(validatePin('').isValid, false);
  assert.equal(validatePin(null).isValid, false);

  // Opcional
  assert.equal(validatePin('', 4, 6, false).isValid, true);
});

// ============================================================================
// 7. Validación de Año Vehicular (validateVehicleYear)
// ============================================================================
test('validateVehicleYear - valida años comprendidos entre 1970 y próximo año', () => {
  const currentNext = new Date().getFullYear() + 1;
  assert.equal(validateVehicleYear('2023').isValid, true);
  assert.equal(validateVehicleYear(2020).isValid, true);
  assert.equal(validateVehicleYear('1995').isValid, true);
  assert.equal(validateVehicleYear(currentNext).isValid, true);
});

test('validateVehicleYear - rechaza años fuera de rango o texto no numérico', () => {
  assert.equal(validateVehicleYear('1800').isValid, false); // Muy antiguo
  assert.equal(validateVehicleYear('2999').isValid, false); // En el futuro lejano
  assert.equal(validateVehicleYear('dos mil').isValid, false);
  assert.equal(validateVehicleYear('20').isValid, false);
  assert.equal(validateVehicleYear('').isValid, false);

  // Opcional
  assert.equal(validateVehicleYear('', 1970, null, false).isValid, true);
});

// ============================================================================
// 8. Validación de Nombres (validateName)
// ============================================================================
test('validateName - acepta nombres reales con espacios, tildes y diéresis', () => {
  assert.equal(validateName('Carlos Mendoza').isValid, true);
  assert.equal(validateName('María José de la Vega').isValid, true);
  assert.equal(validateName('Agüero Quispe').isValid, true);
  assert.equal(validateName('O\'Connor').isValid, true);
});

test('validateName - rechaza números, basura repetitiva o nombres muy cortos', () => {
  assert.equal(validateName('Carlos123').isValid, false);
  assert.equal(validateName('fffffffffffffffffffffffffffff').isValid, false);
  assert.equal(validateName('A').isValid, false); // Mínimo 2
  assert.equal(validateName('').isValid, false);
  assert.equal(validateName('Juan@Perez').isValid, false);
});

// ============================================================================
// 9. Validación de Horarios HH:MM (validateTime)
// ============================================================================
test('validateTime - valida formato militar de 24 horas (00:00 a 23:59)', () => {
  assert.equal(validateTime('08:30').isValid, true);
  assert.equal(validateTime('00:00').isValid, true);
  assert.equal(validateTime('23:59').isValid, true);
  assert.equal(validateTime('14:05').isValid, true);
});

test('validateTime - rechaza horas o minutos fuera de rango', () => {
  assert.equal(validateTime('24:00').isValid, false);
  assert.equal(validateTime('12:60').isValid, false);
  assert.equal(validateTime('8:30').isValid, false); // Falta cero a la izquierda
  assert.equal(validateTime('tarde').isValid, false);
  assert.equal(validateTime('').isValid, false);
});

// ============================================================================
// 10. Validación de Porcentajes y Comisiones (validatePercentage)
// ============================================================================
test('validatePercentage - valida rangos numéricos de 0 a 100 con o sin símbolo %', () => {
  assert.equal(validatePercentage('12%').isValid, true);
  assert.equal(validatePercentage('12%').value, 12);
  assert.equal(validatePercentage('20.5').value, 20.5);
  assert.equal(validatePercentage(0).value, 0);
  assert.equal(validatePercentage(100).value, 100);
});

test('validatePercentage - rechaza valores fuera de rango o no numéricos', () => {
  assert.equal(validatePercentage('-5').isValid, false);
  assert.equal(validatePercentage('105').isValid, false);
  assert.equal(validatePercentage('cien').isValid, false);
  assert.equal(validatePercentage('').isValid, false);
});

// ============================================================================
// 11. Validación de Coordenadas Geográficas (validateCoordinates)
// ============================================================================
test('validateCoordinates - valida coordenadas de Ayacucho y límites mundiales', () => {
  // Huamanga / Ayacucho
  const res = validateCoordinates(-13.1604, -74.2259);
  assert.equal(res.isValid, true);
  assert.equal(res.lat, -13.1604);
  assert.equal(res.lng, -74.2259);
});

test('validateCoordinates - rechaza coordenadas fuera de rango o NaN', () => {
  assert.equal(validateCoordinates(95, -74).isValid, false);   // Lat > 90
  assert.equal(validateCoordinates(-13, 200).isValid, false);  // Lng > 180
  assert.equal(validateCoordinates('abc', -74).isValid, false);
  assert.equal(validateCoordinates(null, null).isValid, false);
});

// ============================================================================
// 12. Validación de Textos y Descripciones (validateTextMinLength)
// ============================================================================
test('validateTextMinLength - valida textos con longitud mínima requerida', () => {
  assert.equal(validateTextMinLength('Cochera amplia y techada', 5, 200).isValid, true);
  assert.equal(validateTextMinLength('AB', 3, 50, 'El título').isValid, false);
  assert.equal(validateTextMinLength('', 3, 50, 'El título').isValid, false);
});

// ============================================================================
// 13. Validador Integral de Vehículos (validateVehicleForm)
// ============================================================================
test('validateVehicleForm - aprueba formulario de vehículo con placa MTC y datos válidos', () => {
  const result = validateVehicleForm({
    license_plate: 'ABC-123',
    vehicle_type: 'auto',
    brand: 'Toyota',
    model: 'Corolla',
    color: 'Negro',
    year: '2022'
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.cleanData.license_plate, 'ABC-123');
  assert.equal(result.cleanData.year, 2022);
});

test('validateVehicleForm - rechaza placa sin guión o año absurdo', () => {
  const result = validateVehicleForm({
    license_plate: 'ABC123', // Sin guión
    year: '1850'            // Año absurdo
  });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.license_plate);
  assert.ok(result.errors.year);
});

// ============================================================================
// 14. Validador Integral de Personal (validateStaffForm)
// ============================================================================
test('validateStaffForm - aprueba formulario de colaborador con DNI 8 dígitos y sede', () => {
  const result = validateStaffForm({
    full_name: 'Juan Pérez Alanya',
    dni: '72345678',
    position: 'Operador de Garita',
    parking_id: 1,
    email: 'operador@smartpark.pe',
    password: 'passwordSeguro2026',
    security_pin: '4321'
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.cleanData.dni, '72345678');
  assert.equal(result.cleanData.security_pin, '4321');
});

test('validateStaffForm - rechaza colaborador con DNI incorrecto, sin sede o contraseña corta', () => {
  const result = validateStaffForm({
    full_name: 'J',         // Muy corto
    dni: '12345',           // DNI solo 5 dígitos
    parking_id: null,       // Sin sede
    password: '123'         // Contraseña muy corta
  });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.full_name);
  assert.ok(result.errors.dni);
  assert.ok(result.errors.parking_id);
  assert.ok(result.errors.password);
});
