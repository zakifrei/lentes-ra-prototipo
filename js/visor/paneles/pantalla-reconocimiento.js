// Pantalla de reconocimiento (simulado): el primer texto que ve el
// usuario al iniciar la experiencia, antes de la bienvenida. Wrapper fino
// sobre `panel-texto.js` con el texto literal del guion -- no agrega
// lógica propia.

import { crearPanelTexto } from './panel-texto.js';

const TEXTO_RECONOCIMIENTO = 'Mirá al frente para identificarte';

/**
 * Crea la pantalla de reconocimiento.
 * @returns {THREE.Object3D}
 */
export function crearPantallaReconocimiento() {
  return crearPanelTexto([TEXTO_RECONOCIMIENTO], {
    nombre: 'pantalla-reconocimiento',
  });
}
