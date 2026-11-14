// Punto de entrada del visor: monta una escena básica de Three.js sobre el
// <canvas id="escena"> de index.html. El fondo es transparente porque en RA
// (passthrough del Quest) el canvas se superpone al video de la cámara; en
// un navegador de escritorio sin WebXR se ve simplemente negro.

import * as THREE from '../../vendor/three/three.module.js';
import { iniciarBotonXR } from './xr-sesion.js';
import { activarVistaPrevia } from '../vista-previa/control-mouse.js';
import { crearPantallaReconocimiento } from './paneles/pantalla-reconocimiento.js';
import { crearPantallaBienvenida } from './paneles/pantalla-bienvenida.js';
import { crearPantallaMenu } from './paneles/pantalla-menu.js';
import { crearPantallaSubtitulos } from './paneles/pantalla-subtitulos.js';
import { crearPantallaImagenes } from './paneles/pantalla-imagenes.js';
import { crearPantallaMapa } from './paneles/pantalla-mapa.js';
import { crearPantallaAviso } from './paneles/pantalla-aviso.js';
import { crearPantallaPausa } from './paneles/pantalla-pausa.js';
import { crearPantallaVuelta } from './paneles/pantalla-vuelta.js';
import { habilitarNavegacionDev } from './navegacion-dev.js';
import { establecerCamaraVistaPrevia } from './interaccion.js';
import { estadoPorDefecto, aplicarComando } from '../common/estado.js';
import { minutosTranscurridos } from '../common/temporizador-pausa.js';
import {
  estadoPersistenciaInicial,
  ajustarTamanoSubtitulo,
  guardarPosicionImagen,
  guardarEscalaImagen,
} from '../common/persistencia.js';

// Imágenes reales descargadas a assets/imagenes/ (ver CREDITS.md: autor y
// licencia de cada una). Nunca enlazadas en línea -- quedan en el repo.
const RUTAS_IMAGENES = [
  'assets/imagenes/mapa-imperio-romano-occidente-395.png',
  'assets/imagenes/mapa-rutas-invasiones-barbaras.jpg',
  'assets/imagenes/mapa-reino-de-odoacro-476.png',
  'assets/imagenes/pintura-saqueo-de-roma-410-sylvestre.jpg',
  'assets/imagenes/ilustracion-romulo-augusto-y-odoacro.jpg',
  'assets/imagenes/ilustracion-teodorico-mata-a-odoacro-493.jpg',
  'assets/imagenes/moneda-solido-de-oro-romulo-augusto.jpg',
  'assets/imagenes/pintura-alarico-depone-a-atalo-410.jpg',
];

// Cantidad de "temas pendientes" que se muestra en la pantalla de "vuelta
// de la pausa" (Tarea 13): constante fija a propósito, a diferencia de los
// minutos (que sí son dinámicos, calculados de la duración real de la
// pausa) -- el spec sólo pide que el observador pueda ajustar el tiempo
// mostrado, nunca la cantidad de temas (todavía no hay una fuente real de
// "temas guardados" en 'Temas pendientes', ver pantalla-pausa.js).
const TEMAS_PENDIENTES_EJEMPLO = 2;

const canvas = document.getElementById('escena');
const indicadorVistaPrevia = document.getElementById('indicador-vista-previa');

const escena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
// Distancia de arranque elegida para que la vista previa de escritorio
// quede a una distancia comparable al "alcance del brazo" (~1.5-2 m) para
// el que están pensadas las pantallas estáticas (menú, subtítulos,
// imágenes, mapa, etc.), todas alrededor de z=-1 a z=-1.3 (ver
// POSICION_POR_DEFECTO en panel-texto.js y la posición propia de cada
// pantalla). Con z=3 (valor anterior, heredado del esqueleto vacío de la
// Tarea 1) la distancia real terminaba siendo de ~4.2 m: el contenido se
// veía como una mota minúscula cerca del borde inferior del cuadro, fácil
// de confundir con "no hay nada" (bug reportado en pruebas de usabilidad).
// Esto NO afecta a la sesión WebXR real: una vez que arranca, la pose
// trackeada del casco pisa esta posición en cada cuadro (ver
// xr-sesion.js/WebXRManager de Three.js) -- sólo cambia dónde arranca la
// cámara de la vista previa de escritorio antes de orbitar con el mouse.
camara.position.set(0, 1.6, 0.6);

// `interaccion.js` necesita la cámara para calcular el rayo del mouse en
// la vista previa de escritorio (ver js/visor/interaccion.js).
establecerCamaraVistaPrevia(camara);

const renderizador = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderizador.setPixelRatio(window.devicePixelRatio);
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.setClearColor(0x000000, 0);

const luzAmbiental = new THREE.AmbientLight(0xffffff, 1);
escena.add(luzAmbiental);

// Estado persistente de preferencias del usuario (por ahora, sólo el
// tamaño de subtítulos): vive acá, igual que `estadoActual`, y se
// actualiza siempre con la función pura de `persistencia.js` -- nunca a
// mano.
let persistenciaActual = estadoPersistenciaInicial();

