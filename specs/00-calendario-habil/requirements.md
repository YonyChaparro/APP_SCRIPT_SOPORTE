# 00 · Calendario hábil — Requisitos

## Problema

El sistema mide plazos en horas calendario y no distingue días hábiles. Los requisitos 2 (reloj hábil) y 3 (ventana del formulario) necesitan una misma respuesta a tres preguntas: *¿este día es hábil?*, *¿cuántas horas hábiles hay entre dos instantes?* y *¿cuándo abre y cierra la ventana?*. Este módulo las responde; no cambia nada visible por sí solo.

## Alcance

**Incluye:** pestaña `Festivos`, generador de festivos nacionales de Colombia, funciones de aritmética hábil, regla de ventana (como función pura), pruebas.
**Excluye:** modificar plazos, formularios o disparadores (eso es 01 y 02). Días no hábiles institucionales (vacaciones colectivas, jornadas UNAL): se pueden agregar a mano en la pestaña, pero el generador no los conoce.

## Requisitos

**CAL-01 · Pestaña `Festivos`.** El sistema debe mantener una pestaña `Festivos` con columnas `FECHA` (fecha, sin hora), `DESCRIPCIÓN`, `TIPO` (`NACIONAL` generado por el script, `MANUAL` agregado por una persona). Una fila por fecha no hábil. La pestaña es editable a mano: se pueden agregar, corregir o borrar filas.

**CAL-02 · Generación de festivos nacionales.** Cuando un usuario ejecute *Soporte → Generar festivos del año…* e indique un año, el sistema debe calcular los 18 festivos nacionales de Colombia de ese año (6 de fecha fija, 7 trasladados al lunes por la Ley 51 de 1983 "Emiliani", 5 relativos a la Pascua) y agregarlos a `Festivos` con `TIPO = NACIONAL`.

**CAL-03 · Idempotencia y anulación.** Si el año ya tiene filas `NACIONAL`, el generador no debe agregar nada y debe informarlo. Para anular un festivo basta borrar su fila; el generador no la vuelve a crear salvo que se borren todas las filas `NACIONAL` del año y se regenere.

**CAL-04 · Día hábil.** Una fecha es hábil si y solo si es de lunes a viernes y no figura en `Festivos`. Si la pestaña no existe o está vacía, el sistema debe considerar hábiles todos los días de lunes a viernes y registrar una advertencia en el log y en `probarCalendario`.

**CAL-05 · Aritmética de horas hábiles.** Un día hábil aporta 24 h (00:00–24:00); un día no hábil aporta 0 h. El sistema debe ofrecer:
- `horasHabilesEntre(a, b)`: horas hábiles del intervalo `[a, b)`; negativo si `b < a`.
- `sumarHorasHabiles(inicio, horas)`: primer instante `t ≥ inicio` tal que `horasHabilesEntre(inicio, t) = horas`.
- `siguienteDiaHabil(fecha)`: primera fecha hábil estrictamente posterior.

**CAL-06 · Regla de ventana.** La ventana del formulario está **abierta** en el instante `t` (fecha `D`) si y solo si `D` es hábil y no se cumple ninguna de: (a) el día anterior `D−1` no es hábil y `t < 08:00`; (b) el día siguiente `D+1` no es hábil y `t ≥ 15:30`. Consecuencias: abre a las 8:00 de todo día hábil precedido por uno no hábil; cierra a las 15:30 de todo día hábil seguido por uno no hábil; permanece abierta de noche entre dos días hábiles consecutivos. El sistema debe ofrecer `ventanaAbierta(t)`, `proximaApertura(t)` y `proximoCierre(t)`.

**CAL-07 · Zona horaria.** Todo cálculo se hace en `America/Bogota` (sin horario de verano), la zona del manifiesto.

**CAL-08 · Rendimiento.** La pestaña se lee una sola vez por ejecución (caché en memoria). Ninguna función de este módulo debe tardar más de 100 ms para intervalos de hasta un año.

