# Arnés de pruebas en Node

Las suites viven en los `.gs` (se ejecutan desde *Soporte → Pruebas* dentro de Sheets).
Este arnés las corre además fuera de Google, en la terminal, simulando los servicios que
el código usa (`SpreadsheetApp`, `MailApp`, `PropertiesService`, `FormApp`, `ScriptApp`,
`Utilities`, `LockService`, `Logger`).

```bash
npm test                 # las cinco suites
npm run test:servicios   # solo el catálogo de servicios
npm run mutacion         # comprueba que la suite de servicios detecta averías
VERBOSE=1 npm test       # además vuelca el Logger
```

| Archivo | Qué hace |
|---|---|
| `harness.js` | Carga los cinco `.gs` en un único contexto `vm` (igual que Apps Script, donde todos comparten ámbito global) con los servicios de Google simulados |
| `run.js` | Ejecuta las suites y resume; sale con código ≠ 0 si alguna falla |
| `mutacion.js` | Introduce ocho averías de una en una en `Código.gs`, verifica que la suite las detecta y restaura el archivo |

## Por qué existe el arnés

Las funciones de puntaje son JavaScript puro y no tocan la hoja: se pueden probar sin
Sheets. Eso permite ejecutar 5.700 casos en menos de un segundo en cada cambio, en vez de
abrir el editor de Apps Script y esperar.

Lo que el arnés **no** cubre y solo puede verificarse dentro de Sheets: la lectura real de
la pestaña `Festivos`, la escritura en `Solicitudes Pendientes`, el envío de correos, la
apertura y cierre del formulario y los disparadores. Esas verificaciones están listadas en
`specs/README.md`.

## Suites

| Suite | Función | Casos | Archivo |
|---|---|---|---|
| Cálculo de plazos | `probarCalculo` | 53 | `Código.gs` |
| Catálogo de servicios | `probarServicios` | 5.530 | `Servicios.gs` |
| Calendario hábil | `probarCalendario` | 45 | `Calendario.gs` |
| Reloj hábil | `probarRelojHabil` | 39 | `Reloj.gs` |
| Ventana del formulario | `probarVentana` | 38 | `Ventana.gs` |

## El oráculo del catálogo

`Servicios.gs` transcribe a mano las cuatro pestañas de puntaje de
`TIEMPOS DE RESPUESTA.xlsx` (`CAT_UBICACIONES`, `CAT_SERVICIOS`, `CAT_CANTIDAD`,
`CAT_TIEMPOS`) y **no** importa nada de `PUNTAJES`. Esa duplicación es deliberada: es lo
que convierte la suite en una comparación entre dos fuentes independientes. Si alguien
cambia un puntaje en el código sin cambiarlo en el Excel —o al revés— la suite dice qué
fila difiere.

Cuando el Excel cambie, hay que actualizar las dos: primero el catálogo de `Servicios.gs`
(la suite pasará a fallar), luego `PUNTAJES` en `Código.gs` (vuelve a verde).
