// Panel genérico con componentes reales de uikit (layout flexbox vía
// Yoga, texto MSDF): reemplazo de js/visor/paneles/panel-texto.js para el
// visor nuevo (Tarea 1 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md). Misma forma de
// opciones que `crearPanelTexto` (posicion/ancho/alto/tamanoFuente/
// interactivo/negrita/icono), para que cada pantalla-*.js nueva sea un
// wrapper casi idéntico al viejo.
//
// Unidades -- decisión clave de esta tarea, no estaba en el plan, y un
// primer intento salió mal (ver abajo): uikit mide el CONTENIDO (padding,
// gap, fontSize, borderRadius, el tamaño de los hijos) en "píxeles"
// propios, convertidos a metros con `pixelSize` (100px = 1 unidad con el
// default 0.01) -- PERO en un `Container` usado como raíz (sin ancestro
// uikit, éste es el caso: se agrega directo a la escena), `sizeX`/`sizeY`
// se miden directo en unidades del MUNDO (metros), no en píxeles --
// confirmado en vivo en el navegador (la señal `.size`, que sí está en
// píxeles, mostraba 1310720x491520 con un primer intento que pasaba
// sizeX=1024: software un panel de 1024 METROS de ancho, invisible por
// estar a una escala absurda -- no era un bug de visibilidad, el panel
// jamás tuvo el tamaño físico pedido).
//
// Por eso acá el panel fija su tamaño con `width`/`height` -- las mismas
// propiedades de contenido "en píxeles" que fontSize/padding/etc., NO
// `sizeX`/`sizeY` -- y `pixelSize` aparte, para que `width`×`pixelSize` dé
// el ancho físico pedido (`ancho`/`alto`, los mismos números ya
// calibrados): pixelSize = ancho(m) / ANCHO_CANVAS_BASE.
//
// Segundo hallazgo de unidades (post-migración, al sumar `Button` de
// @pmndrs/uikit-default más abajo): `sizeX`/`sizeY` SÍ funcionaban como
// unidades del mundo en un `Container` raíz liso (ver más arriba), pero
// `Button` fija sus propios `height`/`width` por defecto (40px, en
// píxeles de contenido, parte de su estilo de componente) -- eso bloquea
// por completo a `sizeX`/`sizeY` (quedan ignorados sin error) salvo que
// se les gane el pulso con `height`/`width` explícitos, que sí tienen
// precedencia sobre el estilo del componente. En vez de tener una
// conversión para `Container` y otra para `Button`, todo el módulo usa
// `width`/`height` -- confirmado en vivo que da exactamente el mismo
// tamaño físico que `sizeX`/`sizeY` para un `Container` raíz, así que no
// cambia nada de lo que ya estaba verificado.

import { Container, Text } from '@pmndrs/uikit';
import { Button, Card } from '@pmndrs/uikit-default';
import {
  COLOR_TEXTO,
  calcularRadioEsquinasUikit,
  aplicarTemaDiseno,
  crearFondoDegradadoCartel,
  GROSOR_BORDE,
  TIPO_DP,
  fuenteDesdeDp,
} from './tema-uikit.js';
import { crearIconoUikit } from './icono-uikit.js';

// Antes de crear el primer `Button`: registra la paleta ámbar del
// proyecto en @pmndrs/uikit-default (ver el comentario grande en
// tema-uikit.js sobre por qué este kit y no @pmndrs/uikit-horizon).
aplicarTemaDiseno();

// Mismo valor que ANCHO_CANVAS_BASE en panel-texto.js: resolución de
// referencia a la que están calibrados tamanoFuente/diámetros de ícono
// existentes. Ver comentario grande de arriba.
const ANCHO_CANVAS_BASE = 1024;
const MARGEN_HORIZONTAL = 40;

const ANCHO_PANEL_POR_DEFECTO = 0.8;
const ALTO_PANEL_POR_DEFECTO = 0.4;
const POSICION_POR_DEFECTO = { x: 0, y: 1.1, z: -1.8 };

// Mismo valor que ESPACIO_ICONO_TEXTO en panel-texto.js.
const ESPACIO_ICONO_TEXTO = 20;

/**
 * Crea sólo el "cascarón" de un panel -- fondo/borde/layout, sin texto --
 * compartido por `crearPanelUikit` (una o más líneas, mismo tamaño de
 * fuente) y las pantallas que necesitan bloques de texto con tamaños/
 * pesos/colores DISTINTOS entre sí (ver pantalla-bienvenida.js/
 * pantalla-vuelta.js/pantalla-pausa.js/pantalla-resumen.js -- en el
 * visor viejo esas pantallas dibujaban su propio canvas a mano para
 * esquivar esta misma limitación de `crearPanelTexto`; acá alcanza con
 * agregar los `Text` propios al `Container` que devuelve esta función).
 * @param {{
 *   posicion?: {x:number,y:number,z:number},
 *   ancho?: number,
 *   alto?: number,
 *   nombre?: string,
 *   interactivo?: boolean,
 *   flexDirection?: string,
 *   justifyContent?: string,
 *   gap?: number,
 * }} [opciones]
 * @returns {{ contenedor: Container, pixelSize: number, anchoCanvas: number, altoCanvas: number }}
 */
