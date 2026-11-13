# Diseño — Simulación de lentes de RA para prueba de usabilidad

## Intención y por qué

Una facultad necesita probar, con usuarios reales, si una interfaz de
lentes inteligentes de realidad aumentada para clase (subtítulos,
imágenes, mapa conceptual, aviso de atención y pausa) es entendible y
útil. Los lentes reales no existen, así que se simula la experiencia con
un Meta Quest 3 / 3S en modo passthrough (cámara a color, se ve el mundo
real) usando WebXR en el navegador del visor. No es un producto final: es
un prototipo de prueba de usabilidad, desechable después del test.

El guion de la prueba (`docs/reference/guion.pdf`) define el escenario
(clase de historia, caída del Imperio romano), las tareas del usuario y
el recorrido exacto de pantallas con sus textos literales. Ese documento
es la fuente de verdad para todo lo que la interfaz muestra en palabras.

**Fecha límite: miércoles 18/11/2026** (el diseño se escribe el 13/11,
quedan ~5 días). Esto es un condicionante fuerte: se prioriza tener el
recorrido completo funcionando de punta a punta antes que pulir cada
detalle visual.

## Objetivos

- El usuario puede atravesar, con el Quest puesto, todo el recorrido del
  guion: reconocimiento facial simulado → bienvenida → menú de ayudas →
  subtítulos (agrandables) → imágenes (movibles/escalables) → aviso de
  atención → pausa activa con contador → vuelta de pausa → resumen
  rápido → vuelta a la clase.
- Las interacciones funcionan tanto con las manos (pellizco, eventos de
  selección WebXR) como con los controles (gatillo), sin tener que
  programar dos caminos de código distintos.
- Un observador controla el avance del recorrido en tiempo real desde un
  panel web aparte (celular o compu), sin tocar el visor.
- Después de la pausa, el sistema recuerda el tamaño de subtítulo y la
  posición/tamaño de las imágenes que el usuario dejó antes de pausar.
- Se puede revisar el diseño desde la compu (mouse) sin tener el Quest
  puesto, para iterar rápido.
- El prototipo queda publicado en GitHub Pages para abrirlo directo
  desde el navegador del Quest, sin instalar nada.

## No-objetivos

- No hay reconocimiento facial real, ni medición real de atención: todo
  lo dispara el observador manualmente desde el panel.
- No es multiidioma: todo el texto es en español, tal cual el guion.
- No hay backend propio ni base de datos persistente de usuarios; el
  prototipo no necesita sobrevivir más allá del período de pruebas.
- No se optimiza para otros visores que no sean Quest 3 / 3S.
- No se construye ningún sistema de autenticación real para el panel del
  observador (ver "Seguridad del panel" en Riesgos).

## Anti-objetivos (que arruinarían la prueba aunque "funcione")

- Que un panel o texto tape el centro de la vista: el usuario tiene que
  poder seguir viendo a quien da la clase en todo momento.
- Que el texto sea tan chico o tan bajo contraste que no se pueda leer
  con luz ambiente variable (passthrough real).
- Que la demo se caiga o se trabe en pleno test con el usuario puesto el
  visor (prioridad: robustez del recorrido por sobre efectos visuales).
- Que el estado (tamaño de subtítulo, posición de imágenes) se pierda al
  volver de la pausa.

## Restricciones

- Tecnología: Three.js + WebXR nativo del navegador, sin frameworks de
  UI pesados. JavaScript simple, sin paso de build obligatorio (para que
  publicar en GitHub Pages sea servir los archivos tal cual).
- Hosting: GitHub Pages (solo archivos estáticos, sin servidor propio).
- Comunicación panel ↔ visor: **Firebase Realtime Database**, en el
  plan gratuito. Decisión ya conversada y acordada con el dueño del
  proyecto, explicada como la opción más confiable para no tener
  sorpresas el día de la prueba (alternativas descartadas: un servicio
  de WebSockets de terceros tipo Ably, y WebRTC peer-to-peer tipo
  PeerJS).
- Sin acceso al Quest esta semana (el dueño del proyecto no lo tiene a
  mano): todo el desarrollo se valida primero en el modo de vista previa
  de escritorio, y se confirma en el visor cuando esté disponible.
- Idioma de interfaz y comentarios de código: español.
- Los textos de cada pantalla deben salir **tal cual** del guion (ver
  "Textos literales del guion" más abajo).

