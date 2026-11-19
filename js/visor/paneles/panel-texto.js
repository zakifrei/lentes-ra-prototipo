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

// Ancho de canvas de referencia (resolución, no proporción): el alto real
// se calcula por llamada a partir del ancho/alto FÍSICO (metros) que pida
// cada pantalla -- ver `calcularResolucionCanvas` más abajo. Antes era un
// ALTO_CANVAS fijo de 512 (proporción 2:1) para cualquier panel, lo que
// deformaba el texto/ícono de cualquier botón que no fuera 2:1: los
// botones "+"/"-" cuadrados de pantalla-subtitulos.js/pantalla-imagenes.js
// quedaban con la textura 2:1 aplastada sobre un plano cuadrado, así que la
// raya vertical del "+" se veía más larga que la horizontal (bug
// reportado). Lo mismo afectaba, en menor grado, a pantalla-menu.js,
// pantalla-mapa.js y varios botones de texto (ninguno es exactamente 2:1).
const ANCHO_CANVAS_BASE = 1024;

// Margen horizontal (en px de canvas) que el texto nunca debe invadir. Se
// mide siempre contra ANCHO_CANVAS_BASE (el ancho de canvas nunca cambia
// entre llamadas, sólo el alto), así que sigue siendo válido para
// cualquier proporción de panel.
const MARGEN_HORIZONTAL = 40;

// Calcula la resolución de canvas que respeta la proporción FÍSICA
// (ancho/alto en metros) del panel pedido, mantenido el mismo ancho base
// de siempre para no perder nitidez. Con la proporción por defecto (2:1)
// da exactamente 1024x512, igual que antes -- ningún panel que ya fuera
// 2:1 cambia de comportamiento.
function calcularResolucionCanvas(ancho, alto) {
  const anchoCanvas = ANCHO_CANVAS_BASE;
  const altoCanvas = Math.round(ANCHO_CANVAS_BASE * (alto / ancho));
  return { anchoCanvas, altoCanvas };
}

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
// `negrita` tiene que reflejar la MISMA variante que se va a dibujar
// después (ver `dibujarLineasEnCanvas`): el texto en negrita mide distinto
// (más ancho) que el mismo texto en peso normal al mismo tamaño, así que
// medir con el peso equivocado daría un ajuste incorrecto.
function calcularTamanoFuenteAjustado(contexto, lineas, tamanoFuente, anchoCanvas, negrita) {
  contexto.font = `${negrita ? 'bold ' : ''}${tamanoFuente}px ${FUENTE_PRINCIPAL}`;
  const anchoDisponible = anchoCanvas - MARGEN_HORIZONTAL * 2;
  const anchoMaximo = Math.max(...lineas.map((linea) => contexto.measureText(linea).width));
  if (anchoMaximo <= anchoDisponible) return tamanoFuente;
  return tamanoFuente * (anchoDisponible / anchoMaximo);
}

// Espacio entre el ícono y el texto cuando ambos se dibujan juntos como una
// sola unidad centrada -- ver `dibujarLineasEnCanvas`. El diámetro del
// ícono ya no es una constante (dependía de ALTO_CANVAS, que ahora varía
// por llamada): se calcula adentro de `dibujarLineasEnCanvas`.
const ESPACIO_ICONO_TEXTO = 20;

