/**
 * Contenido del mapa conceptual: causas, hitos y consecuencias de la caída
 * del Imperio romano de Occidente. Información histórica general y
 * creíble, mismo nivel de rigor que el guion de subtítulos (ver
 * js/common/subtitulos-guion.js) -- la prueba de usabilidad es sobre la
 * interfaz, no sobre el contenido histórico.
 *
 * Vive en assets/ (no en js/common/) porque es contenido editorial
 * específico de esta pantalla, no un módulo de lógica compartida. Aun así
 * es un módulo puro: no toca DOM, Three.js ni WebXR -- sólo datos.
 *
 * @type {{titulo: string, lineas: string[]}[]}
 */
export const MAPA_CONCEPTUAL = Object.freeze([
  {
    titulo: 'Causas',
    lineas: Object.freeze([
      'Crisis económica y devaluación de la moneda',
      'Presión de pueblos germánicos en las fronteras',
      'Luchas internas por el poder imperial',
    ]),
  },
  {
    titulo: 'Hitos',
    lineas: Object.freeze([
      '395: división en Oriente y Occidente',
      '410: saqueo de Roma por los visigodos',
      '476: cae el último emperador de Occidente',
    ]),
  },
  {
    titulo: 'Consecuencias',
    lineas: Object.freeze([
      'Fin del Imperio romano de Occidente',
      'Nuevos reinos germánicos en Europa',
      'Bizancio (Oriente) sigue en pie',
    ]),
  },
]);
