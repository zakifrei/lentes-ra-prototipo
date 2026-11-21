// Pantalla de bienvenida (visor-uikit, Tarea 3 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): 3 bloques de
// texto con tamaños/pesos/colores DISTINTOS (saludo grande en negrita,
// anuncio mediano, tip chico en ámbar) -- mismos textos y tamaños que
// js/visor/paneles/pantalla-bienvenida.js (leído como referencia).
//
// La versión vieja necesitaba dibujar su propio canvas a mano porque
// `crearPanelTexto` sólo soporta un tamaño de fuente compartido por todas
// las líneas (ver su comentario grande). Acá no hace falta: cada `Text`
// de uikit tiene su propio `fontSize`/`fontWeight`/`color` -- alcanza con
// `crearContenedorUikit` (el "cascarón" de panel-uikit.js) más 3 `Text`
// agregados a mano.

import { Text } from '@pmndrs/uikit';
import { crearContenedorUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO, COLOR_AMBAR_TEXTO } from '../ui-kit/tema-uikit.js';

// Mismo tamaño físico que la versión vieja (un poco más alto que el
// panel por defecto, para que los 3 bloques entren con aire).
const ANCHO_PANEL = 0.85;
const ALTO_PANEL = 0.5;
const POSICION = { x: 0, y: 1.1, z: -1.8 };

const TEXTO_SALUDO = '¡Hola, Sofía!';
const TEXTO_CLASE = 'Ahora arranca tu clase de Historia';
const TEXTO_TIP = 'Tip: Te recomiendo usar imágenes';

// Mismos 3 tamaños que la versión vieja, de mayor a menor.
const TAMANO_FUENTE_SALUDO = 80;
const TAMANO_FUENTE_CLASE = 46;
const TAMANO_FUENTE_TIP = 38;

/**
 * Crea la pantalla de bienvenida: 3 bloques de texto (saludo grande en
 * negrita, anuncio de clase mediano, tip chico en ámbar), sin botones. El
 * objeto devuelto expone `actualizarUikit(deltaMs)` (misma convención
 * que el resto de las pantallas, ver pantalla-menu.js).
 * @returns {import('@pmndrs/uikit').Container}
 */
export function crearPantallaBienvenida() {
  const { contenedor } = crearContenedorUikit({
    posicion: POSICION,
    ancho: ANCHO_PANEL,
    alto: ALTO_PANEL,
    nombre: 'pantalla-bienvenida',
    // Los 3 bloques no comparten tamaño: en vez de un `gap` fijo entre
    // ellos (pensado para líneas del mismo tamaño, ver crearPanelUikit),
    // 'space-evenly' reparte el aire sobrante entre y alrededor de los
    // 3 -- mismo efecto visual que las 3 fracciones de Y de la versión
    // vieja (0.22/0.5/0.78, equiespaciadas).
    justifyContent: 'space-evenly',
  });

  contenedor.add(
    new Text({
      text: TEXTO_SALUDO,
      color: COLOR_TEXTO,
      fontSize: TAMANO_FUENTE_SALUDO,
      fontWeight: 'bold',
      // Fraunces (serif cálida) sólo para el título -- ver el comentario
      // grande de fuente-uikit.js (pedido vía /design-consultation).
      fontFamily: 'fraunces',
    })
  );
  contenedor.add(
    new Text({
      text: TEXTO_CLASE,
      color: COLOR_TEXTO,
      fontSize: TAMANO_FUENTE_CLASE,
      fontWeight: 'normal',
    })
  );
  contenedor.add(
    new Text({
      // Variante clara de acento (ver tema-uikit.js): resalta como
      // recomendación, no como texto normal -- mismo criterio que la
      // versión vieja.
      text: TEXTO_TIP,
      color: COLOR_AMBAR_TEXTO,
      fontSize: TAMANO_FUENTE_TIP,
      fontWeight: 'normal',
    })
  );

  contenedor.actualizarUikit = (deltaMs) => contenedor.update(deltaMs);
  return contenedor;
}
