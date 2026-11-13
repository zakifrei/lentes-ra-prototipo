# Lentes RA — Prototipo WebXR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el prototipo WebXR de lentes de RA para la prueba de usabilidad (Meta Quest 3/3S, passthrough), con panel de observador por Firebase, publicado en GitHub Pages.

**Architecture:** Página estática (`index.html`) con una escena Three.js en sesión WebXR `immersive-ar` (passthrough), módulos ES planos sin build step. Un segundo documento estático (`panel.html`) es el panel del observador. Ambos se comunican de forma unidireccional (panel → Firebase Realtime Database → visor). La lógica de estado, persistencia y mensajería vive en módulos puros testeables con el test runner nativo de Node; el renderizado 3D/WebXR se verifica a mano en el modo de vista previa de escritorio y en el Quest real.

**Tech Stack:** Three.js (vendorizado en `vendor/three/`), WebXR nativo del navegador, Firebase JS SDK modular v10 (importado desde el CDN de Google, `gstatic.com`), JavaScript ES modules sin bundler, `node --test` (nativo de Node ≥18) para los módulos puros, `python3 -m http.server` como servidor estático de desarrollo.

**Spec:** `docs/superpowers/specs/2026-11-13-lentes-ra-design.md`

## Global Constraints

- Textos de interfaz exactos, sin parafrasear (copiados del guion):
  - Reconocimiento: `"Mirá al frente para identificarte"`
  - Bienvenida: `"Hola, Sofía · Historia · La clase está por empezar"` + perfil `"Aprendés mejor con imágenes"`
  - Aviso de atención: `"Notamos que tus niveles de atención disminuyeron. ¿Querés ayuda?"`
  - Pausa activa: `"Pausa iniciada. Podés sacarte los lentes. Lo que explique la profesora se guarda en 'Temas pendientes'"`
  - Vuelta de pausa: `"Bienvenida de vuelta · Estuviste {min} min en pausa · Se guardaron {temas} temas"`, opciones `"Seguir con la clase"` / `"Ver un resumen rápido"`
- Interacción: un solo mecanismo de selección WebXR (`select`/`selectstart`/`selectend`) cubre mano (pellizco) y control (gatillo); nunca dos caminos de código paralelos para lo mismo.
- Los paneles 3D nunca cubren el centro del campo visual del usuario.
- Paleta cálida ámbar/naranja sobre fondos oscuros semitransparentes, tipografía limpia tipo HUD, texto legible sobre passthrough real (alto contraste).
- Persistencia de tamaño de subtítulo y posición/tamaño de imágenes: **en memoria** (nunca `localStorage` ni Firebase); sobrevive a la pausa; solo se resetea con el comando "reiniciar todo".
- Comunicación panel↔visor: Firebase Realtime Database, un único nodo de estado, flujo **unidireccional** panel → Firebase → visor (el visor nunca escribe en Firebase).
- Sin reconexión automática ante cortes de red o de sesión WebXR (decisión ya tomada en el spec).
- Idioma de interfaz y comentarios de código: español.
- Sin paso de build: todos los archivos deben poder servirse tal cual desde GitHub Pages.
- Sin backend propio aparte de Firebase Realtime Database.
- Imágenes de la clase descargadas al repo (no enlazadas en línea), con autor y licencia anotados en `CREDITS.md`.

## Review Focus

- Llega a Firebase (o al visor) un comando con un campo faltante, de tipo inesperado, o un nombre de pantalla que no existe → el visor debe ignorarlo o aplicarlo de forma seguro, nunca romperse. (cubierto en Task 5)
- El observador cambia de pantalla mientras el usuario está a mitad de un gesto de arrastre (imagen o subtítulo) → la posición ya guardada no debe perderse ni quedar en un estado inconsistente. (cubierto en Task 10)
- "Reiniciar todo" se dispara a mitad de la clase, no solo entre participantes distintos → el visor vuelve a un estado limpio, sin tamaños/posiciones residuales. (cubierto en Task 18)
- El observador ingresa un valor no numérico o negativo como "tiempo mostrado en la vuelta" → el texto debe sanearse a un valor válido (nunca mostrar `NaN` o un número negativo). (cubierto en Tasks 11 y 15)
- El usuario agranda los subtítulos o achica/agranda las imágenes hasta un extremo → debe existir un tamaño mínimo y máximo que mantenga el contenido legible/manejable. (cubierto en Tasks 8 y 9)

---

## Etapa 1 — Escena passthrough con panel de subtítulos movible

### Task 1: Scaffold del proyecto y vendorizado de Three.js

**Files:**
- Create: `index.html`
- Create: `package.json` (solo `{"type": "module"}`, no se publica ninguna dependencia npm)
- Create: `vendor/three/three.module.js`
- Create: `vendor/three/OrbitControls.js`
- Create: `js/visor/main.js`
- Create: `README.md` (instrucciones de desarrollo: cómo servir con `python3 -m http.server` y cómo correr los tests con `node --test test/`)

**Interfaces:**
- Produces: `js/visor/main.js` exporta nada todavía; solo monta una escena Three.js vacía en `<canvas id="escena">` de `index.html`.

- [ ] **Step 1: Descargar los builds ESM estables más recientes de Three.js core y del addon `OrbitControls.js`** (misma versión para ambos) y guardarlos en `vendor/three/`.
- [ ] **Step 2: Crear `index.html`** con un `<canvas id="escena">` a pantalla completa y un `<script type="module" src="js/visor/main.js">`.
- [ ] **Step 3: Crear `js/visor/main.js`** que importe Three.js desde `../../vendor/three/three.module.js`, cree `Scene`, `PerspectiveCamera`, `WebGLRenderer` (fondo transparente), y un `AmbientLight` simple; renderice en loop con `renderer.setAnimationLoop`.
- [ ] **Step 4: Verificar manualmente**: correr `python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000` en una compu, confirmar que no hay errores en la consola del navegador y que se ve un canvas negro sin errores.
- [ ] **Step 5: Commit**

