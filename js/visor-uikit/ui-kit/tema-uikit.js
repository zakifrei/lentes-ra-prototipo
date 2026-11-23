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
// aplicado a un `Button` real. Los carteles de sólo lectura también
// pasaron después a `Card`/`Alert` del mismo kit (ver panel-uikit.js/
// pantalla-aviso.js) -- el degradé sutil de más abajo
// (`crearFondoDegradadoCartel`) es aparte, encima de esos componentes.
import * as THREE from '../../../vendor/three/three.module.js';
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

// Tercer riesgo de /design-consultation (ver DESIGN.md): un degradé sutil
// en vez del fondo sólido plano de los carteles de lectura (Card/Alert),
// más cerca de cómo se ven paneles reales de Horizon OS/visionOS
// (investigado en la consulta) sin tocar la iluminación de la escena --
// uikit no tiene forma directa de pedir un degradé en `backgroundColor`
// (ver el comentario grande de arriba), así que esto dibuja uno chico a
// mano en un canvas y lo usa como textura. Misma técnica que ya usaba
// icono-uikit.js para los íconos (antes de migrar a @pmndrs/uikit-lucide)
// -- un `Image` de uikit con una `THREE.CanvasTexture`.
import { Image } from '@pmndrs/uikit';

const ALTO_CANVAS_DEGRADADO = 256;
// 1px de ancho alcanza: el degradé sólo varía en Y, uikit estira la
// textura para llenar el `width`/`height` del panel (`keepAspectRatio:
// false`, ver más abajo) sin importar su proporción real.
const ANCHO_CANVAS_DEGRADADO = 1;

// Mismo tono que COLOR_FONDO_CARTEL abajo (el ancla, sin cambiar nada de
// lo ya verificado) -- arriba, un tono más cálido/claro de la misma
// familia ámbar-umbra, no un color nuevo.
const COLOR_DEGRADADO_ARRIBA = 'rgba(64, 40, 20, 0.74)';

let texturaDegradadoCartel = null;

function obtenerTexturaDegradadoCartel() {
  if (texturaDegradadoCartel) return texturaDegradadoCartel;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS_DEGRADADO;
  canvas.height = ALTO_CANVAS_DEGRADADO;
  const contexto = canvas.getContext('2d');
  const gradiente = contexto.createLinearGradient(0, 0, 0, ALTO_CANVAS_DEGRADADO);
  gradiente.addColorStop(0, COLOR_DEGRADADO_ARRIBA);
  gradiente.addColorStop(1, COLOR_FONDO_CARTEL);
  contexto.fillStyle = gradiente;
  contexto.fillRect(0, 0, ANCHO_CANVAS_DEGRADADO, ALTO_CANVAS_DEGRADADO);

  texturaDegradadoCartel = new THREE.CanvasTexture(canvas);
  texturaDegradadoCartel.needsUpdate = true;
  return texturaDegradadoCartel;
}

/**
 * Crea una capa de degradé sutil (ámbar cálido arriba, COLOR_FONDO_CARTEL
 * abajo) del tamaño completo del panel que la contiene -- agregarla como
 * PRIMER hijo de un `Card`/`Alert` (antes que el ícono/texto), encima de
 * su fondo sólido.
 * @returns {import('@pmndrs/uikit').Image}
 */
export function crearFondoDegradadoCartel() {
  return new Image({
    src: obtenerTexturaDegradadoCartel(),
    width: '100%',
    height: '100%',
    keepAspectRatio: false,
    positionType: 'absolute',
    positionTop: 0,
    positionLeft: 0,
    // Mismo motivo que ya documentaba icono-uikit.js para sus íconos:
    // sin esto, esta capa queda en el mismo plano Z que el fondo sólido
    // del panel y pierde el z-test contra él la mitad de las veces.
    //
    // Bug encontrado post-commit (reportado por el dueño del proyecto:
    // el texto se veía ilegible encima del degradé en pantalla-resumen):
    // `renderOrder: 1` quedaba POR ENCIMA de un `Text` nativo de uikit, que
    // no fija su propio renderOrder (default 0 de THREE.Object3D) -- con
    // `depthTest: false`, Three.js pinta por renderOrder ascendente dentro
    // del balde de objetos transparentes, así que el degradé (1) se
    // pintaba DESPUÉS del texto (0) y lo tapaba con su alpha 0.74. La
    // verificación anterior (ver Decisions Log) fue sobre pantalla-aviso,
    // cuyo ícono/texto sí fijan 1000 -- no cubría el caso común de un
    // `Text` sin renderOrder explícito (pantalla-resumen/bienvenida/
    // vuelta/mapa). Ahora el degradé usa un renderOrder negativo: siempre
    // por debajo de cualquier contenido que no fije el suyo (el caso
    // normal), confirmado en vivo con pantalla-resumen.
    depthTest: false,
    renderOrder: -1,
  });
}
