# 02 · Ventana del formulario — Tareas

Prerrequisito: feature 00 terminada. Independiente de 01, salvo REL-02/REL-11 para CA-VEN-08.

| # | Tarea | Requisitos | Prueba de cierre | Tamaño |
|---|---|---|---|---|
| T-02-01 | `CONFIG.VENTANA` completo; claves de `PropertiesService`; `getModo`/`setModo` | VEN-02, VEN-06 | Revisión | S |
| T-02-02 | Interfaces `formulario` y `reloj` con implementación real (`FormApp`, `Date`) y simulada | VEN-12 | Arnés Node instancia la simulada | S |
| T-02-03 | `registrar()` y pestaña `Bitácora_Ventana` | VEN-07 | Manual: fila creada al ejecutar | S |
| T-02-04 | `mensajeCierre(proxima)` con `formatearFechaLarga` (de 01, o duplicar mínima si 01 no está) | VEN-04 | CA-VEN-04 | S |
| T-02-05 | `aplicarEstado(abierto, origen, detalle)` con lock, manejo de errores y aviso diario | VEN-05, VEN-11 | Simulación: error de permiso → un solo correo por día | M |
| T-02-06 | `transicionesDelDia(fecha)` y `programarVentana()` con limpieza de puntuales y `crearPuntual` que ejecuta de inmediato si la hora ya pasó | VEN-03, VEN-10 | CA-VEN-03 (10 filas) | M |
| T-02-07 | `abrirFormulario`, `cerrarFormulario` con autoeliminación del disparador; `limpiarDisparadoresPuntuales` | VEN-03, VEN-10 | CA-VEN-10 simulado | M |
| T-02-08 | `reconciliarVentana()` | VEN-05 | CA-VEN-05 simulado | S |
| T-02-09 | Menú: *Abrir ahora*, *Cerrar ahora*, *Suspender/Reanudar programación*, *Estado de la ventana* | VEN-06, VEN-09 | CA-VEN-06 simulado + manual en la hoja | M |
| T-02-10 | `configurarTriggers`: añadir programador (06:00) y reconciliación (cada hora) conservando los existentes | VEN-10 | Lista de disparadores del proyecto: 6 recurrentes | S |
| T-02-11 | Red de seguridad: comprobar que `onFormSubmit` con 01 cubre CA-VEN-08; si 01 no está aún, nota en RADICADO «recibida fuera de ventana» | VEN-08 | CA-VEN-08 con marca simulada | S |
| T-02-12 | `probarVentana()` + ítem de menú; ampliar arnés Node | VEN-12 | «N casos correctos» | M |
| T-02-13 | Puesta en marcha (§8 del diseño) en el formulario de pruebas; observación de un ciclo viernes → lunes | todos | Bitácora con `cerrar` viernes 15:30 y `abrir` lunes 8:00 exactos | S |
| T-02-14 | Documentar en `INFORME_TECNICO.md` y `RESUMEN_NO_TECNICO.md`; instrucciones para pasar a producción (cambiar `FORMULARIO`, verificar permisos, reconfigurar triggers) | — | Revisión | S |

Criterio de terminado: T-02-01…14 cerradas; un ciclo completo de semana con festivo observado en la bitácora sin intervención manual; `probarVentana`, `probarCalendario` y `probarCalculo` en verde.

## Estado de ejecución (17 de septiembre de 2026)

Hechas: T-02-01 … T-02-12 en `Ventana.gs` (38 casos en el arnés Node, con formulario, disparadores, propiedades y bitácora simulados) y T-02-14 (informes; instrucciones de paso a producción en `INFORME_TECNICO.md`).
Pendientes de ejecutar en la hoja: **T-02-13** (*Soporte → Configurar triggers*, luego *Formulario → Estado de la ventana*; observar un ciclo viernes → lunes en `Bitácora_Ventana`). Requiere que la cuenta que configure los disparadores tenga permiso sobre el formulario de pruebas.
