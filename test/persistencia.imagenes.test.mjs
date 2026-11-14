import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoPersistenciaInicial, guardarPosicionImagen, guardarEscalaImagen, TAMANO_MAX } from '../js/common/persistencia.js';

test('guardarPosicionImagen recuerda la posicion por id', () => {
  const estado = guardarPosicionImagen(estadoPersistenciaInicial(), 'img-1', { x: 1, y: 2, z: -1 });
  assert.deepEqual(estado.imagenes['img-1'].x, 1);
});

test('guardarEscalaImagen no supera el maximo', () => {
  const estado = guardarEscalaImagen(estadoPersistenciaInicial(), 'img-1', 999);
  assert.equal(estado.imagenes['img-1'].escala, TAMANO_MAX);
});
