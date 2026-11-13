/**
 * Estado de pantallas del visor. Módulo puro: no toca DOM, Three.js ni WebXR.
 *
 * El aviso y la pausa no son banderas aparte: son simplemente
 * `pantalla === 'aviso'` / `pantalla === 'pausa'`, ya incluidas en PANTALLAS.
 */

export const PANTALLAS = Object.freeze([
  'reconocimiento',
  'bienvenida',
  'menu',
  'subtitulos',
  'imagenes',
  'mapa',
  'aviso',
  'pausa',
  'vuelta',
  'resumen',
]);

// Campos que un comando puede traer y validador de cada uno.
const VALIDADORES = {
  pantalla: (valor) => typeof valor === 'string' && PANTALLAS.includes(valor),
  tiempoVueltaMin: (valor) => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0,
  resetId: (valor) => Number.isInteger(valor) && valor >= 0,
};

/**
 * Estado inicial de la aplicación.
 * @returns {{pantalla:string, tiempoVueltaMin:number, resetId:number}}
 */
export function estadoPorDefecto() {
  return {
    pantalla: 'reconocimiento',
    tiempoVueltaMin: 0,
    resetId: 0,
  };
}

/**
 * Aplica un comando al estado y devuelve el nuevo estado.
 * No muta `estadoActual`. Si el comando no es un objeto, trae campos
 * desconocidos o algún valor no válido, devuelve `estadoActual` sin cambios.
 * @param {{pantalla:string, tiempoVueltaMin:number, resetId:number}} estadoActual
 * @param {object} comando ej. `{ pantalla: 'menu' }`
 * @returns {{pantalla:string, tiempoVueltaMin:number, resetId:number}}
 */
export function aplicarComando(estadoActual, comando) {
  if (comando === null || typeof comando !== 'object' || Array.isArray(comando)) {
    return estadoActual;
  }

  const campos = Object.keys(comando);
  if (campos.length === 0) return estadoActual;

  for (const campo of campos) {
    const validar = Object.hasOwn(VALIDADORES, campo) ? VALIDADORES[campo] : null;
    if (!validar || !validar(comando[campo])) return estadoActual;
  }

  return { ...estadoActual, ...comando };
}
