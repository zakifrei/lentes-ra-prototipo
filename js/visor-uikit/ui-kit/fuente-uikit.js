// Carga la fuente MSDF real del visor nuevo (Inter, vendorizada en
// vendor/fonts/ -- misma licencia OFL que ya consideraba tema-visual.js
// como candidata) con un charset que SÍ incluye español.
//
// Hallazgo post-Tarea 1 (no estaba en el plan): la fuente MSDF por
// defecto que trae @pmndrs/uikit (Inter, pre-generada adentro de
// @pmndrs/msdfonts) sólo cubre Basic Latin -- cualquier vocal acentuada o
// ñ/¿/¡ sale como "Missing glyph info" (confirmado en vivo en el
// navegador, Tarea 1). La única forma de elegir el charset es generar la
// fuente MSDF en el momento con `TTFLoader`, a partir de un archivo .ttf
// real -- ver skills/pmndrs-uikit/SKILL.md del propio paquete ("the
// default charset covers only basic Latin, so pass charset for other
// glyphs"). Esto reintroduce la carga asíncrona de fuente que
// tema-visual.js evitaba a propósito en el visor viejo (ver su
// comentario grande) -- pero ahora la maneja la librería, no a mano.

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
const URL_INTER_REGULAR = 'vendor/fonts/Inter-Regular.ttf';
const URL_INTER_BOLD = 'vendor/fonts/Inter-Bold.ttf';

let promesaCarga = null;

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
        { url: URL_INTER_REGULAR, charset: CHARSET },
        { url: URL_INTER_BOLD, charset: CHARSET },
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
 * Carga Inter (regular + bold) con el charset de arriba y la registra
 * como fuente por defecto de TODO el visor (`setGlobalProperties`) --
 * ningún panel necesita pasar `fontFamily`/`fontFamilies` a mano.
 * Memoizado: llamarla más de una vez devuelve la misma promesa, nunca
 * vuelve a pedir los .ttf.
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
        // Hallazgo (confirmado en vivo): cada .ttf registra su PROPIO
        // nombre de familia ("Inter Regular"/"Inter Bold", el nombre
        // interno de cada archivo estático de Google Fonts) en vez de
        // una única familia "Inter" con pesos 400/700 -- TTFLoader no los
        // combina solo. Hay que fusionarlos a mano en una familia
        // "inter" con ambos pesos para que `fontWeight: 'bold'/'normal'`
        // (ver panel-uikit.js) funcione sobre la MISMA familia.
        const fontFamilies = {
          inter: {
            ...resultado['Inter Regular'],
            ...resultado['Inter Bold'],
          },
        };
        setGlobalProperties({
          fontFamily: 'inter',
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
