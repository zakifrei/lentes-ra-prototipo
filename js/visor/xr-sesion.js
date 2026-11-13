// Arranca la sesión WebXR de realidad aumentada (passthrough del Quest).
// Crea un botón "Entrar a RA" que sólo se muestra si el navegador soporta
// una sesión 'immersive-ar'; si no hay soporte el botón queda oculto para
// siempre y js/visor/main.js usa la vista previa de escritorio en su lugar.

export function iniciarBotonXR(renderizador, escena, camara) {
  const boton = document.createElement('button');
  boton.id = 'boton-entrar-ra';
  boton.className = 'boton-flotante';
  boton.textContent = 'Entrar a RA';
  boton.hidden = true;

  // El renderizador necesita saber que va a presentar contenido en WebXR
  // para usar la cámara y la matriz de proyección del dispositivo en vez
  // de las de `camara` durante la sesión.
  renderizador.xr.enabled = true;

  if (navigator.xr) {
    navigator.xr
      .isSessionSupported('immersive-ar')
      .then((soportado) => {
        boton.hidden = !soportado;
      })
      .catch(() => {
        boton.hidden = true;
      });
  }

  boton.addEventListener('click', async () => {
    // Se declara aquí (y no con `const` dentro del try) para que el bloque
    // catch pueda acceder a la sesión cruda si ya se llegó a crear.
    let sesion;
    try {
      sesion = await navigator.xr.requestSession('immersive-ar', {
        // 'local-floor' hay que pedirlo explícitamente: WebXRManager de
        // Three.js (vendor/three/three.module.js) usa ese espacio de
        // referencia por defecto dentro de setSession(), y
        // session.requestReferenceSpace('local-floor') sólo puede
        // resolverse si 'local-floor' se declaró como feature (requerida
        // u opcional) al pedir la sesión. Si no se declara, setSession()
        // rechaza su promesa aunque la sesión en sí ya esté activa.
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking'],
      });

      // En el Quest, una sesión 'immersive-ar' entrega automáticamente
      // environmentBlendMode 'alpha-blend': el passthrough (cámara a color
      // del casco) queda detrás de lo que dibuja Three.js, por lo que el
      // canvas necesita fondo transparente (ya configurado en main.js).
      sesion.addEventListener('end', () => {
        boton.hidden = false;
      });

      await renderizador.xr.setSession(sesion);
      boton.hidden = true;
    } catch (error) {
      console.error('No se pudo iniciar la sesión de RA:', error);

      // Si requestSession() ya había creado la sesión cruda pero
      // renderizador.xr.setSession() falló después (por ejemplo, porque no
      // pudo negociar el espacio de referencia), la sesión queda activa en
      // el casco sin que nada la esté dibujando: la persona se queda
      // viendo una pantalla negra, sin forma de volver por su cuenta
      // (no hay nada en pantalla con qué interactuar). Hay que cerrar esa
      // sesión explícitamente para que el casco vuelva a la vista 2D
      // normal, donde el botón "Entrar a RA" vuelve a estar disponible.
      if (sesion) {
        try {
          await sesion.end();
        } catch (errorAlCerrar) {
          console.error(
            'No se pudo cerrar la sesión de RA tras el error anterior:',
            errorAlCerrar,
          );
        }
      }

      boton.hidden = false;
    }
  });

  return boton;
}
