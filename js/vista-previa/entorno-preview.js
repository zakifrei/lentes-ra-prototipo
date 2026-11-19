// Entorno de referencia SOLO para la vista previa de escritorio (Tarea de
// ajuste visual, a pedido de la profesora a cargo de la prueba): un piso, una
// pared y una silueta simple "como si fuera la profesora en el medio", para
// que orbitar con el mouse no se sienta como paneles flotando en un vacío
// negro absoluto.
//
// Por qué sólo en la vista previa: en el Quest real, ese "vacío" lo llena el
// passthrough de la cámara (el aula real, con la profesora real adentro) --
// agregar acá una profesora de mentira y mostrarla también en RA real
// taparía/confundiría a la real. `main.js` agrega este grupo a la escena y
// lo oculta/muestra con los mismos eventos 'sessionstart'/'sessionend' que ya
// usa para `indicadorVistaPrevia`/`controlesVistaPrevia` (Tarea 1): visible
// mientras no hay sesión WebXR activa, oculto apenas arranca una real.
//
// Nunca debe cambiar el tamaño/posición de ningún panel de
// `js/visor/paneles/`: esos valores ya se calibraron con pruebas reales en
// el casco (ver sus propios comentarios) -- esto es sólo un fondo, no toca
// nada de lo que ya está puesto a punto.

import * as THREE from '../../vendor/three/three.module.js';

// Medio realista (no quiere ser fiel al aula real, sólo dar referencia de
// piso/pared/distancia): marrón cálido para el piso, un tono neutro para la
// pared -- ninguno usa la paleta ámbar de `tema-visual.js` a propósito, para
// no confundirse con los carteles/botones de la interfaz RA (esos sí deben
// seguir leyéndose como "la interfaz"; esto es sólo "el entorno").
const COLOR_PISO = '#6b4a2f';
const COLOR_GRILLA_PISO = '#8a6342';
const COLOR_PARED = '#cfcab8';
const COLOR_SILUETA = '#9a958c';
const COLOR_SILUETA_CABEZA = '#aba6a0';

// Ambos agrandados (de 12 a 20/7) tras revisar la primera versión: a 12m el
// borde del piso y el borde superior de la pared quedaban DENTRO del
// encuadre por defecto (se veía el "cartón" en vez de un cuarto que sigue
// más allá de lo que se ve) -- con estos valores, el borde queda fuera de
// la vista normal sin orbitar/alejar demasiado.
const LADO_PISO = 20; // metros
const REPETICIONES_GRILLA = 20; // una celda de grilla por metro

const ALTO_PARED = 7;
const ANCHO_PARED = 20;
const Z_PARED = -4.5; // detrás de todos los paneles (el más lejano llega a z=-3.1)

const Z_SILUETA = -2.6; // entre los paneles y la pared: "la profesora, detrás de la interfaz"
const ALTO_CUERPO_SILUETA = 1.4;
const RADIO_CUERPO_SILUETA = 0.22;
const RADIO_CABEZA_SILUETA = 0.14;

// Textura de grilla del piso: mismo patrón "dibujar en un <canvas> y crear
// una CanvasTexture" que ya usa el resto del proyecto (ver panel-texto.js),
// acá sólo para dar una referencia de perspectiva/distancia al piso -- un
// plano liso de un solo color, bajo la luz ambiental plana de la escena
// (sin luz direccional), no deja ver su propia inclinación ni cuán lejos
// se extiende.
function crearTexturaGrillaPiso() {
  const canvas = document.createElement('canvas');
  const resolucion = 128;
  canvas.width = resolucion;
  canvas.height = resolucion;
  const contexto = canvas.getContext('2d');

  contexto.fillStyle = COLOR_PISO;
  contexto.fillRect(0, 0, resolucion, resolucion);

  contexto.strokeStyle = COLOR_GRILLA_PISO;
  contexto.lineWidth = 2;
  contexto.strokeRect(0, 0, resolucion, resolucion);

  const textura = new THREE.CanvasTexture(canvas);
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(REPETICIONES_GRILLA, REPETICIONES_GRILLA);
  return textura;
}

function crearPiso() {
  const geometria = new THREE.PlaneGeometry(LADO_PISO, LADO_PISO);
  const material = new THREE.MeshBasicMaterial({ map: crearTexturaGrillaPiso() });
  const piso = new THREE.Mesh(geometria, material);
  piso.name = 'preview-piso';
  // PlaneGeometry nace parado (normal hacia +Z); rotarlo -90° en X lo acuesta
  // en el plano XZ, con la normal hacia +Y (piso visto desde arriba).
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = 0;
  return piso;
}

function crearPared() {
  const geometria = new THREE.PlaneGeometry(ANCHO_PARED, ALTO_PARED);
  const material = new THREE.MeshBasicMaterial({ color: COLOR_PARED });
  const pared = new THREE.Mesh(geometria, material);
  pared.name = 'preview-pared';
  pared.position.set(0, ALTO_PARED / 2, Z_PARED);
  return pared;
}

// Silueta deliberadamente simple (cilindro + esfera, sin rasgos ni rostro):
// no pretende representar a una persona real ni a nadie en particular, sólo
// marcar "acá hay alguien parada" para que los paneles de la interfaz no se
// sientan flotando frente a nada.
function crearSiluetaProfesora() {
  const grupo = new THREE.Group();
  grupo.name = 'preview-silueta-profesora';

  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIO_CUERPO_SILUETA, RADIO_CUERPO_SILUETA * 1.15, ALTO_CUERPO_SILUETA, 16),
    new THREE.MeshBasicMaterial({ color: COLOR_SILUETA })
  );
  cuerpo.position.y = ALTO_CUERPO_SILUETA / 2;
  grupo.add(cuerpo);

  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(RADIO_CABEZA_SILUETA, 16, 16),
    new THREE.MeshBasicMaterial({ color: COLOR_SILUETA_CABEZA })
  );
  cabeza.position.y = ALTO_CUERPO_SILUETA + RADIO_CABEZA_SILUETA;
  grupo.add(cabeza);

  grupo.position.set(0, 0, Z_SILUETA);
  return grupo;
}

/**
 * Crea el entorno de referencia (piso + pared + silueta) para la vista
 * previa de escritorio. Quien llama (`main.js`) debe agregarlo a la escena
 * una sola vez y alternar su `.visible` con los mismos eventos
 * 'sessionstart'/'sessionend' que ya usa para el resto de los elementos
 * exclusivos de la vista previa -- nunca debe verse durante una sesión RA
 * real (ver comentario grande al principio del archivo).
 * @returns {THREE.Group}
 */
export function crearEntornoPreview() {
  const grupo = new THREE.Group();
  grupo.name = 'preview-entorno';
  grupo.add(crearPiso());
  grupo.add(crearPared());
  grupo.add(crearSiluetaProfesora());
  return grupo;
}
