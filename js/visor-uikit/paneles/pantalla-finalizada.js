// Pantalla de "clase finalizada" (visor-uikit, Tarea 3 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// wrapper fino sobre `crearPanelUikit`, mismo texto y tamaño de fuente que
// js/visor/paneles/pantalla-finalizada.js (leído como referencia). Sin
// botones ni mecanismo de selección propio -- mismo criterio que la
// versión vieja (la dispara el observador desde el panel externo).

import { crearPanelUikit } from '../ui-kit/panel-uikit.js';

const TEXTO_FINALIZADA = 'Clase finalizada: ya te podés sacar los lentes';

// Mismo valor que la versión vieja (un poco más grande que el default).
const TAMANO_FUENTE = 54;

/**
 * Crea la pantalla de clase finalizada. El objeto devuelto expone
 * `actualizarUikit(deltaMs)` (misma convención que el resto de las
 * pantallas, ver pantalla-menu.js).
 * @returns {import('@pmndrs/uikit').Container}
 */
export function crearPantallaFinalizada() {
  const panel = crearPanelUikit([TEXTO_FINALIZADA], {
    nombre: 'pantalla-finalizada',
    tamanoFuente: TAMANO_FUENTE,
  });
  panel.actualizarUikit = (deltaMs) => panel.update(deltaMs);
  return panel;
}
