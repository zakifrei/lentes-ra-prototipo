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

// --- Normas de Meta Horizon OS (2026-11-25, ver DESIGN.md) -------------
// Fuente: developers.meta.com/vr/design/styles_color y accessibility-
// checklist. Reglas que fijan los valores de abajo:
// - Nada de blanco/negro puros: claros no más brillantes que #DADADA,
//   oscuros no más oscuros que #1A1A1A (en luminancia relativa) -- vale
//   también para el texto.
// - Contraste WCAG 2.1 AA: 4.5:1 texto normal, 3:1 texto grande y
//   elementos no-texto (fondos de botón, bordes).
// - En passthrough el fondo real cambia (ventana, pizarrón, aula oscura):
//   ante la duda, más contraste.
// Contraste medido (texto sobre cartel/botón con OPACIDAD_FONDO, contra un
// aula negra, gris y una pared blanca): cartel >= 6.5:1 (contando la
// parte clara del degradé), botón >= 5.3:1, rojo destructivo 5.3:1.
//
// Texto: el mismo tono cálido de antes (#fff3e0) bajado a la luminancia
// de #DADADA (0.70 vs 0.91) -- sigue siendo crema, ya no casi blanco.
export const COLOR_TEXTO = '#e4d7c4';
// Ámbar de acento/borde: no es fondo ni texto largo, se mantiene. Sobre un
// aula oscura da 8.4:1 -- es lo que separa el panel del fondo real.
export const COLOR_AMBAR = '#ffb454';
// Ámbar texto (detalles chicos, p. ej. "temas pendientes"): era #ffe6c2
// (luminancia 0.82, por encima del tope de #DADADA) -- bajado a 0.67.
export const COLOR_AMBAR_TEXTO = '#ead3b0';

// Opacidad de todo fondo de panel. Era 0.74 (cartel) / 0.66 (botón): el
// 26-34% de transparencia dejaba que el detalle del aula (gente,
// pizarrón) se viera a través del panel y ensuciara el texto, y el botón
// sobre una ventana quedaba en 4.1:1 (< 4.5:1).
export const OPACIDAD_FONDO = 0.88;

// Grosor del borde ámbar de cada panel, en "píxeles" de la referencia de
// 1024 (ver panel-uikit.js). Era 2 (~1.5 mm a 1.8 m: ~1 píxel del Quest,
// se perdía) -- con 6 (~4.7 mm) el borde se ve y separa el panel del
// aula oscura, donde el fondo del panel solo da ~1.2:1 contra el entorno.
export const GROSOR_BORDE = 6;

/**
 * Color con transparencia como hex de 8 dígitos (#rrggbbaa).
 *
 * Bug de color encontrado el 2026-11-25 (al medir el contraste en la
 * vista previa): @pmndrs/uikit 1.0.78 carga un string `rgba(r, g, b, a)`
 * tal cual en su buffer de color (r/255, sin convertir de sRGB a lineal),
 * mientras que un hex pasa por `THREE.Color.set()`, que sí convierte. El
 * renderer después codifica a sRGB, así que todo fondo escrito como
 * `rgba(...)` salía mucho más CLARO que lo diseñado (cartel rgb(36,26,18)
 * -> se veía ~rgb(107,96,80); botón rgb(99,49,13) -> ~rgb(168,122,64)).
 * Esa es buena parte de por qué el texto "se perdía" en los paneles. Con
 * hex de 8 dígitos el color pasa por la conversión correcta y el alfa se
 * respeta igual.
 * @param {number} r 0-255 (sRGB)
 * @param {number} g 0-255 (sRGB)
 * @param {number} b 0-255 (sRGB)
 * @param {number} alfa 0-1
 * @returns {string}
 */
function colorConAlfa(r, g, b, alfa) {
  const hex = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}${hex(alfa * 255)}`;
}

// --- Escala tipográfica en dp (Meta Horizon OS) -------------------------
// Meta da los tamaños en dp: 14 dp mínimo legible, 18 dp lectura cómoda
// (design/styles_typography), y usa 500 dp por metro por defecto para
// paneles (spatial-sdk-2dpanel-resolution, DpPerMeterDisplayOptions) --
// o sea 1 dp = 2 mm de alto de letra, para paneles a ~1.8-2 m como los
// de este visor. Un set corto de estilos, como pide Meta ("use a limited
// set of type styles"):
export const TIPO_DP = Object.freeze({
  titulo1: 32, // saludo grande (bienvenida/vuelta)
  titulo2: 24, // título de cartel, encabezado de columna, contador
  cuerpo1: 20, // texto principal y botones
  cuerpo2: 18, // texto secundario -- el mínimo "cómodo" de Meta, nunca menos
});
const DP_POR_METRO = 500;
const ANCHO_CANVAS_REFERENCIA = 1024;

/**
 * Convierte un tamaño en dp de Meta a `fontSize` de uikit para un panel de
 * `anchoPanel` metros (uikit mide en "píxeles" de la referencia de 1024,
 * ver panel-uikit.js: pixelSize = anchoPanel / 1024).
 * @param {number} dp
 * @param {number} anchoPanel ancho físico del panel, en metros
 * @returns {number}
 */
export function fuenteDesdeDp(dp, anchoPanel) {
  return (dp / DP_POR_METRO) * (ANCHO_CANVAS_REFERENCIA / anchoPanel);
}

// Fondo "cartel" (sólo lectura): mismo valor que el COLOR_FONDO_PANEL
// exportado de tema-visual.js (el que dibujarFondoPanel usaba antes del
// degradé de 2 tonos de la Tarea 27 -- sigue siendo un punto medio
// razonable del degradé actual).
// Base subida de rgb(28,16,8) (más oscura que #1A1A1A, fuera de norma) a
// rgb(36,26,18) -- mismo tono umbra, luminancia apenas sobre #1A1A1A.
export const COLOR_FONDO_CARTEL = colorConAlfa(36, 26, 18, OPACIDAD_FONDO);

// Fondo "botón" (interactivo): tema-visual.js no exporta un único color acá
// -- usa 2 tonos privados (COLOR_FONDO_BOTON_CLARO/_OSCURO) como extremos
// de un degradé. Este valor es el punto medio de esos dos, leído de
// tema-visual.js como referencia (ruling: no hay un "mismo valor" exacto
// que reexportar porque el original nunca fue un color sólido).
export const COLOR_FONDO_BOTON = colorConAlfa(99, 49, 13, OPACIDAD_FONDO);

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
  muted: COLOR_FONDO_CARTEL,
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
const COLOR_DEGRADADO_ARRIBA = colorConAlfa(64, 42, 22, OPACIDAD_FONDO);

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
  // Mismo bug de color que `colorConAlfa` (ver arriba): sin esto, three
  // trata los píxeles del canvas (sRGB) como lineales y el degradé sale
  // mucho más claro que lo diseñado.
  texturaDegradadoCartel.colorSpace = THREE.SRGBColorSpace;
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
