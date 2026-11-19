// Botón de menú flotante (visor-uikit, Tarea 4 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): HUD "body-locked
// con lag" -- mismos valores físicos, mismo `negrita: true` en el botón
// principal y misma lógica de `actualizarSeguimiento` (lerp/slerp
// exponencial hacia la cámara) que
// js/visor/paneles/boton-menu-flotante.js (leído como referencia). Ver
// su comentario grande para el porqué de "body-locked con lag" en vez de
// head-locked.
//
// Hallazgo de esta tarea: el `grupo` que sigue a la cámara con
// lerp/slerp es un `THREE.Group` PLANO (igual que en pantalla-aviso.js/
// pantalla-vuelta.js, que ya agrupan varios paneles de uikit bajo un
// Group común) -- `.position.lerp()`/`.quaternion.slerp()` se llaman
// sobre ESE Group, nunca sobre un Container de uikit directamente. No
// hizo falta confirmar que un Container admite lerp/slerp (no lo
// necesita): los botones de uikit son sus hijos, con su posición LOCAL
// de siempre, y heredan el movimiento del grupo como cualquier otro
// Object3D.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';

const TEXTO_BOTON = 'Menú';

// Mismos valores físicos que la versión vieja (coordenadas LOCALES al
// grupo, no del mundo -- ver el comentario grande de arriba).
const FACTOR_ESCALA_PROFUNDIDAD = 3.6; // 1.8m / 0.5m
const Z_LOCAL = -1.6;
const POSICION_LOCAL = {
  x: 0.18 * FACTOR_ESCALA_PROFUNDIDAD,
  y: 0.13 * FACTOR_ESCALA_PROFUNDIDAD,
  z: Z_LOCAL,
};
const FACTOR_ACHICAR_BOTON = 0.8;
const ANCHO_BOTON = 0.18 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const ALTO_BOTON = 0.09 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const TAMANO_FUENTE = 84;

// Mismas 3 opciones/textos que pantalla-menu.js.
const OPCIONES = [
  { opcion: 'subtitulos', texto: 'Subtítulos' },
  { opcion: 'imagenes', texto: 'Imágenes' },
  { opcion: 'mapa', texto: 'Mapa conceptual' },
];

const ANCHO_BOTON_OPCION = ANCHO_BOTON;
const ALTO_BOTON_OPCION = ALTO_BOTON;
const TAMANO_FUENTE_OPCION = TAMANO_FUENTE;
const MARGEN_VERTICAL = 0.02 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const MARGEN_GRUPO = MARGEN_VERTICAL * 2.5;

// Misma velocidad de seguimiento que la versión vieja.
const VELOCIDAD_SEGUIMIENTO = 6;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea el botón de menú flotante junto con su desplegable de 3 opciones.
 * Tocar el botón principal alterna el desplegable; tocar una opción
 * (sólo mientras está abierto) llama a `onSeleccionarOpcion` una vez y
 * cierra el desplegable -- misma firma que la versión vieja.
 * @param {THREE.WebGLRenderer} renderer
 * @param {(opcion: 'subtitulos'|'imagenes'|'mapa') => void} onSeleccionarOpcion
 * @returns {THREE.Group} quien llama debe agregarlo con `escena.add(...)`
 *   y llamar a `grupo.actualizarUikit(deltaMs)` y
 *   `grupo.actualizarSeguimiento(camara, deltaSegundos)` una vez por
 *   cuadro (ver comentario grande de arriba). Expone `grupo.cerrarMenu()`
 *   igual que la versión vieja.
 */
export function crearBotonMenuFlotante(renderer, onSeleccionarOpcion) {
  const grupo = new THREE.Group();
  grupo.name = 'boton-menu-flotante';

  const botonPrincipal = crearPanelUikit([TEXTO_BOTON], {
    posicion: POSICION_LOCAL,
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE,
    nombre: 'boton-menu-flotante-principal',
    icono: 'menu',
    interactivo: true,
    negrita: true,
  });
  // Mismo motivo que la versión vieja (ver su comentario junto a
  // `depthWrite`): este HUD puede quedar a una profundidad similar a la
  // de contenido de mundo detrás (p. ej. pantalla-mapa.js) -- sin esto
  // el GPU no tiene con qué decidir cuál tapa a cuál.
  botonPrincipal.setProperties({ depthWrite: true });
  grupo.add(botonPrincipal);

  // Mismo motivo que la versión vieja: `grupo.visible` (controlado por
  // main.js según la pantalla activa) no alcanza para saber si el
  // desplegable está "abierto" por dentro.
  let desplegado = false;

  const botonesOpcion = OPCIONES.map(({ opcion, texto }, indice) => {
    const y =
      POSICION_LOCAL.y -
      ALTO_BOTON / 2 -
      MARGEN_GRUPO -
      ALTO_BOTON_OPCION / 2 -
      indice * (ALTO_BOTON_OPCION + MARGEN_VERTICAL);

    const botonOpcion = crearPanelUikit([texto], {
      posicion: { x: POSICION_LOCAL.x, y, z: POSICION_LOCAL.z },
      ancho: ANCHO_BOTON_OPCION,
      alto: ALTO_BOTON_OPCION,
      tamanoFuente: TAMANO_FUENTE_OPCION,
      nombre: `boton-menu-flotante-opcion-${opcion}`,
      icono: opcion,
      interactivo: true,
    });
    botonOpcion.userData.opcion = opcion;
    botonOpcion.visible = false;
    botonOpcion.setProperties({ depthWrite: true });
    grupo.add(botonOpcion);
    return botonOpcion;
  });

  function cerrarMenu() {
    desplegado = false;
    botonesOpcion.forEach((botonOpcion) => {
      botonOpcion.visible = false;
    });
  }

  enEventoSeleccion(renderer, (origen, direccion) => {
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactoPrincipal = raycaster.intersectObject(botonPrincipal, false);
    if (impactoPrincipal.length > 0) {
      desplegado = !desplegado;
      botonesOpcion.forEach((botonOpcion) => {
        botonOpcion.visible = desplegado;
      });
      return;
    }

    if (!desplegado) return;

    const impactosOpcion = raycaster.intersectObjects(botonesOpcion, false);
    if (impactosOpcion.length === 0) return;

    onSeleccionarOpcion(impactosOpcion[0].object.userData.opcion);
    cerrarMenu();
  });

  grupo.cerrarMenu = cerrarMenu;

  const paneles = [botonPrincipal, ...botonesOpcion];
  grupo.actualizarUikit = (deltaMs) => {
    paneles.forEach((panel) => panel.update(deltaMs));
  };

  // Seguimiento "con lag": misma fórmula que la versión vieja, pero
  // sobre un THREE.Group plano (ver el comentario grande de arriba) --
  // los botones de uikit, como hijos suyos, heredan el movimiento sin
  // ningún cálculo propio.
  grupo.actualizarSeguimiento = function actualizarSeguimientoHud(camara, deltaSegundos) {
    const t = 1 - Math.exp(-VELOCIDAD_SEGUIMIENTO * deltaSegundos);
    grupo.position.lerp(camara.position, t);
    grupo.quaternion.slerp(camara.quaternion, t);
  };

  return grupo;
}
