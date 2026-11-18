// Pantalla de menú: tres opciones de ayuda (subtítulos, imágenes, mapa
// conceptual). El usuario elige una con el único mecanismo de selección
// del proyecto -- mano, control o mouse, vía `enEventoSeleccion` (ver
// interaccion.js) -- así que este archivo no reimplementa la detección
// del click: se suscribe a ese evento y hace raycasting contra los tres
// paneles de texto para saber cuál fue tocado (si el rayo no toca
// ninguno, no pasa nada).

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion } from '../interaccion.js';

// Misma altura y profundidad que el resto de las pantallas estáticas
// (ver POSICION_POR_DEFECTO en panel-texto.js): por debajo de la altura
// típica de los ojos, así los tres botones -- igual que cualquier otro
// panel del proyecto -- nunca cubren el centro del campo visual.
const ALTURA_Y = 1.1;
const PROFUNDIDAD_Z = -1.8;

const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.35;

// Separación horizontal entre centros de botones: con ANCHO_BOTON = 0.5
// deja ~0.1 m de aire entre bordes, para que no se puedan tocar por error.
const SEPARACION_X = 0.6;

const OPCIONES = [
  { opcion: 'subtitulos', texto: 'Subtítulos', x: -SEPARACION_X },
  { opcion: 'imagenes', texto: 'Imágenes', x: 0 },
  { opcion: 'mapa', texto: 'Mapa conceptual', x: SEPARACION_X },
];

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea la pantalla de menú: tres botones ("Subtítulos", "Imágenes", "Mapa
 * conceptual"). Al completarse un gesto de selección (pellizco, gatillo o
 * click) sobre alguno de los tres, llama a `onSeleccionar` con el nombre
 * de esa opción. Si el gesto no toca ninguno, o si esta pantalla no está
 * visible en ese momento, no hace nada.
 * @param {THREE.WebGLRenderer} renderer
 * @param {(opcion: 'subtitulos'|'imagenes'|'mapa') => void} onSeleccionar
 * @returns {THREE.Object3D}
 */
export function crearPantallaMenu(renderer, onSeleccionar) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-menu';

  const botones = OPCIONES.map(({ opcion, texto, x }) => {
    const boton = crearPanelTexto([texto], {
      posicion: { x, y: ALTURA_Y, z: PROFUNDIDAD_Z },
      ancho: ANCHO_BOTON,
      alto: ALTO_BOTON,
      nombre: `pantalla-menu-boton-${opcion}`,
      icono: opcion,
      interactivo: true,
    });
    boton.userData.opcion = opcion;
    grupo.add(boton);
    return boton;
  });

  enEventoSeleccion(renderer, (origen, direccion) => {
    // El raycasting de Three.js no filtra por `.visible` al recorrer la
    // escena (sólo por `layers`): si esta pantalla no es la activa, hay
    // que ignorar el gesto a mano, o sus botones "fantasma" capturarían
    // clicks pensados para la pantalla que sí se está mostrando.
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return; // no tocó ningún botón: no hacer nada

    onSeleccionar(impactos[0].object.userData.opcion);
  });

  return grupo;
}
