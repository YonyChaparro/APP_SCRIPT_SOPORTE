# Sistema de Solicitudes de Soporte Técnico — Resumen general

**Facultad de Ciencias Económicas · Unidad de Informática**
Revisión del 10 de septiembre de 2026 · Entorno de pruebas

---

## Qué hace el sistema

Es la mesa de ayuda de la Unidad de Informática. Automatiza todo el recorrido de una solicitud, desde que alguien la escribe hasta que se le avisa que quedó resuelta, sin que nadie tenga que llevar el control a mano.

**El recorrido de una solicitud:**

1. **Un funcionario llena un formulario** indicando dónde está el problema (edificio y oficina), de qué tipo es y cuántos equipos afecta.

2. **El sistema lo registra automáticamente.** Le asigna un número de radicado —por ejemplo `FCE-SOP-087`— y calcula solo cuánto tiempo tiene la Unidad para atenderlo.

3. **El solicitante recibe un correo de confirmación** con su número de radicado y el plazo estimado de respuesta.

4. **La solicitud aparece en una lista de trabajo** para los técnicos, ordenada de la más urgente a la menos urgente. La lista se reordena sola: lo que está por vencerse sube al principio.

5. **Cuando un técnico la resuelve**, escribe su nombre en la lista. El sistema avisa al solicitante por correo que su caso quedó cerrado, le manda una encuesta de satisfacción y retira la solicitud de la lista de pendientes.

6. **Todos los días a las 8:00 de la mañana** el sistema revisa qué solicitudes están por vencerse y avisa por correo al coordinador.

7. **Todos los lunes a las 9:00** envía un reporte con el total de solicitudes de la semana, cuántas se resolvieron y el porcentaje de cumplimiento.

---

## Cómo decide qué es urgente

Esta es la parte más valiosa del sistema y conviene entenderla bien, porque funciona al revés de lo que uno esperaría.

El sistema suma tres factores: **dónde** ocurre el problema, **qué tipo** de problema es y **cuántos equipos** afecta. Con esa suma decide el plazo.

Lo importante es que **un puntaje bajo significa más urgencia**. El puntaje no mide qué tan importante es la solicitud, sino **cuánto puede esperar**.

- La Decanatura vale 1 punto → se atiende en **24 horas**
- La Biblioteca vale 20 puntos → tiene un plazo más largo

Los plazos posibles van desde 24 horas hasta "durante el semestre académico", pasando por 48 horas, 72 horas, 5 días, 10 días y 15 días.

---

## Estado actual: qué funciona y qué no

El sistema **está bien concebido**. La idea de calcular los plazos automáticamente según criterios objetivos, en lugar de dejarlo al criterio de quien recibe la solicitud, es sólida y poco común en mesas de ayuda de este tamaño.

Pero la revisión encontró problemas que hoy le están restando buena parte de su utilidad. Estos son los cuatro que importan.

### 1. Los plazos se estaban calculando mal *(corregido el 15 de septiembre de 2026)*

**Qué pasaba:** el sistema comparaba lo que el usuario escogió en el formulario contra una lista interna de opciones. Si las dos no coincidían **letra por letra**, no reconocía la opción y la calificaba con cero.

Y muchas **no** coincidían. Revisando el formulario completo, **11 de las 38 oficinas y 16 de los 31 tipos de servicio** no eran reconocidos. Había tres razones:

- **Un error de estructura.** Para los problemas de "Revisión y Reparación" el formulario pregunta primero el grupo (Hardware, Software, Conectividad, Usuario) y luego el problema concreto. El sistema leía el grupo y nunca llegaba a leer el problema. Era el caso más frecuente.
- **Diferencias de escritura.** Una tilde de más, un guion donde el sistema esperaba una coma, "Otros" en plural frente a "Otro" en singular.
- **Nombres distintos.** La lista interna se copió del documento de especificación (`TIEMPOS DE RESPUESTA.xlsx`), pero el formulario se redactó con otros nombres: "UIFCE" en uno y "Unidad de Informática" en el otro; "Sala de Informática 1" frente a "Sala 1". Los puntajes del documento eran correctos; los nombres no coincidían. Y dos opciones del formulario ("Creación de usuarios" y "Falla de inicio de sesión") no aparecen en el documento, así que nadie les había asignado puntaje.