## Recorrido y textos literales del guion

(fuente: `docs/reference/guion.pdf`, sección "RECORRIDO TEST USABILIDAD")

1. **Reconocimiento facial** (simulado): *"Mirá al frente para
   identificarte"*.
2. **Bienvenida**: *"Hola, Sofía · Historia · La clase está por
   empezar"*. Debajo, el perfil: *"Aprendés mejor con imágenes"*.
3. **Menú de ayuda**, tres opciones: subtítulos (con ajuste de tamaño),
   imágenes, mapa conceptual.
4. **Subtítulos**: arrancan en un tamaño chico a propósito; el usuario
   tiene que poder agrandarlos. El contenido es un guion de tiempos
   sobre la caída del Imperio romano (texto a redactar, ver "Contenido
   de la clase" más abajo).
5. **Imágenes**: se pueden mover, agrandar y acomodar libremente en el
   espacio. Hay una opción "ver más imágenes".
6. **Aviso de atención**: *"Notamos que tus niveles de atención
   disminuyeron. ¿Querés ayuda?"*. Se acepta con el botón del lente
   (gatillo o pellizco).
7. **Pausa activa**: *"Pausa iniciada. Podés sacarte los lentes. Lo que
   explique la profesora se guarda en 'Temas pendientes'"*, más un
   contador de tiempo visible.
8. **Vuelta de la pausa**: *"Bienvenida de vuelta · Estuviste 6 min en
   pausa · Se guardaron 2 temas"*. Opciones: *"Seguir con la clase"* /
   *"Ver un resumen rápido"*.
9. **Resumen rápido**, con opción de volver a la clase.

Importante: al volver de la pausa, el tamaño de subtítulo y la
disposición de las imágenes que el usuario dejó antes de pausar se
mantienen igual.

### Persistencia de la configuración del usuario (decisión del builder)

La página del visor no se recarga en ningún momento del recorrido: es
una sola sesión WebXR corriendo de punta a punta mientras dura el test.
Por eso el tamaño de subtítulo y la posición de las imágenes se
guardan simplemente en memoria (variables de la app), no hace falta
sincronizarlos por Firebase ni usar `localStorage`. El botón "reiniciar
todo" del panel limpia esa memoria para que el próximo participante
empiece de cero (el guion original dice "[Duplicar antes de usar]",
o sea que se espera repetir el test con varias personas).

### Contador de la pausa (decisión del builder)

Son dos cosas distintas:

- Durante la **pausa activa** (pantalla 7), un contador en vivo cuenta
  los minutos transcurridos desde que arrancó la pausa.
- En la **vuelta de la pausa** (pantalla 8), el texto "Estuviste X min
  en pausa" se precarga con ese valor real, pero el observador puede
  **sobreescribirlo** desde el panel antes de confirmar la vuelta (tal
  como pedía la consigna original: "ajustar el tiempo que se muestra en
  la vuelta"). Esto le da margen al observador para igualar el ejemplo
  del guion ("Estuviste 6 min") sin depender de cronometrar la pausa al
  segundo exacto.

## Interacción

- Un único mecanismo de "selección" cubre mano (pellizco, `select` /
  `selectstart` de la WebXR Input Source con `targetRayMode: 'tracked-pointer'`
  o hand-tracking) y controles (gatillo), usando los eventos de sesión
  WebXR estándar (`XRSession.select` / `selectstart` / `selectend`), no
  dos sistemas de input paralelos.
- El "botón del lente" (para aceptar el aviso de atención) se mapea al
  mismo evento de selección: gatillo o pellizco, lo que el usuario tenga
  disponible.
- Los paneles e imágenes son objetos 3D posicionados a una distancia
  cómoda de lectura, nunca cubriendo el centro del campo visual.

## Comunicación panel observador ↔ visor (Firebase)

- El panel (HTML simple, abrible desde cualquier navegador — celu o
  compu) escribe el estado deseado en un nodo de Firebase Realtime
  Database (ej. pantalla actual, flags de "mostrar aviso", "pausa
  activa/terminada", tiempo configurado para la vuelta).
- El visor escucha ese mismo nodo y reacciona a los cambios.
- El plan gratuito de Firebase alcanza de sobra para una sesión de
  prueba de usabilidad (pocas lecturas/escrituras, un solo visor
  conectado a la vez).
- El botón de "reiniciar todo" del panel resetea el nodo de Firebase a
  su estado inicial.
- Seguridad del panel: queda **fuera de alcance** blindar esto con
  autenticación real — es un prototipo de uso interno, de corta vida,
  para un test controlado. Las reglas de Firebase se configuran para
  permitir lectura/escritura simple en ese nodo (no datos sensibles
  reales de ninguna persona).
- Proyecto de Firebase: lo crea el dueño del proyecto siguiendo una
  guía paso a paso (cuenta de Google, Realtime Database en modo de
  prueba); el builder recibe el `firebaseConfig` una vez creado.
- Reconexión ante corte: si se cae la sesión WebXR o la conexión a
  Firebase durante el test, **no se implementa reconexión automática**
  (fuera de alcance para el plazo). El camino simple es que el
  observador reinicie con el botón "reiniciar todo" y el usuario
  vuelva a entrar a la sesión WebXR. Decisión del builder, priorizando
  tiempo de desarrollo sobre robustez ante fallos de red poco
  probables en una sala de test.

## Contenido de la clase (caída del Imperio romano)

A cargo del builder, sin necesitar más info del dueño del proyecto (así
lo pidió explícitamente):

- **Imágenes**: buscar en Wikimedia Commons imágenes de dominio público
  o Creative Commons sobre la caída del Imperio romano (mapas, pinturas
  históricas, ilustraciones). Descargarlas al repo (no enlazarlas en
  línea). Documentar autor y licencia de cada una en `CREDITS.md`.
- **Guion de subtítulos con tiempos**: texto redactado con información
  histórica general y creíble (no hace falta rigor académico extremo,
  la prueba no evalúa precisión histórica sino la interfaz).
- **Mapa conceptual**: simple, con los puntos principales de la caída
  del Imperio romano (causas, hitos, consecuencias), legible a tamaño
  VR.
- **Resumen rápido** y **"temas pendientes"**: texto corto coherente
  con el guion de subtítulos, para la pantalla de resumen y para el
  conteo de "2 temas" que menciona el guion.

## Diseño visual

Según el moodboard compartido por el dueño del proyecto. Palabras clave:
**cálido, atento, expuesto**.

- Luz ámbar / naranja sobre fondos oscuros semitransparentes.
- Brillos suaves, grano sutil, tipografía limpia y minimalista con aire
  de interfaz de visor (HUD).
- Los paneles nunca tapan el centro de la vista (el usuario debe seguir
  viendo a la profesora real a través del passthrough).
- Texto y botones en tamaño cómodo de lectura en VR, contraste alto
  sobre el mundo real.
- Nombres de color, tamaños y espaciados concretos quedan a criterio del
  builder (usar la skill de diseño frontend disponible), siempre dentro
  de esas palabras clave.

## Etapas de construcción (una por commit, probable en la compu primero)

1. **Escena base en passthrough** con un panel de subtítulos que se
   puede mover (prueba mínima de WebXR + Three.js + passthrough
   andando).
2. **Menú de ayuda e imágenes movibles** (subtítulos con ajuste de
   tamaño, imágenes con "ver más", mapa conceptual).
3. **Aviso de atención, pausa activa y vuelta**, incluyendo que se
   conserve la configuración del usuario.
4. **Panel del observador**, conectado por Firebase: botones para ir a
   cada pantalla, disparar el aviso, iniciar/terminar pausa, ajustar el
   tiempo mostrado en la vuelta, reiniciar todo.
5. **Pulido visual** según el moodboard (luz ámbar, grano, tipografía,
   brillos).

Cada etapa debe poder revisarse en el **modo de vista previa de
escritorio con mouse** (sin Quest). El dueño del proyecto indicará, en
cada etapa, qué mirar específicamente cuando tenga el Quest a mano.

## Qué queda a criterio del builder

- Estructura exacta de archivos y módulos de Three.js.
- Esquema exacto de datos en Firebase (nombres de nodos/claves).
- Redacción exacta del guion de subtítulos, resumen y temas pendientes.
- Selección final de imágenes de Wikimedia Commons.
- Contenido y layout exacto del mapa conceptual.
- Valores concretos de color, tipografía, espaciado y animaciones
  (dentro de las palabras clave cálido / atento / expuesto).
- Cómo implementar el modo de vista previa de escritorio (ej. cámara
  orbital con mouse simulando la vista del usuario).
- Nombre de las ramas/commits de git (debe haber un commit por etapa,
  mensajes claros).
