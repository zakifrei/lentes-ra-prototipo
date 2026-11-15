// Botón de menú flotante (Tarea 25): a diferencia de TODOS los demás
// paneles del proyecto -- fijos en el espacio del MUNDO (world space), y que
// por lo tanto quedan atrás si el usuario gira la cabeza -- éste es un HUD
// real. Quien llama (`main.js`) debe agregarlo como hijo de la CÁMARA
// (`camara.add(...)`), nunca de `escena`: así su posición se interpreta en
// coordenadas LOCALES a la cámara y se mantiene siempre en la misma esquina
// de la vista, sin importar hacia dónde mire el usuario. Surge de que el
// dueño del proyecto probó el flujo real en el Quest y quiso poder volver al
// menú desde cualquier pantalla sin depender de hacia dónde esté mirando.
//
// Reutiliza `crearPanelTexto` igual que el resto de los botones del
// proyecto, y el mismo mecanismo único de selección de `interaccion.js`
// (`enEventoSeleccion`) -- mismo patrón de raycasting que
// pantalla-aviso.js/pantalla-vuelta.js/pantalla-menu.js.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion } from '../interaccion.js';

const TEXTO_BOTON = 'Menú';

// Coordenadas LOCALES a la cámara (no del mundo): +X a la derecha, +Y hacia
// arriba, -Z hacia adelante (misma convención que usa Three.js para
// cualquier cámara). z=-0.5 (medio metro) en vez de los -1 a -1.3 m en los
// que viven el resto de los paneles del proyecto -- a propósito, para que el
// botón quede "pegado" a la esquina sin competir con el contenido
// principal. Por la misma razón, el tamaño físico de abajo es bastante más
// chico que el de los botones normales (ANCHO_BOTON/ALTO_BOTON = 0.6x0.3 a
// z=-1.2 en pantalla-aviso.js/pantalla-vuelta.js): a esta distancia mucho
// más corta, ese mismo tamaño físico tapiaría buena parte del campo visual
// (el campo visual cubierto por un panel de tamaño fijo crece cuanto más
// cerca está de la cámara).
const POSICION_LOCAL = { x: 0.35, y: 0.25, z: -0.5 };
const ANCHO_BOTON = 0.18;
const ALTO_BOTON = 0.09;
// Más grande que el TAMANO_FUENTE_POR_DEFECTO (48) de panel-texto.js: el
// texto "Menú" es corto y el panel chico, así que conviene aprovechar el
// espacio disponible del canvas para que siga siendo legible aun con el
// panel reducido de arriba.
const TAMANO_FUENTE = 64;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea el botón de menú flotante: un panel de texto chico, pensado para
 * agregarse como hijo de la CÁMARA (no de la escena) desde `main.js`. Al
 * completarse un gesto de selección completo (pellizco, gatillo o click)
 * mientras el botón es visible, llama a `onTocar()` una sola vez (mismo
 * comportamiento de "un solo disparo por gesto" de `enEventoSeleccion`).
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onTocar
 * @returns {THREE.Object3D} quien llama debe agregarlo con `camara.add(...)`
 */
export function crearBotonMenuFlotante(renderer, onTocar) {
  const boton = crearPanelTexto([TEXTO_BOTON], {
    posicion: POSICION_LOCAL,
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE,
    nombre: 'boton-menu-flotante',
  });

  enEventoSeleccion(renderer, (origen, direccion) => {
    // El raycasting de Three.js no filtra por `.visible` (sólo por
    // `layers`): si el botón no está visible, hay que ignorar el gesto a
    // mano, o capturaría clicks aunque esté oculto -- mismo criterio que
    // pantalla-aviso.js/pantalla-menu.js/pantalla-vuelta.js. Acá "visible"
    // lo controla `main.js` según la pantalla activa
    // (`actualizarPantallaVisible`), no un criterio propio de este archivo.
    if (!boton.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObject(boton, false);
    if (impactos.length === 0) return; // no tocó el botón: no hacer nada

    onTocar();
  });

  return boton;
}
