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

### 1. Los plazos se están calculando mal

**Qué pasa:** el sistema compara lo que el usuario escogió en el formulario contra una lista interna de opciones. Si las dos no coinciden **letra por letra**, el sistema no reconoce la opción y la califica con cero.

Y hoy muchas **no** coinciden. Son diferencias mínimas —una tilde de más, un guion donde debería haber una coma, "UIFCE" en un lado y "Unidad de Informática" en el otro— pero para el sistema son valores completamente distintos.

**Qué significa en la práctica:** una buena parte de las solicitudes termina con el plazo más exigente, 24 horas, sin importar si realmente es urgente. La priorización, que es la razón de ser del sistema, deja de funcionar. Y lo hace **en silencio**: no aparece ningún error, ninguna advertencia. Todo parece normal.

**Ejemplo real:** la solicitud `FCE-SOP-087` debería tener 72 horas de plazo. El sistema le asignó 48 porque no reconoció el tipo de problema seleccionado.

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

**Los correos de alerta traen porcentajes absurdos.** Por el problema de las fechas, la alerta diaria está reportando avances de más del 15.000 %.

**El número de radicado depende de la posición de la fila.** Si alguien borra o inserta una fila en la hoja, los radicados se repiten o se saltan. Conviene no manipular filas manualmente.

**Este entorno de pruebas envía correos reales.** Contiene correos institucionales y teléfonos verdaderos, y los avisos administrativos siguen apuntando al buzón de producción `soporte@fce.unal.edu.co`. Cualquier prueba llega a personas reales.

---

## Qué se recomienda hacer

**Primero, proteger lo que hay** *(rápido, sin riesgo)*

- Guardar una copia de respaldo del programa. Hoy no existe ninguna: si algo se daña, no hay a dónde volver.
- Redirigir los correos administrativos a un buzón de pruebas mientras se trabaja.
- Retirar las dos solicitudes atascadas de la lista de pendientes.

**Después, corregir el fondo** *(requiere desarrollo)*

- Hacer que el sistema reconozca las opciones aunque difieran en tildes o puntuación. Esto soluciona de una vez los problemas 1 y 3, que son los más graves.
- Cambiar la forma de numerar los radicados para que no dependa de la posición de la fila.
- Activar el archivado de las solicitudes resueltas.
- Reemplazar la ventana de confirmación por una casilla de verificación, que funciona igual para todos los técnicos.
- Agrupar los errores en un único resumen diario en lugar de un correo por cada uno.

**Mejoras de uso**

- Agregar un menú dentro de la hoja para no tener que entrar al editor de programación a configurar el sistema.

---

## En una frase

El sistema está bien diseñado y resuelve un problema real, pero **su función central —decidir qué es urgente— hoy no está operando correctamente** por diferencias de escritura entre el formulario y el programa. Es un problema corregible y, una vez resuelto, el resto son ajustes menores.

---

*Documento complementario: `INFORME_TECNICO.md` contiene el detalle técnico, la ubicación exacta de cada problema en el código y las recomendaciones de implementación.*
