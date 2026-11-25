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

## Normas de Meta Horizon OS (2026-11-25)

Pedido externo: alinear el visor con reglas reales de diseño para Quest.
Fuente principal: las guías oficiales de Meta (developers.meta.com/vr/
design: `styles_typography`, `styles_color`, `styles_inputs_hit_targets`,
`accessibility-checklist`, `mr-design-passthrough`, y
`spatial-sdk-2dpanel-resolution` para la conversión dp -> metros). La guía
de Mixed Reality de Microsoft (`color-light-and-materials`) se leyó como
complemento, pero es para HoloLens (pantalla aditiva, el negro se ve
transparente) y no aplica tal cual al passthrough del Quest.

Reglas que este sistema cumple, y cómo:

| Regla de Meta | Valor | Dónde |
|---|---|---|
| Sans-serif de x-height alta; Inter es la tipografía del sistema | Inter regular/bold, una sola familia | `fuente-uikit.js` |
| Sin itálicas; pocos estilos de texto | 4 estilos (`TIPO_DP`), sin itálicas | `tema-uikit.js` |
| Texto >= 14 dp legible, >= 18 dp cómodo | Mínimo 18 dp en todo el visor | `TIPO_DP` + `fuenteDesdeDp()` |
| 500 dp por metro (paneles a ~2 m) | 1 dp = 2 mm de letra | `fuenteDesdeDp()` |
| Nada de blanco/negro puros: claros <= #DADADA, oscuros >= #1A1A1A | Texto `#e4d7c4`, fondo `rgb(36,26,18)` | `tema-uikit.js` |
| Contraste 4.5:1 texto, 3:1 no-texto (WCAG 2.1 AA) | >= 5.2:1 en todo, incluso sobre ventana/pared blanca | medido, ver `tema-uikit.js` |
| Zona clickeable >= 48 dp (96 mm), 60 dp (120 mm) para controles principales con manos | Todos los botones miden >= 180 mm de alto | `pantalla-*.js` |
| No comunicar sólo con color | Cada botón lleva ícono + texto | ya era así |

Lo que se mantiene a propósito, aunque Meta sugiera otra cosa:
- **Paleta cálida ámbar en vez del gris de Horizon OS:** Meta pide
  coherencia, contraste y colores semánticos, no un color en particular.
- **Sólo modo oscuro:** Meta recomienda soportar claro y oscuro, pero eso
  está pensado para apps 2D del sistema. En un overlay sobre el aula, un
  panel claro taparía la clase y encandilaría.

**Pendiente:** Meta insiste en probar tipografía y color en el visor real
(los valores de arriba están medidos en la vista previa de escritorio).

## Tipografía

- **Familia única: Inter** (regular 400 + bold 700), vendorizada en
  `vendor/fonts/Inter-*.ttf`. Reemplaza a Plus Jakarta Sans + Fraunces
  (2026-11-21): Meta pide sans-serif y la serif de Fraunces en títulos
  iba en contra de esa regla.
- **Pesos:** bold sólo para títulos y el contador de pausa; regular para
  todo lo demás (regla de Meta: "rely on the regular weight").
- **Carga:** MSDF en tiempo de carga con el charset de español (ver
  `js/visor-uikit/ui-kit/fuente-uikit.js`) -- @pmndrs/uikit no trae
  acentos/ñ/¿¡ por defecto.
- **Escala (en dp de Meta, `TIPO_DP` en tema-uikit.js):**

  | Estilo | dp | Alto de letra | Uso |
  |---|---|---|---|
  | `titulo1` | 32 | 64 mm | saludo (bienvenida/vuelta) |
  | `titulo2` | 24 | 48 mm | título de cartel, encabezado de columna, contador, mensajes únicos |
  | `cuerpo1` | 20 | 40 mm | texto principal y botones |
  | `cuerpo2` | 18 | 36 mm | texto secundario (tip, temas, resumen, datos del mapa) -- nunca menos |

  Cada pantalla convierte con `fuenteDesdeDp(dp, anchoPanel)`, así el alto
  físico de la letra no depende del ancho del panel. Excepciones medidas:
  subtítulos (~22 dp, escalables por el usuario) y el botón flotante
  (~20 dp), que ya cumplían.
