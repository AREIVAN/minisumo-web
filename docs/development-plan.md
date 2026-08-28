# Plan de desarrollo

## Resultado esperado

Una web de práctica Mini Sumo, inspirada en la claridad de Arena Tapout pero construida sobre un dohyo circular reglamentario y una física adecuada para robots de hasta 10 × 10 cm.

## Fase 0 — Base del proyecto

**Estado:** completada.

- [x] Crear proyecto Vite + TypeScript.
- [x] Fijar Node 24, dependencias y scripts.
- [x] Agregar ESLint, Prettier y Vitest.
- [x] Documentar reglas, arquitectura y límites del MVP.
- [ ] Conectar el repositorio remoto de GitHub cuando exista su URL.

**Salida:** proyecto reproducible, documentado y con un vertical slice funcional.

## Fase 1 — Vertical slice visual

**Estado:** completada.

- [x] Crear renderer Three.js y resize correcto.
- [x] Mostrar dohyo circular completo.
- [x] Dibujar negro, tawara blanca, área exterior y marcas de inicio.
- [x] Agregar cámara isométrica y cámara superior.
- [x] Crear robot procedural de 10 × 10 cm.
- [x] Implementar HUD mínimo: práctica, estado y reset.

**Aceptación:** la escena carga sin depender de modelos externos y el dohyo ocupa correctamente la vista.

## Fase 2 — Núcleo físico

**Estado:** completada.

- [x] Inicializar Rapier una sola vez.
- [x] Implementar superficie circular sin pared perimetral.
- [x] Modelar chasis y ruedas con dimensiones explícitas.
- [x] Implementar tracción diferencial.
- [x] Usar unidades SI y paso fijo.
- [x] Agregar aceleración, velocidad máxima, fricción y giro.
- [x] Detectar salida por huella, caída o contacto exterior.

**Aceptación:** el robot puede manejarse y no puede “pegarse” a una pared invisible en el borde.

## Fase 3 — Controles y práctica

**Estado:** completada para el alcance del MVP manual.

- [x] Keyboard input con WASD.
- [x] Pausa y reinicio.
- [x] Controles en pantalla.
- [x] Indicador de velocidad y estado.
- [x] Mensaje claro de “robot fuera del dohyo”.
- [x] Modo libre manual con pausa, reinicio y salida.
- La ronda oficial de 3 minutos y `localStorage` quedan fuera del primer corte funcional.

**Aceptación:** una persona puede practicar sin leer documentación externa.

## Fase 4 — Perfil de robot

- Panel para dimensiones y peso.
- Distancia entre ruedas, radio de rueda y centro de masa.
- Velocidad máxima y aceleración.
- Fricción de rueda y deslizamiento.
- Presets versionados.
- Validación de límites reglamentarios.

**Aceptación:** cambiar el perfil modifica el comportamiento y los valores inválidos se rechazan antes de iniciar.

## Fase 5 — Sensores virtuales

- Sensores de línea con lectura de reflectancia.
- Sensores de oponente: distancia y ángulo.
- Telemetría visible en modo debug.
- API de lecturas estable para reutilizarla en autonomía.

**Aceptación:** los sensores producen lecturas deterministas y pueden grabarse para pruebas.

## Fase 6 — Modo autónomo

- Separar manual y autónomo como dos controladores.
- Máquina de estados: búsqueda, ataque, evasión del borde y recuperación.
- Ventana de inicio configurable según torneo.
- Parada de emergencia y estado READY/RUN/STOP.
- Reglas de match: rondas, puntos, tiempo y empate.

**Aceptación:** el mismo robot puede manejarse manualmente o ejecutar una estrategia sin acoplar la UI al algoritmo.

## Fase 7 — Calidad de simulación

- Comparar velocidad y giro contra mediciones del robot real.
- Calibrar fricción, aceleración y frenado.
- Registrar sesiones y repetir escenarios.
- Agregar replay básico.
- Medir rendimiento en desktop y móvil.
- Test E2E de flujos críticos.

**Aceptación:** dos ejecuciones con la misma configuración e input producen resultados equivalentes dentro de una tolerancia definida.

## Fase 8 — Producto y publicación

- Crear CI en GitHub Actions.
- Añadir validación de formato, tipos, lint y tests.
- Crear build de producción y deploy estático.
- Documentar versionado de perfiles/reglamentos.
- Agregar accesibilidad y controles táctiles.
- Recién después evaluar multiplayer, cuentas y ranking.

## Fuera del MVP

- Online multiplayer.
- Arena con armas o daño.
- Editor 3D completo.
- Catálogo de robots de terceros.
- IA competitiva avanzada.
- Integración directa con hardware.

La prioridad es que el comportamiento del borde y la conducción sean correctos. Agregar features antes de eso produciría una demo vistosa pero poco útil para construir un minisumo real.
