# 02 · Ventana del formulario — Requisitos

**Origen:** «3. Bloquear el formulario después de los viernes a las 3:30 pm y activarlo los lunes a las 8 am (o martes teniendo en cuenta los festivos; hay que tener en cuenta los festivos que son diferentes a los lunes). La generación de tickets es desde el primer día hábil de la semana a las 8:00 am hasta viernes 3:30 pm».
**Decisiones:** cierra todo festivo, sea el día que sea; si el viernes es festivo, cierra el jueves 15:30; por ahora solo el formulario de pruebas; proponer el mensaje de cierre.
**Depende de:** 00 · Calendario hábil (CAL-06).

## Problema

Google Forms no permite programar horarios. El formulario recibe solicitudes a cualquier hora y el sistema las radica como si el equipo estuviera disponible. Se requiere que el formulario **no acepte respuestas** fuera de la ventana de atención y que el solicitante sepa cuándo reabre.

## Alcance

**Incluye:** apertura y cierre automáticos a la hora exacta, mensaje de cierre con fecha de reapertura, reconciliación ante fallos de disparadores, modo manual para contingencias, bitácora, red de seguridad en el registro de solicitudes, menú.
**Excluye:** el formulario de producción (queda preparado por configuración, desactivado), cambios en el diseño del formulario, notificaciones a solicitantes sobre el cierre.

## Requisitos

**VEN-01 · Regla.** El formulario acepta respuestas si y solo si `ventanaAbierta(ahora)` (CAL-06): abre a las 8:00 de todo día hábil precedido de uno no hábil, cierra a las 15:30 de todo día hábil seguido de uno no hábil, permanece abierto de noche entre días hábiles consecutivos, y está cerrado todo día no hábil.

**VEN-02 · Formulario objetivo.** El formulario a controlar se configura en `CONFIG.VENTANA.FORMULARIO` (ID). Valor inicial: el de pruebas (`1druQ9zqkqnISd6STqOU4DrThXb1Ev9_m4f19GrlLst8`). Cambiar a producción es editar ese valor y volver a ejecutar *Configurar triggers*.

**VEN-03 · Exactitud de las transiciones.** Las transiciones ocurren dentro del minuto siguiente a la hora de regla (8:00:00–8:00:59, 15:30:00–15:30:59). Como los disparadores recurrentes de Apps Script tienen precisión de ±15 min, las transiciones se ejecutan con disparadores de una sola vez creados cada día por un programador.

**VEN-04 · Mensaje de cierre.** Mientras está cerrado, el formulario muestra un mensaje en español con la fecha y hora de la próxima apertura en formato largo. Texto propuesto:

> **Formulario cerrado temporalmente.** La Unidad de Informática recibe solicitudes de soporte los días hábiles, desde las 8:00 a. m. del primer día hábil de la semana hasta las 3:30 p. m. del último. El formulario se reabrirá el **{día de semana} {d} de {mes} de {aaaa} a las 8:00 a. m.** Si tiene una emergencia que no puede esperar, comuníquese con la extensión {EXTENSION_EMERGENCIA}.

`{EXTENSION_EMERGENCIA}` se toma de `CONFIG.VENTANA.EXTENSION_EMERGENCIA`; si está vacío, la última frase se omite.

**VEN-05 · Reconciliación.** Cada hora el sistema compara el estado real del formulario (`isAcceptingResponses`) con el que dicta la regla y corrige cualquier discrepancia, registrándola. Así un disparador perdido nunca deja el formulario en estado incorrecto más de una hora.

**VEN-06 · Modo manual.** Desde el menú, un administrador puede *Abrir ahora*, *Cerrar ahora* y *Suspender/Reanudar programación*. Abrir o cerrar a mano pone el sistema en modo `MANUAL`: el programador y la reconciliación no tocan el formulario hasta que se ejecute *Reanudar programación*, que reconcilia de inmediato. El estado se persiste en `PropertiesService` y sobrevive a reinicios.

**VEN-07 · Bitácora.** Toda transición (automática o manual), toda reconciliación que corrija algo y todo error de `FormApp` se registran en la pestaña `Bitácora_Ventana` con fecha-hora, acción, origen (`programada`, `reconciliación`, `manual:<usuario>`), estado resultante y detalle.