```bash
git add index.html package.json vendor/ js/visor/main.js README.md
git commit -m "feat: scaffold del proyecto con Three.js vendorizado"
```

### Task 2: Sesión WebXR passthrough con modo de vista previa de escritorio

**Files:**
- Create: `js/visor/xr-sesion.js`
- Create: `js/vista-previa/control-mouse.js`
- Modify: `js/visor/main.js`
- Modify: `index.html` (agregar botón "Entrar a RA" / "Vista previa (mouse)")

**Interfaces:**
- Produces (`js/visor/xr-sesion.js`): `function iniciarBotonXR(renderer, escena, camara): HTMLElement` — crea y devuelve el botón que arranca una sesión `immersive-ar` con `optionalFeatures: ['hand-tracking']`.
- Produces (`js/vista-previa/control-mouse.js`): `function activarVistaPrevia(renderer, camara, domElement): OrbitControls` — envuelve `OrbitControls` para simular la vista de la cabeza con el mouse cuando no hay WebXR.

- [ ] **Step 1: Implementar `iniciarBotonXR`** en `js/visor/xr-sesion.js`: detecta soporte de `immersive-ar` con `navigator.xr.isSessionSupported`, y si existe muestra un botón "Entrar a RA" que llama a `renderer.xr.setSession(...)` con `environmentBlendMode` passthrough.
- [ ] **Step 2: Implementar `activarVistaPrevia`** en `js/vista-previa/control-mouse.js`: si WebXR no está soportado (o el usuario no entra a RA), instancia `OrbitControls` sobre la cámara para poder orbitar con el mouse.
- [ ] **Step 3: Conectar ambos caminos en `js/visor/main.js`**: intenta WebXR primero, si no hay soporte cae a vista previa de escritorio.
- [ ] **Step 4: Verificar manualmente en la compu**: abrir la vista previa, confirmar que se puede orbitar la cámara arrastrando con el mouse.
- [ ] **Step 5: Avisar al dueño del proyecto para probar en el Quest**: abrir la URL de GitHub Pages desde el navegador del Quest, tocar "Entrar a RA", confirmar que se ve el passthrough (cámara a color) de fondo.
- [ ] **Step 6: Commit**

```bash
git add js/visor/xr-sesion.js js/vista-previa/control-mouse.js js/visor/main.js index.html
git commit -m "feat: sesion WebXR passthrough con fallback de vista previa de escritorio"
```

### Task 3: Lógica de arrastre con límites de campo visual (pure, testeada)

**Files:**
- Create: `js/common/arrastre.js`
- Test: `test/arrastre.test.mjs`

**Interfaces:**
- Produces: `function limitarPosicion(posicion: {x:number,y:number,z:number}, limites: {x:[min,max], y:[min,max], z:[min,max]}): {x,y,z}` — clampa cada eje a su rango, sin mutar el objeto de entrada.

- [ ] **Step 1: Escribir el test que falla**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitarPosicion } from '../js/common/arrastre.js';

test('posicion dentro de los limites no cambia', () => {
  const limites = { x: [-1, 1], y: [-1, 1], z: [-2, -0.5] };
  assert.deepEqual(limitarPosicion({ x: 0, y: 0.3, z: -1 }, limites), { x: 0, y: 0.3, z: -1 });
});

test('posicion fuera de los limites se clampa a cada eje', () => {
  const limites = { x: [-1, 1], y: [-1, 1], z: [-2, -0.5] };
  assert.deepEqual(limitarPosicion({ x: 5, y: -5, z: 10 }, limites), { x: 1, y: -1, z: -0.5 });
});
```

- [ ] **Step 2: Correr `node --test test/arrastre.test.mjs` y confirmar que falla** (el módulo no existe todavía).
- [ ] **Step 3: Implementar `limitarPosicion` en `js/common/arrastre.js`** usando `Math.min`/`Math.max` por eje.
- [ ] **Step 4: Correr `node --test test/arrastre.test.mjs` y confirmar que pasa.**
- [ ] **Step 5: Commit**

```bash
git add js/common/arrastre.js test/arrastre.test.mjs
git commit -m "feat: logica de clamp de posicion para paneles arrastrables"
```

### Task 4: Panel de subtítulos 3D movible

**Files:**
- Create: `js/visor/paneles/panel-subtitulos.js`
- Create: `js/visor/interaccion.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Consumes: `limitarPosicion` de `js/common/arrastre.js` (Task 3).
- Produces (`js/visor/paneles/panel-subtitulos.js`): `function crearPanelSubtitulos(texto: string): THREE.Object3D` — un plano con una `CanvasTexture` del texto, ubicado por defecto fuera del centro del campo visual.
- Produces (`js/visor/interaccion.js`): `function habilitarArrastre(renderer, objeto, limites)` — engancha los eventos `selectstart`/`selectend`/`move` de la XRSession (o del mouse en vista previa) para mover `objeto`, pasando siempre la nueva posición por `limitarPosicion`.

- [ ] **Step 1: Implementar `crearPanelSubtitulos`** con un texto de ejemplo fijo ("Texto de ejemplo") dibujado en un canvas 2D, usado como `CanvasTexture` sobre un `PlaneGeometry`.
- [ ] **Step 2: Implementar `habilitarArrastre`**: un único listener de "selección" que sirve tanto para el evento `select` de WebXR (mano/control) como para `mousedown`+`mousemove` en el modo de vista previa, moviendo el objeto mientras está activo y aplicando `limitarPosicion` en cada frame.
- [ ] **Step 3: Conectar en `js/visor/main.js`**: crear el panel de subtítulos y habilitar su arrastre.
- [ ] **Step 4: Verificar manualmente en la vista previa de escritorio**: hacer click y arrastrar el panel, confirmar que se mueve y que no puede salir de los límites definidos.
- [ ] **Step 5: Avisar al dueño del proyecto para probar en el Quest**: con la mano (pellizco) y con el control (gatillo), agarrar y mover el panel de subtítulos.
- [ ] **Step 6: Commit**

```bash
git add js/visor/paneles/panel-subtitulos.js js/visor/interaccion.js js/visor/main.js
git commit -m "feat: panel de subtitulos arrastrable en RA y en vista previa"
```

