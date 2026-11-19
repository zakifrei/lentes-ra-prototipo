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
// Por eso acá `sizeX`/`sizeY` del panel van directo en METROS (`ancho`/
// `alto`, los mismos números físicos ya calibrados) y `pixelSize` se fija
// aparte para que el CONTENIDO seccione calibrado en "píxeles" de canvas
// (tamanoFuente=48 sobre ANCHO_CANVAS_BASE=1024, igual que
// panel-texto.js::calcularResolucionCanvas) siga dando el mismo tamaño
// relativo que antes: pixelSize = ancho(m) / ANCHO_CANVAS_BASE.

import { Container, Text } from '@pmndrs/uikit';
import {
  COLOR_TEXTO,
  COLOR_AMBAR,
  COLOR_FONDO_CARTEL,
  COLOR_FONDO_BOTON,
  calcularRadioEsquinasUikit,
} from './tema-uikit.js';
import { crearIconoUikit } from './icono-uikit.js';

// Mismo valor que ANCHO_CANVAS_BASE en panel-texto.js: resolución de
// referencia a la que están calibrados tamanoFuente/diámetros de ícono
// existentes. Ver comentario grande de arriba.
const ANCHO_CANVAS_BASE = 1024;
const MARGEN_HORIZONTAL = 40;

const ANCHO_PANEL_POR_DEFECTO = 0.8;
const ALTO_PANEL_POR_DEFECTO = 0.4;
const POSICION_POR_DEFECTO = { x: 0, y: 1.1, z: -1.8 };
const TAMANO_FUENTE_POR_DEFECTO = 48;

// Mismo valor que ESPACIO_ICONO_TEXTO en panel-texto.js.
const ESPACIO_ICONO_TEXTO = 20;

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
  const {
    posicion = POSICION_POR_DEFECTO,
    ancho = ANCHO_PANEL_POR_DEFECTO,
    alto = ALTO_PANEL_POR_DEFECTO,
    tamanoFuente = TAMANO_FUENTE_POR_DEFECTO,
    nombre = 'panel-uikit',
    icono,
    interactivo = false,
    negrita = false,
  } = opciones;

  const anchoCanvas = ANCHO_CANVAS_BASE;
  const altoCanvas = Math.round(ANCHO_CANVAS_BASE * (alto / ancho));
  const pixelSize = ancho / anchoCanvas;

  const panel = new Container({
    pixelSize,
    sizeX: ancho,
    sizeY: alto,
    paddingX: MARGEN_HORIZONTAL,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tamanoFuente * 0.4,
    backgroundColor: interactivo ? COLOR_FONDO_BOTON : COLOR_FONDO_CARTEL,
    borderWidth: 2,
    borderColor: COLOR_AMBAR,
    borderRadius: calcularRadioEsquinasUikit(anchoCanvas, altoCanvas, interactivo),
  });
  panel.name = nombre;
  panel.position.set(posicion.x, posicion.y, posicion.z);

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
    // crearIconoUikit espera unidades del mundo, no "píxeles" de
    // contenido -- ver el comentario grande en icono-uikit.js.
    fila.add(crearIconoUikit(icono, diametroIcono * pixelSize, COLOR_TEXTO));
    fila.add(new Text({ text: lineas[0], color: COLOR_TEXTO, fontSize: tamanoFuente, fontWeight }));
    panel.add(fila);
    return panel;
  }

  lineas.forEach((linea) => {
    panel.add(new Text({ text: linea, color: COLOR_TEXTO, fontSize: tamanoFuente, fontWeight }));
  });

  return panel;
}
