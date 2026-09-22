# Especificaciones — Spec-Driven Development

Carpeta de especificaciones del proyecto **Solicitudes Soporte Técnico**. Cada funcionalidad se planifica antes de escribir código, en tres documentos:

| Documento | Responde a | Se aprueba antes de |
|---|---|---|
| `requirements.md` | **Qué** debe hacer el sistema y cómo se verifica (requisitos numerados + criterios de aceptación *Dado / Cuando / Entonces*) | escribir el diseño |
| `design.md` | **Cómo** se construye: datos, funciones, fórmulas, algoritmos, casos borde, riesgos | escribir las tareas |
| `tasks.md` | **En qué orden**: lista de tareas pequeñas, cada una ligada a requisitos y con su prueba | empezar a codificar |

## Flujo

1. Se redacta `requirements.md` y se revisa con el responsable del proceso. Toda ambigüedad se resuelve aquí, no en el código.
2. Se redacta `design.md`. Si el diseño revela un requisito faltante, se vuelve al paso 1.
3. Se redacta `tasks.md`. Cada tarea termina con una prueba automatizada (`probar*()` en el menú Soporte) o una verificación manual descrita.
4. Se implementa tarea por tarea. Una tarea no se da por terminada sin su prueba en verde.
5. Al cerrar la funcionalidad se actualiza la tabla de estado de este archivo y los informes del proyecto.

## Estado

| Feature | Requisito de origen | Estado | Depende de |
|---|---|---|---|
| [00 · Calendario hábil](00-calendario-habil/requirements.md) | Base común de 2 y 3 | **Implementada** (17-sep-2026) · 45 casos en verde · pendiente T-00-08 en la hoja | — |
| [01 · Reloj hábil](01-reloj-habil/requirements.md) | «2. Cortar el tiempo cuando sean fines de semana y festivos» | **Implementada** (17-sep-2026) · 39 casos en verde · pendiente migración de la bandeja (T-01-09) | 00 |
| [02 · Ventana del formulario](02-ventana-formulario/requirements.md) | «3. Bloquear el formulario después de los viernes 3:30 pm y activarlo el primer día hábil a las 8 am» | **Implementada** (17-sep-2026) · 38 casos en verde · pendiente puesta en marcha (T-02-13) | 00 |

**Archivos:** `Calendario.gs` (00), `Reloj.gs` (01), `Ventana.gs` (02); `Código.gs` conserva configuración, disparadores, menú y motor de puntajes; `Servicios.gs` contiene el catálogo del Excel y su prueba exhaustiva, `Tiempos.gs` la de plazos de respuesta y `Verificacion.gs` el informe de verificación dentro de la hoja (ver abajo).

### Verificación del catálogo de servicios (22 de septiembre de 2026)

`Servicios.gs` transcribe las cuatro pestañas de puntaje de `TIEMPOS DE RESPUESTA.xlsx` como **oráculo independiente** de `PUNTAJES` / `ESCALA_CANTIDAD` / `ESCALA_TIEMPOS`, y `probarServicios()` compara ambas fuentes: 38 ubicaciones × 31 servicios × 4 tramos de cantidad, cada uno en todas sus grafías (Excel, formulario, rangos con nombre de `tabla_serv`, con y sin tildes). **5.530 casos en verde.** Detalle en `INFORME_TECNICO.md` §13.

`Tiempos.gs` continúa el camino hasta el final: de los puntos al plazo de la pestaña «TIEMPOS DE RESPUESTA», de ahí a las horas hábiles y de ahí a la fecha límite. `probarTiempos()` cubre cada servicio del árbol en todas sus grafías contra todas las ubicaciones y todos los tramos de cantidad, más la monotonía de la escala, las fronteras de cantidad y la fecha límite desde ocho instantes distintos (lunes, viernes por la tarde, sábado, medianoche, víspera de festivo, festivo). **38.667 casos en verde.**

`tests/excel.js` compara ese catálogo con el **archivo `.xlsx` real del disco**, incluidas las dos pestañas ocultas de desplegables, y recorre las 4.408 combinaciones leídas del archivo. Es la única pieza que mira el original: sin ella, cambiar un puntaje en el motor y «arreglar» la prueba cambiándolo igual en el oráculo deja todo en verde mientras el Excel dice otra cosa. Solo corre en Node. **4.700 comprobaciones en verde.**

