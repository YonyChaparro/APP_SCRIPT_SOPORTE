# Informe técnico — Solicitudes Soporte Técnico (pruebas)

**Fecha de revisión:** 10 de septiembre de 2026
**Alcance:** proyecto Apps Script contenedor y su hoja de cálculo asociada (entorno de pruebas)
**Método:** lectura completa del código (517 líneas), manifiesto, despliegues y contenido real de las tres hojas

---

## 1. Identificación del proyecto

| Elemento | Valor |
|---|---|
| Tipo de script | Contenedor (*container-bound*), no standalone |
| Script ID | `1iKzFBySdfetLToOfKQo3h7jakI_1y-HjxR8-_Ccl-dXeCs-bdrbW77Sk` |
| Hoja contenedora | `Solicitudes Soporte Técnico (pruebas)` — `1qsiybQUIUOfdpgPrlZnayCrxg810t_D8A8L2KSOxrfw` |
| Propietario | `uniic_bog@unal.edu.co` |
| Archivos | `Código.gs` (20,8 KB) y `appsscript.json` (122 B) |
| Runtime | V8, zona horaria `America/Bogota`, logging en Stackdriver |
| Scopes OAuth | No declarados en el manifiesto; Apps Script los infiere del código |
| Despliegues | 1 (`AKfycbwCsRJZ2uFvLSQzjbdr3EOnJmkVw0ZP8PBaSy6vOnE @HEAD`) |
| Versiones inmutables | Ninguna |

El despliegue existente no tiene uso: el código no define `doGet` ni `doPost`, así que no expone aplicación web ni endpoint. Es un residuo de configuración.

Al no existir ninguna versión creada, **no hay punto de restauración del lado de Google**. El único historial disponible es el repositorio git local creado en esta sesión.

---

## 2. Propósito del sistema

Automatiza la mesa de ayuda de la Unidad de Informática de la Facultad de Ciencias Económicas. Recibe solicitudes desde un formulario de Google, asigna radicado y tiempo máximo de respuesta calculado automáticamente, notifica por correo al solicitante, mantiene una bandeja de trabajo priorizada para los técnicos, y envía alertas de vencimiento y un reporte semanal.

---

## 3. Arquitectura

```
Formulario Google
      │ (envío)
      ▼
Respuestas_Oficiales ──── onFormSubmit ──┬──► calcula puntaje y SLA
   (histórico, 28 col)   [Código.gs:80]  ├──► escribe RADICADO + "Pendiente"
                                         ├──► MailApp: confirmación al usuario
                                         └──► inserta fila en Pendientes
                                                     │
                                                     ▼
                                      Solicitudes Pendientes (bandeja, 12 col)
                                                     │
                                      técnico escribe en "Resuelto por" (col 10)
                                                     │
                                         onEditTrigger [Código.gs:185]
                                                     │
                                         procesarResolucion [Código.gs:254]
                                         ├──► marca "Resuelta" en histórico
                                         ├──► MailApp: aviso de cierre + encuesta
                                         ├──► marca "Notificada" + fecha
                                         └──► deleteRow() en Pendientes

Disparadores de tiempo:
  verificarSolicitudesVencidas  diario 8:00   [Código.gs:363]
  generarReporteSemanal         lunes 9:00    [Código.gs:390]
```

---

## 4. Modelo de datos

### 4.1 `Respuestas_Oficiales` — histórico (28 columnas)

Destino del formulario. Las columnas 1 y 25–28 no las escribe el formulario sino el script.

| Col | Constante en `CONFIG.COL` | Encabezado real en la hoja | Escrita por |
|---|---|---|---|
| 1 | `CODIGO` | `Columna 1` | Script |
| 2 | `TIMESTAMP` | `Marca temporal` | Formulario |
| 3 | `EMAIL` | `Dirección de correo electrónico` | Formulario |
| 4 | `NOMBRE` | `Nombres y Apellidos:` | Formulario |
| 5 | `TELEFONO` | `Teléfono o extensión:` | Formulario |
| 6 | `EDIFICIO` | `Seleccione el Edificio...` | Formulario |
| 7–9 | `UBICACION` | 3 columnas homónimas (una por edificio) | Formulario |
| 10 | `CATEGORIA` | `Seleccione la categoría...` | Formulario |
| 11–22 | `SUBCAT1` / `SUBCAT2` | 12 columnas de subcategoría | Formulario |
| 23 | `CANTIDAD` | `Cantidad de equipos...` | Formulario |
| 24 | `COMENTARIOS` | `Comentarios adicionales...` | Formulario |
| 25 | `ESTADO` | `Columna 25` | Script |
| 26 | `FECHA_NOTIF` | `Columna 26` | Script |
| 27 | `RESPONSABLE` | *(sin encabezado)* | Script |
| 28 | `COMENTARIO_RESOLUCION` | *(sin encabezado)* | Script |

