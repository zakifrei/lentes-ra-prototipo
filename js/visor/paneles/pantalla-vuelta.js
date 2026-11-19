// Pantalla de "vuelta de la pausa" (Tarea 13): se muestra cuando el
// participante termina la pausa activa (ver pantalla-pausa.js, Tarea 12).
// Dos partes:
// - Un panel de mensaje con las 3 líneas armadas por `armarLineasVuelta`
//   (js/common/temporizador-pausa.js, Tarea 11).
// - Dos botones ("Seguir con la clase" / "Ver un resumen rápido"), con el
//   mismo mecanismo de selección único del proyecto (`enEventoSeleccion`,
//   ver interaccion.js) y el mismo patrón de raycasting que
//   pantalla-menu.js.
//
// El panel de mensaje dibuja 3 bloques de tamaños distintos (saludo grande
// en negrita, minutos en pausa mediano, temas guardados chico en ámbar) --
// a pedido del dueño del proyecto, mismo estilo que pantalla-bienvenida.js
// (3 líneas separadas, no una sola oración larga unida con "·"). A
// diferencia de bienvenida.js, acá el contenido cambia en caliente (los
// minutos/temas reales recién se conocen cuando termina la pausa), así que
// el dibujado vive en una función que se puede volver a llamar
// (`dibujarMensaje`), igual que la versión anterior de este archivo.
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
import { armarLineasVuelta } from '../../common/temporizador-pausa.js';
import { enEventoSeleccion } from '../interaccion.js';
import { dibujarFondoPanel, COLOR_TEXTO, COLOR_AMBAR_TEXTO, FUENTE_PRINCIPAL } from '../tema-visual.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 512;

// Margen horizontal (en px de canvas) que ningún bloque de texto debe
// invadir -- mismo criterio que pantalla-bienvenida.js.
const MARGEN_HORIZONTAL = 40;
const ANCHO_DISPONIBLE = ANCHO_CANVAS - MARGEN_HORIZONTAL * 2;

// 3 tamaños de fuente distintos, de mayor a menor -- mismos valores que
// pantalla-bienvenida.js (incluido el agrandado "un poco" de pulido visual),
// para que ambas pantallas de "bloques apilados" se vean consistentes entre sí.
const TAMANO_FUENTE_SALUDO = 80;
const TAMANO_FUENTE_MINUTOS = 46;
const TAMANO_FUENTE_TEMAS = 38;

// Posición vertical de cada bloque, como fracción de ALTO_CANVAS -- mismos
// valores que pantalla-bienvenida.js.
const Y_FRACCION_SALUDO = 0.22;
const Y_FRACCION_MINUTOS = 0.5;
const Y_FRACCION_TEMAS = 0.78;

// Tamaños y posiciones físicas (metros, RA). Todo por debajo de la altura
// típica de los ojos (~1.6 m) y repartido en dos filas (mensaje arriba,
// botones abajo) para que, igual que el resto de las pantallas del
// proyecto, nunca cubran el centro del campo visual. ALTO_PANEL_MENSAJE
// sube de 0.35 a 0.45 (misma proporción 2:1 que ANCHO_PANEL_MENSAJE/
// ANCHO_CANVAS·ALTO_CANVAS) para que los 3 bloques apilados no se vean
// verticalmente comprimidos -- con el 0.35 anterior (pensado para una sola
// línea) el panel era más chato que el canvas, así que el texto se veía
// más bajo/aplastado de lo que mide en el canvas.
const ANCHO_PANEL_MENSAJE = 0.9;
const ALTO_PANEL_MENSAJE = 0.45;
const POSICION_MENSAJE = { x: 0, y: 1.3, z: -1.8 };

// Achicados de 0.6x0.3 a 0.5x0.25 (pulido visual, a pedido del dueño del
// proyecto: se veían "gigantes") -- misma proporción 2:1 de antes, mismo
// criterio que pantalla-aviso.js.
const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.25;
const ALTURA_Y_BOTONES = 0.88;
const PROFUNDIDAD_Z_BOTONES = -1.8;
// Separación horizontal entre centros de botones: con el ANCHO_BOTON = 0.5
// de arriba deja ~0.2 m de aire entre bordes (más que antes, porque el
// botón se achicó y esta separación no se tocó), para que no se puedan
// tocar por error.
const SEPARACION_X = 0.35;

