# 02 · Ventana del formulario — Diseño

## 1. Componentes

```
                 ┌──────────────────────┐   crea at(08:00) / at(15:30)   ┌──────────────────┐
  diario 06:00 ─►│  programarVentana    │──────────────────────────────►│ abrirFormulario  │
                 └──────────────────────┘                                │ cerrarFormulario │
                 ┌──────────────────────┐                                └────────┬─────────┘
  cada hora ────►│  reconciliarVentana  │───────────┐                              │
                 └──────────────────────┘           ▼                              ▼
                 ┌──────────────────────┐   ┌──────────────────┐         ┌──────────────────┐
  menú Soporte ─►│  abrir/cerrar/susp.  │──►│ aplicarEstado()  │────────►│ FormApp + Bitácora│
                 └──────────────────────┘   └──────────────────┘         └──────────────────┘
                                                     ▲
                                        regla pura: ventanaAbierta / proximaApertura (00)
```

Una sola función toca el formulario: `aplicarEstado(abierto, origen, detalle)`. Todo lo demás decide y delega.

## 2. Configuración y estado

```js
CONFIG.VENTANA = {
  FORMULARIO: "1druQ9zqkqnISd6STqOU4DrThXb1Ev9_m4f19GrlLst8",   // pruebas; producción: 1gs6Glax…
  APERTURA: { h: 8, m: 0 }, CIERRE: { h: 15, m: 30 },           // compartido con 00
  HORA_PROGRAMADOR: 6,
  EXTENSION_EMERGENCIA: "",                                     // vacío = se omite la frase
  HOJA_BITACORA: "Bitácora_Ventana"
};
```

`PropertiesService.getScriptProperties()`:
| Clave | Valores | Uso |
|---|---|---|
| `ventana.modo` | `AUTO` \| `MANUAL` | VEN-06 |
| `ventana.ultimoAvisoPermiso` | `yyyy-MM-dd` | VEN-11: un aviso por día |

## 3. Funciones

```
estadoDeseado(ahora) → { abierto: ventanaAbierta(ahora), proximaApertura, proximoCierre }

aplicarEstado(abierto, origen, detalle):
  form = FormApp.openById(CONFIG.VENTANA.FORMULARIO)
  si form.isAcceptingResponses() === abierto: registrar("sin cambio", …); return
  si !abierto: form.setCustomClosedFormMessage(mensajeCierre(proximaApertura(ahora)))
  form.setAcceptingResponses(abierto)
  registrar(abierto ? "abrir" : "cerrar", origen, detalle)

programarVentana():                       // diario 06:00
  limpiarDisparadoresPuntuales()
  si modo == MANUAL: registrar("programador omitido", "modo MANUAL"); return
  hoy = inicioDeDia(ahora)
  si esDiaHabil(hoy) && !esDiaHabil(hoy − 1): crearPuntual("abrirFormulario", hoy + APERTURA)
  si esDiaHabil(hoy) && !esDiaHabil(hoy + 1): crearPuntual("cerrarFormulario", hoy + CIERRE)
  reconciliarVentana()                    // por si el estado amaneció incorrecto

abrirFormulario():  aplicarEstado(true,  "programada"); eliminarDisparadorPropio("abrirFormulario")
cerrarFormulario(): aplicarEstado(false, "programada"); eliminarDisparadorPropio("cerrarFormulario")

reconciliarVentana():                     // cada hora
  si modo == MANUAL: registrar("reconciliación", "sin acción · modo MANUAL"); return
  deseado = ventanaAbierta(ahora)
  aplicarEstado(deseado, "reconciliación", deseado ? "formulario estaba cerrado dentro de ventana" : "formulario estaba abierto fuera de ventana")
  // aplicarEstado registra "sin cambio" cuando coincide; solo se anota en bitácora si hubo corrección

abrirAhora() / cerrarAhora():             // menú
  setModo(MANUAL); aplicarEstado(true|false, "manual:" + Session.getActiveUser().getEmail())
suspenderProgramacion(): setModo(MANUAL); registrar(...)
reanudarProgramacion():  setModo(AUTO); reconciliarVentana()

estadoVentana():                          // menú → alert
  real = form.isAcceptingResponses(); regla = ventanaAbierta(ahora); modo; próximas transiciones; disparadores puntuales pendientes
```

