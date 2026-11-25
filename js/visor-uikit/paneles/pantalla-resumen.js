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
import { COLOR_TEXTO, TIPO_DP, fuenteDesdeDp } from '../ui-kit/tema-uikit.js';
import { RESUMEN_CLASE } from '../../common/resumen-clase.js';
import { enEventoSeleccion, habilitarArrastre } from '../../visor/interaccion.js';

// Mismos valores físicos que la versión vieja.
// Agrandado de 0.9x0.5 a 1.3x0.7 (y subido de 1.25 a 1.27 para no pisar
// el botón): a 18 dp, el mínimo cómodo de Meta, el resumen (~770
// caracteres) no entraba en el panel viejo.
const ANCHO_PANEL_MENSAJE = 1.3;
const ALTO_PANEL_MENSAJE = 0.7;
const POSICION_MENSAJE = { x: 0, y: 1.27, z: -1.8 };

// Mismo tamaño que la versión vieja (más chico que un mensaje corto: es
// un párrafo de varias oraciones).
const TAMANO_FUENTE_MENSAJE = fuenteDesdeDp(TIPO_DP.cuerpo2, ANCHO_PANEL_MENSAJE);

const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.21;
// Posición LOCAL al contenedor arrastrable (ver más abajo): justo debajo
// del panel de mensaje, igual que antes (y = 0.8 en el mundo).
const POSICION_BOTON_LOCAL = { x: 0, y: 0.8 - POSICION_MENSAJE.y, z: 0 };
const TAMANO_FUENTE_BOTON = fuenteDesdeDp(TIPO_DP.cuerpo1, ANCHO_BOTON);

const TEXTO_BOTON_VOLVER = 'Volver a la clase';

// Pedido del dueño del proyecto (2026-11-25): el resumen se puede mover,
// igual que los subtítulos. Mismos límites que pantalla-subtitulos.js, con
// un poco más de altura porque este panel es más alto.
const LIMITES_ARRASTRE = {
  x: [-0.8, 0.8],
  y: [0.6, 1.8],
  z: [-2.8, -1.2],
};

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

  // `contenedor` agrupa el panel y el botón para que se muevan juntos --
  // mismo patrón que pantalla-subtitulos.js: se AGARRA sólo el panel de
  // texto (así tocar el botón no arrastra nada) y se MUEVE el grupo.
  const contenedor = new THREE.Group();
  contenedor.name = 'pantalla-resumen-contenedor';
  contenedor.position.set(POSICION_MENSAJE.x, POSICION_MENSAJE.y, POSICION_MENSAJE.z);
  grupo.add(contenedor);

  const { contenedor: panelMensaje } = crearContenedorUikit({
    posicion: { x: 0, y: 0, z: 0 },
    ancho: ANCHO_PANEL_MENSAJE,
    alto: ALTO_PANEL_MENSAJE,
    nombre: 'pantalla-resumen-mensaje',
  });
  panelMensaje.add(
    new Text({ text: RESUMEN_CLASE, color: COLOR_TEXTO, fontSize: TAMANO_FUENTE_MENSAJE, fontWeight: 'normal' })
  );
  contenedor.add(panelMensaje);
  habilitarArrastre(renderer, panelMensaje, contenedor, LIMITES_ARRASTRE);

  const botonVolver = crearPanelUikit([TEXTO_BOTON_VOLVER], {
    posicion: POSICION_BOTON_LOCAL,
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-resumen-boton-volver',
    icono: 'flecha',
    interactivo: true,
  });
  contenedor.add(botonVolver);

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
