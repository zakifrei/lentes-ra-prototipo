/**
 * Temporizador de pausa: módulo puro, sin DOM ni Three.js ni WebXR. Calcula
 * cuántos minutos pasaron en la pausa (Tarea 12 la va a usar para armar la
 * pantalla de "vuelta") y arma el texto literal de bienvenida de vuelta.
 */

/**
 * Minutos transcurridos entre `inicioMs` y `ahoraMs`, redondeados al entero
 * más cercano. Nunca da negativo: si `ahoraMs` quedó antes que `inicioMs`
 * (reloj invertido, o simplemente nada transcurrido todavía), devuelve 0.
 * @param {number} inicioMs
 * @param {number} ahoraMs
 * @returns {number}
 */
export function minutosTranscurridos(inicioMs, ahoraMs) {
  const msTranscurridos = Math.max(0, ahoraMs - inicioMs);
  return Math.round(msTranscurridos / 60000);
}

// Satura un valor a un número no negativo: cualquier cosa que no sea un
// número finito y >= 0 (NaN, texto, undefined, negativos) se sanea a 0,
// para que el texto de vuelta nunca muestre algo sin sentido como "NaN
// min" o "-5 temas".
function saneaNumeroNoNegativo(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

/**
 * Arma las 3 líneas de bienvenida de vuelta, en orden (saludo, minutos en
 * pausa, temas guardados) -- a pedido del dueño del proyecto, ya no es un
 * único texto con las 3 frases unidas por "·" (eso se veía como una sola
 * oración larga); ahora son 3 líneas separadas, mismo criterio que
 * pantalla-bienvenida.js. Sanea `minutos`/`temas` no numéricos o negativos a
 * 0 antes de interpolar.
 * @param {number} minutos
 * @param {number} temas
 * @returns {[string, string, string]}
 */
export function armarLineasVuelta(minutos, temas) {
  const minutosSaneados = saneaNumeroNoNegativo(minutos);
  const temasSaneados = saneaNumeroNoNegativo(temas);
  return [
    '¡Bienvenida de vuelta!',
    `Estuviste ${minutosSaneados} min en pausa`,
    `Se guardaron ${temasSaneados} temas en tu notebook`,
  ];
}
