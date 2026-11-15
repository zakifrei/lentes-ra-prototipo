# Pulido visual "ámbar-neón" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar el pulido visual del prototipo ("cálido ámbar", Task 19) a una estética "más pro" tipo vidrio-neón, inspirada en una referencia que compartió el dueño del proyecto, sin tocar ninguna posición/tamaño/comportamiento ya probado en vivo.

**Architecture:** Todo el dibujo visual del visor sigue viviendo en Canvas2D sobre `THREE.CanvasTexture` (sin geometría 3D nueva); se centraliza en `js/visor/tema-visual.js` (ya existente, Task 19) un fondo "cápsula" con bisel/brillo más intenso, y se agrega `js/visor/iconos.js` con íconos simples dibujados a mano. El panel del observador (`panel.html`/`css/panel.css`) es HTML/CSS normal y sí usa vidrio esmerilado real (`backdrop-filter`).

**Tech Stack:** Canvas 2D (`CanvasRenderingContext2D`), Three.js (`CanvasTexture`, ya vendorizado), CSS (`backdrop-filter`, `box-shadow`). Sin paso de build, sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-15-pulido-visual-ambar-neon-design.md`

## Global Constraints

- Sin assets externos (imágenes/SVG/fuentes de terceros): todo dibujado a mano con Canvas2D/CSS.
- No se toca ninguna posición, tamaño físico, ni lógica de interacción/arrastre/Firebase ya construida -- sólo apariencia.
- Sin fuente web custom (decisión ya tomada en el spec): se mantiene la pila de fuentes del sistema de `FUENTE_PRINCIPAL` (`tema-visual.js`).
- El brillo/bisel nunca debe reducir la legibilidad del texto ni ocupar más espacio físico que el panel ya tiene.
- Idioma español en nombres/comentarios/UI; comentarios sólo donde aclaran un "por qué" no obvio; commits en español.

## Review Focus

- Un ícono se dibuja sobre un panel de VARIAS líneas de texto (ej. bienvenida, resumen) y queda superpuesto/choca con el texto -> los íconos sólo deben aplicarse a etiquetas de una sola línea corta (cubierto en Task 28: `panel-texto.js` sólo dibuja el ícono si `lineas.length === 1`).
- El radio de la "cápsula" en un panel muy chico (botones +/-, botón de menú flotante) supera la mitad del lado menor y rompe la forma -> cubierto en Task 27 (el radio se clampa SIEMPRE a `Math.min(radioDeseado, ancho/2, alto/2)`, igual criterio que ya usaba `dibujarFondoPanel`).
- El brillo (`shadowBlur`) más intenso "ahoga" visualmente un ícono o texto chico -> cubierto en Task 27/29 con verificación manual explícita en paneles chicos (botones +/-, menú flotante).
- El gradiente de bisel se dibuja sobre el rectángulo completo del canvas en vez de recortado a la forma redondeada -> se ve un cuadrado con las esquinas "pisando" el fondo transparente -> cubierto en Task 27 (el gradiente se aplica dentro del mismo `path` redondeado que ya usa `fill()`, nunca sobre un `fillRect` aparte).
- `backdrop-filter` no soportado en el navegador del celular del observador deja el panel completamente opaco o roto -> cubierto en Task 30 con una regla `@supports` de respaldo (fondo semitransparente sin blur si el navegador no lo soporta).

---

### Task 27: Tema visual -- cápsulas, bisel y brillo intensificado

**Files:**
- Modify: `js/visor/tema-visual.js`

**Interfaces:**
- Produces: `dibujarFondoPanel(contexto, ancho, alto)` -- MISMA firma que ya existe (Task 19); todos los consumidores actuales (`panel-texto.js`, `pantalla-subtitulos.js`, `pantalla-pausa.js`, `pantalla-vuelta.js`, `pantalla-resumen.js`) siguen llamándola igual y heredan el nuevo look sin que haga falta tocarlos.

- [ ] **Step 1: Subir la intensidad del brillo** -- aumentar `DESENFOQUE_BRILLO` (hoy 16) y/o la opacidad de `COLOR_BRILLO` (hoy `rgba(255, 150, 60, 0.6)`) a un valor visiblemente más "neón", sin que un texto o ícono chico quede ilegible (verificar a ojo en la vista previa sobre un panel chico, ej. los botones +/- de subtítulos).
- [ ] **Step 2: Hacer el radio de esquina proporcional al tamaño del panel**, en vez del valor fijo `RADIO_ESQUINAS=24`. Reemplazar por una función/heurística que, dado `ancho`/`alto` (en px de canvas), devuelva un radio más grande en paneles chicos (acercándose a cápsula/círculo) y más moderado en paneles grandes -- SIEMPRE clampado con `Math.min(radioDeseado, ancho/2, alto/2)` (mismo criterio de seguridad que ya existía, para no romper paneles chicos).
- [ ] **Step 3: Agregar el bisel** dentro de `dibujarFondoPanel`: antes o junto al `fill()` del fondo, aplicar un `CanvasGradient` lineal (más claro en una esquina, más oscuro en la opuesta, simulando una fuente de luz) DENTRO del mismo `path` redondeado ya trazado (nunca con un `fillRect` aparte que ignore el recorte de esquinas) -- más un trazo fino y brillante sólo a lo largo del borde superior del mismo `path` (además del borde ámbar ya existente).
- [ ] **Step 4: Verificar manualmente** en la vista previa de escritorio (servidor local + un arnés aislado si hace falta, igual criterio que tareas anteriores de esta sesión): abrir al menos 4 pantallas representativas que usan `dibujarFondoPanel` por distintos caminos -- una vía `panel-texto.js` (ej. menú), y las 4 de canvas propio (subtítulos, pausa, vuelta, resumen) -- confirmando que el bisel/brillo se ve bien en paneles grandes Y chicos (botones), sin recortes raros ni pérdida de legibilidad.
- [ ] **Step 5: Commit**

```bash
git add js/visor/tema-visual.js
git commit -m "feat: panel tipo capsula con bisel y brillo neon intensificado"
```

### Task 28: Librería de íconos simples + soporte opcional en panel-texto.js

**Files:**
- Create: `js/visor/iconos.js`
- Modify: `js/visor/paneles/panel-texto.js`

**Interfaces:**
- Produces: `js/visor/iconos.js` exporta `dibujarIcono(nombre, contexto, cx, cy, radio)` -- dibuja el ícono `nombre` centrado en `(cx, cy)` dentro de un radio aproximado `radio` (px de canvas), con `contexto.strokeStyle`/`fillStyle` ya configurados por quien llama (el ícono usa el color de trazo/relleno que ya esté activo en el contexto, no fija uno propio). Nombres soportados (Task 29 los va a usar): `'subtitulos'`, `'imagenes'`, `'mapa'`, `'pausa'`, `'aceptar'`, `'rechazar'`, `'reiniciar'`, `'menu'`, `'flecha'`. Si `nombre` no es ninguno de estos, no dibuja nada (no tira error).
- `panel-texto.js`: `crearPanelTexto(lineas, opciones)` gana una opción nueva `icono` (string, uno de los nombres de arriba, opcional). Consumes `dibujarIcono` de `iconos.js`.

- [ ] **Step 1: Implementar `js/visor/iconos.js`** con un `dibujarIcono` simple por nombre (trazos/formas geométricas básicas -- líneas, círculos, arcos -- con `contexto.beginPath()`/`stroke()`/`fill()`; nada de assets externos). Un ícono reconocible por concepto alcanza (ej. `'subtitulos'`: un globo de diálogo simple; `'imagenes'`: un marco con un círculo y una montaña; `'mapa'`: 3 puntos conectados por líneas; `'pausa'`: dos barras verticales; `'aceptar'`: un check; `'rechazar'`: una X; `'reiniciar'`: una flecha en arco (casi circular); `'menu'`: 3 líneas horizontales cortas; `'flecha'`: una flecha simple apuntando a la derecha). Usá tu criterio para las coordenadas exactas de cada trazo, dentro del radio recibido.
- [ ] **Step 2: Modificar `dibujarLineasEnCanvas`/`crearPanelTexto` en `panel-texto.js`** para que, si `opciones.icono` viene definido Y `lineas.length === 1` (sólo para etiquetas de una sola línea corta -- Review Focus del plan), dibuje el ícono a la izquierda del texto (ambos centrados verticalmente), con el texto corrido hacia la derecha para no superponerse. Si `lineas.length > 1` o no se pasa `icono`, el comportamiento es IDÉNTICO al actual (sin cambios para paneles multilínea).
- [ ] **Step 3: Verificar manualmente** con un arnés aislado o la vista previa: un botón de una sola línea con `icono` definido muestra el ícono + texto sin solaparse; un panel multilínea (ej. bienvenida) se ve exactamente igual que antes (sin ícono).
- [ ] **Step 4: Commit**

```bash
git add js/visor/iconos.js js/visor/paneles/panel-texto.js
git commit -m "feat: libreria de iconos simples y soporte opcional en panel-texto"
```

### Task 29: Aplicar íconos a los botones de navegación del visor

**Files:**
- Modify: `js/visor/paneles/pantalla-menu.js`
- Modify: `js/visor/paneles/boton-menu-flotante.js`
- Modify: `js/visor/paneles/pantalla-aviso.js`
- Modify: `js/visor/paneles/pantalla-vuelta.js`
- Modify: `js/visor/paneles/pantalla-resumen.js`
- Modify: `js/visor/paneles/pantalla-imagenes.js`

**Interfaces:**
- Consumes: `crearPanelTexto(lineas, { icono, ... })` (Task 28).

- [ ] **Step 1: `pantalla-menu.js`** -- las 3 opciones (`subtitulos`/`imagenes`/`mapa`) pasan `icono: opcion` (el nombre de la opción coincide con un nombre de ícono soportado).
- [ ] **Step 2: `boton-menu-flotante.js`** -- el botón principal "Menú" pasa `icono: 'menu'`; los 3 botones del desplegable pasan los mismos íconos que `pantalla-menu.js` (`'subtitulos'`/`'imagenes'`/`'mapa'`).
- [ ] **Step 3: `pantalla-aviso.js`** -- el botón de aceptar pasa `icono: 'aceptar'`, el de rechazar `icono: 'rechazar'`.
- [ ] **Step 4: `pantalla-vuelta.js`** -- ambos botones ("Seguir con la clase"/"Ver un resumen rápido") pasan algún ícono razonable (criterio propio -- por ejemplo `'flecha'` para ambos, o reusar `'menu'`/otro si te parece más claro).
- [ ] **Step 5: `pantalla-resumen.js`** -- el botón "Volver a la clase" pasa `icono: 'flecha'`.
- [ ] **Step 6: `pantalla-imagenes.js`** -- el botón "Ver más imágenes" pasa `icono: 'flecha'`.
- [ ] **Step 7: Verificar manualmente** cada pantalla tocada en la vista previa (o un arnés aislado si es más simple para alguna), confirmando que el ícono se ve junto al texto sin solaparse ni romper el layout de cada botón.
- [ ] **Step 8: Commit**

```bash
git add js/visor/paneles/pantalla-menu.js js/visor/paneles/boton-menu-flotante.js js/visor/paneles/pantalla-aviso.js js/visor/paneles/pantalla-vuelta.js js/visor/paneles/pantalla-resumen.js js/visor/paneles/pantalla-imagenes.js
git commit -m "feat: aplicar iconos a los botones de navegacion del visor"
```

### Task 30: Panel del observador -- vidrio esmerilado real + ámbar neón

**Files:**
- Modify: `css/panel.css`

**Interfaces:** (ninguna nueva -- sólo estilos)

- [ ] **Step 1: Aplicar `backdrop-filter: blur(...)` + fondo semitransparente** a las secciones/tarjetas del panel, con una regla `@supports (backdrop-filter: blur(1px))` que condicione el blur -- si el navegador NO lo soporta, el fondo debe quedar en un semitransparente razonable SIN blur (nunca completamente opaco ni roto, Review Focus del plan).
- [ ] **Step 2: Botones tipo "cápsula"** -- `border-radius` bien grande (acercándose a píldora) y `box-shadow` ámbar más intenso (neón), coherente con el nuevo `tema-visual.js` del visor (mismos tonos, más brillo que la versión de la Task 19).
- [ ] **Step 3: Verificar manualmente** abriendo `panel.html` en la vista previa/navegador: el blur se ve (o el respaldo sin blur si se fuerza desactivar `backdrop-filter` en devtools), los botones siguen siendo grandes y fáciles de tocar en celular (no reducir el área táctil por perseguir la forma de cápsula).
- [ ] **Step 4: Commit**

```bash
git add css/panel.css
git commit -m "feat: vidrio esmerilado real y boton tipo capsula en el panel del observador"
```

### Task 31: Animación suave de entrada por pantalla (prioridad baja)

**Files:**
- Modify: `js/visor/main.js`

**Interfaces:**
- Produces: un mecanismo genérico centralizado en `main.js` -- cuando `aplicarComandoYActualizar` detecta una transición real a una nueva pantalla, además de llamar a `alEntrar?.()` (ya existente), arranca una animación corta (~200-250ms) de fade+scale-in sobre el grupo de esa pantalla (opacidad/escala interpolada de un valor inicial bajo a 1), actualizada desde el mismo loop de render que ya usa `main.js` (`renderizador.setAnimationLoop`).

- [ ] **Step 1: Implementar la animación como una función genérica** (ej. `iniciarAnimacionDeEntrada(grupo, ahoraMs)` + `actualizarAnimacionesDeEntrada(ahoraMs)`, en `main.js` o un módulo nuevo chico si el archivo ya está muy largo -- usá tu criterio) que, dado cualquier `THREE.Object3D`, anima su opacidad/escala en los primeros ~200-250ms después de activarse. Como los materiales de los paneles ya usan `transparent: true` (ver `panel-texto.js`/pantallas con canvas propio), interpolar `material.opacity` es viable sin tocar esos archivos -- confirmá esto leyendo el código antes de implementar; si algún material no tiene `transparent:true`, documentalo como limitación conocida en el reporte en vez de tocar ese archivo (fuera de alcance de esta tarea).
- [ ] **Step 2: Enganchar la animación en el mismo punto donde ya se llama `alEntrar?.()`** dentro de `aplicarComandoYActualizar`, y actualizarla en cada cuadro desde `renderizador.setAnimationLoop` (mismo lugar donde ya se actualiza la pantalla de pausa).
- [ ] **Step 3: Verificar manualmente** que cambiar de pantalla (via el panel real o un arnés) muestra la animación sin bloquear la interacción (se puede tocar un botón de la pantalla nueva aunque la animación todavía esté corriendo), y que no introduce ningún error de consola ni caída de cuadros perceptible.
- [ ] **Step 4: Commit**

```bash
git add js/visor/main.js
git commit -m "feat: animacion suave de entrada al cambiar de pantalla"
```
