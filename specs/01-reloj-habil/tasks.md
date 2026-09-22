# 01 · Reloj hábil — Tareas

Prerrequisito: feature 00 terminada (calendario, ventana pura, fórmula `LET` validada).

| # | Tarea | Requisitos | Prueba de cierre | Tamaño |
|---|---|---|---|---|
| T-01-01 | `CONFIG.ENCABEZADOS_PENDIENTES`, `CONFIG.COL_PENDIENTES` (respaldo) y `detectarColumnasPendientes` con creación de encabezados nuevos y alias de `TIEMPO RESTANTE (HRS)` | REL-04 | Arnés Node con encabezados actuales y con encabezados ya migrados | M |
| T-01-02 | `inicioEfectivo(marca, festivos?)` y `recalcularFechaLimite(inicio, etiqueta)`; validación de marca temporal | REL-02, REL-03 | CA-REL-02/03 (8 filas) | S |
| T-01-03 | `formulaHorasHabilesRestantes(fila, COLP)` y `formatearFechaLarga(d)` con nombres en español | REL-05, REL-10 | Consistencia fórmula ↔ script; dos fechas formateadas | M |
| T-01-04 | `onFormSubmit`: inicio efectivo, fecha límite, escritura de 14 columnas, nota de fuera de ventana | REL-02, REL-03, REL-11 | Envío real en el formulario de pruebas un viernes tarde (o con marca simulada) | M |
| T-01-05 | `templateConfirmacion` con plazo hábil, fecha límite y aviso de fuera de ventana | REL-10, REL-11 | CA-REL-10/11 (inspección del HTML generado en el arnés) | S |
| T-01-06 | `ordenarPendientesPorPrioridad` por `FECHA LÍMITE` | REL-06 | Manual: bandeja ordenada tras insertar | S |
| T-01-07 | `onEditTrigger` con columnas por encabezado y recálculo desde `INICIO RELOJ` | REL-04, REL-08 | CA-REL-08 en la hoja de pruebas | M |
| T-01-08 | `verificarSolicitudesVencidas` en horas hábiles; `clasificarParaAlerta`; nueva plantilla con dos tablas y fecha límite | REL-07 | CA-REL-07 + envío de prueba a `EMAIL_ADMIN` | M |
| T-01-09 | `recalcularPendientes`: migración de `INICIO RELOJ` / `FECHA LÍMITE`, renombre del encabezado 12, filas inválidas marcadas | REL-09 | CA-REL-09 sobre la bandeja actual (6 filas) | M |
| T-01-10 | `probarRelojHabil()` + ítem de menú; ampliar arnés Node | REL-13, REL-12 | «N casos correctos»; `probarCalculo` sigue en verde | M |
| T-01-11 | Actualizar `INFORME_TECNICO.md` (modelo de datos de Pendientes, H-07 cerrado) y `RESUMEN_NO_TECNICO.md` | — | Revisión | S |

Criterio de terminado: T-01-01…11 cerradas; una solicitud real enviada desde el formulario de pruebas muestra fecha límite coherente en la bandeja y en el correo; la alerta diaria de prueba llega con porcentajes entre 0 y 100.

## Estado de ejecución (17 de septiembre de 2026)

Hechas: T-01-01 … T-01-08, T-01-10 (arnés Node: 39 casos), T-01-11. Implementación en `Reloj.gs` y en `Código.gs` (`onFormSubmit`, `onEditTrigger`, `verificarSolicitudesVencidas`, `alertaVencidas`, `templateConfirmacion`, `ordenarPendientesPorPrioridad`, `actualizarListasDesplegables`, `recalcularPendientes`).
Pendientes de ejecutar en la hoja: **T-01-09** (*Soporte → Recalcular plazos de pendientes* sobre la bandeja real) y la verificación de cierre (una solicitud real desde el formulario de pruebas; alerta diaria de prueba).
