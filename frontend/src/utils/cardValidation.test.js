import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanCardNumber,
  formatCardNumber,
  detectCardBrand,
  luhnCheck,
  validateCardNumber,
  cleanCardHolder,
  validateCardHolder,
  formatExpiry,
  validateExpiry,
  cleanCVC,
  validateCVC
} from './cardValidation.js';

test('cleanCardNumber - elimina letras y caracteres no numéricos', () => {
  assert.equal(cleanCardNumber('kkkkkkkkkkkkkkkk'), '');
  assert.equal(cleanCardNumber('abc123def456'), '123456');
  assert.equal(cleanCardNumber('4557-1234-5678-9012'), '4557123456789012');
  assert.equal(cleanCardNumber('4557 1234 5678 9012 99999'), '4557123456789012'); // Trunca a 16
  assert.equal(cleanCardNumber(null), '');
  assert.equal(cleanCardNumber(undefined), '');
});

test('formatCardNumber - formatea exactamente 16 números separados en bloques de 4', () => {
  // Letras bloqueadas completamente:
  assert.equal(formatCardNumber('kkkkkkkkkkkkkkkk'), '');

  // Bloques de 4 números con espacio:
  assert.equal(formatCardNumber('4557123456789012'), '4557 1234 5678 9012');
  assert.equal(formatCardNumber('4111111111111111'), '4111 1111 1111 1111');

  // Escritura progresiva:
  assert.equal(formatCardNumber('4'), '4');
  assert.equal(formatCardNumber('4557'), '4557');
  assert.equal(formatCardNumber('45571'), '4557 1');
  assert.equal(formatCardNumber('455712345'), '4557 1234 5');

  // Ignora símbolos y letras intermedias:
  assert.equal(formatCardNumber('4557-AAAA-5678-BBBB'), '4557 5678');
});

test('detectCardBrand - identifica correctamente la franquicia', () => {
  assert.equal(detectCardBrand('4111 1111 1111 1111'), 'Visa');
  assert.equal(detectCardBrand('5412 7534 8901 2345'), 'Mastercard');
  assert.equal(detectCardBrand('3782 8224 6310 005'), 'Amex');
  assert.equal(detectCardBrand('3612 3456 7890 12'), 'Diners');
  assert.equal(detectCardBrand('6011 0000 0000 0000'), 'Discover');
  assert.equal(detectCardBrand('9999 0000 0000 0000'), 'Tarjeta');
});

test('luhnCheck y validateCardNumber - algoritmo de Luhn y longitud estricta', () => {
  // Tarjeta válida estándar (4111 1111 1111 1111 pasa algoritmo de Luhn)
  assert.equal(luhnCheck('4111 1111 1111 1111'), true);
  const valValid = validateCardNumber('4111 1111 1111 1111');
  assert.equal(valValid.isValid, true);
  assert.equal(valValid.brand, 'Visa');
  assert.equal(valValid.error, null);

  // Tarjeta incompleta (< 16 dígitos)
  const valIncomplete = validateCardNumber('4111 1111');
  assert.equal(valIncomplete.isValid, false);
  assert.match(valIncomplete.error, /Faltan dígitos/);

  // Letras (como en el reporte del usuario "kkkkkkkkkkkkkkkk")
  const valLetters = validateCardNumber('kkkkkkkkkkkkkkkk');
  assert.equal(valLetters.isValid, false);
  assert.match(valLetters.error, /obligatorio/);

  // Tarjeta de 16 dígitos con checksum inválido
  const valBadChecksum = validateCardNumber('4111 1111 1111 1112');
  assert.equal(valBadChecksum.isValid, false);
  assert.match(valBadChecksum.error, /checksum bancario Luhn/);
});

test('cleanCardHolder y validateCardHolder - valida nombres y apellidos sin números ni símbolos', () => {
  assert.equal(cleanCardHolder('carlos mendoza'), 'CARLOS MENDOZA');
  assert.equal(cleanCardHolder('María-José 123! Gómez'), 'MARÍAJOSÉ GÓMEZ'); // Solo letras preservando acentos

  const validHolder = validateCardHolder('Carlos Mendoza');
  assert.equal(validHolder.isValid, true);
  assert.equal(validHolder.value, 'CARLOS MENDOZA');

  // Solo un nombre sin apellido
  const singleName = validateCardHolder('Carlos');
  assert.equal(singleName.isValid, false);
  assert.match(singleName.error, /apellidos completos/);

  // Vacío
  const emptyHolder = validateCardHolder('');
  assert.equal(emptyHolder.isValid, false);
  assert.match(emptyHolder.error, /obligatorio/);
});

test('formatExpiry y validateExpiry - formato MM/AA y control de vigencia', () => {
  assert.equal(formatExpiry('1228'), '12/28');
  assert.equal(formatExpiry('12'), '12/');
  assert.equal(formatExpiry('5'), '05/');
  assert.equal(formatExpiry('9999'), '12/99'); // Max mes 12

  // Tarjeta vigente en el futuro (ej. 12/28)
  const valFuture = validateExpiry('12/28');
  assert.equal(valFuture.isValid, true);
  assert.equal(valFuture.month, 12);
  assert.equal(valFuture.year, 28);

  // Tarjeta con mes inválido (ej. 15/28)
  const valBadMonth = validateExpiry('00/28');
  assert.equal(valBadMonth.isValid, false);

  // Tarjeta expirada en el pasado (ej. 01/20)
  const valExpired = validateExpiry('01/20');
  assert.equal(valExpired.isValid, false);
  assert.match(valExpired.error, /expirada/);
});

test('cleanCVC y validateCVC - solo 3 o 4 dígitos numéricos', () => {
  assert.equal(cleanCVC('abc123def'), '123');
  assert.equal(cleanCVC('12345'), '1234');

  const valCvc3 = validateCVC('123', 'Visa');
  assert.equal(valCvc3.isValid, true);

  const valCvc4 = validateCVC('1234', 'Amex');
  assert.equal(valCvc4.isValid, true);

  const valEmpty = validateCVC('', 'Visa');
  assert.equal(valEmpty.isValid, false);

  const valShort = validateCVC('12', 'Visa');
  assert.equal(valShort.isValid, false);
});
