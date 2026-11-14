// Pantalla de aviso de atención: se muestra cuando el sistema detecta que
// los niveles de atención del usuario bajaron, disparada por el botón
// "Disparar aviso" del panel real del observador (Tarea 17). Wrapper fino sobre
// `panel-texto.js`, igual que bienvenida/reconocimiento, pero agrega el
// único mecanismo de aceptación del proyecto (`enEventoSeleccion`, ver
// interaccion.js): esta tarea no tiene una opción de "no" -- el único
// botón del lente (gatillo o pellizco) alcanza para aceptar.

import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion } from '../interaccion.js';

const TEXTO_AVISO = 'Notamos que tus niveles de atención disminuyeron. ¿Querés ayuda?';

/**
 * Crea la pantalla de aviso de atención. Al completarse un gesto de
 * selección completo (pellizco, gatillo o click) mientras esta pantalla
 * está visible, llama a `onAceptar` una sola vez (mismo comportamiento de
 * "un solo disparo por gesto" de `enEventoSeleccion`: no hace falta
 * des-duplicar acá).
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onAceptar
 * @returns {THREE.Object3D}
 */
export function crearPantallaAviso(renderer, onAceptar) {
  const panel = crearPanelTexto([TEXTO_AVISO], { nombre: 'pantalla-aviso' });

  enEventoSeleccion(renderer, () => {
    // Mismo criterio que pantalla-menu.js/pantalla-subtitulos.js: el
    // raycasting de Three.js no filtra por `.visible`, así que si esta
    // pantalla no es la activa hay que ignorar el gesto a mano. Esta
    // pantalla no tiene botones individuales (una sola acción posible),
    // así que cualquier gesto completo mientras está visible acepta.
    if (!panel.visible) return;
    onAceptar();
  });

  return panel;
}
