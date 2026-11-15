import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutosTranscurridos, armarLineasVuelta } from '../js/common/temporizador-pausa.js';

test('minutosTranscurridos redondea y nunca es negativo', () => {
  assert.equal(minutosTranscurridos(0, 90000), 2); // 1.5 min -> redondeado a 2
  assert.equal(minutosTranscurridos(1000, 0), 0); // tiempo invertido no da negativo
});

test('armarLineasVuelta arma las 3 lineas literales', () => {
  assert.deepEqual(armarLineasVuelta(6, 2), [
    '¡Bienvenida de vuelta!',
    'Estuviste 6 min en pausa',
    'Se guardaron 2 temas en tu notebook',
  ]);
});

test('armarLineasVuelta sanea valores invalidos a 0 (Review Focus)', () => {
  assert.deepEqual(armarLineasVuelta(-5, NaN), [
    '¡Bienvenida de vuelta!',
    'Estuviste 0 min en pausa',
    'Se guardaron 0 temas en tu notebook',
  ]);
  assert.deepEqual(armarLineasVuelta('texto', undefined), [
    '¡Bienvenida de vuelta!',
    'Estuviste 0 min en pausa',
    'Se guardaron 0 temas en tu notebook',
  ]);
});
