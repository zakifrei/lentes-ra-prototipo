// Pantalla de menú (visor-uikit, Tarea 2 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): misma firma
// pública y mismos valores físicos que js/visor/paneles/pantalla-menu.js
// (leído como referencia), reconstruida sobre `crearPanelUikit` en vez de
// Canvas2D a mano.
//
// El click/selección NO pasa por `@pmndrs/pointer-events` -- el plan lo
// daba por necesario, pero cada botón de `crearPanelUikit` sigue siendo
// un `THREE.Mesh` real con geometría real (confirmado en vivo: un
// `THREE.Raycaster.intersectObjects` normal le pega igual que a cualquier
// panel del visor viejo), así que esta pantalla reusa el MISMO mecanismo
// de siempre (`enEventoSeleccion` + raycasting manual) en vez de sumar el
// puente de eventos de uikit.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { TIPO_DP, fuenteDesdeDp } from '../ui-kit/tema-uikit.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';

const ALTURA_Y = 1.1;
const PROFUNDIDAD_Z = -1.8;

const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.35;
const TAMANO_FUENTE_BOTON = fuenteDesdeDp(TIPO_DP.cuerpo1, ANCHO_BOTON);
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
 * conceptual"). Al completarse un gesto de selección sobre alguno de los
 * tres, llama a `onSeleccionar` con el nombre de esa opción -- misma
 * firma que la versión vieja.
 *
 * El grupo devuelto expone `actualizarUikit(deltaMs)`: quien lo agregue a
 * la escena debe llamarlo en cada cuadro del render loop (ver
 * skills/pmndrs-uikit/SKILL.md) -- cada botón es su PROPIO root de uikit
 * (su padre, este `grupo`, no es un componente uikit), así que no alcanza
 * con que el padre esté en la escena: cada uno necesita su propio
 * `.update()`.
 * @param {THREE.WebGLRenderer} renderer
 * @param {(opcion: 'subtitulos'|'imagenes'|'mapa') => void} onSeleccionar
 * @returns {THREE.Object3D}
 */
export function crearPantallaMenu(renderer, onSeleccionar) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-menu';

  const botones = OPCIONES.map(({ opcion, texto, x }) => {
    const boton = crearPanelUikit([texto], {
      posicion: { x, y: ALTURA_Y, z: PROFUNDIDAD_Z },
      ancho: ANCHO_BOTON,
      alto: ALTO_BOTON,
      tamanoFuente: TAMANO_FUENTE_BOTON,
      nombre: `pantalla-menu-boton-${opcion}`,
      icono: opcion,
      interactivo: true,
    });
    boton.userData.opcion = opcion;
    grupo.add(boton);
    return boton;
  });

  enEventoSeleccion(renderer, (origen, direccion) => {
    // Mismo motivo que la versión vieja: el raycasting de Three.js no
    // filtra por `.visible` (sólo por `layers`), así que hay que
    // ignorar el gesto a mano si esta pantalla no es la activa.
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return;

    onSeleccionar(impactos[0].object.userData.opcion);
  });

  grupo.actualizarUikit = (deltaMs) => {
    botones.forEach((boton) => boton.update(deltaMs));
  };

  return grupo;
}
