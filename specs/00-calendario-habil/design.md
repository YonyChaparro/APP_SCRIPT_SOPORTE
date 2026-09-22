# 00 · Calendario hábil — Diseño

## 1. Pestaña `Festivos`

| Col | Encabezado | Tipo | Notas |
|---|---|---|---|
| A | `FECHA` | fecha (`dd/mm/yyyy`) | clave; sin hora |
| B | `DESCRIPCIÓN` | texto | «Día de la Independencia», «Trasladado: Día de los Reyes Magos (6 ene)» |
| C | `TIPO` | `NACIONAL` \| `MANUAL` | el generador escribe `NACIONAL`; una persona escribe `MANUAL` |

Se crea con `getHoja` + `insertSheet` si no existe (en `generarFestivos`). Formato de fecha aplicado a la columna A; encabezados en negrita; ordenada por fecha tras cada generación. Se registra en `CONFIG.HOJAS.FESTIVOS`.

Lectura: `leerFestivos()` devuelve un `Set` de claves `yyyy-MM-dd` (`Utilities.formatDate(fecha, "America/Bogota", "yyyy-MM-dd")`). Se ignoran filas sin fecha válida. Caché por ejecución en variable de módulo `_festivosCache`.

## 2. Festivos nacionales de Colombia

**Fijos (6):** 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
**Emiliani — se trasladan al lunes siguiente si no caen en lunes (7):** 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
**Relativos a la Pascua (5):** Jueves Santo (P−3), Viernes Santo (P−2), Ascensión (P+39, trasladado al lunes → P+43), Corpus Christi (P+60 → P+64), Sagrado Corazón (P+68 → P+71).

Pascua por el algoritmo de Meeus/Jones/Butcher:

```
a = Y mod 19; b = Y div 100; c = Y mod 100; d = b div 4; e = b mod 4
f = (b + 8) div 25; g = (b − f + 1) div 3; h = (19a + b − d − g + 15) mod 30
i = c div 4; k = c mod 4; l = (32 + 2e + 2i − h − k) mod 7
m = (a + 11h + 22l) div 451
mes = (h + l − 7m + 114) div 31; día = ((h + l − 7m + 114) mod 31) + 1
```

Traslado Emiliani: `d + ((8 − díaSemana(d)) mod 7)` con `díaSemana` 0 = domingo, 1 = lunes (si ya es lunes, desplazamiento 0).

**Salida esperada 2026 (Pascua = 5 abr):**

| Fecha | Festivo | Regla |
|---|---|---|
| jue 01-ene | Año Nuevo | fijo |
| lun 12-ene | Reyes Magos (6 ene, mar) | Emiliani |
| lun 23-mar | San José (19 mar, jue) | Emiliani |
| jue 02-abr | Jueves Santo | Pascua −3 |
| vie 03-abr | Viernes Santo | Pascua −2 |
| vie 01-may | Día del Trabajo | fijo |
| lun 18-may | Ascensión (14 may, jue) | Pascua +43 |
| lun 08-jun | Corpus Christi (4 jun, jue) | Pascua +64 |
| lun 15-jun | Sagrado Corazón (12 jun, vie) | Pascua +71 |
| lun 29-jun | San Pedro y San Pablo | Emiliani (ya es lunes) |
| lun 20-jul | Independencia | fijo |
| vie 07-ago | Batalla de Boyacá | fijo |
| lun 17-ago | Asunción (15 ago, sáb) | Emiliani |
| lun 12-oct | Día de la Raza | Emiliani (ya es lunes) |
| lun 02-nov | Todos los Santos (1 nov, dom) | Emiliani |
| lun 16-nov | Independencia de Cartagena (11 nov, mié) | Emiliani |
| mar 08-dic | Inmaculada Concepción | fijo |
| vie 25-dic | Navidad | fijo |

La lista de reglas vive en una constante `FESTIVOS_COLOMBIA = { fijos: [[1,1,"Año Nuevo"], …], emiliani: [[1,6,"Reyes Magos"], …], pascua: [[-3,"Jueves Santo"], [-2,"Viernes Santo"], [43,"Ascensión"], [64,"Corpus Christi"], [71,"Sagrado Corazón"]] }` para que un cambio legal sea una edición de datos, no de código.

## 3. Funciones

Todas reciben y devuelven `Date`. Internamente se trabaja con la fecha local de Bogotá (`getFullYear/getMonth/getDate/getHours…` funcionan en la zona del script).

```
esDiaHabil(fecha) → boolean
  díaSemana ∈ {1..5} && !festivos.has(clave(fecha))

siguienteDiaHabil(fecha) → Date            // 00:00 del siguiente día hábil estricto
inicioDeDia(fecha) → Date                  // 00:00 del mismo día
finDeDia(fecha) → Date                     // 00:00 del día siguiente

horasHabilesEntre(a, b) → number
  si b < a: return −horasHabilesEntre(b, a)
  total = 0; d = inicioDeDia(a)
  mientras d < b:
    si esDiaHabil(d): total += (min(b, finDeDia(d)) − max(a, d)) / 3_600_000
    d = finDeDia(d)
  return total

sumarHorasHabiles(inicio, horas) → Date
  restante = horas; t = inicio
  si !esDiaHabil(t): t = siguienteDiaHabil(t)
  bucle:
    disponible = (finDeDia(t) − t) / 3_600_000
    si restante <= disponible: return t + restante h
    restante −= disponible; t = siguienteDiaHabil(t)
```

