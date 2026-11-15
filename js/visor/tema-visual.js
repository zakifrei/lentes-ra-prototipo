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
export const COLOR_FONDO_PANEL = 'rgba(28, 16, 8, 0.74)';
export const COLOR_TEXTO = '#fff3e0';
export const COLOR_AMBAR = '#ffb454';
export const COLOR_AMBAR_FUERTE = '#ff8c32';
export const COLOR_BRILLO = 'rgba(255, 150, 60, 0.6)';
export const DESENFOQUE_BRILLO = 16;
export const FUENTE_PRINCIPAL = "'Segoe UI', Arial, sans-serif";
export const RADIO_ESQUINAS = 24;

/**
 * Dibuja el fondo cálido estándar de un panel (rectángulo redondeado con
 * brillo ámbar suave alrededor + borde ámbar nítido) sobre un contexto de
 * canvas 2D ya limpiado (`clearRect`) por quien llama. No dibuja texto --
 * eso sigue a cargo de cada pantalla, usando `COLOR_TEXTO`/`FUENTE_PRINCIPAL`
 * de este mismo módulo para que el texto combine con el fondo.
 * @param {CanvasRenderingContext2D} contexto
 * @param {number} ancho
 * @param {number} alto
 */
export function dibujarFondoPanel(contexto, ancho, alto) {
  const radio = Math.min(RADIO_ESQUINAS, ancho / 2, alto / 2);

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

  contexto.save();
  contexto.shadowColor = COLOR_BRILLO;
  contexto.shadowBlur = DESENFOQUE_BRILLO;
  contexto.fillStyle = COLOR_FONDO_PANEL;
  trazarRectanguloRedondeado(0, 0, ancho, alto, radio);
  contexto.fill();
  contexto.restore();

  // Borde ámbar nítido, sin el shadowBlur del fill (si no, el borde en sí
  // también saldría difuso en vez de sólo el resplandor alrededor).
  contexto.strokeStyle = COLOR_AMBAR;
  contexto.lineWidth = 2;
  trazarRectanguloRedondeado(1, 1, ancho - 2, alto - 2, Math.max(radio - 1, 0));
  contexto.stroke();
}
