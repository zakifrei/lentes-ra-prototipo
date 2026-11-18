// Pantalla de reconocimiento (simulado): el primer texto que ve el
// usuario al iniciar la experiencia, antes de la bienvenida. Wrapper fino
// sobre `panel-texto.js` -- no agrega lógica propia.
//
// Texto reescrito a pedido del dueño del proyecto (el literal original del
// guion, "Mirá al frente para identificarte", le pareció demasiado chato
// una vez viéndolo puesto -- esto ya no es el texto literal del guion, es
// una decisión de redacción posterior, con libertad creativa del builder).

import { crearPanelTexto } from './panel-texto.js';

const TEXTO_RECONOCIMIENTO = 'Mirá al frente: te estamos reconociendo';

// Un poco más grande que el default de panel-texto.js (48): pulido visual,
// a pedido del dueño del proyecto, para que los carteles de texto se lean
// mejor.
const TAMANO_FUENTE = 54;

/**
 * Crea la pantalla de reconocimiento.
 * @returns {THREE.Object3D}
 */
export function crearPantallaReconocimiento() {
  return crearPanelTexto([TEXTO_RECONOCIMIENTO], {
    nombre: 'pantalla-reconocimiento',
    tamanoFuente: TAMANO_FUENTE,
  });
}
