// Punto de entrada del visor nuevo (spike de la Tarea 0, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): arranca igual que
// js/visor/main.js (escena/cámara/renderer/XR/vista previa), reusando esos
// módulos del visor viejo sin copiarlos — todavía sin ninguna pantalla real.

import * as THREE from '../../vendor/three/three.module.js';
import { reversePainterSortStable } from '@pmndrs/uikit';
import { iniciarBotonXR } from '../visor/xr-sesion.js';
import { activarVistaPrevia } from '../vista-previa/control-mouse.js';
import { crearEntornoPreview } from '../vista-previa/entorno-preview.js';
import { crearSpikeUikit } from './_spike.js';

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

const spikeUikit = crearSpikeUikit();
escena.add(spikeUikit);

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
  spikeUikit.update(deltaMs);
  renderizador.render(escena, camara);
});
