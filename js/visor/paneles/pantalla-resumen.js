// Pantalla de "resumen rápido" (Tarea 14): se llega acá desde "Ver un
// resumen rápido" en pantalla-vuelta.js. Dos partes, mismo patrón que esa
// pantalla:
// - Un panel de mensaje con el texto fijo `RESUMEN_CLASE`
//   (js/common/resumen-clase.js), partido en líneas que entren en el ancho
//   del canvas.
// - Un botón ("Volver a la clase") con el mismo mecanismo de selección
//   único del proyecto (`enEventoSeleccion`, ver interaccion.js).
//
// A diferencia del panel de mensaje de pantalla-vuelta.js, `RESUMEN_CLASE`
// es un texto fijo que no cambia nunca (no hay un `actualizarDatos` acá):
// se dibuja una sola vez, al crear esta pantalla.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { RESUMEN_CLASE } from '../../common/resumen-clase.js';
import { enEventoSeleccion } from '../interaccion.js';
import { dibujarFondoPanel, COLOR_TEXTO, FUENTE_PRINCIPAL } from '../tema-visual.js';

// Tamaños y posiciones físicas (metros, RA). Igual que el resto de las
// pantallas del proyecto: todo por debajo de la altura típica de los ojos
// (~1.6 m) y repartido en dos filas (mensaje arriba, botón abajo), para que
// nunca cubran el centro del campo visual.
const ANCHO_PANEL_MENSAJE = 0.9;
const ALTO_PANEL_MENSAJE = 0.5;
const POSICION_MENSAJE = { x: 0, y: 1.25, z: -1.8 };

// ANCHO_CANVAS fijo (resolución, no proporción) y ALTO_CANVAS calculado a
// partir de la proporción FÍSICA real del panel (ANCHO_PANEL_MENSAJE /
// ALTO_PANEL_MENSAJE = 1.8:1, no 2:1) -- mismo criterio que
// `calcularResolucionCanvas` de panel-texto.js (pulido visual): antes este
// archivo usaba un ALTO_CANVAS=512 fijo (2:1) sobre un panel 1.8:1, lo que
// achataba levemente el párrafo dibujado. De paso, el canvas más alto
// (569 en vez de 512) le da más margen vertical al párrafo, que no tiene
// ningún ajuste automático de alto (ver comentario de TAMANO_FUENTE_MENSAJE
// más abajo).
const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = Math.round(ANCHO_CANVAS * (ALTO_PANEL_MENSAJE / ANCHO_PANEL_MENSAJE));

// Margen horizontal (en px de canvas) que el texto nunca debe invadir.
const MARGEN_HORIZONTAL = 40;
// Más chico que pantalla-vuelta.js (40px): `RESUMEN_CLASE` es un párrafo de
// varias oraciones, no un mensaje corto, así que necesita más líneas y un
// tamaño de fuente menor para entrar con margen en el mismo panel. Subido
// de 28 a 30 (pulido visual, "un poco" más grande a pedido del dueño del
// proyecto): un salto chico a propósito, porque este párrafo ya ocupa la
// mayor parte del alto del panel y no hay un ajuste automático de alto acá
// (ver `partirEnLineas`, más abajo) que lo proteja de desbordar verticalmente
// si se agranda de más.
const TAMANO_FUENTE_MENSAJE = 30;

// Achicados de 0.6x0.25 a 0.5x0.21 (pulido visual, a pedido del dueño del
// proyecto: se veía "gigante") -- misma proporción (~2.4:1) de antes.
const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.21;
const POSICION_BOTON = { x: 0, y: 0.8, z: -1.8 };

const TEXTO_BOTON_VOLVER = 'Volver a la clase';

// Tamaño de fuente explícito (revisión de diseño VR, skill
// hz-immersive-designer): sin esto, este botón quedaba en el default de
// panel-texto.js (48px), que a este ancho de panel (0.5 m) renderiza el
// texto a ~23.4 mm físicos de alto -- por debajo del mínimo de legibilidad
// que documenta Meta para VR (~1° de arco visual, ~31.4 mm a los 1.8 m de
// distancia a la que vive este panel). 76px da ~37 mm, con margen real
// sobre ese mínimo, y sigue entrando con ícono sin que
// `calcularTamanoFuenteAjustado` tenga que achicarlo (confirmado midiendo
// con `measureText` en el navegador real del proyecto).
const TAMANO_FUENTE_BOTON = 76;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

