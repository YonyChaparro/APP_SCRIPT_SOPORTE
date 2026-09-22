# 00 · Calendario hábil — Tareas

Orden de ejecución. Cada tarea cierra con su prueba. Tamaño: S (< 1 h), M (1–3 h), L (> 3 h).

| # | Tarea | Requisitos | Prueba de cierre | Tamaño |
|---|---|---|---|---|
| T-00-01 | `CONFIG.HOJAS.FESTIVOS`, `CONFIG.VENTANA` (horas de apertura/cierre) y constante `FESTIVOS_COLOMBIA` con las reglas del §2 del diseño | CAL-01, CAL-02 | Revisión de código | S |
| T-00-02 | `leerFestivos()` con caché y tolerancia a filas inválidas; `esDiaHabil(fecha, festivos?)` | CAL-01, CAL-04, CAL-08 | CA-CAL-04 y CA-CAL-04b | S |
| T-00-03 | `pascua(año)` (Meeus) y `festivosNacionales(año)` → lista de `{fecha, descripcion}` | CAL-02 | CA-CAL-02 contra la tabla 2026 del diseño | M |
| T-00-04 | `generarFestivos(año)`: crea/formatea la pestaña, aplica idempotencia por año, ordena; ítem de menú con `prompt` | CAL-01, CAL-02, CAL-03 | CA-CAL-03 (manual: generar dos veces, borrar una fila, consultar) | M |
| T-00-05 | `inicioDeDia`, `finDeDia`, `siguienteDiaHabil`, `horasHabilesEntre`, `sumarHorasHabiles` | CAL-05, CAL-07 | CA-CAL-05 completo + identidad inversa | M |
| T-00-06 | `ventanaAbierta`, `proximaApertura`, `proximoCierre` | CAL-06 | CA-CAL-06 (9 filas) | M |
| T-00-07 | `probarCalendario()` con festivos inyectados; ítem de menú | CAL-09 | Ejecutar desde el menú: «N casos correctos» | M |
| T-00-08 | Prueba de consistencia script ↔ fórmula `LET` (§5): escribe la fórmula en una celda temporal de una hoja auxiliar, lee, compara, borra | CAL-05 | Diferencia < 0,01 h en los 6 intervalos | M |
| T-00-09 | Aviso al administrador cuando el año en curso o el siguiente no tenga festivos generados (gancho en `verificarSolicitudesVencidas`) | CAL-04 | Manual: vaciar 2027 y ejecutar la verificación | S |
| T-00-10 | Verificación en Node del módulo (arnés `verificar_gs.js`): `pascua`, `festivosNacionales(2026)`, aritmética y ventana sin hoja | CAL-09 | Salida del arnés en verde | S |
| T-00-11 | Documentar en `INFORME_TECNICO.md` (nueva sección «Calendario hábil») y en el resumen no técnico | — | Revisión | S |

Criterio de terminado de la feature: T-00-01…11 cerradas, `probarCalendario` y `probarCalculo` en verde en la hoja de pruebas, `Festivos` con 2026 y 2027 generados.

## Estado de ejecución (17 de septiembre de 2026)

Hechas en `Calendario.gs`: T-00-01 … T-00-07, T-00-09 (aviso en la alerta diaria), T-00-10 (arnés Node: 45 casos), T-00-11 (informes).
Pendientes de ejecutar en la hoja: **T-00-08** (*Soporte → Pruebas → Fórmula de horas hábiles ↔ script*) y T-00-04 manual (generar 2026 y 2027 desde el menú).