---

## Etapa 2 — Menú, subtítulos reales, imágenes y mapa conceptual

### Task 5: Módulo de estado de pantallas (pure, testeado)

**Files:**
- Create: `js/common/estado.js`
- Test: `test/estado.test.mjs`

**Interfaces:**
- Produces: `const PANTALLAS = ['reconocimiento','bienvenida','menu','subtitulos','imagenes','mapa','aviso','pausa','vuelta','resumen']`
- Produces: `function estadoPorDefecto(): {pantalla, avisoActivo, pausaActiva, tiempoVueltaMin, temasGuardados, resetId}`
- Produces: `function aplicarComando(estadoActual, comando): nuevoEstado` — valida `comando` (campos conocidos, `pantalla` dentro de `PANTALLAS`, tipos esperados); si `comando` es inválido o desconocido, devuelve `estadoActual` sin cambios.

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoPorDefecto, aplicarComando, PANTALLAS } from '../js/common/estado.js';

test('aplicarComando cambia de pantalla con un comando valido', () => {
  const estado = aplicarComando(estadoPorDefecto(), { pantalla: 'menu' });
  assert.equal(estado.pantalla, 'menu');
});

test('aplicarComando ignora una pantalla que no existe', () => {
  const inicial = estadoPorDefecto();
  const estado = aplicarComando(inicial, { pantalla: 'pantalla-inventada' });
  assert.equal(estado.pantalla, inicial.pantalla);
});

test('aplicarComando ignora un comando sin forma reconocible', () => {
  const inicial = estadoPorDefecto();
  const estado = aplicarComando(inicial, { campoQueNoExiste: 123 });
  assert.deepEqual(estado, inicial);
});

test('aplicarComando ignora un comando nulo o no es objeto', () => {
  const inicial = estadoPorDefecto();
  assert.deepEqual(aplicarComando(inicial, null), inicial);
  assert.deepEqual(aplicarComando(inicial, 'texto'), inicial);
});
```

- [ ] **Step 2: Correr `node --test test/estado.test.mjs` y confirmar que falla.**
- [ ] **Step 3: Implementar `estado.js`** con las funciones de arriba.
- [ ] **Step 4: Correr `node --test test/estado.test.mjs` y confirmar que pasa.**
- [ ] **Step 5: Commit**

```bash
git add js/common/estado.js test/estado.test.mjs
git commit -m "feat: modulo de estado de pantallas con validacion defensiva"
```

### Task 6: Pantallas de reconocimiento y bienvenida + navegación local de desarrollo

**Files:**
- Create: `js/visor/paneles/panel-texto.js`
- Create: `js/visor/paneles/pantalla-reconocimiento.js`
- Create: `js/visor/paneles/pantalla-bienvenida.js`
- Create: `js/visor/navegacion-dev.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Consumes: `estadoPorDefecto`, `aplicarComando`, `PANTALLAS` de `js/common/estado.js` (Task 5).
- Produces (`js/visor/paneles/panel-texto.js`): `function crearPanelTexto(lineas: string[], opciones?): THREE.Object3D` — panel genérico reutilizable con una o más líneas de texto, usado por las pantallas estáticas.
- Produces: `function crearPantallaReconocimiento(): THREE.Object3D` con el texto exacto `"Mirá al frente para identificarte"`.
- Produces: `function crearPantallaBienvenida(): THREE.Object3D` con `"Hola, Sofía · Historia · La clase está por empezar"` y `"Aprendés mejor con imágenes"`.
- Produces (`js/visor/navegacion-dev.js`): `function habilitarNavegacionDev(callback: (pantalla: string) => void)` — escucha las teclas `1`-`9` del teclado y llama a `callback` con el nombre de pantalla correspondiente; placeholder temporal hasta que exista el panel del observador (Etapa 4).

- [ ] **Step 1: Implementar `crearPanelTexto`** con texto multilinea centrado, fuera del centro del campo visual.
- [ ] **Step 2: Implementar `crearPantallaReconocimiento` y `crearPantallaBienvenida`** usando `crearPanelTexto` con los textos literales de arriba.
- [ ] **Step 3: Implementar `habilitarNavegacionDev`.**
- [ ] **Step 4: Conectar en `js/visor/main.js`**: mantener un `estadoActual = estadoPorDefecto()`; al recibir una tecla, `estadoActual = aplicarComando(estadoActual, { pantalla })`; mostrar solo el panel de la pantalla activa (ocultar el resto).
- [ ] **Step 5: Verificar manualmente en la vista previa**: apretar las teclas de reconocimiento/bienvenida y confirmar que se muestra el texto correcto y literal.
- [ ] **Step 6: Commit**

```bash
git add js/visor/paneles/panel-texto.js js/visor/paneles/pantalla-reconocimiento.js js/visor/paneles/pantalla-bienvenida.js js/visor/navegacion-dev.js js/visor/main.js
git commit -m "feat: pantallas de reconocimiento y bienvenida con navegacion de desarrollo"
```

### Task 7: Pantalla de menú con tres opciones