**Qué significaba en la práctica:** cada opción no reconocida restaba puntos, y como menos puntos significa más urgencia, **el plazo se acortaba uno o dos niveles sin que nadie lo pidiera**. En las 31 solicitudes registradas, casi la mitad tenía algún componente mal calificado y 9 terminaron con un plazo distinto al que les correspondía. Y todo ocurría **en silencio**: sin error, sin advertencia.

**Ejemplos reales:** `FCE-SOP-080` (mantenimiento preventivo de 35 impresoras) debía quedar como "durante el semestre" y quedó en 10 días. `FCE-SOP-062` (una baja de equipos en la UIFCE) debía tener el plazo más largo y quedó en 15 días.

**Qué se hizo:** se reescribió la lista interna con los puntajes del documento de especificación y los nombres tal cual están en el formulario de producción, se corrigió el error de estructura y ahora el sistema tolera diferencias de tildes, mayúsculas y puntuación. Además, el sistema ahora acepta los nombres de las tres fuentes (el documento de especificación y los dos formularios) como equivalentes, y localiza las columnas de la hoja por su título, así que sobrevive a que se agreguen o muevan preguntas en el formulario. Si en el futuro aparece una opción que no reconoce, **ya no la califica con cero**: le asigna un valor intermedio, pinta la fila de amarillo en la lista de pendientes y avisa por correo. Además, la hoja tiene un menú nuevo, **Soporte**, con tres herramientas: probar el cálculo con 38 casos reales, auditar el formulario contra la lista interna, y recalcular los plazos de las solicitudes pendientes.

### 2. Hay solicitudes atascadas que nunca se podrán cerrar

**Qué pasa:** en la lista de pendientes hay dos solicitudes (`FCE-SOP-088` y `FCE-SOP-090`) que no existen en el registro histórico. Cuando un técnico intente cerrarlas, el sistema no las va a encontrar y no hará nada. Sin mensaje de error.

Una de ellas además tiene los datos **corridos una columna**: donde debería ir el nombre aparece un número de teléfono, donde debería ir la cantidad de equipos dice "Hola". Su fecha quedó registrada como **31 de diciembre de 1969**, que es lo que el sistema pone cuando no logra entender una fecha.

**Qué significa en la práctica:** esas dos solicitudes van a quedar en la lista para siempre. Peor: como la de 1969 figura con casi 500.000 horas de atraso, el sistema la considera la más urgente de todas y **la deja clavada en el primer lugar** de la lista de trabajo. Los técnicos ven en el tope de su bandeja una solicitud fantasma que no pueden resolver.

### 3. La hoja mezcla datos de dos versiones distintas del sistema

**Qué pasa:** hay solicitudes marcadas con el estado `Error: Falla de Envío`, un estado que **el sistema actual no sabe generar**. Quedó de una versión anterior del programa.

Lo mismo con los plazos: hay filas que dicen "5 DÍAS" con tilde, mientras el sistema actual escribe "5 DIAS" sin tilde. Cuando el sistema lee esas filas viejas no las reconoce y les aplica un plazo por defecto de 10 días.

**Qué significa en la práctica:** **las solicitudes antiguas se están midiendo con el doble del plazo que realmente les corresponde.** Las alertas de vencimiento sobre esas filas no son confiables.

### 4. No se está guardando el historial de lo resuelto

**Qué pasa:** existe una hoja llamada "Solicitudes_Archivadas" pensada justamente para conservar los casos cerrados. Está vacía, y revisando el programa se confirma que **nunca se escribe nada en ella**. Cuando un técnico cierra un caso, la fila simplemente se borra de la lista de pendientes.

**Qué significa en la práctica:** se pierde información que solo existía ahí. Queda el registro básico en el histórico, pero no el detalle del trabajo realizado. Para efectos de indicadores de gestión o auditoría, esa información ya no se puede recuperar.

---

## Otros puntos a tener en cuenta

**El aviso de confirmación al cerrar un caso puede fallar según quién lo cierre.** El sistema muestra una ventana de "¿confirma que quedó resuelta?". Esa ventana solo aparece correctamente para la persona que configuró el sistema. Si otro técnico cierra un caso, es posible que el correo al solicitante nunca salga y que la solicitud quede a medio cerrar.