**VEN-08 · Red de seguridad al radicar.** Si una respuesta llega con la ventana cerrada (formulario abierto por error, respuesta enviada segundos antes del cierre), `onFormSubmit` la registra normalmente; el inicio del reloj es la siguiente apertura (REL-02) y el correo lo aclara (REL-11). Ninguna solicitud se rechaza ni se pierde.

**VEN-09 · Estado en el menú.** *Soporte → Estado de la ventana* muestra: estado real del formulario, estado según la regla, modo (`AUTO`/`MANUAL`), próxima apertura, próximo cierre y los disparadores puntuales pendientes.

**VEN-10 · Disparadores.** `configurarTriggers` instala `programarVentana` (diario, 6:00) y `reconciliarVentana` (cada hora). Los disparadores de una sola vez (`abrirFormulario`, `cerrarFormulario`) se eliminan a sí mismos al ejecutarse; `programarVentana` elimina los puntuales huérfanos antes de crear los del día. El total de disparadores del proyecto no supera 10.

**VEN-11 · Permisos.** Los disparadores corren con la cuenta que ejecutó *Configurar triggers*, que debe ser propietaria o editora del formulario. Un error de permiso se registra en la bitácora y se notifica al administrador una vez al día, no en cada intento.

**VEN-12 · Pruebas.** *Soporte → Probar ventana* verifica la regla (CA-CAL-06), el cálculo de transiciones del día y el mensaje de cierre con festivos de 2026 inyectados, sin tocar el formulario real. Las funciones que tocan `FormApp` y `ScriptApp` se aíslan tras una interfaz para poder simularlas.

## Criterios de aceptación

**CA-VEN-03 · Transiciones del día.** Dado el programador ejecutándose a las 6:00 de:
| Día | Crea `abrir` a 8:00 | Crea `cerrar` a 15:30 | Por qué |
|---|---|---|---|
| lun 2026-10-19 | sí | no | precedido por domingo; seguido por martes hábil |
| mar 2026-10-20 | no | no | entre dos hábiles |
| vie 2026-10-16 | no | sí | seguido por sábado |
| vie 2026-10-09 | no | sí | seguido por sábado (y lun 12 festivo) |
| mar 2026-10-13 | sí | no | precedido por lun 12 festivo |
| mié 2026-04-01 | no | sí | seguido por Jueves Santo |
| lun 2026-04-06 | sí | no | precedido por domingo (y jue/vie santo) |
| lun 2026-12-07 | sí | sí | precedido por domingo, seguido por mar 8 festivo |
| mié 2026-12-09 | sí | no | precedido por mar 8 festivo |
| sáb 2026-10-17 | no | no | no hábil |

**CA-VEN-04 · Mensaje.** Dado un cierre el vie 2026-10-09 15:30, entonces el mensaje dice «se reabrirá el **martes 13 de octubre de 2026 a las 8:00 a. m.**». Dado un cierre el mié 2026-04-01, entonces «**lunes 6 de abril de 2026**».

**CA-VEN-05 · Reconciliación.** Dado que el disparador de cierre del viernes no se ejecutó y son las 16:10, cuando corre la reconciliación, entonces el formulario queda cerrado con el mensaje correcto y la bitácora registra `reconciliación · cerrar · «formulario estaba abierto fuera de ventana»`.

**CA-VEN-06 · Modo manual.** Dado que un administrador ejecuta *Abrir ahora* el sábado, cuando corre la reconciliación a la hora siguiente, entonces el formulario sigue abierto y la bitácora registra `reconciliación · sin acción · modo MANUAL`. Cuando ejecuta *Reanudar programación*, entonces el formulario se cierra de inmediato y el modo vuelve a `AUTO`.

**CA-VEN-08 · Red de seguridad.** Dada una respuesta con marca temporal vie 2026-10-16 15:30:20 (enviada al filo del cierre), cuando se radica, entonces existe en el histórico y en Pendientes con inicio del reloj lun 19 08:00 y el correo lo aclara.

**CA-VEN-10 · Disparadores.** Dado el proyecto con los disparadores instalados, cuando han pasado 7 días, entonces no existe ningún disparador puntual ya ejecutado (los `at()` se limpian) y el total de disparadores es ≤ 10.
