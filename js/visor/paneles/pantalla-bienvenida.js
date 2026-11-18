// Pantalla de bienvenida: se muestra después del reconocimiento, con el
// saludo personalizado, el anuncio de la clase y un tip de recomendación.
//
// Por qué este archivo dibuja su propio canvas (no usa `crearPanelTexto` de
// panel-texto.js, a diferencia de la versión anterior de esta pantalla):
// el dueño del proyecto pidió 3 bloques de texto con tamaños DISTINTOS
// (saludo grande, anuncio mediano, tip chico) y `panel-texto.js` calcula un
// único tamaño de fuente compartido para todas las líneas que recibe
// (según la línea más larga) -- no soporta tamaños por línea, y tocar esa
// función para soportarlo afectaría a los ~10 archivos que la usan hoy,
// fuera de alcance para este cambio puntual. El patrón ya establecido en
// este proyecto para pantallas que necesitan algo que panel-texto.js no
// puede hacer es dibujar un canvas propio reusando `dibujarFondoPanel`/
// `COLOR_TEXTO`/`COLOR_AMBAR`/`FUENTE_PRINCIPAL` de `tema-visual.js` para
// que siga combinando visualmente con el resto del visor -- ver
// pantalla-resumen.js, la referencia directa para este archivo (mismo
// patrón, sin botones, un solo panel).
//
// Textos reescritos a pedido del dueño del proyecto (los literales
// originales del guion, "Hola, Sofía · Historia · La clase está por
// empezar" / "Aprendés mejor con imágenes", le parecieron demasiado chatos
// una vez viéndolos puestos -- esto ya no son los textos literales del
// guion, es una decisión de redacción posterior, con libertad creativa del
// builder).

import * as THREE from '../../../vendor/three/three.module.js';
import { dibujarFondoPanel, COLOR_TEXTO, COLOR_AMBAR, FUENTE_PRINCIPAL } from '../tema-visual.js';

const ANCHO_CANVAS = 1024;
const ALTO_CANVAS = 512;

// Margen horizontal (en px de canvas) que ningún bloque de texto debe
// invadir -- mismo criterio que panel-texto.js/pantalla-resumen.js.
const MARGEN_HORIZONTAL = 40;
const ANCHO_DISPONIBLE = ANCHO_CANVAS - MARGEN_HORIZONTAL * 2;

// Tamaño físico del panel (metros, RA): un poco más alto que el default de
// panel-texto.js (0.8x0.4) para que los 3 bloques entren con aire entre
// ellos en vez de quedar apretados -- más chico que pantalla-resumen.js
// (0.9x0.5, que además tiene un botón debajo) porque acá es un solo panel
// sin nada más en la pantalla.
const ANCHO_PANEL = 0.85;
const ALTO_PANEL = 0.5;

// Posición: mismo criterio de siempre (por debajo de la altura típica de
// ojos, sin tapar el centro del campo visual) y misma profundidad Z que el
// resto de las pantallas del proyecto después de la Tarea 27 (que las
// empujó todas de z=-1.2 a z=-1.8/-1.9) -- NO el valor viejo.
const POSICION = { x: 0, y: 1.1, z: -1.8 };

const TEXTO_SALUDO = '¡Hola, Sofía!';
const TEXTO_CLASE = 'Ahora arranca tu clase de Historia';
const TEXTO_TIP = 'Tip: Te recomiendo usar imágenes';

// 3 tamaños de fuente distintos, de mayor a menor -- el saludo es el
// elemento principal de la pantalla, el anuncio de la clase es secundario,
// y el tip es una recomendación chica, casi al pie. Agrandados "un poco"
// (pulido visual, a pedido del dueño del proyecto) respecto a los valores
// originales de la Tarea 19 (72/42/30): el ajuste automático por bloque
// (`calcularTamanoFuenteAjustado`, más abajo) sigue protegiendo contra
// desbordes horizontales igual que antes.
const TAMANO_FUENTE_SALUDO = 80;
const TAMANO_FUENTE_CLASE = 46;
const TAMANO_FUENTE_TIP = 34;