**Files:**
- Create: `js/visor/paneles/pantalla-menu.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Consumes: `habilitarArrastre`/mecanismo de selección de `js/visor/interaccion.js` (reutilizar solo la detección de "selección", no el arrastre) para detectar el click/pellizco/gatillo sobre cada opción.
- Produces: `function crearPantallaMenu(onSeleccionar: (opcion: 'subtitulos'|'imagenes'|'mapa') => void): THREE.Object3D` — tres botones (subtítulos, imágenes, mapa conceptual); al seleccionar uno, llama a `onSeleccionar`.

- [ ] **Step 1: Implementar `crearPantallaMenu`** con tres paneles de texto clickeables ("Subtítulos", "Imágenes", "Mapa conceptual"), usando raycasting desde el puntero de selección (mano/control/mouse) para detectar cuál fue tocado.
- [ ] **Step 2: Conectar en `js/visor/main.js`**: al seleccionar una opción del menú, `estadoActual = aplicarComando(estadoActual, { pantalla: opcion })`.
- [ ] **Step 3: Verificar manualmente en la vista previa**: navegar a "menu" con la tecla de dev, hacer click en cada opción, confirmar que cambia a la pantalla correspondiente.
- [ ] **Step 4: Commit**

```bash
git add js/visor/paneles/pantalla-menu.js js/visor/main.js
git commit -m "feat: pantalla de menu con tres opciones de ayuda"
```

### Task 8: Subtítulos reales con tamaño ajustable y persistente

**Files:**
- Create: `js/common/subtitulos-guion.js`
- Create: `js/common/persistencia.js`
- Create: `js/visor/paneles/pantalla-subtitulos.js`
- Test: `test/persistencia.test.mjs`
- Test: `test/subtitulos-guion.test.mjs`
- Modify: `js/visor/main.js`

**Interfaces:**
- Produces (`js/common/subtitulos-guion.js`): array `GUION_SUBTITULOS: {desdeSegundos: number, texto: string}[]` redactado con información histórica general sobre la caída del Imperio romano, y `function lineaActual(segundosTranscurridos: number): string` — devuelve el texto vigente a ese tiempo.
- Produces (`js/common/persistencia.js`): `const TAMANO_MIN = 1`, `const TAMANO_MAX = 3` (factores de escala); `function estadoPersistenciaInicial(): {tamanoSubtitulo: number, imagenes: Record<string,{x,y,z,escala}>}`; `function ajustarTamanoSubtitulo(estado, delta): nuevoEstado` (clampado entre `TAMANO_MIN` y `TAMANO_MAX`, arranca intencionalmente chico); `function reiniciarPersistencia(): estadoPersistenciaInicial()`.
- Produces (`js/visor/paneles/pantalla-subtitulos.js`): `function crearPantallaSubtitulos(persistencia, onCambiarTamano: (delta:number)=>void): THREE.Object3D` — muestra `lineaActual(...)` con el tamaño de `persistencia.tamanoSubtitulo`, más botones "+"/"-".

- [ ] **Step 1: Escribir los tests que fallan para `persistencia.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoPersistenciaInicial, ajustarTamanoSubtitulo, TAMANO_MIN, TAMANO_MAX } from '../js/common/persistencia.js';

test('el tamaño inicial de subtitulos es el minimo (arranca chico a proposito)', () => {
  assert.equal(estadoPersistenciaInicial().tamanoSubtitulo, TAMANO_MIN);
});

test('ajustarTamanoSubtitulo no baja del minimo', () => {
  const estado = ajustarTamanoSubtitulo(estadoPersistenciaInicial(), -5);
  assert.equal(estado.tamanoSubtitulo, TAMANO_MIN);
});

test('ajustarTamanoSubtitulo no sube del maximo', () => {
  const estado = ajustarTamanoSubtitulo(estadoPersistenciaInicial(), 50);
  assert.equal(estado.tamanoSubtitulo, TAMANO_MAX);
});
```

- [ ] **Step 2: Escribir el test que falla para `subtitulos-guion.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineaActual, GUION_SUBTITULOS } from '../js/common/subtitulos-guion.js';

test('lineaActual devuelve la primera linea en el segundo 0', () => {
  assert.equal(lineaActual(0), GUION_SUBTITULOS[0].texto);
});

test('lineaActual devuelve la ultima linea cuando el tiempo supera el guion', () => {
  const ultima = GUION_SUBTITULOS[GUION_SUBTITULOS.length - 1];
  assert.equal(lineaActual(999999), ultima.texto);
});
```

- [ ] **Step 3: Correr ambos archivos de test con `node --test test/` y confirmar que fallan.**
- [ ] **Step 4: Redactar `GUION_SUBTITULOS`** (al menos 8-10 líneas con tiempos crecientes, información histórica general y creíble sobre la caída del Imperio romano) e implementar `lineaActual`.
- [ ] **Step 5: Implementar `persistencia.js`** con las funciones de arriba.
- [ ] **Step 6: Implementar `crearPantallaSubtitulos`**, conectando los botones "+"/"-" a `onCambiarTamano`.
- [ ] **Step 7: Conectar en `js/visor/main.js`**: mantener `persistenciaActual = estadoPersistenciaInicial()`; al ajustar tamaño, `persistenciaActual = ajustarTamanoSubtitulo(persistenciaActual, delta)`.
- [ ] **Step 8: Correr `node --test test/` y confirmar que todo pasa.**
- [ ] **Step 9: Verificar manualmente en la vista previa**: ir a subtítulos, confirmar que arrancan chicos y que el botón "+" los agranda.
- [ ] **Step 10: Commit**

```bash
git add js/common/subtitulos-guion.js js/common/persistencia.js js/visor/paneles/pantalla-subtitulos.js test/persistencia.test.mjs test/subtitulos-guion.test.mjs js/visor/main.js
git commit -m "feat: pantalla de subtitulos con contenido real y tamano persistente"
```

### Task 9: Imágenes reales, movibles y persistentes

**Files:**
- Create: `js/visor/paneles/pantalla-imagenes.js`
- Create: `assets/imagenes/` (archivos descargados)
- Create: `CREDITS.md`
- Test: `test/persistencia.imagenes.test.mjs`
- Modify: `js/common/persistencia.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Consumes: `limitarPosicion` (Task 3), mecanismo de selección/arrastre (Task 4).
- Modifies: agrega a `js/common/persistencia.js` las funciones `function guardarPosicionImagen(estado, idImagen, posicion): nuevoEstado` y `function guardarEscalaImagen(estado, idImagen, escala): nuevoEstado` (escala clampada entre `TAMANO_MIN` y `TAMANO_MAX`).
- Produces (`js/visor/paneles/pantalla-imagenes.js`): `function crearPantallaImagenes(rutasImagenes: string[], persistencia, onMoverImagen, onEscalarImagen, onVerMas): THREE.Object3D` — crea un plano con textura por cada imagen visible, restaura su posición/escala desde `persistencia.imagenes`, y expone un botón "Ver más imágenes".

