// Pantalla de subtítulos reales: muestra la línea vigente del guion
// (`GUION_SUBTITULOS`, ver js/common/subtitulos-guion.js) según el tiempo
// transcurrido desde que se creó esta pantalla, con tamaño ajustable y
// persistente mediante dos botones ("+"/"-"). Reemplaza al panel
// placeholder de una tarea anterior (texto fijo de ejemplo, siempre
// visible): ahora el contenido es real y el tamaño es chico por defecto
// (ver TAMANO_MIN en persistencia.js) -- el usuario lo agranda si lo
// necesita.
//
// Igual que el resto de las pantallas, se ubica fuera del centro del
// campo visual (más abajo que la altura típica de los ojos), como
// subtítulos reales de video. El texto se dibuja con Canvas 2D sobre una
// `CanvasTexture`, igual que panel-texto.js, pero acá sí hace falta
// redibujar en caliente (cambia el texto con el tiempo y el tamaño con
// los botones), así que no se reutiliza ese módulo para el panel
// principal -- sólo para los dos botones, que son estáticos.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion } from '../interaccion.js';
import { lineaActual } from '../../common/subtitulos-guion.js';
import { ajustarTamanoSubtitulo } from '../../common/persistencia.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 256;

// Margen horizontal (en px de canvas) que el texto nunca debe invadir.
const MARGEN_HORIZONTAL = 40;

// Tamaño físico del panel en metros (RA): ancho x alto.
const ANCHO_PANEL = 0.7;
const ALTO_PANEL = 0.175;

// Misma zona que el panel de subtítulos original: debajo de la altura
// típica de los ojos (~1.6 m), fuera del centro del campo visual.
const POSICION_SUBTITULO = { x: 0, y: 1.2, z: -1 };

// Tamaño de fuente (px de canvas) para el factor de escala 1 (el mínimo).
const TAMANO_FUENTE_BASE = 40;

const ANCHO_BOTON = 0.12;
const ALTO_BOTON = 0.12;
// Separación horizontal entre centros de botones: con ANCHO_BOTON = 0.12
// deja aire suficiente entre bordes para no tocarlos por error.
const SEPARACION_BOTONES = 0.3;
// Debajo del panel de subtítulos: nunca encima (mismo criterio que el
// resto de los paneles del proyecto).
const Y_BOTONES = POSICION_SUBTITULO.y - ALTO_PANEL / 2 - 0.15;

// Cada cuánto se revisa si hay que avanzar de línea (no hace falta
// redibujar en cada cuadro: el guion avanza en segundos, no en cuadros).
const INTERVALO_ACTUALIZACION_MS = 1000;

// Si el texto no entra en el ancho disponible del canvas con el tamaño de
// fuente pedido (puede pasar con el factor de escala más grande, o con
// líneas largas del guion), se reduce ese tamaño hasta que entre con
// margen -- mismo criterio que panel-texto.js, para que los subtítulos
// nunca se corten contra el borde del panel.
function calcularTamanoFuenteAjustado(contexto, texto, tamanoFuente) {
  contexto.font = `${tamanoFuente}px sans-serif`;
  const anchoDisponible = ANCHO_CANVAS - MARGEN_HORIZONTAL * 2;
  const anchoTexto = contexto.measureText(texto).width;
  if (anchoTexto <= anchoDisponible) return tamanoFuente;
  return tamanoFuente * (anchoDisponible / anchoTexto);
}

function dibujarSubtitulo(contexto, texto, tamanoFuente) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = 'rgba(0, 0, 0, 0.6)';
  contexto.fillRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = '#ffffff';
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const tamanoFuenteAjustado = calcularTamanoFuenteAjustado(contexto, texto, tamanoFuente);
  contexto.font = `${tamanoFuenteAjustado}px sans-serif`;
  contexto.fillText(texto, ANCHO_CANVAS / 2, ALTO_CANVAS / 2);
}