// Pantallas estáticas (reconocimiento, bienvenida): se agregan las dos a
// la escena desde el inicio y se alterna la visibilidad según
// `estadoActual.pantalla`, en vez de crear/destruir objetos en cada
// cambio. `navegacion-dev.js` es un placeholder TEMPORAL (teclas '1'-'9')
// hasta que exista el panel real del observador, controlado por Firebase
// (Etapa 4): ese módulo sólo traduce la tecla a un nombre de pantalla, la
// aplicación del estado (`aplicarComando`, de estado.js) pasa siempre por
// acá, igual que pasará después con los comandos de Firebase.
let estadoActual = estadoPorDefecto();

// Pantalla activa justo antes de entrar a 'aviso' (Tarea 13): como el flujo
// aviso -> pausa -> vuelta siempre pasa por 'aviso', esta variable es la
// que "Seguir con la clase" (pantalla-vuelta.js) necesita para volver a
// donde estaba el usuario antes de pausar -- no siempre la misma pantalla
// fija. Se actualiza en `cambiarPantalla`, cada vez que detecta una
// transición real hacia 'aviso' (ver ahí abajo).
let pantallaAntesDeAviso = null;

const pantallasPorNombre = {
  reconocimiento: crearPantallaReconocimiento(),
  bienvenida: crearPantallaBienvenida(),
  // Al elegir una opción del menú, el cambio de pantalla pasa siempre por
  // `cambiarPantalla` (ver más abajo) -- igual que el resto de los
  // cambios de estado, y como pasará después con los comandos de
  // Firebase -- así que no se asigna `estadoActual.pantalla` a mano.
  menu: crearPantallaMenu(renderizador, (opcion) => {
    cambiarPantalla(opcion);
  }),
  // Subtítulos reales (guion con información histórica, ver
  // js/common/subtitulos-guion.js), con tamaño ajustable y persistente
  // (ver js/common/persistencia.js): reemplaza al panel placeholder de
  // una tarea anterior, que no estaba gateado por `estadoActual.pantalla`.
  subtitulos: crearPantallaSubtitulos(renderizador, persistenciaActual, (delta) => {
    persistenciaActual = ajustarTamanoSubtitulo(persistenciaActual, delta);
  }),
  // Imágenes reales (mapas, pinturas e ilustraciones sobre la caída del
  // Imperio romano de Occidente, ver CREDITS.md), movibles y con tamaño
  // persistente por imagen (ver js/common/persistencia.js). `onVerMas` no
  // necesita hacer nada hoy (el paginado es interno a la pantalla); queda
  // el enganche por si una tarea futura necesita reaccionar a ese tap.
  imagenes: crearPantallaImagenes(
    renderizador,
    RUTAS_IMAGENES,
    persistenciaActual,
    (idImagen, posicion) => {
      persistenciaActual = guardarPosicionImagen(persistenciaActual, idImagen, posicion);
    },
    (idImagen, escala) => {
      persistenciaActual = guardarEscalaImagen(persistenciaActual, idImagen, escala);
    },
    () => {}
  ),
  // Mapa conceptual (causas/hitos/consecuencias de la caída del Imperio
  // romano de Occidente, ver assets/mapa-conceptual/contenido-mapa.js):
  // pantalla estática, sin interacción ni persistencia propia.
  mapa: crearPantallaMapa(),
  // Aviso de atención (Tarea 11): sin opción de "no" todavía -- aceptar
  // (botón del lente: gatillo o pellizco) pasa a la pantalla de pausa, a
  // través del mismo `cambiarPantalla` centralizado que usa el resto del
  // visor.
  aviso: crearPantallaAviso(renderizador, () => {
    cambiarPantalla('pausa');
  }),
  // Pausa activa (Tarea 12): contador en vivo de minutos transcurridos
  // desde que se entró de verdad a esta pantalla (ver `alEntrar` en
  // pantalla-pausa.js). El refresco del contador no usa un `setInterval`
  // propio -- se actualiza desde el loop de render de más abajo, sólo
  // mientras esta pantalla está activa (ver `actualizarPantallaPausaSiCorresponde`).
  pausa: crearPantallaPausa(),
  // Vuelta de la pausa (Tarea 13): "Seguir con la clase" vuelve a la
  // pantalla donde estaba el usuario antes de pausar (`pantallaAntesDeAviso`,
  // ver más arriba; si por algún motivo todavía no se pasó por 'aviso' --
  // por ejemplo, llegando acá directo con la navegación de desarrollo --
  // cae de vuelta a 'menu'). "Ver un resumen rápido" va a 'resumen' (Tarea
  // 14, todavía no existe como pantalla real: `cambiarPantalla` no hace
  // nada raro si el nombre no tiene pantalla asociada).
  vuelta: crearPantallaVuelta(
    renderizador,
    () => cambiarPantalla(pantallaAntesDeAviso ?? 'menu'),
    () => cambiarPantalla('resumen')
  ),
};
Object.values(pantallasPorNombre).forEach((pantalla) => escena.add(pantalla));