- [ ] **Step 1: Buscar y descargar a `assets/imagenes/` entre 6 y 10 imágenes de dominio público o Creative Commons de Wikimedia Commons sobre la caída del Imperio romano** (mapas, pinturas, ilustraciones históricas).
- [ ] **Step 2: Escribir `CREDITS.md`** con autor, fuente (URL de Wikimedia Commons) y licencia exacta de cada imagen descargada.
- [ ] **Step 3: Escribir el test que falla**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoPersistenciaInicial, guardarPosicionImagen, guardarEscalaImagen, TAMANO_MAX } from '../js/common/persistencia.js';

test('guardarPosicionImagen recuerda la posicion por id', () => {
  const estado = guardarPosicionImagen(estadoPersistenciaInicial(), 'img-1', { x: 1, y: 2, z: -1 });
  assert.deepEqual(estado.imagenes['img-1'].x, 1);
});

test('guardarEscalaImagen no supera el maximo', () => {
  const estado = guardarEscalaImagen(estadoPersistenciaInicial(), 'img-1', 999);
  assert.equal(estado.imagenes['img-1'].escala, TAMANO_MAX);
});
```

- [ ] **Step 4: Correr `node --test test/persistencia.imagenes.test.mjs` y confirmar que falla.**
- [ ] **Step 5: Implementar `guardarPosicionImagen` y `guardarEscalaImagen` en `persistencia.js`.**
- [ ] **Step 6: Correr el test y confirmar que pasa.**
- [ ] **Step 7: Implementar `crearPantallaImagenes`**, reutilizando el mecanismo de arrastre de `interaccion.js` para mover/escalar cada imagen, llamando a `onMoverImagen`/`onEscalarImagen` en cada cambio; mostrar inicialmente 3-4 imágenes y el resto al tocar "Ver más imágenes".
- [ ] **Step 8: Conectar en `js/visor/main.js`.**
- [ ] **Step 9: Verificar manualmente en la vista previa**: mover y agrandar una imagen, cambiar a otra pantalla y volver a imágenes, confirmar que la posición/tamaño se mantuvo.
- [ ] **Step 10: Commit**

```bash
git add js/visor/paneles/pantalla-imagenes.js assets/imagenes CREDITS.md js/common/persistencia.js test/persistencia.imagenes.test.mjs js/visor/main.js
git commit -m "feat: pantalla de imagenes con contenido real, movible y persistente"
```

### Task 10: Mapa conceptual + prueba de persistencia entre cambios de pantalla

**Files:**
- Create: `js/visor/paneles/pantalla-mapa.js`
- Create: `assets/mapa-conceptual/` (imagen o datos del mapa)
- Test: `test/persistencia.cambio-pantalla.test.mjs`

**Interfaces:**
- Produces: `function crearPantallaMapa(): THREE.Object3D` — panel con el mapa conceptual simple de causas/hitos/consecuencias de la caída del Imperio romano.

- [ ] **Step 1: Armar el contenido del mapa conceptual** (texto corto o imagen generada) y guardarlo en `assets/mapa-conceptual/`.
- [ ] **Step 2: Implementar `crearPantallaMapa`** mostrando ese contenido.
- [ ] **Step 3: Escribir y correr el test de Review Focus: cambiar de pantalla no borra una posición ya guardada**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarPosicionImagen, estadoPersistenciaInicial } from '../js/common/persistencia.js';
import { estadoPorDefecto, aplicarComando } from '../js/common/estado.js';

test('cambiar de pantalla con aplicarComando no toca la persistencia de imagenes', () => {
  const persistencia = guardarPosicionImagen(estadoPersistenciaInicial(), 'img-1', { x: 1, y: 1, z: -1 });
  aplicarComando(estadoPorDefecto(), { pantalla: 'menu' }); // simula el cambio de pantalla
  assert.deepEqual(persistencia.imagenes['img-1'], { x: 1, y: 1, z: -1 });
});
```

- [ ] **Step 4: Conectar `crearPantallaMapa` en `js/visor/main.js`.**
- [ ] **Step 5: Verificar manualmente en la vista previa**: ir al mapa conceptual desde el menú, confirmar que se lee bien.
- [ ] **Step 6: Commit**

```bash
git add js/visor/paneles/pantalla-mapa.js assets/mapa-conceptual test/persistencia.cambio-pantalla.test.mjs js/visor/main.js
git commit -m "feat: pantalla de mapa conceptual y test de persistencia entre pantallas"
```

---

## Etapa 3 — Aviso de atención, pausa activa y vuelta

### Task 11: Temporizador de pausa (pure, testeado) y pantalla de aviso de atención

**Files:**
- Create: `js/common/temporizador-pausa.js`
- Create: `js/visor/paneles/pantalla-aviso.js`
- Test: `test/temporizador-pausa.test.mjs`
- Modify: `js/visor/main.js`, `js/visor/navegacion-dev.js`

**Interfaces:**
- Produces (`js/common/temporizador-pausa.js`): `function minutosTranscurridos(inicioMs: number, ahoraMs: number): number` (nunca negativo, redondeado); `function formatearTextoVuelta(minutos: number, temas: number): string` — sanea `minutos`/`temas` no numéricos o negativos a `0` antes de interpolar, devuelve el texto literal `"Bienvenida de vuelta · Estuviste {min} min en pausa · Se guardaron {temas} temas"`.
- Produces (`js/visor/paneles/pantalla-aviso.js`): `function crearPantallaAviso(onAceptar: () => void): THREE.Object3D` con el texto literal `"Notamos que tus niveles de atención disminuyeron. ¿Querés ayuda?"`; `onAceptar` se dispara con el mismo mecanismo de selección (botón del lente = gatillo o pellizco).

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutosTranscurridos, formatearTextoVuelta } from '../js/common/temporizador-pausa.js';

test('minutosTranscurridos redondea y nunca es negativo', () => {
  assert.equal(minutosTranscurridos(0, 90000), 2); // 1.5 min -> redondeado a 2
  assert.equal(minutosTranscurridos(1000, 0), 0); // tiempo invertido no da negativo
});

