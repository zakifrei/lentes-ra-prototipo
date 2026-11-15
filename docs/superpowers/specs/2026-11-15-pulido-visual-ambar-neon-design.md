# Pulido visual "ámbar-neón" — Design

## Intent y por qué

El prototipo ya tiene una paleta cálida ámbar aplicada (Etapa 5, Task 19:
fondo oscuro semitransparente, borde ámbar, brillo suave, tipografía
limpia), pero el dueño del proyecto quiere llevar la estética un paso más
allá — "más pro" — antes de la prueba de usabilidad real. Tiene 3 días
libres y pidió explícitamente armar el plan y ejecutarlo sin necesidad de
su revisión previa (aprobación anticipada, dada en conversación).

Referencia visual que el dueño del proyecto compartió: un kit de UI oscuro,
estilo "vidrio neón" — paneles redondeados tipo cápsula con un bisel/brillo
que da sensación de profundidad, bordes e íconos con un brillo neón intenso
en el color de acento, íconos simples en vez de sólo texto. Pidiólo mismo
pero en ámbar (no violeta).

## Restricción central (ya explicada y aceptada en la conversación)

El visor es WebXR: cada panel es un plano 3D con una textura dibujada a
mano en un `<canvas>` 2D (Canvas2D → `THREE.CanvasTexture`), no HTML/CSS.
Por eso:

- **El efecto de "vidrio esmerilado" real** (que desenfoca lo que hay
  DETRÁS del panel — en este caso, el video de passthrough del mundo real)
  **no es viable** sin renderizar la escena a una textura intermedia cada
  cuadro (un costo de GPU que no conviene arriesgar en un Quest standalone
  para un prototipo de usabilidad). En su lugar, se imita la sensación de
  "vidrio"/profundidad con bisel + brillo (gradientes y sombra en el propio
  Canvas2D), sin desenfocar nada real detrás.
- **El panel del observador** (`panel.html`/`css/panel.css`) SÍ es HTML/CSS
  normal — ahí el vidrio esmerilado real (`backdrop-filter: blur(...)`) es
  trivial y se aplica de verdad.

## Goals

- Paneles con forma de "cápsula" (esquinas bien redondeadas, más
  pronunciadas en botones chicos que en paneles de texto grandes), con un
  bisel sutil (gradiente de luz) que da sensación de profundidad/vidrio.
- Brillo ámbar más intenso ("neón"), manteniéndolo "sutil" como pide el
  moodboard original — no debe competir con la lectura del texto real de
  la clase (passthrough) ni distraer.
- Íconos simples (trazos/formas básicas dibujadas a mano en el canvas, sin
  assets externos) acompañando el texto en los botones de navegación.
- El panel del observador (celular) usa vidrio esmerilado real + el mismo
  lenguaje de color/forma, para que ambas superficies combinen.
- (Prioridad más baja, última tarea) una animación suave de aparición al
  entrar de verdad a una pantalla, en vez del pop instantáneo actual.

## Non-goals

- No se toca ninguna posición, tamaño físico, ni comportamiento/lógica de
  interacción ya construido y probado en vivo esta noche (arrastre,
  escalado, navegación, Firebase, etc.) — esto es pulido puramente visual.
- No se agrega sonido.
- No se agregan assets externos (imágenes/SVG/fuentes de terceros): todo
  se sigue dibujando a mano con Canvas2D/CSS, sin paso de build, mismo
  principio que el resto del proyecto.

## Anti-goals (qué haría fallar esto aunque "funcione")

- Que el brillo/bisel reduzca el contraste o la legibilidad del texto.
- Que la animación de entrada haga sentir la interfaz "lenta" o tapone el
  gesto de selección (debe ser puramente cosmética, nunca bloquear que el
  usuario interactúe mientras una pantalla está "entrando").
- Que el costo de dibujo (que ya es barato: sólo redibuja un canvas cuando
  algo cambia, no en cada cuadro de render 3D) deje de serlo por accidente.

## Decisión sobre tipografía (ya tomada, no es parte del alcance)

