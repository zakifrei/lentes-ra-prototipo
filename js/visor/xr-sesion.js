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
    try {
      const sesion = await navigator.xr.requestSession('immersive-ar', {
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
    }
  });

  return boton;
}