- **Alineación del texto de los carteles:** centrada (`textAlign:
  'center'` en `crearContenedorUikit`, panel-uikit.js) -- el default de
  uikit es `'left'`, que quedaba raro en un panel ya centrado como
  bloque (`alignItems`/`justifyContent`): con texto de varias líneas, el
  bloque se veía centrado pero cada línea arrancaba pegada a la
  izquierda. Pedido del dueño del proyecto. Se evaluó `'justify'` y se
  descartó: con líneas cortas (2-3 renglones) fuerza espaciado disparejo
  entre palabras para estirar cada línea al ancho completo -- se ve peor,
  no mejor, que centrar.
  - **Caso particular: pantalla-aviso.js.** También centrado, pero hace
    falta un paso extra: el título/descripción tienen `paddingLeft` para
    no superponerse con el ícono (`MARGEN_IZQUIERDO_TEXTO`) -- sin un
    `paddingRight` IGUAL (no hay ícono ahí, sólo espacio "fantasma" para
    mantener la caja simétrica), centrar el texto dentro de esa caja
    angosta-sólo-a-la-izquierda lo corre visiblemente hacia la derecha
    del cartel real. Se probó revertir a `'left'` primero (en base al
    reporte inicial, mal diagnosticado) y se revirtió de nuevo al
    `paddingRight` espejado una vez que el dueño del proyecto aclaró que
    sí quería todo centrado.

## Color

- **Enfoque:** Balanceado -- un sistema semántico real
  (`js/visor-uikit/ui-kit/tema-uikit.js`), no colores sueltos.
- **Texto:** `#e4d7c4` (antes `#fff3e0`: casi blanco puro, fuera de la
  norma de Meta; mismo tono crema bajado a la luminancia de `#DADADA`).
- **Ámbar (acento/borde):** `#ffb454` -- 8.4:1 contra un aula oscura, es
  lo que separa el panel del entorno.
- **Ámbar texto (detalle chico):** `#ead3b0` (antes `#ffe6c2`).
- **Fondo cartel:** `rgb(36, 26, 18)` al 88% (antes `rgb(28,16,8)` al 74%,
  más oscuro que `#1A1A1A`). Degradé de `rgb(64, 42, 22)` arriba a ese
  tono abajo (`crearFondoDegradadoCartel()`).
- **Fondo botón:** `rgb(99, 49, 13)` al 88% (antes 66%: sobre una ventana
  el texto del botón quedaba en 4.1:1).
- **Opacidad de fondos (`OPACIDAD_FONDO`): 0.88** -- con 0.74 el detalle
  del aula (gente, pizarrón) se veía a través del panel y ensuciaba el
  texto en passthrough.
- **Borde (`GROSOR_BORDE`): 6** a la escala de 1024 (~4.7 mm). Con 2
  (~1.5 mm, ~1 píxel del Quest) se perdía.
- **Destructivo:** `#aa0a1e` -- 5.3:1 con el texto.
- **Bug de color corregido (2026-11-25):** uikit 1.0.78 carga los colores
  `rgba(...)` sin convertir de sRGB a lineal (los hex sí se convierten),
  así que TODOS los fondos se veían mucho más claros que lo diseñado (el
  cartel salía ~`rgb(107,96,80)`, el botón ~`rgb(168,122,64)`). Ahora los
  colores con alfa se escriben como hex de 8 dígitos (`colorConAlfa()`), y
  la textura del degradé declara `SRGBColorSpace`. **Regla: nunca usar
  `rgba(...)` en un color de uikit.**
