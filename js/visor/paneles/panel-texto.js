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
import { dibujarIcono } from '../iconos.js';

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
const POSICION_POR_DEFECTO = { x: 0, y: 1.1, z: -1.8 };

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

// Diámetro del ícono opcional (fracción del alto del canvas) y espacio
// entre el ícono y el texto cuando ambos se dibujan juntos como una sola
// unidad centrada -- ver `dibujarLineasEnCanvas`.
const DIAMETRO_ICONO = ALTO_CANVAS * 0.4;
const ESPACIO_ICONO_TEXTO = 20;

function dibujarLineasEnCanvas(contexto, lineas, tamanoFuente, icono) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  dibujarFondoPanel(contexto, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = COLOR_TEXTO;
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const tamanoFuenteAjustado = calcularTamanoFuenteAjustado(contexto, lineas, tamanoFuente);
  contexto.font = `${tamanoFuenteAjustado}px ${FUENTE_PRINCIPAL}`;

  // Ícono opcional: sólo para etiquetas de una sola línea (regla explícita
  // del Review Focus del plan -- nunca se dibuja ícono sobre un panel de
  // varias líneas, donde no hay un único renglón con el que formar una
  // unidad centrada). Si no aplica, el dibujo sigue siendo IDÉNTICO al de
  // antes de esta tarea.
  if (icono && lineas.length === 1) {
    const linea = lineas[0];
    const anchoTexto = contexto.measureText(linea).width;
    const radioIcono = DIAMETRO_ICONO / 2;
    const anchoTotal = DIAMETRO_ICONO + ESPACIO_ICONO_TEXTO + anchoTexto;
    const xInicio = ANCHO_CANVAS / 2 - anchoTotal / 2;
    const cxIcono = xInicio + radioIcono;
    const xTexto = xInicio + DIAMETRO_ICONO + ESPACIO_ICONO_TEXTO;

    contexto.strokeStyle = COLOR_TEXTO;
    dibujarIcono(icono, contexto, cxIcono, ALTO_CANVAS / 2, radioIcono);

    contexto.textAlign = 'left';
    contexto.fillText(linea, xTexto, ALTO_CANVAS / 2);
    return;
  }

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
 *   icono?: string,
 * }} [opciones] `icono` es opcional, uno de los nombres soportados por
 *   `dibujarIcono` (ver `iconos.js`): 'subtitulos', 'imagenes', 'mapa',
 *   'pausa', 'aceptar', 'rechazar', 'reiniciar', 'menu', 'flecha'. Sólo
 *   tiene efecto cuando `lineas` tiene una única línea -- en un panel de
 *   varias líneas se ignora y el panel se dibuja igual que sin `icono`,
 *   porque no hay un único renglón con el que formar una unidad
 *   ícono+texto centrada.
 * @returns {THREE.Object3D}
 */
export function crearPanelTexto(lineas, opciones = {}) {
  const {
    posicion = POSICION_POR_DEFECTO,
    ancho = ANCHO_PANEL_POR_DEFECTO,
    alto = ALTO_PANEL_POR_DEFECTO,
    tamanoFuente = TAMANO_FUENTE_POR_DEFECTO,
    nombre = 'panel-texto',
    icono,
  } = opciones;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;

  const contexto = canvas.getContext('2d');
  dibujarLineasEnCanvas(contexto, lineas, tamanoFuente, icono);

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
