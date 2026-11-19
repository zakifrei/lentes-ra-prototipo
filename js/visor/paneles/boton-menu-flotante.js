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
// cualquier cámara).
//
// Posición en la esquina (x positivo, y positivo = arriba a la derecha):
// esto SIEMPRE estuvo bien (feedback en vivo del Quest real, confirmado dos
// veces) -- lo que se sentía mal no era la altura en pantalla, era que el
// botón quedaba demasiado CERCA de la cara (z=-0.5, medio metro) comparado
// con los 1.6-1.9m en los que vive el resto del contenido del proyecto, y
// esa cercanía exagerada se percibía como algo plantado "encima" del
// usuario. La fórmula anterior intentó arreglar esto moviendo `y` a
// negativo (abajo), pero el problema nunca fue la altura: era la
// profundidad. Ahora z pasa a -1.8 (misma profundidad que
// panel-texto.js/POSICION_POR_DEFECTO y el resto de las pantallas), y para
// que el botón siga viéndose en el MISMO lugar de la pantalla y con el
// MISMO tamaño aparente que antes (no más chico por estar más lejos), x/y
// y todas las medidas físicas de abajo se escalan por el mismo factor que
// la profundidad (1.8 / 0.5 = 3.6x): más lejos, pero ocupando el mismo
// ángulo de visión que antes, sólo que ahora a una distancia cómoda como el
// resto del contenido. El tamaño de fuente (en píxeles de canvas, ver
// panel-texto.js) no necesita tocarse: al escalar posición y tamaño físico
// por el mismo factor, la nitidez en pantalla queda igual.
const FACTOR_ESCALA_PROFUNDIDAD = 3.6; // 1.8m / 0.5m
// z propio, un poco más cerca que el resto del contenido del mundo (-1.8,
// ver POSICION_POR_DEFECTO en panel-texto.js): revisión de diseño
// 2026-11-18 -- con el mismo z que las pantallas de fondo (p. ej. las 3
// columnas de pantalla-mapa.js), el desplegable y el contenido detrás
// terminaban a la MISMA profundidad, y como ambos usan material
// transparent+depthWrite:false (ver dibujarFondoPanel), el GPU no tenía con
// qué decidir cuál tapa a cuál: se veían mezclados/traslúcidos en vez de que
// el desplegable tape limpiamente lo de atrás (confirmado con una captura
// real sobre pantalla-mapa.js). 0.2 m más cerca alcanza para desambiguar sin
// cambiar `FACTOR_ESCALA_PROFUNDIDAD` (que fija x/y/tamaños a partir de la
// proporción 1.8/0.5): el tamaño aparente crece un ~12% nada más, imperceptible
// al lado de desambiguar la profundidad -- ver también `depthWrite = true`
// más abajo, necesario además de este z para que el GPU realmente descarte
// los píxeles de atrás en vez de mezclarlos.
const Z_LOCAL = -1.6;
const POSICION_LOCAL = {
  x: 0.18 * FACTOR_ESCALA_PROFUNDIDAD,
  y: 0.13 * FACTOR_ESCALA_PROFUNDIDAD,
  z: Z_LOCAL,
};
// Reducción adicional (independiente de la profundidad de arriba) para que
// el botón pase más desapercibido en la esquina -- feedback en vivo del
// Quest real: con el tamaño de ANTES, el desplegable (que hasta este ajuste
// era bastante más grande que el botón principal, ver comentario de
// ANCHO_BOTON_OPCION) se sentía "enorme". No toca POSICION_LOCAL (x/y): el
// botón se achica, pero su punto central en pantalla no se mueve.
const FACTOR_ACHICAR_BOTON = 0.8;
const ANCHO_BOTON = 0.18 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
const ALTO_BOTON = 0.09 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;
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

