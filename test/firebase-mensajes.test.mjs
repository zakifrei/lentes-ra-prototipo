import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirComandoPantalla, construirComandoReset } from '../js/common/firebase-mensajes.js';

test('construirComandoPantalla arma el campo pantalla', () => {
  assert.deepEqual(construirComandoPantalla('menu'), { pantalla: 'menu' });
});

test('construirComandoReset incluye un resetId numerico', () => {
  const comando = construirComandoReset();
  assert.equal(typeof comando.resetId, 'number');
});
