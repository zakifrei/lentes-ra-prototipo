// Punto único de entrada para los eventos de "selección": el gesto que en
// RA dispara la mano (pellizco) o el control (gatillo) -- eventos
// 'selectstart'/'select'/'selectend' de la XRSession -- y que en la vista
// previa de escritorio dispara un click con el mouse sobre el canvas. Todo
// el proyecto debe detectar ese gesto a través de las funciones de este
// archivo: no debe existir un segundo camino de entrada en paralelo a éste
// (lo van a reutilizar, por ejemplo, los botones del menú y los botones de
// escala de imágenes en tareas futuras).
//
// Hay dos formas de consumir ese único mecanismo, según lo que necesite
// quien lo usa, pero las dos están armadas sobre la misma función privada
// `escucharFuentesDeSeleccion` (mismos listeners de bajo nivel):
// - `enEventoSeleccion`: gesto completo, dispara una sola vez (para taps
//   simples, como un botón de menú).
// - `enArrastreDeSeleccion`: seguimiento de un gesto sostenido (para
//   arrastrar algo). `habilitarArrastre`, acá abajo, es el ejemplo de uso.

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
 * Mecanismo de bajo nivel, privado, compartido por `enEventoSeleccion` y
 * `enArrastreDeSeleccion`: conecta los mismos eventos nativos (controles /
 * manos de WebXR, mouse de la vista previa) a los tres momentos posibles
 * de un gesto de selección.
 *
 * - `alPresionar(origen, direccion, contexto)` *(opcional)*: empieza el
 *   gesto -- `selectstart` del control/mano, `pointerdown` del mouse. Si
 *   devuelve `true`, "reclama" el gesto: para el mouse evita que el mismo
 *   click además dispare el orbit de `OrbitControls` (que escucha
 *   `pointerdown` sobre el mismo elemento).
 * - `alMover(origen, direccion, contexto)` *(opcional)*: el rayo de la
 *   fuente que está presionada se actualiza. En los controles/manos esto
 *   llega del evento `'move'` que `WebXRController.update()` despacha en
 *   *cada cuadro* de la sesión XR en el que esa fuente tiene una pose
 *   válida (`vendor/three/three.core.js`, línea ~14019) -- no hace falta
 *   que el usuario mueva la mano para que se dispare, con sostenerla ya
 *   alcanza. El mouse no tiene un evento por-cuadro equivalente (sólo se
 *   entera cuando el sistema operativo le avisa que se movió), así que se
 *   lo simula escuchando `pointermove`.
 * - `alSoltar(origen, direccion, contexto)` *(obligatorio)*: termina el
 *   gesto -- `selectend` del control/mano, `pointerup` del mouse (en
 *   `window`, para terminar igual si soltó fuera del canvas).
 *
 * `contexto.obtenerRayoActual()` devuelve el rayo *actual* de esa misma
 * fuente en cualquier momento posterior (no sólo en el instante del
 * evento que se está procesando); es la misma identidad de `contexto` en
 * los tres callbacks para una fuente dada, así que sirve para reconocer
 * "la misma mano/control/mouse que empezó el gesto" en `alSoltar`.
 *
 * @returns {() => void} función para des-registrar todos los listeners
 */
