import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarPosicionImagen, ajustarTamanoSubtitulo, reiniciarPersistencia, estadoPersistenciaInicial } from '../js/common/persistencia.js';

test('reiniciarPersistencia limpia tamaños y posiciones sin importar el estado previo', () => {
  let estado = ajustarTamanoSubtitulo(estadoPersistenciaInicial(), 10);
  estado = guardarPosicionImagen(estado, 'img-1', { x: 5, y: 5, z: -1 });
  assert.deepEqual(reiniciarPersistencia(), estadoPersistenciaInicial());
});
