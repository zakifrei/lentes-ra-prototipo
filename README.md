# Lentes RA - Prototipo

Prototipo de realidad aumentada con WebXR para una prueba de usabilidad
universitaria (Meta Quest 3 / 3S, passthrough). Construido con Three.js y
módulos ES nativos del navegador, sin paso de build: todo se sirve como
archivos estáticos.

## Desarrollo

El proyecto no requiere `npm install` ni ningún bundler: `vendor/three/`
contiene los builds de Three.js ya vendorizados.

### Servir el proyecto localmente

Desde la raíz del proyecto:

```bash
python3 -m http.server 8000
```

Luego abrir `http://localhost:8000` en el navegador.

Para probar el modo RA es necesario acceder por HTTPS desde el navegador del
Meta Quest (WebXR exige un contexto seguro), por lo que `python3 -m http.server`
sólo sirve para verificar la escena base en una computadora de escritorio.

### Correr los tests

Los módulos puros (sin DOM ni WebGL) se prueban con el runner de tests nativo
de Node (≥18). En versiones recientes de Node, `node --test` no expande un
directorio como glob por sí solo, así que conviene pasarle los archivos
explícitamente:

```bash
node --test test/*.test.mjs
```

## Estructura

- `index.html` — punto de entrada, contiene el `<canvas id="escena">`.
- `js/` — código fuente de la aplicación (módulos ES).
- `vendor/three/` — Three.js vendorizado (sin dependencias npm publicadas). Incluye
  `three.module.js`, `three.core.js` (del que depende el anterior) y el addon
  `OrbitControls.js`.
- `test/` — tests ejecutados con `node --test`.

## Instrucciones para el día de la prueba

### URLs

- Visor (lo que se abre en el Quest): `https://zakifrei.github.io/lentes-ra-prototipo/`
- Panel del observador (lo que se abre en el celular): `https://zakifrei.github.io/lentes-ra-prototipo/panel.html`

**Conviene abrir la URL del visor en el Quest por mail o mensaje (no
tipeándola a mano).** Es un bug ya resuelto de este proyecto: el teclado
virtual del navegador del Quest autocorrige los guiones (`-`) a guiones
largos al tipear, lo que rompe la URL. Mandarse el link por mail/chat al
propio usuario y abrirlo desde ahí evita el problema.

### Entrar a la sesión de RA en el Quest

1. Abrir la URL del visor (idealmente desde un link, no tipeada).
2. Tocar el botón **"Entrar a RA"**.
3. Aceptar los permisos de passthrough/cámara que pida el navegador.

### Orden sugerido de botones del panel (para seguir el guion completo)

1. **Reconocimiento**
2. **Bienvenida**
3. **Menú**
4. **Subtítulos** / **Imágenes** / **Mapa conceptual** (en el orden que
   prefiera el observador)
5. **Disparar aviso**
6. *(el usuario, desde dentro del casco, elige "Sí, pausar" o "Seguir sin
   pausar")*
7. Si el usuario aceptó la pausa: **Iniciar pausa**
8. **Terminar pausa**
9. *(el usuario, desde dentro del casco, elige "Seguir con la clase" o
   "Ver un resumen rápido")*
10. **Clase finalizada** (al terminar, para avisarle al usuario que ya
    puede sacarse los lentes -- a diferencia del resto de los botones, éste
    es exclusivo del observador: el usuario no tiene forma de llegar solo a
    esta pantalla desde dentro del casco)
11. **Reiniciar todo** (entre cada participante de la prueba)

### Dónde abrir el panel

El panel (`panel.html`) se abre normalmente desde un celular, en la misma
red o con datos móviles — no es necesario que esté en la misma wifi que el
Quest, porque Firebase es la conexión real entre ambos.

### Navegación directa desde el casco

En casi todas las pantallas hay un botón de menú flotante (arriba a la
derecha) con el que el propio usuario puede navegar sin depender 100% del
panel del observador. No aparece en las pantallas de "aviso", "pausa" ni
"finalizada" a propósito: en las dos primeras, para no interrumpir esos
momentos que el observador controla; en "finalizada", porque la clase ya
terminó y esa pantalla no tiene nada para navegar.

### Repaso visual pendiente

El repaso visual de cada pantalla **en el Quest real** queda pendiente: el
dueño del proyecto tiene acceso al casco físico para hacerlo. Lo que sí se
verificó para este task es que los textos literales exigidos por el guion
coinciden carácter por carácter en el código (ver `task-20-report.md` en
`.superpowers/sdd/2026-11-13-lentes-ra-prototipo/` para el detalle).