function escucharFuentesDeSeleccion(renderer, { alPresionar, alMover, alSoltar }) {
  const controladores = [renderer.xr.getController(0), renderer.xr.getController(1)];
  const manejadoresControlador = [];

  controladores.forEach((controlador) => {
    // Un `contexto` estable por controlador: así se puede reconocer, en
    // `alSoltar`, que es la misma fuente que iniciò el gesto.
    const contexto = {
      obtenerRayoActual: () => calcularRayoDeControlador(controlador),
    };

    const alSelectStart = () => {
      if (!alPresionar) return;
      const rayo = contexto.obtenerRayoActual();
      alPresionar(rayo.origen, rayo.direccion, contexto);
    };
    const alSelectEnd = () => {
      const rayo = contexto.obtenerRayoActual();
      alSoltar(rayo.origen, rayo.direccion, contexto);
    };
    const alMoverControlador = () => {
      const rayo = contexto.obtenerRayoActual();
      alMover(rayo.origen, rayo.direccion, contexto);
    };

    controlador.addEventListener('selectstart', alSelectStart);
    controlador.addEventListener('selectend', alSelectEnd);
    if (alMover) controlador.addEventListener('move', alMoverControlador);

    manejadoresControlador.push({ controlador, alSelectStart, alSelectEnd, alMoverControlador });
  });

  // Igual que para los controladores: un único `contexto` estable, para
  // poder comparar identidad entre el evento de inicio y el de fin.
  const contextoMouse = { obtenerRayoActual: calcularRayoDeMouse };

  function alMoverMouse(evento) {
    actualizarNdcMouseDesdeEvento(evento, renderer.domElement);
    if (!alMover || renderer.xr.isPresenting || !camaraVistaPrevia) return;
    const rayo = calcularRayoDeMouse();
    alMover(rayo.origen, rayo.direccion, contextoMouse);
  }

  function alPresionarMouse(evento) {
    // Durante una sesión de RA activa, el mouse no es un camino de
    // selección válido (ver constante global: un solo mecanismo por modo).
    if (!alPresionar || renderer.xr.isPresenting || !camaraVistaPrevia) return;

    actualizarNdcMouseDesdeEvento(evento, renderer.domElement);
    const rayo = calcularRayoDeMouse();
    const reclamado = alPresionar(rayo.origen, rayo.direccion, contextoMouse);

    if (reclamado) {
      evento.stopImmediatePropagation();
      evento.preventDefault();
    }
  }

  function alSoltarMouse() {
    if (renderer.xr.isPresenting || !camaraVistaPrevia) return;

    const rayo = calcularRayoDeMouse();
    alSoltar(rayo.origen, rayo.direccion, contextoMouse);
  }

  // 'pointerdown'/'pointermove' en el canvas, pero 'pointerup' en window:
  // si el usuario suelta el botón fuera del canvas el gesto tiene que
  // terminar igual, para no dejar nada "pegado".
  renderer.domElement.addEventListener('pointermove', alMoverMouse);
  renderer.domElement.addEventListener('pointerdown', alPresionarMouse);
  window.addEventListener('pointerup', alSoltarMouse);

  return function desregistrar() {
    manejadoresControlador.forEach(({ controlador, alSelectStart, alSelectEnd, alMoverControlador }) => {
      controlador.removeEventListener('selectstart', alSelectStart);
      controlador.removeEventListener('selectend', alSelectEnd);
      if (alMover) controlador.removeEventListener('move', alMoverControlador);
    });
    renderer.domElement.removeEventListener('pointermove', alMoverMouse);
    renderer.domElement.removeEventListener('pointerdown', alPresionarMouse);
    window.removeEventListener('pointerup', alSoltarMouse);
  };
}

/**
 * Registra `callback` para cada gesto de selección *completo* del
 * proyecto: pellizco de mano o gatillo de control en una sesión WebXR
 * ('selectend'), o click con el mouse sobre el canvas en la vista previa
 * de escritorio ('pointerup'). Es la fuente de selección de "un solo
 * disparo" del proyecto -- pensada para taps simples, como un botón de
 * menú, que no necesitan distinguir el inicio del gesto ni seguirlo
 * mientras se sostiene.
 *
 * Se llama exactamente una vez por gesto, en el momento en que termina (el
 * "tap" ya completo), como `callback(origen, direccion)`: el rayo de
 * selección en ese instante, como objetos planos `{x,y,z}` (no instancias
 * de `THREE.Vector3`, para no acoplar a quien escucha con Three.js).
 *
 * Si en cambio necesitás **seguir** el gesto mientras sigue sostenido (por
 * ejemplo para arrastrar algo), no uses esta función: usá
 * `enArrastreDeSeleccion`. Las dos comparten el mismo mecanismo de bajo
 * nivel (`escucharFuentesDeSeleccion`); no hay un segundo camino de
 * entrada paralelo.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {(origen:{x:number,y:number,z:number}, direccion:{x:number,y:number,z:number}) => void} callback
 * @returns {() => void} función para des-registrar el callback
 */
export function enEventoSeleccion(renderer, callback) {
  return escucharFuentesDeSeleccion(renderer, {
    alSoltar: (origen, direccion) => callback(origen, direccion),
  });
}

