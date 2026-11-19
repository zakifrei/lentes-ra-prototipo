// Pantalla de "resumen rápido" (visor-uikit, Tarea 3 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// un panel de mensaje con el texto fijo `RESUMEN_CLASE`
// (js/common/resumen-clase.js) más un botón ("Volver a la clase") --
// mismos valores físicos que js/visor/paneles/pantalla-resumen.js (leído
// como referencia).
//
// Review Focus del plan: "probar wrap automático de uikit" para este
// párrafo largo. La versión vieja partía el texto en líneas a mano
// (`partirEnLineas`, midiendo con `measureText`) porque Canvas2D no envuelve
// texto solo. Acá no hace falta: un único `Text` con el párrafo entero deja
// que Yoga lo envuelva dentro del ancho del panel -- confirmado en el
// navegador (ver el commit de esta pantalla).

import * as THREE from '../../../vendor/three/three.module.js';
import { Text } from '@pmndrs/uikit';
import { crearContenedorUikit, crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO } from '../ui-kit/tema-uikit.js';
import { RESUMEN_CLASE } from '../../common/resumen-clase.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';

// Mismos valores físicos que la versión vieja.
const ANCHO_PANEL_MENSAJE = 0.9;
const ALTO_PANEL_MENSAJE = 0.5;
const POSICION_MENSAJE = { x: 0, y: 1.25, z: -1.8 };

// Mismo tamaño que la versión vieja (más chico que un mensaje corto: es
// un párrafo de varias oraciones).
const TAMANO_FUENTE_MENSAJE = 30;

const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.21;
const POSICION_BOTON = { x: 0, y: 0.8, z: -1.8 };
const TAMANO_FUENTE_BOTON = 76;

const TEXTO_BOTON_VOLVER = 'Volver a la clase';

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea la pantalla de "resumen rápido".
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onVolverClase llamado al tocar "Volver a la clase"
 * @returns {THREE.Object3D} grupo con `actualizarUikit(deltaMs)` (misma
 *   convención que pantalla-menu.js)
 */
export function crearPantallaResumen(renderer, onVolverClase) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-resumen';

  const { contenedor: panelMensaje } = crearContenedorUikit({
    posicion: POSICION_MENSAJE,
    ancho: ANCHO_PANEL_MENSAJE,
    alto: ALTO_PANEL_MENSAJE,
    nombre: 'pantalla-resumen-mensaje',
  });
  panelMensaje.add(
    new Text({ text: RESUMEN_CLASE, color: COLOR_TEXTO, fontSize: TAMANO_FUENTE_MENSAJE, fontWeight: 'normal' })
  );
  grupo.add(panelMensaje);

  const botonVolver = crearPanelUikit([TEXTO_BOTON_VOLVER], {
    posicion: POSICION_BOTON,
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-resumen-boton-volver',
    icono: 'flecha',
    interactivo: true,
  });
  grupo.add(botonVolver);

  const botones = [botonVolver];
  const paneles = [panelMensaje, botonVolver];

  enEventoSeleccion(renderer, (origen, direccion) => {
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return;

    onVolverClase();
  });

  grupo.actualizarUikit = (deltaMs) => {
    paneles.forEach((panel) => panel.update(deltaMs));
  };

  return grupo;
}
