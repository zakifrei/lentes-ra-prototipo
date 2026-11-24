// Pantalla de aviso de atención (visor-uikit, Tarea 3 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// un panel de mensaje fijo más dos botones ("Sí, pausar" / "Seguir sin
// pausar"), mismos valores físicos que js/visor/paneles/pantalla-aviso.js
// (leído como referencia). Mismo patrón de selección que
// pantalla-menu.js (Tarea 2): raycasting manual sobre los botones vía
// `enEventoSeleccion`, sin @pmndrs/pointer-events.
//
// Post-migración (pedido del dueño del proyecto, misma vuelta que sumó
// @pmndrs/uikit-lucide a icono-uikit.js): el panel de mensaje pasa de
// `Card` genérico (texto plano) a `Alert` de @pmndrs/uikit-default --
// trae la semántica propia de un aviso (ícono arriba a la izquierda,
// título corto + descripción debajo, con el padding ya pensado para no
// superponerse con el ícono) en vez de una sola oración corrida. El
// texto original se parte en título ("¿Necesitás una pausa?") +
// descripción (el resto, sin la pregunta) -- mismo contenido, ahora con
// jerarquía tipográfica real.
//
// `Alert`/`AlertTitle`/`AlertDescription` vienen calibrados para la
// escala típica de CSS (14-16px) -- acá se les pasan tamaños/paddings
// propios para que coincidan con la escala de 1024px de referencia que
// usa el resto del visor (ver panel-uikit.js), no sus valores por
// defecto.

import * as THREE from '../../../vendor/three/three.module.js';
import { Text } from '@pmndrs/uikit';
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@pmndrs/uikit-default';
import { crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO, crearFondoDegradadoCartel } from '../ui-kit/tema-uikit.js';
import { crearIconoUikit } from '../ui-kit/icono-uikit.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';

const TITULO_AVISO = '¿Necesitás una pausa?';
const DESCRIPCION_AVISO = 'Notamos que tus niveles de atención disminuyeron.';

// Mismo ancho/alto/posición por defecto que usaba crearPanelUikit acá
// antes (0.8x0.4 en {0,1.1,-1.8}) -- ver el comentario grande en
// panel-uikit.js sobre por qué ancho/alto se convierten así a
// pixelSize/tamaños de contenido (acá se repite el cálculo a mano
// porque panel-uikit.js no expone un "alerta: true" -- es un layout de
// un solo uso, no un primitivo genérico como Button/Card).
const ANCHO_CANVAS_REFERENCIA = 1024;
const ANCHO_PANEL_MENSAJE = 0.8;
const ALTO_PANEL_MENSAJE = 0.4;
const POSICION_PANEL_MENSAJE = { x: 0, y: 1.1, z: -1.8 };

const TAMANO_FUENTE_TITULO = 48;
const TAMANO_FUENTE_DESCRIPCION = 38;
const DIAMETRO_ICONO_AVISO = 64;
const MARGEN_PANEL = 40;
// Dejar lugar al ícono (arriba a la izquierda) para que el título y la
// descripción no lo tapen -- mismo criterio que AlertTitle/
// AlertDescription originales (paddingLeft fijo), escalado a nuestro
// ícono real en vez del ícono chico de 16-24px de shadcn/ui.
const MARGEN_IZQUIERDO_TEXTO = MARGEN_PANEL + DIAMETRO_ICONO_AVISO + 20;

const TEXTO_BOTON_ACEPTAR = 'Sí, pausar';
const TEXTO_BOTON_RECHAZAR = 'Seguir sin pausar';

// Mismos valores físicos que la versión vieja: los botones van debajo
// del panel de mensaje, centrados en y=0.65.
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

  const pixelSize = ANCHO_PANEL_MENSAJE / ANCHO_CANVAS_REFERENCIA;
  const panelMensaje = new Alert({
    pixelSize,
    width: ANCHO_CANVAS_REFERENCIA,
    height: Math.round(ANCHO_CANVAS_REFERENCIA * (ALTO_PANEL_MENSAJE / ANCHO_PANEL_MENSAJE)),
    padding: MARGEN_PANEL,
    borderWidth: 2,
    borderRadius: 0,
    justifyContent: 'center',
    // Mismo criterio que crearContenedorUikit (panel-uikit.js, ver su
    // comentario grande): 'center' en vez del 'left' por defecto de
    // uikit, heredado solo a título/descripción (acá esta pantalla no
    // pasa por ese helper, así que hay que repetirlo).
    textAlign: 'center',
  });
  panelMensaje.name = 'pantalla-aviso-mensaje';
  panelMensaje.position.set(
    POSICION_PANEL_MENSAJE.x,
    POSICION_PANEL_MENSAJE.y,
    POSICION_PANEL_MENSAJE.z
  );

  // Degradé sutil (riesgo de /design-consultation, ver DESIGN.md) --
  // mismo tratamiento que crearContenedorUikit le da al Card, encima de
  // su fondo sólido.
  panelMensaje.add(crearFondoDegradadoCartel());

  const filaIcono = new AlertIcon({ positionLeft: MARGEN_PANEL, positionTop: MARGEN_PANEL });
  filaIcono.add(crearIconoUikit('atencion', DIAMETRO_ICONO_AVISO, COLOR_TEXTO));
  panelMensaje.add(filaIcono);

  const titulo = new AlertTitle({ paddingLeft: MARGEN_IZQUIERDO_TEXTO, marginBottom: 12 });
  titulo.add(
    new Text({
      text: TITULO_AVISO,
      color: COLOR_TEXTO,
      fontSize: TAMANO_FUENTE_TITULO,
      fontWeight: 'bold',
      // Fraunces (serif cálida) sólo para el título -- ver el comentario
      // grande de fuente-uikit.js (pedido vía /design-consultation).
      fontFamily: 'fraunces',
    })
  );
  panelMensaje.add(titulo);

  const descripcion = new AlertDescription({ paddingLeft: MARGEN_IZQUIERDO_TEXTO });
  descripcion.add(
    new Text({
      text: DESCRIPCION_AVISO,
      color: COLOR_TEXTO,
      fontSize: TAMANO_FUENTE_DESCRIPCION,
    })
  );
  panelMensaje.add(descripcion);

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
