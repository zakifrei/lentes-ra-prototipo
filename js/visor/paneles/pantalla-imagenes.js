// Pantalla de imágenes: muestra imágenes reales (mapas, pinturas e
// ilustraciones sobre la caída del Imperio romano de Occidente, ver
// CREDITS.md) descargadas a `assets/imagenes/` -- nunca enlazadas en línea.
// Cada imagen es un plano con textura que el usuario puede:
// - mover, arrastrándolo con la mano/control/mouse (`habilitarArrastre`,
//   Task 4), y
// - agrandar/achicar con dos botones "+"/"-" junto a ella (mismo patrón que
//   el ajuste de tamaño de subtítulos de la Task 8, nunca con un gesto de
//   pellizco de dos manos).
//
// La posición y la escala de cada imagen son persistentes: se restauran al
// crear la pantalla desde `persistencia.imagenes[idImagen]` (ver
// js/common/persistencia.js) y, cada vez que cambian, se le avisa a quien
// creó esta pantalla (`main.js`) a través de `onMoverImagen`/
// `onEscalarImagen`, para que actualice su propia copia del estado con las
// mismas funciones puras (`guardarPosicionImagen`/`guardarEscalaImagen`).
//
// Con más de un puñado de imágenes no entrarían todas sin tapar el centro
// del campo visual (regla de todo el proyecto), así que se muestran de a
// `TAMANO_PAGINA` por vez, en una grilla por debajo de la altura de ojos, y
// el resto queda detrás de un botón "Ver más imágenes" que rota entre
// páginas.
//
// Dos imágenes con posición/escala guardada nunca deberían interferir entre
// sí: cada una guarda su propio registro en `persistencia.imagenes`, con su
// propio id (el nombre de archivo, sin ruta ni extensión).
//
// Cada imagen vive dentro de un `contenedor` (THREE.Group) propio, que
// agrupa la imagen y sus dos botones "+"/"-" -- así se arrastran siempre
// juntos, como una sola unidad, en vez de que los botones "persigan" a la
// imagen un cuadro después (ver feedback en vivo del Quest real: el
// seguimiento por `requestAnimationFrame` se sentía desincronizado). Esto
// sólo es seguro porque `habilitarArrastre` (ver interaccion.js) separa el
// objeto contra el que se raycastea para AGARRAR (acá, `meshImagen` solo,
// sin sus hermanos) del objeto que efectivamente se MUEVE (acá,
// `contenedor`, que sí incluye los botones como hijos) -- si tocáramos un
// botón con el raycasting recursivo apuntando al contenedor entero, se
// agarraría (y movería) la imagen sin querer, el mismo bug que esta
// separación evita desde la Tarea 9.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelTexto } from './panel-texto.js';
import { enEventoSeleccion, habilitarArrastre } from '../interaccion.js';
import { TAMANO_MIN, TAMANO_MAX } from '../../common/persistencia.js';

// Cuántas imágenes se muestran a la vez. El resto, detrás del botón "Ver
// más imágenes" (ver más abajo).
const TAMANO_PAGINA = 2;

// Tamaño (lado, en metros) del cuadrado en el que entra cada imagen a
// escala 1 (TAMANO_MIN), ajustada "contain" según su proporción real (ver
// `cargador.load` más abajo) para que ni una imagen apaisada ni una vertical
// ocupen más espacio del previsto en la grilla. Hasta que la textura carga
// se usa ese mismo cuadrado como tamaño provisorio.
const ANCHO_BASE_IMAGEN = 0.42;

// Dos posiciones (una a cada lado) para las hasta `TAMANO_PAGINA` imágenes
// de cada página, por debajo de la altura típica de los ojos (~1.6 m) --
// igual criterio que el resto de las pantallas: nunca tapar el centro del
// campo visual. La altura (1.2) deja lugar debajo para los botones
// "+"/"-" de escala (que se ubican con MARGEN_BOTONES_ESCALA por debajo del
// borde de la imagen) sin que queden pegados al piso visual ni tan arriba
// que se acerquen al centro.
const POSICIONES_GRILLA = [
  { x: -0.6, y: 1.2 },
  { x: 0.6, y: 1.2 },
];
const Z_POR_DEFECTO = -1.9;

// Tarea de ajuste UX (feedback en vivo del Quest real): ángulo de rotación
// "en ángulo" (toe-in) de cada imagen hacia el centro, ver el comentario
// grande junto a `meshImagen.rotation.y` más abajo.
const ANGULO_TOE_IN = Math.PI / 7; // ~25.7°

