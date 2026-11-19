// Spike de validación (Tarea 0 del plan de migración a @pmndrs/uikit, ver
// docs/superpowers/plans/2026-11-19-migracion-uikit.md): sólo confirma que
// el import map + esm.sh cargan un componente real de uikit y lo renderizan
// en un navegador servido por `python3 -m http.server`, sin bundler. Se
// borra en la Tarea 7 si el resto de la migración sale bien.
//
// Hallazgo vs. el plan (confirmado leyendo dist/*.d.ts y el SKILL.md que el
// propio paquete trae en skills/pmndrs-uikit/SKILL.md): uikit vanilla no
// tiene una clase `Root` -- "la raíz" es simplemente un `Container` (u otro
// componente) agregado directo a la escena (ningún ancestro uikit). Ese
// objeto raíz es el que necesita `.update(deltaMs)` cada cuadro.

import { Container, Text } from '@pmndrs/uikit';

export function crearSpikeUikit() {
  const raiz = new Container({
    padding: 16,
    backgroundColor: 'black',
  });

  const texto = new Text({
    text: 'hola',
    color: 'white',
    fontSize: 32,
  });
  raiz.add(texto);

  raiz.position.set(0, 1.6, -1.8);

  return raiz;
}
