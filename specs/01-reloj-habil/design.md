# 01 · Reloj hábil — Diseño

## 1. Modelo de datos: `Solicitudes Pendientes`

Estado actual (12 columnas, por posición) y objetivo (14, por encabezado):

| # | Encabezado | Cambio |
|---|---|---|
| 1 | RADICADO | — |
| 2 | NOMBRE | — |
| 3 | EDIFICIO | — |
| 4 | UBICACIÓN | — |
| 5 | SERVICIO | — |
| 6 | CANTIDAD | — |
| 7 | COMENTARIOS | — |
| 8 | TIEMPO MÁXIMO | — (etiqueta del plazo) |
| 9 | FECHA SOLICITUD | — (marca temporal del formulario) |
| 10 | RESUELTO POR | — |
| 11 | OBSERVACIONES | — |
| 12 | **HORAS HÁBILES RESTANTES** | renombrada; fórmula `LET` (00 §5) sobre la columna 14 |
| 13 | **INICIO RELOJ** | nueva; fecha-hora `dd/mm/yyyy hh:mm` |
| 14 | **FECHA LÍMITE** | nueva; fecha-hora; clave de orden |

`CONFIG.ENCABEZADOS_PENDIENTES` (regex por campo) y `detectarColumnasPendientes(hoja)`, reutilizando la misma mecánica de `detectarColumnas`: encabezados nuevos se crean al final si faltan; el encabezado `TIEMPO RESTANTE (HRS)` se reconoce como alias de `HORAS HÁBILES RESTANTES` y se renombra en la migración. `onEditTrigger` deja de usar `col === 10` y `col === 5` fijos: compara contra `COLP.RESPONSABLE` y `COLP.SERVICIO`.

## 2. Flujo en `onFormSubmit`

```
marca        = fila[COL.TIMESTAMP]                  // Date del formulario
calculo      = calcularPuntaje(...)                 // sin cambios
inicioReloj  = ventanaAbierta(marca) ? marca : proximaApertura(marca)
fechaLimite  = sumarHorasHabiles(inicioReloj, calculo.horas)
fueraVentana = inicioReloj > marca
```

Escritura en Pendientes: `[..., tiempo, marca, "", "", formulaRestante, inicioReloj, fechaLimite]`, con formato de fecha en 9, 13 y 14 y `0.00` en 12. La fórmula se construye con `formulaHorasHabilesRestantes(fila, COLP)` que sustituye la letra de la columna 14 y el rango `Festivos!$A$2:$A`.

Si `fueraVentana`: nota en RADICADO («Recibida fuera del horario de atención; el plazo cuenta desde …»), sin fondo amarillo (no es un error) y sin correo al administrador.

## 3. Plantilla de confirmación

Nuevos parámetros: `fechaLimite`, `inicioReloj`, `fueraVentana`. Formato de fecha: `formatearFechaLarga(d)` → «martes 20 de octubre de 2026, 8:00 a. m.» construido con `Utilities.formatDate(d, "America/Bogota", "EEEE d 'de' MMMM 'de' yyyy, h:mm a")` y un mapa de nombres en español (Apps Script formatea en inglés por defecto), reemplazando `AM/PM` por «a. m./p. m.».

Bloque añadido a la lista de detalles:

```
<li><strong>Tiempo estimado de respuesta:</strong> 24 HORAS (en días hábiles)</li>
<li><strong>Fecha límite estimada:</strong> martes 20 de octubre de 2026, 8:00 a. m.</li>
```

y, solo si `fueraVentana`, el párrafo de REL-11.

## 4. Alerta diaria (`verificarSolicitudesVencidas`)

```
COLP = detectarColumnasPendientes(hoja)
para cada fila con RADICADO y FECHA LÍMITE válida:
  total     = horasDeTiempo(TIEMPO MÁXIMO)
  restantes = horasHabilesEntre(ahora, FECHA LÍMITE)
  si restantes <= 0:              vencidas.push({..., retraso: −restantes, pct: 100})
  si 0 < restantes <= 0.2·total:  proximas.push({..., restantes, pct: round((total − restantes)/total·100)})
filas sin FECHA LÍMITE → pendientesDeMigrar (se listan al final del correo)
```

Plantilla `alertaVencidas` con dos tablas (vencidas / próximas a vencer), columnas: radicado, usuario, ubicación, plazo, fecha límite, horas restantes o de retraso, %. Se elimina el cálculo `horasT = horasL − tiempoRestante` (origen de los porcentajes > 15 000 %, H-07).

## 5. Cambio de servicio (`onEditTrigger`, caso 2)

```
inicio      = fila[COLP.INICIO_RELOJ]  (si vacío: aplicar REL-02 sobre FECHA SOLICITUD y persistir)
calculo     = calcularPuntaje({... servicio: nuevoServicio ...})
fechaLimite = sumarHorasHabiles(inicio, calculo.horas)
escribir TIEMPO MÁXIMO, FECHA LÍMITE, fórmula; marcar/limpiar revisión; ordenar
```

## 6. Migración (`recalcularPendientes`)

Para cada fila: si `FECHA SOLICITUD` no es fecha válida o es anterior a 2020 → fondo amarillo + nota «fecha de solicitud inválida; corrija la fecha y recalcule», continuar. Si no: `inicio = INICIO RELOJ || (ventanaAbierta(marca) ? marca : proximaApertura(marca))`; recalcular como en §5; renombrar encabezado 12 si aún dice `TIEMPO RESTANTE (HRS)`. Resumen en pantalla con los cambios de plazo y fecha límite.

## 7. Orden

`ordenarPendientesPorPrioridad` ordena por `COLP.FECHA_LIMITE` ascendente. Filas sin fecha límite (no migradas) quedan al final porque Sheets ordena vacíos al final en ascendente.

## 8. Pruebas (`probarRelojHabil`)

Con festivos 2026 inyectados:
- Tabla CA-REL-02/03 completa (8 filas) mediante `inicioEfectivo(marca)` y `sumarHorasHabiles`.
- CA-REL-05 con `horasHabilesEntre`.
- CA-REL-07 con una función pura `clasificarParaAlerta(total, restantes)` extraída de la verificación.
- CA-REL-08 con `recalcularFechaLimite(inicio, etiqueta)`.
- `formatearFechaLarga` para dos fechas (a. m. y p. m.).
- Consistencia fórmula ↔ script reutilizando T-00-08 sobre `FECHA LÍMITE` de una fila temporal.

En Node (arnés) se ejecutan las mismas funciones puras con `Utilities.formatDate` simulado.

## 9. Compatibilidad y riesgos

| Riesgo | Mitigación |
|---|---|
| Filas antiguas sin `FECHA LÍMITE` durante la transición | La alerta las lista como «pendientes de migrar»; el orden las deja al final; `recalcularPendientes` las completa. |
| Alguien edita `FECHA LÍMITE` a mano | Se respeta (es la fuente de verdad); la fórmula de horas se recalcula sola. |
| `Festivos` vacío | Degradación de CAL-04 (solo fines de semana); la alerta diaria avisa (T-00-09). |
| Solicitud con marca temporal futura o corrupta | `inicioEfectivo` valida rango [2020, ahora + 1 día]; fuera de él marca la fila y usa `ahora`. |