// Volumen en el que se puede arrastrar cualquier imagen: alcanzable, pero
// sin poder llevarla detrás de la cabeza, demasiado lejos o pegada a la
// cara (mismo criterio que usó la Task 4 para el panel de subtítulos).
const LIMITES_ARRASTRE = {
  x: [-1.2, 1.2],
  y: [0.5, 1.9],
  z: [-3.1, -1.2],
};

// ANCHO_BOTON_ESCALA/ALTO_BOTON_ESCALA crecieron de 0.1 a 0.18 a raíz de
// probar el flujo completo en un Quest real (Task 22): el símbolo "+"/"-"
// se veía chico. `crearPanelTexto` dibuja sobre un canvas de 1024x512px con
// un tamanoFuente que sólo se encoge si no entra, nunca se agranda solo --
// agrandar el botón sin agrandar también TAMANO_FUENTE_BOTON_ESCALA no
// alcanza (mismo motivo, y misma solución, que los botones de subtítulos
// de la Task 21).
const ANCHO_BOTON_ESCALA = 0.18;
const ALTO_BOTON_ESCALA = 0.18;
const TAMANO_FUENTE_BOTON_ESCALA = 350;
const SEPARACION_BOTONES_ESCALA = 0.4;
// Separación vertical entre el borde inferior de la imagen (a su tamaño
// actual) y sus botones "+"/"-": nunca encima de la imagen.
const MARGEN_BOTONES_ESCALA = 0.13;

const POSICION_BOTON_VER_MAS = { x: 0, y: 0.55, z: -1.2 };
const ANCHO_BOTON_VER_MAS = 0.6;
const ALTO_BOTON_VER_MAS = 0.18;

// Capas de Three.js (ver `THREE.Object3D.layers`) usadas para que el
// raycasting -- tanto el de `habilitarArrastre` como el propio de esta
// pantalla para los botones "+"/"-" -- ignore una imagen que no está
// realmente a la vista: ni porque pertenece a otra página de esta misma
// pantalla, ni porque esta pantalla no es la activa. El raycasting de
// Three.js NO filtra por `.visible` (sólo por `.layers`, ver el comentario
// equivalente en pantalla-menu.js), así que un objeto en una capa que la
// cámara y los raycasters no consultan es la única forma real de volverlo
// "intocable" sin sacarlo de la escena.
const CAPA_VISIBLE = 0;
const CAPA_OCULTA = 1;

// Deriva el id persistente de una imagen a partir de su ruta: el nombre de
// archivo, sin carpetas ni extensión (ej. 'assets/imagenes/mapa-x.jpg' ->
// 'mapa-x'). Estable entre sesiones mientras no se renombre el archivo.
function idDesdeRuta(ruta) {
  const archivo = ruta.split('/').pop();
  return archivo.replace(/\.[^./]+$/, '');
}

/**
 * Crea la pantalla de imágenes.
 * @param {THREE.WebGLRenderer} renderer
 * @param {string[]} rutasImagenes rutas a archivos descargados en assets/imagenes/
 * @param {{tamanoSubtitulo:number, imagenes:Record<string,{x:number,y:number,z:number,escala:number}>}} persistencia
 * @param {(idImagen:string, posicion:{x:number,y:number,z:number}) => void} onMoverImagen
 * @param {(idImagen:string, escala:number) => void} onEscalarImagen
 * @param {() => void} onVerMas
 * @returns {THREE.Object3D}
 */
