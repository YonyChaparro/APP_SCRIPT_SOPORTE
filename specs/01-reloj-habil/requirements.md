# 01 · Reloj hábil — Requisitos

**Origen:** «2. Cortar el tiempo cuando sean fines de semana y festivos».
**Depende de:** 00 · Calendario hábil (CAL-04, CAL-05, CAL-06).

## Problema

El plazo de una solicitud corre en horas calendario: una solicitud del viernes a las 15:00 con `24 HORAS` vence el sábado a las 15:00, cuando nadie trabaja. La bandeja de pendientes, la alerta diaria y el correo al solicitante transmiten plazos irreales. El solicitante debe recibir «una referencia real de lo que debe esperar» (decisión 2).

## Alcance

**Incluye:** semántica hábil del plazo, inicio efectivo, fecha límite persistida, columnas nuevas en Pendientes, fórmula viva de horas hábiles restantes, orden de la bandeja, alerta diaria, recálculo al cambiar el servicio, migración de la bandeja actual, fecha límite en el correo de confirmación.
**Excluye:** cambiar los puntajes o las etiquetas de plazo (`24 HORAS`, `5 DIAS`…), el reporte semanal, el archivado (H-04).

## Requisitos

**REL-01 · Semántica del plazo.** Las horas de cada etiqueta (`HORAS_TIEMPO`) son **horas hábiles** según CAL-05: un día hábil aporta 24 h; sábados, domingos y festivos aportan 0 h. Las etiquetas y sus horas no cambian (`24 HORAS` = 24, `5 DIAS` = 120, `DURANTE EL SEMESTRE ACADÉMICO` = 2160).

**REL-02 · Inicio efectivo.** El reloj de una solicitud arranca en su marca temporal si en ese instante la ventana estaba abierta (CAL-06); si no, arranca en la siguiente apertura (`proximaApertura`). El inicio efectivo se persiste.

**REL-03 · Fecha límite.** Al registrar una solicitud el sistema calcula `fechaLimite = sumarHorasHabiles(inicioEfectivo, horasDelPlazo)` y la persiste. La fecha límite es la única fuente para ordenar, alertar y mostrar.

**REL-04 · Columnas de Pendientes.** La bandeja incorpora `INICIO RELOJ` (fecha-hora) y `FECHA LÍMITE` (fecha-hora), añadidas al final; la columna `TIEMPO RESTANTE (HRS)` pasa a llamarse `HORAS HÁBILES RESTANTES`. Todas las columnas de Pendientes se localizan por encabezado (como ya ocurre en `Respuestas_Oficiales`), con posiciones de respaldo.

**REL-05 · Horas hábiles restantes en vivo.** `HORAS HÁBILES RESTANTES` contiene la fórmula `LET` del diseño de 00 (§5) referida a `FECHA LÍMITE` y a `Festivos`. Es negativa cuando la solicitud está vencida. Su valor y `horasHabilesEntre(ahora, fechaLimite)` deben coincidir (± 0,01 h).

**REL-06 · Orden de la bandeja.** Pendientes se ordena por `FECHA LÍMITE` ascendente (lo más próximo a vencer arriba). Se deja de ordenar por la columna de horas.

**REL-07 · Alerta diaria.** `verificarSolicitudesVencidas` calcula con `horasHabilesEntre(ahora, fechaLimite)`; incluye una solicitud cuando le queda ≤ 20 % de sus horas hábiles o está vencida. El porcentaje reportado es `min(100, transcurrido/total × 100)` y las vencidas se listan aparte con las horas hábiles de retraso. El correo muestra la fecha límite de cada solicitud.

**REL-08 · Cambio de servicio.** Cuando un técnico cambia el servicio en Pendientes, el sistema recalcula el plazo y la fecha límite **a partir del `INICIO RELOJ` persistido**, no del momento del cambio, y actualiza la fórmula.

**REL-09 · Migración.** *Soporte → Recalcular plazos de pendientes* completa `INICIO RELOJ` (desde `FECHA SOLICITUD` aplicando REL-02) y `FECHA LÍMITE` en las filas existentes, reescribe la fórmula y reordena. Filas con fecha de solicitud inválida (p. ej. `31/12/1969`) se marcan para revisión y no se recalculan.

