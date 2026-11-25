// Pantalla de pausa activa (visor-uikit, Tarea 3 del plan de migración,
// ver docs/superpowers/plans/2026-11-19-migracion-uikit.md): un mensaje
// fijo más un contador en vivo de minutos transcurridos -- mismos
// valores físicos y mismo texto literal que
// js/visor/paneles/pantalla-pausa.js (leído como referencia).
//
// El cálculo de minutos transcurridos sigue viviendo en el módulo puro
// `js/common/temporizador-pausa.js` (importado, no reimplementado). A
// diferencia de la versión vieja, que redibujaba un canvas entero en
// cada cambio de minuto, acá alcanza con `Text.setProperties({text})`
// sobre el `Text` del contador -- el párrafo fijo ni se toca.

import * as THREE from '../../../vendor/three/three.module.js';
import { Text } from '@pmndrs/uikit';
import { crearContenedorUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO, TIPO_DP, fuenteDesdeDp } from '../ui-kit/tema-uikit.js';
import { minutosTranscurridos } from '../../common/temporizador-pausa.js';

// Mismos valores físicos que la versión vieja.
const ANCHO_PANEL = 0.8;
const ALTO_PANEL = 0.4;
const POSICION_PANEL = { x: 0, y: 1.1, z: -1.8 };

// Mismos tamaños que la versión vieja.
const TAMANO_FUENTE_TEXTO = fuenteDesdeDp(TIPO_DP.cuerpo1, ANCHO_PANEL);
const TAMANO_FUENTE_CONTADOR = fuenteDesdeDp(TIPO_DP.titulo2, ANCHO_PANEL);

// Texto literal exacto pedido por la tarea original -- no parafrasear ni
// cambiar comillas/apóstrofes (misma nota que la versión vieja).
const TEXTO_PAUSA =
  "Pausa iniciada. Podés sacarte los lentes. Lo que explique la profesora se guarda en 'Temas pendientes'";

/**
 * Crea la pantalla de pausa activa.
 *
 * No recibe `inicioMs` por parámetro (misma firma que la versión vieja,
 * por el mismo motivo: ver su comentario grande) -- el contador arranca
 * en 0 y sólo se reinicia de verdad en `alEntrar()`.
 * @returns {THREE.Object3D} grupo con tres métodos agregados (misma
 *   convención que la versión vieja, más `actualizarUikit` igual que el
 *   resto de las pantallas del visor nuevo):
 *   - `actualizarUikit(deltaMs)`: layout de uikit, cada cuadro.
 *   - `alEntrar()`: reinicia el contador a 0.
 *   - `actualizar(ahoraMs)`: redibuja el contador si el minuto mostrado
 *     cambió.
 */
export function crearPantallaPausa() {
  // Valor inicial irrelevante en la práctica: se pisa en `alEntrar()`
  // antes de que el usuario pueda ver esta pantalla (mismo comentario
  // que la versión vieja).
  let inicioMs = Date.now();
  let ultimoMinutoMostrado = null;

  const { contenedor } = crearContenedorUikit({
    posicion: POSICION_PANEL,
    ancho: ANCHO_PANEL,
    alto: ALTO_PANEL,
    nombre: 'pantalla-pausa-texto',
    gap: TAMANO_FUENTE_TEXTO * 0.5,
  });

  contenedor.add(
    new Text({ text: TEXTO_PAUSA, color: COLOR_TEXTO, fontSize: TAMANO_FUENTE_TEXTO, fontWeight: 'normal' })
  );
  const textoContador = new Text({
    text: '0 min en pausa',
    color: COLOR_TEXTO,
    fontSize: TAMANO_FUENTE_CONTADOR,
    fontWeight: 'bold',
  });
  contenedor.add(textoContador);

  function redibujarSiCambio(ahoraMs) {
    const minutos = minutosTranscurridos(inicioMs, ahoraMs);
    // Evita pisar la propiedad (y volver a medir el texto) en cada
    // cuadro si el minuto mostrado no cambió -- mismo criterio que la
    // versión vieja.
    if (minutos === ultimoMinutoMostrado) return;
    ultimoMinutoMostrado = minutos;
    textoContador.setProperties({ text: `${minutos} min en pausa` });
  }
  redibujarSiCambio(Date.now());

  contenedor.alEntrar = function alEntrarAPantallaPausa() {
    inicioMs = Date.now();
    ultimoMinutoMostrado = null;
    redibujarSiCambio(Date.now());
  };

  contenedor.actualizar = function actualizarPantallaPausa(ahoraMs) {
    redibujarSiCambio(ahoraMs);
  };

  contenedor.actualizarUikit = (deltaMs) => contenedor.update(deltaMs);

  return contenedor;
}
