// Pantalla de aviso de atención (visor-uikit, Tarea 3 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// un panel de mensaje fijo más dos botones ("Sí, pausar" / "Seguir sin
// pausar"), mismos valores físicos que js/visor/paneles/pantalla-aviso.js
// (leído como referencia). Mismo patrón de selección que
// pantalla-menu.js (Tarea 2): raycasting manual sobre los botones vía
// `enEventoSeleccion`, sin @pmndrs/pointer-events.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';

const TEXTO_AVISO = 'Notamos que tus niveles de atención disminuyeron. ¿Querés ayuda?';
const TAMANO_FUENTE_MENSAJE = 54;

const TEXTO_BOTON_ACEPTAR = 'Sí, pausar';
const TEXTO_BOTON_RECHAZAR = 'Seguir sin pausar';

// Mismos valores físicos que la versión vieja: el panel de mensaje usa
// la posición/tamaño por defecto de crearPanelUikit (0.8x0.4 en
// {0,1.1,-1.8}), los botones van debajo, centrados en y=0.65.
const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.25;
const ALTURA_Y_BOTONES = 0.65;
const PROFUNDIDAD_Z_BOTONES = -1.8;
const TAMANO_FUENTE_BOTON = 76;
const SEPARACION_X = 0.35;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea la pantalla de aviso de atención: un panel de mensaje fijo más
 * dos botones. Al completarse un gesto de selección sobre uno de los
 * botones mientras esta pantalla está visible, llama a `onAceptar` u
 * `onRechazar` según corresponda -- misma firma que la versión vieja.
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onAceptar llamado al tocar "Sí, pausar"
 * @param {() => void} onRechazar llamado al tocar "Seguir sin pausar"
 * @returns {THREE.Object3D} grupo con `actualizarUikit(deltaMs)` (misma
 *   convención que pantalla-menu.js)
 */
export function crearPantallaAviso(renderer, onAceptar, onRechazar) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-aviso';

  const panelMensaje = crearPanelUikit([TEXTO_AVISO], {
    nombre: 'pantalla-aviso-mensaje',
    tamanoFuente: TAMANO_FUENTE_MENSAJE,
  });
  grupo.add(panelMensaje);

  const botonAceptar = crearPanelUikit([TEXTO_BOTON_ACEPTAR], {
    posicion: { x: -SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-aviso-boton-aceptar',
    icono: 'aceptar',
    interactivo: true,
  });
  botonAceptar.userData.accion = 'aceptar';
  grupo.add(botonAceptar);

  const botonRechazar = crearPanelUikit([TEXTO_BOTON_RECHAZAR], {
    posicion: { x: SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-aviso-boton-rechazar',
    icono: 'rechazar',
    interactivo: true,
  });
  botonRechazar.userData.accion = 'rechazar';
  grupo.add(botonRechazar);

  const botones = [botonAceptar, botonRechazar];
  const paneles = [panelMensaje, botonAceptar, botonRechazar];

  enEventoSeleccion(renderer, (origen, direccion) => {
    // Mismo criterio que pantalla-menu.js: ignorar el gesto a mano si
    // esta pantalla no es la activa (el raycasting de Three.js no
    // filtra por `.visible`).
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return;

    const accion = impactos[0].object.userData.accion;
    if (accion === 'aceptar') onAceptar();
    else if (accion === 'rechazar') onRechazar();
  });

  grupo.actualizarUikit = (deltaMs) => {
    paneles.forEach((panel) => panel.update(deltaMs));
  };

  return grupo;
}
