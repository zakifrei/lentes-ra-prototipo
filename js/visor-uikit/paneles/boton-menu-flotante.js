// Botón de menú flotante (visor-uikit, Tarea 4 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): HUD "body-locked
// con lag" -- mismos valores físicos, mismo `negrita: true` en el botón
// principal y misma lógica de `actualizarSeguimiento` (lerp/slerp
// exponencial hacia la cámara) que js/visor/paneles/boton-menu-flotante.js
// (leído como referencia). Ver su comentario grande para el porqué de
// "body-locked con lag" en vez de head-locked.
//
// Reescrito post-migración (pedido del dueño del proyecto: "no me gusta la
// lista extendible del menú, ¿no existe un uikit para eso?") -- antes el
// desplegable era 4 roots de uikit INDEPENDIENTES (el botón principal más
// 3 botones de opción), cada uno con posición absoluta calculada a mano y
// `.visible` prendido/apagado sin ninguna señal visual de "esto se
// expande". Ahora es un `Accordion` real de @pmndrs/uikit-default: un
// único root con layout flexbox de verdad (columna), estado real de
// abierto/cerrado (`accordion.openItemValue`, una señal de
// @preact/signals-core) y una flechita (`AccordionTriggerIcon`, un
// `ChevronDown` de uikit-lucide) que ROTA SOLA 180° al abrir/cerrar --
// nada de eso hay que animarlo a mano.
//
// Lo que NO se usa de Accordion: su `onClick` embebido (en
// `AccordionItem`, dispara vía los eventos de puntero propios de uikit).
// Esta pantalla, como todas las demás del visor nuevo, sigue el mismo
// mecanismo de siempre -- raycasting manual con `enEventoSeleccion` --
// así que el toggle de `accordion.openItemValue.value` se hace a mano
// desde ese raycasting, nunca a través del clic nativo del componente.
// Lo que SÍ se aprovecha son las reacciones automáticas que ya dependen
// de esa señal (la flecha, y el `display:'none'`/`'flex'` de
// `AccordionContent`) -- esas funcionan igual sin importar quién escribe
// `openItemValue.value`.
//
// Detalle no obvio de `AccordionTriggerIcon`: busca a su `AccordionItem`
// ancestro con profundidad máxima 2 (`searchFor(this, AccordionItem, 2)`)
// -- por eso el ícono de flecha se agrega como hijo DIRECTO de
// `AccordionTrigger` (no adentro de la fila ícono+texto), igual que en el
// patrón de referencia de shadcn/ui que el paquete reproduce.
//
// Unidades: un solo `pixelSize` para todo el árbol (fijado acá, en el
// `Accordion` raíz) -- a diferencia de la versión anterior, donde cada uno
// de los 4 roots tenía el SUYO propio (misma fórmula, pero repetida 4
// veces). Ver el comentario grande de panel-uikit.js para la explicación
// completa de por qué `ancho / ANCHO_CANVAS_BASE` da el `pixelSize`
// correcto.
//
// `anchorY: 'top'` en el Accordion (en vez del 'center' por defecto de
// cualquier root de uikit): el alto del Accordion CAMBIA al abrirse (crece
// hacia abajo), así que si el ancla fuera el centro de toda la caja, el
// botón "Menú" se correría hacia arriba cada vez que el desplegable
// aparece. Con ancla arriba, `position` es el borde superior del botón
// "Menú" -- ESE queda fijo, y sólo el contenido de abajo aparece/
// desaparece, igual que en la versión vieja (ahí el motivo era otro: cada
// botón de opción era un root manual completamente independiente del
// principal, así que nunca pudo moverlo).

import * as THREE from '../../../vendor/three/three.module.js';
import { Container, Text } from '@pmndrs/uikit';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionTriggerIcon,
  AccordionContent,
  Button,
} from '@pmndrs/uikit-default';
import { COLOR_TEXTO, COLOR_FONDO_BOTON, COLOR_AMBAR, calcularRadioEsquinasUikit } from '../ui-kit/tema-uikit.js';
import { crearIconoUikit } from '../ui-kit/icono-uikit.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';

const TEXTO_BOTON = 'Menú';
const VALOR_ITEM_MENU = 'menu';

// Mismos valores físicos que la versión vieja (coordenadas LOCALES al
// grupo, no del mundo -- ver el comentario grande de arriba).
const FACTOR_ESCALA_PROFUNDIDAD = 3.6; // 1.8m / 0.5m
const Z_LOCAL = -1.6;
const POSICION_LOCAL = {
  x: 0.18 * FACTOR_ESCALA_PROFUNDIDAD,
  y: 0.13 * FACTOR_ESCALA_PROFUNDIDAD,
  z: Z_LOCAL,
};
const FACTOR_ACHICAR_BOTON = 0.8;
const ANCHO_BOTON = 0.18 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const ALTO_BOTON = 0.09 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const TAMANO_FUENTE = 84;
const MARGEN_VERTICAL = 0.02 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const MARGEN_GRUPO = MARGEN_VERTICAL * 2.5;

