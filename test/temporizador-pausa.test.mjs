import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutosTranscurridos, formatearTextoVuelta } from '../js/common/temporizador-pausa.js';

test('minutosTranscurridos redondea y nunca es negativo', () => {
  assert.equal(minutosTranscurridos(0, 90000), 2); // 1.5 min -> redondeado a 2
  assert.equal(minutosTranscurridos(1000, 0), 0); // tiempo invertido no da negativo
});

test('formatearTextoVuelta arma el texto literal', () => {
  assert.equal(
    formatearTextoVuelta(6, 2),
    'Bienvenida de vuelta · Estuviste 6 min en pausa · Se guardaron 2 temas'
  );
});

test('formatearTextoVuelta sanea valores invalidos a 0 (Review Focus)', () => {
  assert.equal(
    formatearTextoVuelta(-5, NaN),
    'Bienvenida de vuelta · Estuviste 0 min en pausa · Se guardaron 0 temas'
  );
  assert.equal(
    formatearTextoVuelta('texto', undefined),
    'Bienvenida de vuelta · Estuviste 0 min en pausa · Se guardaron 0 temas'
  );
});
