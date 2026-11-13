// Punto único de entrada para los eventos de "selección": el gesto que en
// RA dispara la mano (pellizco) o el control (gatillo) -- eventos
// 'selectstart'/'selectend' de la XRSession -- y que en la vista previa de
// escritorio dispara un click con el mouse sobre el canvas. Todo el
// proyecto debe detectar ese gesto a través de `enEventoSeleccion`: no debe
// existir un segundo camino de entrada en paralelo a éste (lo van a
// reutilizar, por ejemplo, los botones del menú y los botones de escala de
// imágenes en tareas futuras).
//
// `habilitarArrastre` está construida encima de `enEventoSeleccion`: no
// agrega un mecanismo de selección nuevo, sólo decide -- con un raycast --
// si el gesto empezó sobre el objeto que hay que arrastrar, y lo mueve
// mientras sigue agarrado.

import * as THREE from '../../vendor/three/three.module.js';
import { limitarPosicion } from '../common/arrastre.js';

// Cámara usada únicamente para transformar la posición del mouse en un rayo
// 3D durante la vista previa de escritorio (en RA el rayo sale directo del
// espacio del control/mano: no hace falta cámara para eso). Se fija una
// sola vez desde main.js, antes de que el usuario pueda hacer click.
let camaraVistaPrevia = null;

/**
 * Define qué cámara usar para convertir la posición del mouse en un rayo 3D
 * durante la vista previa de escritorio. Llamar una sola vez al arrancar la
 * app (ver `js/visor/main.js`).
 * @param {THREE.Camera} camara
 */
export function establecerCamaraVistaPrevia(camara) {
  camaraVistaPrevia = camara;
}

const raycasterMouse = new THREE.Raycaster();
const ndcMouse = new THREE.Vector2();
const vectorOrigenControlador = new THREE.Vector3();
const vectorDireccionControlador = new THREE.Vector3();

function vector3APlano(v) {
  return { x: v.x, y: v.y, z: v.z };
}

// El rayo de un control/mano sale de su posición y apunta en su -Z local
// (misma convención que usan los ejemplos de Three.js para WebXR). Hace
// falta `updateMatrixWorld()` porque estos espacios (`getController`) nunca
// se agregan a la escena: su `matrixWorld` sólo se recalcula a pedido.
function calcularRayoDeControlador(controlador) {
  controlador.updateMatrixWorld();
  vectorOrigenControlador.setFromMatrixPosition(controlador.matrixWorld);
  vectorDireccionControlador
    .set(0, 0, -1)
    .transformDirection(controlador.matrixWorld)
    .normalize();

  return {
    origen: vector3APlano(vectorOrigenControlador),
    direccion: vector3APlano(vectorDireccionControlador),
  };
}

function actualizarNdcMouseDesdeEvento(evento, domElement) {
  const rect = domElement.getBoundingClientRect();
  ndcMouse.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
  ndcMouse.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
}

function calcularRayoDeMouse() {
  raycasterMouse.setFromCamera(ndcMouse, camaraVistaPrevia);
  return {
    origen: vector3APlano(raycasterMouse.ray.origin),
    direccion: vector3APlano(raycasterMouse.ray.direction),
  };
}

/**
 * Registra `callback` para cada evento de selección del proyecto: pellizco
 * de mano o gatillo de control en una sesión WebXR ('selectstart' /
 * 'selectend', sobre cualquiera de los dos controles/manos), o click con el
 * mouse sobre el canvas en la vista previa de escritorio ('pointerdown' /
 * 'pointerup'). Es la única fuente de eventos de selección del proyecto.
 *
 * `callback` se invoca como `callback(origen, direccion, fase, contexto)`:
 * - `origen` y `direccion` describen el rayo de selección en el momento
 *   del evento, como objetos planos `{x,y,z}` (no instancias de
 *   `THREE.Vector3`, para no acoplar a quien escucha con Three.js).
 * - `fase` es `'inicio'` (empieza el gesto: selectstart / pointerdown) o
 *   `'fin'` (termina: selectend / pointerup).
 * - `contexto.obtenerRayoActual()` devuelve el rayo *actual* de esa misma
 *   fuente (el mismo control/mano o el mismo mouse) en cualquier momento
 *   posterior, no sólo en el instante del evento. Pensado para usarse en
 *   cada frame mientras el gesto sigue activo, ya que WebXR no tiene un
 *   evento de "select" continuo (`habilitarArrastre`, más abajo, es el
 *   ejemplo de uso).
 * - Si `callback` devuelve `true` en `fase: 'inicio'`, "reclama" el gesto:
 *   para el mouse, evita que el mismo click además dispare el orbit de
 *   `OrbitControls` (ver `js/vista-previa/control-mouse.js`), que escucha
 *   'pointerdown' sobre el mismo elemento.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {(origen:{x:number,y:number,z:number}, direccion:{x:number,y:number,z:number}, fase:('inicio'|'fin'), contexto:{obtenerRayoActual:() => {origen:{x:number,y:number,z:number},direccion:{x:number,y:number,z:number}}}) => (boolean|void)} callback
 * @returns {() => void} función para des-registrar el callback
 */
