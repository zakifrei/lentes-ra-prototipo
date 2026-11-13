// Panel 3D de subtítulos: un plano con una `CanvasTexture` dibujada con
// Canvas 2D que muestra el texto. Se ubica, por defecto, fuera del centro
// del campo visual del usuario (más abajo y no exactamente al frente), para
// no tapar nunca lo que el usuario está mirando -- igual que unos
// subtítulos reales, que van en la parte inferior de la vista.

import * as THREE from '../../../vendor/three/three.module.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 256;

// Tamaño físico del panel en metros (RA): ancho x alto.
const ANCHO_PANEL = 0.6;
const ALTO_PANEL = 0.15;

// Posición por defecto: más abajo que la altura típica de los ojos
// (~1.6 m) y un poco adelante, fuera del centro del campo visual.
const POSICION_POR_DEFECTO = { x: 0, y: 1.2, z: -1 };

function dibujarTextoEnCanvas(contexto, texto) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = 'rgba(0, 0, 0, 0.6)';
  contexto.fillRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = '#ffffff';
  contexto.font = '64px sans-serif';
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';
  contexto.fillText(texto, ANCHO_CANVAS / 2, ALTO_CANVAS / 2);
}

/**
 * Crea el panel 3D de subtítulos: un `PlaneGeometry` con una
 * `CanvasTexture` del `texto` dado, dibujada con Canvas 2D.
 * @param {string} texto
 * @returns {THREE.Object3D}
 */
export function crearPanelSubtitulos(texto) {
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;

  const contexto = canvas.getContext('2d');
  dibujarTextoEnCanvas(contexto, texto);

  const textura = new THREE.CanvasTexture(canvas);

  const material = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    // El panel de subtítulos siempre debe leerse, sin importar la luz de
    // la escena ni el ángulo desde el que se lo mire.
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const geometria = new THREE.PlaneGeometry(ANCHO_PANEL, ALTO_PANEL);

  const panel = new THREE.Mesh(geometria, material);
  panel.name = 'panel-subtitulos';
  panel.position.set(
    POSICION_POR_DEFECTO.x,
    POSICION_POR_DEFECTO.y,
    POSICION_POR_DEFECTO.z
  );

  return panel;
}
