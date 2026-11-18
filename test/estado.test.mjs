import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoPorDefecto, aplicarComando, PANTALLAS } from '../js/common/estado.js';

test('aplicarComando cambia de pantalla con un comando valido', () => {
  const estado = aplicarComando(estadoPorDefecto(), { pantalla: 'menu' });
  assert.equal(estado.pantalla, 'menu');
});

test('aplicarComando ignora una pantalla que no existe', () => {
  const inicial = estadoPorDefecto();
  const estado = aplicarComando(inicial, { pantalla: 'pantalla-inventada' });
  assert.equal(estado.pantalla, inicial.pantalla);
});

test('aplicarComando ignora un comando sin forma reconocible', () => {
  const inicial = estadoPorDefecto();
  const estado = aplicarComando(inicial, { campoQueNoExiste: 123 });
  assert.deepEqual(estado, inicial);
});

test('aplicarComando ignora un comando nulo o no es objeto', () => {
  const inicial = estadoPorDefecto();
  assert.deepEqual(aplicarComando(inicial, null), inicial);
  assert.deepEqual(aplicarComando(inicial, 'texto'), inicial);
});

test('aplicarComando aplica los campos validos e ignora los invalidos del mismo comando', () => {
  const estado = aplicarComando(estadoPorDefecto(), { pantalla: 'menu', campoLegacySinValidador: 3 });
  assert.equal(estado.pantalla, 'menu');
});

test('PANTALLAS incluye "finalizada" y aplicarComando la acepta', () => {
  assert.ok(PANTALLAS.includes('finalizada'));
  const estado = aplicarComando(estadoPorDefecto(), { pantalla: 'finalizada' });
  assert.equal(estado.pantalla, 'finalizada');
});