**REL-10 · Correo de confirmación.** El correo al solicitante muestra el plazo (`72 HORAS`) **y** la fecha límite estimada en formato largo en español («jueves 22 de octubre de 2026, 10:00 a. m.»), con la aclaración «en días hábiles».

**REL-11 · Solicitud fuera de ventana.** Si el inicio efectivo difiere de la marca temporal, el correo añade: «Su solicitud fue recibida fuera del horario de atención; el plazo cuenta desde el {inicio efectivo}». La fila de Pendientes recibe una nota con el mismo texto.

**REL-12 · Sin regresión del motor de puntajes.** `probarCalculo` sigue en verde; `calcularPuntaje` no cambia de contrato.

**REL-13 · Pruebas.** *Soporte → Probar reloj hábil* ejecuta los criterios de abajo con festivos de 2026 inyectados y sin depender de la hora actual.

## Criterios de aceptación

**CA-REL-02/03 · Inicio efectivo y fecha límite.**
| Marca temporal | Plazo | Inicio efectivo | Fecha límite |
|---|---|---|---|
| lun 2026-10-19 10:00 | 24 HORAS | lun 19 10:00 | mar 2026-10-20 10:00 |
| vie 2026-10-16 10:00 | 24 HORAS | vie 16 10:00 | lun 2026-10-19 10:00 |
| vie 2026-10-16 16:00 (ventana cerrada) | 24 HORAS | lun 19 08:00 | mar 2026-10-20 08:00 |
| jue 2026-10-08 14:00 | 48 HORAS | jue 8 14:00 | mar 2026-10-13 14:00 (lun 12 festivo) |
| jue 2026-04-02 09:00 (Jueves Santo) | 72 HORAS | lun 2026-04-06 08:00 | jue 2026-04-09 08:00 |
| mar 2026-10-20 03:00 (noche entre hábiles) | 24 HORAS | mar 20 03:00 | mié 2026-10-21 03:00 |
| lun 2026-10-19 10:00 | 5 DIAS | lun 19 10:00 | lun 2026-10-26 10:00 |
| lun 2026-12-07 15:45 (mar 8 festivo) | 24 HORAS | mié 2026-12-09 08:00 | jue 2026-12-10 08:00 |

**CA-REL-05 · Horas restantes.** Dada fecha límite mar 2026-10-13 14:00 y «ahora» = vie 2026-10-09 14:00, entonces restan 24 h (10 h vie + 0 sáb/dom/lun + 14 h mar). Dado «ahora» = mié 2026-10-14 14:00, entonces restan −24 h.

**CA-REL-07 · Alerta.** Dada una solicitud de `48 HORAS` con 9 h hábiles restantes, cuando corre la verificación, entonces aparece en la alerta con 81 %. Dada una con −5 h, entonces aparece en la lista de vencidas con «5 h hábiles de retraso» y 100 %. Dada una con 20 h restantes, entonces no aparece.

**CA-REL-08 · Cambio de servicio.** Dada una solicitud con inicio lun 2026-10-19 10:00 y plazo `24 HORAS`, cuando el mié 21 un técnico cambia el servicio a uno de `72 HORAS`, entonces la fecha límite pasa a jue 2026-10-22 10:00 (no al sábado 24).

**CA-REL-09 · Migración.** Dada la bandeja actual (6 filas, una con fecha 1969), cuando se recalcula, entonces 5 filas tienen `INICIO RELOJ` y `FECHA LÍMITE`, la del 1969 queda marcada en amarillo con nota «fecha de solicitud inválida» y la bandeja queda ordenada por fecha límite.

**CA-REL-10/11 · Correo.** Dada una solicitud recibida vie 2026-10-16 16:00 con `24 HORAS`, cuando se envía la confirmación, entonces el cuerpo contiene «Tiempo estimado de respuesta: 24 HORAS (en días hábiles)», «Fecha límite estimada: martes 20 de octubre de 2026, 8:00 a. m.» y la aclaración de recepción fuera de horario con «lunes 19 de octubre de 2026, 8:00 a. m.».
