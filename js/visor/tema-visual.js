// Paleta y tipografía compartida de todo el visor (Tarea 19): "cálido,
// atento, expuesto" (moodboard del dueño del proyecto) -- luz ámbar/
// naranja sobre fondos oscuros semitransparentes, brillos suaves,
// tipografía limpia tipo HUD. Centralizado acá para que las pantallas que
// dibujan su propio canvas 2D (pantalla-subtitulos.js, pantalla-pausa.js,
// pantalla-vuelta.js, pantalla-resumen.js) usen exactamente los mismos
// valores -- panel-texto.js (la base de las demás pantallas) también lo
// usa, así que todo el visor queda visualmente consistente sin repetir
// estos valores en cada archivo.
//
// Nota sobre tipografía: se usa una pila de fuentes ya presentes en
// cualquier sistema (sin cargar una fuente web externa) a propósito --
// dibujar texto en un <canvas> con una fuente custom exige esperar a que
// esa fuente termine de cargar (`document.fonts.load`/`FontFace`) ANTES
// del primer `fillText`, o el texto se dibuja con la fuente de
// reemplazo y nunca se vuelve a redibujar solo. Meter esa complejidad
// asincrónica en 4 archivos distintos, para un prototipo con poco tiempo
// antes de la prueba real, no vale el riesgo -- una pila de sans-serif
// del sistema ya cumple "tipografía limpia" sin ese riesgo.
//
// Tarea 27 (pulido "ámbar-neón", cápsulas + bisel + brillo intensificado):
// todo lo demás de este módulo queda igual que la Tarea 19 -- paleta,
// tipografía y la firma de `dibujarFondoPanel(contexto, ancho, alto)`, que
// ningún archivo que la llama necesita tocar (ver comentario grande sobre
// esa función, más abajo).
export const COLOR_FONDO_PANEL = 'rgba(28, 16, 8, 0.74)';
export const COLOR_TEXTO = '#fff3e0';
export const COLOR_AMBAR = '#ffb454';
export const COLOR_AMBAR_FUERTE = '#ff8c32';

// Brillo intensificado (Tarea 27): de 0.6 a 0.85 de opacidad y de 16 a
// 26px de desenfoque respecto a la Tarea 19 -- un salto que se nota como
// "neón" de verdad en los paneles grandes. Calibrado a ojo (arnés de QA
// manual, ver reporte de la tarea) sobre el caso más chico de todo el
// visor -- los botones "+"/"-" de pantalla-subtitulos.js (0.2x0.2m
// físicos) -- para no pasarse: a más de esto, el glow empieza a comerse
// el glyph "+"/"-" en vez de sólo resaltar el borde.
export const COLOR_BRILLO = 'rgba(255, 150, 60, 0.85)';
export const DESENFOQUE_BRILLO = 26;
export const FUENTE_PRINCIPAL = "'Segoe UI', Arial, sans-serif";

// Bisel tipo "vidrio" (Tarea 27): variantes más clara/cálida y más oscura
// del mismo `COLOR_FONDO_PANEL` de arriba, usadas como extremos de un
// `CanvasGradient` lineal (ver `dibujarFondoPanel`) en vez de un color de
// fondo plano -- simula una fuente de luz desde arriba-izquierda, sin
// cambiar el tono general ni la opacidad promedio del panel (la
// legibilidad del texto, que se dibuja encima en cada pantalla, no se ve
// afectada).
const COLOR_FONDO_PANEL_CLARO = 'rgba(46, 27, 13, 0.78)';
const COLOR_FONDO_PANEL_OSCURO = 'rgba(14, 7, 3, 0.74)';

// Highlight del borde superior ("vidrio recibiendo luz"): blanco cálido
// casi opaco arriba, que se usa como extremo de un degradé vertical (ver
// más abajo) para que sólo el borde de ARRIBA del panel (arcos de las
// esquinas superiores incluidos) se vea brillante, sin tocar los otros 3
// lados.
const COLOR_BRILLO_SUPERIOR = 'rgba(255, 238, 210, 0.95)';

// Radio de esquina proporcional al tamaño del panel (Tarea 27): reemplaza
// el valor fijo de la Tarea 19 (`RADIO_ESQUINAS = 24`). Se calcula como
// una fracción del LADO MENOR del panel (nunca del ancho solo), así un
// panel chico y casi cuadrado (botones "+"/"-", menú flotante) se acerca a
// cápsula/círculo, y un panel ancho (mensajes, el panel de subtítulos,
// mucho más ancho que alto) se queda en un redondeado generoso sin
// hincharse a óvalo -- la fracción es la misma en los dos casos, lo que
// cambia es el lado menor sobre el que se aplica. Clampado más abajo con
// `Math.min(ancho/2, alto/2)`: mismo criterio de seguridad que ya existía
// en la Tarea 19, para que nunca pueda "romper" un panel (quedar con un
// radio mayor que la mitad de un lado).
const FRACCION_RADIO_ESQUINAS = 0.4;

