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
import { habilitarNavegacionDev } from './navegacion-dev.js';
import { establecerCamaraVistaPrevia } from './interaccion.js';
import { estadoPorDefecto, aplicarComando } from '../common/estado.js';
import { estadoPersistenciaInicial, ajustarTamanoSubtitulo } from '../common/persistencia.js';

const canvas = document.getElementById('escena');
const indicadorVistaPrevia = document.getElementById('indicador-vista-previa');

const escena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camara.position.set(0, 1.6, 3);

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
  estadoActual = aplicarComando(estadoActual, { pantalla: nuevaPantalla });
  actualizarPantallaVisible();

  if (estadoActual.pantalla !== pantallaAnterior) {
    pantallasPorNombre[estadoActual.pantalla]?.alEntrar?.();
  }
}

habilitarNavegacionDev((pantalla) => {
  cambiarPantalla(pantalla);
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

renderizador.setAnimationLoop(() => {
  controlesVistaPrevia.update();
  renderizador.render(escena, camara);
});
