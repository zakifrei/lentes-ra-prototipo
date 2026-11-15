// Pantalla de bienvenida: se muestra después del reconocimiento, con el
// saludo personalizado y el perfil de aprendizaje detectado. Wrapper fino
// sobre `panel-texto.js` -- no agrega lógica propia.
//
// Textos reescritos a pedido del dueño del proyecto (los literales
// originales del guion, "Hola, Sofía · Historia · La clase está por
// empezar" / "Aprendés mejor con imágenes", le parecieron demasiado chatos
// una vez viéndolos puestos -- esto ya no son los textos literales del
// guion, es una decisión de redacción posterior, con libertad creativa del
// builder).

import { crearPanelTexto } from './panel-texto.js';

const TEXTO_SALUDO = '¡Hola, Sofía! · Historia · Arrancamos en instantes';
const TEXTO_PERFIL = 'Sos visual: te vamos a mostrar más imágenes';

/**
 * Crea la pantalla de bienvenida.
 * @returns {THREE.Object3D}
 */
export function crearPantallaBienvenida() {
  return crearPanelTexto([TEXTO_SALUDO, TEXTO_PERFIL], {
    nombre: 'pantalla-bienvenida',
  });
}
