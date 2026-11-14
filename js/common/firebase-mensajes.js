/**
 * Construcción de comandos que el panel del observador escribe en Firebase
 * y que el visor lee. Módulo puro: no toca DOM, Firebase SDK ni WebXR.
 */

const NODO_RAIZ = 'estado';

let ultimoResetId = 0;

export function nodoRaizFirebase() {
  return NODO_RAIZ;
}

export function construirComandoPantalla(pantalla) {
  return { pantalla };
}

// Se sanea acá además de en el visor: un valor inválido nunca debe llegar a Firebase.
export function construirComandoTiempoVuelta(minutos) {
  const valido = typeof minutos === 'number' && Number.isFinite(minutos) && minutos >= 0;
  return { tiempoVueltaMin: valido ? minutos : 0 };
}

// Date.now() puede repetirse si dos resets se piden en el mismo milisegundo;
// forzar que crezca garantiza que el visor siempre vea un id distinto.
export function construirComandoReset() {
  ultimoResetId = Math.max(Date.now(), ultimoResetId + 1);
  return { resetId: ultimoResetId };
}
