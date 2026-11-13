// Navegación de desarrollo: placeholder TEMPORAL para poder probar las
// pantallas estáticas del visor antes de que exista el panel real del
// observador (controlado por Firebase -- ver Etapa 4 del plan). Escucha
// las teclas '1'-'9' del teclado y, para cada una, llama a `callback` con
// el nombre de pantalla correspondiente, en el mismo orden que `PANTALLAS`
// (js/common/estado.js): '1' -> 'reconocimiento', '2' -> 'bienvenida', etc.
//
// Este módulo NO conoce ni aplica el estado de la app: sólo traduce una
// tecla a un nombre de pantalla y se lo pasa a quien lo llamó. Es
// `main.js` quien decide qué hacer con ese nombre (pasarlo por
// `aplicarComando`, de `estado.js`, igual que hará después con los
// comandos que lleguen de Firebase).

import { PANTALLAS } from '../common/estado.js';

// Sólo hay teclas '1' a '9': no hace falta una décima para este
// prototipo de desarrollo.
const TECLAS_A_PANTALLA = Object.fromEntries(
  PANTALLAS.slice(0, 9).map((pantalla, indice) => [String(indice + 1), pantalla])
);

/**
 * Habilita la navegación de desarrollo por teclado: '1'-'9' -> pantalla.
 * @param {(pantalla: string) => void} callback
 * @returns {() => void} función para deshabilitar la navegación
 */
export function habilitarNavegacionDev(callback) {
  function alPresionarTecla(evento) {
    const pantalla = TECLAS_A_PANTALLA[evento.key];
    if (!pantalla) return;
    callback(pantalla);
  }

  window.addEventListener('keydown', alPresionarTecla);

  return function deshabilitar() {
    window.removeEventListener('keydown', alPresionarTecla);
  };
}
