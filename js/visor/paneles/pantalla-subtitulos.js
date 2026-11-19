// Pantalla de subtítulos reales: muestra la línea vigente del guion
// (`GUION_SUBTITULOS`, ver js/common/subtitulos-guion.js) según el tiempo
// transcurrido desde que se creó esta pantalla, con tamaño ajustable y
// persistente mediante dos botones ("+"/"-"). Reemplaza al panel
// placeholder de una tarea anterior (texto fijo de ejemplo, siempre
// visible): ahora el contenido es real y el tamaño es chico por defecto
// (ver TAMANO_MIN en persistencia.js) -- el usuario lo agranda si lo
// necesita.
//
// Igual que el resto de las pantallas, se ubica fuera del centro del
// campo visual (más abajo que la altura típica de los ojos), como
// subtítulos reales de video. El texto se dibuja con Canvas 2D sobre una
// `CanvasTexture`, igual que panel-texto.js, pero acá sí hace falta
// redibujar en caliente (cambia el texto con el tiempo y el tamaño con
// los botones), así que no se reutiliza ese módulo para el panel
// principal -- sólo para los dos botones, que son estáticos.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion, habilitarArrastre } from '../interaccion.js';
import { lineaActual } from '../../common/subtitulos-guion.js';
import { ajustarTamanoSubtitulo, TAMANO_MIN } from '../../common/persistencia.js';
import { dibujarFondoPanel, COLOR_TEXTO, FUENTE_PRINCIPAL } from '../tema-visual.js';

// ANCHO_CANVAS quedó en 1536 (en vez de 1024) a raíz de un bug encontrado en
// pruebas de usabilidad en vivo: con 1024 px de ancho, incluso la línea más
// corta del guion (ver GUION_SUBTITULOS en subtitulos-guion.js) ya no
// entraba en `anchoDisponible` al tamaño de fuente mínimo, así que
// `calcularTamanoFuenteAjustado` tenía que achicarla SIEMPRE -- y como el
// ancho de un texto escala ~linealmente con el tamaño de fuente pedido, ese
// achicamiento terminaba devolviendo el mismo tamaño final sin importar el
// factor de escala pedido (`tamanoFuente`): "+"/"-" cambiaban
// `tamanoSubtitulo` (se guardaba y persistía bien) pero el tamaño
// renderizado no se movía un píxel. Para que el factor de escala vuelva a
// importar, el texto tiene que entrar SIN achicarse en el tamaño mínimo (y
// buena parte del rango), y el achicamiento de `calcularTamanoFuenteAjustado`
// (agregado en la Tarea 8) sólo debe intervenir cerca del máximo, para las
// líneas más largas -- no en cada paso. Ensanchar el canvas (y el panel
// físico, ver ANCHO_PANEL) le da ese margen sin tocar la protección de la
// Tarea 8. ALTO_CANVAS se mantiene en 256 para no estirar la tipografía: ver
// la nota de ANCHO_PANEL/ALTO_PANEL más abajo.
const ANCHO_CANVAS = 1536;
const ALTO_CANVAS = 256;

// Margen horizontal (en px de canvas) que el texto nunca debe invadir.
const MARGEN_HORIZONTAL = 40;

// Tamaño físico del panel en metros (RA): ancho x alto. ANCHO_PANEL creció
// de 0.7 a 1.05 (= ALTO_PANEL * (ANCHO_CANVAS / ALTO_CANVAS) = 0.175 * 6)
// en la misma proporción que ANCHO_CANVAS creció de 1024 a 1536, para que
// la cantidad de metros de panel por píxel de canvas sea igual en ancho y
// alto (si no, el texto se vería estirado horizontalmente). Sigue bien por
// debajo de la altura típica de los ojos (ver POSICION_SUBTITULO más abajo),
// así que no invade el centro del campo visual: sólo es una franja más
// ancha, como los subtítulos reales de video.
const ANCHO_PANEL = 1.05;
const ALTO_PANEL = 0.175;

// Misma zona que el panel de subtítulos original: debajo de la altura
// típica de los ojos (~1.6 m), fuera del centro del campo visual. `y` ya
// había bajado de 1.2 a 0.95 (Tarea 21, primera prueba en un casco Meta
// Quest real) y, probado de nuevo en vivo en el Quest real, el dueño del
// proyecto pidió bajarlo todavía más: a 0.95 seguía "ocupando mucho del
// medio" del campo visual real (la vista previa de escritorio no deja
// notar esto del todo, porque no simula el campo visual angosto de un
// casco real). 0.75 lo deja claramente en la mitad inferior, sin quedar
// tan abajo que incomode leerlo.
const POSICION_SUBTITULO = { x: 0, y: 0.75, z: -1.6 };

