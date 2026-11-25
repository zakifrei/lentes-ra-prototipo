// Pantalla de subtítulos (visor-uikit, Tarea 5 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): texto que
// cambia solo según el guion (`js/common/subtitulos-guion.js`), tamaño
// ajustable y persistente con botones "+"/"-", y arrastre -- mismos
// valores físicos y misma arquitectura (contenedor arrastrable con el
// panel y los botones como hijos) que
// js/visor/paneles/pantalla-subtitulos.js (leído como referencia).
//
// Hallazgo de esta tarea (dos intentos fallidos antes de este, ver
// historial de commits de este archivo): dejar que uikit envuelva el
// texto solo desbordaba el panel en varias líneas al tamaño más grande.
// Intentar medir el ALTO real ya renderizado (`Text.size`, la señal que
// expone uikit) tampoco sirvió -- confirmado en vivo con `panel.update()`
// llamado repetidas veces seguidas: esa señal se queda clavada cerca de
// 1 línea de alto aunque el texto SÍ se esté dibujando envuelto en
// pantalla, así que nunca detecta el desborde real (no se pudo
// confirmar la causa exacta sin meterse en el código fuente minificado
// de uikit). La solución que sí funciona, mismo criterio que
// `calcularTamanoFuenteAjustado` de la versión vieja: medir el texto con
// `Canvas2D.measureText`, cargando la MISMA fuente real (Inter
// vendorizada en vendor/fonts/ -- la familia por defecto del visor,
// ver fuente-uikit.js) como `FontFace` del navegador -- esto no
// depende de nada interno de uikit, mide directo contra el mismo
// contorno de glifo que después dibuja el MSDF (misma familia e igual
// forma de los caracteres), y da un ancho confiable para achicar la
// fuente ANTES de pasársela a `Text`, en un solo paso, sin iterar.

