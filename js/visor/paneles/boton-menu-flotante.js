// Botón de menú flotante (Tarea 25): a diferencia de TODOS los demás
// paneles del proyecto -- fijos en el espacio del MUNDO (world space), y que
// por lo tanto quedan atrás si el usuario gira la cabeza -- éste es un HUD
// real. Quien llama (`main.js`) debe agregarlo como hijo de la CÁMARA
// (`camara.add(...)`), nunca de `escena`: así su posición se interpreta en
// coordenadas LOCALES a la cámara y se mantiene siempre en la misma esquina
// de la vista, sin importar hacia dónde mire el usuario. Surge de que el
// dueño del proyecto probó el flujo real en el Quest y quiso poder volver al
// menú desde cualquier pantalla sin depender de hacia dónde esté mirando.
//
// Reutiliza `crearPanelTexto` igual que el resto de los botones del
// proyecto, y el mismo mecanismo único de selección de `interaccion.js`
// (`enEventoSeleccion`) -- mismo patrón de raycasting que
// pantalla-aviso.js/pantalla-vuelta.js/pantalla-menu.js.
//
// Tarea de ajuste UX (feedback en vivo del Quest real): tocar este botón ya
// NO navega directo a la pantalla de menú centrada (`pantalla-menu.js`,
// pensada para cuando el panel del observador manda a 'menu', y que sigue
// existiendo igual para eso) -- esa pantalla tapa el centro del campo
// visual, justo lo que este acceso directo quiere evitar. En cambio, el
// botón principal abre/cierra un desplegable chico DEBAJO de sí mismo, con
// las mismas 3 opciones de `pantalla-menu.js` (mismo contrato
// `onSeleccionarOpcion('subtitulos'|'imagenes'|'mapa')`, reutilizando
// `crearPanelTexto` para cada botón de opción), así el usuario elige sin que
// nada tape el centro.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion } from '../interaccion.js';

const TEXTO_BOTON = 'Menú';

// Coordenadas LOCALES a la cámara (no del mundo): +X a la derecha, +Y hacia
// arriba, -Z hacia adelante (misma convención que usa Three.js para
// cualquier cámara). z=-0.5 (medio metro) en vez de los -1.6 a -1.9 m en los
// que viven el resto de los paneles del proyecto -- a propósito, para que el
// botón quede "pegado" a la esquina sin competir con el contenido
// principal. Por la misma razón, el tamaño físico de abajo es bastante más
// chico que el de los botones normales (ANCHO_BOTON/ALTO_BOTON = 0.6x0.3 a
// z=-1.8 en pantalla-aviso.js/pantalla-vuelta.js): a esta distancia mucho
// más corta, ese mismo tamaño físico tapiaría buena parte del campo visual
// (el campo visual cubierto por un panel de tamaño fijo crece cuanto más
// cerca está de la cámara).
//
// `y` NEGATIVO a propósito (feedback en vivo del Quest real): todo el
// resto del contenido del proyecto vive por DEBAJO de la altura de ojos
// (ver panel-texto.js/POSICION_POR_DEFECTO.y=1.1 con los ojos a ~1.6m, a
// 1.8m de distancia: un ángulo de atan(0.5/1.8)≈15.5° bajo la mirada al
// frente) -- con `y` positivo acá, este botón quedaba arriba del centro,
// en la dirección contraria a donde aparece todo lo demás, y se sentía
// "muy encima" del usuario aunque el valor en metros fuera chico. El
// valor final (y=-0.12 a z=-0.5, ≈13.5° hacia abajo) salió de ajustar a
// ojo en el Quest real, no de aplicar la fórmula exacta -- queda cerca
// del mismo ángulo que el resto de los paneles, sin pretender igualarlo
// al grado.
const POSICION_LOCAL = { x: 0.18, y: -0.12, z: -0.5 };
const ANCHO_BOTON = 0.18;
const ALTO_BOTON = 0.09;
// Más grande que el TAMANO_FUENTE_POR_DEFECTO (48) de panel-texto.js: el
// texto "Menú" es corto y el panel chico, así que conviene aprovechar el
// espacio disponible del canvas para que siga siendo legible aun con el
// panel reducido de arriba.
const TAMANO_FUENTE = 64;

// Mismas 3 opciones/textos que pantalla-menu.js (mismo contrato
// `onSeleccionarOpcion`) -- no se reinventa ese listado acá.
const OPCIONES = [
  { opcion: 'subtitulos', texto: 'Subtítulos' },
  { opcion: 'imagenes', texto: 'Imágenes' },
  { opcion: 'mapa', texto: 'Mapa conceptual' },
];