`horasHabilesEntre` y `sumarHorasHabiles` son inversas: `horasHabilesEntre(i, sumarHorasHabiles(i, h)) == h` para todo `i` hábil. Esta identidad es una prueba.

Detalle del ejemplo `5 DIAS` desde mié 2026-04-01 12:00: mié 1 → 12 h (quedan 108); jue 2, vie 3 festivos; sáb, dom; lun 6 → 24 (84); mar 7 → 24 (60); mié 8 → 24 (36); jue 9 → 24 (12); vie 10 → 12 h → **vie 2026-04-10 12:00**.

Complejidad: lineal en días del intervalo. Un semestre (`2160 h` ≈ 90 días hábiles ≈ 130 días calendario) son 130 iteraciones triviales.

## 4. Regla de ventana (función pura)

```
HORA_APERTURA = { h: 8,  m: 0 }
HORA_CIERRE   = { h: 15, m: 30 }

ventanaAbierta(t):
  D = inicioDeDia(t)
  si !esDiaHabil(D): return false
  si !esDiaHabil(D − 1 día) && t < D + 08:00: return false
  si !esDiaHabil(D + 1 día) && t >= D + 15:30: return false
  return true

proximaApertura(t):            // primer instante > t en que la ventana pasa de cerrada a abierta
  D = inicioDeDia(t)
  repetir:
    si esDiaHabil(D) && !esDiaHabil(D − 1) && (D + 08:00) > t: return D + 08:00
    D += 1 día

proximoCierre(t):              // primer instante > t en que la ventana pasa de abierta a cerrada
  D = inicioDeDia(t)
  repetir:
    si esDiaHabil(D) && !esDiaHabil(D + 1) && (D + 15:30) > t: return D + 15:30
    D += 1 día
```

Las horas de apertura y cierre viven en `CONFIG.VENTANA` para que 02 las use y para que un cambio de horario sea una edición de configuración.

## 5. Fórmula de hoja equivalente (la usa 01)

Para mostrar horas hábiles restantes en vivo en Pendientes, el script escribe una fórmula `LET` que reproduce `horasHabilesEntre(NOW(), límite)`, con `L` = celda de fecha límite y `F` = `Festivos!$A$2:$A`:

```
=IF(L="","",IFERROR(
  LET(vnow, NOW(), vlim, L, vini, MIN(vnow, vlim), vfin, MAX(vnow, vlim), vdi, INT(vini), vdf, INT(vfin),
      vhor, IF(vdi = vdf, (vfin - vini) * 24,
                 IF(NETWORKDAYS.INTL(vdi, vdi, 1, F) = 1, (vdi + 1 - vini) * 24, 0)
               + IF(vdf - vdi > 1, NETWORKDAYS.INTL(vdi + 1, vdf - 1, 1, F) * 24, 0)
               + IF(NETWORKDAYS.INTL(vdf, vdf, 1, F) = 1, (vfin - vdf) * 24, 0)),
      IF(vnow > vlim, -vhor, vhor)),
  "REVISAR Festivos"))
```

Los nombres de variable llevan prefijo `v` para no coincidir con funciones de Sheets en ningún idioma (`n` chocaba con `N()` y producía `#ERROR!`). `setFormula` recibe la fórmula en sintaxis en-US (comas) sea cual sea la configuración regional de la hoja.

`NETWORKDAYS.INTL` con parámetro `1` excluye sábado y domingo; `F` aporta los festivos. Prueba de consistencia (T-00-08): para los seis intervalos de CA-CAL-05 el script evalúa la fórmula en una celda temporal y compara con `horasHabilesEntre`; deben coincidir con tolerancia de 0,01 h.

## 6. Menú y pruebas

- *Soporte → Generar festivos del año…*: `prompt` del año (por defecto el actual); crea la pestaña si falta; aplica CAL-03; muestra cuántas filas agregó.
- *Soporte → Probar calendario*: `probarCalendario()` construye un `Set` de festivos **fijo** (los 18 de 2026, sin leer la hoja) para que la prueba no dependa del estado de la pestaña, y ejecuta CA-CAL-02..06. Un segundo bloque sí lee la hoja y reporta la advertencia de CAL-04 si está vacía.

Para permitir la inyección, las funciones aceptan un parámetro opcional `festivos` (Set); si se omite, usan `leerFestivos()`.

## 7. Casos borde y riesgos

| Caso | Tratamiento |
|---|---|
| Festivo que cae en fin de semana (p. ej. 25-dic-2027, sábado) | Se genera igual; no afecta (ya era no hábil). |
| Fila de `Festivos` con texto en vez de fecha | Se ignora y se cuenta en la advertencia de `probarCalendario`. |
| Pestaña borrada por accidente | CAL-04: solo fines de semana + advertencia en log y en la prueba. 01 y 02 siguen funcionando con esa degradación. |
| Cambio legal de festivos | Editar `FESTIVOS_COLOMBIA`; regenerar el año (borrando antes sus filas `NACIONAL`). |
| Año no generado (p. ej. enero sin haber generado el año nuevo) | Los plazos que crucen a ese año tratarán sus festivos como hábiles. Mitigación: `verificarSolicitudesVencidas` avisa al administrador si el año en curso o el siguiente no tiene filas `NACIONAL` (tarea T-00-09). |
| Horario de verano | Colombia no lo tiene; no se maneja. |
