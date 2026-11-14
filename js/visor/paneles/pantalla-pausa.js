// Pantalla de pausa activa (Tarea 12): se muestra cuando el usuario acepta
// el aviso de atención (ver pantalla-aviso.js, que llama a
// `cambiarPantalla('pausa')`). Es una pantalla estática con un agregado: un
// contador en vivo de minutos transcurridos desde que se entró de verdad a
// esta pantalla.
//
// "De verdad" es la parte importante: esta pantalla se crea una sola vez
// al arrancar la app (ver main.js), así que el contador NO puede arrancar
// en el constructor -- si lo hiciera, el participante podría llegar acá
// con el reloj ya corriendo desde el arranque de la app, mostrando minutos
// que nunca pasó en pausa. Por eso `inicioMs` es estado interno mutable
// que sólo se fija en `alEntrar()`, llamado por el `cambiarPantalla`
// centralizado de main.js cada vez que detecta una transición real hacia
// 'pausa' (no al crear la pantalla, ni si el comando fue rechazado, ni si
// ya se estaba en 'pausa'). Mismo bug ya encontrado y arreglado en la
// Tarea 8 para el reloj del guion de subtítulos (ver pantalla-subtitulos.js)
// -- acá se aplica el mismo patrón desde el principio.
//
// El cálculo de minutos transcurridos vive en un módulo puro
// (`js/common/temporizador-pausa.js`, Tarea 11): esta pantalla sólo se
// encarga de dibujarlo sobre un canvas, igual que panel-texto.js, pero
// necesita redibujar en caliente (el contador cambia con el tiempo real),
// así que --igual que pantalla-subtitulos.js-- no reutiliza ese módulo
// para el panel principal.

import * as THREE from '../../../vendor/three/three.module.js';
import { minutosTranscurridos } from '../../common/temporizador-pausa.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 512;

// Margen horizontal (en px de canvas) que el texto nunca debe invadir.
const MARGEN_HORIZONTAL = 40;

// Tamaño físico del panel en metros (RA): ancho x alto. Misma proporción
// 2:1 que panel-texto.js, y misma posición por defecto (fuera del centro
// del campo visual, más abajo que la altura típica de los ojos).
const ANCHO_PANEL = 0.8;
const ALTO_PANEL = 0.4;
const POSICION_PANEL = { x: 0, y: 1.1, z: -1.2 };

const TAMANO_FUENTE_TEXTO = 36;
const TAMANO_FUENTE_CONTADOR = 48;

// Texto literal exacto pedido por la tarea -- no parafrasear ni cambiar
// comillas/apóstrofes.
const TEXTO_PAUSA =
  "Pausa iniciada. Podés sacarte los lentes. Lo que explique la profesora se guarda en 'Temas pendientes'";

// Parte un texto largo en líneas que entren en el ancho disponible del
// canvas (corta por palabra). panel-texto.js no se reutiliza acá (ver
// comentario de arriba sobre por qué hace falta redibujar en caliente),
// así que esta pantalla necesita su propio wrap de texto.
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

function dibujarPausa(contexto, minutos) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = 'rgba(0, 0, 0, 0.6)';
  contexto.fillRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = '#ffffff';
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const lineasTexto = partirEnLineas(contexto, TEXTO_PAUSA, TAMANO_FUENTE_TEXTO);
  const textoContador = `${minutos} min en pausa`;

  const interlineadoTexto = TAMANO_FUENTE_TEXTO * 1.4;
  const altoBloqueTexto = interlineadoTexto * lineasTexto.length;
  // Separación extra antes del contador, para que no quede pegado al texto.
  const espacioAntesContador = interlineadoTexto * 0.6;
  const altoTotal = altoBloqueTexto + espacioAntesContador + TAMANO_FUENTE_CONTADOR;

  let y = ALTO_CANVAS / 2 - altoTotal / 2 + interlineadoTexto / 2;

  contexto.font = `${TAMANO_FUENTE_TEXTO}px sans-serif`;
  lineasTexto.forEach((linea) => {
    contexto.fillText(linea, ANCHO_CANVAS / 2, y);
    y += interlineadoTexto;
  });

  y += espacioAntesContador;
  contexto.font = `bold ${TAMANO_FUENTE_CONTADOR}px sans-serif`;
  contexto.fillText(textoContador, ANCHO_CANVAS / 2, y);
}

/**
 * Crea la pantalla de pausa activa.
 *
 * No recibe `inicioMs` por parámetro (a diferencia de la firma sugerida en
 * el plan): como todas las pantallas se crean una sola vez al arrancar la
 * app (ver main.js), un `inicioMs` fijo al construirse quedaría
 * desactualizado apenas el usuario tardara en llegar a esta pantalla.  En
 * cambio, esta pantalla maneja su propio `inicioMs` interno, reiniciado en
 * cada entrada real -- mismo patrón que el reloj de guion de
 * `pantalla-subtitulos.js` (Tarea 8).
 *
 * @returns {THREE.Object3D} grupo con dos métodos agregados:
 *   - `alEntrar()`: reinicia el contador a 0 (lo llama `main.js` cada vez
 *     que detecta una transición real hacia 'pausa').
 *   - `actualizar(ahoraMs:number)`: redibuja el contador si el minuto
 *     mostrado cambió respecto de `ahoraMs` (lo llama `main.js` desde su
 *     loop de render, sólo mientras esta pantalla está activa).
 */
export function crearPantallaPausa() {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-pausa';

  // Valor inicial irrelevante en la práctica: se pisa en `alEntrar()`
  // antes de que el usuario pueda ver esta pantalla (ver comentario de
  // arriba). Se inicializa igual acá para que el primer `actualizar()` -- si
  // llegara a llamarse antes de la primera entrada real -- no explote.
  let inicioMs = Date.now();
  let ultimoMinutoDibujado = null;

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

  const panel = new THREE.Mesh(geometria, material);
  panel.name = 'pantalla-pausa-texto';
  panel.position.set(POSICION_PANEL.x, POSICION_PANEL.y, POSICION_PANEL.z);
  grupo.add(panel);

  function redibujarSiCambio(ahoraMs) {
    const minutos = minutosTranscurridos(inicioMs, ahoraMs);
    // Evita redibujar el canvas (y marcar la textura sucia) en cada cuadro
    // si el minuto mostrado no cambió -- el contador es en minutos, no
    // hace falta más resolución que esa.
    if (minutos === ultimoMinutoDibujado) return;
    ultimoMinutoDibujado = minutos;
    dibujarPausa(contexto, minutos);
    textura.needsUpdate = true;
  }
  redibujarSiCambio(Date.now());

  // Enganche genérico de "entró a esta pantalla" (ver cambiarPantalla en
  // main.js): reinicia el contador para que arranque en 0 en cada entrada
  // real, sin importar cuánto tiempo pasó desde que se creó esta pantalla
  // o desde la última vez que se estuvo en pausa.
  grupo.alEntrar = function alEntrarAPantallaPausa() {
    inicioMs = Date.now();
    ultimoMinutoDibujado = null;
    redibujarSiCambio(Date.now());
  };

  // Refresco en vivo: pensado para que main.js lo llame desde su loop de
  // render (`setAnimationLoop`) sólo mientras esta pantalla está activa.
  // No usa `setInterval` a propósito -- así no hay ningún temporizador que
  // sobreviva de más ni que haya que limpiar si este patrón se reutiliza
  // en otra pantalla futura.
  grupo.actualizar = function actualizarPantallaPausa(ahoraMs) {
    redibujarSiCambio(ahoraMs);
  };

  return grupo;
}
