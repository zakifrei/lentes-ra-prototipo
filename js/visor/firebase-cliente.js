// Cliente de Firebase Realtime Database para el visor (Tarea 16): escucha
// el nodo de estado que escribe el panel del observador (panel.html,
// Tarea 17) y entrega cada valor crudo a quien lo llame. Módulo
// deliberadamente "tonto" -- no valida ni aplica nada: esa responsabilidad
// ya existe y queda en `aplicarComando` (js/common/estado.js, Tarea 5), que
// rechaza cualquier comando corrupto o con campos inesperados. Duplicar esa
// defensa acá sería repetir lógica que ya está probada en otro lado.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getDatabase,
  ref,
  onValue,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from '../config/firebase-config.js';
import { nodoRaizFirebase } from '../common/firebase-mensajes.js';

/**
 * Conecta a Firebase Realtime Database y llama a `onNuevoComando` con el
 * valor crudo del nodo que nombra `nodoRaizFirebase()` cada vez que cambia
 * (incluida la primera carga). El valor puede ser `null` (el nodo no
 * existe todavía en la base), cualquier tipo primitivo, o un objeto con
 * campos inesperados -- nada de eso se filtra acá a propósito; quien
 * reciba el comando lo pasa por `aplicarComando` antes de usarlo.
 * @param {(comando: object) => void} onNuevoComando
 */
export function escucharEstadoFirebase(onNuevoComando) {
  const app = initializeApp(firebaseConfig);
  const baseDeDatos = getDatabase(app);
  const nodoEstado = ref(baseDeDatos, nodoRaizFirebase());

  onValue(nodoEstado, (snapshot) => {
    onNuevoComando(snapshot.val());
  });
}
