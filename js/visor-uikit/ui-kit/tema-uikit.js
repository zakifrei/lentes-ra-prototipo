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
//
// Post-migración (pedido del dueño del proyecto): investigar un kit de
// componentes real en vez de seguir a mano. `@pmndrs/uikit-horizon` (el
// kit con la estética nativa de Meta Horizon OS) quedó descartado -- es
// el Reality Labs Design System de Meta tal cual, con colores de marca
// HARDCODEADOS adentro de dist/theme.js (ni un solo parámetro para
// recolorear), así que no cumple el requisito explícito de poder
// cambiarle el color a esta estética ámbar. `@pmndrs/uikit-default` (el
// kit estilo shadcn/ui) sí: expone `setTheme(tema)` sobre un objeto de
// colores semánticos (`primary`/`border`/etc.) pensado exactamente para
// esto -- confirmado en vivo en el navegador con el tema de abajo,
// aplicado a un `Button` real. Se usa sólo para los botones
// (`interactivo: true` en panel-uikit.js) -- los carteles de sólo lectura
// siguen con su Container a mano, fuera de alcance por ahora.
import { setTheme } from '@pmndrs/uikit-default';

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

// Tema de @pmndrs/uikit-default recoloreado a la estética ámbar del
// proyecto -- mismos valores que las constantes de arriba (ninguno
// inventado). `primary`/`primaryForeground` son los que usa `Button` en
// su variante por defecto (ver panel-uikit.js): fondo cápsula + texto,
// mismo criterio visual que COLOR_FONDO_BOTON/COLOR_TEXTO de siempre.
// `border` alimenta el borde de CUALQUIER componente del kit (vía
// `componentDefaults.borderColor` del propio paquete) -- es el que
// reemplaza a COLOR_AMBAR como borde. El resto de los campos (card/
// popover/secondary/muted/accent/destructive/...) hay que completarlos
// porque el objeto de tema es un `object` estricto (zod `.strict()` en
// otros paquetes de uikit, confirmado con `Object.keys` en vivo) -- se
// completan con los mismos 2-3 tonos ya existentes, no colores nuevos.
export const TEMA_DISENO_AMBAR = {
  radius: 24,
  background: COLOR_FONDO_CARTEL,
  foreground: COLOR_TEXTO,
  card: COLOR_FONDO_CARTEL,
  cardForeground: COLOR_TEXTO,
  popover: COLOR_FONDO_CARTEL,
  popoverForeground: COLOR_TEXTO,
  primary: COLOR_FONDO_BOTON,
  primaryForeground: COLOR_TEXTO,
  secondary: COLOR_FONDO_CARTEL,
  secondaryForeground: COLOR_TEXTO,
  muted: 'rgba(28, 16, 8, 0.5)',
  mutedForeground: COLOR_AMBAR_TEXTO,
  accent: COLOR_FONDO_BOTON,
  accentForeground: COLOR_TEXTO,
  // Único color que no es parte de la paleta ámbar a propósito: es el
  // mismo rojo de "rechazar"/destructivo que ya usa el resto del
  // proyecto como color de alerta (ver COLOR_SILUETA* en
  // entorno-preview.js para el mismo criterio de "no todo tiene que ser
  // ámbar").
  destructive: '#aa0a1e',
  destructiveForeground: COLOR_TEXTO,
  border: COLOR_AMBAR,
  input: COLOR_AMBAR,
  ring: COLOR_AMBAR,
};

let temaAplicado = false;

/**
 * Aplica `TEMA_DISENO_AMBAR` a @pmndrs/uikit-default -- hay que llamarla
 * una sola vez, antes de crear el primer `Button` (panel-uikit.js la
 * llama a nivel de módulo, ver más abajo). Memoizada: llamarla de nuevo
 * no vuelve a aplicar nada.
 */
export function aplicarTemaDiseno() {
  if (temaAplicado) return;
  temaAplicado = true;
  setTheme(TEMA_DISENO_AMBAR);
}
