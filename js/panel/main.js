// Punto de entrada del panel del observador (Tarea 17): página real que el
// observador de la prueba de usabilidad abre (normalmente en su celular)
// para controlar el visor a través de Firebase. Esta app es independiente
// del visor -- nunca importa nada de `js/visor/*`, sólo los módulos puros
// compartidos (`js/common/firebase-mensajes.js`, `js/common/estado.js`) y
// el mismo `firebaseConfig` que usa el visor (Tarea 16).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getDatabase,
  ref,
  update,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from '../config/firebase-config.js';
import {
  nodoRaizFirebase,
  construirComandoPantalla,
  construirComandoTiempoVuelta,
  construirComandoReset,
} from '../common/firebase-mensajes.js';
import { PANTALLAS } from '../common/estado.js';

// Etiqueta legible por pantalla interna, sólo para el texto del botón --
// `PANTALLAS` (js/common/estado.js) sigue siendo la única fuente de verdad
// de qué pantallas existen y en qué orden: este objeto no agrega ni quita
// ninguna, sólo les pone un nombre presentable.
const ETIQUETAS_PANTALLA = {
  reconocimiento: 'Reconocimiento',
  bienvenida: 'Bienvenida',
  menu: 'Menú',
  subtitulos: 'Subtítulos',
  imagenes: 'Imágenes',
  mapa: 'Mapa conceptual',
  aviso: 'Disparar aviso',
  pausa: 'Iniciar pausa',
  vuelta: 'Terminar pausa',
  resumen: 'Resumen rápido',
};

const app = initializeApp(firebaseConfig);
const baseDeDatos = getDatabase(app);
const nodoEstado = ref(baseDeDatos, nodoRaizFirebase());

const elementoEstadoConexion = document.getElementById('estado-conexion');

// Cada botón/acción escribe sólo los campos que le corresponden con
// `update()` (nunca `set()` con el nodo completo) para no pisar el resto
// del estado -- ver ledger de la Tarea 17 sobre por qué `update()` es la
// forma correcta de lograr lo que el brief original pedía como "set
// combinado con el valor previo".
function enviarComando(comando) {
  update(nodoEstado, comando).catch((error) => {
    mostrarEstadoConexion(`Error al enviar el comando: ${error.message}`);
  });
}

function mostrarEstadoConexion(texto) {
  if (elementoEstadoConexion) elementoEstadoConexion.textContent = texto;
}

function crearBotonesDePantalla() {
  const contenedor = document.getElementById('botones-pantalla');
  if (!contenedor) return;

  PANTALLAS.forEach((pantalla) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = ETIQUETAS_PANTALLA[pantalla] ?? pantalla;
    boton.addEventListener('click', () => {
      enviarComando(construirComandoPantalla(pantalla));
    });
    contenedor.appendChild(boton);
  });
}

function habilitarTiempoVuelta() {
  const boton = document.getElementById('boton-aplicar-tiempo-vuelta');
  const input = document.getElementById('input-tiempo-vuelta');
  if (!boton || !input) return;

  boton.addEventListener('click', () => {
    const minutos = Number(input.value);
    enviarComando(construirComandoTiempoVuelta(minutos));
  });
}

function habilitarReiniciarTodo() {
  const boton = document.getElementById('boton-reiniciar-todo');
  if (!boton) return;

  boton.addEventListener('click', () => {
    enviarComando(construirComandoReset());
  });
}

crearBotonesDePantalla();
habilitarTiempoVuelta();
habilitarReiniciarTodo();
mostrarEstadoConexion('Panel listo.');
