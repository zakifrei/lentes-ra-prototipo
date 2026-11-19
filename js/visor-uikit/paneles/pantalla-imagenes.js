// Pantalla de imágenes (visor-uikit, Tarea 5 del plan de migración, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): mismos valores
// físicos y misma arquitectura (contenedor arrastrable con la imagen y
// sus botones "+"/"-" como hijos, páginas por capas) que
// js/visor/paneles/pantalla-imagenes.js (leído como referencia).
//
// Las imágenes de contenido NO son parte de esta migración (tal como
// dice el plan): siguen siendo `THREE.Mesh` comunes con
// `THREE.TextureLoader`/`THREE.PlaneGeometry`, idénticas a la versión
// vieja. Sólo los botones "+"/"-" de escala y "Ver más imágenes" pasan a
// `crearPanelUikit`.

import * as THREE from '../../../vendor/three/three.module.js';
import { crearPanelUikit } from '../ui-kit/panel-uikit.js';
import { enEventoSeleccion, habilitarArrastre } from '../../visor/interaccion.js';
import { TAMANO_MIN, TAMANO_MAX } from '../../common/persistencia.js';

// Mismos valores físicos que la versión vieja.
const TAMANO_PAGINA = 2;
const ANCHO_BASE_IMAGEN = 0.42;
const POSICIONES_GRILLA = [
  { x: -0.6, y: 1.2 },
  { x: 0.6, y: 1.2 },
];
const Z_POR_DEFECTO = -1.9;
const ANGULO_TOE_IN = Math.PI / 7; // ~25.7°

const LIMITES_ARRASTRE = {
  x: [-1.2, 1.2],
  y: [0.5, 1.9],
  z: [-3.1, -1.2],
};

const ANCHO_BOTON_ESCALA = 0.18;
const ALTO_BOTON_ESCALA = 0.18;
const TAMANO_FUENTE_BOTON_ESCALA = 350;
const SEPARACION_BOTONES_ESCALA = 0.4;
const MARGEN_BOTONES_ESCALA = 0.13;

const POSICION_BOTON_VER_MAS = { x: 0, y: 0.55, z: -1.2 };
const ANCHO_BOTON_VER_MAS = 0.6;
const ALTO_BOTON_VER_MAS = 0.18;

// Mismo mecanismo de capas que la versión vieja (ver su comentario
// grande): el raycasting de Three.js no filtra por `.visible`, así que
// una imagen de otra página (o de esta pantalla cuando no es la activa)
// se vuelve intocable moviéndola a una capa que la cámara y los
// raycasters no consultan -- funciona igual para un panel de uikit que
// para un Mesh común, porque `.layers` es un mecanismo de THREE.Object3D,
// no de uikit.
const CAPA_VISIBLE = 0;
const CAPA_OCULTA = 1;

function idDesdeRuta(ruta) {
  const archivo = ruta.split('/').pop();
  return archivo.replace(/\.[^./]+$/, '');
}

/**
 * Crea la pantalla de imágenes -- misma firma que la versión vieja.
 * @param {THREE.WebGLRenderer} renderer
 * @param {string[]} rutasImagenes
 * @param {{tamanoSubtitulo:number, imagenes:Record<string,{x:number,y:number,z:number,escala:number}>}} persistencia
 * @param {(idImagen:string, posicion:{x:number,y:number,z:number}) => void} onMoverImagen
 * @param {(idImagen:string, escala:number) => void} onEscalarImagen
 * @param {() => void} onVerMas
 * @returns {THREE.Object3D} grupo con `actualizarUikit(deltaMs)` (misma
 *   convención que el resto de las pantallas) más `alEntrar()` y
 *   `alReiniciarTodo()` (misma convención que la versión vieja)
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

    const botonMas = crearPanelUikit(['+'], {
      ancho: ANCHO_BOTON_ESCALA,
      alto: ALTO_BOTON_ESCALA,
      tamanoFuente: TAMANO_FUENTE_BOTON_ESCALA,
      nombre: `pantalla-imagenes-boton-mas-${idImagen}`,
      interactivo: true,
    });
    botonMas.userData.idImagen = idImagen;
    botonMas.userData.delta = 1;

    const botonMenos = crearPanelUikit(['-'], {
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

    habilitarArrastre(renderer, meshImagen, contenedor, LIMITES_ARRASTRE);

    return estadoImagen;
  });

  // Mismo criterio que la versión vieja: botones "+"/"-" justo debajo de
  // la imagen, a su tamaño visible actual, en coordenadas LOCALES al
  // contenedor.
  function actualizarBotonesEscala(estadoImagen) {
    const altoVisible = estadoImagen.altoActual * estadoImagen.escalaActual;
    const yBoton = -altoVisible / 2 - MARGEN_BOTONES_ESCALA;
    estadoImagen.botonMas.position.set(SEPARACION_BOTONES_ESCALA / 2, yBoton, 0);
    estadoImagen.botonMenos.position.set(-SEPARACION_BOTONES_ESCALA / 2, yBoton, 0);
  }
  imagenes.forEach(actualizarBotonesEscala);

  let paginaActual = 0;
  const numeroDePaginas = Math.max(1, Math.ceil(imagenes.length / TAMANO_PAGINA));

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

  const botonVerMas = crearPanelUikit(['Ver más imágenes'], {
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
    if (impactosEscala.length === 0) return;

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

  grupo.alEntrar = function alEntrarAPantallaImagenes() {
    paginaActual = 0;
    sincronizarVisibilidad();
  };

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

  grupo.actualizarUikit = (deltaMs) => {
    botonesEscala.forEach((boton) => boton.update(deltaMs));
    botonVerMas.update(deltaMs);
  };

  return grupo;
}