// Mismo valor que ANCHO_CANVAS_BASE en panel-uikit.js, y mismo
// MARGEN_HORIZONTAL/ESPACIO_ICONO_TEXTO -- no se importan de ahí porque
// panel-uikit.js no los exporta (son privados a ese módulo), no porque
// sean distintos a propósito.
const ANCHO_CANVAS_BASE = 1024;
const MARGEN_HORIZONTAL = 40;
const ESPACIO_ICONO_TEXTO = 20;

const ALTO_CANVAS_BOTON = Math.round(ANCHO_CANVAS_BASE * (ALTO_BOTON / ANCHO_BOTON));
const PIXEL_SIZE = ANCHO_BOTON / ANCHO_CANVAS_BASE;
const MARGEN_VERTICAL_PX = Math.round(MARGEN_VERTICAL / PIXEL_SIZE);
const MARGEN_GRUPO_PX = Math.round(MARGEN_GRUPO / PIXEL_SIZE);
const RADIO_ESQUINAS = calcularRadioEsquinasUikit(ANCHO_CANVAS_BASE, ALTO_CANVAS_BOTON, true);
const DIAMETRO_ICONO = Math.min(TAMANO_FUENTE * 1.7, ALTO_CANVAS_BOTON * 0.9);
const DIAMETRO_CHEVRON = TAMANO_FUENTE * 0.6;

// Mismas 3 opciones/textos que pantalla-menu.js.
const OPCIONES = [
  { opcion: 'subtitulos', texto: 'Subtítulos' },
  { opcion: 'imagenes', texto: 'Imágenes' },
  { opcion: 'mapa', texto: 'Mapa conceptual' },
];

// Misma velocidad de seguimiento que la versión vieja.
const VELOCIDAD_SEGUIMIENTO = 6;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

function crearFilaIconoTexto(icono, texto, fontWeight) {
  const fila = new Container({ flexDirection: 'row', alignItems: 'center', gap: ESPACIO_ICONO_TEXTO });
  fila.add(crearIconoUikit(icono, DIAMETRO_ICONO, COLOR_TEXTO));
  fila.add(new Text({ text: texto, color: COLOR_TEXTO, fontSize: TAMANO_FUENTE, fontWeight }));
  return fila;
}

/**
 * Crea el botón de menú flotante junto con su desplegable de 3 opciones,
 * sobre un `Accordion` real de @pmndrs/uikit-default (ver el comentario
 * grande de arriba). Tocar el botón principal alterna el desplegable;
 * tocar una opción (sólo mientras está abierto) llama a
 * `onSeleccionarOpcion` una vez y cierra el desplegable -- misma firma
 * que la versión vieja.
 * @param {THREE.WebGLRenderer} renderer
 * @param {(opcion: 'subtitulos'|'imagenes'|'mapa') => void} onSeleccionarOpcion
 * @returns {THREE.Group} quien llama debe agregarlo con `escena.add(...)`
 *   y llamar a `grupo.actualizarUikit(deltaMs)` y
 *   `grupo.actualizarSeguimiento(camara, deltaSegundos)` una vez por
 *   cuadro (ver comentario grande de arriba). Expone `grupo.cerrarMenu()`
 *   igual que la versión vieja.
 */
