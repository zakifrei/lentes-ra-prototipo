# Sistema de diseño — Lentes RA (visor-uikit)

Armado con `/design-consultation` (2026-11-21) sobre `visor-uikit.html` +
`js/visor-uikit/` -- el visor nuevo, migrado a `@pmndrs/uikit`. No aplica
a `index.html`/`js/visor/` (el visor viejo, en Canvas2D, fuera de
alcance de esta migración).

## Contexto del producto

- **Qué es:** un overlay AR/VR (Meta Quest real + vista previa de
  escritorio) que acompaña una clase de Historia -- subtítulos,
  imágenes, un mapa conceptual, pausas por atención, resumen de la
  clase.
- **Para quién:** estudiantes en clase, viendo la clase real a través
  del visor con el contenido superpuesto.
- **Espacio/categoría:** AR/VR educativo -- la referencia más cercana no
  es un sitio web sino Meta Horizon OS y Apple visionOS (paneles
  espaciales), investigados en esta consulta.
- **Lo memorable (una sola frase, la que todo lo demás tiene que
  servir):** se siente cálido y acompañado, no una pantalla fría.

## Por qué este sistema (investigación)

Tanto Meta Horizon OS como Apple visionOS convergen en paneles
fríos/neutros -- glass translúcido, grises, azules, sin calidez. Ese es
el default de toda la categoría espacial. La oportunidad (y el pedido
explícito del dueño del proyecto) es diferenciarse justo ahí: un visor
cálido, no uno más que se mezcla con el glass gris de siempre.

Lo que SÍ se toma de esa investigación (convención de la categoría, no
hay que reinventarlo):
- Legibilidad a distancia con escala dinámica (ver Tipografía/Spacing).
- Pantallas cortas, de un solo propósito -- confirmado también por
  estudios de co-diseño de apps AR/MR educativas (interacciones
  modulares, sin saturar).
- Un sistema de color semántico consistente (primary/border/card/...),
  no colores sueltos por pantalla.

## Dirección estética

- **Dirección:** Cálido/editorial -- "candlelight ámbar" en vez del
  glass frío estándar de AR/VR.
- **Decoración:** Intencional -- sutil (el degradé de los carteles,
  más abajo), nunca expresiva: el visor jamás compite con el contenido
  real de la clase.
- **Mood:** como si alguien real te estuviera dando la clase, no un
  dashboard.

## Tipografía

- **Cuerpo / botones / subtítulos / UI en general:** Plus Jakarta Sans
  (regular 400 + bold 700) -- humanista, más cálida que una sans
  neutra genérica. Vendorizada en `vendor/fonts/PlusJakartaSans-*.ttf`.
- **Títulos de las pantallas de lectura (bienvenida/vuelta/aviso/mapa):**
  Fraunces (sólo bold, óptico 72pt, softness 40) -- serif editorial,
  deliberadamente DISTINTA del cuerpo, para que el título se sienta
  escrito a mano, no impreso en un formulario. Vendorizada en
  `vendor/fonts/Fraunces-Bold.ttf`.
- **Regla de uso de Fraunces:** sólo títulos cortos en negrita dentro de
  un cartel de lectura. NUNCA en botones (son UI, no lectura) ni en
  contadores/números que cambian en vivo (pantalla-pausa.js -- una
  serif de display no conviene para un número que se actualiza solo).
- **Carga:** ambas fuentes se generan como MSDF en tiempo de carga con
  el charset de español (ver `js/visor-uikit/ui-kit/fuente-uikit.js`) --
  @pmndrs/uikit no trae acentos/ñ/¿¡ por defecto.
- **Escala:** heredada de la migración original, no tocada por esta
  consulta -- ver `TAMANO_FUENTE_*` en cada `pantalla-*.js` (todas a la
  escala de referencia de 1024px, no CSS px -- ver panel-uikit.js).

## Color

- **Enfoque:** Balanceado -- un sistema semántico real
  (`js/visor-uikit/ui-kit/tema-uikit.js`), no colores sueltos.
- **Texto:** `#fff3e0`
- **Ámbar (acento/borde):** `#ffb454`
- **Ámbar texto (detalle chico):** `#ffe6c2`
- **Fondo cartel (base del degradé, el tono más oscuro):**
  `rgba(28, 16, 8, 0.74)`
- **Fondo botón:** `rgba(99, 49, 13, 0.66)`
- **Degradé del cartel (riesgo de esta consulta):** `rgba(64, 40, 20,
  0.74)` arriba → `rgba(28, 16, 8, 0.74)` (el fondo cartel de siempre)
  abajo -- generado a mano en un canvas (`crearFondoDegradadoCartel()`
  en tema-uikit.js), porque uikit no acepta un degradé directo en
  `backgroundColor`.
- **Destructivo (el único no-ámbar a propósito):** `#aa0a1e` -- mismo
  rojo de alerta que ya usa el resto del proyecto.
- **Dark mode:** no aplica -- el visor no tiene modo claro, es siempre
  sobre el mundo real/una escena 3D oscura.

## Spacing

- **Base:** escala de referencia de 1024px (no CSS px) -- todo
  `fontSize`/`padding`/`gap` de uikit se calibra contra esa base y se
  convierte a metros vía `pixelSize = ancho_metros / 1024` (ver el
  comentario grande en panel-uikit.js).
- **Densidad:** cómoda, no apretada -- margen horizontal estándar de 40
  (a esa escala) en todos los carteles.
- **No tocado por esta consulta** -- ya estaba bien calibrado desde la
  migración original.

## Layout

- Con disciplina de grilla pero espaciado generoso -- un panel por
  pantalla, centrado, igual que antes de esta consulta.
- **No tocado por esta consulta.**

