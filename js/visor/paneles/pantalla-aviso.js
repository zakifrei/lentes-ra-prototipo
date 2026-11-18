// Pantalla de aviso de atención: se muestra cuando el sistema detecta que
// los niveles de atención del usuario bajaron, disparada por el botón
// "Disparar aviso" del panel real del observador (Tarea 17). El panel de
// mensaje es un wrapper fino sobre `panel-texto.js`, igual que
// bienvenida/reconocimiento -- pero a partir de la Tarea 24 (feedback real
// en el Quest) esta pantalla deja de tener una sola acción implícita y pasa
// a tener dos botones reales ("Sí, pausar" / "Seguir sin pausar"), mismo
// patrón de `botones`/`userData.accion`/raycasting que pantalla-vuelta.js.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion } from '../interaccion.js';

const TEXTO_AVISO = 'Notamos que tus niveles de atención disminuyeron. ¿Querés ayuda?';

// Un poco más grande que el default de panel-texto.js (48): pulido visual,
// a pedido del dueño del proyecto, para que los carteles de texto se lean
// mejor -- igual criterio que pantalla-reconocimiento.js/pantalla-finalizada.js.
const TAMANO_FUENTE_MENSAJE = 54;

const TEXTO_BOTON_ACEPTAR = 'Sí, pausar';
const TEXTO_BOTON_RECHAZAR = 'Seguir sin pausar';

// Tamaños y posición física de los botones (metros, RA). El panel de
// mensaje usa la posición/tamaño por defecto de panel-texto.js
// (POSICION_POR_DEFECTO = {x:0,y:1.1,z:-1.8}, 0.8m x 0.4m), así que ocupa
// de y=0.9 a y=1.3 -- los botones van debajo, centrados en y=0.65 (0.5 a
// 0.8), dejando ~0.1 m de aire contra el borde inferior del mensaje (mismo
// criterio de separación que pantalla-vuelta.js).
const ANCHO_BOTON = 0.6;
const ALTO_BOTON = 0.3;
const ALTURA_Y_BOTONES = 0.65;
const PROFUNDIDAD_Z_BOTONES = -1.8;
// Separación horizontal entre centros de botones: con ANCHO_BOTON = 0.6
// deja ~0.1 m de aire entre bordes (mismo criterio que pantalla-menu.js/
// pantalla-vuelta.js), para que no se puedan tocar por error.
const SEPARACION_X = 0.35;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea la pantalla de aviso de atención: un panel de mensaje fijo más dos
 * botones ("Sí, pausar" / "Seguir sin pausar"). Al completarse un gesto de
 * selección completo (pellizco, gatillo o click) sobre uno de los botones
 * mientras esta pantalla está visible, llama a `onAceptar` u `onRechazar`
 * según corresponda, una sola vez (mismo comportamiento de "un solo disparo
 * por gesto" de `enEventoSeleccion`: no hace falta des-duplicar acá).
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} onAceptar llamado al tocar "Sí, pausar"
 * @param {() => void} onRechazar llamado al tocar "Seguir sin pausar"
 * @returns {THREE.Object3D}
 */
export function crearPantallaAviso(renderer, onAceptar, onRechazar) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-aviso';

  const panelMensaje = crearPanelTexto([TEXTO_AVISO], {
    nombre: 'pantalla-aviso-mensaje',
    tamanoFuente: TAMANO_FUENTE_MENSAJE,
  });
  grupo.add(panelMensaje);

  const botonAceptar = crearPanelTexto([TEXTO_BOTON_ACEPTAR], {
    posicion: { x: -SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-aviso-boton-aceptar',
    icono: 'aceptar',
    interactivo: true,
  });
  botonAceptar.userData.accion = 'aceptar';
  grupo.add(botonAceptar);

  const botonRechazar = crearPanelTexto([TEXTO_BOTON_RECHAZAR], {
    posicion: { x: SEPARACION_X, y: ALTURA_Y_BOTONES, z: PROFUNDIDAD_Z_BOTONES },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    nombre: 'pantalla-aviso-boton-rechazar',
    icono: 'rechazar',
    interactivo: true,
  });
  botonRechazar.userData.accion = 'rechazar';
  grupo.add(botonRechazar);

  const botones = [botonAceptar, botonRechazar];

  enEventoSeleccion(renderer, (origen, direccion) => {
    // El raycasting de Three.js no filtra por `.visible` (sólo por
    // `layers`): si esta pantalla no es la activa, hay que ignorar el
    // gesto a mano, o sus botones "fantasma" capturarían clicks pensados
    // para la pantalla que sí se está mostrando (mismo criterio que
    // pantalla-menu.js/pantalla-vuelta.js).
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return; // no tocó ningún botón: no hacer nada

    const accion = impactos[0].object.userData.accion;
    if (accion === 'aceptar') onAceptar();
    else if (accion === 'rechazar') onRechazar();
  });

  return grupo;
}