export function crearBotonMenuFlotante(renderer, onSeleccionarOpcion) {
  const grupo = new THREE.Group();
  grupo.name = 'boton-menu-flotante';

  const accordion = new Accordion({
    pixelSize: PIXEL_SIZE,
    width: ANCHO_CANVAS_BASE,
    anchorY: 'top',
    flexDirection: 'column',
    alignItems: 'center',
    gap: MARGEN_GRUPO_PX,
  });
  accordion.name = 'boton-menu-flotante-accordion';
  accordion.position.set(POSICION_LOCAL.x, POSICION_LOCAL.y + ALTO_BOTON / 2, Z_LOCAL);
  grupo.add(accordion);

  const item = new AccordionItem({ value: VALOR_ITEM_MENU, borderBottomWidth: 0 });
  accordion.add(item);

  const trigger = new AccordionTrigger({
    width: ANCHO_CANVAS_BASE,
    height: ALTO_CANVAS_BOTON,
    paddingX: MARGEN_HORIZONTAL,
    backgroundColor: COLOR_FONDO_BOTON,
    borderWidth: 2,
    borderColor: COLOR_AMBAR,
    borderRadius: RADIO_ESQUINAS,
    justifyContent: 'space-between',
  });
  trigger.name = 'boton-menu-flotante-principal';
  // Mismo motivo que la versión vieja (ver su comentario junto a
  // `depthWrite`): este HUD puede quedar a una profundidad similar a la
  // de contenido de mundo detrás (p. ej. pantalla-mapa.js) -- sin esto
  // el GPU no tiene con qué decidir cuál tapa a cuál.
  trigger.setProperties({ depthWrite: true });
  item.add(trigger);
  trigger.add(crearFilaIconoTexto('menu', TEXTO_BOTON, 'bold'));
  // Hijo DIRECTO de `trigger` (no de la fila de arriba) -- ver el
  // comentario grande sobre la profundidad de búsqueda de
  // AccordionTriggerIcon.
  trigger.add(new AccordionTriggerIcon({ color: COLOR_TEXTO, width: DIAMETRO_CHEVRON, height: DIAMETRO_CHEVRON }));

  const content = new AccordionContent({
    flexDirection: 'column',
    alignItems: 'center',
    gap: MARGEN_VERTICAL_PX,
    paddingTop: 0,
    paddingBottom: 0,
    // Bug encontrado en vivo: `AccordionContent` trae `overflow: 'hidden'`
    // por defecto (para animar una altura que crece/achica), pero sus
    // planos de recorte de WebGL quedan calculados contra la posición que
    // tenía mientras estaba colapsado (`display: 'none'`) y nunca se
    // vuelven a calcular al abrirse -- el resultado es que recortan TODO
    // lo de adentro (confirmado: los íconos de los botones de opción
    // desaparecían, con `material.clippingPlanes` apuntando a una caja
    // centrada en el origen, no a la posición real ya abierta). Acá no
    // hace falta recorte -- el colapsar/expandir ya lo resuelve el
    // `display:'none'/'flex'` de arriba -- así que se desactiva.
    overflow: 'visible',
  });
  content.name = 'boton-menu-flotante-opciones';
  item.add(content);

  const botonesOpcion = OPCIONES.map(({ opcion, texto }) => {
    const boton = new Button({
      variant: 'default',
      width: ANCHO_CANVAS_BASE,
      height: ALTO_CANVAS_BOTON,
      borderWidth: 2,
      borderRadius: RADIO_ESQUINAS,
      paddingX: MARGEN_HORIZONTAL,
      justifyContent: 'center',
    });
    boton.name = `boton-menu-flotante-opcion-${opcion}`;
    boton.setProperties({ depthWrite: true });
    boton.add(crearFilaIconoTexto(opcion, texto, 'normal'));
    boton.userData.opcion = opcion;
    content.add(boton);
    return boton;
  });

  function cerrarMenu() {
    accordion.openItemValue.value = undefined;
  }

  enEventoSeleccion(renderer, (origen, direccion) => {
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactoPrincipal = raycaster.intersectObject(trigger, false);
    if (impactoPrincipal.length > 0) {
      accordion.openItemValue.value =
        accordion.openItemValue.peek() === VALOR_ITEM_MENU ? undefined : VALOR_ITEM_MENU;
      return;
    }

    if (accordion.openItemValue.peek() !== VALOR_ITEM_MENU) return;

    const impactosOpcion = raycaster.intersectObjects(botonesOpcion, false);
    if (impactosOpcion.length === 0) return;

    onSeleccionarOpcion(impactosOpcion[0].object.userData.opcion);
    cerrarMenu();
  });

  grupo.cerrarMenu = cerrarMenu;

  // Un solo root de uikit ahora (el Accordion) -- un solo `.update()`
  // alcanza para todo el árbol (antes eran 4 llamadas, una por cada root
  // independiente).
  grupo.actualizarUikit = (deltaMs) => {
    accordion.update(deltaMs);
  };

  // Seguimiento "con lag": misma fórmula que la versión vieja, pero
  // sobre un THREE.Group plano (ver el comentario grande de arriba) --
  // los botones de uikit, como hijos suyos, heredan el movimiento sin
  // ningún cálculo propio.
  grupo.actualizarSeguimiento = function actualizarSeguimientoHud(camara, deltaSegundos) {
    const t = 1 - Math.exp(-VELOCIDAD_SEGUIMIENTO * deltaSegundos);
    grupo.position.lerp(camara.position, t);
    grupo.quaternion.slerp(camara.quaternion, t);
  };

  return grupo;
}
