import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarPosicionImagen, estadoPersistenciaInicial, TAMANO_MIN } from '../js/common/persistencia.js';
import { estadoPorDefecto, aplicarComando } from '../js/common/estado.js';

test('cambiar de pantalla con aplicarComando no toca la persistencia de imagenes', () => {
  const persistencia = guardarPosicionImagen(estadoPersistenciaInicial(), 'img-1', { x: 1, y: 1, z: -1 });
  aplicarComando(estadoPorDefecto(), { pantalla: 'menu' }); // simula el cambio de pantalla
  // guardarPosicionImagen también fija `escala` (en TAMANO_MIN cuando la
  // imagen no tenía una previa, ver persistencia.js) -- el objeto esperado
  // la incluye por eso, a diferencia del snippet original del plan.
  assert.deepEqual(persistencia.imagenes['img-1'], { escala: TAMANO_MIN, x: 1, y: 1, z: -1 });
});