test('formatearTextoVuelta arma el texto literal', () => {
  assert.equal(
    formatearTextoVuelta(6, 2),
    'Bienvenida de vuelta · Estuviste 6 min en pausa · Se guardaron 2 temas'
  );
});

test('formatearTextoVuelta sanea valores invalidos a 0 (Review Focus)', () => {
  assert.equal(
    formatearTextoVuelta(-5, NaN),
    'Bienvenida de vuelta · Estuviste 0 min en pausa · Se guardaron 0 temas'
  );
  assert.equal(
    formatearTextoVuelta('texto', undefined),
    'Bienvenida de vuelta · Estuviste 0 min en pausa · Se guardaron 0 temas'
  );
});
```

- [ ] **Step 2: Correr `node --test test/temporizador-pausa.test.mjs` y confirmar que falla.**
- [ ] **Step 3: Implementar `temporizador-pausa.js`.**
- [ ] **Step 4: Correr el test y confirmar que pasa.**
- [ ] **Step 5: Implementar `crearPantallaAviso`.**
- [ ] **Step 6: Conectar en `js/visor/main.js`** con una tecla de dev temporal en `navegacion-dev.js` (`'a'` dispara el aviso) hasta que exista el panel real en la Etapa 4; al aceptar, `estadoActual = aplicarComando(estadoActual, { pantalla: 'pausa' })`.
- [ ] **Step 7: Verificar manualmente en la vista previa**: disparar el aviso con la tecla de dev, aceptar con un click, confirmar que pasa a la pantalla de pausa.
- [ ] **Step 8: Commit**

```bash
git add js/common/temporizador-pausa.js js/visor/paneles/pantalla-aviso.js test/temporizador-pausa.test.mjs js/visor/main.js js/visor/navegacion-dev.js
git commit -m "feat: temporizador de pausa y pantalla de aviso de atencion"
```

### Task 12: Pausa activa con contador en vivo

**Files:**
- Create: `js/visor/paneles/pantalla-pausa.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Consumes: `minutosTranscurridos` (Task 11).
- Produces: `function crearPantallaPausa(inicioMs: number): {objeto: THREE.Object3D, actualizar: (ahoraMs:number) => void}` — muestra el texto literal `"Pausa iniciada. Podés sacarte los lentes. Lo que explique la profesora se guarda en 'Temas pendientes'"` más un contador que `actualizar` refresca con `minutosTranscurridos(inicioMs, ahoraMs)`.

- [ ] **Step 1: Implementar `crearPantallaPausa`.**
- [ ] **Step 2: Conectar en `js/visor/main.js`**: al entrar a la pantalla `pausa`, guardar `inicioMs = Date.now()`; en el loop de render, si la pantalla activa es `pausa`, llamar a `actualizar(Date.now())`.
- [ ] **Step 3: Verificar manualmente en la vista previa**: entrar a pausa, confirmar que el contador sube solo con el paso del tiempo real.
- [ ] **Step 4: Verificar manualmente (integración) que la persistencia de subtítulos/imágenes de la Etapa 2 no cambia mientras se está en pausa** (anotar en la consola del navegador el valor de `persistenciaActual` antes y después de pausar).
- [ ] **Step 5: Commit**

```bash
git add js/visor/paneles/pantalla-pausa.js js/visor/main.js
git commit -m "feat: pantalla de pausa activa con contador en vivo"
```

### Task 13: Vuelta de la pausa

**Files:**
- Create: `js/visor/paneles/pantalla-vuelta.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Consumes: `formatearTextoVuelta` (Task 11).
- Produces: `function crearPantallaVuelta(minutos: number, temas: number, onSeguirClase: ()=>void, onVerResumen: ()=>void): THREE.Object3D` — muestra `formatearTextoVuelta(minutos, temas)` y los dos botones literales `"Seguir con la clase"` / `"Ver un resumen rápido"`.

- [ ] **Step 1: Implementar `crearPantallaVuelta`.**
- [ ] **Step 2: Conectar en `js/visor/main.js`**: al salir de `pausa` (por ahora con una tecla de dev que simula "terminar pausa"), calcular minutos con `minutosTranscurridos(inicioMs, Date.now())`, usar `temasGuardados` del `estadoActual` (por ahora un valor fijo de ejemplo, p. ej. 2, hasta que el panel real lo controle en la Etapa 4), y mostrar la pantalla `vuelta`.
- [ ] **Step 3: Conectar los botones**: `onSeguirClase` vuelve a la pantalla donde estaba antes de pausar; `onVerResumen` va a `resumen`.
- [ ] **Step 4: Verificar manualmente en la vista previa**: terminar una pausa de unos segundos, confirmar que el texto de minutos/temas es correcto y que ambos botones navegan bien.
- [ ] **Step 5: Commit**

```bash
git add js/visor/paneles/pantalla-vuelta.js js/visor/main.js
git commit -m "feat: pantalla de vuelta de la pausa"
```

### Task 14: Resumen rápido y verificación end-to-end de persistencia

**Files:**
- Create: `js/visor/paneles/pantalla-resumen.js`
- Create: `js/common/resumen-clase.js`
- Modify: `js/visor/main.js`

**Interfaces:**
- Produces (`js/common/resumen-clase.js`): `const RESUMEN_CLASE: string` — resumen corto redactado de la clase (caída del Imperio romano), coherente con `GUION_SUBTITULOS` (Task 8).
- Produces (`js/visor/paneles/pantalla-resumen.js`): `function crearPantallaResumen(onVolverClase: ()=>void): THREE.Object3D` — muestra `RESUMEN_CLASE` y un botón para volver a la clase.

- [ ] **Step 1: Redactar `RESUMEN_CLASE`** (3-5 oraciones, coherente con el contenido de `subtitulos-guion.js`).
- [ ] **Step 2: Implementar `crearPantallaResumen`.**
- [ ] **Step 3: Conectar en `js/visor/main.js`**: `onVolverClase` vuelve a la pantalla donde estaba el usuario antes de la pausa.
- [ ] **Step 4: Verificación manual end-to-end (recorrido completo de la Etapa 1-3)**: en la vista previa, agrandar subtítulos y mover una imagen, disparar el aviso, aceptar, esperar en pausa, terminar la pausa, ver el resumen, volver a la clase — confirmar que el tamaño de subtítulo y la posición de la imagen son exactamente los mismos que antes de pausar.
- [ ] **Step 5: Avisar al dueño del proyecto para probar el recorrido completo en el Quest** (Etapas 1 a 3 juntas).
- [ ] **Step 6: Commit**

```bash
git add js/visor/paneles/pantalla-resumen.js js/common/resumen-clase.js js/visor/main.js
git commit -m "feat: pantalla de resumen rapido y verificacion de persistencia end-to-end"
```

---

## Etapa 4 — Panel del observador (Firebase)

### Task 15: Módulo de mensajes de Firebase (pure, testeado)

**Files:**
- Create: `js/common/firebase-mensajes.js`
- Test: `test/firebase-mensajes.test.mjs`

**Interfaces:**
- Produces: `function construirComandoPantalla(pantalla: string): object`, `function construirComandoAviso(activo: boolean): object`, `function construirComandoPausa(activa: boolean): object`, `function construirComandoTiempoVuelta(minutos: number): object` (sanea valores no numéricos/negativos a `0` antes de construir el comando), `function construirComandoReset(): object` (incluye un `resetId` incremental), `function nodoRaizFirebase(): string` (devuelve `'estado'`, el único nodo usado).

- [ ] **Step 1: Escribir los tests que fallan**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirComandoPantalla, construirComandoTiempoVuelta, construirComandoReset } from '../js/common/firebase-mensajes.js';

test('construirComandoPantalla arma el campo pantalla', () => {
  assert.deepEqual(construirComandoPantalla('menu'), { pantalla: 'menu' });
});

test('construirComandoTiempoVuelta sanea valores invalidos (Review Focus)', () => {
  assert.deepEqual(construirComandoTiempoVuelta(-3), { tiempoVueltaMin: 0 });
  assert.deepEqual(construirComandoTiempoVuelta(NaN), { tiempoVueltaMin: 0 });
  assert.deepEqual(construirComandoTiempoVuelta(6), { tiempoVueltaMin: 6 });
});

test('construirComandoReset incluye un resetId numerico', () => {
  const comando = construirComandoReset();
  assert.equal(typeof comando.resetId, 'number');
});
```

