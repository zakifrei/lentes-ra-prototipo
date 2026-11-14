import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirComandoPantalla, construirComandoTiempoVuelta, construirComandoReset } from '../js/common/firebase-mensajes.js';

test('construirComandoPantalla arma el campo pantalla', () => {
  assert.deepEqual(construirComandoPantalla('menu'), { pantalla: 'menu' });
});

test('construirComandoTiempoVuelta sanea valores invalidos (Review Focus)', () => {
  assert.deepEqual(construirComandoTiempoVuelta(-3), { tiempoVueltaMin: 0 });
  assert.deepEqual(construirComandoTiempoVuelta(NaN), { tiempoVueltaMin: 0 });
  assert.deepEqual(construirComandoTiempoVuelta(6), { tiempoVueltaMin: 6 });
});

test('construirComandoReset incluye un resetId numerico', () => {
  const comando = construirComandoReset();
  assert.equal(typeof comando.resetId, 'number');
});
