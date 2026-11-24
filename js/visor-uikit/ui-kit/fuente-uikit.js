// Carga las fuentes MSDF reales del visor nuevo (vendorizadas en
// vendor/fonts/ -- OFL igual que Inter antes) con un charset que SÍ
// incluye español.
//
// Hallazgo post-Tarea 1 (no estaba en el plan): la fuente MSDF por
// defecto que trae @pmndrs/uikit (pre-generada adentro de
// @pmndrs/msdfonts) sólo cubre Basic Latin -- cualquier vocal acentuada o
// ñ/¿/¡ sale como "Missing glyph info" (confirmado en vivo en el
// navegador, Tarea 1). La única forma de elegir el charset es generar la
// fuente MSDF en el momento con `TTFLoader`, a partir de un archivo .ttf
// real -- ver skills/pmndrs-uikit/SKILL.md del propio paquete ("the
// default charset covers only basic Latin, so pass charset for other
// glyphs"). Esto reintroduce la carga asíncrona de fuente que
// tema-visual.js evitaba a propósito en el visor viejo (ver su
// comentario grande) -- pero ahora la maneja la librería, no a mano.
//
// Post-migración (pedido del dueño del proyecto vía /design-consultation,
// ver DESIGN.md): Inter (una sans neutra, usada por medio internet) se
// reemplaza por dos fuentes elegidas para reforzar la calidez del
// visor -- Plus Jakarta Sans (cuerpo/botones/subtítulos, humanista, más
// cálida que Inter) y Fraunces (sólo títulos en negrita de las pantallas
// de lectura -- bienvenida/vuelta/aviso/resumen -- una serif editorial
// pensada para transmitir calidez humana, ver panel-uikit.js/
// pantalla-*.js para dónde se usa cada una).

import { TTFLoader, setGlobalProperties } from '@pmndrs/uikit';

// Basic Latin (igual charset por defecto) + lo que hace falta para
// español: vocales acentuadas, ñ, ¿/¡, y las comillas/rayas tipográficas
// que usan pantalla-resumen.js/pantalla-bienvenida.js.
const CHARSET =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
  'abcdefghijklmnopqrstuvwxyz{|}~' +
  'áéíóúÁÉÍÓÚñÑüÜ¿¡' +
  '–—“”‘’…';

// Rutas relativas a la página (igual convención que RUTAS_IMAGENES en
// js/visor/main.js), no al módulo -- TTFLoader las resuelve como XHR
// contra la URL del documento, no como import de ES modules.
const URL_JAKARTA_REGULAR = 'vendor/fonts/PlusJakartaSans-Regular.ttf';
const URL_JAKARTA_BOLD = 'vendor/fonts/PlusJakartaSans-Bold.ttf';
const URL_FRAUNCES_BOLD = 'vendor/fonts/Fraunces-Bold.ttf';

let promesaCarga = null;

// Las mismas familias que se registran como globales en
// `cargarFuenteUikit`, guardadas para `propiedadesFraunces()` (ver abajo).
let familiasFuente = null;

// Reintentos -- hallazgo al cablear la Tarea 2: `TTFLoader.loadAsync`
// hace un `import()` dinámico de `@zappar/msdf-generator` (la librería
// real que genera el atlas MSDF) contra esm.sh, y ese import puntual
// falla de forma intermitente (confirmado en vivo, varias veces en esta
// sesión: a veces anda a la primera, a veces tira "Failed to fetch
// dynamically imported module" con un 500 de esm.sh de por medio) --
// parece ser flakiness real del CDN para ESE paquete puntual, no un bug
// nuestro. Sin reintento, una sola falla dejaba el visor entero sin
// ningún panel para siempre (la promesa quedaba rechazada sin `catch`).
const REINTENTOS = 3;
const ESPERA_ENTRE_REINTENTOS_MS = 800;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cargarConReintentos() {
  let ultimoError;
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    try {
      return await new TTFLoader().loadAsync([
        { url: URL_JAKARTA_REGULAR, charset: CHARSET },
        { url: URL_JAKARTA_BOLD, charset: CHARSET },
        { url: URL_FRAUNCES_BOLD, charset: CHARSET },
      ]);
    } catch (error) {
      ultimoError = error;
      console.warn(
        `cargarFuenteUikit: intento ${intento}/${REINTENTOS} falló (${error?.message ?? error}).`
      );
      if (intento < REINTENTOS) await esperar(ESPERA_ENTRE_REINTENTOS_MS);
    }
  }
  throw ultimoError;
}

/**
 * Carga Plus Jakarta Sans (regular + bold) y Fraunces (sólo bold) con el
 * charset de arriba, y las registra como familias globales del visor
 * (`setGlobalProperties`): `jakarta` (la que usa casi todo, ver
 * fontFamily por defecto más abajo) y `fraunces` (sólo para los títulos
 * en negrita que la pasan explícitamente -- ver pantalla-bienvenida.js/
 * pantalla-vuelta.js/pantalla-aviso.js/pantalla-resumen.js). Memoizado:
 * llamarla más de una vez devuelve la misma promesa, nunca vuelve a
 * pedir los .ttf.
 *
 * Degrada con gracia: si los 3 intentos fallan (ver REINTENTOS), NUNCA
 * rechaza -- loguea el error y resuelve igual, dejando la fuente MSDF
 * por defecto de uikit (sin tildes/ñ/¿¡, el problema original de la
 * Tarea 1) antes que dejar el visor entero sin un solo panel para
 * siempre por un hiccup de red.
 * @returns {Promise<void>}
 */
export function cargarFuenteUikit() {
  if (!promesaCarga) {
    promesaCarga = cargarConReintentos()
      .then((resultado) => {
        // Mismo hallazgo que con Inter (ver commits previos): cada .ttf
        // registra su PROPIO nombre de familia ("Plus Jakarta Sans
        // Regular"/"Plus Jakarta Sans Bold") en vez de una única familia
        // con pesos 400/700 -- TTFLoader no los combina solo. Hay que
        // fusionarlos a mano para que `fontWeight: 'bold'/'normal'` (ver
        // panel-uikit.js) funcione sobre la MISMA familia.
        const fontFamilies = {
          jakarta: {
            ...resultado['Plus Jakarta Sans Regular'],
            ...resultado['Plus Jakarta Sans Bold'],
          },
          fraunces: {
            ...resultado['Fraunces Bold'],
          },
        };
        familiasFuente = fontFamilies;
        setGlobalProperties({
          fontFamily: 'jakarta',
          fontFamilies,
        });
      })
      .catch((error) => {
        console.error(
          'cargarFuenteUikit: no se pudo cargar la fuente en español después de ' +
            `${REINTENTOS} intentos -- se sigue con la fuente MSDF por defecto ` +
            '(sin tildes/ñ/¿¡).',
          error
        );
      });
  }
  return promesaCarga;
}

/**
 * Propiedades para un `Text` en Fraunces: `fontFamily` más las
 * `fontFamilies` registradas, pasadas directo al texto. Sin estas
 * familias explícitas, uikit evalúa la fuente una vez ANTES de heredar
 * las globales de `setGlobalProperties` (sólo conoce su "inter" por
 * defecto) y loguea `unknown font family "fraunces"` en consola -- se
 * corrige solo un instante después, pero ensucia la consola en cada
 * panel con título. Usar después de que `cargarFuenteUikit()` resolvió.
 * @returns {{ fontFamily: string, fontFamilies?: object }}
 */
export function propiedadesFraunces() {
  return familiasFuente
    ? { fontFamily: 'fraunces', fontFamilies: familiasFuente }
    : { fontFamily: 'fraunces' };
}
