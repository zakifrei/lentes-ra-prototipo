# Revisión visual de diseño del visor RA + panel del observador — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Nota: este no es un plan de feature con TDD — es una auditoría visual de diseño sobre una app ya funcional. "Test" acá significa "captura de pantalla real en el navegador", no un test automatizado; el único test automatizado que corre es la suite existente de `node --test`, como red de seguridad de que nada funcional se rompió.

**Goal:** Encontrar y corregir problemas de diseño visual (tamaño de letra desproporcionado, botones que se confunden con carteles fijos, jerarquía/contraste/espaciado/consistencia) en las 11 pantallas del visor RA (`js/visor/paneles/`) y en el panel del observador (`panel.html` + `css/panel.css`), verificando cada corrección con una captura real en el navegador, sin romper ninguna lógica funcional.

**Architecture:** Las pantallas del visor NO son DOM/CSS: son texturas dibujadas con Canvas 2D (`tema-visual.js` + `panel-texto.js` son las primitivas de dibujo compartidas) montadas sobre planos de Three.js en una escena WebXR, cuyo cambio de pantalla depende 100% de comandos de Firebase que escribe `panel.html` (una página HTML/CSS real). Corregir el visor significa editar constantes de dibujo en canvas (tamaño de fuente, flag `interactivo`, posiciones) en cada `pantalla-*.js`/`tema-visual.js`; corregir el panel significa editar `css/panel.css` de forma normal. Ambos se verifican abriendo dos pestañas del navegador (visor + panel) contra un server local, usando los botones reales del panel (que sí llegan al visor via Firebase, proyecto real ya configurado) para navegar entre pantallas.

**Tech Stack:** Three.js vendorizado, módulos ES nativos, Canvas 2D, Firebase Realtime Database (proyecto real, ya configurado en `js/config/firebase-config.js`), HTML/CSS plano para `panel.html`. Navegador vía Playwright MCP.

**Spec:** instrucciones pegadas por el usuario en esta conversación (sin doc de spec separado).

## Global Constraints

- Nunca romper lógica funcional: navegación entre pantallas, hit-boxes de raycasting de los botones, persistencia (`js/common/persistencia.js`), sincronización con Firebase.
- Los fixes se limitan a estilos: constantes de dibujo en canvas (tema visual) y `css/panel.css`/estilos inline — nada de cambios de arquitectura.
- Cada corrección se verifica visualmente en el navegador antes de darse por terminada (no alcanza con "se ve bien en el código").
- Se preserva el lenguaje visual ámbar/cálido ya establecido (`tema-visual.js`) y los textos literales existentes de cada pantalla.
- Varios de los problemas típicos que pide revisar el usuario (distinción botón/cartel fijo, deformación de texto en paneles no 2:1, tamaño de letra chico) ya tuvieron una ronda de fix en commits recientes (`7a8dece`, `6d3ed50`, `dbe396d`) — la auditoría parte de esa base: confirmar que esos fixes se ven bien en pantalla real y encontrar lo que quede (no re-proponer lo ya resuelto).

## Review Focus

- Pantallas con 3 bloques de texto de tamaño distinto apilados (`pantalla-bienvenida.js`, `pantalla-vuelta.js`): el bloque chico (tip/temas, tamaño ~34px) puede quedar desproporcionadamente chico contra el panel entero una vez renderizado a tamaño real — confirmar en pantalla, no solo en código.
- Botones minúsculos físicos (`+`/`-` de subtítulos e imágenes, 0.18-0.2m): confirmar que el glyph llena el botón sin quedar perdido contra el brillo/bisel del fondo.
- El desplegable del botón de menú flotante (`boton-menu-flotante.js`) abierto sobre otra pantalla: confirmar que no se superpone ni se confunde con los carteles de esa pantalla de fondo.
- `panel.html`/`css/panel.css`: aunque ya tiene buen contraste en el código (botones ámbar sobre fondo oscuro), confirmar en un viewport de celular real (el panel se usa desde el celular del observador).
- Pantallas con icono + texto en un solo renglón (`dibujarLineasEnCanvas` en `panel-texto.js`, botones del menú/aviso/vuelta): confirmar que el ícono no queda desbalanceado en tamaño/posición contra el texto en los distintos anchos de botón.

