// Punto de entrada del visor nuevo (ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): arranca igual que
// js/visor/main.js (escena/cámara/renderer/XR/vista previa), reusando esos
// módulos del visor viejo sin copiarlos. A partir de la Tarea 2 monta
// pantallas reales (empezando por pantalla-menu.js); todavía no hay
// orquestación de cambio de pantalla vía Firebase (eso no es parte de
// este plan tarea por tarea hasta que existan más pantallas).

import * as THREE from '../../vendor/three/three.module.js';
import { reversePainterSortStable } from '@pmndrs/uikit';
import { iniciarBotonXR } from '../visor/xr-sesion.js';
import { activarVistaPrevia } from '../vista-previa/control-mouse.js';
import { crearEntornoPreview } from '../vista-previa/entorno-preview.js';
import { establecerCamaraVistaPrevia } from '../visor/interaccion.js';
import { cargarFuenteUikit } from './ui-kit/fuente-uikit.js';
import { crearPantallaMenu } from './paneles/pantalla-menu.js';

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

// `interaccion.js` necesita la cámara para calcular el rayo del mouse en
// la vista previa de escritorio (igual que en js/visor/main.js).
establecerCamaraVistaPrevia(camara);

const renderizador = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderizador.setPixelRatio(window.devicePixelRatio);
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.setClearColor(0x000000, 0);
// Requeridos por uikit (ver skills/pmndrs-uikit/SKILL.md del propio paquete):
// sin esto, contenido con overflow:hidden/scroll dibuja fuera de su
// contenedor y los paneles/texto se ordenan mal y parpadean.
renderizador.localClippingEnabled = true;
renderizador.setTransparentSort(reversePainterSortStable);

const luzAmbiental = new THREE.AmbientLight(0xffffff, 1);
escena.add(luzAmbiental);

const entornoPreview = crearEntornoPreview();
escena.add(entornoPreview);

// Pantallas reales (empiezan en la Tarea 2): esperan a
// `cargarFuenteUikit()` (ver ese módulo) antes de crearse -- la fuente
// con charset en español se registra como default global ANTES de que
// exista el primer `Text`, no después.
//
// Pantalla piloto (Tarea 2): todavía no hay más pantallas ni comando de
// Firebase que alterne entre ellas (eso llega con el resto de las
// pantallas, Tarea 3+) -- por ahora `onSeleccionar` sólo deja constancia
// en consola de qué botón se tocó, para verificar a mano en el
// navegador que el raycasting de cada botón identifica la opción
// correcta.
const pantallasUikit = [];
cargarFuenteUikit().then(() => {
  const pantallaMenu = crearPantallaMenu(renderizador, (opcion) => {
    console.log(`pantalla-menu: se seleccionó "${opcion}"`);
  });
  escena.add(pantallaMenu);
  pantallasUikit.push(pantallaMenu);
});

function alRedimensionar() {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderizador.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', alRedimensionar);

const botonXR = iniciarBotonXR(renderizador, escena, camara);
document.body.appendChild(botonXR);

const controlesVistaPrevia = activarVistaPrevia(renderizador, camara, renderizador.domElement);

renderizador.xr.addEventListener('sessionstart', () => {
  controlesVistaPrevia.enabled = false;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = true;
  entornoPreview.visible = false;
});
renderizador.xr.addEventListener('sessionend', () => {
  controlesVistaPrevia.enabled = true;
  if (indicadorVistaPrevia) indicadorVistaPrevia.hidden = false;
  entornoPreview.visible = true;
});

let ultimoCuadroMs = performance.now();

renderizador.setAnimationLoop(() => {
  const ahoraMs = performance.now();
  const deltaMs = ahoraMs - ultimoCuadroMs;
  ultimoCuadroMs = ahoraMs;

  controlesVistaPrevia.update();
  pantallasUikit.forEach((pantalla) => pantalla.actualizarUikit(deltaMs));
  renderizador.render(escena, camara);
});