Se evaluó cargar una fuente web custom (más cercana a la de la imagen de
referencia) ahora que hay tiempo. Se descarta: dibujar texto en un
`<canvas>` con una fuente custom exige esperar su carga
(`document.fonts.load`/`FontFace`) ANTES del primer `fillText` en CADA uno
de los ~8 archivos que dibujan su propio canvas, o el texto se dibuja con
la fuente de reemplazo. El beneficio visual de este cambio puntual es bajo
comparado con el de forma/color/íconos/bisel — se mantiene la pila de
fuentes del sistema ya elegida en la Task 19, sólo se ajustan pesos
(negrita donde ayude) dentro de esa misma pila.

## Approaches consideradas

1. **Redibujar todo con el mismo Canvas2D ya usado, con cápsulas + bisel +
   glow más intenso + íconos dibujados a mano** (elegida). Reutiliza toda
   la arquitectura actual (`tema-visual.js` centralizado, cada pantalla
   dibuja su propio canvas o usa `panel-texto.js`), bajo riesgo, sin tocar
   geometría 3D ni rendimiento de WebGL.
2. Reemplazar los planos con texturas 2D por geometría 3D real con bisel
   físico (`RoundedBoxGeometry`, materiales PBR, quizás reflejos de
   entorno). Descartada: mucho mayor complejidad y riesgo de rendimiento
   en un Quest standalone, para un prototipo de prueba de usabilidad con
   plazo fijo — el beneficio visual marginal sobre la opción 1 no justifica
   el riesgo.
3. Dejar el pulido actual (Task 19) como está y sólo sumar íconos.
   Descartada por el propio dueño del proyecto: quiere ir más allá de eso.

## Decisiones de diseño concretas (criterio del builder, dentro del
aprobado por el dueño del proyecto)

- **Radio de esquinas**: proporcional al tamaño del panel. Botones chicos
  (menú flotante, +/-, opciones del desplegable) → esquinas muy
  redondeadas, cercanas a cápsula/círculo. Paneles de texto grandes
  (mensajes, columnas del mapa) → esquinas redondeadas generosas pero sin
  llegar a óvalo (mantener el texto legible en un rectángulo reconocible).
- **Bisel/"vidrio"**: un gradiente lineal sutil (más claro arriba a la
  izquierda, más oscuro abajo a la derecha, simulando una fuente de luz) +
  un trazo fino y brillante a lo largo del borde superior, además del
  borde ámbar y el `shadowBlur` ya existentes.
- **Brillo**: se aumenta la intensidad (`shadowBlur`/opacidad) respecto a
  la Task 19, pero se mantiene un único nivel consistente en todos los
  paneles (no se agrega una variante "con más énfasis" por botón activo,
  para no sumar complejidad de estado nueva sin un caso de uso claro en
  este proyecto sin hover real).
- **Íconos**: trazos/formas geométricas simples (líneas, círculos, arcos)
  dibujados directamente en el mismo canvas de cada botón, antes o junto
  al texto — mismo color que el texto (`COLOR_TEXTO`), sin nuevas
  dependencias. Un ícono por concepto: subtítulos (globo de diálogo),
  imágenes (foto/montaña), mapa conceptual (nodos conectados), pausa
  (barras ‖), aviso aceptar/rechazar (check/X), reiniciar (flecha
  circular), menú (líneas tipo "hamburguesa").
- **Panel del observador**: `backdrop-filter: blur(...)` real sobre fondo
  semitransparente, botones tipo cápsula con `box-shadow` ámbar neón,
  mismas variables de color que ya existen en `panel.css` (de la Task 19),
  intensificadas.
- **Animación de entrada**: fade + scale-in corto (~200-250ms) al entrar de
  verdad a una pantalla, implementado con el mismo patrón de hooks
  opcionales que ya usa el proyecto (`alEntrar`/`alReiniciarTodo`) —
  última prioridad, para que si el tiempo se acaba, el resto del pulido
  visual ya esté entregado.

## Qué queda a criterio del builder (no requiere volver a preguntar)

- Valores numéricos exactos (radios, grosores, colores hex específicos
  dentro de la familia ámbar, duraciones de animación) — mismo criterio
  que ya se usó en Task 19 (valores concretos elegidos y documentados,
  ajustables a ojo en la vista previa).
- Forma exacta de cada ícono (mientras sea reconocible y simple).
- Orden de ejecución de las tareas del plan, agrupación exacta de archivos
  por tarea.
