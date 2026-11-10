# Referencias para la física Mini Sumo

## Videos de referencia

- [A New Competition! Trying Out Mini Robot Sumo (500g Class)](https://www.youtube.com/watch?v=-lWEpAYUO4I) — categoría de 500 g del All Japan Robot Sumo Tournament.
- [All Japan Robot-Sumo Tournament — clase 500 g, 2024](https://www.youtube.com/watch?v=zv3lKU5DDqs) — el propio título indica formato RC; sirve para observar contactos y desplazamientos, no para copiar la estrategia autónoma.
- [RoboChallenge Romania 2025 — Mini Sumo y Micro Sumo](https://www.youtube.com/watch?v=YsEEufcqZwQ) — video de combates de las dos categorías.

## Qué sí se puede inferir

La clase Mini Sumo usa robots de 10 × 10 cm y hasta 500 g sobre un dohyo de 77 cm, aunque cada torneo puede matizar sus reglas. [Robotex International](https://robotex.international/mini-sumo/)

El contacto depende de más que la masa: el diseño real combina una pala frontal baja, motores y ruedas con neumáticos de alta adherencia y un centro de masa bajo. Una guía de construcción recomienda comprobar el empuje contra una báscula y grabar los combates en cámara lenta para evaluar las ruedas y las colisiones. [GRA — Mini Sumo Robot Build](https://gra.ge/blogs/45)

Un video sirve como referencia cualitativa, pero no permite deducir por sí solo una velocidad, coeficiente de fricción o aceleración exactos. Para calibrarlos habría que normalizar la escala con el diámetro conocido del dohyo y medir trayectorias en varios cuadros; también hay que separar Mini Sumo de categorías más pesadas.

## Modelo aplicado en el simulador

- La geometría de contacto convexa incluye la cuña y la pala frontal visibles, ambas dentro de la huella máxima de 10 × 10 cm.
- Las ruedas y sus cubos visuales también permanecen dentro de esa huella; el detector de salida usa el mismo rectángulo legal conservador.
- Los robots empiezan enfrentados con el borde frontal alineado a las marcas oficiales de inicio, a 5 cm del centro.
- La tracción se aplica en los puntos de contacto de las ruedas y solo cuando cada rueda apoya sobre el dohyo.
- La fuerza de cada rueda está limitada por una aproximación de adherencia basada en su carga normal.
- El rival usa el mismo modelo mecánico, con velocidad máxima reducida a la mitad.

El modelo de tracción e inercia sigue siendo aproximado: no hay una ficha del motor ni mediciones del material de las ruedas/suelo para calibrar torque, deslizamiento o fricción. Los videos sirven para validar trayectorias y maniobras, no para asignar esos coeficientes a ojo.

El paso siguiente para acercarse a un robot real es comparar trayectorias y respuesta al choque con un video medible de Mini Sumo 500 g, no seguir ajustando parámetros a ojo.
