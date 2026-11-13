import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoPersistenciaInicial, ajustarTamanoSubtitulo, TAMANO_MIN, TAMANO_MAX } from '../js/common/persistencia.js';

test('el tamaño inicial de subtitulos es el minimo (arranca chico a proposito)', () => {
  assert.equal(estadoPersistenciaInicial().tamanoSubtitulo, TAMANO_MIN);
});

test('ajustarTamanoSubtitulo no baja del minimo', () => {
  const estado = ajustarTamanoSubtitulo(estadoPersistenciaInicial(), -5);
  assert.equal(estado.tamanoSubtitulo, TAMANO_MIN);
});

test('ajustarTamanoSubtitulo no sube del maximo', () => {
  const estado = ajustarTamanoSubtitulo(estadoPersistenciaInicial(), 50);
  assert.equal(estado.tamanoSubtitulo, TAMANO_MAX);
});
