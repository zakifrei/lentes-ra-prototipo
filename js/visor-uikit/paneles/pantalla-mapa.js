// Pantalla de mapa conceptual (visor-uikit, Tarea 3 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// tres columnas ("Causas", "Hitos", "Consecuencias") con la información de
// assets/mapa-conceptual/contenido-mapa.js. Pantalla estática, sin
// interacción -- mismos valores físicos que
// js/visor/paneles/pantalla-mapa.js (leído como referencia).
//
// Distinto de la versión vieja: el título de cada columna va en negrita
// de verdad (`crearPanelTexto` no soporta pesos por línea, así que la
// versión vieja sólo podía usar MAYÚSCULAS para distinguirlo -- ver su
// comentario grande); acá, con `Text` de uikit, alcanza con un
// `fontWeight` propio en ese primer bloque.

import * as THREE from '../../../vendor/three/three.module.js';
import { Text } from '@pmndrs/uikit';
import { crearContenedorUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO } from '../ui-kit/tema-uikit.js';
import { MAPA_CONCEPTUAL } from '../../../assets/mapa-conceptual/contenido-mapa.js';

// Misma altura y profundidad que el resto de las pantallas estáticas.
const ALTURA_Y = 1.1;
const PROFUNDIDAD_Z = -1.8;

const ANCHO_COLUMNA = 0.6;
const ALTO_COLUMNA = 0.38;

// Mismo tamaño que la versión vieja para las 3 líneas de datos; el
// título va un 15% más grande (ver más abajo) para notarse como
// encabezado, ahora que puede llevar su propio peso/tamaño.
const TAMANO_FUENTE_DATO = 40;
const TAMANO_FUENTE_TITULO = Math.round(TAMANO_FUENTE_DATO * 1.15);

// Mismo criterio que pantalla-menu.js: separación entre centros de
// columna que deja aire entre bordes.
const SEPARACION_X = 0.7;

/**
 * Crea la pantalla de mapa conceptual: tres columnas de texto ("Causas",
 * "Hitos", "Consecuencias"). No tiene interacción -- es sólo para leer,
 * como pantalla-bienvenida.js. El objeto devuelto expone
 * `actualizarUikit(deltaMs)` que actualiza las 3 columnas (cada una es su
 * propio root de uikit).
 * @returns {THREE.Object3D}
 */
export function crearPantallaMapa() {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-mapa';

  const cantidadColumnas = MAPA_CONCEPTUAL.length;
  // Centra las columnas alrededor de x=0: con 3 columnas y
  // SEPARACION_X = 0.7, quedan en x = -0.7, 0, 0.7.
  const offsetInicial = -((cantidadColumnas - 1) / 2) * SEPARACION_X;

  const columnas = MAPA_CONCEPTUAL.map(({ titulo, lineas }, indice) => {
    const { contenedor } = crearContenedorUikit({
      posicion: { x: offsetInicial + indice * SEPARACION_X, y: ALTURA_Y, z: PROFUNDIDAD_Z },
      ancho: ANCHO_COLUMNA,
      alto: ALTO_COLUMNA,
      nombre: `pantalla-mapa-columna-${titulo.toLowerCase()}`,
      gap: TAMANO_FUENTE_DATO * 0.3,
    });

    contenedor.add(
      new Text({
        text: titulo.toUpperCase(),
        color: COLOR_TEXTO,
        fontSize: TAMANO_FUENTE_TITULO,
        fontWeight: 'bold',
        // Fraunces (serif cálida) sólo para el título -- ver el
        // comentario grande de fuente-uikit.js (pedido vía
        // /design-consultation).
        fontFamily: 'fraunces',
      })
    );
    lineas.forEach((linea) => {
      contenedor.add(
        new Text({ text: linea, color: COLOR_TEXTO, fontSize: TAMANO_FUENTE_DATO, fontWeight: 'normal' })
      );
    });

    grupo.add(contenedor);
    return contenedor;
  });

  grupo.actualizarUikit = (deltaMs) => {
    columnas.forEach((columna) => columna.update(deltaMs));
  };

  return grupo;
}
