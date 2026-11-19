// Pantalla de reconocimiento (visor-uikit, Tarea 3 del plan de migración,
// ver docs/superpowers/plans/2026-11-19-migracion-uikit.md): wrapper fino
// sobre `crearPanelUikit`, mismo texto y tamaño de fuente que
// js/visor/paneles/pantalla-reconocimiento.js (leído como referencia).

import { crearPanelUikit } from '../ui-kit/panel-uikit.js';

const TEXTO_RECONOCIMIENTO = 'Mirá al frente: te estamos reconociendo';

// Mismo valor que la versión vieja (un poco más grande que el default).
const TAMANO_FUENTE = 54;

/**
 * Crea la pantalla de reconocimiento. El objeto devuelto expone
 * `actualizarUikit(deltaMs)` (misma convención que pantalla-menu.js, ver
 * su comentario grande): quien lo agregue a la escena debe llamarlo en
 * cada cuadro, o el panel nunca hace layout ni se ve.
 * @returns {import('@pmndrs/uikit').Container}
 */
export function crearPantallaReconocimiento() {
  const panel = crearPanelUikit([TEXTO_RECONOCIMIENTO], {
    nombre: 'pantalla-reconocimiento',
    tamanoFuente: TAMANO_FUENTE,
  });
  panel.actualizarUikit = (deltaMs) => panel.update(deltaMs);
  return panel;
}