El formulario usa **ramificación condicional**: según edificio y categoría se muestra una de las tres columnas de ubicación y una de las doce de subcategoría, dejando el resto vacías. Por eso el código recorre listas de índices con `obtenerValorDeColumnas` ([Código.gs:296](Código.gs#L296)) y toma el primer valor no vacío.

### 4.2 `Solicitudes Pendientes` — bandeja activa (12 columnas)

`RADICADO`, `Nombres y apellidos`, `Edificio`, `Ubicación`, `Servicio`, `Cantidad de Equipos`, `Comentarios Adicionales`, `Tiempo de Respuesta Máximo`, `Fecha Solicitud`, `Resuelto por`, `Comentario de Resolucion`, *(sin encabezado)*.

La columna 12 contiene una fórmula viva insertada por el script:

```
=<horas del SLA> - (NOW() - I<fila>) * 24
```

Recalcula en cada apertura las horas restantes. Valor negativo = vencida. `ordenarPendientesPorPrioridad` ([Código.gs:459](Código.gs#L459)) ordena la hoja por esta columna ascendente, dejando arriba lo más vencido.

Al cerrar un ticket la fila se **elimina** ([Código.gs:216](Código.gs#L216)).

### 4.3 `Solicitudes_Archivadas` — vacía

Declarada en `CONFIG.HOJAS.ARCHIVO` ([Código.gs:10](Código.gs#L10)) pero **nunca referenciada en el resto del código**. Existe en la hoja solo con encabezados. Ver hallazgo H-04.

---

## 5. Motor de priorización

```
puntajeTotal = ptsUbicación + ptsServicio + ptsCantidad
SLA          = calcularTiempo(puntajeTotal)
```

**La escala está invertida respecto a la intuición: a menor puntaje, mayor urgencia.** El puntaje mide cuánto puede esperar la solicitud, no su importancia. Decanatura vale 1 punto (atención en 24 horas); Biblioteca vale 20.

| Componente | Función | Rango |
|---|---|---|
| Ubicación | `getPuntajeUbicacion` [Código.gs:306](Código.gs#L306) | 1–30, o **0 si no hay coincidencia exacta** |
| Servicio | `getPuntajeServicio` [Código.gs:316](Código.gs#L316) | 5–70, o **0 si no hay coincidencia exacta** |
| Cantidad | `getPuntajeCantidad` [Código.gs:336](Código.gs#L336) | 1 (1–3 eq.), 10 (4–14), 20 (15–30), 35 (>30) |

Tabla de conversión ([Código.gs:346](Código.gs#L346)):

| Puntaje | Tiempo máximo |
|---|---|
| ≤ 10 | 24 HORAS |
| ≤ 20 | 48 HORAS |
| ≤ 30 | 72 HORAS |
| ≤ 40 | 5 DIAS |
| ≤ 50 | 10 DIAS |
| ≤ 60 | 15 DIAS |
| ≤ 70 | DURANTE EL SEMESTRE ACADÉMICO |
| > 70 | NO ESTABLECIDO |

`getPuntajeServicio` tiene dos casos especiales previos a la tabla: subcategoría `MANTENIMIENTO PREVENTIVO` (30 si la categoría menciona impresoras, 10 en otro caso) y `OTRO` (20 impresoras, 10 el resto).

---

## 6. Disparadores

| Función | Tipo | Frecuencia | Observación |
|---|---|---|---|
| `onFormSubmit` | Instalable, del formulario | Por envío | Protegido con `LockService` (10 s) y propiedad `ultimaFilaProcesada` |
| `onEditTrigger` | Instalable, al editar | Por edición | Reacciona solo a columnas 10 y 5 de Pendientes |
| `verificarSolicitudesVencidas` | Temporal | Diario 8:00 | Alerta si queda ≤ 20 % del tiempo |
| `generarReporteSemanal` | Temporal | Lunes 9:00 | Métricas de los últimos 7 días |

Los cuatro se crean con `configurarTriggers` ([Código.gs:503](Código.gs#L503)), que primero **borra todos los disparadores existentes**. No hay `onOpen`, así que no existe menú personalizado: la función debe ejecutarse a mano desde el editor.

---

## 7. Inventario de funciones (20)

| Sección | Funciones |
|---|---|
| Disparadores | `onFormSubmit` [80], `onEditTrigger` [185] |
| Procesamiento | `procesarResolucion` [254] |
| Cálculo | `obtenerValorDeColumnas` [296], `getPuntajeUbicacion` [306], `getPuntajeServicio` [316], `getPuntajeCantidad` [336], `calcularTiempo` [346] |
| Programadas | `verificarSolicitudesVencidas` [363], `generarReporteSemanal` [390] |
| Plantillas HTML | `templateConfirmacion` [416], `templateResolucion` [430], `alertaVencidas` [439], `enviarReporte` [448] |
| Utilidades | `ordenarPendientesPorPrioridad` [459], `actualizarListasDesplegables` [470], `logError` [487], `getHoja` [495], `validarEmail` [499], `configurarTriggers` [503] |

---

## 8. Hallazgos

Ordenados por severidad. Cada uno está verificado contra el código y contra los datos reales de la hoja.

### H-01 · Crítico — El motor de priorización no reconoce buena parte de las opciones del formulario

> **Actualización 15 de septiembre de 2026.** Corregido en `Código.gs` (ver *Corrección aplicada* al final de este hallazgo). El análisis se amplió con el PDF del formulario de producción, que es la referencia: de 38 ubicaciones, 11 no se reconocían (29 %); de 31 servicios, 16 (52 %). Sobre las 31 solicitudes reales del histórico, 15 tenían al menos un componente en cero y 9 (29 %) terminaban con un plazo distinto al correcto. Hay tres causas, no una.

**Causa 1 — estructural: el código tomaba el grupo en vez del servicio.** En la categoría *PC y Portátiles - Revisión y Reparación* el formulario pregunta primero el grupo (`Hardware / Software / Conectividad / Usuario`, columna 14) y luego el servicio concreto (columnas 15–18). `CONFIG.COL.SUBCAT1` incluía la columna 14 y se consultaba antes que `SUBCAT2`, así que el script devolvía `CONECTIVIDAD` y nunca miraba la columna 17. Ese valor no existe en la tabla → 0. Afectaba a las 9 opciones de esa categoría aunque la ortografía fuera perfecta. Evidencia: `FCE-SOP-090` en Pendientes tiene `Servicio = CONECTIVIDAD`.

**Causa 2 — comparación frágil.** `getPuntajeUbicacion` y `getPuntajeServicio` hacían coincidencia **exacta** de cadenas (tras `trim().toUpperCase()`). Tildes, guiones frente a comas y sufijos rompían la igualdad.

**Causa 3 — la tabla se copió de la especificación, no del formulario.** Las claves del código eran una transcripción fiel de `TIEMPOS DE RESPUESTA.xlsx` (mismas mayúsculas, mismas abreviaturas, incluso el error de tipeo `CONTABILILIDAD`). El formulario se redactó con otros nombres: `UIFCE` frente a `UNIDAD DE INFORMÁTICA`, `Sala de Informática 1` frente a `SALA 1`, `Oficinas Docentes 311` frente a `OFICINAS DOCENTES`, `Secretaría de Facultad` frente a `SECRETARÍA ACADÉMICA`, `Otros` frente a `OTRO`. Los **valores** del Excel son correctos y se conservan íntegros (38 ubicaciones, 29 servicios, 4 rangos de cantidad, 8 umbrales de tiempo cotejados sin diferencias); lo que se corrigió son los **nombres**. Además, el grupo *Usuario* del formulario (`Creación de usuarios en Windows`, `Falla de inicio de sesión en Windows`) no existe en el Excel: se les asignó 10 y 5 de forma provisional, pendiente de que la especificación los incorpore.

Ejemplos de la causa 2 y 3 comparando claves del código con valores reales de la hoja:

| Valor real en la hoja | Clave en el código | Resultado |
|---|---|---|
| `Instalación / Actualización de paquetes` | `INSTALACION / ACTUALIZACION DE PAQUETES` [57](Código.gs#L57) | 0 — faltan tildes en el código |
| `Equipo sin internet - No navega` | `EQUIPO SIN INTERNET, NO NAVEGA` [53](Código.gs#L53) | 0 — guion vs. coma |
| `Equipo no inicia - pantalla negra` | `EQUIPO NO INICIA, PANTALLA NEGRA` [52](Código.gs#L52) | 0 — guion vs. coma |
| `Mantenimiento Preventivo Impresora` | caso especial exige `MANTENIMIENTO PREVENTIVO` | 0 — el sufijo rompe la coincidencia |
| `UIFCE` | `UNIDAD DE INFORMÁTICA` [38](Código.gs#L38) | 0 — sigla vs. nombre |
| `Oficina Área Curricular de Contabilidad y Finanzas` | `OFICINA AREA C. DE CONTABILILIDAD Y F.` [34](Código.gs#L34) | 0 — abreviatura, y **`CONTABILILIDAD` está mal escrito** |
| `Vicedecanatura de Investigación y Extensión` | `VICEDECANATURA DE INVESTIGACIÓN Y EXT.` [44](Código.gs#L44) | 0 — abreviatura |
| `Oficinas Docentes 311` | `OFICINAS DOCENTES` [28](Código.gs#L28) | 0 — sufijo de edificio |

**Efecto:** cada componente no reconocido resta puntos y **acorta el plazo uno o dos niveles** (falsa urgencia). Solo cuando fallan ubicación y servicio a la vez la solicitud cae a `24 HORAS`; en los datos reales eso ocurrió una vez (`FCE-SOP-085`). El fallo es silencioso porque `|| 0` no deja rastro.

Casos confirmados en datos: `FCE-SOP-080` (35 impresoras, mantenimiento preventivo) debía ser `NO ESTABLECIDO` y quedó en `10 DIAS`; `FCE-SOP-079`, `15 DIAS` → `72 HORAS`; `FCE-SOP-062` (UIFCE, bajas), `DURANTE EL SEMESTRE` → `15 DIAS`; `FCE-SOP-085`, `72 HORAS` → `24 HORAS`. *(Nota: la versión anterior de este informe usaba `FCE-SOP-087` como ejemplo; ese cálculo estaba mal: con el fallo daba 21 → `72 HORAS`, el mismo plazo que el correcto.)*

**Corrección aplicada (15 de septiembre de 2026):**

- La columna 14 se declara como `GRUPO_REVISION` y queda fuera de la búsqueda de servicio; `CONFIG.COL.SERVICIO` lista solo las columnas de subpregunta.
- `PUNTAJES` se reescribió con los valores de `TIEMPOS DE RESPUESTA.xlsx` y los nombres literales del formulario de producción, con los servicios agrupados por categoría (elimina los casos especiales de `OTRO` y `MANTENIMIENTO PREVENTIVO`, que valían distinto según la categoría). `Secretaría Académica` (formulario de pruebas) es alias de `Secretaría de Facultad`. Las categorías `INSTALACIÓN Y ALISTAMIENTO` (25) y `CAMBIO DE UBICACIÓN` (20), que en el formulario no tienen subpregunta, resuelven su único servicio de forma implícita.
- La comparación pasa por `normalizarTexto` (sin tildes, puntuación ni mayúsculas). `HORAS_TIEMPO` se consulta igual, lo que resuelve también el `5 DÍAS` de H-03.
- Una opción no reconocida ya no vale 0: recibe `PUNTAJE_SIN_COINCIDENCIA` (10), la fila queda marcada en amarillo con nota en Pendientes y se avisa al administrador.
- `onEditTrigger` usa el mismo `calcularPuntaje` que `onFormSubmit` (antes duplicaba la lógica con otro valor por defecto).
- Menú **Soporte** con `probarCalculo` (53 casos de regresión: las 31 solicitudes reales, las mismas escritas con los nombres del Excel, opciones aún no usadas y datos incompletos), `auditarOpcionesFormulario` (cruza cada opción del formulario de producción o de pruebas contra las tablas y escribe la hoja `Auditoría_Formulario`) y `recalcularPendientes`.

**Robustez ante discrepancias entre las tres fuentes** (Excel, formulario de producción, formulario de pruebas), añadida el mismo día:

- `ALIAS`: cualquier nombre con que alguna de las tres fuentes designe una ubicación, categoría o servicio resuelve al mismo puntaje (`SALA 1` = `Sala de Informática 1`, `SERVIDORES` = `Servidor web y bases de datos`, `OTRO` = `Otros` en Impresoras, etc.). Un alias que apunte a una clave inexistente se reporta en `probarCalculo`.
- `detectarColumnas`: las columnas de la hoja de respuestas se localizan por su **encabezado**, no por posición. Si el formulario gana, pierde o mueve preguntas, el script se adapta; `CONFIG.COL` queda solo como respaldo. Las columnas propias del script (`RADICADO`, `ESTADO`, `FECHA NOTIFICACIÓN`, `RESUELTO POR`, `COMENTARIO RESOLUCIÓN`) se etiquetan en su primera ejecución y, si su posición la ocupa una pregunta, se crean al final: nunca se escribe sobre datos del formulario.
- `GRUPOS_NO_SERVICIO`: los selectores `Hardware / Software / Conectividad / Usuario` se descartan por su **valor**, en cualquier columna en que aparezcan. Ya no depende de que la pregunta 12 esté en la columna 14.
- Ubicación con respaldo entre edificios: si el edificio viene vacío o mal, pero la oficina existe en un único edificio, se usa con aviso. Si es ambigua (`Oficinas Docentes` sin número existe en 311 y 238), queda marcada.
- `ESCALA_TIEMPOS` y `ESCALA_CANTIDAD`: una sola tabla por escala, copia literal de las pestañas del Excel, de la que se derivan etiqueta, horas y umbrales. Antes había tres definiciones separadas (`TIEMPOS`, `HORAS_TIEMPO`, `calcularTiempo`) que podían desalinearse.
- `onEditTrigger` opera sobre la hoja del evento (`e.range.getSheet()`), no sobre la hoja activa.

### H-02 · Crítico — La bandeja está desincronizada del histórico

`Solicitudes Pendientes` contiene radicados que **no existen** en `Respuestas_Oficiales`:

- `FCE-SOP-088` — con la fila **corrida una columna**: el teléfono `3028600551` está en `Nombres y apellidos`, la categoría completa en `Ubicación`, `Hola` en `Cantidad de Equipos`. Su `Fecha Solicitud` es `31/12/1969 19:00:00`, es decir *epoch* 0: `new Date()` recibió un valor inválido.
- `FCE-SOP-090` — fecha 15/03/2026, sin contraparte en el histórico (que termina en `FCE-SOP-087`).

`procesarResolucion` busca el radicado en el histórico y si no lo encuentra hace `return` silencioso ([Código.gs:262](Código.gs#L262)). Estos tickets **nunca podrán cerrarse ni notificarse**: quedan fijos en la bandeja para siempre.

Agravante: la fila de 1969 arroja `TIEMPO RESTANTE = -496.920`, y como el orden es ascendente por esa columna, **queda anclada permanentemente en el primer lugar** de la bandeja.

### H-03 · Alto — Estados y etiquetas escritos por versiones anteriores del código

El código solo escribe tres estados: `Pendiente` [133], `Resuelta` [267] y `Notificada` [278]. Sin embargo la hoja contiene `Error: Falla de Envío` en `FCE-SOP-073`, `074` y `075`. Ese valor **no existe en el código actual**.

Lo mismo con los SLA: el código genera `5 DIAS` sin tilde ([Código.gs:63](Código.gs#L63)), pero la hoja guarda `5 DÍAS` con tilde. Como `HORAS_TIEMPO` se consulta por esa cadena ([Código.gs:369](Código.gs#L369)), la búsqueda falla y cae al valor por defecto de 240 horas, que corresponde a 10 días, no a 5. **El cálculo de vencimiento usa el doble del plazo real.**

Conclusión: la hoja acumula datos de al menos dos generaciones del script, y el código actual no es compatible hacia atrás con ellos.

### H-04 · Alto — El archivado no existe

`CONFIG.HOJAS.ARCHIVO` está declarado pero nunca se usa. Al resolver un ticket, `onEditTrigger` ejecuta `h.deleteRow(fila)` ([Código.gs:216](Código.gs#L216)) sin copiar nada a la hoja de archivo. Se pierden de forma irreversible los campos que solo viven en la bandeja, y queda únicamente el registro del histórico.

### H-05 · Alto — `ui.alert` dentro de un disparador instalable

`onEditTrigger` abre un diálogo de confirmación con `SpreadsheetApp.getUi()` ([Código.gs:200](Código.gs#L200)). Los disparadores instalables se ejecutan **bajo la cuenta de quien los creó**, no de quien edita. Si un técnico distinto al que ejecutó `configurarTriggers` marca un ticket como resuelto, el diálogo no aparece en su sesión; la excepción se captura en [Código.gs:249](Código.gs#L249) y el cierre queda a medias, con el nombre escrito pero sin correo ni borrado de fila.

### H-06 · Medio — `logError` envía un correo por cada error

`logError` ([Código.gs:487](Código.gs#L487)) manda un correo a `EMAIL_ADMIN` en cada fallo, y se invoca desde ocho puntos, incluidos los disparadores diarios. Un error persistente genera un correo diario indefinidamente. Con la cuota de MailApp agotada, el propio `logError` falla y su `catch` vacío descarta el aviso: el sistema queda ciego justo cuando más falla.

### H-07 · Medio — Porcentajes sin sentido en la alerta de vencidas

`verificarSolicitudesVencidas` calcula `horasT = horasL - tiempoRestante` y `pct = horasT / horasL * 100` ([Código.gs:370-372](Código.gs#L370-L372)). Con las horas restantes muy negativas que hoy tiene la bandeja (−7.370 sobre un SLA de 48 h), el porcentaje resultante supera el 15.000 %. La alerta diaria llega con cifras ilegibles.

### H-08 · Medio — El radicado depende del número de fila

`const codigo = CONFIG.PREFIJO + String(ultimaFila - 1).padStart(3, "0")` ([Código.gs:132](Código.gs#L132)). El consecutivo se deriva de la posición física de la fila. Si se borra o inserta cualquier fila del histórico, los radicados se repiten o se saltan. Además `padStart(3)` se queda corto a partir de la solicitud 1000.

### H-09 · Medio — La detección de duplicados es frágil

El guardado de `ultimaFilaProcesada` en `PropertiesService` ([Código.gs:95](Código.gs#L95)) compara contra `getLastRow()`. Dos envíos casi simultáneos pueden resolver la misma última fila: uno se procesa dos veces o el otro se pierde. El `LockService` con 10 s de espera ([Código.gs:82](Código.gs#L82)) mitiga pero no elimina la condición de carrera, y si el lock no se obtiene la solicitud se descarta **sin registro alguno**.

### H-10 · Bajo — Encabezados divergentes en la bandeja

El código escribiría `NOMBRE`, `OBSERVACIONES`, `TIEMPO RESTANTE (HRS)` ([Código.gs:162](Código.gs#L162)), pero la hoja real dice `Nombres y apellidos`, `Comentario de Resolucion` y deja la columna 12 sin encabezado. Como esos encabezados solo se escriben cuando la hoja está vacía, la divergencia es permanente y confunde al leer el código contra la hoja.

### H-11 · Bajo — Validación de correo insuficiente

`validarEmail` solo comprueba que la cadena contenga `@` ([Código.gs:499](Código.gs#L499)). Un valor como `a@` pasa la validación y provoca una excepción en `MailApp`, que termina en `logError` y por tanto en otro correo.

### H-12 · Informativo — Datos personales reales en el entorno de pruebas

La hoja de pruebas contiene correos institucionales y teléfonos reales (`aruizba@unal.edu.co`, `3028600551`, entre otros). Cualquier ejecución de prueba envía correos reales a esas direcciones, y los destinatarios administrativos siguen siendo los de producción: `soporte@fce.unal.edu.co` ([Código.gs:19](Código.gs#L19)).

---

## 9. Limitaciones del desarrollo local

| Limitación | Implicación |
|---|---|
| El runtime de Apps Script no existe fuera de Google | No hay ejecución ni depuración local; solo edición y validación de sintaxis |
| La API no puede crear disparadores | `configurarTriggers` debe ejecutarse siempre a mano desde el editor web |
| `scripts.run` no admite funciones con documento activo | Todo el código depende de `getActiveSpreadsheet()`; no es invocable por API |
| `projects.updateContent` reemplaza el proyecto completo | Un `push` sin el manifiesto o sin algún archivo lo elimina |
| El nombre del archivo local define el nombre remoto | `codigo.gs` habría creado un segundo archivo y duplicado las 20 funciones |
| Cuota de MailApp | ~100 correos/día en cuenta gratuita, 1.500 en Workspace |

---

## 10. Recomendaciones

**Inmediatas**

1. Crear una versión (`clasp version`) para tener punto de restauración remoto.
2. Redirigir `EMAIL_ADMIN` a un buzón de pruebas mientras se trabaja.
3. Depurar las filas huérfanas `FCE-SOP-088` y `FCE-SOP-090` de la bandeja.

**Correcciones de fondo**

4. ~~Sustituir la coincidencia exacta de cadenas por normalización (sin tildes, sin puntuación).~~ **Hecho el 15 de septiembre de 2026** (ver H-01). Pendiente de decisión funcional: (a) el formulario de **producción** no ofrece las categorías `INSTALACIÓN Y ALISTAMIENTO` y `CAMBIO DE UBICACIÓN`, que el Excel y el formulario de pruebas sí tienen; (b) el grupo *Usuario* del formulario no está en el Excel; (c) `Secretaría Académica` (pruebas) frente a `Secretaría de Facultad` (producción). Una vez alineados Excel y formularios, ejecutar *Soporte > Auditar formulario* y *Probar cálculo de plazos*; ambos deben quedar sin observaciones.
5. Reemplazar el radicado por fila por un contador en `PropertiesService` con `LockService`. Resuelve H-08.
6. Implementar el archivado antes de `deleteRow`. Resuelve H-04.
7. Sustituir el `ui.alert` por una columna de confirmación o una casilla de verificación. Resuelve H-05.
8. Acumular errores y enviar un único resumen diario en lugar de un correo por error. Resuelve H-06.

**Higiene**

9. Declarar `oauthScopes` explícitos en el manifiesto.
10. Eliminar el despliegue sin uso.
11. Añadir un `onOpen` con menú para `configurarTriggers`, hoy invisible para el usuario final.

---

## 12. Calendario hábil, reloj hábil y ventana del formulario (17 de septiembre de 2026)

Implementación de los requisitos «2. Cortar el tiempo cuando sean fines de semana y festivos» y «3. Bloquear el formulario fuera del horario de atención», planificados con Spec-Driven Development en [`specs/`](specs/README.md). Decisiones de producto en `specs/README.md`; requisitos, diseño y tareas por feature en sus carpetas.

### 12.1 Archivos

| Archivo | Contenido |
|---|---|
| `Calendario.gs` | Festivos nacionales de Colombia (fijos, Ley Emiliani, relativos a la Pascua por Meeus), pestaña `Festivos` editable con generador idempotente por año, `esDiaHabil`, `horasHabilesEntre`, `sumarHorasHabiles`, regla de ventana (`ventanaAbierta`, `proximaApertura`, `proximoCierre`, `transicionesDelDia`), fórmula `LET` equivalente para la hoja, formato de fechas en español, `probarCalendario` (45 casos), `probarFormulaHorasHabiles`. |
| `Reloj.gs` | `calcularReloj` (inicio efectivo y fecha límite en horas hábiles), `relojDesdeFila`, `clasificarParaAlerta`, escritura en Pendientes por mapa de columnas, `probarRelojHabil` (39 casos). |
| `Ventana.gs` | Programador diario (6:00) que crea disparadores puntuales exactos de apertura (8:00) y cierre (15:30), reconciliación horaria, modo MANUAL persistido, bitácora `Bitácora_Ventana`, mensaje de cierre con fecha de reapertura, aviso de error una vez al día, menú, `probarVentana` (38 casos) con dependencias simuladas. |
| `Código.gs` | Configuración (`CONFIG.VENTANA`, `CONFIG.COL_PENDIENTES`, `ENCABEZADOS_PENDIENTES`, `ETIQUETAS_PENDIENTES`, hojas `Festivos` y `Bitácora_Ventana`), detección de columnas genérica (`detectarColumnasEn`) aplicada también a Pendientes, `onFormSubmit`, `onEditTrigger`, alerta diaria, correo, migración, menú, `probarTodo`. |
| `Servicios.gs` | Catálogo del Excel como oráculo independiente (`CAT_UBICACIONES`, `CAT_SERVICIOS`, `CAT_CATEGORIAS`, `CAT_CANTIDAD`, `CAT_TIEMPOS`) y `probarServicios` (5.530 casos). Ver §13. |
| `tests/` | Arnés Node (`harness.js`, `run.js`) para correr las suites fuera de Sheets y prueba de mutación (`mutacion.js`). No se sube con clasp. |

### 12.2 Semántica del plazo

Un día hábil aporta 24 h; sábados, domingos y las fechas de `Festivos` aportan 0 h. Las etiquetas y sus horas no cambian (`24 HORAS` = 24 h hábiles, `5 DIAS` = 120 h hábiles). El reloj arranca en la marca temporal si la ventana estaba abierta; si no, en la siguiente apertura, y el correo al solicitante lo indica. Ejemplo: solicitud del viernes 16-oct-2026 a las 16:00 con `24 HORAS` → inicio lunes 19 a las 8:00 → fecha límite martes 20 a las 8:00.

### 12.3 Modelo de datos de `Solicitudes Pendientes`

Columnas localizadas por encabezado; el script crea las que falten. Nuevas: `INICIO RELOJ` (13) y `FECHA LÍMITE` (14, clave de orden de la bandeja). La columna 12 pasa a `HORAS HÁBILES RESTANTES`, con una fórmula `LET` + `NETWORKDAYS.INTL` que reproduce `horasHabilesEntre(NOW(), límite)` y devuelve valores negativos cuando la solicitud está vencida. *Recalcular plazos de pendientes* migra la bandeja existente conservando `INICIO RELOJ` cuando ya existe; las filas con fecha de solicitud inválida (p. ej. `31/12/1969`) se marcan y no se recalculan.

### 12.4 Alerta diaria

`verificarSolicitudesVencidas` calcula con horas hábiles y separa vencidas (con horas de retraso) de próximas a vencer (≤ 20 % del plazo); el porcentaje está acotado a 0–100, lo que cierra **H-07**. Añade avisos cuando hay filas sin fecha límite (pendientes de migrar) o años sin festivos generados.

### 12.5 Ventana del formulario

Regla generalizada: cierra a las 15:30 de todo día hábil seguido de uno no hábil y abre a las 8:00 de todo día hábil precedido de uno no hábil; permanece abierto de noche entre días hábiles consecutivos; cerrado todo día no hábil. Disparadores: `programarVentana` (diario 6:00), `reconciliarVentana` (cada hora) y los puntuales `abrirFormulario` / `cerrarFormulario`, que se eliminan a sí mismos. Formulario objetivo en `CONFIG.VENTANA.FORMULARIO` (hoy el de pruebas).

**Paso a producción:** cambiar `CONFIG.VENTANA.FORMULARIO` al ID `1gs6GlaxJqFyJSH1dCgc9gZPax-c4iRuEsZoxHKRk0-M`, verificar que la cuenta que ejecutará *Configurar triggers* sea propietaria o editora de ese formulario, ejecutar *Configurar triggers* y comprobar *Formulario → Estado de la ventana*. El script debe vivir en la hoja de producción (es contenedor): hay que copiar los cinco `.gs` allí.

### 12.6 Pruebas

`Soporte → Pruebas → Probar todo` ejecuta las seis suites (44.372 casos) sin tocar formulario ni disparadores reales. `Fórmula de horas hábiles ↔ script` compara la fórmula de la hoja con el cálculo del script en una hoja temporal. Las mismas suites corren en Node con un arnés que simula los servicios de Google (`tests/`, `npm test`).

---

## 13. Verificación exhaustiva del catálogo de servicios (22 de septiembre de 2026)

### 13.1 Qué se probó y por qué

`PUNTAJES`, `ESCALA_CANTIDAD` y `ESCALA_TIEMPOS` son una transcripción manual de las cuatro pestañas de puntaje de `TIEMPOS DE RESPUESTA.xlsx`. Esa transcripción no tenía verificación: una edición del Excel o del código podía dejarlas divergentes sin señal alguna, y el efecto —un plazo mal asignado— es invisible hasta que alguien reclama.

`Servicios.gs` cierra ese hueco. Contiene un **oráculo independiente**: las cuatro pestañas transcritas otra vez, a mano, en `CAT_UBICACIONES` (38), `CAT_SERVICIOS` (31), `CAT_CANTIDAD` (4) y `CAT_TIEMPOS` (8). El archivo no lee `PUNTAJES` para construir sus expectativas; la duplicación es el mecanismo de la prueba, no un descuido. `probarServicios()` compara las dos fuentes y, cuando difieren, nombra la fila exacta.

### 13.2 Bloques de la suite (5.530 casos)

| Bloque | Qué verifica |
|---|---|
| B1 | Los 8 tramos de `TIEMPOS DE RESPUESTA` en sus fronteras (1, 10, 11, 20, … 70, 71, 200, 1000) y las horas asociadas a cada etiqueta |
| B2 | Los 4 tramos de `CANTIDAD DE EQUIPOS` en sus fronteras, escritos como número y como texto libre («14 equipos»), más entradas degeneradas (vacío, 0, negativo, nulo, texto sin número) |
| B3 | Las 38 ubicaciones × cada grafía (Excel, canónica, alias) × cada forma de escribir el edificio (`310`, `ED_310`, `Edificio 310`, numérico): puntaje, nombre canónico resuelto y ausencia de aviso |
| B4 | Los 31 servicios × cada grafía × cada grafía de su categoría (nombre largo del Excel con descripción, nombre corto, rango con nombre de `tabla_serv`, canónico) |
| B5 | Los selectores de grupo (`Hardware`, `Software`, `Internet y Conectividad`, `Usuario`) nunca puntúan como servicio, ni solos ni acompañando al servicio real en otra columna |
| B6 | Las 3 categorías de opción única resuelven con servicio vacío; las 7 de opción múltiple **no** adivinan y avisan |
| B7 | Homónimos: cada texto que aparece con puntajes distintos en varias categorías resuelve según su categoría, y queda sin resolver cuando la categoría no se reconoce |
| B8 | Matriz completa 38 ubicaciones × 31 servicios × 4 tramos = **4.712 casos**: suma de componentes y etiqueta de plazo contra el oráculo del Excel |
| B9 | Completitud bidireccional: ninguna entrada del Excel falta en `PUNTAJES` y ninguna entrada de `PUNTAJES` sobra respecto del catálogo, en ubicaciones, servicios y categorías |
| B10 | Robustez: entradas desconocidas, vacías y nulas nunca dan 0 ni etiqueta vacía; ubicación en el edificio equivocado se resuelve pero deja aviso; nombres ambiguos entre edificios quedan sin resolver |
| B11 | Todo servicio del catálogo aparece en `LISTA_SERVICIOS` (desplegable de la bandeja) |

### 13.3 Prueba de mutación

Una suite que siempre pasa no demuestra nada. `tests/mutacion.js` introduce ocho averías realistas de una en una en `Código.gs` —un puntaje cambiado, una frontera de escala corrida, un alias borrado, un grupo retirado de `GRUPOS_NO_SERVICIO`, `PUNTAJE_SIN_COINCIDENCIA` de vuelta a 0— y verifica que la suite falla en cada caso. **8/8 detectadas.** El script restaura el archivo al terminar, incluso si aborta. *(Ampliado a 17 mutaciones sobre tres suites en la §14.4.)*

La octava mutación expuso un defecto de la propia suite: la aserción del puntaje neutro se comparaba contra `PUNTAJE_SIN_COINCIDENCIA`, de modo que cambiar la constante no la hacía fallar. Se reemplazó por el contrato de **H-01**: la constante debe ser estrictamente positiva y una solicitud enteramente irreconocible no puede caer en el tramo más urgente.

### 13.4 Hallazgo

#### H-13 · Bajo — Cantidad negativa saltaba de tramo *(corregido)*

`getPuntajeCantidad` extraía el número con `/\d+/`, que no captura el signo: `-5` se leía como `5` y devolvía 10 puntos (tramo «4 A 14») en lugar del tramo mínimo, contradiciendo el contrato documentado en el propio comentario de la función («sin número o ≤ 0 se trata como el tramo mínimo»). Corregido a `/-?\d+/` en `Código.gs:695`. Impacto real bajo —requiere que alguien escriba un negativo en «cantidad de equipos»— y no hay constancia de que haya ocurrido; se corrige porque el comportamiento no coincidía con la intención declarada.

### 13.5 Puntos abiertos que la suite deja documentados

Ninguno es un defecto del código: son decisiones que corresponden al responsable del proceso.

1. **Dos servicios sin respaldo en el Excel.** El grupo «Usuario» del formulario («Creación de usuarios en Windows» → 10, «Falla de inicio de sesión en Windows» → 5) no existe en el árbol de servicios. Están marcados con `extension: true` en `CAT_SERVICIOS` y B9 exige que sigan siendo exactamente dos: si el formulario agrega una opción sin respaldo documental, la suite lo detecta. Falta oficializar esos dos puntajes en el Excel.
2. **Error de dedo en el Excel.** La fila «OFICINA AREA C. DE CONTABILILIDAD Y F.» (debería decir CONTABILIDAD). El código acepta ambas grafías; conviene corregir el original.
3. **Nombres ambiguos entre edificios.** «OFICINAS DOCENTES» existe en 311 (20 puntos) y en 238 (10). Solo el edificio los distingue: si esa columna llega vacía, la solicitud queda sin resolver y marcada para revisión. Es el comportamiento correcto, pero conviene que el formulario haga obligatorio el edificio.
4. **Homónimos entre categorías.** «Mantenimiento Preventivo» (30 en impresoras, 10 en video) y «Otro» (20 en impresoras vía alias `Otros`, 10 en software y en video). Se resuelven bien mientras la categoría llegue; sin ella quedan sin resolver, como debe ser.


---

## 14. Tiempos de respuesta por servicio y verificación contra el `.xlsx` (22 de septiembre de 2026)

### 14.1 Los dos huecos que quedaban

La §13 dejó el catálogo comparado contra un oráculo independiente, pero con dos límites:

1. **El oráculo también era código.** `CAT_*` es una segunda transcripción del Excel escrita a mano. Si alguien cambia un puntaje en `PUNTAJES` y, para «arreglar la prueba», lo cambia igual en `CAT_*`, las dos fuentes vuelven a coincidir entre ellas y la suite se pone verde mientras el `.xlsx` ya dice otra cosa. Nada leía el archivo real.
2. **La prueba se detenía en la etiqueta.** `probarServicios()` verifica el puntaje y el nombre del plazo («72 HORAS»), pero no las **horas** asociadas ni la **fecha límite** que se le promete al solicitante en el correo. La pestaña se llama «TIEMPOS DE RESPUESTA» y ese tramo final no estaba cubierto.

### 14.2 `Tiempos.gs` — `probarTiempos()` (38.667 casos)

Recorre el camino completo *puntaje → plazo → horas hábiles → fecha límite*, para cada servicio del árbol en todas sus grafías.

| Bloque | Qué verifica |
|---|---|
| TR1 | Matriz 38 ubicaciones × 31 servicios × 4 tramos con los nombres **canónicos** (`probarServicios` la recorre con los del Excel), comprobando además el campo `horas`, que es el que alimenta la fecha límite |
| TR2 | **Monotonía.** Subir de tramo de cantidad, o pasar a una ubicación de más puntos, nunca puede acortar el plazo. Una escala invertida deja la suma cuadrando y solo se ve aquí |
| TR3 | Las fronteras de cantidad caen exactamente donde dice el Excel: dentro de «1 A 3», «4 A 14», «15 A 30» y «MAS DE 30» el plazo no se mueve, y un equipo más que el tope sí cambia de tramo |
| TR4 | Cada servicio × cada una de sus grafías × cada grafía de su categoría da el mismo plazo, las mismas horas y el mismo nombre canónico, sin avisos |
| TR5 | Cada ubicación × cada grafía × cada forma de escribir el edificio, contra servicios de cada puntaje distinto |
| TR6 | Etiqueta → horas, incluidas las grafías antiguas de la hoja («5 DÍAS» con tilde, minúsculas, con espacios). Una etiqueta irreconocible cae en el plazo más largo, nunca en el más urgente |
| TR7 | **Fecha límite.** Los 8 plazos del Excel desde 8 instantes distintos (lunes, viernes por la tarde, sábado, medianoche, víspera de festivo, festivo) |
| TR8 | Cantidad ausente, cero, negativa o no numérica: plazo del tramo mínimo, nunca vacío ni 0 horas, para los 31 servicios |
| TR9 | **Alcance.** Puntaje mínimo y máximo alcanzable por cada servicio y los plazos que produce, contra los extremos que predice el catálogo |

TR7 no compara contra otra implementación de la aritmética hábil —sería copiar el algoritmo y probarlo contra sí mismo— sino contra su **contrato**: la fecha límite es el primer instante con exactamente `horas` horas hábiles desde el inicio, así que `horasHabilesEntre(inicio, límite)` debe dar justo esas horas y un minuto antes debe faltar tiempo. Cualquier implementación correcta lo cumple; ninguna incorrecta lo hace.

### 14.3 `tests/excel.js` — el `.xlsx` como fuente de verdad (4.700 comprobaciones)

Abre `TIEMPOS DE RESPUESTA.xlsx` del disco y reconstruye sus seis pestañas, incluidas las dos ocultas (`tabla_ub` y `tabla_serv`, que alimentan los desplegables del formulario). `tests/xlsx.js` implementa el lector: un `.xlsx` es un ZIP con XML dentro, y se abre con `zlib` sin ninguna dependencia externa —el proyecto sigue sin `node_modules`.

| Bloque | Qué verifica |
|---|---|
| E0 | Las seis pestañas existen y conservan sus encabezados |
| E1 | `LISTA DE UBICACIONES` ↔ `CAT_UBICACIONES`: 38 filas, en los dos sentidos, con su edificio y su puntaje |
| E2 | `ÁRBOL DE SERVICIOS` ↔ `CAT_SERVICIOS`: 29 hojas con su categoría literal, su grupo y su puntaje (las 2 extensiones del formulario quedan excluidas por diseño) |
| E3 | `CANTIDAD DE EQUIPOS` ↔ `CAT_CANTIDAD`, incluidos los límites de cada tramo |
| E4 | `TIEMPOS DE RESPUESTA` ↔ `CAT_TIEMPOS`, y que los 8 tramos se encadenen desde 1 sin huecos ni solapes |
| E5 | `tabla_ub` ↔ `VARIANTES_EDIFICIO`: los tres rangos con nombre listan exactamente las ubicaciones de su edificio |
| E6 | `tabla_serv`: cada columna corresponde a una categoría declarada y cada valor es o un servicio de esa categoría o un selector de grupo reconocido |
| E7 | Matriz de **4.408 combinaciones leídas del archivo**: cada ubicación × cada hoja del árbol × cada tramo, con los textos tal cual están en las celdas. El puntaje y el plazo esperados salen del propio Excel |

E2 compara la categoría **literal**, sin recortar: el Excel trae un espacio inicial en `" VIDEO - PROYECTORES O PANTALLAS (…)"` y esa rareza tiene que seguir declarada, porque es lo que el formulario envía.

Esta suite solo corre en Node (`npm run test:excel`; dentro de Sheets no hay acceso al archivo). Queda incluida en `npm test`.

### 14.4 Prueba de mutación ampliada: 17/17

`tests/mutacion.js` pasa de 8 a 17 averías y ahora puede tocar varios archivos a la vez y dirigir cada una a la suite que debería cazarla. Las cinco nuevas de `probarTiempos` incluyen las horas de un plazo cambiadas dejando la etiqueta intacta, la escala invertida, y dos averías en `sumarHorasHabiles` (fecha límite corrida una hora; deja de saltar los días no hábiles).

Las cuatro últimas son las que justifican la §14.3. Cambian **a la vez** el motor y su oráculo en el código —por ejemplo, «Biblioteca» a 25 puntos en `PUNTAJES` y en `CAT_UBICACIONES`— de modo que `probarServicios()` se queda **en verde**. El script lo comprueba explícitamente: si la suite del catálogo también las detectara, la mutación no demostraría nada y se marca con un aviso. Las cuatro las caza únicamente `tests/excel.js`, que es el único punto del proyecto que mira el archivo original.

### 14.5 `TIEMPOS_POR_SERVICIO.md`

Documento generado (`npm run matriz`), no editable a mano: el plazo de los 31 servicios para cualquier ubicación y cualquier cantidad. Como el plazo depende solo del puntaje, las 38 ubicaciones colapsan en los 5 puntajes distintos (1, 5, 10, 20, 30) y la matriz completa de cada servicio cabe en una tabla de 5 × 4 sin perder ningún caso. Incluye las escalas leídas del `.xlsx` y un resumen del alcance de cada servicio.

### 14.6 Observaciones que deja la matriz

Ninguna es un defecto del código; las tres salen del propio Excel y corresponden al responsable del proceso.

1. **«Compras» y «Directrices Técnicas» solo pueden ser «NO ESTABLECIDO».** Con 70 puntos de servicio, el mínimo posible es 70 + 1 (ubicación de menos peso) + 1 (1 a 3 equipos) = 72, por encima del último tramo. Ni la ubicación ni la cantidad cambian nada. Si la intención era que un concepto técnico para compras en Decanatura se atendiera «durante el semestre» y no «sin plazo establecido», hay que bajar el puntaje del servicio o subir el techo del tramo 61–70.
2. **«NO ESTABLECIDO» y «DURANTE EL SEMESTRE ACADÉMICO» duran lo mismo.** Ambas se traducen a 2.160 horas hábiles (90 días hábiles) en `ESCALA_TIEMPOS`. Son etiquetas distintas con el mismo vencimiento real, de modo que la alerta de vencidas las trata igual. Es una decisión heredada, no un error, pero conviene que sea explícita: «NO ESTABLECIDO» significa hoy «90 días hábiles».
3. **El tramo «24 HORAS» es casi inalcanzable.** Solo lo alcanzan los servicios de 5 puntos en ubicaciones de 1 o 5 puntos (Decanatura, Vicedecanatura, Sala de Juntas, Sala de Videoconferencias, Secretaría de Facultad, Unidad Administrativa) y con 1 a 3 equipos. Ninguna solicitud de sala de informática, biblioteca o salones puede recibir nunca el plazo más urgente.

---

## 15. Informe de verificación dentro de la hoja (22 de septiembre de 2026)

### 15.1 Por qué

Las 44.372 comprobaciones de las suites no tocan Google: son JavaScript puro. Todo lo que solo existe dentro de Sheets —la pestaña `Festivos`, las columnas reales, la bandeja, los disparadores, el formulario— quedaba fuera, listado en `specs/README.md` como una secuencia de cinco pasos manuales que había que ejecutar en orden y cuyo resultado se leía en cinco diálogos distintos.

`Verificacion.gs` los agrupa en una sola entrada de menú y deja el resultado en una pestaña (`Informe_Verificación`), que puede copiarse entera.

### 15.2 Los doce pasos

| Paso | Grupo | Qué comprueba |
|---|---|---|
| 1. Entorno | Diagnóstico | Hoja, zona horaria, cuenta que ejecuta, formulario que gobierna la ventana (avisa si no es el de pruebas) |
| 2. Hojas del libro | Diagnóstico | Las seis hojas de `CONFIG.HOJAS`, con su número de filas; error si faltan las dos imprescindibles |
| 3. Columnas detectadas | Diagnóstico | Qué columna reconoce el script para cada campo, en el histórico y en la bandeja, y qué encabezados ha tenido que crear |
| 4. Pestaña Festivos | Diagnóstico | Filas, fechas inválidas, años con festivos nacionales y cuáles faltan |
| 5. Generar festivos | **Corrección** | Genera los años que falten |
| 6. Pruebas automáticas | Diagnóstico | Las seis suites, con su recuento |
| 6b. Fórmula ↔ script | Diagnóstico | La comprobación que necesita Sheets de verdad, separada del resto. Descubrió **H-14** (§16) |
| 7. Bandeja de pendientes | Diagnóstico | Solicitudes sin fecha límite, con fecha de solicitud inválida, vencidas y próximas a vencer |
| 8. Recalcular plazos | **Corrección** | `recalcularPendientes()`, con el listado de lo que cambió |
| 9. Bandeja tras el recálculo | Diagnóstico | Repite el paso 7 para ver el efecto (solo si hubo corrección) |
| 10. Disparadores | Diagnóstico | Los seis permanentes esperados, los que faltan, los que sobran y los puntuales de la ventana |
| 11. Ventana del formulario | Diagnóstico | Estado real contra el que dicta la regla, modo, próxima apertura y cierre |
| 12. Opciones de los formularios | Diagnóstico | Audita **los dos** formularios contra el catálogo y vuelca ambos en `Auditoría_Formulario`. Descubrió **H-15** (§16) |

### 15.3 Qué no hace por su cuenta

No instala disparadores: `configurarTriggers()` borra **todos** los existentes y manda correo, así que se reporta y se deja al menú. Tampoco abre ni cierra el formulario. El informe nombra explícitamente lo que falta y con qué opción del menú se arregla.

El diagnóstico es de solo lectura con una excepción heredada: `detectarColumnas()` etiqueta las columnas propias del script (`RADICADO`, `ESTADO`, `FECHA LÍMITE`…) cuando faltan. Nunca sobrescribe una celda con contenido, y el paso 3 informa celda por celda cuáles creó, para que no aparezcan columnas nuevas sin explicación.

### 15.4 Cambios de apoyo en `Código.gs`

- `mostrarResultado` acepta una captura (`_capturaResultados`): cuando está activa, el texto va a un array en vez de a un diálogo. Es lo que permite ejecutar las seis suites de corrido y recoger su salida sin abrir seis ventanas.
- `auditarOpcionesFormulario` se partió en `filasAuditoriaFormulario(formId)` (recorre y devuelve filas, no toca la hoja) y `escribirAuditoria(filas)` (vuelca). Antes, auditar los dos formularios seguidos dejaba en la hoja solo el segundo; ahora el paso 12 los escribe juntos.

### 15.5 `tests/verificacion.js`

Fuera de Sheets no hay nada que diagnosticar, así que la prueba no comprueba que el diagnóstico acierte, sino lo contrario: que **un entorno roto no tumbe la herramienta con la que se diagnostica un entorno roto**. Ejecuta el informe contra un libro vacío y contra uno mínimo, y exige que devuelva los doce pasos, que ninguno propague una excepción, que ninguno quede sin detalle, que las seis suites puras sigan en verde sin una sola hoja y que los pasos de corrección no se ejecuten sin autorización. **86 comprobaciones.**

---

## 16. Hallazgos de la primera verificación en la hoja real (22 de septiembre de 2026)

La primera ejecución de *Soporte → Verificación completa…* sobre `Solicitudes Soporte Técnico (pruebas)` dejó las seis suites en verde (44.372 casos **dentro de Sheets**, no solo en Node) y destapó dos defectos que ninguna prueba local podía ver, más un dato corrupto.

### H-14 · Alto — La fórmula de horas restantes no se analiza en un archivo en español *(corregido)*

**Síntoma.** Los 6 casos de `probarFormulaHorasHabiles` devolvieron `#ERROR!`. Los seis idénticos, y el `IFERROR` de la propia fórmula no los atrapó.

**Causa.** `#ERROR!` es el error de *análisis* de Google Sheets, no de cálculo: la fórmula no llegó a ejecutarse, y por eso `IFERROR` —que solo captura errores de evaluación— no podía hacer nada. Sheets analiza las fórmulas en el idioma del archivo: donde el separador decimal es la coma (es_CO, es_ES…), el separador de argumentos es `;` y no `,`. `Range.setFormula()` **no traduce**. `formulaHorasHabilesRestantes` las escribía siempre con comas.

**Impacto.** La columna `HORAS HÁBILES RESTANTES` de la bandeja mostraba `#ERROR!` en todas las filas. La alerta diaria de vencidas no dependía de ella —`verificarSolicitudesVencidas` calcula con el script—, así que el fallo era puramente visual, pero dejaba sin información la única columna que el técnico mira para priorizar.

**Corrección.** `separadorDeFormula()` deduce el separador del idioma del archivo (`getSpreadsheetLocale()` + `toLocaleString`), cacheado y sobrescribible por la propiedad de script `formula.separador`. `formulaHorasHabilesRestantes` se reescribió componiendo los argumentos con ese separador; con coma produce **exactamente la misma cadena que antes**, así que el cambio no altera el comportamiento en un archivo en inglés.

Además, `probarFormulaHorasHabiles` ya no se fía de la deducción: se lo pregunta a la hoja. Escribe `=SUM(1;2)` en una celda temporal y mira si da 3. Se usa punto y coma y no coma en la sonda porque `=SUM(1,2)` en español se leería como `SUM(1,2)` = 1,2 y devolvería un número igualmente, sin delatar nada. Si lo que encuentra no coincide con lo deducido, lo corrige, lo guarda en las propiedades del script y lo dice en el informe.

**Prueba.** CA-CAL-09 en `probarCalendario` genera la fórmula con los dos separadores y verifica, en cada uno, que no se cuele el separador contrario, que los paréntesis cuadren, que apunte a la celda correcta y que `LET` reciba un número impar de argumentos. Tres mutaciones nuevas lo confirman.

### H-15 · Medio — El auditor de formularios confundía «Subcategoría» con «categoría» *(corregido)*

**Síntoma.** El paso 12 marcó **9 opciones SIN PUNTAJE en los dos formularios**: las siete de las subcategorías Hardware / Software / Conectividad y las dos de Usuario.

**Causa.** Un falso positivo del auditor, no un problema de los formularios. `auditarOpcionesFormulario` decidía qué se estaba preguntando con `/categor/i.test(pregunta)`, y el título «Subcategoría Hardware:» **contiene** «categor». Las opciones de esas preguntas —que son servicios— se comprobaban contra el índice de categorías, donde evidentemente no están.

**Por qué importa aunque no rompiera nada en producción.** En ejecución el motor no usa el título de la pregunta, sino la columna `CATEGORIA` de la hoja, así que las solicitudes reales siempre se puntuaron bien. El daño era del diagnóstico: nueve falsos positivos permanentes enseñan a ignorar la salida del auditor, que es exactamente lo que no debe pasar con una herramienta de verificación.

**Corrección.** El rol de cada pregunta se decide una sola vez en `rolDePregunta(pregunta)`, que descarta `/subcategor/i` antes de mirar nada más. Una subcategoría siempre pregunta por un servicio.

**Prueba.** Nueve casos en `probarCalculo` fijan el rol esperado de los títulos reales de los dos formularios, incluida la variante en mayúsculas. Una mutación confirma que quitar la línea de `subcategor` vuelve a romperlo.

### Dato corrupto — `FCE-SOP-088` con fecha de solicitud en 1969

La bandeja tiene una fila cuya `FECHA SOLICITUD` es `1969-12-31 19:00 GMT-5`, es decir el instante cero de Unix: la celda está vacía o contiene un 0 formateado como fecha. `recalcularPendientes` la detecta, la marca en amarillo con una nota y la deja fuera del recálculo, que es el comportamiento correcto: inventarle una fecha sería peor.

No es un defecto del código y no se puede arreglar desde aquí. **Corresponde corregir la celda a mano** con la fecha real de la solicitud (está en `Respuestas_Oficiales`, columna `Marca temporal`, buscando el radicado) y volver a ejecutar la verificación.

### Cierre

Segunda ejecución tras corregir H-14 y H-15, instalar los disparadores desde el menú y arreglar a mano la fecha de `FCE-SOP-088`:

> **0 errores, 0 avisos, 13 pasos correctos.**

Con eso queda verificado dentro de Sheets todo lo que `specs/README.md` tenía pendiente desde el 17 de septiembre: festivos de 2026 y 2027 generados, las seis suites en verde **en el entorno real** (44.372 casos), la fórmula de la hoja coincidiendo con el script, la bandeja migrada con `INICIO RELOJ` y `FECHA LÍMITE`, los seis disparadores instalados, la ventana en el estado que dicta la regla y las opciones de los dos formularios con puntaje.

Los disparadores siguen sin instalarse desde la verificación: `configurarTriggers()` borra todos los existentes y manda correo, así que se ejecuta aparte y la verificación se limita a confirmar el resultado.

---

## 17. H-16 — La columna de horas restantes se vaciaba al llegar una solicitud nueva

Reportado en uso, después de que la verificación cerrara en verde: `HORAS HÁBILES RESTANTES` aparecía en blanco en las solicitudes nuevas.

### Causa

`formulaHorasHabilesRestantes(fila, columnaLimite)` escribía la fila **a fuego**: la fila 7 recibía `=IF(N7="", …)`. Justo después de escribirla, `onFormSubmit` llama a `ordenarPendientesPorPrioridad()`, que ordena la bandeja por fecha límite con `Range.sort()`. Al mover las filas, las fórmulas viajan sin que sus referencias se reescriban de forma fiable: una fórmula que decía `N7` termina en otra fila leyendo la fecha límite de una fila ajena.

El síntoma es engañoso porque **no da error**. El primer término de la fórmula era `IF(N7="","",…)`: si la celda a la que acaba apuntando está vacía, devuelve cadena vacía y la celda simplemente se ve en blanco. No hay `#REF!`, ni `#ERROR!`, ni nada que delate el problema; la columna miente en silencio.

Es un defecto latente desde que se escribió la fórmula (spec 01). Solo se hizo visible ahora porque hasta H-14 la columna entera mostraba `#ERROR!` y tapaba este segundo fallo.

### Corrección

La fecha límite se lee con `INDIRECT("N"&ROW())`. La fórmula pasa a ser **idéntica en todas las filas** y siempre lee la suya, así que reordenar la bandeja deja de afectarla.

El guardia cambia de `N7=""` a `NOT(ISNUMBER(…))`: una celda vacía leída con `INDIRECT` llega como `0`, no como `""`, de modo que la comparación anterior habría dejado de proteger. `ISNUMBER` cubre además el caso de que alguien escriba texto en la fecha límite.

`INDIRECT` es volátil y no se recalcula con la eficiencia de una referencia directa; en una bandeja de solicitudes pendientes —decenas de filas— es irrelevante frente a la garantía de que la columna dice la verdad.

### Pruebas

- CA-CAL-09 exige que la fórmula lea su fila con `INDIRECT("N"&ROW())` y, además, que **no contenga ninguna referencia a una fila concreta**: cualquier vuelta atrás la deja en rojo aunque se escriba de otra manera.
- Dos mutaciones: volver a fijar el número de fila, y descuadrar los paréntesis.
- **Paso 9b del informe de verificación**, nuevo: recorre la columna celda por celda en la hoja real y compara cada fórmula con la que el script escribe hoy. Distingue tres fallos que a simple vista son el mismo —celda sin fórmula, fórmula distinta de la esperada, y fórmula que no devuelve un número— y señala la fila y el radicado. Las filas sin fecha límite se cuentan aparte, porque ahí el blanco es correcto.

El paso 9b es la lección de fondo: la verificación daba 13/13 en verde mientras esta columna estaba rota, porque ningún paso miraba el **contenido** de las celdas calculadas, solo los datos. Una columna de fórmulas necesita que alguien compruebe las fórmulas.