- **Dark mode:** no aplica -- ver "Normas de Meta" arriba.

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
  `AccordionTriggerIcon`/`Separator`: botón de menú flotante
  (`boton-menu-flotante.js`) -- pedido del dueño del proyecto ("no me
  gusta la lista extendible del menú, ¿no existe un uikit para eso?").
  Reemplaza 4 roots de uikit independientes (el botón + 3 opciones, con
  `.visible` prendido/apagado a mano) por un único árbol con layout
  flexbox real, estado de abierto/cerrado real (una señal) y una flecha
  que rota sola al abrir/cerrar. El clic sigue yendo por el mismo
  raycasting manual de siempre -- sólo se aprovechan las reacciones
  automáticas del componente (la flecha, el show/hide del contenido),
  nunca su `onClick` embebido.
  - **Lista conectada, no píldoras sueltas (pedido del dueño del
    proyecto, misma vuelta: "repensemos los botones ovalados... que no
    parezcan todos individuales"):** un único panel con borde/radio
    propios (`AccordionItem`) en vez de 4 cápsulas con aire entre sí --
    cada fila (botón principal y cada opción) lleva el MISMO color de
    fondo que el panel (sin costura visible) y una línea divisoria fina
    (`Separator`) entre cada una, como un menú contextual nativo. Las
    esquinas redondeadas de arriba/abajo las resuelve cada fila a mano
    (`border*Radius` por esquina, reactivo según si el menú está
    abierto) -- `overflow:'hidden'` en el panel hubiera sido el camino
    obvio para recortar las filas cuadradas al marco redondeado, pero se
    probó en vivo y rompía el ícono, la flecha y el borde por completo
    (mismo tipo de bug que el de `AccordionContent` abajo, pero no
    limitado a `display:'none'` -- ver el comentario grande de
    boton-menu-flotante.js).
  - **Bug de la librería encontrado y evitado:** `AccordionContent` trae
    `overflow: 'hidden'` por defecto, pero sus planos de recorte de
    WebGL quedan calculados contra la posición que tenía mientras estaba
    colapsado y nunca se recalculan al abrirse -- el resultado observado
    fue que los íconos de los botones de opción se recortaban por
    completo (invisibles) apenas el menú se abría. Se desactiva con
    `overflow: 'visible'` (acá no hace falta recorte: el colapsar/
    expandir ya lo resuelve el `display:'none'/'flex'` propio del
    componente).
  - **Un `Container` sin `backgroundColor` no es clickeable:** no genera
    geometría real, así que el raycasting manual que usa toda la app le
    pasa de largo -- por eso cada fila de la lista lleva su propio
    `backgroundColor` en vez de quedar transparente.
- **Sin usar todavía, candidatos para una próxima vuelta:** `Badge`,
  `Avatar`, `Progress`, `Tooltip` -- el kit ya los trae, no hace falta
  instalar nada nuevo para probarlos.

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
| 2026-11-23 | Menú flotante oculto en la pantalla 'menu' | Redundante con pantalla-menu.js; su superposición producía texto/íconos "fantasma" (depthTest:false) |
| 2026-11-23 | Lista conectada (un panel + separadores) sobre 4 cápsulas sueltas en el menú flotante | Pedido del dueño del proyecto: que no parezcan piezas individuales |
| 2026-11-23 | Ícono+texto centrados en cada fila del menú flotante | Pedido del dueño del proyecto |
| 2026-11-23 | `textAlign: 'center'` en los carteles de lectura (antes `'left'`, el default) | Pedido del dueño del proyecto; se descartó `'justify'` por espaciado disparejo en líneas cortas |
| 2026-11-24 | `textAlign` revertido a `'left'` en pantalla-aviso.js (único cartel con `paddingLeft` asimétrico por el ícono) | Mal diagnosticado: el dueño del proyecto quería centrado, no izquierda -- revertido (ver fila siguiente) |
| 2026-11-24 | `paddingRight` espejado al `paddingLeft` del ícono en pantalla-aviso.js, `textAlign:'center'` restaurado | Mantiene el centrado simétrico de verdad en vez de correrlo hacia la derecha |
| 2026-11-25 | Inter (única familia) sobre Plus Jakarta Sans + Fraunces | Normas de Meta: sans-serif de x-height alta; Inter es la del sistema |
| 2026-11-25 | Escala tipográfica en dp (`TIPO_DP`, mínimo 18 dp) | Normas de Meta: 18 dp lectura cómoda; mapa/resumen/aviso/pausa estaban en 12-15 dp |
| 2026-11-25 | Texto `#e4d7c4`, fondos >= `#1A1A1A`, opacidad 0.88, borde 6 | Normas de Meta: sin blanco/negro puros, contraste AA también sobre ventanas en passthrough |
| 2026-11-25 | Colores con alfa como hex de 8 dígitos, no `rgba()` | Bug de uikit: `rgba()` se salteaba la conversión sRGB y aclaraba todos los fondos |
| 2026-11-25 | Resumen 1.3x0.7 m, columnas del mapa 0.48 m de alto, aviso 0.9 m, botones dobles 0.6 m | Para que el texto a 18-24 dp entre sin desbordar |
| 2026-11-25 | Saludos con "Zaki"; "¡Bienvenida de vuelta!" -> "¡Hola de nuevo, Zaki!" | Pedido del dueño del proyecto; saludo neutro en género, mismo patrón que la bienvenida |
| 2026-11-25 | Resumen arrastrable (panel + botón juntos, como subtítulos) | Pedido del dueño del proyecto |
| 2026-11-25 | Arrastre conserva el punto de agarre y no agarra paneles de pantallas ocultas | El panel saltaba con el centro hasta el rayo (notable en el resumen, 1.3 m) |
| 2026-11-25 | Zoom de subtítulos escala el panel entero (1x / 1.25x / 1.5x), botón en su límite atenuado | Bug: el "+" agrandaba la letra y el ajuste a ancho fijo la volvía a achicar; el "-" arrancaba en el mínimo |
