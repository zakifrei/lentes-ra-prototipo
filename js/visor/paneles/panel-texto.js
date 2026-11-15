// Panel 3D genérico de texto: un plano con una `CanvasTexture` dibujada con
// Canvas 2D que muestra una o más líneas de texto centradas. Es la base
// reutilizable para las pantallas estáticas del visor (reconocimiento,
// bienvenida, y las que se agreguen en tareas futuras: menú, aviso, pausa,
// vuelta, resumen, etc.) -- esos archivos deben ser wrappers finos sobre
// éste, no reimplementar el dibujado.
//
// Se ubica por defecto fuera del centro del campo visual del usuario (más
// abajo que la altura típica de los ojos): los paneles 3D nunca deben
// cubrir el centro de lo que el usuario está mirando.

import * as THREE from '../../../vendor/three/three.module.js';
import { dibujarFondoPanel, COLOR_TEXTO, FUENTE_PRINCIPAL } from '../tema-visual.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 512;

// Margen horizontal (en px de canvas) que el texto nunca debe invadir.
const MARGEN_HORIZONTAL = 40;

// Tamaño físico por defecto del panel en metros (RA): ancho x alto. Misma
// proporción 2:1 que el canvas, para que el texto no se deforme.
const ANCHO_PANEL_POR_DEFECTO = 0.8;
const ALTO_PANEL_POR_DEFECTO = 0.4;

// Posición por defecto: más abajo que la altura típica de los ojos
// (~1.6 m) y adelante, fuera del centro exacto del campo visual. Con
// `ALTO_PANEL_POR_DEFECTO = 0.4`, el panel ocupa de y=0.9 a y=1.3: el
// borde superior queda a ~0.3 m por debajo de la altura de ojos asumida
// -- así alcanza incluso para usuarios con los ojos bastante más bajos
// que 1.6 m.
const POSICION_POR_DEFECTO = { x: 0, y: 1.1, z: -1.2 };

const TAMANO_FUENTE_POR_DEFECTO = 48;

// Si la línea más larga no entra en el ancho disponible del canvas con el
// tamaño de fuente pedido, se reduce ese tamaño (igual para todas las
// líneas, para no dejar tamaños dispares) hasta que entre con margen.
function calcularTamanoFuenteAjustado(contexto, lineas, tamanoFuente) {
  contexto.font = `${tamanoFuente}px ${FUENTE_PRINCIPAL}`;
  const anchoDisponible = ANCHO_CANVAS - MARGEN_HORIZONTAL * 2;
  const anchoMaximo = Math.max(...lineas.map((linea) => contexto.measureText(linea).width));
  if (anchoMaximo <= anchoDisponible) return tamanoFuente;
  return tamanoFuente * (anchoDisponible / anchoMaximo);
}

function dibujarLineasEnCanvas(contexto, lineas, tamanoFuente) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  dibujarFondoPanel(contexto, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = COLOR_TEXTO;
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const tamanoFuenteAjustado = calcularTamanoFuenteAjustado(contexto, lineas, tamanoFuente);
  contexto.font = `${tamanoFuenteAjustado}px ${FUENTE_PRINCIPAL}`;

  const interlineado = tamanoFuenteAjustado * 1.4;
  const altoTotal = interlineado * lineas.length;
  const yInicial = ALTO_CANVAS / 2 - altoTotal / 2 + interlineado / 2;

  lineas.forEach((linea, indice) => {
    contexto.fillText(linea, ANCHO_CANVAS / 2, yInicial + indice * interlineado);
  });
}

/**
 * Crea un panel 3D genérico con una o más líneas de texto centradas, tanto
 * horizontal como verticalmente dentro del panel.
 * @param {string[]} lineas una o más líneas de texto, en orden
 * @param {{
 *   posicion?: {x:number,y:number,z:number},
 *   ancho?: number,
 *   alto?: number,
 *   tamanoFuente?: number,
 *   nombre?: string,
 * }} [opciones]
 * @returns {THREE.Object3D}
 */
export function crearPanelTexto(lineas, opciones = {}) {
  const {
    posicion = POSICION_POR_DEFECTO,
    ancho = ANCHO_PANEL_POR_DEFECTO,
    alto = ALTO_PANEL_POR_DEFECTO,
    tamanoFuente = TAMANO_FUENTE_POR_DEFECTO,
    nombre = 'panel-texto',
  } = opciones;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;

  const contexto = canvas.getContext('2d');
  dibujarLineasEnCanvas(contexto, lineas, tamanoFuente);

  const textura = new THREE.CanvasTexture(canvas);

  const material = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    // Igual que el panel de subtítulos: siempre debe leerse, sin importar
    // la luz de la escena ni el ángulo desde el que se lo mire.
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const geometria = new THREE.PlaneGeometry(ancho, alto);

  const panel = new THREE.Mesh(geometria, material);
  panel.name = nombre;
  panel.position.set(posicion.x, posicion.y, posicion.z);

  return panel;
}
