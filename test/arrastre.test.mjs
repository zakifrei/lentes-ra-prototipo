import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitarPosicion } from '../js/common/arrastre.js';

test('posicion dentro de los limites no cambia', () => {
  const limites = { x: [-1, 1], y: [-1, 1], z: [-2, -0.5] };
  assert.deepEqual(limitarPosicion({ x: 0, y: 0.3, z: -1 }, limites), { x: 0, y: 0.3, z: -1 });
});

test('posicion fuera de los limites se clampa a cada eje', () => {
  const limites = { x: [-1, 1], y: [-1, 1], z: [-2, -0.5] };
  assert.deepEqual(limitarPosicion({ x: 5, y: -5, z: 10 }, limites), { x: 1, y: -1, z: -0.5 });
});