function actualizarPantallaVisible() {
  Object.entries(pantallasPorNombre).forEach(([nombre, objeto]) => {
    objeto.visible = nombre === estadoActual.pantalla;
  });
}
actualizarPantallaVisible();

// Único punto de entrada para cambiar de pantalla (menú, navegación de
// desarrollo y, a futuro, los comandos de Firebase): aplica el comando,
// actualiza la visibilidad y, si la pantalla realmente cambió (no si
// `aplicarComando` la rechazó, ni si ya estábamos en esa pantalla), le
// avisa a la pantalla recién activada a través de su `alEntrar()`
// opcional. Esto existe porque todas las pantallas se crean una sola vez
// al arrancar la app (ver más arriba): una pantalla que necesite "hacer
// algo" cada vez que el usuario entra de verdad (como reiniciar el reloj
// del guion de subtítulos, o el futuro timer de pausa de las Tareas
// 11/12) no puede hacerlo en su constructor, sólo acá.
function cambiarPantalla(nuevaPantalla) {
  const pantallaAnterior = estadoActual.pantalla;

  // Tarea 13: antes de aplicar el cambio, si la transición real es hacia
  // 'aviso' (no si ya se estaba ahí -- ese caso no es una "llegada" real),
  // se recuerda la pantalla de la que se viene. Es la única pantalla por
  // la que siempre se pasa antes de pausar (aviso -> pausa), así que acá
  // es el único lugar que hace falta tocar para que "Seguir con la clase"
  // (pantalla-vuelta.js) sepa a dónde volver.
  if (nuevaPantalla === 'aviso' && pantallaAnterior !== 'aviso') {
    pantallaAntesDeAviso = pantallaAnterior;
  }

  estadoActual = aplicarComando(estadoActual, { pantalla: nuevaPantalla });
  actualizarPantallaVisible();

  if (estadoActual.pantalla !== pantallaAnterior) {
    pantallasPorNombre[estadoActual.pantalla]?.alEntrar?.();
  }
}

habilitarNavegacionDev((pantalla) => {
  cambiarPantalla(pantalla);
});

// Termina la pausa activa: calcula los minutos reales transcurridos desde
// que se entró a 'pausa' (ver `obtenerInicioMs` en pantalla-pausa.js),
// actualiza el mensaje de la pantalla de vuelta con esos minutos y la
// cantidad fija de temas, y recién ahí cambia a 'vuelta' -- en ese orden,
// para que el mensaje ya esté actualizado cuando la pantalla se hace
// visible.
function terminarPausa() {
  const minutos = minutosTranscurridos(pantallasPorNombre.pausa.obtenerInicioMs(), Date.now());
  pantallasPorNombre.vuelta.actualizarDatos(minutos, TEMAS_PENDIENTES_EJEMPLO);
  cambiarPantalla('vuelta');
}

// Tecla de desarrollo TEMPORAL (Tarea 13): todavía no existe un botón real
// para "terminar pausa" (llegaría del panel del observador, Etapa 4) ni
// una tecla genérica en `navegacion-dev.js` sirve para esto -- ese módulo
// sólo salta de pantalla, sin calcular minutos ni actualizar el mensaje de
// vuelta. '0' no está usada por `habilitarNavegacionDev` (que sólo cubre
// '1'-'9'), así que no hay conflicto.
window.addEventListener('keydown', (evento) => {
  if (evento.key === '0') terminarPausa();
});

function alRedimensionar() {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderizador.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', alRedimensionar);

// Intenta WebXR primero (botón "Entrar a RA"); mientras no haya una sesión
// activa, la vista previa de escritorio (orbitar con el mouse) queda
// disponible como alternativa.
const botonXR = iniciarBotonXR(renderizador, escena, camara);
document.body.appendChild(botonXR);

const controlesVistaPrevia = activarVistaPrevia(renderizador, camara, renderizador.domElement);

renderizador.xr.addEventListener('sessionstart', () => {
  controlesVistaPrevia.enabled = false;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = true;
});
renderizador.xr.addEventListener('sessionend', () => {
  controlesVistaPrevia.enabled = true;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = false;
});

// Refresco en vivo del contador de pausa: sólo mientras esa pantalla está
// activa (si no, redibujaría de más un canvas que nadie está viendo).
// `pantalla-pausa.js` elige no usar un `setInterval` propio justamente
// para depender de este gancho -- ver comentario de `actualizar` ahí.
function actualizarPantallaPausaSiCorresponde() {
  if (estadoActual.pantalla !== 'pausa') return;
  pantallasPorNombre.pausa.actualizar(Date.now());
}

renderizador.setAnimationLoop(() => {
  controlesVistaPrevia.update();
  actualizarPantallaPausaSiCorresponde();
  renderizador.render(escena, camara);
});
