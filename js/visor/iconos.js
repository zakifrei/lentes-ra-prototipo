// Librería de íconos simples dibujados a mano en Canvas2D (Tarea 28,
// pulido "ámbar-neón"): trazos/formas geométricas básicas (líneas,
// círculos, arcos) -- sin assets externos, mismo principio que el resto
// del proyecto. Pensada para acompañar el texto de los botones de una
// sola línea (ver `panel-texto.js`), pero sin ninguna dependencia hacia
// ese módulo ni hacia `tema-visual.js`: quien llama ya debe haber dejado
// `contexto.strokeStyle`/`fillStyle` configurados con el color que
// corresponda (normalmente `COLOR_TEXTO`), así el ícono siempre combina
// con el texto del botón que lo acompaña, sin que este archivo fije un
// color propio ni importe la paleta.

/**
 * Dibuja el ícono `nombre` centrado en `(cx, cy)` (coordenadas de canvas,
 * en px), dentro de un radio aproximado `radio` (también en px). Usa el
 * `contexto.strokeStyle`/`fillStyle` que ya esté configurado por quien
 * llama -- este módulo nunca fija un color propio. Si `nombre` no es
 * ninguno de los soportados, no dibuja nada (no tira error).
 * @param {string} nombre uno de: 'subtitulos', 'imagenes', 'mapa',
 *   'pausa', 'aceptar', 'rechazar', 'reiniciar', 'menu', 'flecha'
 * @param {CanvasRenderingContext2D} contexto
 * @param {number} cx
 * @param {number} cy
 * @param {number} radio
 */