/**
 * Crea la pantalla de subtítulos.
 *
 * El tamaño arranca en `persistencia.tamanoSubtitulo` (el mínimo, por
 * diseño -- ver TAMANO_MIN en persistencia.js) y esta pantalla mantiene su
 * propia copia para poder redibujar su canvas; cada vez que el usuario lo
 * cambia con los botones "+"/"-", además de redibujarse a sí misma llama a
 * `onCambiarTamano(delta)` para que quien la creó (`main.js`) actualice su
 * propio estado de persistencia (ver Paso 7 del plan de la tarea) con la
 * misma función pura (`ajustarTamanoSubtitulo`), así ambas copias quedan
 * siempre sincronizadas.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {{tamanoSubtitulo:number, imagenes:object}} persistencia
 * @param {(delta:number) => void} onCambiarTamano
 * @returns {THREE.Object3D}
 */
export function crearPantallaSubtitulos(renderer, persistencia, onCambiarTamano) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-subtitulos';

  let estadoLocal = { ...persistencia };
  const inicio = performance.now();
  let ultimoTextoDibujado = null;
  let ultimoTamanoDibujado = null;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;
  const contexto = canvas.getContext('2d');

  const textura = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    // Igual que el resto de los paneles: siempre debe leerse, sin
    // importar la luz de la escena ni el ángulo desde el que se lo mire.
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const geometria = new THREE.PlaneGeometry(ANCHO_PANEL, ALTO_PANEL);

  const panelSubtitulo = new THREE.Mesh(geometria, material);
  panelSubtitulo.name = 'pantalla-subtitulos-texto';
  panelSubtitulo.position.set(POSICION_SUBTITULO.x, POSICION_SUBTITULO.y, POSICION_SUBTITULO.z);
  grupo.add(panelSubtitulo);

  function redibujar() {
    const segundosTranscurridos = (performance.now() - inicio) / 1000;
    const texto = lineaActual(segundosTranscurridos);
    const tamanoFuente = TAMANO_FUENTE_BASE * estadoLocal.tamanoSubtitulo;

    if (texto === ultimoTextoDibujado && tamanoFuente === ultimoTamanoDibujado) return;
    ultimoTextoDibujado = texto;
    ultimoTamanoDibujado = tamanoFuente;

    dibujarSubtitulo(contexto, texto, tamanoFuente);
    textura.needsUpdate = true;
  }
  redibujar();
  setInterval(redibujar, INTERVALO_ACTUALIZACION_MS);

  // Botones "+"/"-": paneles de texto chicos y estáticos (no cambian), así
  // que sí se reutiliza crearPanelTexto para ellos.
  const botonMas = crearPanelTexto(['+'], {
    posicion: { x: SEPARACION_BOTONES / 2, y: Y_BOTONES, z: POSICION_SUBTITULO.z },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-subtitulos-boton-mas',
  });
  botonMas.userData.delta = 1;

  const botonMenos = crearPanelTexto(['-'], {
    posicion: { x: -SEPARACION_BOTONES / 2, y: Y_BOTONES, z: POSICION_SUBTITULO.z },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-subtitulos-boton-menos',
  });
  botonMenos.userData.delta = -1;

  grupo.add(botonMas, botonMenos);
  const botones = [botonMas, botonMenos];

  const raycaster = new THREE.Raycaster();
  const vectorOrigen = new THREE.Vector3();
  const vectorDireccion = new THREE.Vector3();

  enEventoSeleccion(renderer, (origen, direccion) => {
    // Mismo criterio que pantalla-menu.js: el raycasting no filtra por
    // `.visible`, así que si esta pantalla no es la activa hay que
    // ignorar el gesto a mano.
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return; // no tocó ningún botón

    const delta = impactos[0].object.userData.delta;
    estadoLocal = ajustarTamanoSubtitulo(estadoLocal, delta);
    redibujar();
    onCambiarTamano(delta);
  });

  return grupo;
}