// Tamaño de fuente (px de canvas) para el factor de escala 1 (el mínimo).
// Subido de 24 a 40 (revisión de diseño VR, skill hz-immersive-designer):
// a 24px el subtítulo medía ~16.4 mm físicos de alto -- 59% del mínimo de
// legibilidad que documenta Meta para VR (~1° de arco visual, ~27.9 mm a
// los 1.6 m de distancia de este panel), confirmado tanto por el cálculo
// como mirando una captura real (franja de texto genuinamente diminuta).
// Es el peor caso de todo el proyecto porque es el tamaño con el que
// arranca CUALQUIERA que entre a esta pantalla, antes de tocar "+" -- no un
// caso límite. 40px es prácticamente el máximo posible sin volver a pisar
// el punto de quiebre de ANCHO_CANVAS (más arriba): la línea más larga del
// guion ("El Imperio romano de Oriente sigue en pie: nace lo que hoy
// llamamos Bizancio.", 79 caracteres) mide ~1412px a 40px, medido con
// `measureText` en el navegador real del proyecto, contra un ancho
// disponible de 1456px (ANCHO_CANVAS - MARGEN_HORIZONTAL*2) -- a 42px ya no
// entraría sin achicarse. Con TAMANO_MIN=1/TAMANO_MAX=3 (persistencia.js)
// el resultado antes de cualquier achique por `calcularTamanoFuenteAjustado`
// es: factor 1 -> 40px (ahora ~28 mm, ya sobre el mínimo), factor 2 -> 80px,
// factor 3 -> 120px (estos dos últimos siguen forzando el achique en las
// líneas más largas para la mayoría de las líneas del guion, igual que ya
// pasaba con la base vieja a partir del factor 2 -- no es un comportamiento
// nuevo de este cambio, sólo el piso del factor 1 se corrigió).
const TAMANO_FUENTE_BASE = 40;

// ANCHO_BOTON/ALTO_BOTON crecieron de 0.12 a 0.2 a raíz de la misma prueba
// en el Quest real: a 0.12 el botón era casi invisible/intocable con la
// precisión real del pellizco de mano (muy distinta de la precisión de un
// click de mouse en la vista previa). El tamaño del botón por sí solo no
// alcanza para que el símbolo "+"/"-" se lea bien -- ver TAMANO_FUENTE_BOTON
// más abajo.
const ANCHO_BOTON = 0.2;
const ALTO_BOTON = 0.2;
// Separación horizontal entre centros de botones: con ANCHO_BOTON = 0.2
// deja aire suficiente entre bordes (0.2 m) para no tocarlos por error.
const SEPARACION_BOTONES = 0.4;
// Tamaño de fuente (px de canvas, sobre el canvas de 1024px de
// panel-texto.js) para el glyph "+"/"-" de estos botones. El default de
// crearPanelTexto (48px) sólo se ENCOGE si no entra en el ancho del canvas,
// nunca se agranda solo -- un único carácter a 48px ocupa una fracción
// mínima del canvas, así que aunque el panel físico sea grande el símbolo
// sigue viéndose chico. Hace falta pasar un tamaño mucho mayor a propósito
// para que el glyph llene gran parte del panel.
const TAMANO_FUENTE_BOTON = 350;
// Debajo del panel de subtítulos: nunca encima (mismo criterio que el
// resto de los paneles del proyecto). Offset LOCAL al contenedor (ver más
// abajo), no una coordenada de mundo -- el origen local del contenedor
// coincide con el centro del panel.
const Y_LOCAL_BOTONES = -ALTO_PANEL / 2 - 0.15;

// Volumen en el que se puede arrastrar el panel de subtítulos: mismo
// criterio que LIMITES_ARRASTRE de pantalla-imagenes.js (alcanzable, sin
// llegar detrás de la cabeza ni pegado a la cara), pero algo más angosto en
// x/y porque el panel de subtítulos es una franja (no una grilla 2x2) y no
// tiene sentido alejarlo demasiado del centro.
const LIMITES_ARRASTRE = {
  x: [-0.6, 0.6],
  y: [0.4, 1.5],
  z: [-2.8, -1.2],
};

// Cada cuánto se revisa si hay que avanzar de línea (no hace falta
// redibujar en cada cuadro: el guion avanza en segundos, no en cuadros).
const INTERVALO_ACTUALIZACION_MS = 1000;

// Si el texto no entra en el ancho disponible del canvas con el tamaño de
// fuente pedido (puede pasar con el factor de escala más grande, o con
// líneas largas del guion), se reduce ese tamaño hasta que entre con
// margen -- mismo criterio que panel-texto.js, para que los subtítulos
// nunca se corten contra el borde del panel.
function calcularTamanoFuenteAjustado(contexto, texto, tamanoFuente) {
  contexto.font = `${tamanoFuente}px ${FUENTE_PRINCIPAL}`;
  const anchoDisponible = ANCHO_CANVAS - MARGEN_HORIZONTAL * 2;
  const anchoTexto = contexto.measureText(texto).width;
  if (anchoTexto <= anchoDisponible) return tamanoFuente;
  return tamanoFuente * (anchoDisponible / anchoTexto);
}

