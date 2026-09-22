# Arnés de pruebas en Node

Casi todas las suites viven en los `.gs` (se ejecutan desde *Soporte → Pruebas* dentro de
Sheets). Este arnés las corre además fuera de Google, en la terminal, simulando los
servicios que el código usa (`SpreadsheetApp`, `MailApp`, `PropertiesService`, `FormApp`,
`ScriptApp`, `Utilities`, `LockService`, `Logger`).

```bash
npm test                 # las ocho suites
npm run test:servicios   # solo el catálogo de servicios
npm run test:tiempos     # solo los plazos de respuesta
npm run test:excel       # solo la comparación con el .xlsx del disco
npm run test:verificacion # solo el informe de verificación de la hoja
npm run mutacion         # comprueba que las suites detectan averías
npm run matriz           # regenera TIEMPOS_POR_SERVICIO.md
VERBOSE=1 npm test       # además vuelca el Logger
```

| Archivo | Qué hace |
|---|---|
| `harness.js` | Carga los siete `.gs` en un único contexto `vm` (igual que Apps Script, donde todos comparten ámbito global) con los servicios de Google simulados |
| `run.js` | Ejecuta las suites y resume; sale con código ≠ 0 si alguna falla |
| `xlsx.js` | Lector mínimo de `.xlsx` sin dependencias: un libro de Excel es un ZIP con XML dentro, y `zlib` basta para abrirlo |
| `excel.js` | Compara el `.xlsx` real del disco con el catálogo transcrito en el código |
| `matriz.js` | Genera `TIEMPOS_POR_SERVICIO.md` a partir del motor y del `.xlsx` |
| `verificacion.js` | Prueba de humo del informe de `Verificacion.gs`: que no lo tumbe un libro vacío |
| `mutacion.js` | Introduce 17 averías de una en una, verifica que la suite correspondiente las detecta y restaura los archivos |

## Por qué existe el arnés

Las funciones de puntaje son JavaScript puro y no tocan la hoja: se pueden probar sin
Sheets. Eso permite ejecutar 44.000 casos en menos de un segundo en cada cambio, en vez de
abrir el editor de Apps Script y esperar.

Lo que el arnés **no** cubre y solo puede verificarse dentro de Sheets: la lectura real de
la pestaña `Festivos`, la escritura en `Solicitudes Pendientes`, el envío de correos, la
apertura y cierre del formulario y los disparadores. Esas verificaciones están listadas en
`specs/README.md`.

## Suites

| Suite | Función | Casos | Archivo | Corre en Sheets |
|---|---|---|---|---|
| Cálculo de plazos | `probarCalculo` | 53 | `Código.gs` | sí |
| Catálogo de servicios | `probarServicios` | 5.530 | `Servicios.gs` | sí |
| Tiempos de respuesta | `probarTiempos` | 38.667 | `Tiempos.gs` | sí |
| Calendario hábil | `probarCalendario` | 45 | `Calendario.gs` | sí |
| Reloj hábil | `probarRelojHabil` | 39 | `Reloj.gs` | sí |
| Ventana del formulario | `probarVentana` | 38 | `Ventana.gs` | sí |
| Excel ↔ código | `probarExcel` | 4.700 | `tests/excel.js` | no (lee un archivo) |
| Informe de verificación | `probarVerificacion` | 86 | `tests/verificacion.js` | no (prueba de humo) |

## Las tres fuentes de verdad

El puntaje de cada ubicación y cada servicio está escrito tres veces, a propósito:

1. **`TIEMPOS DE RESPUESTA.xlsx`** — el original, donde la Unidad tomó las decisiones.
2. **`PUNTAJES` / `ESCALA_*` en `Código.gs`** — lo que el motor usa en producción.
3. **`CAT_*` en `Servicios.gs`** — una transcripción del Excel hecha a mano, que sirve de
   oráculo y **no** importa nada de `PUNTAJES`.

`probarServicios()` y `probarTiempos()` comparan 2 contra 3. `tests/excel.js` compara
3 contra 1, abriendo el archivo. Hacen falta las dos comparaciones: sin la segunda, quien
cambia un puntaje en `PUNTAJES` puede «arreglar» la prueba cambiándolo igual en `CAT_*`,
las dos copias del código vuelven a coincidir y nadie nota que el Excel dice otra cosa.
`npm run mutacion` incluye cuatro averías de ese tipo exacto y verifica que
`probarServicios` se queda en verde y solo `tests/excel.js` las caza.

**Cuando el Excel cambie**, el orden es: primero el catálogo de `Servicios.gs` (`npm run
test:excel` vuelve a verde, las otras dos suites pasan a rojo), luego `PUNTAJES` y
`ESCALA_*` en `Código.gs` (todo verde), y por último `npm run matriz`.

## Lo que solo puede probarse dentro de Sheets

`Verificacion.gs` agrupa en una sola entrada de menú (*Soporte → Verificación completa…*)
las comprobaciones que necesitan a Google de verdad: pestaña `Festivos`, columnas reales,
bandeja de pendientes, disparadores, estado de la ventana y opciones de los dos
formularios. Escribe el resultado en la pestaña `Informe_Verificación`.

Separa **diagnóstico** (siempre) de **corrección** (solo si se confirma: generar festivos y
recalcular la bandeja). No instala disparadores ni abre o cierra el formulario: eso sigue
requiriendo una acción explícita del menú.

`tests/verificacion.js` no puede comprobar que el diagnóstico acierte —fuera de Sheets no
hay nada que diagnosticar—, así que comprueba lo otro: que **un entorno roto no lo tumbe**.
Lo ejecuta contra un libro vacío y contra uno mínimo, y exige que devuelva todos los pasos,
que ninguno quede sin explicación y que los pasos de corrección no se ejecuten sin permiso.

## Qué cubre cada capa

- `probarServicios()` — el **puntaje**: cada ubicación y cada servicio, en todas sus
  grafías, valen lo que dice el Excel.
- `probarTiempos()` — el **plazo**: ese puntaje se traduce en la etiqueta correcta, en las
  horas correctas y en una fecha límite hábil correcta, para cada servicio y cada variante.
- `tests/excel.js` — que las dos anteriores sigan hablando del mismo Excel que hay en el
  disco.
- `Verificacion.gs` — que la hoja real (festivos, columnas, bandeja, disparadores, ventana
  y formularios) esté en el estado que el código supone.