/**
 * Registra el seguimiento de un gesto de selección mientras se mantiene
 * sostenido (mano/control mantenidos, o mouse con el botón apretado).
 * Construida sobre el mismo mecanismo de bajo nivel que `enEventoSeleccion`
 * (ver `escucharFuentesDeSeleccion`): no agrega un camino de entrada nuevo,
 * sólo expone sus tres momentos (inicio / movimiento / fin) en vez de
 * colapsarlos en un solo disparo.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {{
 *   alIniciar: (origen:{x:number,y:number,z:number}, direccion:{x:number,y:number,z:number}, contexto:{obtenerRayoActual:Function}) => (boolean|void),
 *   alMover?: (origen:{x:number,y:number,z:number}, direccion:{x:number,y:number,z:number}, contexto:{obtenerRayoActual:Function}) => void,
 *   alTerminar: (origen:{x:number,y:number,z:number}, direccion:{x:number,y:number,z:number}, contexto:{obtenerRayoActual:Function}) => void,
 * }} manejadores
 * @returns {() => void} función para des-registrar
 */
export function enArrastreDeSeleccion(renderer, { alIniciar, alMover, alTerminar }) {
  return escucharFuentesDeSeleccion(renderer, {
    alPresionar: alIniciar,
    alMover,
    alSoltar: alTerminar,
  });
}

// Largo del indicador visual de apuntado: no necesita llegar hasta el
// objeto apuntado (eso ya lo resuelve el raycasting de `habilitarArrastre`),
// sólo dar una referencia clara de hacia dónde apunta la mano/control.
const LARGO_INDICADOR_DE_APUNTADO = 2;

/**
 * Crea un indicador visual ("rayo láser") que sigue automáticamente la
 * posición/orientación de cada mano o control durante una sesión WebXR
 * real -- ayuda al usuario a ver hacia dónde está apuntando, algo que el
 * mecanismo de selección (más arriba en este archivo) ya calcula pero
 * nunca dibujaba. Ambos controladores (`getController(0)`/`getController(1)`)
 * cubren indistintamente mano o control físico -- mismo criterio de "un
 * solo mecanismo" que usa el resto del archivo para selección: no hace
 * falta un camino aparte para `getHand()`, porque el target ray space que
 * expone `getController()` ya representa a cualquiera de los dos según el
 * input source real de la sesión.
 *
 * Cada rayo es un simple `THREE.Line` de dos puntos, del origen local del
 * controlador (0,0,0) hacia su -Z local -- misma convención que usa
 * `calcularRayoDeControlador`, arriba en este archivo, para el raycasting
 * lógico -- agregado como hijo del controlador para heredar su pose en
 * cada cuadro sin ningún cálculo manual.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @returns {THREE.Object3D} grupo con ambos controladores (ya con su rayo
 *   como hijo) agregado -- quien llama debe sumarlo a la escena para que
 *   Three.js actualice su pose en cada cuadro (`renderer.xr.getController`
 *   nunca se agrega solo: ver comentario de `calcularRayoDeControlador`).
 */
export function crearIndicadorDeApuntado(renderer) {
  const grupo = new THREE.Group();

  const geometriaRayo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -LARGO_INDICADOR_DE_APUNTADO),
  ]);
  // Ámbar cálido, acorde a la paleta del proyecto; opacidad moderada para
  // que sea una referencia de dirección y no un elemento invasivo.
  const materialRayo = new THREE.LineBasicMaterial({
    color: 0xffa040,
    transparent: true,
    opacity: 0.7,
  });

  [0, 1].forEach((indice) => {
    const controlador = renderer.xr.getController(indice);
    const rayo = new THREE.Line(geometriaRayo, materialRayo);
    controlador.add(rayo);
    grupo.add(controlador);
  });

  return grupo;
}

const raycasterArrastre = new THREE.Raycaster();
const vectorOrigenArrastre = new THREE.Vector3();
const vectorDireccionArrastre = new THREE.Vector3();

/**
 * true si `objeto` y todos sus ancestros están visibles. El raycasting de
 * Three.js no filtra por `.visible`, así que sin esto se podía agarrar el
 * panel de una pantalla oculta que estuviera en el mismo lugar que la
 * pantalla activa.
 * @param {THREE.Object3D} objeto
 * @returns {boolean}
 */
function estaVisibleEnMundo(objeto) {
  for (let actual = objeto; actual; actual = actual.parent) {
    if (!actual.visible) return false;
  }
  return true;
}

