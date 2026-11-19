// Punto de entrada del visor nuevo (ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): arranca igual que
// js/visor/main.js (escena/cámara/renderer/XR/vista previa), reusando esos
// módulos del visor viejo sin copiarlos. Los 3 paneles de abajo son de
// prueba (Tarea 1, capa compartida de diseño) -- se reemplazan por
// pantallas reales a partir de la Tarea 2.

import * as THREE from '../../vendor/three/three.module.js';
import { reversePainterSortStable } from '@pmndrs/uikit';
import { iniciarBotonXR } from '../visor/xr-sesion.js';
import { activarVistaPrevia } from '../vista-previa/control-mouse.js';
import { crearEntornoPreview } from '../vista-previa/entorno-preview.js';
import { crearPanelUikit } from './ui-kit/panel-uikit.js';
import { cargarFuenteUikit } from './ui-kit/fuente-uikit.js';

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

// Paneles de prueba de la Tarea 1 (capa compartida de diseño): no son
// pantallas reales todavía (eso arranca en la Tarea 2) -- sólo para
// comparar a ojo contra el panel viejo equivalente (panel-texto.js,
// visible en index.html). Se reemplazan por pantallas reales en la
// próxima tarea. Esperan a `cargarFuenteUikit()` (ver ese módulo) antes
// de crearse: la fuente con charset en español se registra como default
// global ANTES de que exista el primer `Text`, no después.
const panelesDePrueba = [];
cargarFuenteUikit().then(() => {
  panelesDePrueba.push(
    crearPanelUikit(['Cartel de sólo lectura'], {
      posicion: { x: -0.5, y: 1.3, z: -1.8 },
      ancho: 0.8,
      alto: 0.3,
    }),
    crearPanelUikit(['Menú'], {
      posicion: { x: 0.5, y: 1.3, z: -1.8 },
      ancho: 0.4,
      alto: 0.25,
      icono: 'menu',
      interactivo: true,
      negrita: true,
    }),
    crearPanelUikit(['Primera línea de ejemplo', 'Segunda línea de ejemplo'], {
      posicion: { x: 0, y: 0.85, z: -1.8 },
      ancho: 0.9,
      alto: 0.35,
    })
  );
  panelesDePrueba.forEach((panel) => escena.add(panel));
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
  panelesDePrueba.forEach((panel) => panel.update(deltaMs));
  renderizador.render(escena, camara);
});