- [ ] **Step 2: Correr `node --test test/firebase-mensajes.test.mjs` y confirmar que falla.**
- [ ] **Step 3: Implementar `firebase-mensajes.js`.**
- [ ] **Step 4: Correr el test y confirmar que pasa.**
- [ ] **Step 5: Commit**

```bash
git add js/common/firebase-mensajes.js test/firebase-mensajes.test.mjs
git commit -m "feat: modulo de mensajes de firebase con saneamiento defensivo"
```

### Task 16: Integración de Firebase en el visor

**Files:**
- Create: `js/visor/firebase-cliente.js`
- Create: `js/config/firebase-config.ejemplo.js` (plantilla sin credenciales reales)
- Modify: `js/visor/main.js` (reemplaza `navegacion-dev.js` como fuente de comandos)
- Modify: `.gitignore` (ignorar `js/config/firebase-config.js`, el archivo real con credenciales)

**Interfaces:**
- Consumes: `aplicarComando` (Task 5), `firebaseConfig` desde `js/config/firebase-config.js` (no versionado).
- Produces: `function escucharEstadoFirebase(onNuevoComando: (comando: object) => void): void` — importa el SDK modular de Firebase desde el CDN, conecta a Realtime Database, y llama a `onNuevoComando` con el valor crudo del nodo `'estado'` en cada cambio (la validación/aplicación segura queda en `aplicarComando`, Task 5 — así se reutiliza la defensa contra comandos corruptos).

- [ ] **Step 1: Crear `js/config/firebase-config.ejemplo.js`** con la forma esperada de `firebaseConfig` (valores de ejemplo, comentario explicando que hay que copiarlo a `firebase-config.js` con los valores reales).
- [ ] **Step 2: Agregar `js/config/firebase-config.js` a `.gitignore`.**
- [ ] **Step 3: Implementar `escucharEstadoFirebase`** importando `firebase-app.js` y `firebase-database.js` desde `https://www.gstatic.com/firebasejs/` (SDK modular v10), usando `onValue` sobre la referencia del nodo `'estado'`.
- [ ] **Step 4: Reemplazar en `js/visor/main.js`** el uso de `navegacion-dev.js` por `escucharEstadoFirebase`: cada comando recibido pasa por `aplicarComando(estadoActual, comando)` antes de actualizar la UI (esto es lo que protege contra comandos corruptos o con campos inesperados — Review Focus).
- [ ] **Step 5: Verificar manualmente**: pegar el `firebaseConfig` real del dueño del proyecto en `js/config/firebase-config.js`, escribir manualmente un valor de prueba en la consola de Firebase, confirmar en la vista previa que el visor reacciona.
- [ ] **Step 6: Commit**

```bash
git add js/visor/firebase-cliente.js js/config/firebase-config.ejemplo.js .gitignore js/visor/main.js
git commit -m "feat: integracion de firebase realtime database en el visor"
```

### Task 17: Panel del observador (`panel.html`)

**Files:**
- Create: `panel.html`
- Create: `js/panel/main.js`
- Create: `css/panel.css`

**Interfaces:**
- Consumes: `construirComandoPantalla`, `construirComandoAviso`, `construirComandoPausa`, `construirComandoTiempoVuelta`, `construirComandoReset`, `nodoRaizFirebase` (Task 15); mismo `firebaseConfig` que el visor (Task 16).
- Produces: interfaz web con un botón por cada valor de `PANTALLAS` (Task 5), un botón "Disparar aviso", botones "Iniciar pausa"/"Terminar pausa", un input numérico para "tiempo mostrado en la vuelta" con botón "Aplicar", y un botón "Reiniciar todo".