`crearPuntual(fn, fecha)`: si `fecha <= ahora`, ejecuta `aplicarEstado` de inmediato en vez de crear un disparador en el pasado (cubre un programador que corra tarde). `ScriptApp.newTrigger(fn).timeBased().at(fecha).create()`.

`eliminarDisparadorPropio(fn)`: borra todos los disparadores de `fn` cuyo tipo sea puntual (`getTriggerSource() == CLOCK` y sin recurrencia identificable → se conservan los IDs creados en `programarVentana` en `PropertiesService` bajo `ventana.puntuales` para borrarlos con certeza).

## 4. Mensaje de cierre

```
mensajeCierre(proxima):
  "Formulario cerrado temporalmente. La Unidad de Informática recibe solicitudes de soporte los días hábiles, " +
  "desde las 8:00 a. m. del primer día hábil de la semana hasta las 3:30 p. m. del último. " +
  "El formulario se reabrirá el " + formatearFechaLarga(proxima, sinHora) + " a las 8:00 a. m." +
  (EXTENSION_EMERGENCIA ? " Si tiene una emergencia que no puede esperar, comuníquese con la extensión " + EXTENSION_EMERGENCIA + "." : "")
```

`setCustomClosedFormMessage` acepta texto plano (sin HTML). Las horas del texto se derivan de `CONFIG.VENTANA` para que un cambio de horario actualice el mensaje.

## 5. Bitácora

Pestaña `Bitácora_Ventana`: `FECHA-HORA | ACCIÓN | ORIGEN | ESTADO RESULTANTE | DETALLE`. `registrar()` la crea si no existe y añade al final. Se registran: `abrir`, `cerrar`, `sin cambio` (solo desde reconciliación cuando corrigió, para no llenar la bitácora cada hora → en realidad `reconciliarVentana` solo llama a `registrar` cuando `aplicarEstado` cambió algo o cuando el modo es MANUAL), `programador`, `manual`, `error`.

## 6. Manejo de errores

| Error | Tratamiento |
|---|---|
| `FormApp.openById` sin permiso / ID inválido | Bitácora `error`; correo al administrador si `ventana.ultimoAvisoPermiso` ≠ hoy; el programador sigue creando puntuales (el problema puede ser transitorio). |
| Cuota de disparadores | `programarVentana` limpia puntuales huérfanos primero; si aun así falla, bitácora + correo. |
| Dos ejecuciones simultáneas | `LockService.getScriptLock()` en `aplicarEstado` (5 s). |
| Cambio de `FORMULARIO` en `CONFIG` | Basta *Configurar triggers* → `programarVentana` → reconcilia el nuevo formulario. El anterior queda en el estado en que estaba (se documenta). |

## 7. Pruebas (`probarVentana`)

Las funciones se escriben contra dos interfaces mínimas, `formulario` (`estaAbierto()`, `abrir(mensaje)`, `cerrar(mensaje)`) y `reloj` (`ahora()`), que por defecto envuelven `FormApp` y `new Date()`. `probarVentana` inyecta implementaciones simuladas con festivos 2026 y verifica:
- CA-VEN-03: `transicionesDelDia(fecha)` devuelve `{abrir: Date|null, cerrar: Date|null}` para las 10 filas.
- CA-VEN-04: `mensajeCierre` para los dos cierres.
- CA-VEN-05 y CA-VEN-06: secuencia simulada `cerrar perdido → reconciliar` y `abrirAhora → reconciliar → reanudar` sobre el formulario simulado, comprobando estado final y entradas de bitácora (en memoria).
- CA-VEN-10: `limpiarDisparadoresPuntuales` sobre una lista simulada.

En Node el arnés ejecuta las mismas pruebas con `ScriptApp`, `FormApp`, `PropertiesService` y `Session` simulados.

## 8. Puesta en marcha

1. Generar festivos del año en curso y el siguiente (00).
2. Verificar que `uniic_bog@unal.edu.co` es propietaria del formulario de pruebas.
3. *Configurar triggers* (instala programador y reconciliación; conserva los cuatro existentes).
4. *Estado de la ventana* debe mostrar coherencia entre estado real y regla; si no, *Reanudar programación*.
5. Observar la bitácora durante una semana con festivo (la primera disponible tras el despliegue).
