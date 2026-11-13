// Vista previa de escritorio: cuando no hay sesión WebXR activa (porque el
// navegador no la soporta o porque el usuario todavía no entró a RA), este
// módulo envuelve OrbitControls para poder orbitar la cámara con el mouse y
// simular así los giros de cabeza que daría el casco.

import { OrbitControls } from '../../vendor/three/OrbitControls.js';

export function activarVistaPrevia(renderizador, camara, domElement) {
  const controles = new OrbitControls(camara, domElement);

  // Suaviza el movimiento al arrastrar; requiere llamar a update() en
  // cada cuadro del bucle de renderizado.
  controles.enableDamping = true;

  // La cámara arranca mirando hacia el centro de la escena (posición
  // inicial definida en main.js); orbitamos alrededor de ese punto.
  controles.target.set(0, 1.6, 0);
  controles.update();

  return controles;
}
