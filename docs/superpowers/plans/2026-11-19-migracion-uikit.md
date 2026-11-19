# Visor nuevo con @pmndrs/uikit, en carpeta aparte — Plan de implementación

> **Para quien ejecute esto:** usar la skill `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea.
> Los pasos usan checkboxes (`- [ ]`) para trackear progreso.

**Decisión clave (última del dueño del proyecto, reemplaza cualquier versión
anterior de este plan):** esto NO es una migración in-place. Se construye un
visor nuevo, en una carpeta nueva, con un HTML de entrada nuevo — **cero edits a
ningún archivo existente**. Lo viejo (`index.html`, `js/visor/`) queda intacto y
siguiendo funcionando para la prueba de usabilidad real mientras se construye
esto en paralelo.

**Objetivo:** un segundo visor (`visor-uikit.html` + `js/visor-uikit/`) que
renderiza los paneles con componentes reales de `@pmndrs/uikit` (layout flexbox
vía Yoga, texto MSDF nítido) en vez de Canvas2D a mano — reusando TODO lo que no
es específico del renderizado de paneles (estado, persistencia, Firebase, sesión
XR, vista previa de escritorio) vía import directo a los archivos de siempre, sin
copiarlos.

**Arquitectura:**
- Carpeta nueva `js/visor-uikit/` (hermana de `js/visor/`), con su propio
  `main.js` + `paneles/*.js` + `ui-kit/*.js` (paleta/factories de uikit).
- HTML nuevo `visor-uikit.html` en la raíz (hermano de `index.html`), con su
  propio `<script type="importmap">` (apunta `"three"` al mismo
  `vendor/three/three.module.js` de siempre, y `@pmndrs/uikit`/
  `@pmndrs/pointer-events` a esm.sh).
- `panel.html` (el panel del observador) **no cambia** — ya es agnóstico a qué
  visor lo lee, porque sólo escribe comandos a Firebase. Las dos versiones del
  visor (`index.html` viejo, `visor-uikit.html` nuevo) pueden abrirse en dos
  pestañas a la vez, controladas por el MISMO panel, para comparar en vivo.
- Reusa SIN copiar (import relativo desde `js/visor-uikit/` hacia atrás, `../`):
  `js/common/*` (estado, persistencia, guion de subtítulos, mensajes de
  Firebase, resumen), `js/config/firebase-config.js`, `js/visor/firebase-cliente.js`,
  `js/visor/xr-sesion.js`, `js/visor/interaccion.js` (confirmado hoy: ninguno de
  estos 6 archivos sabe nada de CÓMO se dibuja un panel — sólo de estado, datos,
  Firebase, la sesión XR y el raycasting de origen/dirección de un gesto), y
  `js/vista-previa/*` (controles de órbita + entorno de referencia).
- Reconstruye desde cero (archivos nuevos, no copias editadas): la capa de
  dibujo de paneles (`tema-visual.js`→`tema-uikit.js`, `panel-texto.js`→
  `panel-uikit.js`, cada `pantalla-*.js`, `boton-menu-flotante.js`) y el
  `main.js` orquestador (va a ser muy parecido al viejo, pero importando las
  pantallas nuevas).
- `iconos.js` (9 íconos dibujados a mano, sin assets externos) se reusa TAL
  CUAL, sin copiar ni modificar — sólo se envuelve en un adaptador nuevo que lo
  convierte en textura para un componente `Image` de uikit.

**Tech Stack:** `@pmndrs/uikit@1.0.78` (vanilla, sin React), `@pmndrs/pointer-events`
(puente de raycasting/XR-rays a eventos de puntero), Three.js r187 (ya
vendorizado, satisface el peer-dep `>=0.162` de uikit), import map nativo del
navegador.

**Spec:** este documento es la spec — no hay un spec previo separado.

## Hallazgos técnicos (verificados con curl real contra los registries/CDN, no supuestos)

- `@pmndrs/uikit@1.0.78` es `"type": "module"`, **no depende de React** (esa es
  `@react-three/uikit`, un paquete aparte).
- Peer-dep: `"three": ">=0.162"`. Nuestro vendorizado es `REVISION = '187'`
  (`vendor/three/three.core.js:6`) → compatible.
- `https://esm.sh/@pmndrs/uikit@1.0.78?external=three` sirve un módulo ESM real
  (200, `content-type: application/javascript`) que resuelve sus 5 dependencias
  (`@pmndrs/uikit-pub-sub`, `@preact/signals-core`, `yoga-layout`, `zod`,
  `@pmndrs/msdfonts`) solo, como sub-imports del mismo dominio — no hace falta
  bundler ni import map para las dependencias transitivas, sólo para `"three"`
  (si no, esm.sh traería SU PROPIA copia en vez de la vendorizada).
- El WASM de Yoga se sirve en base64 adentro de un módulo JS normal — nada que
  configurar en `python3 -m http.server`.
- `@pmndrs/msdfonts` trae fuentes MSDF empaquetadas (Inter, Lato, Montserrat,
  etc.) — uikit necesita una para texto nítido. Candidata: `Inter` (licencia
  OFL, look limpio tipo HUD). Esto SÍ reintroduce una carga de fuente asíncrona
  real antes del primer frame, algo que el proyecto viejo evitó a propósito —
  pero ahora la maneja la librería, no nosotros a mano.
- `@pmndrs/pointer-events` (v6.6.32, cero dependencias) es el puente oficial de
  raycasts (mouse y rayos/manos XR) a eventos tipo DOM sobre componentes uikit.
  `interaccion.js::enEventoSeleccion(renderer, callback)` YA da origen+dirección
  de cualquier gesto de selección (mouse o XR) — es el gancho natural para
  alimentar ese puente, confirmado leyendo el archivo hoy.

## Restricciones globales

- **Cero edits a `index.html`, `panel.html`, ni a nada bajo `js/visor/`,
  `js/common/`, `js/config/`, `js/vista-previa/` o `vendor/`.** Si una tarea de
  este plan cree que necesita modificar alguno de esos archivos, es señal de que
  algo del diseño está mal — parar y replantear esa tarea, no tocarlo.
- El proyecto sigue siendo "cero build": el import map nuevo es la única pieza
  que no es un archivo `.js`/`.html` de siempre.
- Los 22 tests existentes (`node --test`) no cambian de comportamiento en ningún
  momento — prueban módulos puros que esta carpeta nueva no toca, sólo importa.
- Nunca inventar valores físicos (metros) nuevos para los paneles — se copian
  los mismos números ya calibrados en el Quest real que tiene cada
  `pantalla-*.js` de `js/visor/paneles/`, como referencia de lectura solamente.
- Verificación siempre manual en el navegador (capturas, consola, interacción
  real) — no hay arnés de regresión visual automatizado en este proyecto.

## Review Focus

- **Fidelidad visual del "vidrio ámbar neón"**: uikit no tiene equivalente
  directo a un glow/`box-shadow` difuso. Primera aproximación: borde +
  `backgroundColor` sólido, sin el glow. Si no convence, decidir con el dueño
  del proyecto antes de seguir.
- **Controles/manos reales del Quest** vía `@pmndrs/pointer-events`: sólo se
  puede probar el mouse de escritorio en este entorno. Dejar anotado como
  pendiente de prueba real en el casco, no darlo por bueno.
- **`pantalla-subtitulos.js`** (texto que se redibuja solo) y
  **`pantalla-imagenes.js`** (arrastre + escala persistente) son las más
  complejas — van al final, con el patrón ya probado en 9 pantallas más simples.
- **Rendimiento**: la escena vieja mide ~12 draw calls/564 triángulos
  (`threejs-devtools-mcp`). Volver a medir el visor nuevo al final, no asumir
  que da igual.
- **El botón de menú flotante** tiene lógica propia reciente (seguimiento "con
  lag" a la cámara) que hay que reconstruir igual en la versión nueva, no sólo
  el look.

---

## Tarea 0: Esqueleto nuevo + spike de validación

**Archivos (todos nuevos, cero edits a lo existente):**
- Crear: `visor-uikit.html` (copia de la estructura de `index.html` — mismo
  `<canvas id="escena">`, mismo CSS si aplica, apunta su `<script type="module">`
  a `js/visor-uikit/main.js` en vez de `js/visor/main.js`)
- Crear: `js/visor-uikit/main.js` (arranca igual que `js/visor/main.js`:
  escena/cámara/renderer/XR/vista previa, importando TODO eso de los módulos
  viejos sin copiarlos — ver "Arquitectura" arriba — pero todavía sin ninguna
  pantalla real, sólo un placeholder)
- Crear temporal: `js/visor-uikit/_spike.js` (se borra en la Tarea 7 si todo
  salió bien)

- [ ] **Paso 1:** crear `visor-uikit.html` + `js/visor-uikit/main.js` mínimo:
  escena, cámara, renderer, XR, vista previa (reusando `xr-sesion.js`,
  `control-mouse.js`, `entorno-preview.js` tal cual), sin ninguna pantalla
  todavía. Verificar que levanta y se ve el entorno de referencia (piso/pared/
  silueta), igual que el visor viejo.
- [ ] **Paso 2:** agregar el import map:

```html
<script type="importmap">
{
  "imports": {
    "three": "./vendor/three/three.module.js",
    "@pmndrs/uikit": "https://esm.sh/@pmndrs/uikit@1.0.78?external=three",
    "@pmndrs/pointer-events": "https://esm.sh/@pmndrs/pointer-events@6.6.32?external=three"
  }
}
</script>
```

- [ ] **Paso 3:** en `_spike.js`, crear un `Root` de uikit con un `Container`+
  `Text('hola')` en `z=-1.8`, agregarlo a la escena desde `main.js`.
- [ ] **Paso 4:** verificar en el navegador (`http://localhost:8000/visor-uikit.html`):
  texto visible, sin errores de consola, sin caída de frame rate.
- [ ] **Paso 5 (go/no-go):** si algo falla acá, parar y repensar el enfoque
  ANTES de construir nada más encima.
- [ ] **Paso 6: Commit**

```bash
git add visor-uikit.html js/visor-uikit/
git commit -m "spike: esqueleto del visor-uikit + valida carga de @pmndrs/uikit"
```

---

## Tarea 1: Capa compartida de diseño

**Archivos (todos nuevos):**
- Crear: `js/visor-uikit/ui-kit/tema-uikit.js` (reexporta los mismos valores de
  color que `js/visor/tema-visual.js`, leído como referencia, no importado —
  esta carpeta no depende de `js/visor/`)
- Crear: `js/visor-uikit/ui-kit/panel-uikit.js` (`crearPanelUikit`, reemplazo de
  `crearPanelTexto`, misma forma de opciones: `posicion`, `ancho`, `alto`,
  `tamanoFuente?`, `interactivo?`, `negrita?`, `icono?`)
- Crear: `js/visor-uikit/ui-kit/icono-uikit.js` (envuelve
  `js/visor/iconos.js::dibujarIcono` — este sí se IMPORTA del original, no se
  copia, porque es puro Canvas2D sin ninguna dependencia de renderizado 3D)

- [ ] **Paso 1:** paleta en `tema-uikit.js` con los mismos valores de
  `COLOR_FONDO_PANEL`/`COLOR_TEXTO`/`COLOR_AMBAR`/etc.
- [ ] **Paso 2:** `crearPanelUikit` sobre `Root`+`Container`+`Text`, con
  `borderRadius`/`backgroundColor` según `interactivo` (cápsula ámbar saturada
  vs. rectángulo transparente). Sin glow todavía (ver Review Focus).
- [ ] **Paso 3:** `obtenerIconoUikit(nombre)` pre-renderizando con
  `dibujarIcono` a un canvas offscreen, envuelto en una `Image` de uikit.
- [ ] **Paso 4:** verificar con 2-3 paneles de prueba, comparar a ojo contra el
  panel viejo equivalente.
- [ ] **Paso 5: Commit**

---

## Tarea 2: Pantalla piloto — `pantalla-menu.js`

**Archivos:**
- Crear: `js/visor-uikit/paneles/pantalla-menu.js` (misma firma pública que la
  vieja: `crearPantallaMenu(renderer, onSeleccionar)`)

- [ ] **Paso 1:** reescribir usando `crearPanelUikit`, mismos valores físicos
  (`ancho=0.5`, `alto=0.35`, `tamanoFuente=76`, posiciones) que
  `js/visor/paneles/pantalla-menu.js` (leer ese archivo como referencia).
- [ ] **Paso 2:** cablear el click con `@pmndrs/pointer-events`, alimentado por
  `enEventoSeleccion` de `js/visor/interaccion.js` (importado, no copiado) —
  investigar en esta tarea la forma correcta de conectar ambos.
- [ ] **Paso 3:** agregar esta pantalla a `js/visor-uikit/main.js`, verificar en
  el navegador real (vía `panel.html`, que ya funciona para cualquiera de los
  dos visores) que los 3 botones navegan bien.
- [ ] **Paso 4:** `node --test` (deben seguir en 22/22, esta carpeta no los toca).
- [ ] **Paso 5: Commit**

---

## Tarea 3: Resto de pantallas estáticas/simples (mismo patrón)

Un commit por pantalla, mismo patrón que la Tarea 2, leyendo siempre el archivo
viejo correspondiente como referencia de valores (nunca inventar números
nuevos):

| Pantalla nueva | Referencia (vieja, sólo lectura) | Qué tiene de distinto |
|---|---|---|
| `pantalla-reconocimiento.js` | `js/visor/paneles/pantalla-reconocimiento.js` | Sin botones. |
| `pantalla-finalizada.js` | ídem | Sin botones. |
| `pantalla-mapa.js` | ídem | 3 columnas multilínea, título en negrita. |
| `pantalla-aviso.js` | ídem | Mensaje + 2 botones con `userData.accion`. |
| `pantalla-vuelta.js` | ídem | 3 tamaños de fuente por bloque + 2 botones. |
| `pantalla-resumen.js` | ídem | Párrafo largo — probar wrap automático de uikit. |
| `pantalla-bienvenida.js` | ídem | 3 bloques de texto, sin botones. |
| `pantalla-pausa.js` | ídem | Contador que se actualiza cada segundo. |

---

## Tarea 4: `boton-menu-flotante.js`

- [ ] Reconstruir en `js/visor-uikit/paneles/boton-menu-flotante.js`: mismo
  `negrita: true` en el botón principal, mismo `MARGEN_GRUPO`, y la misma
  lógica de `actualizarSeguimiento` (lerp/slerp exponencial hacia la cámara) —
  confirmar que un objeto de uikit admite `.position.lerp()`/`.quaternion.slerp()`
  igual que un `THREE.Group`.
- [ ] Verificar orbitando la vista previa que el lag se siente igual.
- [ ] `node --test` + commit.

---

## Tarea 5: Pantallas con estado dinámico

- [ ] `pantalla-subtitulos.js`: texto que cambia solo + botones "+"/"-" +
  arrastre (`habilitarArrastre` de `interaccion.js`, importado).
- [ ] `pantalla-imagenes.js`: la más grande — las imágenes de contenido NO son
  parte de esta migración (siguen siendo `THREE.Mesh` comunes), sólo los
  paneles/botones alrededor.

---

## Tarea 6 (opcional, decisión aparte, NO para ahora): cutover

Sólo si en algún momento futuro deciden quedarse exclusivamente con la versión
nueva: ahí (y sólo ahí) se evaluaría borrar `js/visor/` y promover
`visor-uikit.html` a `index.html`. Fuera de alcance de este plan — este plan
termina con las dos versiones funcionando en paralelo.

## Tarea 7: Verificación final

- [ ] Medir `renderer_info` del visor nuevo y comparar contra ~12 draw
  calls/564 triángulos del viejo.
- [ ] Pasada manual completa por las 9 pantallas + HUD en `visor-uikit.html`.
- [ ] Borrar `js/visor-uikit/_spike.js`.
- [ ] Documentar qué no se pudo probar en este entorno (controles/manos XR
  reales).
- [ ] `node --test` una última vez.

---

## Recomendación de ejecución

**Nativa (en esta sesión/chat), no subagent-driven**: cada tarea depende de
decisiones ya tomadas sobre este código específico (valores de legibilidad VR,
el estilo ámbar, por qué cada número físico es el que es). Una revisión final
sobre toda la rama alcanza.
