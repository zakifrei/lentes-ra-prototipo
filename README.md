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
de Node (≥18):

```bash
node --test test/
```

## Estructura

- `index.html` — punto de entrada, contiene el `<canvas id="escena">`.
- `js/` — código fuente de la aplicación (módulos ES).
- `vendor/three/` — Three.js vendorizado (sin dependencias npm publicadas). Incluye
  `three.module.js`, `three.core.js` (del que depende el anterior) y el addon
  `OrbitControls.js`.
- `test/` — tests ejecutados con `node --test`.
