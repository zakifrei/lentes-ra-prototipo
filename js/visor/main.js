// Punto de entrada del visor: monta una escena básica de Three.js sobre el
// <canvas id="escena"> de index.html. El fondo es transparente porque en RA
// (passthrough del Quest) el canvas se superpone al video de la cámara; en
// un navegador de escritorio sin WebXR se ve simplemente negro.

import * as THREE from '../../vendor/three/three.module.js';
import { iniciarBotonXR } from './xr-sesion.js';
import { activarVistaPrevia } from '../vista-previa/control-mouse.js';
import { crearPanelSubtitulos } from './paneles/panel-subtitulos.js';
import { establecerCamaraVistaPrevia, habilitarArrastre } from './interaccion.js';

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

// Panel de subtítulos: arrancamos con un texto de ejemplo fijo (los
// subtítulos reales llegan en una tarea futura). Se registra el arrastre
// ANTES de activar la vista previa de escritorio para que, al hacer click
// sobre el panel, ese click quede "reclamado" (ver interaccion.js) y no
// dispare además el orbit de OrbitControls.
const panelSubtitulos = crearPanelSubtitulos('Texto de ejemplo');
escena.add(panelSubtitulos);

// Volumen cómodo y alcanzable frente al usuario: evita que el panel se
// pueda arrastrar detrás de la cabeza, demasiado lejos, o pegado a la cara.
const limitesPanelSubtitulos = {
  x: [-1, 1],
  y: [0.8, 2],
  z: [-2, -0.3],
};
habilitarArrastre(renderizador, panelSubtitulos, limitesPanelSubtitulos);

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
