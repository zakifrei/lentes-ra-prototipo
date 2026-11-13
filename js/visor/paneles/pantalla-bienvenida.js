// Pantalla de bienvenida: se muestra después del reconocimiento, con el
// saludo personalizado y el perfil de aprendizaje detectado. Wrapper fino
// sobre `panel-texto.js` con los textos literales del guion -- no agrega
// lógica propia.

import { crearPanelTexto } from './panel-texto.js';

const TEXTO_SALUDO = 'Hola, Sofía · Historia · La clase está por empezar';
const TEXTO_PERFIL = 'Aprendés mejor con imágenes';

/**
 * Crea la pantalla de bienvenida.
 * @returns {THREE.Object3D}
 */
export function crearPantallaBienvenida() {
  return crearPanelTexto([TEXTO_SALUDO, TEXTO_PERFIL], {
    nombre: 'pantalla-bienvenida',
  });
}