export function enEventoSeleccion(renderer, callback) {
  const controladores = [renderer.xr.getController(0), renderer.xr.getController(1)];
  const manejadoresControlador = [];

  controladores.forEach((controlador) => {
    // Un `contexto` estable por controlador: así `habilitarArrastre` puede
    // reconocer, en el evento 'fin', que es la misma fuente que lo agarró.
    const contexto = {
      obtenerRayoActual: () => calcularRayoDeControlador(controlador),
    };

    const alIniciar = () => {
      const rayo = contexto.obtenerRayoActual();
      callback(rayo.origen, rayo.direccion, 'inicio', contexto);
    };
    const alTerminar = () => {
      const rayo = contexto.obtenerRayoActual();
      callback(rayo.origen, rayo.direccion, 'fin', contexto);
    };

    controlador.addEventListener('selectstart', alIniciar);
    controlador.addEventListener('selectend', alTerminar);

    manejadoresControlador.push({ controlador, alIniciar, alTerminar });
  });

  // Igual que para los controladores: un único `contexto` estable, para
  // poder comparar identidad entre el evento de inicio y el de fin.
  const contextoMouse = { obtenerRayoActual: calcularRayoDeMouse };

  function alMoverMouse(evento) {
    actualizarNdcMouseDesdeEvento(evento, renderer.domElement);
  }

  function alPresionarMouse(evento) {
    // Durante una sesión de RA activa, el mouse no es un camino de
    // selección válido (ver constante global: un solo mecanismo por modo).
    if (renderer.xr.isPresenting || !camaraVistaPrevia) return;

    actualizarNdcMouseDesdeEvento(evento, renderer.domElement);
    const rayo = calcularRayoDeMouse();
    const reclamado = callback(rayo.origen, rayo.direccion, 'inicio', contextoMouse);

    if (reclamado) {
      evento.stopImmediatePropagation();
      evento.preventDefault();
    }
  }

  function alSoltarMouse() {
    if (renderer.xr.isPresenting || !camaraVistaPrevia) return;

    const rayo = calcularRayoDeMouse();
    callback(rayo.origen, rayo.direccion, 'fin', contextoMouse);
  }

  // 'pointerdown' en el canvas (para saber dónde arrancó el click), pero
  // 'pointerup' en window: si el usuario suelta el botón fuera del canvas
  // el arrastre tiene que terminar igual, para no dejar nada "pegado".
  renderer.domElement.addEventListener('pointermove', alMoverMouse);
  renderer.domElement.addEventListener('pointerdown', alPresionarMouse);
  window.addEventListener('pointerup', alSoltarMouse);

  return function desregistrar() {
    manejadoresControlador.forEach(({ controlador, alIniciar, alTerminar }) => {
      controlador.removeEventListener('selectstart', alIniciar);
      controlador.removeEventListener('selectend', alTerminar);
    });
    renderer.domElement.removeEventListener('pointermove', alMoverMouse);
    renderer.domElement.removeEventListener('pointerdown', alPresionarMouse);
    window.removeEventListener('pointerup', alSoltarMouse);
  };
}

const raycasterArrastre = new THREE.Raycaster();
const vectorOrigenArrastre = new THREE.Vector3();
const vectorDireccionArrastre = new THREE.Vector3();

/**
 * Habilita el arrastre de `objeto`: mientras está agarrado (seleccionado y
 * mantenido, con la mano, el control o el mouse, vía `enEventoSeleccion`),
 * lo mueve siguiendo el rayo de selección -- a la misma distancia del
 * origen a la que estaba cuando se lo agarró -- y aplica `limitarPosicion`
 * en cada frame.
 *
 * El "cada frame" se logra con `objeto.onBeforeRender`, que Three.js llama
 * justo antes de dibujar el objeto en cada cuadro (en RA y en escritorio
 * por igual), sin depender del bucle de animación de `main.js`.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Object3D} objeto
 * @param {{x:[number,number],y:[number,number],z:[number,number]}} limites
 * @returns {() => void} función para deshabilitar el arrastre
 */
export function habilitarArrastre(renderer, objeto, limites) {
  // Mientras está agarrado: de qué fuente (contexto) vino el agarre, y a
  // qué distancia del origen del rayo estaba el objeto en ese momento.
  let agarre = null;

  const desregistrar = enEventoSeleccion(renderer, (origen, direccion, fase, contexto) => {
    if (fase === 'inicio') {
      if (agarre) return false; // ya está agarrado por otra fuente: ignorar

      vectorOrigenArrastre.set(origen.x, origen.y, origen.z);
      vectorDireccionArrastre.set(direccion.x, direccion.y, direccion.z).normalize();
      raycasterArrastre.set(vectorOrigenArrastre, vectorDireccionArrastre);

      const impactos = raycasterArrastre.intersectObject(objeto, true);
      if (impactos.length === 0) return false; // el rayo no tocó el panel

      agarre = { obtenerRayoActual: contexto.obtenerRayoActual, distancia: impactos[0].distance };
      return true; // reclama el gesto (ver enEventoSeleccion)
    }

    // fase === 'fin': sólo libera si quien suelta es quien lo agarró.
    if (agarre && agarre.obtenerRayoActual === contexto.obtenerRayoActual) {
      agarre = null;
    }
  });

  objeto.onBeforeRender = () => {
    if (!agarre) return;

    const rayo = agarre.obtenerRayoActual();
    vectorDireccionArrastre.set(rayo.direccion.x, rayo.direccion.y, rayo.direccion.z).normalize();

    const posicionSeguida = {
      x: rayo.origen.x + vectorDireccionArrastre.x * agarre.distancia,
      y: rayo.origen.y + vectorDireccionArrastre.y * agarre.distancia,
      z: rayo.origen.z + vectorDireccionArrastre.z * agarre.distancia,
    };

    const posicionLimitada = limitarPosicion(posicionSeguida, limites);
    objeto.position.set(posicionLimitada.x, posicionLimitada.y, posicionLimitada.z);
  };

  return function deshabilitarArrastre() {
    desregistrar();
    objeto.onBeforeRender = () => {};
    agarre = null;
  };
}