export function crearContenedorUikit(opciones = {}) {
  const {
    posicion = POSICION_POR_DEFECTO,
    ancho = ANCHO_PANEL_POR_DEFECTO,
    alto = ALTO_PANEL_POR_DEFECTO,
    nombre = 'panel-uikit',
    interactivo = false,
    flexDirection = 'column',
    justifyContent = 'center',
    gap = 0,
  } = opciones;

  const anchoCanvas = ANCHO_CANVAS_BASE;
  const altoCanvas = Math.round(ANCHO_CANVAS_BASE * (alto / ancho));
  const pixelSize = ancho / anchoCanvas;

  const propiedadesComunes = {
    pixelSize,
    width: anchoCanvas,
    height: altoCanvas,
    paddingX: MARGEN_HORIZONTAL,
    flexDirection,
    justifyContent,
    alignItems: 'center',
    // `textAlign` es una propiedad heredable de uikit (se propaga sola a
    // cualquier `Text` hijo, sin importar cuántos Container haya en el
    // medio) -- el default de la librería es 'left', que quedaba raro acá
    // porque el PANEL ya centra el bloque de texto como conjunto
    // (`alignItems`/`justifyContent` arriba): con texto de varias líneas,
    // el bloque se veía centrado pero cada línea arrancaba pegada a la
    // izquierda. Pedido del dueño del proyecto (viendo pantalla-
    // reconocimiento) -- 'center' en vez de 'justify': con líneas cortas
    // (2-3 renglones) un justify fuerza espaciado disparejo entre
    // palabras para estirar cada línea al ancho completo, que se ve peor,
    // no mejor, que centrar.
    textAlign: 'center',
    gap,
    borderRadius: calcularRadioEsquinasUikit(anchoCanvas, altoCanvas, interactivo),
  };

  // Los dos, componentes reales de @pmndrs/uikit-default recoloreados a
  // ámbar por `aplicarTemaDiseno()` (ver el comentario grande de
  // arriba): `Button` (variante "default") para lo tocable, `Card` --
  // ya trae fondo/borde/color de texto propios vía `colors.card`/
  // `colors.cardForeground`/`colors.border`, los mismos tonos que
  // `TEMA_DISENO_AMBAR` -- para el cartel de sólo lectura, en vez del
  // `Container` pintado a mano de antes.
  const contenedor = interactivo
    ? new Button({ ...propiedadesComunes, variant: 'default', borderWidth: GROSOR_BORDE })
    : new Card({ ...propiedadesComunes, borderWidth: GROSOR_BORDE });
  contenedor.name = nombre;
  contenedor.position.set(posicion.x, posicion.y, posicion.z);

  // Degradé sutil (riesgo de /design-consultation, ver DESIGN.md) --
  // sólo en el cartel de sólo lectura, encima de su fondo sólido.
  if (!interactivo) {
    contenedor.add(crearFondoDegradadoCartel());
  }

  return { contenedor, pixelSize, anchoCanvas, altoCanvas };
}

/**
 * Crea un panel genérico con una o más líneas de texto, en componentes
 * reales de uikit (layout flexbox, no Canvas2D a mano). Mismas opciones
 * que `crearPanelTexto` (ver panel-texto.js) -- `icono` sólo tiene efecto
 * con una única línea, igual que el original.
 *
 * A diferencia del original, el objeto que devuelve es un "root" de uikit
 * (ningún ancestro uikit): quien lo agregue a la escena debe llamar a su
 * `.update(deltaMs)` en cada cuadro del render loop (ver skills/
 * pmndrs-uikit/SKILL.md del paquete) -- si no, nunca hace layout ni se ve.
 * @param {string[]} lineas
 * @param {{
 *   posicion?: {x:number,y:number,z:number},
 *   ancho?: number,
 *   alto?: number,
 *   tamanoFuente?: number,
 *   nombre?: string,
 *   icono?: string,
 *   interactivo?: boolean,
 *   negrita?: boolean,
 * }} [opciones]
 * @returns {Container}
 */
export function crearPanelUikit(lineas, opciones = {}) {
  // Sin `tamanoFuente` explícito: el estilo "cuerpo 1" de la escala en
  // dp de Meta (ver TIPO_DP en tema-uikit.js), convertido al ancho de
  // ESTE panel -- así el alto físico de la letra no depende del ancho.
  const {
    tamanoFuente = fuenteDesdeDp(TIPO_DP.cuerpo1, opciones.ancho ?? ANCHO_PANEL_POR_DEFECTO),
    icono,
    negrita = false,
  } = opciones;

  const { contenedor: panel, altoCanvas } = crearContenedorUikit({
    ...opciones,
    gap: tamanoFuente * 0.4,
  });

  const fontWeight = negrita ? 'bold' : 'normal';

  // Ícono opcional: sólo para etiquetas de una sola línea (misma regla
  // explícita que panel-texto.js -- ver su comentario grande). Fila
  // ícono+texto centrada, en vez de calcularla a mano como el canvas
  // viejo: acá la resuelve Yoga solo.
  if (icono && lineas.length === 1) {
    const diametroIcono = Math.min(tamanoFuente * 1.7, altoCanvas * 0.9);
    const fila = new Container({
      flexDirection: 'row',
      alignItems: 'center',
      gap: ESPACIO_ICONO_TEXTO,
    });
    // crearIconoUikit espera "píxeles" de contenido, igual que el resto
    // de este módulo -- ver el comentario grande en icono-uikit.js.
    fila.add(crearIconoUikit(icono, diametroIcono, COLOR_TEXTO));
    fila.add(new Text({ text: lineas[0], color: COLOR_TEXTO, fontSize: tamanoFuente, fontWeight }));
    panel.add(fila);
    return panel;
  }

  lineas.forEach((linea) => {
    panel.add(new Text({ text: linea, color: COLOR_TEXTO, fontSize: tamanoFuente, fontWeight }));
  });

  return panel;
}