// Mismo tamaño que el botón principal (a pedido explícito del dueño del
// proyecto: antes eran más anchos que el botón principal -- pensado para
// que "Mapa conceptual" entrara sin achicarse demasiado -- y esa diferencia
// de tamaño era justamente lo que hacía ver "enorme" al desplegable). El
// ajuste automático de tamaño de fuente de `crearPanelTexto` sigue
// funcionando igual que antes (mide en píxeles del canvas interno de
// resolución fija, no en metros del panel): confirmado en la revisión de
// la Tarea 29 que "Mapa conceptual" entra con ~157-197px de margen de
// sobra sobre un presupuesto de 944px, muy por debajo del punto en el que
// haría falta achicar la fuente -- ese margen no depende del tamaño físico
// del panel, así que igualarlo al botón principal no lo pone en riesgo.
const ANCHO_BOTON_OPCION = ANCHO_BOTON;
const ALTO_BOTON_OPCION = ALTO_BOTON;
// Subido de 36 a 44 (pulido visual, a pedido del dueño del proyecto: se
// leía muy chico comparado con el resto de los botones del visor).
// "Mapa conceptual" -- la opción más larga -- medía ~747-787px a 36px (el
// margen de ~157-197px del comentario de arriba, restado de los 944px de
// presupuesto); escalado a 44px da ~913-962px, todavía mayormente dentro
// del presupuesto -- en el peor caso, `calcularTamanoFuenteAjustado` la
// recorta un par de puntos, imperceptible.
const TAMANO_FUENTE_OPCION = 44;
// Separación vertical entre el borde de un botón y el siguiente (principal
// incluido): nunca pegados entre sí, para no tocar el de al lado por error.
// También escalada por FACTOR_ESCALA_PROFUNDIDAD y FACTOR_ACHICAR_BOTON,
// por la misma razón que el resto de las medidas físicas de este archivo
// (mantener la misma proporción visual del espaciado al achicar todo).
const MARGEN_VERTICAL = 0.02 * FACTOR_ESCALA_PROFUNDIDAD * FACTOR_ACHICAR_BOTON;

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
    interactivo: true,
  });
  // `depthWrite:true` (crearPanelTexto deja el resto de los paneles del
  // proyecto en `false`, ver su JSDoc): este botón SÍ necesita que el GPU
  // registre su profundidad real, para que tape limpiamente -- en vez de
  // mezclarse con -- el contenido de mundo que pueda estar detrás a una
  // profundidad similar (ver el comentario de `Z_LOCAL`, más arriba).
  botonPrincipal.material.depthWrite = true;
  grupo.add(botonPrincipal);

  // Estado del desplegable: no alcanza con mirar `.visible` de los botones
  // de opción para saber si está "abierto", porque `main.js` también apaga
  // `grupo.visible` entero en 'aviso'/'pausa' (ver `actualizarPantallaVisible`)
  // -- sin esta variable propia, el desplegable podría quedar marcado como
  // abierto por dentro (aunque oculto por ese toggle general) y reaparecer
  // abierto la próxima vez que el botón vuelva a mostrarse.
  let desplegado = false;

  // Apilados verticalmente debajo del botón principal, en coordenadas
  // locales de cámara (mismo x/z que el botón principal, para que el
  // desplegable quede justo debajo de él). Ahora que la profundidad pasó
  // de z=-0.5 a z=-1.8 (ver el comentario junto a POSICION_LOCAL), el
  // semi-alto visible en ese plano es mucho mayor que antes, así que abrir
  // hacia abajo (como en el diseño original de este botón) ya no corre
  // riesgo de sacar al tercer botón del campo visual. Arrancan ocultos:
  // sólo se muestran mientras `desplegado` es true.
  const botonesOpcion = OPCIONES.map(({ opcion, texto }, indice) => {
    const y =
      POSICION_LOCAL.y -
      ALTO_BOTON / 2 -
      MARGEN_VERTICAL -
      ALTO_BOTON_OPCION / 2 -
      indice * (ALTO_BOTON_OPCION + MARGEN_VERTICAL);

    const botonOpcion = crearPanelTexto([texto], {
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
    // Mismo motivo que `botonPrincipal.material.depthWrite` más arriba: sin
    // esto, abrir el desplegable sobre una pantalla con contenido a una
    // profundidad similar (p. ej. pantalla-mapa.js) dejaba ambos mezclados
    // en vez de que la opción del desplegable tape limpiamente lo de atrás.
    botonOpcion.material.depthWrite = true;
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
