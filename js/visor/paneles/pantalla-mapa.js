// Pantalla de mapa conceptual: tres columnas ("Causas", "Hitos",
// "Consecuencias") con la información de
// assets/mapa-conceptual/contenido-mapa.js. Pantalla estática, sin
// interacción -- igual que pantalla-bienvenida.js, wrapper fino sobre
// panel-texto.js -- pero acá son tres paneles separados en vez de uno
// solo, para que la estructura de "mapa conceptual" (categorías
// independientes) se note a simple vista y no se lea como más texto de
// subtítulo corrido.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { MAPA_CONCEPTUAL } from '../../../assets/mapa-conceptual/contenido-mapa.js';

// Misma altura y profundidad que el resto de las pantallas estáticas (ver
// POSICION_POR_DEFECTO en panel-texto.js): por debajo de la altura típica
// de los ojos, así las tres columnas -- igual que cualquier otro panel del
// proyecto -- nunca cubren el centro del campo visual.
const ALTURA_Y = 1.1;
const PROFUNDIDAD_Z = -1.2;

const ANCHO_COLUMNA = 0.6;
const ALTO_COLUMNA = 0.55;

// Tamaño de fuente menor al default de panel-texto.js (48): cada columna
// tiene cuatro líneas (título + 3 datos) en vez de una o dos, así que
// arranca más chico para que entren cómodas antes de que el ajuste
// automático por ancho (ver calcularTamanoFuenteAjustado en
// panel-texto.js) tenga que reducirlo más de la cuenta.
const TAMANO_FUENTE_COLUMNA = 36;

// Separación horizontal entre centros de columna: con ANCHO_COLUMNA = 0.6
// deja ~0.1 m de aire entre bordes (mismo criterio que pantalla-menu.js),
// para que las tres columnas no se toquen entre sí.
const SEPARACION_X = 0.7;

/**
 * Crea la pantalla de mapa conceptual: tres columnas de texto ("Causas",
 * "Hitos", "Consecuencias") con la información de la caída del Imperio
 * romano de Occidente. No tiene interacción -- es sólo para leer, como
 * pantalla-bienvenida.js.
 * @returns {THREE.Object3D}
 */
export function crearPantallaMapa() {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-mapa';

  const cantidadColumnas = MAPA_CONCEPTUAL.length;
  // Centra las columnas alrededor de x=0: con 3 columnas y
  // SEPARACION_X = 0.7, quedan en x = -0.7, 0, 0.7.
  const offsetInicial = -((cantidadColumnas - 1) / 2) * SEPARACION_X;

  MAPA_CONCEPTUAL.forEach(({ titulo, lineas }, indice) => {
    const columna = crearPanelTexto([titulo.toUpperCase(), ...lineas], {
      posicion: { x: offsetInicial + indice * SEPARACION_X, y: ALTURA_Y, z: PROFUNDIDAD_Z },
      ancho: ANCHO_COLUMNA,
      alto: ALTO_COLUMNA,
      tamanoFuente: TAMANO_FUENTE_COLUMNA,
      nombre: `pantalla-mapa-columna-${titulo.toLowerCase()}`,
    });
    grupo.add(columna);
  });

  return grupo;
}
