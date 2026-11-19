// Paleta compartida del visor nuevo (Tarea 1 del plan de migración a
// @pmndrs/uikit, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// mismos valores que js/visor/tema-visual.js, leído como referencia (esta
// carpeta no importa nada de js/visor/ para el dibujo de paneles -- ver
// Arquitectura del plan).
//
// Simplificación a propósito (Review Focus del plan: "uikit no tiene
// equivalente directo a un glow/box-shadow difuso"): tema-visual.js dibuja
// cada panel con un degradé de 2 tonos + sombra ámbar difusa + highlight
// superior sobre un <canvas>. uikit no tiene manera directa de pedir un
// degradé en backgroundColor ni un shadowBlur -- la primera aproximación
// acá es borde sólido + backgroundColor sólido, sin el glow. Si no
// convence a ojo, decidir con el dueño del proyecto antes de seguir (tal
// cual dice el Review Focus).

export const COLOR_TEXTO = '#fff3e0';
export const COLOR_AMBAR = '#ffb454';
export const COLOR_AMBAR_TEXTO = '#ffe6c2';

// Fondo "cartel" (sólo lectura): mismo valor que el COLOR_FONDO_PANEL
// exportado de tema-visual.js (el que dibujarFondoPanel usaba antes del
// degradé de 2 tonos de la Tarea 27 -- sigue siendo un punto medio
// razonable del degradé actual).
export const COLOR_FONDO_CARTEL = 'rgba(28, 16, 8, 0.74)';

// Fondo "botón" (interactivo): tema-visual.js no exporta un único color acá
// -- usa 2 tonos privados (COLOR_FONDO_BOTON_CLARO/_OSCURO) como extremos
// de un degradé. Este valor es el punto medio de esos dos, leído de
// tema-visual.js como referencia (ruling: no hay un "mismo valor" exacto
// que reexportar porque el original nunca fue un color sólido).
export const COLOR_FONDO_BOTON = 'rgba(99, 49, 13, 0.66)';

// Radio de esquina proporcional (mismo criterio que tema-visual.js, ver su
// FRACCION_RADIO_ESQUINAS/calcularRadioEsquinas): sólo la variante "botón"
// tiene esquinas redondeadas (cápsula); un cartel fijo es rectangular. Acá
// `ancho`/`alto` ya vienen en "píxeles" de uikit (ver panel-uikit.js para
// la conversión metros -> píxeles), pero la fracción es la misma.
const FRACCION_RADIO_ESQUINAS = 0.4;

export function calcularRadioEsquinasUikit(anchoPx, altoPx, interactivo) {
  if (!interactivo) return 0;
  const radioDeseado = Math.min(anchoPx, altoPx) * FRACCION_RADIO_ESQUINAS;
  return Math.min(radioDeseado, anchoPx / 2, altoPx / 2);
}