export function dibujarIcono(nombre, contexto, cx, cy, radio) {
  // Grosor de trazo proporcional al radio recibido, para que se vea bien
  // tanto en un ícono chico (botón flotante) como en uno más grande (botón
  // de menú) sin quedar ni demasiado fino ni demasiado grueso en ningún
  // caso real del proyecto.
  const grosor = Math.max(radio * 0.12, 2);
  contexto.lineWidth = grosor;
  contexto.lineCap = 'round';
  contexto.lineJoin = 'round';

  if (nombre === 'subtitulos') {
    // Globo de diálogo simple: rectángulo redondeado + 2 líneas cortas
    // adentro simulando texto.
    const anchoGlobo = radio * 1.6;
    const altoGlobo = radio * 1.1;
    const x = cx - anchoGlobo / 2;
    const y = cy - altoGlobo / 2;
    contexto.beginPath();
    if (typeof contexto.roundRect === 'function') {
      contexto.roundRect(x, y, anchoGlobo, altoGlobo, radio * 0.25);
    } else {
      contexto.rect(x, y, anchoGlobo, altoGlobo);
    }
    contexto.stroke();

    contexto.beginPath();
    contexto.moveTo(x + anchoGlobo * 0.2, y + altoGlobo * 0.4);
    contexto.lineTo(x + anchoGlobo * 0.8, y + altoGlobo * 0.4);
    contexto.moveTo(x + anchoGlobo * 0.2, y + altoGlobo * 0.65);
    contexto.lineTo(x + anchoGlobo * 0.6, y + altoGlobo * 0.65);
    contexto.stroke();
    return;
  }

  if (nombre === 'imagenes') {
    // Marco con un sol (círculo chico arriba a la izquierda) y una
    // montaña (triángulo) abajo -- el ícono típico de "foto".
    const ladoMarco = radio * 1.5;
    const x = cx - ladoMarco / 2;
    const y = cy - ladoMarco / 2;
    contexto.beginPath();
    contexto.rect(x, y, ladoMarco, ladoMarco);
    contexto.stroke();

    contexto.beginPath();
    contexto.arc(x + ladoMarco * 0.3, y + ladoMarco * 0.3, ladoMarco * 0.12, 0, Math.PI * 2);
    contexto.stroke();

    contexto.beginPath();
    contexto.moveTo(x + ladoMarco * 0.1, y + ladoMarco * 0.85);
    contexto.lineTo(x + ladoMarco * 0.45, y + ladoMarco * 0.45);
    contexto.lineTo(x + ladoMarco * 0.65, y + ladoMarco * 0.65);
    contexto.lineTo(x + ladoMarco * 0.85, y + ladoMarco * 0.4);
    contexto.lineTo(x + ladoMarco * 0.9, y + ladoMarco * 0.85);
    contexto.closePath();
    contexto.stroke();
    return;
  }

  if (nombre === 'mapa') {
    // 3 puntos conectados por líneas rectas, simulando un mapa
    // conceptual/red simple.
    const puntos = [
      { x: cx - radio * 0.7, y: cy + radio * 0.5 },
      { x: cx, y: cy - radio * 0.6 },
      { x: cx + radio * 0.7, y: cy + radio * 0.5 },
    ];
    contexto.beginPath();
    contexto.moveTo(puntos[0].x, puntos[0].y);
    contexto.lineTo(puntos[1].x, puntos[1].y);
    contexto.lineTo(puntos[2].x, puntos[2].y);
    contexto.stroke();

    const radioPunto = Math.max(radio * 0.14, 2);
    puntos.forEach((punto) => {
      contexto.beginPath();
      contexto.arc(punto.x, punto.y, radioPunto, 0, Math.PI * 2);
      contexto.fill();
    });
    return;
  }

  if (nombre === 'pausa') {
    // Dos barras verticales paralelas.
    const anchoBarra = Math.max(radio * 0.28, grosor);
    const altoBarra = radio * 1.4;
    const separacion = radio * 0.5;
    contexto.beginPath();
    contexto.rect(cx - separacion - anchoBarra / 2, cy - altoBarra / 2, anchoBarra, altoBarra);
    contexto.fill();
    contexto.beginPath();
    contexto.rect(cx + separacion - anchoBarra / 2, cy - altoBarra / 2, anchoBarra, altoBarra);
    contexto.fill();
    return;
  }

  if (nombre === 'aceptar') {
    // Check (✓): dos segmentos formando una V asimétrica.
    contexto.beginPath();
    contexto.moveTo(cx - radio * 0.7, cy);
    contexto.lineTo(cx - radio * 0.15, cy + radio * 0.6);
    contexto.lineTo(cx + radio * 0.75, cy - radio * 0.6);
    contexto.stroke();
    return;
  }

  if (nombre === 'rechazar') {
    // X: dos líneas diagonales cruzadas.
    contexto.beginPath();
    contexto.moveTo(cx - radio * 0.6, cy - radio * 0.6);
    contexto.lineTo(cx + radio * 0.6, cy + radio * 0.6);
    contexto.moveTo(cx + radio * 0.6, cy - radio * 0.6);
    contexto.lineTo(cx - radio * 0.6, cy + radio * 0.6);
    contexto.stroke();
    return;
  }

  if (nombre === 'reiniciar') {
    // Flecha en arco, casi circular (3/4 de círculo) con punta de flecha
    // en un extremo -- el ícono típico de "refrescar/reiniciar".
    const radioArco = radio * 0.7;
    const anguloInicio = -Math.PI * 0.2;
    const anguloFin = Math.PI * 1.5;
    contexto.beginPath();
    contexto.arc(cx, cy, radioArco, anguloInicio, anguloFin);
    contexto.stroke();

    // Punta de flecha en el extremo final del arco.
    const puntaX = cx + radioArco * Math.cos(anguloFin);
    const puntaY = cy + radioArco * Math.sin(anguloFin);
    const anguloTangente = anguloFin + Math.PI / 2;
    const largoPunta = radio * 0.35;
    contexto.beginPath();
    contexto.moveTo(
      puntaX - largoPunta * Math.cos(anguloTangente - 0.5),
      puntaY - largoPunta * Math.sin(anguloTangente - 0.5)
    );
    contexto.lineTo(puntaX, puntaY);
    contexto.lineTo(
      puntaX - largoPunta * Math.cos(anguloTangente + 0.5),
      puntaY - largoPunta * Math.sin(anguloTangente + 0.5)
    );
    contexto.stroke();
    return;
  }

  if (nombre === 'menu') {
    // 3 líneas horizontales cortas, paralelas, separadas verticalmente
    // (ícono "hamburguesa").
    const anchoLinea = radio * 1.3;
    const separacion = radio * 0.5;
    [-separacion, 0, separacion].forEach((desplazamientoY) => {
      contexto.beginPath();
      contexto.moveTo(cx - anchoLinea / 2, cy + desplazamientoY);
      contexto.lineTo(cx + anchoLinea / 2, cy + desplazamientoY);
      contexto.stroke();
    });
    return;
  }

  if (nombre === 'flecha') {
    // Flecha simple apuntando a la derecha: línea horizontal + punta.
    const largoLinea = radio * 1.3;
    const xInicio = cx - largoLinea / 2;
    const xFin = cx + largoLinea / 2;
    contexto.beginPath();
    contexto.moveTo(xInicio, cy);
    contexto.lineTo(xFin, cy);
    contexto.stroke();

    const largoPunta = radio * 0.5;
    contexto.beginPath();
    contexto.moveTo(xFin - largoPunta, cy - largoPunta);
    contexto.lineTo(xFin, cy);
    contexto.lineTo(xFin - largoPunta, cy + largoPunta);
    contexto.stroke();
    return;
  }

  // Nombre no soportado: no se dibuja nada (sin tirar error), tal como
  // exige el brief.
}