`tests/mutacion.js` confirma que las capas de prueba detectan **17/17** averías introducidas a propósito; cuatro de ellas son deriva respecto del Excel y solo las ve `tests/excel.js`. `TIEMPOS_POR_SERVICIO.md` (generado con `npm run matriz`) publica el plazo de los 31 servicios para cualquier ubicación y cantidad. Detalle en `INFORME_TECNICO.md` §14.

No llevan carpeta de spec propia: no añaden funcionalidad, verifican la que ya estaba especificada en el motor de puntajes. Su única regla de mantenimiento: **cuando cambie el Excel, actualizar primero el catálogo de `Servicios.gs`, después `PUNTAJES` en `Código.gs` y por último regenerar la matriz**. Entre los pasos las suites quedan en rojo, que es justamente lo que se busca.

**Verificación pendiente en la hoja de pruebas** (solo puede hacerse dentro de Sheets):

1. *Soporte → **Verificación completa…*** y responder **SÍ** a las correcciones. Una sola acción que genera los festivos de 2026 y 2027, ejecuta las seis suites (44.372 casos) y la comprobación de la fórmula, migra la bandeja creando `INICIO RELOJ` y `FECHA LÍMITE`, y audita las opciones de los dos formularios. Deja el detalle en la pestaña `Informe_Verificación`; el resumen debe quedar sin errores.
2. *Soporte → Configurar triggers* (instala el programador y la reconciliación; reconcilia el formulario de pruebas de inmediato). La verificación **no** lo hace por su cuenta porque borra todos los disparadores existentes y manda correo.
3. Repetir *Verificación completa…* (basta con **NO**) y comprobar que los pasos «Disparadores» y «Ventana del formulario» quedan en verde.
4. Observar `Bitácora_Ventana` durante un ciclo viernes → lunes.

Orden de implementación propuesto: **00 → 01 → 02**. 01 y 02 son independientes entre sí; solo comparten 00.

## Decisiones de producto (fuente: `respuestas.txt`, 15 de septiembre de 2026)

| # | Pregunta | Respuesta | Cómo se refleja en las specs |
|---|---|---|---|
| 1 | Alcance de "festivo" | Solo festivos nacionales, editables desde una pestaña | CAL-01, CAL-02, CAL-03 |
| 2 | Qué es una "hora hábil" | «Las 24 horas hábiles serían las reales hábiles para el usuario. El contexto de días hábiles es para que el solicitante tenga una referencia real de lo que debe esperar» | Interpretación adoptada: **un día hábil aporta 24 h reales; sábados, domingos y festivos aportan 0 h**. Ej.: solicitud lunes 10:00 con `24 HORAS` → límite martes 10:00; solicitud viernes 10:00 → límite lunes 10:00. Además, el solicitante recibe la **fecha límite estimada** en el correo (REL-10). ⚠ Confirmar esta interpretación antes de implementar 01. |
| 3 | Festivos entre semana | (b) El formulario cierra todo festivo, sea el día que sea. Si el viernes es festivo, cierra el jueves 15:30 | Regla general CAL-06: cierra a las 15:30 de todo día hábil seguido de un día no hábil; abre a las 8:00 de todo día hábil precedido de un día no hábil |
| 4 | Formulario objetivo | Por ahora solo pruebas (`1druQ9zq…`) | VEN-02, `CONFIG.VENTANA.FORMULARIO` |
| 5 | Mensaje de cierre | Sí, proponer uno | VEN-04 |

## Convenciones

- IDs de requisito: `CAL-nn`, `REL-nn`, `VEN-nn`. Los criterios de aceptación llevan el ID del requisito que verifican.
- Fechas de ejemplo en zona `America/Bogota`, año 2026 (festivos oficiales de ese año en `00-calendario-habil/design.md`).
- Nada de lo aquí especificado modifica el motor de puntajes ya validado (`calcularPuntaje`, `PUNTAJES`, `ESCALA_*`).

## Glosario

- **Día hábil**: lunes a viernes que no figure en la pestaña `Festivos`.
- **Hora hábil**: hora de reloj transcurrida dentro de un día hábil. Un día hábil completo son 24 h hábiles.
- **Ventana**: intervalo en que el formulario acepta respuestas.
- **Inicio efectivo (inicio del reloj)**: instante desde el que corre el plazo de una solicitud. Coincide con la fecha de la solicitud si llegó con la ventana abierta; si no, es la siguiente apertura.
- **Fecha límite**: inicio efectivo + horas del plazo, contando solo horas hábiles.