## File Structure

Pantallas (orden sugerido de prueba, ver README):
`pantalla-reconocimiento.js` · `pantalla-bienvenida.js` · `pantalla-menu.js` · `pantalla-subtitulos.js` · `pantalla-imagenes.js` · `pantalla-mapa.js` · `pantalla-aviso.js` · `pantalla-pausa.js` · `pantalla-vuelta.js` · `pantalla-resumen.js` · `pantalla-finalizada.js` · `boton-menu-flotante.js` (HUD superpuesto).

Primitivas compartidas: `tema-visual.js` (paleta, `dibujarFondoPanel`), `panel-texto.js` (factory de panel de texto genérico).

Panel del observador: `panel.html`, `css/panel.css`, `js/panel/main.js` (sólo lectura, no se toca lógica).

---

### Task 1: Armar el harness de QA visual (yo, sin delegar — necesita control directo del navegador)

**Files:** ninguno (sólo navegador + server local).

- [ ] **Paso 1:** Levantar el server local (`python3 -m http.server 8000` desde la raíz del proyecto, en background).
- [ ] **Paso 2:** Abrir con Playwright una pestaña en `http://localhost:8000` (visor) y otra en `http://localhost:8000/panel.html` (panel), y confirmar que el panel diga "Panel listo." (conexión Firebase ok).
- [ ] **Paso 3:** Screenshot base de ambas pestañas.

### Task 2: Recorrer y auditar las 11 pantallas + menú flotante (yo, sin delegar — el juicio visual necesita ver cada captura)

**Files:** sólo lectura de las pantallas ya leídas.

- [ ] **Paso 1:** Para cada pantalla en el orden del README: click en el botón correspondiente del panel, esperar el pop-in (~220ms), screenshot del visor.
- [ ] **Paso 2:** En una pantalla con el menú flotante visible, abrir el desplegable y screenshot.
- [ ] **Paso 3:** Screenshot de `panel.html` en viewport de celular (375px).
- [ ] **Paso 4:** Anotar, por pantalla, cualquier problema real contra los 3 criterios del usuario (tamaño de letra vs. bloque, botón vs. cartel fijo, jerarquía/contraste/espaciado/consistencia) — sólo lo que se vea mal en la captura, no lo que "podría" estar mal leyendo el código.

### Task 3: Lista de problemas encontrados (yo)

- [ ] **Paso 1:** Compilar la lista pantalla por pantalla (como la pide el usuario) con, para cada problema, el archivo y la constante/regla exacta a cambiar.

### Task 4: Corregir (delegado a subagentes en paralelo, por archivos disjuntos)

**Interfaces:** cada subagente recibe del Task 3 la lista exacta de problemas + fix a aplicar para sus archivos; ninguno toca lógica de raycasting/persistencia/Firebase.

- [ ] **Paso 1 (secuencial, antes de lo demás, sólo si aplica):** si hay un problema en `tema-visual.js`/`panel-texto.js` (afecta a ~10 archivos), lo corrijo yo mismo primero, no en paralelo con fixes específicos de pantalla.
- [ ] **Paso 2 (paralelo):** un subagente por grupo de archivos independientes (p. ej. pantallas de "3 bloques apilados" juntas, pantallas con botones +/- juntas, panel.html+css aparte) aplica sus fixes puntuales.
- [ ] **Paso 3:** cada subagente reporta qué cambió y por qué, en una línea por cambio.

### Task 5: Re-verificación visual (yo)

- [ ] **Paso 1:** Recargar ambas pestañas, repetir el recorrido de las pantallas tocadas, screenshot de cada una.
- [ ] **Paso 2:** Confirmar que el problema original ya no se ve, y que no se rompió nada alrededor (íconos no distorsionados, texto no cortado, botones siguen leyéndose como tocables).
- [ ] **Paso 3:** Correr `node --test test/*.test.mjs` como red de seguridad funcional (los fixes son visuales, pero esto confirma que no se tocó por error nada de lo que prueban esos tests).

### Task 6: Reporte final al usuario

- [ ] Resumen pantalla por pantalla: problema encontrado → fix aplicado → verificado.
