// Punto de entrada del visor nuevo (Tarea 7 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): mismo armado que
// js/visor/main.js (escena/cámara/renderer/XR/vista previa, orquestación
// de pantallas vía Firebase), reusando esos módulos del visor viejo sin
// copiarlos -- sólo la capa de dibujo de paneles (tema/panel/ícono/
// pantallas/botón flotante) está reconstruida sobre @pmndrs/uikit.
//
// Deliberadamente SIN la animación de entrada por pantalla (pop-in de
// escala, Tarea 31 del visor viejo) ni sin el indicador visual de
// apuntado en RA real (`crearIndicadorDeApuntado`): son pulido visual,
// no parte de lo que pide este plan -- se podrían sumar después si hace
// falta, pero agregarlos acá sin que nadie los pidiera sería inventar
// alcance.

import * as THREE from '../../vendor/three/three.module.js';
import { reversePainterSortStable } from '@pmndrs/uikit';
import { iniciarBotonXR } from '../visor/xr-sesion.js';
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
import { cargarFuenteUikit } from './ui-kit/fuente-uikit.js';
import { escucharEstadoFirebase } from '../visor/firebase-cliente.js';
import { establecerCamaraVistaPrevia } from '../visor/interaccion.js';
import { estadoPorDefecto, aplicarComando } from '../common/estado.js';
import {
  estadoPersistenciaInicial,
  ajustarTamanoSubtitulo,
  guardarPosicionImagen,
  guardarEscalaImagen,
  reiniciarPersistencia,
} from '../common/persistencia.js';

// Mismas imágenes y mismas constantes que js/visor/main.js (leído como
// referencia) -- no son contenido específico de esta carpeta, así que no
// se inventa nada nuevo acá.
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
const TEMAS_PENDIENTES_EJEMPLO = 2;
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
camara.position.set(0, 1.6, 0.6);

establecerCamaraVistaPrevia(camara);

const renderizador = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderizador.setPixelRatio(window.devicePixelRatio);
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.setClearColor(0x000000, 0);
// Requeridos por uikit (ver skills/pmndrs-uikit/SKILL.md del propio paquete).
renderizador.localClippingEnabled = true;
renderizador.setTransparentSort(reversePainterSortStable);

const luzAmbiental = new THREE.AmbientLight(0xffffff, 1);
escena.add(luzAmbiental);

const entornoPreview = crearEntornoPreview();
escena.add(entornoPreview);

let persistenciaActual = estadoPersistenciaInicial();
let estadoActual = estadoPorDefecto();
let pantallaAntesDeAviso = null;

// Todas las pantallas uikit (incluido el botón flotante) que necesitan
// `.actualizarUikit(deltaMs)` cada cuadro -- se llena recién cuando
// `cargarFuenteUikit()` resuelve (ver más abajo): ningún `Text` puede
// existir antes de que la fuente en español esté registrada como
// default global (Tarea 1/post-Tarea-1, ver fuente-uikit.js).
const pantallasUikit = [];
let pantallasPorNombre = null;
let botonMenuFlotante = null;

// Se crea recién después de las pantallas (ver más abajo, al final de
// `cargarFuenteUikit().then()`) -- no al nivel superior del módulo como en
// js/visor/main.js -- porque `OrbitControls` registra su propio listener
// de `pointerdown` apenas se instancia, y los paneles arrastrables
// (`habilitarArrastre`, ver pantalla-subtitulos.js/pantalla-imagenes.js)
// necesitan que SU listener de `pointerdown` quede registrado primero en
// el mismo elemento: así, cuando el rayo sí toca un panel arrastrable,
// `evento.stopImmediatePropagation()` llega a tiempo de frenar a
// `OrbitControls` antes de que éste arranque una órbita de cámara con el
// mismo gesto -- confirmado en vivo: con el orden viejo (OrbitControls
// creado antes de que cargue la fuente), arrastrar el panel de
// subtítulos orbitaba la cámara en vez de mover el panel.
let controlesVistaPrevia = null;

const PANTALLAS_TRANSITORIAS_DE_PAUSA = ['aviso', 'pausa', 'vuelta', 'resumen'];

// Pop-in de escala al entrar a una pantalla (riesgo de /design-consultation,
// ver DESIGN.md: "se siente acompañado", no un corte seco entre
// pantallas) -- misma animación, mismos valores y mismo ease-out
// cuadrático que `js/visor/main.js` (Tarea 31 del visor viejo, deliberada
// y explícitamente dejada afuera de la migración en la Tarea 7 por no
// haber sido pedida entonces -- ver el comentario grande de
// js/visor-uikit/main.js de aquella tarea). Funciona igual acá porque
// cada pantalla es, de raíz, un `THREE.Group`/`THREE.Object3D` normal:
// escalar ESE grupo no depende de nada específico de uikit (ningún
// panel necesita enterarse).
const animacionesDeEntrada = new Map();
const ESCALA_INICIAL_ANIMACION_ENTRADA = 0.85;
const DURACION_ANIMACION_ENTRADA_MS = 220;

function iniciarAnimacionDeEntrada(grupo) {
  if (!grupo) return;
  grupo.scale.setScalar(ESCALA_INICIAL_ANIMACION_ENTRADA);
  animacionesDeEntrada.set(grupo, Date.now());
}

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

