// Ícono real de @pmndrs/uikit-lucide (set de íconos vectoriales de Lucide,
// portado a componentes `Svg` de uikit vanilla -- el mismo set que usa
// shadcn/ui, con el que ya tematizamos Button/Card en tema-uikit.js)
// reemplazando el ícono dibujado a mano en Canvas2D de la Tarea 1
// (dibujarIcono de js/visor/iconos.js, rasterizado a una textura chica).
// Pedido del dueño del proyecto: "existe algún design system para agarrar
// los elementos ya" -- este es un componente real, ya hecho, en vez de
// seguir dibujando a mano.
//
// Mapeo de nombres propios del proyecto a su ícono de Lucide (ninguno
// inventado: el que mejor representa la misma idea que dibujarIcono):
// - 'subtitulos' -> Captions (el ícono estándar de subtítulos/closed
//   captions en la mayoría de los sets de íconos, Lucide incluido).
// - 'imagenes'   -> Image (se importa como `ImageIcon`: `Image` ya es el
//   nombre del componente de @pmndrs/uikit para imágenes con textura,
//   así que hay que renombrar el import para no pisarlo).
// - 'mapa'       -> Map.
// - 'pausa'      -> Pause.
// - 'aceptar'    -> Check.
// - 'rechazar'   -> X.
// - 'reiniciar'  -> RotateCcw (flecha circular "deshacer", mismo ícono
//   que usa shadcn/ui para "reset"/"undo").
// - 'menu'       -> Menu (tres líneas horizontales, igual idea que el
//   hamburger dibujado a mano).
// - 'flecha'     -> ArrowRight (dibujarIcono sólo dibujaba hacia la
//   derecha, nunca recibía una dirección -- ver iconos.js).
//
// Hallazgo de unidades (confirmado en vivo en el navegador, con una
// escena mínima fuera del visor): a diferencia de `Image` (cuyo
// `sizeX`/`sizeY` son unidades del MUNDO siempre, ver el comentario
// grande que tenía este archivo antes), `Svg` (la clase base de estos
// íconos) sigue el convenio normal de TODO el resto del módulo --
// `width`/`height` en "píxeles" de contenido, escalados por el
// `pixelSize` que hereda del panel que lo contiene (confirmado: con
// `pixelSize: 0.01` y `width: 60`, el ícono midió 0.6 unidades de mundo
// en X). Por eso quien llama ya NO tiene que premultiplicar por
// `pixelSize` como con el `Image` viejo -- ver panel-uikit.js.
//
// Segundo hallazgo (clave, no documentado así en ningún lado):
// `supportFillProperty: true` de `Svg` sugiere que el color se fija con
// la propiedad `fill`, pero `fill` NUNCA llega a aplicarse -- confirmado
// en vivo, con y sin volver a llamar `setProperties({ fill: ... })`
// después de que el SVG terminó de cargar (parece que el esquema de
// propiedades de `Svg` en esta versión no declara `fill`, así que
// cualquier valor pasado se descarta antes de llegar a
// `properties.value.fill`). La propiedad que sí tiñe el ícono, confirmado
// en vivo, es `color` (la misma que usan Container/Text) -- se usa esa acá.

import {
  Captions,
  Image as ImageIcon,
  Map as MapIcon,
  Pause,
  Check,
  X,
  RotateCcw,
  Menu,
  ArrowRight,
} from '@pmndrs/uikit-lucide';

const ICONOS_POR_NOMBRE = {
  subtitulos: Captions,
  imagenes: ImageIcon,
  mapa: MapIcon,
  pausa: Pause,
  aceptar: Check,
  rechazar: X,
  reiniciar: RotateCcw,
  menu: Menu,
  flecha: ArrowRight,
};

/**
 * Crea un ícono real de @pmndrs/uikit-lucide, cuadrado de
 * `diametroPx` x `diametroPx` -- en "píxeles" de contenido, escalados
 * por el `pixelSize` del panel que lo contiene (ver el comentario
 * grande de arriba), NO en unidades del mundo.
 * @param {keyof typeof ICONOS_POR_NOMBRE} nombre
 * @param {number} diametroPx
 * @param {string} color
 * @returns {import('@pmndrs/uikit').Svg}
 */
export function crearIconoUikit(nombre, diametroPx, color) {
  const ClaseIcono = ICONOS_POR_NOMBRE[nombre];
  if (!ClaseIcono) {
    throw new Error(`crearIconoUikit: ícono desconocido "${nombre}".`);
  }

  return new ClaseIcono({
    width: diametroPx,
    height: diametroPx,
    color,
    // Mismo motivo que tenía el `Image` viejo (ver su comentario grande
    // previo, ya no está pero el hallazgo sigue valiendo): sin esto, el
    // ícono queda en el mismo plano Z que el fondo del panel que lo
    // contiene y pierde el z-test contra él la mitad de las veces.
    depthTest: false,
    renderOrder: 1000,
  });
}