function dibujarSubtitulo(contexto, texto, tamanoFuente) {
  contexto.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  dibujarFondoPanel(contexto, ANCHO_CANVAS, ALTO_CANVAS);

  contexto.fillStyle = COLOR_TEXTO;
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';

  const tamanoFuenteAjustado = calcularTamanoFuenteAjustado(contexto, texto, tamanoFuente);
  contexto.font = `${tamanoFuenteAjustado}px ${FUENTE_PRINCIPAL}`;
  contexto.fillText(texto, ANCHO_CANVAS / 2, ALTO_CANVAS / 2);
}

/**
 * Crea la pantalla de subtítulos.
 *
 * El tamaño arranca en `persistencia.tamanoSubtitulo` (el mínimo, por
 * diseño -- ver TAMANO_MIN en persistencia.js) y esta pantalla mantiene su
 * propia copia para poder redibujar su canvas; cada vez que el usuario lo
 * cambia con los botones "+"/"-", además de redibujarse a sí misma llama a
 * `onCambiarTamano(delta)` para que quien la creó (`main.js`) actualice su
 * propio estado de persistencia (ver Paso 7 del plan de la tarea) con la
 * misma función pura (`ajustarTamanoSubtitulo`), así ambas copias quedan
 * siempre sincronizadas.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {{tamanoSubtitulo:number, imagenes:object}} persistencia
 * @param {(delta:number) => void} onCambiarTamano
 * @returns {THREE.Object3D}
 */