export function crearPantallaImagenes(
  renderer,
  rutasImagenes,
  persistencia,
  onMoverImagen,
  onEscalarImagen,
  onVerMas
) {
  const grupo = new THREE.Group();
  grupo.name = 'pantalla-imagenes';

  const cargador = new THREE.TextureLoader();
  const botonesEscala = [];

  // Una entrada por imagen, con todo lo que hace falta para moverla,
  // escalarla y saber a qué página pertenece. `contenedor` es el objeto
  // que se arrastra de verdad (lleva la posición "de verdad" de la unidad
  // imagen+botones); `meshImagen` vive adentro, siempre en el origen local
  // del contenedor (ver el comentario grande al principio del archivo).
  const imagenes = rutasImagenes.map((ruta, indice) => {
    const idImagen = idDesdeRuta(ruta);
    const guardado = persistencia.imagenes[idImagen];

    const posicionPorDefecto = POSICIONES_GRILLA[indice % TAMANO_PAGINA];
    const posicionInicial = guardado ?? {
      x: posicionPorDefecto.x,
      y: posicionPorDefecto.y,
      z: Z_POR_DEFECTO,
    };

    const contenedor = new THREE.Group();
    contenedor.name = `pantalla-imagenes-contenedor-${idImagen}`;
    contenedor.position.set(posicionInicial.x, posicionInicial.y, posicionInicial.z);
    grupo.add(contenedor);

    const material = new THREE.MeshBasicMaterial({
      color: 0x333333, // placeholder gris hasta que cargue la textura real
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const geometria = new THREE.PlaneGeometry(ANCHO_BASE_IMAGEN, ANCHO_BASE_IMAGEN);
    const meshImagen = new THREE.Mesh(geometria, material);
    meshImagen.name = `pantalla-imagenes-imagen-${idImagen}`;
    // Siempre en el origen local del contenedor -- quien se mueve de
    // verdad, al arrastrar, es `contenedor` (ver más abajo).

    // Tarea de ajuste UX (feedback en vivo del Quest real): cada imagen rota
    // levemente hacia el centro ("en ángulo", como un tríptico), para que se
    // vea más de frente al mirarla desde el costado en vez de "de refilón".
    // Con la convención de THREE.PlaneGeometry (normal por defecto hacia +Z) y
    // la regla de la mano derecha, rotar en +Y gira esa normal hacia +X -- por
    // eso la imagen de la IZQUIERDA (x negativo) necesita rotación POSITIVA
    // (para girar su cara hacia +X, o sea hacia el centro) y la de la DERECHA
    // necesita la rotación opuesta. El ángulo persiste aunque se arrastre el
    // contenedor a otra posición (la rotación vive en `meshImagen`, que
    // `habilitarArrastre` nunca toca -- sólo mueve `.position` de
    // `contenedor`) -- es intencional: la imagen conserva su ángulo "de
    // origen" sin importar dónde termine.
    meshImagen.rotation.y = posicionInicial.x < 0 ? ANGULO_TOE_IN : -ANGULO_TOE_IN;

    const estadoImagen = {
      idImagen,
      indice,
      meshImagen,
      contenedor,
      altoActual: ANCHO_BASE_IMAGEN,
      escalaActual: guardado?.escala ?? TAMANO_MIN,
      ultimaPosicionNotificada: { ...posicionInicial },
    };
    meshImagen.scale.setScalar(estadoImagen.escalaActual);
    contenedor.add(meshImagen);

    cargador.load(ruta, (textura) => {
      // Ajuste "contain": la imagen entra siempre dentro de un cuadrado de
      // ANCHO_BASE_IMAGEN de lado, cualquiera sea su proporción real -- ni
      // una imagen muy apaisada ni una muy vertical (hay de las dos entre
      // las descargadas, ver CREDITS.md) terminan ocupando más espacio del
      // previsto en la grilla ni empujando los botones "+"/"-" encima de
      // la imagen de abajo.
      const aspecto = textura.image.width / textura.image.height;
      const nuevoAncho = aspecto >= 1 ? ANCHO_BASE_IMAGEN : ANCHO_BASE_IMAGEN * aspecto;
      const nuevoAlto = aspecto >= 1 ? ANCHO_BASE_IMAGEN / aspecto : ANCHO_BASE_IMAGEN;

      meshImagen.geometry.dispose();
      meshImagen.geometry = new THREE.PlaneGeometry(nuevoAncho, nuevoAlto);
      material.map = textura;
      material.color.set(0xffffff);
      material.needsUpdate = true;

      estadoImagen.altoActual = nuevoAlto;
    });

    const botonMas = crearPanelTexto(['+'], {
      ancho: ANCHO_BOTON_ESCALA,
      alto: ALTO_BOTON_ESCALA,
      tamanoFuente: TAMANO_FUENTE_BOTON_ESCALA,
      nombre: `pantalla-imagenes-boton-mas-${idImagen}`,
      interactivo: true,
    });
    botonMas.userData.idImagen = idImagen;
    botonMas.userData.delta = 1;

    const botonMenos = crearPanelTexto(['-'], {
      ancho: ANCHO_BOTON_ESCALA,
      alto: ALTO_BOTON_ESCALA,
      tamanoFuente: TAMANO_FUENTE_BOTON_ESCALA,
      nombre: `pantalla-imagenes-boton-menos-${idImagen}`,
      interactivo: true,
    });
    botonMenos.userData.idImagen = idImagen;
    botonMenos.userData.delta = -1;

    contenedor.add(botonMas, botonMenos);
    estadoImagen.botonMas = botonMas;
    estadoImagen.botonMenos = botonMenos;
    botonesEscala.push(botonMas, botonMenos);

    // `meshImagen` (sin sus hermanos) es el blanco del raycasting que
    // AGARRA el arrastre; `contenedor` (imagen + botones) es lo que
    // efectivamente se MUEVE -- ver el comentario grande al principio del
    // archivo y el JSDoc de `habilitarArrastre` en interaccion.js.
    habilitarArrastre(renderer, meshImagen, contenedor, LIMITES_ARRASTRE);

    return estadoImagen;
  });

  // Ubica los botones "+"/"-" de una imagen justo debajo de ella, a su
  // tamaño visible actual, en coordenadas LOCALES al contenedor (el origen
  // local es el centro de la imagen) -- se llama al construir, cada vez
  // que cambia la escala, y al reiniciar todo. Ya NO hace falta llamarla
  // en cada cuadro para "seguir" a la imagen durante un arrastre: al ser
  // hijos del mismo `contenedor` que se mueve, los botones heredan la
  // posición automáticamente, sin ningún cálculo manual de por medio.
  function actualizarBotonesEscala(estadoImagen) {
    const altoVisible = estadoImagen.altoActual * estadoImagen.escalaActual;
    const yBoton = -altoVisible / 2 - MARGEN_BOTONES_ESCALA;
    estadoImagen.botonMas.position.set(SEPARACION_BOTONES_ESCALA / 2, yBoton, 0);
    estadoImagen.botonMenos.position.set(-SEPARACION_BOTONES_ESCALA / 2, yBoton, 0);
  }
  imagenes.forEach(actualizarBotonesEscala);

  // Página actualmente mostrada (0-based). `alEntrar`, más abajo, la
  // reinicia cada vez que se entra de verdad a esta pantalla.
  let paginaActual = 0;
  const numeroDePaginas = Math.max(1, Math.ceil(imagenes.length / TAMANO_PAGINA));

  // Único mecanismo real para "ocultar" una imagen (de otra página, o de
  // esta pantalla cuando no es la activa): mover su imagen y sus botones a
  // una capa que ni la cámara ni los raycasters de esta pantalla ni el de
  // `habilitarArrastre` consultan. Ver el comentario de CAPA_VISIBLE más
  // arriba -- `.visible` no alcanza porque el raycasting no lo respeta.
  function sincronizarVisibilidad() {
    imagenes.forEach((estadoImagen) => {
      const pagina = Math.floor(estadoImagen.indice / TAMANO_PAGINA);
      const activa = grupo.visible && pagina === paginaActual;
      estadoImagen.meshImagen.visible = activa;
      estadoImagen.botonMas.visible = activa;
      estadoImagen.botonMenos.visible = activa;
      const capa = activa ? CAPA_VISIBLE : CAPA_OCULTA;
      estadoImagen.meshImagen.layers.set(capa);
      estadoImagen.botonMas.layers.set(capa);
      estadoImagen.botonMenos.layers.set(capa);
    });
  }
  sincronizarVisibilidad();

  // Botón "Ver más imágenes": rota entre páginas (si sólo hay una página,
  // con <= TAMANO_PAGINA imágenes, no hace nada más que avisar).
  const botonVerMas = crearPanelTexto(['Ver más imágenes'], {
    posicion: POSICION_BOTON_VER_MAS,
    ancho: ANCHO_BOTON_VER_MAS,
    alto: ALTO_BOTON_VER_MAS,
    nombre: 'pantalla-imagenes-boton-ver-mas',
    icono: 'flecha',
    interactivo: true,
  });
  grupo.add(botonVerMas);

  const raycaster = new THREE.Raycaster();
  const vectorOrigen = new THREE.Vector3();
  const vectorDireccion = new THREE.Vector3();

  enEventoSeleccion(renderer, (origen, direccion) => {
    // Mismo criterio que pantalla-menu.js/pantalla-subtitulos.js: hay que
    // ignorar el gesto a mano si esta pantalla no es la activa.
    if (!grupo.visible) return;

    vectorOrigen.set(origen.x, origen.y, origen.z);
    vectorDireccion.set(direccion.x, direccion.y, direccion.z).normalize();
    raycaster.set(vectorOrigen, vectorDireccion);

    const impactosVerMas = raycaster.intersectObject(botonVerMas, false);
    if (impactosVerMas.length > 0) {
      paginaActual = (paginaActual + 1) % numeroDePaginas;
      sincronizarVisibilidad();
      onVerMas();
      return;
    }

    const impactosEscala = raycaster.intersectObjects(botonesEscala, false);
    if (impactosEscala.length === 0) return; // no tocó ningún botón

    const { idImagen, delta } = impactosEscala[0].object.userData;
    const estadoImagen = imagenes.find((img) => img.idImagen === idImagen);
    if (!estadoImagen) return;

    const nuevaEscala = Math.min(Math.max(estadoImagen.escalaActual + delta, TAMANO_MIN), TAMANO_MAX);
    if (nuevaEscala === estadoImagen.escalaActual) return;

    estadoImagen.escalaActual = nuevaEscala;
    estadoImagen.meshImagen.scale.setScalar(nuevaEscala);
    actualizarBotonesEscala(estadoImagen);
    onEscalarImagen(idImagen, nuevaEscala);
  });

  // `habilitarArrastre` mueve `contenedor.position` directamente, sin
  // avisar a quien lo llamó: para notificar `onMoverImagen` en cada cambio
  // se compara la posición de cada contenedor cuadro a cuadro. No se usa
  // `renderer.setAnimationLoop` -- ya lo ocupa main.js con el loop de
  // render -- así que este chequeo corre en su propio
  // `requestAnimationFrame`, independiente de ése. A diferencia de antes,
  // ya NO hace falta llamar a `actualizarBotonesEscala` acá: los botones
  // son hijos del mismo `contenedor` que se mueve, así que ya siguen la
  // posición solos (ver el comentario grande al principio del archivo) --
  // este chequeo sólo existe para la notificación de persistencia hacia
  // `main.js`, no para mantener nada sincronizado visualmente.
  //
  // De paso, cada cuadro vuelve a aplicar `sincronizarVisibilidad()`: no
  // alcanza con llamarla sólo al cambiar de página o al entrar a esta
  // pantalla (`alEntrar`, más abajo), porque `grupo.visible` también cambia
  // cuando el usuario sale de esta pantalla hacia otra (lo hace
  // `actualizarPantallaVisible` en main.js, fuera de nuestro control) y, si
  // no se vuelve a sincronizar en ese momento, las imágenes quedarían en la
  // capa "visible" -- y por lo tanto agarrables por `habilitarArrastre` --
  // aunque el usuario esté viendo otra pantalla.
  function verificarCambios() {
    sincronizarVisibilidad();

    if (grupo.visible) {
      imagenes.forEach((estadoImagen) => {
        const { x, y, z } = estadoImagen.contenedor.position;
        const anterior = estadoImagen.ultimaPosicionNotificada;
        if (x !== anterior.x || y !== anterior.y || z !== anterior.z) {
          estadoImagen.ultimaPosicionNotificada = { x, y, z };
          onMoverImagen(estadoImagen.idImagen, { x, y, z });
        }
      });
    }
    requestAnimationFrame(verificarCambios);
  }
  requestAnimationFrame(verificarCambios);

  // Enganche de "entró a esta pantalla" (ver cambiarPantalla en main.js):
  // siempre arranca mostrando la primera página, para que el participante
  // vea siempre las mismas imágenes primero al volver a esta pantalla.
  grupo.alEntrar = function alEntrarAPantallaImagenes() {
    paginaActual = 0;
    sincronizarVisibilidad();
  };

  // Gancho de "Reiniciar todo" (Tarea 18): vuelve cada imagen a su posición
  // de grilla por defecto y a TAMANO_MIN, como si nadie la hubiera tocado
  // todavía. A diferencia de `alEntrar()` (que sólo reinicia la página
  // mostrada), esto sí debe tocar persistencia real -- un reset de verdad
  // borra las preferencias guardadas, no sólo la navegación interna.
  grupo.alReiniciarTodo = function alReiniciarTodoPantallaImagenes() {
    imagenes.forEach((estadoImagen) => {
      const posicionPorDefecto = POSICIONES_GRILLA[estadoImagen.indice % TAMANO_PAGINA];
      const nuevaPosicion = { x: posicionPorDefecto.x, y: posicionPorDefecto.y, z: Z_POR_DEFECTO };
      estadoImagen.contenedor.position.set(nuevaPosicion.x, nuevaPosicion.y, nuevaPosicion.z);
      estadoImagen.escalaActual = TAMANO_MIN;
      estadoImagen.meshImagen.scale.setScalar(TAMANO_MIN);
      estadoImagen.ultimaPosicionNotificada = { ...nuevaPosicion };
      actualizarBotonesEscala(estadoImagen);
    });
  };

  return grupo;
}