// Posición vertical de cada bloque, como fracción de ALTO_CANVAS -- con
// aire entre ellos para que no se vean apretados.
const Y_FRACCION_SALUDO = 0.22;
const Y_FRACCION_CLASE = 0.5;
const Y_FRACCION_TIP = 0.78;

// Si un bloque no entra en ANCHO_DISPONIBLE con su tamaño de fuente pedido,
// se reduce SÓLO ese bloque hasta que entre -- a diferencia de
// panel-texto.js (que ajusta todas las líneas igual porque comparten un
// tamaño), acá cada bloque tiene su propio tamaño independiente, así que el
// ajuste también tiene que ser independiente por bloque. Mismo criterio que
// `calcularTamanoFuenteAjustado` de panel-texto.js: medir con `measureText`
// y escalar hacia abajo en proporción a lo que sobra.
function calcularTamanoFuenteAjustado(contexto, texto, tamanoFuente, fuenteCss) {
  contexto.font = fuenteCss(tamanoFuente);
  const ancho = contexto.measureText(texto).width;
  if (ancho <= ANCHO_DISPONIBLE) return tamanoFuente;
  return tamanoFuente * (ANCHO_DISPONIBLE / ancho);
}

function dibujarBienvenida(contexto) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  dibujarFondoPanel(contexto, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const fuenteBoldCss = (tamano) => `bold ${tamano}px ${FUENTE_PRINCIPAL}`;
  const fuenteNormalCss = (tamano) => `${tamano}px ${FUENTE_PRINCIPAL}`;

  // Saludo: negrita, el elemento principal de la pantalla.
  const tamanoSaludo = calcularTamanoFuenteAjustado(
    contexto,
    TEXTO_SALUDO,
    TAMANO_FUENTE_SALUDO,
    fuenteBoldCss
  );
  contexto.font = fuenteBoldCss(tamanoSaludo);
  contexto.fillStyle = COLOR_TEXTO;
  contexto.fillText(TEXTO_SALUDO, ANCHO_CANVAS / 2, ALTO_CANVAS * Y_FRACCION_SALUDO);

  // Anuncio de la clase: tamaño mediano, texto normal.
  const tamanoClase = calcularTamanoFuenteAjustado(
    contexto,
    TEXTO_CLASE,
    TAMANO_FUENTE_CLASE,
    fuenteNormalCss
  );
  contexto.font = fuenteNormalCss(tamanoClase);
  contexto.fillStyle = COLOR_TEXTO;
  contexto.fillText(TEXTO_CLASE, ANCHO_CANVAS / 2, ALTO_CANVAS * Y_FRACCION_CLASE);

  // Tip: chico, en COLOR_AMBAR (en vez de COLOR_TEXTO) para que se note
  // como una recomendación/highlight y no como texto normal -- mismo color
  // de acento que ya usa el resto del visor (tema-visual.js).
  const tamanoTip = calcularTamanoFuenteAjustado(
    contexto,
    TEXTO_TIP,
    TAMANO_FUENTE_TIP,
    fuenteNormalCss
  );
  contexto.font = fuenteNormalCss(tamanoTip);
  contexto.fillStyle = COLOR_AMBAR;
  contexto.fillText(TEXTO_TIP, ANCHO_CANVAS / 2, ALTO_CANVAS * Y_FRACCION_TIP);
}

/**
 * Crea la pantalla de bienvenida: 3 bloques de texto (saludo grande en
 * negrita, anuncio de clase mediano, tip chico en ámbar), sin botones.
 * @returns {THREE.Mesh}
 */
export function crearPantallaBienvenida() {
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;
  const contexto = canvas.getContext('2d');

  dibujarBienvenida(contexto);

  const textura = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    // Igual que el resto de los paneles: siempre debe leerse, sin importar
    // la luz de la escena ni el ángulo desde el que se lo mire.
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const geometria = new THREE.PlaneGeometry(ANCHO_PANEL, ALTO_PANEL);

  const panel = new THREE.Mesh(geometria, material);
  panel.name = 'pantalla-bienvenida';
  panel.position.set(POSICION.x, POSICION.y, POSICION.z);

  return panel;
}