// Parte un texto largo en líneas que entren en el ancho disponible del
// canvas (corta por palabra). Mismo criterio que pantalla-vuelta.js y
// pantalla-pausa.js: como acá el texto es fijo, se podría usar
// panel-texto.js armando las líneas a mano, pero ese módulo ajusta el
// tamaño de fuente según la línea más larga, no según el párrafo entero --
// con un párrafo de varias oraciones conviene partirlo acá mismo, con un
// tamaño de fuente ya elegido para que el bloque completo entre en el
// panel.
function partirEnLineas(contexto, texto, tamanoFuente) {
  contexto.font = `${tamanoFuente}px ${FUENTE_PRINCIPAL}`;
  const anchoDisponible = ANCHO_CANVAS - MARGEN_HORIZONTAL * 2;
  const palabras = texto.split(' ');
  const lineas = [];
  let lineaEnCurso = '';

  palabras.forEach((palabra) => {
    const propuesta = lineaEnCurso ? `${lineaEnCurso} ${palabra}` : palabra;
    if (contexto.measureText(propuesta).width <= anchoDisponible) {
      lineaEnCurso = propuesta;
    } else {
      if (lineaEnCurso) lineas.push(lineaEnCurso);
      lineaEnCurso = palabra;
    }
  });
  if (lineaEnCurso) lineas.push(lineaEnCurso);
  return lineas;
}

function dibujarResumen(contexto, texto) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  dibujarFondoPanel(contexto, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = COLOR_TEXTO;
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const lineas = partirEnLineas(contexto, texto, TAMANO_FUENTE_MENSAJE);
  const interlineado = TAMANO_FUENTE_MENSAJE * 1.4;
  const altoTotal = interlineado * lineas.length;
  let y = ALTO_CANVAS / 2 - altoTotal / 2 + interlineado / 2;

  contexto.font = `${TAMANO_FUENTE_MENSAJE}px ${FUENTE_PRINCIPAL}`;
  lineas.forEach((linea) => {
    contexto.fillText(linea, ANCHO_CANVAS / 2, y);
    y += interlineado;
  });
}

/**
 * Crea la pantalla de "resumen rápido".
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onVolverClase llamado al tocar "Volver a la clase"
 * @returns {THREE.Object3D}
 */
export function crearPantallaResumen(renderer, onVolverClase) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-resumen';

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;
  const contexto = canvas.getContext('2d');

  const textura = new THREE.CanvasTexture(canvas);
  const materialMensaje = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    // Igual que el resto de los paneles: siempre debe leerse, sin
    // importar la luz de la escena ni el ángulo desde el que se lo mire.
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const geometriaMensaje = new THREE.PlaneGeometry(ANCHO_PANEL_MENSAJE, ALTO_PANEL_MENSAJE);

  const panelMensaje = new THREE.Mesh(geometriaMensaje, materialMensaje);
  panelMensaje.name = 'pantalla-resumen-mensaje';
  panelMensaje.position.set(POSICION_MENSAJE.x, POSICION_MENSAJE.y, POSICION_MENSAJE.z);
  grupo.add(panelMensaje);

  dibujarResumen(contexto, RESUMEN_CLASE);
  textura.needsUpdate = true;

  // Botón: texto fijo, así que sí se apoya en panel-texto.js (a diferencia
  // del panel de mensaje de arriba).
  const botonVolver = crearPanelTexto([TEXTO_BOTON_VOLVER], {
    posicion: POSICION_BOTON,
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-resumen-boton-volver',
    icono: 'flecha',
    interactivo: true,
  });
  grupo.add(botonVolver);

  const botones = [botonVolver];

  enEventoSeleccion(renderer, (origen, direccion) => {
    // El raycasting de Three.js no filtra por `.visible` (sólo por
    // `layers`): si esta pantalla no es la activa, hay que ignorar el
    // gesto a mano, o su botón "fantasma" capturaría clicks pensados para
    // la pantalla que sí se está mostrando (mismo criterio que
    // pantalla-menu.js/pantalla-vuelta.js).
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return; // no tocó el botón: no hacer nada

    onVolverClase();
  });

  return grupo;
}