function actualizarPantallaVisible() {
  if (!pantallasPorNombre) return;
  Object.entries(pantallasPorNombre).forEach(([nombre, objeto]) => {
    objeto.visible = nombre === estadoActual.pantalla;
  });
  // 'menu' sumado a la lista (bug encontrado en vivo, reportado por el
  // dueño del proyecto como texto/íconos superpuestos y "fantasmas" al
  // abrir el menú flotante): la pantalla dedicada de menú (pantalla-menu.js)
  // ya muestra las mismas 3 opciones, así que mostrar TAMBIÉN el botón
  // flotante ahí es redundante -- y como los íconos de toda la app usan
  // `depthTest:false` (ver icono-uikit.js), cuando los dos quedan visibles
  // a la vez y se superponen en pantalla, su contenido se mezcla.
  botonMenuFlotante.visible = !['aviso', 'pausa', 'finalizada', 'menu'].includes(estadoActual.pantalla);
  botonMenuFlotante.cerrarMenu?.();
}

function entrarAPantalla(nombrePantalla) {
  iniciarAnimacionDeEntrada(pantallasPorNombre[nombrePantalla]);
  pantallasPorNombre[nombrePantalla]?.alEntrar?.();
}

function aplicarComandoYActualizar(comando, { esPrimeraSincronizacion = false } = {}) {
  const pantallaAnterior = estadoActual.pantalla;
  const estadoNuevo = aplicarComando(estadoActual, comando);

  if (!esPrimeraSincronizacion && estadoNuevo.resetId > estadoActual.resetId) {
    persistenciaActual = reiniciarPersistencia();
    estadoActual = { ...estadoPorDefecto(), resetId: estadoNuevo.resetId };
    pantallaAntesDeAviso = null;
    Object.values(pantallasPorNombre).forEach((pantalla) => pantalla.alReiniciarTodo?.());
    actualizarPantallaVisible();
    entrarAPantalla(estadoActual.pantalla);
    return;
  }

  if (estadoNuevo.pantalla === 'vuelta' && estadoNuevo.pantalla !== pantallaAnterior) {
    pantallasPorNombre.vuelta.actualizarDatos(MINUTOS_PAUSA_FIJOS, TEMAS_PENDIENTES_EJEMPLO);
  }

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

function cambiarPantalla(nuevaPantalla) {
  aplicarComandoYActualizar({ pantalla: nuevaPantalla });
}

cargarFuenteUikit().then(() => {
  pantallasPorNombre = {
    reconocimiento: crearPantallaReconocimiento(),
    bienvenida: crearPantallaBienvenida(),
    menu: crearPantallaMenu(renderizador, (opcion) => cambiarPantalla(opcion)),
    subtitulos: crearPantallaSubtitulos(renderizador, persistenciaActual, (delta) => {
      persistenciaActual = ajustarTamanoSubtitulo(persistenciaActual, delta);
    }),
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
    mapa: crearPantallaMapa(),
    aviso: crearPantallaAviso(
      renderizador,
      () => cambiarPantalla('pausa'),
      () => cambiarPantalla(pantallaAntesDeAviso ?? 'menu')
    ),
    pausa: crearPantallaPausa(),
    vuelta: crearPantallaVuelta(
      renderizador,
      () => cambiarPantalla(pantallaAntesDeAviso ?? 'menu'),
      () => cambiarPantalla('resumen')
    ),
    resumen: crearPantallaResumen(renderizador, () => cambiarPantalla(pantallaAntesDeAviso ?? 'menu')),
    finalizada: crearPantallaFinalizada(),
  };
  Object.values(pantallasPorNombre).forEach((pantalla) => {
    escena.add(pantalla);
    pantallasUikit.push(pantalla);
  });

  botonMenuFlotante = crearBotonMenuFlotante(renderizador, (opcion) => cambiarPantalla(opcion));
  botonMenuFlotante.position.copy(camara.position);
  botonMenuFlotante.quaternion.copy(camara.quaternion);
  escena.add(botonMenuFlotante);
  pantallasUikit.push(botonMenuFlotante);

  actualizarPantallaVisible();

  // Recién acá (ver el comentario grande junto a su declaración más
  // arriba): todos los `habilitarArrastre` de las pantallas ya registraron
  // su propio listener de `pointerdown` sobre `renderizador.domElement`.
  controlesVistaPrevia = activarVistaPrevia(renderizador, camara, renderizador.domElement);

  let primeraSincronizacionFirebase = true;
  escucharEstadoFirebase((comando) => {
    aplicarComandoYActualizar(comando, { esPrimeraSincronizacion: primeraSincronizacionFirebase });
    primeraSincronizacionFirebase = false;
  });
});

function alRedimensionar() {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderizador.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', alRedimensionar);

const botonXR = iniciarBotonXR(renderizador, escena, camara);
document.body.appendChild(botonXR);

renderizador.xr.addEventListener('sessionstart', () => {
  if (controlesVistaPrevia) controlesVistaPrevia.enabled = false;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = true;
  entornoPreview.visible = false;
});
renderizador.xr.addEventListener('sessionend', () => {
  if (controlesVistaPrevia) controlesVistaPrevia.enabled = true;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = false;
  entornoPreview.visible = true;
});

function actualizarPantallaPausaSiCorresponde() {
  if (!pantallasPorNombre || estadoActual.pantalla !== 'pausa') return;
  pantallasPorNombre.pausa.actualizar(Date.now());
}

let ultimoCuadroMs = performance.now();

renderizador.setAnimationLoop(() => {
  const ahoraMs = performance.now();
  const deltaMs = ahoraMs - ultimoCuadroMs;
  ultimoCuadroMs = ahoraMs;

  controlesVistaPrevia?.update();
  actualizarAnimacionesDeEntrada(Date.now());
  actualizarPantallaPausaSiCorresponde();
  pantallasUikit.forEach((pantalla) => pantalla.actualizarUikit(deltaMs));
  botonMenuFlotante?.actualizarSeguimiento(camara, deltaMs / 1000);
  renderizador.render(escena, camara);
});