// Tamaño de los 3 botones del desplegable: más anchos que el botón
// principal (hace falta para que "Mapa conceptual" entre sin achicarse
// demasiado), pero bastante más chicos que los de pantalla-menu.js (que sí
// pueden ocupar buena parte del campo visual porque son el contenido
// principal de esa pantalla) -- este desplegable vive pegado al HUD, a la
// misma distancia corta (z) que el botón principal, y no debe tapar el
// centro.
const ANCHO_BOTON_OPCION = 0.3;
const ALTO_BOTON_OPCION = 0.1;
const TAMANO_FUENTE_OPCION = 36;
// Separación vertical entre el borde de un botón y el siguiente (principal
// incluido): nunca pegados entre sí, para no tocar el de al lado por error.
const MARGEN_VERTICAL = 0.02;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea el botón de menú flotante junto con su desplegable de 3 opciones,
 * pensado para agregarse como hijo de la CÁMARA (no de la escena) desde
 * `main.js`. Tocar el botón principal alterna el desplegable (abierto <->
 * cerrado) sin navegar a ningún lado; tocar una de las 3 opciones del
 * desplegable (sólo mientras está abierto) llama a `onSeleccionarOpcion` una
 * vez y cierra el desplegable.
 * @param {THREE.WebGLRenderer} renderer
 * @param {(opcion: 'subtitulos'|'imagenes'|'mapa') => void} onSeleccionarOpcion
 * @returns {THREE.Group} quien llama debe agregarlo con `camara.add(...)`.
 *   Expone `grupo.cerrarMenu()` para que `main.js` pueda forzar el cierre
 *   del desplegable desde afuera (ver comentario junto a `cerrarMenu` abajo).
 */
export function crearBotonMenuFlotante(renderer, onSeleccionarOpcion) {
  const grupo = new THREE.Group();
  grupo.name = 'boton-menu-flotante';

  const botonPrincipal = crearPanelTexto([TEXTO_BOTON], {
    posicion: POSICION_LOCAL,
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE,
    nombre: 'boton-menu-flotante-principal',
    icono: 'menu',
  });
  grupo.add(botonPrincipal);

  // Estado del desplegable: no alcanza con mirar `.visible` de los botones
  // de opción para saber si está "abierto", porque `main.js` también apaga
  // `grupo.visible` entero en 'aviso'/'pausa' (ver `actualizarPantallaVisible`)
  // -- sin esta variable propia, el desplegable podría quedar marcado como
  // abierto por dentro (aunque oculto por ese toggle general) y reaparecer
  // abierto la próxima vez que el botón vuelva a mostrarse.
  let desplegado = false;

  // Apilados verticalmente ARRIBA del botón principal (no debajo), en
  // coordenadas locales de cámara (mismo x/z que el botón principal).
  // Desde que `POSICION_LOCAL.y` pasó a ser negativo (el botón bajó para
  // quedar "a la altura" del resto del contenido, ver el comentario junto
  // a esa constante), abrir el desplegable hacia abajo sacaría al tercer
  // botón fuera del campo visual (a z=-0.5, el semi-alto visible es de
  // apenas ~0.35m) -- hacia arriba, en cambio, hay margen de sobra hasta
  // el centro de la vista. Arrancan ocultos: sólo se muestran mientras
  // `desplegado` es true.
  const botonesOpcion = OPCIONES.map(({ opcion, texto }, indice) => {
    const y =
      POSICION_LOCAL.y +
      ALTO_BOTON / 2 +
      MARGEN_VERTICAL +
      ALTO_BOTON_OPCION / 2 +
      indice * (ALTO_BOTON_OPCION + MARGEN_VERTICAL);

    const botonOpcion = crearPanelTexto([texto], {
      posicion: { x: POSICION_LOCAL.x, y, z: POSICION_LOCAL.z },
      ancho: ANCHO_BOTON_OPCION,
      alto: ALTO_BOTON_OPCION,
      tamanoFuente: TAMANO_FUENTE_OPCION,
      nombre: `boton-menu-flotante-opcion-${opcion}`,
      icono: opcion,
    });
    botonOpcion.userData.opcion = opcion;
    botonOpcion.visible = false;
    grupo.add(botonOpcion);
    return botonOpcion;
  });

  // Fuerza el cierre desde afuera (la usa `main.js`, ver comentario junto a
  // `desplegado` arriba): cuando el observador navega a cualquier pantalla
  // desde su panel mientras el desplegable estaba abierto, conviene
  // cerrarlo solo en vez de dejarlo "abierto" de forma inconsistente.
  function cerrarMenu() {
    desplegado = false;
    botonesOpcion.forEach((botonOpcion) => {
      botonOpcion.visible = false;
    });
  }

  enEventoSeleccion(renderer, (origen, direccion) => {
    // El raycasting de Three.js no filtra por `.visible` (sólo por
    // `layers`): si el grupo entero no está visible, hay que ignorar el
    // gesto a mano, o capturaría clicks aunque esté oculto -- mismo
    // criterio que pantalla-aviso.js/pantalla-menu.js/pantalla-vuelta.js.
    // Acá "visible" lo controla `main.js` según la pantalla activa
    // (`actualizarPantallaVisible`), no un criterio propio de este archivo.
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

    // El desplegable está cerrado: ni vale la pena hacer el raycast contra
    // sus 3 botones (aunque Three.js lo haría igual, visibles o no -- ver
    // comentario de arriba), para no capturar gestos pensados para otra
    // pantalla mientras este desplegable no está abierto.
    if (!desplegado) return;

    const impactosOpcion = raycaster.intersectObjects(botonesOpcion, false);
    if (impactosOpcion.length === 0) return; // no tocó ninguna opción

    onSeleccionarOpcion(impactosOpcion[0].object.userData.opcion);
    cerrarMenu();
  });

  grupo.cerrarMenu = cerrarMenu;

  return grupo;
}
