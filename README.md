# Mini Sumo Arena

Simulador web de práctica para robots Mini Sumo. Conducí un robot de 10 cm dentro de un dohyo circular reglamentario y observá cómo responde una física basada en unidades reales, tracción diferencial y detección explícita del borde.

> **Estado:** MVP funcional de práctica manual. La competencia autónoma, los sensores virtuales y los perfiles configurables forman parte de las próximas fases.

## Qué incluye

- Escena 3D procedural, sin modelos externos, construida con Three.js.
- Dohyo circular de 77 cm de diámetro con tawara visible de 2,5 cm.
- Física Rapier en metros y kilogramos, con paso fijo de 1/120 s.
- Robot de práctica de 10 × 10 cm con tracción diferencial.
- Detección de salida basada en la huella completa del robot, incluso con rotación.
- Cámaras isométrica y superior.
- HUD de práctica con estado, tiempo, velocidad, pausa, reinicio y controles.
- Núcleo de dominio desacoplado del DOM y de los adaptadores gráficos/físicos.

## Requisitos

- Node.js 24 LTS — la versión esperada está definida en [`.nvmrc`](.nvmrc).
- npm incluido con Node.js.
- Un navegador moderno con soporte para WebGL.

## Inicio rápido

```bash
git clone <URL_DEL_REPOSITORIO>
cd minisumo-web
npm ci
npm run dev
```

Abrí [http://localhost:4173](http://localhost:4173) y elegí **Iniciar práctica**.

Para validar el proyecto sin generar un build:

```bash
npm run check
```

Este comando ejecuta el chequeo de TypeScript, ESLint y la suite de tests de Vitest.

## Controles

| Acción | Tecla |
| --- | --- |
| Avanzar | `W` |
| Retroceder | `S` |
| Girar a la izquierda | `A` |
| Girar a la derecha | `D` |
| Reiniciar posición | `R` |
| Pausar o reanudar | `Esc` |
| Cambiar cámara | Botón en pantalla |

La tawara **no funciona como una pared invisible**. El robot puede abandonar físicamente la superficie y la sesión pasa a estado de salida cuando una parte de su huella supera el radio reglamentario.

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

- El dominio contiene las reglas comprobables: dimensiones, estados de sesión, comandos y límites del dohyo.
- Rapier modela la superficie y el cuerpo del robot, pero no agrega un muro perimetral que falsee el comportamiento del borde.
- El loop usa pasos físicos fijos para que el resultado no dependa directamente del framerate.
- Three.js recibe snapshots físicos y se ocupa únicamente de la representación visual.
- La entrada de teclado se normaliza antes de llegar a la aplicación.

La explicación completa está en [`docs/architecture.md`](docs/architecture.md).

## Scripts disponibles

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 4173. |
| `npm run typecheck` | Verifica el proyecto TypeScript. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test -- --run` | Ejecuta los tests una vez. |
| `npm run check` | Ejecuta typecheck, lint y tests. |
| `npm run format` | Formatea los archivos con Prettier. |
| `npm run format:check` | Comprueba el formato sin modificar archivos. |

## Estructura principal

```text
src/
  app/          Orquestación de la sesión de práctica
  domain/       Reglas puras de dohyo, robot y estados
  simulation/   Entrada, física Rapier y render Three.js
  ui/           HUD, menús y telemetría
tests/
  domain/       Pruebas de reglas y transiciones
  simulation/   Pruebas de input, física y tiempo fijo
docs/
  architecture.md
  development-plan.md
  minisumo-rules.md
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
