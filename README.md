# Mini Sumo Arena

Simulador web de combate Mini Sumo. Conducí un robot de 10 cm contra un rival automático dentro de un dohyo circular, con física en unidades reales y puntaje por salida completa del dohyo.

> **Estado:** prototipo 1v1 manual contra una IA de persecución básica. La IA y el modelo de tracción todavía necesitan calibración.

> https://minisumo.areivan.com/
> imagen de referencia:
<img width="1470" height="876" alt="image" src="https://github.com/user-attachments/assets/9d4701ac-20d3-4780-a8fe-85492e56315d" />

## Qué incluye

- Escena 3D procedural, sin modelos externos, construida con Three.js.
- Dohyo circular de 77 cm de diámetro con tawara visible de 2,5 cm.
- Física Rapier en metros y kilogramos, con paso fijo de 1/120 s.
- Rival elegible para la práctica: un robot Mini Sumo controlado por una IA básica o un cilindro físico empujable; se selecciona antes de iniciar o entre rondas.
- En modo 1v1, el rival automático se limita a la mitad de la velocidad máxima del jugador.
- Puntaje por rondas: si el rival sale completamente, sumás un punto; si salís vos, suma el rival.
- Detección geométrica de salida que espera a que toda la huella rectangular del robot quede fuera del radio exterior, incluso con rotación.
- Cámaras isométrica y superior.
- HUD de combate con marcador, tiempo, velocidad, pausa, reinicio y controles.
- Remapeo persistente de las cuatro teclas de movimiento desde el panel de controles.
- Posiciones iniciales opuestas cerca del borde interior, con ambos robots orientados hacia el centro.
- Marcador persistente entre rondas; reiniciar la partida pone el marcador en cero.
- Núcleo de dominio desacoplado del DOM y de los adaptadores gráficos/físicos.

## Requisitos

- Node.js 24 LTS — la versión esperada está definida en [`.nvmrc`](.nvmrc).
- npm incluido con Node.js.
- Un navegador moderno con soporte para WebGL.

## Inicio rápido

```bash
npm install
npm run dev
```

Abrí [http://localhost:4173](http://localhost:4173) y elegí **Iniciar combate**.

Para validar el proyecto sin generar un build:

```bash
npm run check
```

Este comando ejecuta el chequeo de TypeScript, ESLint y la suite de tests de Vitest.

## Controles

| Acción               | Tecla predeterminada |
| -------------------- | -------------------- |
| Avanzar              | `W`                  |
| Retroceder           | `S`                  |
| Girar a la izquierda | `A`                  |
| Girar a la derecha   | `D`                  |
| Reiniciar posición   | `R`                  |
| Pausar o reanudar    | `Esc`                |
| Cambiar cámara       | Botón en pantalla    |

En **Remapear teclas** podés asignar otras teclas a las cuatro acciones de movimiento. `R` y `Esc` se mantienen fijas para evitar conflictos con reset y pausa.

La tawara **no funciona como una pared invisible**. Los robots pueden abandonar físicamente la superficie y la ronda termina solo cuando la huella completa de uno queda fuera del radio exterior. Si ambos salen en el mismo paso físico, ambos suman un punto.

## Modelo de simulación

El proyecto separa las responsabilidades en capas pequeñas:

```text
UI / HUD / menús
        ↓ eventos y snapshots
Aplicación / sesión de práctica
        ↓ comandos
Dominio Mini Sumo (reglas puras)
        ↓ adaptadores
Simulación Rapier ←→ Render Three.js
```

Algunas decisiones importantes del MVP:

- El dominio contiene las reglas comprobables: dimensiones, marcador, estados de ronda, comandos y límites del dohyo.
- Rapier modela la superficie y el cuerpo del robot, pero no agrega un muro perimetral que falsee el comportamiento del borde.
- Rapier modela ambos robots como cuerpos dinámicos independientes, con colisión robot-robot.
- La forma física de contacto incluye la cuña y la pala frontal; la tracción se aplica en los puntos de contacto de las ruedas solo cuando apoyan en el dohyo.
- La IA rival calcula una persecución directa hacia el jugador en cada paso físico fijo.
- El loop usa pasos físicos fijos para que el resultado no dependa directamente del framerate.
- Three.js recibe snapshots físicos y se ocupa únicamente de la representación visual.
- La entrada de teclado se normaliza antes de llegar a la aplicación.

La explicación completa está en [`docs/architecture.md`](docs/architecture.md). Las referencias de competencias y física están en [`docs/physics-reference.md`](docs/physics-reference.md).

## Scripts disponibles

| Comando                | Propósito                                           |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Inicia el servidor de desarrollo en el puerto 4173. |
| `npm run typecheck`    | Verifica el proyecto TypeScript.                    |
| `npm run lint`         | Ejecuta ESLint.                                     |
| `npm test -- --run`    | Ejecuta los tests una vez.                          |
| `npm run check`        | Ejecuta typecheck, lint y tests.                    |
| `npm run format`       | Formatea los archivos con Prettier.                 |
| `npm run format:check` | Comprueba el formato sin modificar archivos.        |

## Estructura principal

```text
src/
  app/          Orquestación de la sesión de práctica
  domain/       Reglas puras de dohyo, robots, puntaje y estados
  simulation/   Entrada, física Rapier y render Three.js
  ui/           HUD, menús y telemetría
tests/
  domain/       Pruebas de reglas y transiciones
  simulation/   Pruebas de input, física y tiempo fijo
docs/
  architecture.md
  development-plan.md
  minisumo-rules.md
  physics-reference.md
```

## Alcance y roadmap

La prioridad del proyecto es que la conducción y el comportamiento del borde sean correctos antes de sumar complejidad de producto. El plan detallado se encuentra en [`docs/development-plan.md`](docs/development-plan.md).

Próximas líneas de trabajo:

1. Perfiles de robot con dimensiones, masa y parámetros de conducción configurables.
2. Sensores virtuales de línea y de oponente.
3. Modo autónomo con controladores y máquina de estados desacoplados de la UI.
4. Calibración contra mediciones de robots reales, replay y pruebas E2E.
5. Accesibilidad, controles táctiles, CI y publicación estática.

Quedan fuera del MVP el multiplayer, las cuentas, el ranking, el daño, el editor 3D y la integración directa con hardware.

## Contribuir

Antes de abrir un cambio, ejecutá `npm run check` y mantené las reglas del dominio independientes del navegador. Las decisiones de arquitectura y el criterio físico del simulador están documentados para que cada nueva capacidad pueda probarse sin convertir la UI en el centro de la lógica.

## Contexto reglamentario

Las dimensiones iniciales del dohyo y del robot están documentadas en [`docs/minisumo-rules.md`](docs/minisumo-rules.md). El simulador sirve como herramienta de práctica y exploración técnica; no reemplaza el reglamento oficial de un torneo ni una validación sobre hardware real.