/**
 * Habilita el arrastre de `objetoAMover`: mientras está agarrado
 * (seleccionado y mantenido, con la mano, el control o el mouse, vía
 * `enArrastreDeSeleccion`), lo mueve siguiendo el rayo de selección -- a la
 * misma distancia del origen a la que estaba cuando se lo agarró, y
 * manteniendo el punto de agarre bajo el rayo (no salta al centro) -- y
 * aplica `limitarPosicion` cada vez que el rayo se actualiza (en RA, en
 * cada cuadro de la sesión; en escritorio, en cada movimiento del mouse).
 *
 * `objetoParaTocar` (el blanco del raycasting que detecta el agarre) y
 * `objetoAMover` (a quien se le pisa `.position`) son parámetros separados
 * a propósito -- si fueran el mismo objeto y ese objeto tuviera hijos
 * "de control" colgando (por ejemplo, botones "+"/"-" integrados para que
 * se muevan juntos), el raycasting recursivo del agarre (`intersectObject`
 * con `recursive:true`) agarraría el panel entero al tocar uno de esos
 * hijos, moviéndolo sin querer (bug real encontrado y evitado desde la
 * Tarea 9 -- ver pantalla-imagenes.js/pantalla-subtitulos.js: ambas pasan
 * acá el MESH/PANEL de contenido como `objetoParaTocar`, pero un grupo
 * contenedor -- que sí incluye los botones como hijos, para que se muevan
 * solos con él -- como `objetoAMover`).
 *
 * `objetoAMover.position` se interpreta en el espacio local de SU padre:
 * quien llama debe asegurarse de que ese padre esté en el origen del mundo
 * sin rotación/escala (como ya pasa con los `grupo` de nivel superior de
 * cada pantalla), para que las coordenadas de mundo que calcula el
 * seguimiento del rayo sigan siendo válidas como posición local.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Object3D} objetoParaTocar
 * @param {THREE.Object3D} objetoAMover
 * @param {{x:[number,number],y:[number,number],z:[number,number]}} limites
 * @returns {() => void} función para deshabilitar el arrastre
 */
export function habilitarArrastre(renderer, objetoParaTocar, objetoAMover, limites) {
  // Mientras está agarrado: de qué fuente (contexto) vino el agarre, y a
  // qué distancia del origen del rayo estaba el objeto en ese momento.
  let agarre = null;

  // `desfase`: distancia entre el punto donde el rayo tocó el objeto y su
  // `.position`, fijada al agarrarlo. Sin esto el centro del objeto saltaba
  // hasta el rayo -- casi imperceptible en un panel chico, pero un salto
  // de más de medio metro al agarrar de una punta un panel grande como el
  // del resumen (pantalla-resumen.js).
  function moverObjetoSiguiendoRayo(origen, direccion, distancia, desfase) {
    vectorDireccionArrastre.set(direccion.x, direccion.y, direccion.z).normalize();

    const posicionSeguida = {
      x: origen.x + vectorDireccionArrastre.x * distancia + desfase.x,
      y: origen.y + vectorDireccionArrastre.y * distancia + desfase.y,
      z: origen.z + vectorDireccionArrastre.z * distancia + desfase.z,
    };

    const posicionLimitada = limitarPosicion(posicionSeguida, limites);
    objetoAMover.position.set(posicionLimitada.x, posicionLimitada.y, posicionLimitada.z);
  }

  return enArrastreDeSeleccion(renderer, {
    alIniciar(origen, direccion, contexto) {
      if (agarre) return false; // ya está agarrado por otra fuente: ignorar
      if (!estaVisibleEnMundo(objetoParaTocar)) return false; // pantalla oculta

      vectorOrigenArrastre.set(origen.x, origen.y, origen.z);
      vectorDireccionArrastre.set(direccion.x, direccion.y, direccion.z).normalize();
      raycasterArrastre.set(vectorOrigenArrastre, vectorDireccionArrastre);

      const impactos = raycasterArrastre.intersectObject(objetoParaTocar, true);
      if (impactos.length === 0) return false; // el rayo no tocó el panel

      const { point: puntoTocado } = impactos[0];
      agarre = {
        contexto,
        distancia: impactos[0].distance,
        desfase: {
          x: objetoAMover.position.x - puntoTocado.x,
          y: objetoAMover.position.y - puntoTocado.y,
          z: objetoAMover.position.z - puntoTocado.z,
        },
      };
      moverObjetoSiguiendoRayo(origen, direccion, agarre.distancia, agarre.desfase);
      return true; // reclama el gesto (ver escucharFuentesDeSeleccion)
    },

    alMover(origen, direccion, contexto) {
      if (!agarre || agarre.contexto !== contexto) return;
      moverObjetoSiguiendoRayo(origen, direccion, agarre.distancia, agarre.desfase);
    },

    alTerminar(origen, direccion, contexto) {
      // Sólo libera si quien suelta es quien lo agarró.
      if (agarre && agarre.contexto === contexto) {
        agarre = null;
      }
    },
  });
}
