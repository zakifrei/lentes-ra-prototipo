/**
 * Limita una posición a los rangos permitidos de cada eje.
 * Función pura: no muta la posición de entrada.
 * @param {{x:number,y:number,z:number}} posicion
 * @param {{x:[number,number],y:[number,number],z:[number,number]}} limites
 * @returns {{x:number,y:number,z:number}}
 */
export function limitarPosicion(posicion, limites) {
  return {
    x: Math.min(Math.max(posicion.x, limites.x[0]), limites.x[1]),
    y: Math.min(Math.max(posicion.y, limites.y[0]), limites.y[1]),
    z: Math.min(Math.max(posicion.z, limites.z[0]), limites.z[1]),
  };
}