## Motion (riesgo de esta consulta)

- **Antes:** ninguna transición entre pantallas -- corte seco,
  explícitamente dejado afuera en la migración original (Tarea 7) por
  no haber sido pedido entonces.
- **Ahora:** pop-in de escala al entrar a cualquier pantalla -- escala
  inicial 0.85, 220ms, ease-out cuadrático (`js/visor-uikit/main.js`,
  `iniciarAnimacionDeEntrada`/`actualizarAnimacionesDeEntrada`) --
  mismos valores que ya tenía el visor viejo (Tarea 31), portados tal
  cual porque el pop-in refuerza "acompañado" sin inventar nada nuevo.
- Sin fade de opacidad (sólo escala) -- animar opacidad hubiera
  requerido tocar cada panel de uikit individualmente (no hay un
  "opacity" a nivel de THREE.Group); la escala sola ya alcanza y es
  mucho más simple/segura.

## Íconos

- `@pmndrs/uikit-lucide` (el set de Lucide, el mismo que usa shadcn/ui)
  en vez de íconos dibujados a mano en Canvas2D -- vectoriales, nítidos
  a cualquier tamaño, recoloreables vía la propiedad `color` (NO
  `fill` -- ver el hallazgo documentado en icono-uikit.js).
- Mapeo nombre→ícono en `ICONOS_POR_NOMBRE`
  (`js/visor-uikit/ui-kit/icono-uikit.js`).

## Componentes

- `@pmndrs/uikit-default` (kit estilo shadcn/ui, recoloreado a ámbar vía
  `setTheme()` en `tema-uikit.js`) -- el único kit de uikit que es
  realmente recolorable (`@pmndrs/uikit-horizon`, el de Meta, tiene los
  colores de marca hardcodeados, investigado y descartado).
  - `Button`: todo lo tocable.
  - `Card`: carteles de sólo lectura genéricos (crearContenedorUikit).
  - `Alert`/`AlertIcon`/`AlertTitle`/`AlertDescription`: pantalla-aviso
    -- ícono + título corto + descripción, en vez de una sola oración
    corrida en un `Card` genérico.
- `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`/
  `AccordionTriggerIcon`: botón de menú flotante (`boton-menu-flotante.js`)
  -- pedido del dueño del proyecto ("no me gusta la lista extendible del
  menú, ¿no existe un uikit para eso?"). Reemplaza 4 roots de uikit
  independientes (el botón + 3 opciones, con `.visible` prendido/apagado
  a mano) por un único árbol con layout flexbox real, estado de abierto/
  cerrado real (una señal) y una flecha que rota sola al abrir/cerrar.
  El clic sigue yendo por el mismo raycasting manual de siempre -- sólo
  se aprovechan las reacciones automáticas del componente (la flecha, el
  show/hide del contenido), nunca su `onClick` embebido.
  - **Bug de la librería encontrado y evitado:** `AccordionContent` trae
    `overflow: 'hidden'` por defecto, pero sus planos de recorte de
    WebGL quedan calculados contra la posición que tenía mientras estaba
    colapsado y nunca se recalculan al abrirse -- el resultado observado
    fue que los íconos de los botones de opción se recortaban por
    completo (invisibles) apenas el menú se abría. Se desactiva con
    `overflow: 'visible'` (acá no hace falta recorte: el colapsar/
    expandir ya lo resuelve el `display:'none'/'flex'` propio del
    componente).
- **Sin usar todavía, candidatos para una próxima vuelta:** `Badge`,
  `Separator`, `Avatar`, `Progress`, `Tooltip` -- el kit ya los trae,
  no hace falta instalar nada nuevo para probarlos.

## Explícitamente descartado (y por qué)

- **`panelMaterialClass: 'glass'/'metal'/'plastic'` de uikit:** son
  materiales de Three.js con luz real (`MeshPhysicalMaterial`/
  `MeshPhongMaterial`) -- la escena sólo tiene una `AmbientLight` plana,
  sin luz direccional ni environment map. Aplicarlos sin eso
  probablemente se vería peor, no mejor. Agregar iluminación real para
  que rindan bien es un cambio más grande, fuera de alcance de esta
  vuelta.
- **Fade de opacidad en las transiciones:** ver Motion arriba.

## Decisions Log

| Fecha | Decisión | Rationale |
|-------|----------|-----------|
| 2026-11-20 | `@pmndrs/uikit-default` sobre `@pmndrs/uikit-horizon` para Button/Card | Único kit recolorable a ámbar |
| 2026-11-20 | `Card` para carteles de sólo lectura | Reemplaza el Container pintado a mano |
| 2026-11-20 | `@pmndrs/uikit-lucide` para íconos | Set vectorial real en vez de Canvas2D a mano |
| 2026-11-21 | `Alert` para pantalla-aviso | Semántica propia (ícono+título+descripción) |
| 2026-11-21 | Plus Jakarta Sans + Fraunces sobre Inter | /design-consultation: reforzar calidez vs. el glass frío de la categoría |
| 2026-11-21 | Pop-in de escala al cambiar de pantalla | /design-consultation: "acompañado", no un corte seco |
| 2026-11-21 | Degradé sutil en los carteles de lectura | /design-consultation: más cerca de paneles reales de Horizon/visionOS, sin tocar la iluminación de la escena |
| 2026-11-23 | `Accordion` real para el menú flotante, sobre 4 roots independientes | Pedido del dueño del proyecto: señal visual real de "esto se expande" (flecha que rota) |
| 2026-11-23 | `renderOrder:-1` en el degradé de los carteles (antes `1`) | Bug: tapaba el texto con su alpha 0.74 cuando el `Text` no fijaba su propio renderOrder |