function dibujarLineasEnCanvas(contexto, lineas, tamanoFuente, icono, anchoCanvas, altoCanvas, interactivo, negrita) {
  contexto.clearRect(0, 0, anchoCanvas, altoCanvas);

  dibujarFondoPanel(contexto, anchoCanvas, altoCanvas, interactivo);

  contexto.fillStyle = COLOR_TEXTO;
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const tamanoFuenteAjustado = calcularTamanoFuenteAjustado(contexto, lineas, tamanoFuente, anchoCanvas, negrita);
  const prefijoPeso = negrita ? 'bold ' : '';
  contexto.font = `${prefijoPeso}${tamanoFuenteAjustado}px ${FUENTE_PRINCIPAL}`;

  // Ícono opcional: sólo para etiquetas de una sola línea (regla explícita
  // del Review Focus del plan -- nunca se dibuja ícono sobre un panel de
  // varias líneas, donde no hay un único renglón con el que formar una
  // unidad centrada). Si no aplica, el dibujo sigue siendo IDÉNTICO al de
  // antes de esta tarea.
  if (icono && lineas.length === 1) {
    // Proporcional al tamaño de fuente YA ajustado (no a `altoCanvas`, como
    // antes): revisión de diseño 2026-11-18 -- con un ícono fijo en el 40%
    // del alto de canvas, el ícono terminaba 4-6 veces más grande que la
    // etiqueta de texto en los botones con panel más alto (p. ej. "Mapa
    // conceptual" en pantalla-menu.js), tapando la jerarquía: lo que
    // distingue a cada botón es el texto, no el ícono. 1.7x el tamaño de
    // fuente da un ícono claramente más grande que el texto (sigue leyéndose
    // como el elemento principal) sin devorarlo. Clampado contra el alto del
    // canvas por seguridad (nunca más que el 90% del panel), igual criterio
    // que el `Math.min` de `calcularRadioEsquinas` en tema-visual.js.
    const diametroIcono = Math.min(tamanoFuenteAjustado * 1.7, altoCanvas * 0.9);
    const linea = lineas[0];
    const anchoTexto = contexto.measureText(linea).width;
    const radioIcono = diametroIcono / 2;
    const anchoTotal = diametroIcono + ESPACIO_ICONO_TEXTO + anchoTexto;
    const xInicio = anchoCanvas / 2 - anchoTotal / 2;
    const cxIcono = xInicio + radioIcono;
    const xTexto = xInicio + diametroIcono + ESPACIO_ICONO_TEXTO;

    contexto.strokeStyle = COLOR_TEXTO;
    dibujarIcono(icono, contexto, cxIcono, altoCanvas / 2, radioIcono);

    contexto.textAlign = 'left';
    contexto.fillText(linea, xTexto, altoCanvas / 2);
    return;
  }

  const interlineado = tamanoFuenteAjustado * 1.4;
  const altoTotal = interlineado * lineas.length;
  const yInicial = altoCanvas / 2 - altoTotal / 2 + interlineado / 2;

  lineas.forEach((linea, indice) => {
    contexto.fillText(linea, anchoCanvas / 2, yInicial + indice * interlineado);
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
 *   interactivo?: boolean,
 *   negrita?: boolean,
 * }} [opciones] `icono` es opcional, uno de los nombres soportados por
 *   `dibujarIcono` (ver `iconos.js`): 'subtitulos', 'imagenes', 'mapa',
 *   'pausa', 'aceptar', 'rechazar', 'reiniciar', 'menu', 'flecha'. Sólo
 *   tiene efecto cuando `lineas` tiene una única línea -- en un panel de
 *   varias líneas se ignora y el panel se dibuja igual que sin `icono`,
 *   porque no hay un único renglón con el que formar una unidad
 *   ícono+texto centrada. `interactivo` (default `false`) marca este panel
 *   como un botón tocable -- ver el comentario grande sobre la variante
 *   "botón" en `dibujarFondoPanel` (tema-visual.js): cambia el color de
 *   fondo Y la forma (esquinas redondeadas en vez de rectangulares), para
 *   que se note a simple vista qué es tocable y qué es un cartel fijo de
 *   sólo lectura. `negrita` (default `false`) dibuja el texto en negrita --
 *   guía de diseño VR (hz-immersive-designer, referencia de "Spatial
 *   Layout"): evitar fuentes finas, que "pueden desaparecer o titilar" en
 *   las pantallas de un casco VR. Pensado para un único botón "cabecera"
 *   que deba notarse más pesado que el resto (ver boton-menu-flotante.js),
 *   no para aplicarse a todo el proyecto de una sola vez.
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
    interactivo = false,
    negrita = false,
  } = opciones;

  const { anchoCanvas, altoCanvas } = calcularResolucionCanvas(ancho, alto);

  const canvas = document.createElement('canvas');
  canvas.width = anchoCanvas;
  canvas.height = altoCanvas;

  const contexto = canvas.getContext('2d');
  dibujarLineasEnCanvas(contexto, lineas, tamanoFuente, icono, anchoCanvas, altoCanvas, interactivo, negrita);

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