const TEXTO_BOTON_SEGUIR = 'Seguir con la clase';
const TEXTO_BOTON_RESUMEN = 'Ver un resumen rápido';

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

// Si un bloque no entra en ANCHO_DISPONIBLE con su tamaño de fuente pedido,
// se reduce SÓLO ese bloque hasta que entre -- mismo criterio que
// pantalla-bienvenida.js (cada bloque tiene su propio tamaño independiente,
// a diferencia de panel-texto.js, que ajusta todas las líneas a un tamaño
// compartido según la más larga). Recibe `fuenteCss` (y no un `px` fijo)
// para medir con el MISMO estilo (negrita o normal) con el que después se
// dibuja ese bloque -- el saludo se dibuja en negrita, que es más ancha que
// la versión normal al mismo tamaño; medir siempre en normal haría que el
// saludo en negrita se pasara del margen aunque la medición dijera que
// entraba.
function calcularTamanoFuenteAjustado(contexto, texto, tamanoFuente, fuenteCss) {
  contexto.font = fuenteCss(tamanoFuente);
  const ancho = contexto.measureText(texto).width;
  if (ancho <= ANCHO_DISPONIBLE) return tamanoFuente;
  return tamanoFuente * (ANCHO_DISPONIBLE / ancho);
}

// Dibuja los 3 bloques (`lineas` siempre tiene exactamente 3 elementos, ver
// `armarLineasVuelta`): saludo grande en negrita, minutos en pausa mediano,
// temas guardados chico en ámbar (mismo acento que el tip de
// pantalla-bienvenida.js, acá resaltando que el contenido quedó guardado).
// No reutiliza panel-texto.js para este panel -- igual que
// pantalla-pausa.js (ver su comentario sobre por qué), este panel necesita
// redibujarse en caliente cuando cambian los datos de la pausa, así que
// arma su propio canvas en vez de uno fijo creado una sola vez.
function dibujarMensaje(contexto, lineas) {
  const [saludo, minutos, temas] = lineas;

  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  dibujarFondoPanel(contexto, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const fuenteBoldCss = (tamano) => `bold ${tamano}px ${FUENTE_PRINCIPAL}`;
  const fuenteNormalCss = (tamano) => `${tamano}px ${FUENTE_PRINCIPAL}`;

  const tamanoSaludo = calcularTamanoFuenteAjustado(
    contexto,
    saludo,
    TAMANO_FUENTE_SALUDO,
    fuenteBoldCss
  );
  contexto.font = fuenteBoldCss(tamanoSaludo);
  contexto.fillStyle = COLOR_TEXTO;
  contexto.fillText(saludo, ANCHO_CANVAS / 2, ALTO_CANVAS * Y_FRACCION_SALUDO);

  const tamanoMinutos = calcularTamanoFuenteAjustado(
    contexto,
    minutos,
    TAMANO_FUENTE_MINUTOS,
    fuenteNormalCss
  );
  contexto.font = fuenteNormalCss(tamanoMinutos);
  contexto.fillStyle = COLOR_TEXTO;
  contexto.fillText(minutos, ANCHO_CANVAS / 2, ALTO_CANVAS * Y_FRACCION_MINUTOS);

  const tamanoTemas = calcularTamanoFuenteAjustado(
    contexto,
    temas,
    TAMANO_FUENTE_TEMAS,
    fuenteNormalCss
  );
  contexto.font = fuenteNormalCss(tamanoTemas);
  contexto.fillStyle = COLOR_AMBAR_TEXTO;
  contexto.fillText(temas, ANCHO_CANVAS / 2, ALTO_CANVAS * Y_FRACCION_TEMAS);
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
 *     de mensaje con `armarLineasVuelta(minutos, temas)`. La llama
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

  dibujarMensaje(contexto, armarLineasVuelta(0, 0));
  textura.needsUpdate = true;

  grupo.actualizarDatos = function actualizarDatosPantallaVuelta(minutos, temas) {
    dibujarMensaje(contexto, armarLineasVuelta(minutos, temas));
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
    icono: 'flecha',
    interactivo: true,
  });
  botonSeguir.userData.accion = 'seguir';
  grupo.add(botonSeguir);

  const botonResumen = crearPanelTexto([TEXTO_BOTON_RESUMEN], {
    posicion: { x: SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-vuelta-boton-resumen',
    icono: 'flecha',
    interactivo: true,
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
