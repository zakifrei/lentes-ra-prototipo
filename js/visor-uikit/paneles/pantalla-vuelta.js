// Pantalla de "vuelta de la pausa" (visor-uikit, Tarea 3 del plan de
// migración, ver docs/superpowers/plans/2026-11-19-migracion-uikit.md):
// un panel de mensaje con 3 bloques de tamaños distintos (saludo grande
// en negrita, minutos mediano, temas guardados chico en ámbar) más dos
// botones ("Seguir con la clase" / "Ver un resumen rápido") -- mismos
// valores físicos que js/visor/paneles/pantalla-vuelta.js (leído como
// referencia).
//
// El panel de mensaje cambia en caliente (los minutos/temas reales recién
// se conocen cuando termina la pausa) -- a diferencia de la versión vieja,
// que redibujaba un canvas entero, acá alcanza con pisar la propiedad
// `text` de los 3 `Text` ya creados (`setProperties`, ver skills/
// pmndrs-uikit/SKILL.md del paquete): no hace falta volver a armar nada.

import * as THREE from '../../../vendor/three/three.module.js';
import { Text } from '@pmndrs/uikit';
import { crearContenedorUikit, crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO, COLOR_AMBAR_TEXTO } from '../ui-kit/tema-uikit.js';
import { armarLineasVuelta } from '../../common/temporizador-pausa.js';
import { enEventoSeleccion } from '../../visor/interaccion.js';
import { propiedadesFraunces } from '../ui-kit/fuente-uikit.js';

// Mismos 3 tamaños que pantalla-bienvenida.js, para que ambas pantallas
// de "bloques apilados" se vean consistentes entre sí.
const TAMANO_FUENTE_SALUDO = 80;
const TAMANO_FUENTE_MINUTOS = 46;
const TAMANO_FUENTE_TEMAS = 38;

// Mismos valores físicos que la versión vieja.
const ANCHO_PANEL_MENSAJE = 0.9;
const ALTO_PANEL_MENSAJE = 0.45;
const POSICION_MENSAJE = { x: 0, y: 1.3, z: -1.8 };

const ANCHO_BOTON = 0.5;
const ALTO_BOTON = 0.25;
const ALTURA_Y_BOTONES = 0.88;
const PROFUNDIDAD_Z_BOTONES = -1.8;
const SEPARACION_X = 0.35;
const TAMANO_FUENTE_BOTON = 76;

const TEXTO_BOTON_SEGUIR = 'Seguir con la clase';
const TEXTO_BOTON_RESUMEN = 'Ver un resumen rápido';

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea la pantalla de "vuelta de la pausa".
 *
 * No recibe `minutos`/`temas` por parámetro (misma firma que la versión
 * vieja, por el mismo motivo: ver su comentario grande) -- arranca con
 * `armarLineasVuelta(0, 0)` y expone `actualizarDatos(minutos, temas)`
 * para que main.js la llame con los datos reales justo antes de mostrar
 * esta pantalla.
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onSeguirClase
 * @param {() => void} onVerResumen
 * @returns {THREE.Object3D} grupo con `actualizarUikit(deltaMs)` y
 *   `actualizarDatos(minutos, temas)`
 */
export function crearPantallaVuelta(renderer, onSeguirClase, onVerResumen) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-vuelta';

  const { contenedor: panelMensaje } = crearContenedorUikit({
    posicion: POSICION_MENSAJE,
    ancho: ANCHO_PANEL_MENSAJE,
    alto: ALTO_PANEL_MENSAJE,
    nombre: 'pantalla-vuelta-mensaje',
    justifyContent: 'space-evenly',
  });

  const [lineaSaludo, lineaMinutos, lineaTemas] = armarLineasVuelta(0, 0);

  const textoSaludo = new Text({
    text: lineaSaludo,
    color: COLOR_TEXTO,
    fontSize: TAMANO_FUENTE_SALUDO,
    fontWeight: 'bold',
    // Fraunces (serif cálida) sólo para el título -- ver el comentario
    // grande de fuente-uikit.js (pedido vía /design-consultation).
    ...propiedadesFraunces(),
  });
  const textoMinutos = new Text({
    text: lineaMinutos,
    color: COLOR_TEXTO,
    fontSize: TAMANO_FUENTE_MINUTOS,
    fontWeight: 'normal',
  });
  const textoTemas = new Text({
    text: lineaTemas,
    color: COLOR_AMBAR_TEXTO,
    fontSize: TAMANO_FUENTE_TEMAS,
    fontWeight: 'normal',
  });
  panelMensaje.add(textoSaludo);
  panelMensaje.add(textoMinutos);
  panelMensaje.add(textoTemas);
  grupo.add(panelMensaje);

  grupo.actualizarDatos = function actualizarDatosPantallaVuelta(minutos, temas) {
    const [saludo, lineaMin, lineaTem] = armarLineasVuelta(minutos, temas);
    textoSaludo.setProperties({ text: saludo });
    textoMinutos.setProperties({ text: lineaMin });
    textoTemas.setProperties({ text: lineaTem });
  };

  // Botones: texto fijo, así que sí se apoyan en crearPanelUikit (a
  // diferencia del panel de mensaje de arriba, que necesita cambiar en
  // caliente).
  const botonSeguir = crearPanelUikit([TEXTO_BOTON_SEGUIR], {
    posicion: { x: -SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-vuelta-boton-seguir',
    icono: 'flecha',
    interactivo: true,
  });
  botonSeguir.userData.accion = 'seguir';
  grupo.add(botonSeguir);

  const botonResumen = crearPanelUikit([TEXTO_BOTON_RESUMEN], {
    posicion: { x: SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-vuelta-boton-resumen',
    icono: 'flecha',
    interactivo: true,
  });
  botonResumen.userData.accion = 'resumen';
  grupo.add(botonResumen);

  const botones = [botonSeguir, botonResumen];
  const paneles = [panelMensaje, botonSeguir, botonResumen];

  enEventoSeleccion(renderer, (origen, direccion) => {
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return;

    const accion = impactos[0].object.userData.accion;
    if (accion === 'seguir') onSeguirClase();
    else if (accion === 'resumen') onVerResumen();
  });

  grupo.actualizarUikit = (deltaMs) => {
    paneles.forEach((panel) => panel.update(deltaMs));
  };

  return grupo;
}
