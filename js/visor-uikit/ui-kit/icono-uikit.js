// Envoltorio de un ícono de js/visor/iconos.js (dibujado a mano en
// Canvas2D) como un componente `Image` de uikit (Tarea 1 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md).
//
// `iconos.js::dibujarIcono` se IMPORTA del original tal cual -- a
// diferencia de tema-visual.js/panel-texto.js, es puro Canvas2D sin
// ninguna dependencia de renderizado 3D (no sabe nada de THREE ni de
// uikit), así que no hace falta reconstruirlo.

import * as THREE from '../../../vendor/three/three.module.js';
import { Image } from '@pmndrs/uikit';
import { dibujarIcono } from '../../visor/iconos.js';

// Resolución fija del canvas offscreen donde se dibuja el ícono: el
// tamaño FINAL en la UI lo da `diametroPx` (sizeX/sizeY del componente
// Image de uikit), no esto -- esta resolución sólo define la nitidez de
// la textura, independiente de a qué tamaño se vea.
const RESOLUCION_CANVAS_ICONO = 128;

/**
 * Crea un componente `Image` de uikit con el ícono `nombre` (uno de los
 * soportados por `dibujarIcono`, ver iconos.js) dibujado en `color`,
 * cuadrado de `diametroMundo` x `diametroMundo` -- en unidades del MUNDO
 * (metros), no en "píxeles" de contenido.
 *
 * Hallazgo de la Tarea 1 (no estaba en el plan, confirmado en vivo en el
 * navegador): a diferencia de `Container`/`Text`, cuyas propiedades en
 * "píxeles" (fontSize, padding, etc.) se escalan con el `pixelSize`
 * heredado del panel que las contiene, `Image.sizeX`/`sizeY` se miden
 * DIRECTO en unidades del mundo, igual que `sizeX`/`sizeY` de un
 * `Container` usado como raíz (ver el comentario grande en
 * panel-uikit.js) -- pasar un valor en "píxeles" acá daba un ícono ~2500x
 * más grande de lo pedido. Quien llama (`panel-uikit.js`) debe convertir
 * multiplicando por su propio `pixelSize` antes de llamar a esta función.
 * @param {string} nombre
 * @param {number} diametroMundo
 * @param {string} color
 * @returns {Image}
 */
export function crearIconoUikit(nombre, diametroMundo, color) {
  const canvas = document.createElement('canvas');
  canvas.width = RESOLUCION_CANVAS_ICONO;
  canvas.height = RESOLUCION_CANVAS_ICONO;

  const contexto = canvas.getContext('2d');
  // dibujarIcono nunca fija su propio color (ver el comentario grande al
  // principio de iconos.js) -- hay que configurarlo acá antes de llamarlo,
  // igual que hace panel-texto.js con COLOR_TEXTO.
  contexto.strokeStyle = color;
  contexto.fillStyle = color;
  const radio = RESOLUCION_CANVAS_ICONO * 0.4;
  dibujarIcono(nombre, contexto, RESOLUCION_CANVAS_ICONO / 2, RESOLUCION_CANVAS_ICONO / 2, radio);

  const textura = new THREE.CanvasTexture(canvas);
  textura.needsUpdate = true;

  return new Image({
    src: textura,
    sizeX: diametroMundo,
    sizeY: diametroMundo,
    // Sin esto, el ícono queda en el mismo plano Z que el fondo del panel
    // que lo contiene y pierde el z-test contra él la mitad de las veces
    // (confirmado en vivo: el ícono existía, con textura y tamaño
    // correctos, pero no se veía) -- mismo motivo por el que
    // panel-texto.js usa `depthWrite: false` en sus paneles viejos.
    depthTest: false,
    renderOrder: 1000,
  });
}