import * as THREE from '../../../vendor/three/three.module.js';
import { Text } from '@pmndrs/uikit';
import { crearContenedorUikit, crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { COLOR_TEXTO } from '../ui-kit/tema-uikit.js';
import { enEventoSeleccion, habilitarArrastre } from '../../visor/interaccion.js';
import { lineaActual } from '../../common/subtitulos-guion.js';
import { ajustarTamanoSubtitulo, TAMANO_MIN, TAMANO_MAX } from '../../common/persistencia.js';

// Mismo presupuesto de ancho (en "píxeles" de contenido) que usa
// internamente crearContenedorUikit/crearPanelUikit para TODOS los
// paneles (ancho de referencia 1024px, margen horizontal 40px a cada
// lado -- ver panel-uikit.js): se repite acá a propósito, no se importa,
// porque panel-uikit.js no expone esos valores como API pública (son un
// detalle de implementación suyo, no un contrato).
const ANCHO_CANVAS_REFERENCIA = 1024;
const MARGEN_HORIZONTAL_REFERENCIA = 40;
const ANCHO_DISPONIBLE = ANCHO_CANVAS_REFERENCIA - MARGEN_HORIZONTAL_REFERENCIA * 2;

const URL_FUENTE_MEDIDA = 'vendor/fonts/Inter-Regular.ttf';
const NOMBRE_FUENTE_MEDIDA = 'InterMedidaSubtitulos';

let promesaContextoMedida = null;

// Contexto 2D offscreen con Inter real cargada como `FontFace` del
// navegador, sólo para `measureText` (nunca se dibuja nada en este
// canvas) -- ver el comentario grande de arriba sobre por qué no se
// mide contra el layout interno de uikit. Memoizado: sólo carga el
// archivo .ttf una vez, sin importar cuántas pantallas de subtítulos
// existan.
function obtenerContextoMedida() {
  if (!promesaContextoMedida) {
    promesaContextoMedida = new FontFace(NOMBRE_FUENTE_MEDIDA, `url(${URL_FUENTE_MEDIDA})`)
      .load()
      .then((fuente) => {
        document.fonts.add(fuente);
        return document.createElement('canvas').getContext('2d');
      });
  }
  return promesaContextoMedida;
}

// Mismos valores físicos que la versión vieja.
const ANCHO_PANEL = 1.05;
const ALTO_PANEL = 0.175;
const POSICION_SUBTITULO = { x: 0, y: 0.75, z: -1.6 };

// Tamaño de fuente para el factor de escala 1 (el mínimo) -- ajustado a
// ojo en el navegador para este sistema (ver comentario grande de
// arriba: el valor viejo, 40, estaba calibrado para un canvas de 1536px
// propio de esa pantalla; acá todos los paneles usan el mismo ancho de
// referencia de 1024px que panel-uikit.js, así que el número en sí no
// es comparable).
const TAMANO_FUENTE_BASE = 44;

const ANCHO_BOTON = 0.2;
const ALTO_BOTON = 0.2;
const SEPARACION_BOTONES = 0.4;
const TAMANO_FUENTE_BOTON = 350;
// Debajo del panel de subtítulos: offset LOCAL al contenedor (no una
// coordenada de mundo) -- igual que la versión vieja.
const MARGEN_BOTONES = 0.15;

// Zoom de subtítulos (arreglado 2026-11-25). Antes "+" multiplicaba el
// `fontSize` (x1/x2/x3) dentro de un panel de ANCHO FIJO, y el ajuste
// automático de abajo (`ajustarYFijarTexto`) lo volvía a achicar hasta que
// la línea entrara en ese mismo ancho: en la práctica el texto casi no
// cambiaba. Y como el tamaño arranca en el mínimo (TAMANO_MIN), "-" no
// hacía nada. Ahora cada nivel escala el PANEL ENTERO (texto incluido), así
// que el cambio siempre se ve; y el botón que no puede seguir (- en el
// mínimo, + en el máximo) se atenúa para que se entienda por qué no
// responde.
const ESCALA_POR_NIVEL = { 1: 1, 2: 1.25, 3: 1.5 };
const OPACIDAD_BOTON_INACTIVO = 0.35;

// Mismos límites de arrastre que la versión vieja.
const LIMITES_ARRASTRE = {
  x: [-0.6, 0.6],
  y: [0.4, 1.5],
  z: [-2.8, -1.2],
};

// Cada cuánto se revisa si hay que avanzar de línea -- mismo valor que
// la versión vieja (el guion avanza en segundos, no en cuadros).
const INTERVALO_ACTUALIZACION_MS = 1000;

const raycaster = new THREE.Raycaster();
const vectorOrigen = new THREE.Vector3();
const vectorDireccion = new THREE.Vector3();

/**
 * Crea la pantalla de subtítulos -- misma firma que la versión vieja.
 * @param {THREE.WebGLRenderer} renderer
 * @param {{tamanoSubtitulo:number, imagenes:object}} persistencia
 * @param {(delta:number) => void} onCambiarTamano
 * @returns {THREE.Object3D} grupo con `actualizarUikit(deltaMs)` (misma
 *   convención que el resto de las pantallas) más `alEntrar()` y
 *   `alReiniciarTodo()` (misma convención que la versión vieja)
 */
export function crearPantallaSubtitulos(renderer, persistencia, onCambiarTamano) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-subtitulos';

  let estadoLocal = { ...persistencia };
  // Reloj del guion -- mismo motivo que la versión vieja (ver su
  // comentario grande): se reinicia de verdad en `alEntrar()`, no acá.
  let inicio = performance.now();
  let ultimoTextoDibujado = null;
  let ultimoTamanoDibujado = null;

  // `contenedor` agrupa el panel y los dos botones "+"/"-": se arrastran
  // siempre juntos (mismo motivo que la versión vieja -- ver su
  // comentario grande). `habilitarArrastre` separa el objeto contra el
  // que se raycastea para AGARRAR (`panelSubtitulo` solo) del objeto que
  // se MUEVE (`contenedor`, que sí incluye los botones).
  const contenedor = new THREE.Group();
  contenedor.name = 'pantalla-subtitulos-contenedor';
  contenedor.position.set(POSICION_SUBTITULO.x, POSICION_SUBTITULO.y, POSICION_SUBTITULO.z);
  grupo.add(contenedor);

  // Grupo intermedio que se escala con el zoom (el panel en sí es un root
  // de uikit: mejor no pisarle la escala directo).
  const escalaPanel = new THREE.Group();
  escalaPanel.name = 'pantalla-subtitulos-escala';
  contenedor.add(escalaPanel);

  const { contenedor: panelSubtitulo } = crearContenedorUikit({
    posicion: { x: 0, y: 0, z: 0 },
    ancho: ANCHO_PANEL,
    alto: ALTO_PANEL,
    nombre: 'pantalla-subtitulos-texto',
  });
  const textoSubtitulo = new Text({
    text: '',
    color: COLOR_TEXTO,
    fontSize: TAMANO_FUENTE_BASE,
    fontWeight: 'normal',
  });
  panelSubtitulo.add(textoSubtitulo);
  escalaPanel.add(panelSubtitulo);

  // La posición, a diferencia de las imágenes, no es persistente --
  // mismo criterio que la versión vieja.
  habilitarArrastre(renderer, panelSubtitulo, contenedor, LIMITES_ARRASTRE);

  // Si el texto no entra en una sola línea al tamaño pedido, lo achica
  // hasta que entre -- mismo objetivo y misma fórmula que
  // `calcularTamanoFuenteAjustado` de la versión vieja (ver el
  // comentario grande de arriba sobre por qué se mide con un
  // `FontFace`/Canvas2D real en vez de con el layout interno de uikit).
  async function ajustarYFijarTexto(texto, tamanoFuentePedido) {
    const contexto = await obtenerContextoMedida();
    contexto.font = `${tamanoFuentePedido}px ${NOMBRE_FUENTE_MEDIDA}`;
    const anchoTexto = contexto.measureText(texto).width;
    const tamanoFuente =
      anchoTexto > ANCHO_DISPONIBLE ? tamanoFuentePedido * (ANCHO_DISPONIBLE / anchoTexto) : tamanoFuentePedido;

    textoSubtitulo.setProperties({ text: texto, fontSize: tamanoFuente });
  }

  function redibujar() {
    const segundosTranscurridos = (performance.now() - inicio) / 1000;
    const texto = lineaActual(segundosTranscurridos);
    // Tamaño de letra fijo: el zoom lo da la escala del panel (ver
    // ESCALA_POR_NIVEL arriba), no el fontSize.
    const tamanoFuente = TAMANO_FUENTE_BASE;

    if (texto === ultimoTextoDibujado && tamanoFuente === ultimoTamanoDibujado) return;
    ultimoTextoDibujado = texto;
    ultimoTamanoDibujado = tamanoFuente;

    ajustarYFijarTexto(texto, tamanoFuente);
  }
  redibujar();
  setInterval(redibujar, INTERVALO_ACTUALIZACION_MS);

  // Botones "+"/"-": estáticos, así que sí se apoyan en crearPanelUikit.
  // Posición LOCAL al contenedor -- al ser hijos del mismo `contenedor`
  // que se arrastra, siguen al panel automáticamente.
  const botonMas = crearPanelUikit(['+'], {
    posicion: { x: SEPARACION_BOTONES / 2, y: 0, z: 0 },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-subtitulos-boton-mas',
    interactivo: true,
  });
  botonMas.userData.delta = 1;

  const botonMenos = crearPanelUikit(['-'], {
    posicion: { x: -SEPARACION_BOTONES / 2, y: 0, z: 0 },
    ancho: ANCHO_BOTON,
    alto: ALTO_BOTON,
    tamanoFuente: TAMANO_FUENTE_BOTON,
    nombre: 'pantalla-subtitulos-boton-menos',
    interactivo: true,
  });
  botonMenos.userData.delta = -1;

  contenedor.add(botonMas, botonMenos);
  const botones = [botonMas, botonMenos];
  const paneles = [panelSubtitulo, botonMas, botonMenos];

  // Aplica el nivel de zoom actual: escala el panel, baja los botones para
  // que queden justo debajo del panel ya escalado, y atenúa el que está en
  // su límite.
  function aplicarZoom() {
    const nivel = estadoLocal.tamanoSubtitulo;
    const escala = ESCALA_POR_NIVEL[nivel] ?? 1;
    escalaPanel.scale.setScalar(escala);
    const yBotones = -(ALTO_PANEL * escala) / 2 - MARGEN_BOTONES;
    botonMas.position.y = yBotones;
    botonMenos.position.y = yBotones;
    botonMas.setProperties({ opacity: nivel >= TAMANO_MAX ? OPACIDAD_BOTON_INACTIVO : 1 });
    botonMenos.setProperties({ opacity: nivel <= TAMANO_MIN ? OPACIDAD_BOTON_INACTIVO : 1 });
  }
  aplicarZoom();

  enEventoSeleccion(renderer, (origen, direccion) => {
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactos = raycaster.intersectObjects(botones, false);
    if (impactos.length === 0) return;

    const delta = impactos[0].object.userData.delta;
    estadoLocal = ajustarTamanoSubtitulo(estadoLocal, delta);
    aplicarZoom();
    onCambiarTamano(delta);
  });

  grupo.alEntrar = function alEntrarAPantallaSubtitulos() {
    inicio = performance.now();
    ultimoTextoDibujado = null;
    ultimoTamanoDibujado = null;
    redibujar();
  };

  grupo.alReiniciarTodo = function alReiniciarTodoPantallaSubtitulos() {
    estadoLocal = { ...estadoLocal, tamanoSubtitulo: TAMANO_MIN };
    aplicarZoom();
  };

  grupo.actualizarUikit = (deltaMs) => {
    paneles.forEach((panel) => panel.update(deltaMs));
  };

  return grupo;
}