- [ ] **Step 1: Crear `panel.html`** con los controles de arriba, enlazando `js/panel/main.js` como módulo.
- [ ] **Step 2: Implementar `js/panel/main.js`**: conecta a Firebase con el mismo `firebaseConfig`; cada botón arma su comando con la función correspondiente de `firebase-mensajes.js` y lo escribe (`set`) en el nodo `'estado'`, combinando con el valor previo (no pisar campos que no cambiaron).
- [ ] **Step 3: Aplicar el estilo cálido/ámbar básico de `css/panel.css`** (puede ser simple en esta etapa; el pulido fino es la Etapa 5).
- [ ] **Step 4: Verificar manualmente**: abrir `panel.html` en el celular y `index.html` en la vista previa de la compu (o en el Quest) al mismo tiempo, confirmar que cada botón del panel mueve al visor a la pantalla/estado correcto.
- [ ] **Step 5: Commit**

```bash
git add panel.html js/panel/main.js css/panel.css
git commit -m "feat: panel del observador conectado por firebase"
```

### Task 18: Reiniciar todo (sanea persistencia local incluso a mitad de clase)

**Files:**
- Modify: `js/common/persistencia.js` (ya tiene `reiniciarPersistencia`, Task 8)
- Modify: `js/visor/main.js`
- Test: `test/persistencia.reinicio.test.mjs`

**Interfaces:**
- Consumes: `construirComandoReset` (Task 15), `reiniciarPersistencia` (Task 8).

- [ ] **Step 1: Escribir el test que falla (Review Focus: reinicio a mitad de clase)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarPosicionImagen, ajustarTamanoSubtitulo, reiniciarPersistencia, estadoPersistenciaInicial } from '../js/common/persistencia.js';

test('reiniciarPersistencia limpia tamaños y posiciones sin importar el estado previo', () => {
  let estado = ajustarTamanoSubtitulo(estadoPersistenciaInicial(), 10);
  estado = guardarPosicionImagen(estado, 'img-1', { x: 5, y: 5, z: -1 });
  assert.deepEqual(reiniciarPersistencia(), estadoPersistenciaInicial());
});
```

- [ ] **Step 2: Correr el test** (puede ya pasar si `reiniciarPersistencia` de la Task 8 es correcta; si falla, ajustarla).
- [ ] **Step 3: Conectar en `js/visor/main.js`**: al recibir un comando cuyo `resetId` sea mayor al último `resetId` conocido (viene de `aplicarComando`/Task 5, que ya debe soportar ese campo), hacer `persistenciaActual = reiniciarPersistencia()` y `estadoActual = estadoPorDefecto()`, sin importar en qué pantalla esté el usuario.
- [ ] **Step 4: Verificar manualmente**: estando a mitad del recorrido (p. ej. en "imágenes" con una imagen movida), apretar "Reiniciar todo" en el panel, confirmar que el visor vuelve a "reconocimiento" con subtítulos chicos e imágenes en su posición original.
- [ ] **Step 5: Commit**

```bash
git add js/common/persistencia.js js/visor/main.js test/persistencia.reinicio.test.mjs
git commit -m "fix: reiniciar todo limpia la persistencia incluso a mitad de clase"
```

---

## Etapa 5 — Pulido visual

### Task 19: Paleta cálida, tipografía y brillos según el moodboard

**Files:**
- Create: `css/estilos-comunes.js` o `js/visor/tema-visual.js` (constantes de color/tipografía compartidas)
- Modify: todos los `js/visor/paneles/*.js`
- Modify: `css/panel.css`

**Interfaces:**
- Produces: `js/visor/tema-visual.js` con constantes como `COLOR_AMBAR`, `COLOR_FONDO_PANEL` (oscuro semitransparente), `FUENTE_PRINCIPAL`, reutilizadas por todos los paneles y por `panel.html`.

- [ ] **Step 1: Definir la paleta y tipografía en `tema-visual.js`** (tonos ámbar/naranja sobre fondos oscuros semitransparentes, según las palabras clave cálido/atento/expuesto del moodboard).
- [ ] **Step 2: Aplicar `tema-visual.js` a cada panel** (`panel-texto.js`, `pantalla-menu.js`, `pantalla-subtitulos.js`, `pantalla-imagenes.js`, `pantalla-mapa.js`, `pantalla-aviso.js`, `pantalla-pausa.js`, `pantalla-vuelta.js`, `pantalla-resumen.js`): fondo oscuro semitransparente, texto ámbar/blanco cálido, brillo suave (ej. `EdgesGeometry` con glow, o un `sprite` de resplandor detrás del panel).
- [ ] **Step 3: Aplicar el mismo lenguaje visual a `panel.css`** (consistencia entre lo que ve el observador y lo que ve el usuario).
- [ ] **Step 4: Verificar manualmente en la vista previa y en el Quest**: confirmar que ningún panel tapa el centro del campo visual y que el texto se lee bien tanto en un ambiente claro como oscuro.
- [ ] **Step 5: Commit**

```bash
git add js/visor/tema-visual.js js/visor/paneles/ css/panel.css
git commit -m "feat: aplicar paleta y tipografia del moodboard a todas las pantallas"
```

### Task 20: Limpieza final y README de uso para el día de la prueba

**Files:**
- Modify: `README.md`

**Interfaces:** (ninguna nueva; tarea de cierre)

- [ ] **Step 1: Repasar visualmente cada pantalla** (reconocimiento, bienvenida, menú, subtítulos, imágenes, mapa, aviso, pausa, vuelta, resumen) en el Quest, anotando y corrigiendo cualquier texto que no coincida con el guion literal.
- [ ] **Step 2: Escribir en `README.md` las instrucciones para el día de la prueba**: URL de GitHub Pages para el visor, URL de `panel.html`, cómo entrar a la sesión de RA en el Quest, y el orden sugerido de botones del panel para seguir el guion de la Task PDF.
- [ ] **Step 3: Correr toda la suite de tests una última vez**: `node --test test/`, confirmar que todo pasa.
- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: instrucciones finales de uso para la prueba de usabilidad"
```
