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
  resetId: (valor) => Number.isInteger(valor) && valor >= 0,
};

/**
 * Estado inicial de la aplicación.
 * @returns {{pantalla:string, resetId:number}}
 */
export function estadoPorDefecto() {
  return {
    pantalla: 'reconocimiento',
    resetId: 0,
  };
}

/**
 * Aplica un comando al estado y devuelve el nuevo estado.
 * No muta `estadoActual`. Si el comando no es un objeto, está vacío o
 * NINGÚN campo resulta válido, devuelve `estadoActual` sin cambios. Si al
 * menos un campo es válido, se aplica ese (y los demás que también lo sean),
 * ignorando en silencio los campos desconocidos o con valor inválido -- esto
 * es necesario porque Firebase entrega el nodo COMPLETO en cada cambio, y
 * ese nodo puede acumular campos viejos/legacy con el tiempo (cambios de
 * esquema, datos de pruebas anteriores que nadie borró) que ya no tienen
 * validador. Rechazar el comando entero por un solo campo legacy tiraba
 * abajo TODO el panel del observador, aunque trajera también un campo
 * válido (ver incidente de Firebase con `tiempoVueltaMin` post Tarea 26).
 * @param {{pantalla:string, resetId:number}} estadoActual
 * @param {object} comando ej. `{ pantalla: 'menu' }`
 * @returns {{pantalla:string, resetId:number}}
 */
export function aplicarComando(estadoActual, comando) {
  if (comando === null || typeof comando !== 'object' || Array.isArray(comando)) {
    return estadoActual;
  }

  const campos = Object.keys(comando);
  if (campos.length === 0) return estadoActual;

  const camposValidos = {};
  for (const campo of campos) {
    const validar = Object.hasOwn(VALIDADORES, campo) ? VALIDADORES[campo] : null;
    if (validar && validar(comando[campo])) {
      camposValidos[campo] = comando[campo];
    }
  }

  if (Object.keys(camposValidos).length === 0) return estadoActual;

  return { ...estadoActual, ...camposValidos };
}
