# Arquitectura técnica

## Objetivo

Construir una simulación 3D pequeña, determinista y comprobable. La UI no debe conocer detalles de Rapier y la física no debe depender de elementos del DOM.

## Capas

```text
UI / HUD / menús
        ↓ eventos y snapshots
Aplicación / sesión de práctica
        ↓ comandos
Dominio Mini Sumo (reglas puras)
        ↓ adaptadores
Simulación Rapier ←→ Render Three.js
```

### Dominio

Responsable de reglas que se puedan probar sin navegador:

- `DohyoSpec`: diámetro de 77 cm, tawara de 2,5 cm, altura de 2,5 cm y radios derivados.
- `RobotSpec`: dimensiones, masa, rueda, separación, centro de masa y límites.
- `PushableObjectSpec`: dimensiones y masa del objetivo cilíndrico de práctica.
- `PracticeSession`: estado de la sesión, pausa, reinicio y resultado de salida.
- `BoundaryDetector`: prueba de la huella del robot contra el radio reglamentario.
- `DriveCommand`: acelerador, dirección y botón de reset.

### Simulación

Adaptador aislado para Rapier:

- mundo físico en metros y kilogramos;
- paso fijo de 1/120 s, independiente del framerate;
- cuerpo dinámico para el robot;
- cuerpo dinámico independiente para el objetivo, con colisión y masa configurables;
- colisiones de ruedas, chasis y dohyo;
- CCD cuando corresponda para evitar atravesar el borde a alta velocidad;
- estado físico exportado a la capa de render como snapshot.
- convención de orientación: el frente visual y lógico del robot es el eje local `-Z`; por eso `throttle +1` avanza hacia `-Z` y `steering +1` (derecha) produce yaw físico negativo.
- la pose inicial de práctica se calcula cerca del borde interior, con el robot mirando hacia el centro y un margen de seguridad para mantener toda la huella dentro del dohyo.
- el objetivo se calcula en el centro del área negra y su pose forma parte del snapshot; `reset` y `halt` afectan ambos cuerpos.

El dohyo no debe ser un cilindro con una pared vertical: eso convertiría el borde en una barrera y no en una salida. Se debe usar una superficie circular sin muro físico o una malla de contacto equivalente, más detección explícita del borde.

### Render

Three.js se ocupará solamente de:

- cámara y luces;
- dohyo, tawara, líneas y área exterior;
- modelo del robot;
- objetivo cilíndrico empujable;
- transformación visual del snapshot físico;
- indicadores de salida y estado.

La primera geometría del robot será procedural y low-poly. El soporte GLB se agrega después, cuando la física ya sea estable.

### Entrada

Primera implementación:

- `W/S`: avance y reversa.
- `A/D`: giro diferencial.
- `R`: reiniciar posición.
- Escape: abrir/cerrar controles.

Gamepad y touch quedan detrás de la misma interfaz `InputSource`, sin contaminar el dominio.

## Estructura objetivo

```text
src/
  main.ts
  app/
    practice-session.ts
  domain/
    arena/
      dohyo-spec.ts
      boundary-detector.ts
      pushable-object.ts
    robot/
      robot-spec.ts
      robot-profile.ts
    session/
      practice-state.ts
  simulation/
    physics/
      rapier-world.ts
      robot-body.ts
    render/
      three-scene.ts
      dohyo-mesh.ts
      robot-mesh.ts
      pushable-object-mesh.ts
    input/
      input-source.ts
      keyboard-input.ts
  ui/
    practice-hud.ts
    settings-panel.ts
  styles/
    tokens.css
    global.css
tests/
  domain/
  simulation/
```

## Loop de ejecución

1. Capturar input sin mutar directamente el DOM.
2. Acumular tiempo real.
3. Ejecutar uno o más pasos físicos fijos.
4. Evaluar límites y estado de sesión.
5. Interpolar transformaciones para render.
6. Renderizar HUD y escena.

El juego nunca debe usar `deltaTime` variable directamente para decidir una salida o aplicar una fuerza que afecte el resultado.

## Criterios físicos del MVP

- El robot puede desplazarse y girar con control manual.
- La tawara no funciona como pared.
- La huella completa del robot se evalúa contra el radio exterior.
- El contacto con la línea blanca sigue siendo válido.
- El robot puede contactar y desplazar el objetivo cilíndrico sin una animación visual separada de la física.
- Una salida genera estado visible, detiene el robot y permite reiniciar.
- El resultado es consistente con distintos framerates.

## Testing

### Unitario

- radios y conversiones de centímetros a metros;
- robot dentro, sobre y fuera de la tawara;
- huellas cuadradas y rotadas;
- reinicio y transiciones de sesión;
- normalización de input.

### Integración

- Rapier crea correctamente el dohyo y el robot;
- el robot no atraviesa la superficie;
- el paso fijo mantiene estabilidad básica.

### E2E posterior

- iniciar práctica;
- mover el robot;
- salir por el borde;
- reiniciar;
- cambiar de cámara y abrir controles.

No se usarán snapshots visuales como única garantía de física.