**CAL-09 · Pruebas.** *Soporte → Probar calendario* debe ejecutar los criterios de aceptación de abajo contra los festivos de 2026 sin depender de la hora actual, y reportar el resultado en pantalla y en el log.

## Criterios de aceptación

**CA-CAL-02 · Festivos 2026.** Dado un `Festivos` sin filas de 2026, cuando se genera 2026, entonces quedan exactamente estas 18 fechas: 01-ene, 12-ene, 23-mar, 02-abr, 03-abr, 01-may, 18-may, 08-jun, 15-jun, 29-jun, 20-jul, 07-ago, 17-ago, 12-oct, 02-nov, 16-nov, 08-dic, 25-dic.

**CA-CAL-03 · Idempotencia.** Dado 2026 ya generado, cuando se vuelve a generar 2026, entonces no se agrega ninguna fila y el mensaje lo indica. Dado que se borró la fila del 16-nov-2026, cuando se consulta `esDiaHabil(2026-11-16)`, entonces es `true`.

**CA-CAL-04 · Día hábil.** `esDiaHabil`: 2026-10-12 (lunes, festivo) → false; 2026-10-13 (martes) → true; 2026-10-17 (sábado) → false; 2026-12-08 (martes, festivo) → false.

**CA-CAL-05 · Horas hábiles.**
| Desde | Hasta | Horas hábiles | Por qué |
|---|---|---|---|
| lun 2026-10-19 10:00 | mar 2026-10-20 10:00 | 24 | dos días hábiles consecutivos |
| vie 2026-10-16 10:00 | lun 2026-10-19 10:00 | 24 | 14 h del viernes + 0 sáb/dom + 10 h del lunes |
| jue 2026-10-08 14:00 | mar 2026-10-13 14:00 | 48 | 10 h jue + 24 h vie + 0 sáb/dom/lun festivo + 14 h mar |
| mié 2026-04-01 12:00 | lun 2026-04-06 12:00 | 24 | 12 h mié + 0 jue/vie santo + 0 sáb/dom + 12 h lun |
| sáb 2026-10-17 09:00 | dom 2026-10-18 21:00 | 0 | ningún día hábil |
| mar 2026-10-20 10:00 | lun 2026-10-19 10:00 | −24 | intervalo invertido |

`sumarHorasHabiles`: (vie 2026-10-16 10:00, 24) → lun 2026-10-19 10:00; (jue 2026-10-08 14:00, 48) → mar 2026-10-13 14:00; (sáb 2026-10-17 09:00, 1) → lun 2026-10-19 01:00; (mié 2026-04-01 12:00, 120 = `5 DIAS`) → vie 2026-04-10 12:00 (12 h mié 1 + 0 jue/vie santo + 0 sáb/dom + 24 h × lun 6, mar 7, mié 8, jue 9 + 12 h vie 10); (lun 2026-10-19 10:00, 0) → lun 2026-10-19 10:00.

**CA-CAL-06 · Ventana.**
| Instante | Abierta | Próxima apertura | Próximo cierre |
|---|---|---|---|
| lun 2026-10-19 07:59 | no | lun 19 08:00 | vie 23 15:30 |
| lun 2026-10-19 08:00 | sí | — | vie 23 15:30 |
| mar 2026-10-20 03:00 | sí (noche entre hábiles) | — | vie 23 15:30 |
| vie 2026-10-16 15:29 | sí | — | vie 16 15:30 |
| vie 2026-10-16 15:30 | no | lun 19 08:00 | — |
| vie 2026-10-09 16:00 | no | mar 13 08:00 (lun 12 festivo) | — |
| mié 2026-04-01 15:30 | no (jue 2 es festivo) | lun 6 08:00 | — |
| lun 2026-12-07 15:30 | no (mar 8 es festivo) | mié 9 08:00 | — |
| mié 2026-12-09 07:00 | no | mié 9 08:00 | vie 11 15:30 |

**CA-CAL-04b · Sin pestaña.** Dado que `Festivos` no existe, cuando se ejecuta `probarCalendario`, entonces reporta la advertencia y `esDiaHabil(2026-10-12)` devuelve `true` (solo fines de semana).
