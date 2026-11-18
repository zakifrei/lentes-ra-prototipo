// Pantalla de "clase finalizada": a pedido del dueño del proyecto, un
// mensaje de cierre para que el usuario sepa que ya puede sacarse los
// lentes. Wrapper fino sobre `panel-texto.js` -- no agrega lógica propia,
// mismo patrón que pantalla-reconocimiento.js.
//
// A diferencia de TODAS las demás pantallas del proyecto, ésta no tiene
// ningún botón ni mecanismo de selección propio: el pedido explícito fue
// que el usuario no la dispare ni interactúe con ella, sólo la vea -- la
// dispara el observador desde el panel externo (ver ETIQUETAS_PANTALLA en
// js/panel/main.js). Por la misma razón, el botón de menú flotante se
// oculta en esta pantalla (ver actualizarPantallaVisible en
// js/visor/main.js, mismo criterio que 'aviso'/'pausa').

import { crearPanelTexto } from './panel-texto.js';

const TEXTO_FINALIZADA = 'Clase finalizada: ya te podés sacar los lentes';

/**
 * Crea la pantalla de clase finalizada.
 * @returns {THREE.Object3D}
 */
export function crearPantallaFinalizada() {
  return crearPanelTexto([TEXTO_FINALIZADA], {
    nombre: 'pantalla-finalizada',
  });
}