export function crearPantallaSubtitulos(renderer, persistencia, onCambiarTamano) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-subtitulos';

  let estadoLocal = { ...persistencia };
  // Reloj del guion: arranca en el momento en que se crea esta pantalla,
  // pero eso pasa una sola vez al iniciar la app (todas las pantallas se
  // crean de entrada -- ver main.js). Si el reloj no se reiniciara al
  // entrar de verdad a esta pantalla, el participante podría llegar a una
  // línea intermedia del guion (o directamente a la última, congelada)
  // según cuánto haya tardado en pasar por reconocimiento/bienvenida/menú,
  // rompiendo la ilusión de "clase en vivo". Por eso es `let`, no `const`:
  // `alEntrar()`, más abajo, lo reinicia cada vez que `main.js` detecta
  // que el usuario entró a esta pantalla.
  let inicio = performance.now();
  let ultimoTextoDibujado = null;
  let ultimoTamanoDibujado = null;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;
  const contexto = canvas.getContext('2d');

  const textura = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    // Igual que el resto de los paneles: siempre debe leerse, sin
    // importar la luz de la escena ni el ángulo desde el que se lo mire.
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const geometria = new THREE.PlaneGeometry(ANCHO_PANEL, ALTO_PANEL);

  // `contenedor` agrupa el panel y sus dos botones "+"/"-": se arrastran
  // siempre juntos, como una sola unidad (feedback en vivo del Quest real:
  // antes los botones "perseguían" al panel un cuadro después, vía un
  // `requestAnimationFrame` propio, y se sentía desincronizado). Esto sólo
  // es seguro porque `habilitarArrastre` separa el objeto contra el que se
  // raycastea para AGARRAR (acá, `panelSubtitulo` solo) del objeto que
  // efectivamente se MUEVE (acá, `contenedor`, que sí incluye los botones
  // como hijos) -- mismo mecanismo y mismo motivo que pantalla-imagenes.js
  // (ver su comentario grande al principio del archivo y el JSDoc de
  // `habilitarArrastre` en interaccion.js): si el raycasting recursivo del
  // agarre apuntara al contenedor entero, tocar un botón agarraría (y
  // movería) el panel sin querer.
  const contenedor = new THREE.Group();
  contenedor.name = 'pantalla-subtitulos-contenedor';
  contenedor.position.set(POSICION_SUBTITULO.x, POSICION_SUBTITULO.y, POSICION_SUBTITULO.z);
  grupo.add(contenedor);

  const panelSubtitulo = new THREE.Mesh(geometria, material);
  panelSubtitulo.name = 'pantalla-subtitulos-texto';
  // Siempre en el origen local del contenedor -- quien se mueve de verdad,
  // al arrastrar, es `contenedor`.
  contenedor.add(panelSubtitulo);

  // La posición, a diferencia de las imágenes, no es persistente -- si el
  // usuario sale de esta pantalla y vuelve a entrar, `alEntrar()` no la
  // toca (sólo reinicia el reloj del guion), así que el panel vuelve a
  // POSICION_SUBTITULO por venir de una pantalla recién creada. Mantenerlo
  // simple a propósito (ver brief de la Tarea 21): sumar persistencia queda
  // para una tarea futura si hiciera falta.
  habilitarArrastre(renderer, panelSubtitulo, contenedor, LIMITES_ARRASTRE);

  function redibujar() {
    const segundosTranscurridos = (performance.now() - inicio) / 1000;
    const texto = lineaActual(segundosTranscurridos);
    const tamanoFuente = TAMANO_FUENTE_BASE * estadoLocal.tamanoSubtitulo;

    if (texto === ultimoTextoDibujado && tamanoFuente === ultimoTamanoDibujado) return;
    ultimoTextoDibujado = texto;
    ultimoTamanoDibujado = tamanoFuente;

    dibujarSubtitulo(contexto, texto, tamanoFuente);
    textura.needsUpdate = true;
  }
  redibujar();
  setInterval(redibujar, INTERVALO_ACTUALIZACION_MS);

  // Botones "+"/"-": paneles de texto chicos y estáticos (no cambian), así
  // que sí se reutiliza crearPanelTexto para ellos. Posición LOCAL al
  // contenedor (el origen local es el centro del panel) -- ya NO hace
  // falta reposicionarlos a mano para que sigan al panel al arrastrarlo:
  // al ser hijos del mismo `contenedor` que se mueve, heredan la posición
  // automáticamente (ver el comentario grande junto a `contenedor`, más
  // arriba).
  const botonMas = crearPanelTexto(['+'], {
    posicion: { x: SEPARACION_BOTONES / 2, y: Y_LOCAL_BOTONES, z: 0 },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-subtitulos-boton-mas',
    interactivo: true,
  });
  botonMas.userData.delta = 1;

  const botonMenos = crearPanelTexto(['-'], {
    posicion: { x: -SEPARACION_BOTONES / 2, y: Y_LOCAL_BOTONES, z: 0 },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-subtitulos-boton-menos',
    interactivo: true,
  });
  botonMenos.userData.delta = -1;

  contenedor.add(botonMas, botonMenos);
  const botones = [botonMas, botonMenos];

  const raycaster = new THREE.Raycaster();
  const vectorOrigen = new THREE.Vector3();
  const vectorDireccion = new THREE.Vector3();

  enEventoSeleccion(renderer, (origen, direccion) => {
    // Mismo criterio que pantalla-menu.js: el raycasting no filtra por
    // `.visible`, así que si esta pantalla no es la activa hay que
    // ignorar el gesto a mano.
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return; // no tocó ningún botón

    const delta = impactos[0].object.userData.delta;
    estadoLocal = ajustarTamanoSubtitulo(estadoLocal, delta);
    redibujar();
    onCambiarTamano(delta);
  });

  // Enganche genérico de "entró a esta pantalla": `main.js` lo llama cada
  // vez que detecta una transición real hacia `'subtitulos'` (no al crear
  // la pantalla, que pasa una sola vez al arrancar la app -- ver
  // comentario junto a `inicio` más arriba). Reinicia el reloj del guion
  // para que el participante vea siempre la línea 1 al entrar, y fuerza un
  // redibujado inmediato (si no, se vería la línea vieja hasta el próximo
  // tick de `INTERVALO_ACTUALIZACION_MS`). No toca `estadoLocal.tamanoSubtitulo`:
  // el tamaño elegido sí es persistente entre entradas a la pantalla, sólo
  // el guion se reinicia. El mismo patrón sirve, a futuro, para el timer de
  // pausa (Tarea 11/12): cualquier pantalla puede exponer su propio
  // `alEntrar()` sobre el `THREE.Object3D` que devuelve.
  grupo.alEntrar = function alEntrarAPantallaSubtitulos() {
    inicio = performance.now();
    ultimoTextoDibujado = null;
    ultimoTamanoDibujado = null;
    redibujar();
  };

  // Gancho de "Reiniciar todo" (Tarea 18, panel del observador): a
  // diferencia de `alEntrar()` (que reinicia el reloj del guion pero deja
  // el tamaño elegido intacto -- es persistente entre entradas normales),
  // esto vuelve el tamaño al mínimo de verdad, porque un reset de persistencia
  // debe borrar también las preferencias guardadas, no sólo el progreso del
  // guion.
  grupo.alReiniciarTodo = function alReiniciarTodoPantallaSubtitulos() {
    estadoLocal = { ...estadoLocal, tamanoSubtitulo: TAMANO_MIN };
    ultimoTamanoDibujado = null; // fuerza el redibujado aunque el tamaño ya fuera TAMANO_MIN
    redibujar();
  };

  return grupo;
}
