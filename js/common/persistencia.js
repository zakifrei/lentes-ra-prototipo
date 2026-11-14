/**
 * Estado persistente de preferencias del usuario (tamaño de subtítulos,
 * posición/escala de imágenes, etc.). Módulo puro: no toca DOM, Three.js
 * ni WebXR, y no persiste a disco/localStorage por sí mismo -- eso, si
 * hace falta, lo decide quien use este módulo.
 */

// Factores de escala del tamaño de subtítulo. El tamaño arranca
// intencionalmente chico (TAMANO_MIN): el usuario lo agranda si lo
// necesita, en vez de empezar grande y tapar más campo visual del
// necesario.
export const TAMANO_MIN = 1;
export const TAMANO_MAX = 3;

/**
 * Estado inicial de persistencia.
 * @returns {{tamanoSubtitulo: number, imagenes: Record<string,{x:number,y:number,z:number,escala:number}>}}
 */
export function estadoPersistenciaInicial() {
  return {
    tamanoSubtitulo: TAMANO_MIN,
    imagenes: {},
  };
}

/**
 * Ajusta el tamaño de subtítulo en `delta`, clampado entre TAMANO_MIN y
 * TAMANO_MAX. No muta `estado`.
 * @param {{tamanoSubtitulo:number, imagenes:object}} estado
 * @param {number} delta
 * @returns {{tamanoSubtitulo:number, imagenes:object}}
 */
export function ajustarTamanoSubtitulo(estado, delta) {
  const nuevoTamano = Math.min(Math.max(estado.tamanoSubtitulo + delta, TAMANO_MIN), TAMANO_MAX);
  return { ...estado, tamanoSubtitulo: nuevoTamano };
}

/**
 * Guarda la posición de la imagen `idImagen`, sin tocar su escala previa
 * (si la imagen todavía no tenía escala guardada, queda en TAMANO_MIN, el
 * mismo valor inicial que usa estadoPersistenciaInicial para el tamaño de
 * subtítulo). No muta `estado`.
 * @param {{tamanoSubtitulo:number, imagenes:object}} estado
 * @param {string} idImagen
 * @param {{x:number,y:number,z:number}} posicion
 * @returns {{tamanoSubtitulo:number, imagenes:object}}
 */
export function guardarPosicionImagen(estado, idImagen, posicion) {
  const anterior = estado.imagenes[idImagen];
  return {
    ...estado,
    imagenes: {
      ...estado.imagenes,
      [idImagen]: {
        escala: TAMANO_MIN,
        ...anterior,
        x: posicion.x,
        y: posicion.y,
        z: posicion.z,
      },
    },
  };
}

/**
 * Guarda la escala de la imagen `idImagen`, clampada entre TAMANO_MIN y
 * TAMANO_MAX (mismo rango que ajustarTamanoSubtitulo), sin tocar su
 * posición previa. No muta `estado`.
 * @param {{tamanoSubtitulo:number, imagenes:object}} estado
 * @param {string} idImagen
 * @param {number} escala
 * @returns {{tamanoSubtitulo:number, imagenes:object}}
 */
export function guardarEscalaImagen(estado, idImagen, escala) {
  const anterior = estado.imagenes[idImagen];
  const escalaLimitada = Math.min(Math.max(escala, TAMANO_MIN), TAMANO_MAX);
  return {
    ...estado,
    imagenes: {
      ...estado.imagenes,
      [idImagen]: {
        x: 0,
        y: 0,
        z: 0,
        ...anterior,
        escala: escalaLimitada,
      },
    },
  };
}

/**
 * Reinicia la persistencia a su estado inicial.
 * @returns {{tamanoSubtitulo: number, imagenes: Record<string,{x:number,y:number,z:number,escala:number}>}}
 */
export function reiniciarPersistencia() {
  return estadoPersistenciaInicial();
}
