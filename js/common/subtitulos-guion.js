/**
 * Guion de subtítulos: información histórica general y creíble sobre la
 * caída del Imperio romano de Occidente, pensada para leerse cómoda como
 * subtítulo (líneas cortas). No busca rigor académico -- la prueba de
 * usabilidad es sobre la interfaz, no sobre el contenido histórico.
 *
 * Módulo puro: no toca DOM, Three.js ni WebXR.
 */

/**
 * Cada línea dura 5 segundos (antes 8): se achicó en la Tarea 21 a raíz de
 * una prueba de usabilidad real donde el dueño del proyecto reportó "los
 * subtítulos no avanzan" -- revisando el código (ver `lineaActual` y el
 * `setInterval` de `pantalla-subtitulos.js`) no se encontró ningún bug real
 * en el mecanismo del reloj: avanza solo, en tiempo real, desde que se
 * entra de verdad a esta pantalla. 8 segundos por línea es razonable para
 * ver el guion completo, pero probablemente demasiado largo para que un
 * observador lo note dentro de una prueba corta si el participante no se
 * queda quieto en esta pantalla todo ese tiempo -- 5 segundos hace el
 * avance mucho más evidente sin sacrificar tiempo de lectura.
 * @type {{desdeSegundos: number, texto: string}[]}
 */
export const GUION_SUBTITULOS = Object.freeze([
  { desdeSegundos: 0, texto: 'En el siglo III, el Imperio romano empieza a mostrar grietas internas.' },
  { desdeSegundos: 5, texto: 'Las luchas por el poder debilitan la autoridad del emperador.' },
  { desdeSegundos: 10, texto: 'La crisis económica golpea el comercio y el valor de la moneda.' },
  { desdeSegundos: 15, texto: 'Pueblos de más allá del Rin y el Danubio presionan las fronteras.' },
  { desdeSegundos: 20, texto: 'En el año 395, el imperio queda dividido en Oriente y Occidente.' },
  { desdeSegundos: 25, texto: 'Roma ya no puede sostener ejércitos ni defender todas sus provincias.' },
  { desdeSegundos: 30, texto: 'En el 410, los visigodos de Alarico saquean la ciudad de Roma.' },
  { desdeSegundos: 35, texto: 'Distintos reinos germánicos se asientan dentro del territorio romano.' },
  { desdeSegundos: 40, texto: 'En el 476, Rómulo Augusto, el último emperador de Occidente, es depuesto.' },
  { desdeSegundos: 45, texto: 'El Imperio romano de Oriente sigue en pie: nace lo que hoy llamamos Bizancio.' },
]);

/**
 * Devuelve el texto vigente según el tiempo transcurrido: la última línea
 * cuyo `desdeSegundos` ya se alcanzó. Si `segundosTranscurridos` supera el
 * guion entero, devuelve la última línea (se queda fija en ella).
 * @param {number} segundosTranscurridos
 * @returns {string}
 */
export function lineaActual(segundosTranscurridos) {
  let vigente = GUION_SUBTITULOS[0];
  for (const linea of GUION_SUBTITULOS) {
    if (linea.desdeSegundos > segundosTranscurridos) break;
    vigente = linea;
  }
  return vigente.texto;
}