function calcularRadioEsquinas(ancho, alto) {
  const radioDeseado = Math.min(ancho, alto) * FRACCION_RADIO_ESQUINAS;
  return Math.min(radioDeseado, ancho / 2, alto / 2);
}

/**
 * Dibuja el fondo cálido estándar de un panel (rectángulo redondeado tipo
 * "cápsula" con bisel de vidrio, brillo ámbar neón alrededor, borde ámbar
 * nítido y un highlight superior) sobre un contexto de canvas 2D ya
 * limpiado (`clearRect`) por quien llama. No dibuja texto -- eso sigue a
 * cargo de cada pantalla, usando `COLOR_TEXTO`/`FUENTE_PRINCIPAL` de este
 * mismo módulo para que el texto combine con el fondo.
 * @param {CanvasRenderingContext2D} contexto
 * @param {number} ancho
 * @param {number} alto
 */
export function dibujarFondoPanel(contexto, ancho, alto) {
  const radio = calcularRadioEsquinas(ancho, alto);

  function trazarRectanguloRedondeado(x, y, w, h, r) {
    contexto.beginPath();
    if (typeof contexto.roundRect === 'function') {
      contexto.roundRect(x, y, w, h, r);
    } else {
      // Fallback simple para navegadores sin roundRect nativo: rectángulo
      // sin redondear (el Quest/Chrome moderno sí lo soporta, así que esto
      // casi nunca se ejecuta -- es sólo una red de seguridad).
      contexto.rect(x, y, w, h);
    }
  }

  // Fondo con bisel: el gradiente se usa como `fillStyle` DENTRO del mismo
  // path redondeado que se traza justo antes del `fill()` -- nunca con un
  // `fillRect` aparte, que ignoraría el recorte de esquinas redondeadas y
  // dejaría el gradiente "pisando" el fondo transparente por las esquinas.
  contexto.save();
  contexto.shadowColor = COLOR_BRILLO;
  contexto.shadowBlur = DESENFOQUE_BRILLO;
  const gradienteFondo = contexto.createLinearGradient(0, 0, ancho, alto);
  gradienteFondo.addColorStop(0, COLOR_FONDO_PANEL_CLARO);
  gradienteFondo.addColorStop(1, COLOR_FONDO_PANEL_OSCURO);
  contexto.fillStyle = gradienteFondo;
  trazarRectanguloRedondeado(0, 0, ancho, alto, radio);
  contexto.fill();
  contexto.restore();

  // Borde ámbar nítido, sin el shadowBlur del fill (si no, el borde en sí
  // también saldría difuso en vez de sólo el resplandor alrededor).
  const radioInterior = Math.max(radio - 1, 0);
  contexto.strokeStyle = COLOR_AMBAR;
  contexto.lineWidth = 2;
  trazarRectanguloRedondeado(1, 1, ancho - 2, alto - 2, radioInterior);
  contexto.stroke();

  // Highlight superior ("vidrio con luz encima"): se traza el MISMO path
  // de nuevo, pero con un degradé vertical como `strokeStyle` en vez de un
  // color sólido -- opaco en y=0 y transparente a partir de la mitad del
  // panel. Como el degradé se desvanece con la altura (no con la posición
  // a lo largo del borde), el resultado es que el borde de ARRIBA (arcos
  // de las esquinas superiores incluidos, porque son parte del mismo path)
  // se ve brillante, con un brillo decreciente en el primer tramo de los
  // lados izquierdo/derecho (hasta donde el degradé todavía no llegó a
  // alpha 0) -- un efecto de "destello" de vidrio normal, sin necesidad de
  // dibujar arcos a mano ni de un `clip()` aparte. El borde inferior sí
  // queda invisible en todos los tamaños de canvas reales del proyecto
  // (el degradé llega a alpha 0 bastante antes de esa altura).
  const gradienteBrilloSuperior = contexto.createLinearGradient(0, 0, 0, alto * 0.55);
  gradienteBrilloSuperior.addColorStop(0, COLOR_BRILLO_SUPERIOR);
  gradienteBrilloSuperior.addColorStop(1, 'rgba(255, 238, 210, 0)');
  contexto.strokeStyle = gradienteBrilloSuperior;
  contexto.lineWidth = 3;
  trazarRectanguloRedondeado(1, 1, ancho - 2, alto - 2, radioInterior);
  contexto.stroke();
}
