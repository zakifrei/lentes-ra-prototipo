// Pantalla de "vuelta de la pausa" (Tarea 13): se muestra cuando el
// participante termina la pausa activa (ver pantalla-pausa.js, Tarea 12).
// Dos partes:
// - Un panel de mensaje con el texto literal armado por
//   `formatearTextoVuelta` (js/common/temporizador-pausa.js, Tarea 11).
// - Dos botones ("Seguir con la clase" / "Ver un resumen rápido"), con el
//   mismo mecanismo de selección único del proyecto (`enEventoSeleccion`,
//   ver interaccion.js) y el mismo patrón de raycasting que
//   pantalla-menu.js.
//
// Como el resto de las pantallas, ésta se crea una sola vez al arrancar la
// app (ver main.js): los minutos/temas a mostrar no se conocen en ese
// momento (recién se saben cuando el participante efectivamente termina
// una pausa), así que -- igual que pantalla-pausa.js se desvía de la firma
// `crearPantallaPausa(inicioMs)` sugerida en el plan -- esta pantalla se
// desvía de la firma `crearPantallaVuelta(minutos, temas, onSeguirClase,
// onVerResumen)` sugerida en el plan: en vez de recibir `minutos`/`temas`
// al crearse, expone `actualizarDatos(minutos, temas)` para que `main.js`
// la llame justo antes de mostrar esta pantalla, con los datos reales de
// esa pausa en particular.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { formatearTextoVuelta } from '../../common/temporizador-pausa.js';
import { enEventoSeleccion } from '../interaccion.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 512;

// Margen horizontal (en px de canvas) que el texto nunca debe invadir.
const MARGEN_HORIZONTAL = 40;
const TAMANO_FUENTE_MENSAJE = 40;

// Tamaños y posiciones físicas (metros, RA). Todo por debajo de la altura
// típica de los ojos (~1.6 m) y repartido en dos filas (mensaje arriba,
// botones abajo) para que, igual que el resto de las pantallas del
// proyecto, nunca cubran el centro del campo visual.
const ANCHO_PANEL_MENSAJE = 0.9;
const ALTO_PANEL_MENSAJE = 0.35;
const POSICION_MENSAJE = { x: 0, y: 1.3, z: -1.2 };

const ANCHO_BOTON = 0.6;
const ALTO_BOTON = 0.3;
const ALTURA_Y_BOTONES = 0.88;
const PROFUNDIDAD_Z_BOTONES = -1.2;
// Separación horizontal entre centros de botones: con ANCHO_BOTON = 0.6
// deja ~0.1 m de aire entre bordes (mismo criterio que pantalla-menu.js),
// para que no se puedan tocar por error.
const SEPARACION_X = 0.35;

const TEXTO_BOTON_SEGUIR = 'Seguir con la clase';
const TEXTO_BOTON_RESUMEN = 'Ver un resumen rápido';

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

// Parte un texto largo en líneas que entren en el ancho disponible del
// canvas (corta por palabra). No reutiliza panel-texto.js para este panel
// -- igual que pantalla-pausa.js (ver su comentario sobre por qué), este
// panel necesita redibujarse en caliente cuando cambian los datos de la
// pausa, así que arma su propio canvas en vez de uno fijo creado una sola
// vez.
function partirEnLineas(contexto, texto, tamanoFuente) {
  contexto.font = `${tamanoFuente}px sans-serif`;
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

function dibujarMensaje(contexto, texto) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = 'rgba(0, 0, 0, 0.6)';
  contexto.fillRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = '#ffffff';
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const lineas = partirEnLineas(contexto, texto, TAMANO_FUENTE_MENSAJE);
  const interlineado = TAMANO_FUENTE_MENSAJE * 1.4;
  const altoTotal = interlineado * lineas.length;
  let y = ALTO_CANVAS / 2 - altoTotal / 2 + interlineado / 2;

  contexto.font = `${TAMANO_FUENTE_MENSAJE}px sans-serif`;
  lineas.forEach((linea) => {
    contexto.fillText(linea, ANCHO_CANVAS / 2, y);
    y += interlineado;
  });
}

/**
 * Crea la pantalla de "vuelta de la pausa".
 *
 * No recibe `minutos`/`temas` por parámetro (a diferencia de la firma
 * sugerida en el plan): ver comentario de arriba. En cambio, arranca
 * mostrando el texto con 0 minutos / 0 temas (valor irrelevante en la
 * práctica -- se pisa con `actualizarDatos` antes de que el usuario pueda
 * ver esta pantalla, igual que el `inicioMs` inicial de pantalla-pausa.js).
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onSeguirClase llamado al tocar "Seguir con la clase"
 * @param {() => void} onVerResumen llamado al tocar "Ver un resumen rápido"
 * @returns {THREE.Object3D} grupo con un método agregado:
 *   - `actualizarDatos(minutos:number, temas:number)`: redibuja el panel
 *     de mensaje con `formatearTextoVuelta(minutos, temas)`. La llama
 *     `main.js` dentro de `aplicarComandoYActualizar` (Tarea 17) al entrar
 *     de verdad a esta pantalla -- desde la Tarea 26 siempre con
 *     `MINUTOS_PAUSA_FIJOS` (ver main.js), nunca con la duración real de la
 *     pausa.
 */
export function crearPantallaVuelta(renderer, onSeguirClase, onVerResumen) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-vuelta';

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
  panelMensaje.name = 'pantalla-vuelta-mensaje';
  panelMensaje.position.set(POSICION_MENSAJE.x, POSICION_MENSAJE.y, POSICION_MENSAJE.z);
  grupo.add(panelMensaje);

  dibujarMensaje(contexto, formatearTextoVuelta(0, 0));
  textura.needsUpdate = true;

  grupo.actualizarDatos = function actualizarDatosPantallaVuelta(minutos, temas) {
    dibujarMensaje(contexto, formatearTextoVuelta(minutos, temas));
    textura.needsUpdate = true;
  };

  // Botones: texto fijo, así que sí se apoyan en panel-texto.js (a
  // diferencia del panel de mensaje de arriba, que necesita redibujarse en
  // caliente).
  const botonSeguir = crearPanelTexto([TEXTO_BOTON_SEGUIR], {
    posicion: { x: -SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-vuelta-boton-seguir',
  });
  botonSeguir.userData.accion = 'seguir';
  grupo.add(botonSeguir);

  const botonResumen = crearPanelTexto([TEXTO_BOTON_RESUMEN], {
    posicion: { x: SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-vuelta-boton-resumen',
  });
  botonResumen.userData.accion = 'resumen';
  grupo.add(botonResumen);

  const botones = [botonSeguir, botonResumen];

  enEventoSeleccion(renderer, (origen, direccion) => {
    // El raycasting de Three.js no filtra por `.visible` (sólo por
    // `layers`): si esta pantalla no es la activa, hay que ignorar el
    // gesto a mano, o sus botones "fantasma" capturarían clicks pensados
    // para la pantalla que sí se está mostrando (mismo criterio que
    // pantalla-menu.js).
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return; // no tocó ningún botón: no hacer nada

    const accion = impactos[0].object.userData.accion;
    if (accion === 'seguir') onSeguirClase();
    else if (accion === 'resumen') onVerResumen();
  });

  return grupo;
}