**Si algo falla, el sistema envía un correo por cada error.** Como hay revisiones automáticas todos los días, un problema que no se corrija genera un correo diario indefinidamente. Y si se agota el límite diario de correos de Google, el aviso de error tampoco sale: el sistema queda sin avisar justo cuando más lo necesita.

**Los correos de alerta traían porcentajes absurdos.** *(Corregido el 17 de septiembre: la alerta ahora separa vencidas de próximas a vencer y muestra porcentajes entre 0 y 100.)*

**El número de radicado depende de la posición de la fila.** Si alguien borra o inserta una fila en la hoja, los radicados se repiten o se saltan. Conviene no manipular filas manualmente.

**Este entorno de pruebas envía correos reales.** Contiene correos institucionales y teléfonos verdaderos, y los avisos administrativos siguen apuntando al buzón de producción `soporte@fce.unal.edu.co`. Cualquier prueba llega a personas reales.

---

## Novedades del 17 de septiembre de 2026

Se implementaron dos mejoras pedidas por la Unidad:

**Los plazos ya cuentan solo días hábiles.** Sábados, domingos y festivos nacionales no descuentan tiempo. Una solicitud del viernes a las 10:00 con plazo de 24 horas vence el lunes a las 10:00, no el sábado. Si una solicitud llega fuera del horario de atención, el plazo empieza a correr en la siguiente apertura y el correo de confirmación lo explica. Además, el correo ahora dice la **fecha y hora límite estimada** («martes 20 de octubre de 2026, 8:00 a. m.»), para que el solicitante sepa qué esperar. Los festivos se generan solos cada año desde el menú y quedan en una pestaña `Festivos` que cualquier persona puede editar.

**El formulario se cierra fuera del horario de atención.** Recibe solicitudes desde las 8:00 a. m. del primer día hábil de la semana hasta las 3:30 p. m. del último, y se cierra en todo festivo. Cuando está cerrado muestra un mensaje con la fecha exacta en que reabre. Hay un menú para abrirlo o cerrarlo a mano en una contingencia, y una bitácora que registra cada apertura y cierre. Por ahora aplica solo al formulario de pruebas.

Lo que falta para dejarlo funcionando en la hoja de pruebas está en `specs/README.md` (cinco pasos desde el menú Soporte).

## Qué se recomienda hacer

**Primero, proteger lo que hay** *(rápido, sin riesgo)*

- Guardar una copia de respaldo del programa. Hoy no existe ninguna: si algo se daña, no hay a dónde volver.
- Redirigir los correos administrativos a un buzón de pruebas mientras se trabaja.
- Retirar las dos solicitudes atascadas de la lista de pendientes.

**Después, corregir el fondo** *(requiere desarrollo)*

- ~~Hacer que el sistema reconozca las opciones aunque difieran en tildes o puntuación.~~ **Hecho** (problema 1, y la parte del problema 3 que afectaba los plazos). Quedan tres decisiones para el responsable del proceso: el formulario de producción no ofrece dos categorías que el documento de especificación sí contempla ("Instalación y Alistamiento" y "Cambio de Ubicación"); las dos opciones de "Usuario" del formulario necesitan un puntaje oficial en el documento (hoy tienen uno provisional); y una oficina se llama distinto en cada formulario ("Secretaría Académica" en pruebas, "Secretaría de Facultad" en producción).
- Cambiar la forma de numerar los radicados para que no dependa de la posición de la fila.
- Activar el archivado de las solicitudes resueltas.
- Reemplazar la ventana de confirmación por una casilla de verificación, que funciona igual para todos los técnicos.
- Agrupar los errores en un único resumen diario en lugar de un correo por cada uno.

**Mejoras de uso**

- Agregar un menú dentro de la hoja para no tener que entrar al editor de programación a configurar el sistema.

---

## En una frase

El sistema está bien diseñado y resuelve un problema real. Su función central —decidir qué es urgente— no estaba operando correctamente por diferencias entre el formulario y el programa; **eso ya está corregido y protegido con pruebas**. El resto son ajustes menores.

---

*Documento complementario: `INFORME_TECNICO.md` contiene el detalle técnico, la ubicación exacta de cada problema en el código y las recomendaciones de implementación.*
