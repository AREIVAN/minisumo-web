# Base reglamentaria Mini Sumo

## Perfil base del MVP

El simulador usará un perfil reglamentario explícito, en lugar de esconder las medidas en la escena:

| Parámetro                                                  | Valor base |
| ---------------------------------------------------------- | ---------: |
| Diámetro exterior del dohyo, incluida la tawara            |      77 cm |
| Radio exterior                                             |    0,385 m |
| Ancho de la línea blanca                                   |     2,5 cm |
| Radio del área negra, si la tawara ocupa el borde exterior |     0,36 m |
| Robot: ancho y profundidad máximos                         | 10 × 10 cm |
| Peso máximo de competencia                                 |      500 g |
| Duración de ronda de referencia                            |      3 min |

La línea blanca cuenta como área válida. La salida se detectará cuando cualquier parte relevante de la huella del robot toque el exterior del radio de 0,385 m, no solamente cuando el centro del robot lo cruce.

## Lo que varía entre torneos

No existe un único reglamento universal idéntico en todos los torneos. El diámetro de 77 cm es consistente, pero la altura del dohyo, el área exterior, el sistema de inicio y algunos criterios de homologación pueden cambiar.

- All Japan Robot-Sumo especifica 2,5 cm de altura, líneas de inicio de 10 × 1 cm a 5 cm del centro y un área exterior cuadrada de 180 cm.
- Robotex/Baltic permite una altura de 1–5 cm y define un área exterior mínima de 100 cm de diámetro.
- Los reglamentos consultados coinciden en el límite de 10 × 10 cm, 500 g y la línea blanca de 2,5 cm.

Por eso `DohyoSpec` debe ser configurable, aunque el MVP solo exponga el perfil base.

## Modo práctica vs. competencia

El usuario podrá controlar el robot manualmente en el MVP. Eso sirve para:

- probar tracción y giro;
- comparar velocidades y aceleración;
- estudiar cuánto margen queda hasta la tawara;
- validar una geometría o un modelo visual;
- preparar luego el comportamiento autónomo.

No debe etiquetarse como “combate oficial”: los reglamentos competitivos exigen autonomía durante la ronda.

## Fuentes consultadas

- [All Japan Robot-Sumo Tournament — reglas](https://www.fsi.co.jp/sumo/rule/index.html)
- [Robotex — Mini Sumo Rules](https://www.robotex.org.cy/assets/files/New%20Regulations/ROB%20CY-Mini%20Sumo-Rules%28English%29.pdf)
- [MEB — Mini Sumo 2026](https://robot.meb.gov.tr/categories/mini-sumo-2026)
- [RoboChallenge — Mini Sumo regulations](https://robochallenge.ro/regulation/mini-sumo)
