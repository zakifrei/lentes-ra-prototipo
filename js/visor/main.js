// Punto de entrada del visor: monta una escena básica de Three.js sobre el
// <canvas id="escena"> de index.html. El fondo es transparente porque en RA
// (passthrough del Quest) el canvas se superpone al video de la cámara; en
// un navegador de escritorio sin WebXR se ve simplemente negro.

import * as THREE from '../../vendor/three/three.module.js';
import { iniciarBotonXR } from './xr-sesion.js';
import { activarVistaPrevia } from '../vista-previa/control-mouse.js';
import { crearEntornoPreview } from '../vista-previa/entorno-preview.js';
import { crearPantallaReconocimiento } from './paneles/pantalla-reconocimiento.js';
import { crearPantallaBienvenida } from './paneles/pantalla-bienvenida.js';
import { crearPantallaMenu } from './paneles/pantalla-menu.js';
import { crearPantallaSubtitulos } from './paneles/pantalla-subtitulos.js';
import { crearPantallaImagenes } from './paneles/pantalla-imagenes.js';
import { crearPantallaMapa } from './paneles/pantalla-mapa.js';
import { crearPantallaAviso } from './paneles/pantalla-aviso.js';
import { crearPantallaPausa } from './paneles/pantalla-pausa.js';
import { crearPantallaVuelta } from './paneles/pantalla-vuelta.js';
import { crearPantallaResumen } from './paneles/pantalla-resumen.js';
import { crearPantallaFinalizada } from './paneles/pantalla-finalizada.js';
import { crearBotonMenuFlotante } from './paneles/boton-menu-flotante.js';
import { escucharEstadoFirebase } from './firebase-cliente.js';
import { establecerCamaraVistaPrevia, crearIndicadorDeApuntado } from './interaccion.js';
import { estadoPorDefecto, aplicarComando } from '../common/estado.js';
import {
  estadoPersistenciaInicial,
  ajustarTamanoSubtitulo,
  guardarPosicionImagen,
  guardarEscalaImagen,
  reiniciarPersistencia,
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
// de la pausa" (Tarea 13): constante fija a propósito (todavía no hay una
// fuente real de "temas guardados" en 'Temas pendientes', ver
// pantalla-pausa.js).
const TEMAS_PENDIENTES_EJEMPLO = 2;

// Minutos que la pantalla de "vuelta de la pausa" muestra siempre, sin
// importar la duración real de la pausa (Tarea 26): en la Etapa 4 (Tasks
// 15-18) esto se calculaba de la duración real, y hasta hace poco el panel
// del observador podía sobreescribirlo a mano con un valor distinto --
// el dueño del proyecto probó ese ajuste manual en vivo en el Quest real y
// decidió sacarlo (no arreglarlo): la pantalla de vuelta siempre dice
// "Estuviste 5 min en pausa", fijo.
const MINUTOS_PAUSA_FIJOS = 5;

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

// Se agrega la cámara a la escena (Tarea 25, botón de menú flotante):
// `WebGLRenderer.render(escena, camara)` sólo dibuja lo que encuentra
// recorriendo `escena.children` (y sus descendientes) -- nunca recorre
// `camara.children` de forma independiente. Sin esto, cualquier objeto
// agregado como hijo de la cámara (como el botón de menú flotante, más
// abajo) jamás se recorrería durante el render: quedaría invisible
// siempre, sin ningún error en consola que lo delate. Es el patrón
// estándar de Three.js para HUDs ("parent the camera to the scene, then
// parent HUD elements to the camera") -- confirmado leyendo
// `vendor/three/three.module.js` (WebGLRenderer.render actualiza
// `scene.matrixWorld` recorriendo `escena.children`, y WebXRManager
// sincroniza la pose trackeada del casco de vuelta a este mismo objeto
// `camara` en cada cuadro de una sesión real, con `updateMatrixWorld(true)`
// -- forzando también a sus hijos -- así que un HUD colgado de `camara`
// sigue funcionando en RA real, no sólo en la vista previa de escritorio).
escena.add(camara);

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

// Rayo visual que sigue a la mano/control durante una sesión WebXR real
// (ver js/visor/interaccion.js): arranca oculto porque la vista previa de
// escritorio usa el mouse, no mano/control -- se muestra sólo entre
// 'sessionstart'/'sessionend' de `renderizador.xr`, más abajo.
const indicadorApuntado = crearIndicadorDeApuntado(renderizador);
indicadorApuntado.visible = false;
escena.add(indicadorApuntado);

// Entorno de referencia (piso + pared + una silueta simple "como si fuera
// la profesora en el medio") SOLO para la vista previa de escritorio -- a
// pedido de la profesora a cargo de la prueba, para que orbitar con el
// mouse no se sienta como paneles flotando en un vacío negro. Nunca debe
// verse en una sesión RA real (ahí el passthrough ya muestra el aula real
// con la profesora real adentro -- ver el comentario grande en
// entorno-preview.js). Visible desde el arranque (todavía no hay sesión
// activa); se oculta/muestra con los mismos eventos 'sessionstart'/
// 'sessionend' que ya usa el resto de los elementos exclusivos de esta
// vista, más abajo.
const entornoPreview = crearEntornoPreview();
escena.add(entornoPreview);

// Estado persistente de preferencias del usuario (por ahora, sólo el
// tamaño de subtítulos): vive acá, igual que `estadoActual`, y se
// actualiza siempre con la función pura de `persistencia.js` -- nunca a
// mano.
let persistenciaActual = estadoPersistenciaInicial();

// Pantallas estáticas (reconocimiento, bienvenida): se agregan las dos a
// la escena desde el inicio y se alterna la visibilidad según
// `estadoActual.pantalla`, en vez de crear/destruir objetos en cada
// cambio. Desde la Tarea 17, Firebase (panel real del observador, ver
// `escucharEstadoFirebase` más abajo) es la ÚNICA fuente de comandos de
// pantalla -- la navegación de desarrollo por teclado que existía antes
// (`navegacion-dev.js`) ya se sacó. Todo comando aplica siempre a través
// de `aplicarComandoYActualizar`, que usa `aplicarComando` (de
// estado.js) -- nunca a mano.
let estadoActual = estadoPorDefecto();

// Pantalla activa justo antes de entrar a 'aviso' (Tarea 13): como el flujo
// aviso -> pausa -> vuelta siempre pasa por 'aviso', esta variable es la
// que "Seguir con la clase" (pantalla-vuelta.js) necesita para volver a
// donde estaba el usuario antes de pausar -- no siempre la misma pantalla
// fija. Se actualiza en `cambiarPantalla`, cada vez que detecta una
// transición real hacia 'aviso' (ver ahí abajo).
let pantallaAntesDeAviso = null;

// Animación de entrada por pantalla (Tarea 31, pulido visual ámbar-neón):
// decisión tomada con el dueño del proyecto para simplificar al máximo y
// bajar el riesgo -- anima SÓLO `grupo.scale` (nunca opacidad/materiales),
// porque cada pantalla es un `THREE.Group` con varios meshes hijos, cada
// uno con su PROPIO material (ver por ejemplo los 3 botones de
// `pantalla-menu.js`): animar opacidad exigiría recorrer recursivamente
// todos los materiales de cada pantalla, mucha más superficie de riesgo
// para un efecto de prioridad baja. `Map<THREE.Group, inicioMs>` en vez de
// una propiedad metida a mano en cada grupo: permite tener más de una
// animación en curso a la vez (por ejemplo, si el usuario cambia de
// pantalla varias veces seguidas muy rápido) sin pisarse, y sacar cada
// entrada apenas termina (ver `actualizarAnimacionesDeEntrada`) para no
// seguir calculando algo ya terminado.
const animacionesDeEntrada = new Map();
const ESCALA_INICIAL_ANIMACION_ENTRADA = 0.85;
const DURACION_ANIMACION_ENTRADA_MS = 220;

// Arranca (o reinicia, si ya había una en curso para este mismo `grupo` --
// por ejemplo, volver a entrar a la misma pantalla antes de que termine su
// animación anterior) el pop-in de esta pantalla: la deja en la escala
// chica de entrada y guarda el momento de inicio para que
// `actualizarAnimacionesDeEntrada` la vaya interpolando cuadro a cuadro.
// `Date.now()`, no `performance.now()`, para ser consistente con el resto
// de `main.js` (ver `actualizarPantallaPausaSiCorresponde`, más abajo, que
// ya le pasa `Date.now()` a `pantalla-pausa.js`).
function iniciarAnimacionDeEntrada(grupo) {
  if (!grupo) return;
  grupo.scale.setScalar(ESCALA_INICIAL_ANIMACION_ENTRADA);
  animacionesDeEntrada.set(grupo, Date.now());
}

// Se llama una vez por cuadro desde `renderizador.setAnimationLoop` (ver
// más abajo), igual que `actualizarPantallaPausaSiCorresponde`: recorre
// las animaciones en curso, calcula cuánto creció la escala según el
// tiempo transcurrido (con un ease-out cuadrático simple, nada más
// elaborado -- efecto de prioridad baja) y, apenas una animación llega a
// progreso 1, fija la escala final exacta en 1 y la saca del `Map` para
// no seguir iterándola en cuadros futuros.
function actualizarAnimacionesDeEntrada(ahoraMs) {
  animacionesDeEntrada.forEach((inicioMs, grupo) => {
    const progresoLineal = Math.min(
      (ahoraMs - inicioMs) / DURACION_ANIMACION_ENTRADA_MS,
      1
    );
    const progresoSuavizado = 1 - (1 - progresoLineal) ** 2; // ease-out cuadrático
    const escala =
      ESCALA_INICIAL_ANIMACION_ENTRADA +
      (1 - ESCALA_INICIAL_ANIMACION_ENTRADA) * progresoSuavizado;
    grupo.scale.setScalar(escala);
    if (progresoLineal >= 1) {
      grupo.scale.setScalar(1);
      animacionesDeEntrada.delete(grupo);
    }
  });
}

const pantallasPorNombre = {
  reconocimiento: crearPantallaReconocimiento(),
  bienvenida: crearPantallaBienvenida(),
  // Al elegir una opción del menú, el cambio de pantalla pasa siempre por
  // `cambiarPantalla` (ver más abajo) -- igual que el resto de los
  // cambios de estado, incluidos los comandos que llegan de Firebase --
  // así que no se asigna `estadoActual.pantalla` a mano.
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
  // Aviso de atención (Tarea 11, con botón de rechazo real desde la Tarea
  // 24): "Sí, pausar" pasa a la pantalla de pausa; "Seguir sin pausar"
  // vuelve a la pantalla donde estaba el usuario antes del aviso, mismo
  // mecanismo de retorno que "Seguir con la clase"/"Volver a la clase" de
  // las pantallas de vuelta/resumen (`pantallaAntesDeAviso`, ver más
  // arriba). Ambos pasan por el mismo `cambiarPantalla` centralizado que
  // usa el resto del visor.
  aviso: crearPantallaAviso(
    renderizador,
    () => cambiarPantalla('pausa'),
    () => cambiarPantalla(pantallaAntesDeAviso ?? 'menu')
  ),
  // Pausa activa (Tarea 12): contador en vivo de minutos transcurridos
  // desde que se entró de verdad a esta pantalla (ver `alEntrar` en
  // pantalla-pausa.js). El refresco del contador no usa un `setInterval`
  // propio -- se actualiza desde el loop de render de más abajo, sólo
  // mientras esta pantalla está activa (ver `actualizarPantallaPausaSiCorresponde`).
  pausa: crearPantallaPausa(),
  // Vuelta de la pausa (Tarea 13): "Seguir con la clase" vuelve a la
  // pantalla donde estaba el usuario antes de pausar (`pantallaAntesDeAviso`,
  // ver más arriba; si por algún motivo todavía no se pasó por 'aviso' --
  // por ejemplo, llegando acá directo con un comando de Firebase -- cae de
  // vuelta a 'menu'). "Ver un resumen rápido" va a 'resumen' (Tarea 14, ver
  // abajo).
  vuelta: crearPantallaVuelta(
    renderizador,
    () => cambiarPantalla(pantallaAntesDeAviso ?? 'menu'),
    () => cambiarPantalla('resumen')
  ),
  // Resumen rápido (Tarea 14): se llega acá sólo desde "Ver un resumen
  // rápido" de la pantalla de vuelta (para probarla a mano alcanza con el
  // camino normal: aviso -> pausa -> "Terminar pausa" del panel -> vuelta
  // -> "Ver un resumen rápido"). "Volver a la clase" usa exactamente el
  // mismo mecanismo de retorno que "Seguir con la clase" de la pantalla de
  // vuelta -- vuelve a `pantallaAntesDeAviso` (o 'menu' si todavía no se
  // pasó por 'aviso'), no un segundo mecanismo paralelo para el mismo
  // concepto.
  resumen: crearPantallaResumen(renderizador, () =>
    cambiarPantalla(pantallaAntesDeAviso ?? 'menu')
  ),
  // Clase finalizada: a pedido del dueño del proyecto, sin botones ni
  // mecanismo de selección propio (ver el comentario de
  // pantalla-finalizada.js) -- la dispara únicamente el observador desde
  // el panel externo.
  finalizada: crearPantallaFinalizada(),
};
Object.values(pantallasPorNombre).forEach((pantalla) => escena.add(pantalla));

// Botón de menú flotante (Tarea 25): a diferencia de TODAS las pantallas de
// `pantallasPorNombre` arriba (fijas en el espacio del mundo, hijas de
// `escena`), éste es un HUD real -- se agrega como hijo de la CÁMARA, no de
// la escena, para que se vea siempre en la misma esquina de la vista sin
// importar hacia dónde mire el usuario (ver el comentario junto a
// `escena.add(camara)`, más arriba, y boton-menu-flotante.js). Por eso no
// vive en `pantallasPorNombre` ni se recorre junto con el resto en
// `actualizarPantallaVisible`, más abajo -- necesita su propia línea.
const botonMenuFlotante = crearBotonMenuFlotante(renderizador, (opcion) => cambiarPantalla(opcion));
camara.add(botonMenuFlotante);

function actualizarPantallaVisible() {
  Object.entries(pantallasPorNombre).forEach(([nombre, objeto]) => {
    objeto.visible = nombre === estadoActual.pantalla;
  });
  // Visible en todas las pantallas MENOS 'aviso', 'pausa' y 'finalizada'
  // (decisión ya tomada con el dueño del proyecto): en las dos primeras, lo
  // que el usuario necesita tocar es uno de los botones propios de esa
  // pantalla (aceptar/rechazar el aviso, terminar la pausa), no distraerse
  // con un acceso directo al menú; en 'finalizada' directamente no hay nada
  // que navegar -- la clase terminó, y esta pantalla a propósito no tiene
  // ningún control para que el usuario toque (ver pantalla-finalizada.js).
  botonMenuFlotante.visible = !['aviso', 'pausa', 'finalizada'].includes(estadoActual.pantalla);
  // Tarea de ajuste UX (feedback en vivo del Quest real): si el observador
  // navega a cualquier pantalla desde su panel mientras el desplegable del
  // botón flotante estaba abierto, se cierra solo -- ver el comentario
  // junto a `cerrarMenu` en boton-menu-flotante.js sobre por qué no alcanza
  // con el toggle de `.visible` de arriba.
  botonMenuFlotante.cerrarMenu?.();
}
actualizarPantallaVisible();

// Único punto de entrada para aplicar CUALQUIER comando de estado (menú,
// aviso/vuelta/resumen, y los comandos crudos que llegan de Firebase,
// escritos por el panel real del observador, Tarea 17). Un comando de
// Firebase es un objeto genérico (`{ pantalla: 'menu' }`, pero también
// `{ resetId: ... }`): por eso esta función toma el comando completo, no
// sólo un nombre de pantalla.
// Aplica el comando con `aplicarComando` (Tarea 5 -- ahí vive toda la
// validación/defensa contra comandos corruptos, no se duplica acá),
// actualiza la visibilidad y, si la pantalla realmente cambió (no si
// `aplicarComando` rechazó el comando entero, ni si ya estábamos en esa
// pantalla), le avisa a la pantalla recién activada a través de su
// `alEntrar()` opcional. Esto existe porque todas las pantallas se crean
// una sola vez al arrancar la app (ver más arriba): una pantalla que
// necesite "hacer algo" cada vez que el usuario entra de verdad (como
// reiniciar el reloj del guion de subtítulos, o el timer de pausa de las
// Tareas 11/12) no puede hacerlo en su constructor, sólo acá.

// Pantallas "transitorias" del flujo de aviso/pausa: nunca deben quedar
// guardadas como "la pantalla antes de pausar" -- si `pantallaAnterior`
// resulta ser alguna de éstas (por ejemplo, saltando directo a 'pausa' y
// después a 'aviso' con comandos de Firebase, sin pasar antes por una
// pantalla real), "Seguir con la clase" terminaría devolviendo al usuario
// a 'pausa' o 'vuelta' en vez de a donde realmente estaba trabajando.
// Incluye 'resumen' por la misma razón.
const PANTALLAS_TRANSITORIAS_DE_PAUSA = ['aviso', 'pausa', 'vuelta', 'resumen'];

function aplicarComandoYActualizar(comando, { esPrimeraSincronizacion = false } = {}) {
  const pantallaAnterior = estadoActual.pantalla;
  const estadoNuevo = aplicarComando(estadoActual, comando);

  // Tarea 18 + fix (recarga a mitad de clase): un resetId mayor al último
  // conocido es un "Reiniciar todo" real -- pero esa comparación sólo tiene
  // sentido una vez que el visor ya está corriendo con un estado real
  // sincronizado. En la primerísima sincronización tras cargar la página,
  // `estadoActual.resetId` es sólo el 0 por defecto de `estadoPorDefecto()`,
  // no un "último resetId conocido" de verdad -- compararlo haría que
  // CUALQUIER resetId ya guardado en Firebase (de un reset anterior a esta
  // carga de página, algo que va a pasar siempre entre un participante y el
  // siguiente) dispare un reset espurio, mandando al visor a
  // 'reconocimiento' sin que nadie lo pidiera, en vez de adoptar la pantalla
  // real que Firebase ya tenía. Se corta acá (return) porque un reset no
  // es un cambio de pantalla común: no debe pasar por la lógica de
  // `pantallaAntesDeAviso` ni por el cálculo de minutos de pausa de más
  // abajo.
  if (!esPrimeraSincronizacion && estadoNuevo.resetId > estadoActual.resetId) {
    persistenciaActual = reiniciarPersistencia();
    estadoActual = { ...estadoPorDefecto(), resetId: estadoNuevo.resetId };
    pantallaAntesDeAviso = null;
    Object.values(pantallasPorNombre).forEach((pantalla) => pantalla.alReiniciarTodo?.());
    actualizarPantallaVisible();
    entrarAPantalla(estadoActual.pantalla);
    return;
  }

  // Tarea 17 (y Tarea 26: ya no calcula minutos reales, ver comentario de
  // `MINUTOS_PAUSA_FIJOS` más arriba): si la transición real es hacia
  // 'vuelta' (venga de donde venga -- antes sólo pasaba atada a la tecla de
  // desarrollo '0', ahora también dispara con el botón "Terminar pausa" del
  // panel, que llega acá como `{ pantalla: 'vuelta' }` por Firebase),
  // actualizar el mensaje de la pantalla de vuelta ANTES de hacerla visible
  // -- si no, mostraría siempre "0 min en pausa" porque `actualizarDatos`
  // nunca se llamaría.
  if (estadoNuevo.pantalla === 'vuelta' && estadoNuevo.pantalla !== pantallaAnterior) {
    pantallasPorNombre.vuelta.actualizarDatos(MINUTOS_PAUSA_FIJOS, TEMAS_PENDIENTES_EJEMPLO);
  }

  // Tarea 13: si la transición real (después de validar, no antes) es
  // hacia 'aviso' y se viene de una pantalla que NO es transitoria (no si
  // ya se estaba en 'aviso', ni si se venía de 'pausa'/'vuelta'/'resumen'
  // -- ninguna de esas es "donde estaba trabajando el usuario"), se
  // recuerda la pantalla de la que se viene. Comparar contra
  // `estadoNuevo.pantalla` (en vez del campo `pantalla` del comando, antes
  // de validar) es necesario ahora que un comando puede venir de Firebase:
  // si `aplicarComando` rechaza el comando entero (por otro campo
  // inválido, por ejemplo), `estadoNuevo` es igual a `estadoActual` y no
  // hay que guardar nada, aunque el comando pidiera 'aviso'.
  if (
    estadoNuevo.pantalla === 'aviso' &&
    estadoNuevo.pantalla !== pantallaAnterior &&
    !PANTALLAS_TRANSITORIAS_DE_PAUSA.includes(pantallaAnterior)
  ) {
    pantallaAntesDeAviso = pantallaAnterior;
  }

  estadoActual = estadoNuevo;
  actualizarPantallaVisible();

  if (estadoActual.pantalla !== pantallaAnterior) {
    entrarAPantalla(estadoActual.pantalla);
  }
}

// Factoriza los dos call-sites de arriba que, ante una transición real de
// pantalla, necesitan tanto el `alEntrar?.()` ya existente como el pop-in
// nuevo de la Tarea 31 -- evita duplicar la llamada a la animación en dos
// lugares. No cambia nada del comportamiento ya existente de `alEntrar`
// (sigue siendo opcional, con el mismo `?.()`).
function entrarAPantalla(nombrePantalla) {
  const pantalla = pantallasPorNombre[nombrePantalla];
  pantalla?.alEntrar?.();
  iniciarAnimacionDeEntrada(pantalla);
}

// Atajo para el caso simple "cambiar a esta pantalla por nombre": lo que
// siguen pidiendo el menú, el aviso, "seguir con la clase"/"ver resumen" de
// la pantalla de vuelta y el resumen. Ninguno de esos call-sites cambia;
// todos pasan igual por `aplicarComandoYActualizar`.
function cambiarPantalla(nuevaPantalla) {
  aplicarComandoYActualizar({ pantalla: nuevaPantalla });
}

// Fuente real de comandos (Tarea 16): cada valor crudo que Firebase entregue
// para el nodo de estado (`nodoRaizFirebase()`, js/common/firebase-mensajes.js)
// pasa siempre por `aplicarComandoYActualizar`, que a su vez usa
// `aplicarComando` (Tarea 5) para rechazar cualquier comando corrupto, vacío
// o con campos inesperados -- este módulo no necesita (ni debe) validar
// nada por su cuenta.
// `primeraSincronizacionFirebase` distingue la PRIMERA entrega que llega
// después de cargar la página (donde `estadoActual.resetId` es sólo el 0
// por defecto, no un "último conocido" real -- ver el comentario del fix
// dentro de `aplicarComandoYActualizar`) de cualquier sincronización
// posterior, donde un reset real sigue debiendo detectarse normalmente.
let primeraSincronizacionFirebase = true;

escucharEstadoFirebase((comando) => {
  aplicarComandoYActualizar(comando, { esPrimeraSincronizacion: primeraSincronizacionFirebase });
  primeraSincronizacionFirebase = false;
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
  indicadorApuntado.visible = true;
  entornoPreview.visible = false;
});
renderizador.xr.addEventListener('sessionend', () => {
  controlesVistaPrevia.enabled = true;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = false;
  indicadorApuntado.visible = false;
  entornoPreview.visible = true;
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
  actualizarAnimacionesDeEntrada(Date.now());
  renderizador.render(escena, camara);
});
