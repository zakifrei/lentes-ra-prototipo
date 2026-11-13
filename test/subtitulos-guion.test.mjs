import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineaActual, GUION_SUBTITULOS } from '../js/common/subtitulos-guion.js';

test('lineaActual devuelve la primera linea en el segundo 0', () => {
  assert.equal(lineaActual(0), GUION_SUBTITULOS[0].texto);
});

test('lineaActual devuelve la ultima linea cuando el tiempo supera el guion', () => {
  const ultima = GUION_SUBTITULOS[GUION_SUBTITULOS.length - 1];
  assert.equal(lineaActual(999999), ultima.texto);
});
