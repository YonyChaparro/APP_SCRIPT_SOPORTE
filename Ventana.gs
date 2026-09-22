/*
  =================================================================
  --- VENTANA DEL FORMULARIO (spec 02) ---
  =================================================================
  El formulario acepta respuestas solo con la ventana abierta (regla en
  Calendario.gs). Un programador diario crea disparadores puntuales a la
  hora exacta de abrir/cerrar; una reconciliación horaria corrige cualquier
  desvío; el modo MANUAL suspende la automatización. Toda acción queda en
  la pestaña Bitácora_Ventana.

  Las funciones *Con(deps) reciben las dependencias (formulario, reloj,
  disparadores, propiedades, bitácora) para poder simularlas en pruebas.
  Las funciones sin sufijo son los puntos de entrada de disparadores y menú.
*/

const CLAVE_MODO_VENTANA = "ventana.modo";
const CLAVE_AVISO_VENTANA = "ventana.ultimoAvisoError";
const FN_ABRIR = "abrirFormulario";
const FN_CERRAR = "cerrarFormulario";

// Dependencias reales. `sobre` permite sustituir cualquiera (pruebas).
function depsVentana(sobre) {
  const base = {
    ahora: () => new Date(),
    festivos: null,                       // null → pestaña Festivos
    formulario: {
      _f: null,
      form() { if (!this._f) this._f = FormApp.openById(CONFIG.VENTANA.FORMULARIO); return this._f; },
      estaAbierto() { return this.form().isAcceptingResponses(); },
      abrir() { this.form().setAcceptingResponses(true); },
      cerrar(mensaje) { this.form().setCustomClosedFormMessage(mensaje); this.form().setAcceptingResponses(false); },
      titulo() { try { return this.form().getTitle(); } catch (e) { return CONFIG.VENTANA.FORMULARIO; } }
    },
    props: {
      get: k => PropertiesService.getScriptProperties().getProperty(k),
      set: (k, v) => PropertiesService.getScriptProperties().setProperty(k, v)
    },
    triggers: {
      listar: () => ScriptApp.getProjectTriggers().map(t => ({ id: t.getUniqueId(), fn: t.getHandlerFunction(), _t: t })),
      crear: (fn, fecha) => ScriptApp.newTrigger(fn).timeBased().at(fecha).create().getUniqueId(),
      borrar: t => ScriptApp.deleteTrigger(t._t)
    },
    registrar: registrarBitacora,
    usuario: () => { try { return Session.getActiveUser().getEmail() || "desconocido"; } catch (e) { return "desconocido"; } },
    avisarAdmin: (asunto, html) => MailApp.sendEmail({ to: CONFIG.EMAIL_ADMIN, subject: asunto, htmlBody: html })
  };
  return Object.assign(base, sobre || {});
}

function getModoVentana(deps) { return deps.props.get(CLAVE_MODO_VENTANA) || "AUTO"; }
function setModoVentana(deps, modo) { deps.props.set(CLAVE_MODO_VENTANA, modo); }

// ---------- Mensaje de cierre (VEN-04) ----------

function horaLegible(hm) { return `${hm.h % 12 || 12}:${String(hm.m).padStart(2, "0")} ${hm.h < 12 ? "a. m." : "p. m."}`; }

function mensajeCierre(proxima) {
  const v = CONFIG.VENTANA;
  let texto = `Formulario cerrado temporalmente. La Unidad de Informática recibe solicitudes de soporte los días hábiles, ` +
    `desde las ${horaLegible(v.APERTURA)} del primer día hábil de la semana hasta las ${horaLegible(v.CIERRE)} del último.`;
  if (proxima) texto += ` El formulario se reabrirá el ${formatearFechaLarga(proxima, false)} a las ${horaLegible(v.APERTURA)}.`;
  if (v.EXTENSION_EMERGENCIA) texto += ` Si tiene una emergencia que no puede esperar, comuníquese con la extensión ${v.EXTENSION_EMERGENCIA}.`;
  return texto;
}

// ---------- Bitácora (VEN-07) ----------

function registrarBitacora(accion, origen, estado, detalle) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(CONFIG.HOJAS.BITACORA);
    if (!hoja) {
      hoja = ss.insertSheet(CONFIG.HOJAS.BITACORA);
      hoja.getRange(1, 1, 1, 5).setValues([["FECHA-HORA", "ACCIÓN", "ORIGEN", "ESTADO RESULTANTE", "DETALLE"]]).setFontWeight("bold");
      hoja.setFrozenRows(1);
    }
    hoja.appendRow([new Date(), accion, origen, estado, detalle || ""]);
    hoja.getRange(hoja.getLastRow(), 1).setNumberFormat("dd/mm/yyyy hh:mm:ss");
  } catch (e) {
    Logger.log(`bitácora no disponible (${e.message}): ${accion} | ${origen} | ${estado} | ${detalle}`);
  }
}

// ---------- Actuación sobre el formulario ----------

// Única función que toca el formulario. Devuelve { cambio, error? }. Registra solo si hubo cambio o error.
function aplicarEstadoVentana(abierto, origen, detalle, deps) {
  let lock = null;
  try { lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) lock = null; } catch (e) { lock = null; }
  try {
    if (deps.formulario.estaAbierto() === abierto) return { cambio: false };
    if (abierto) deps.formulario.abrir();
    else deps.formulario.cerrar(mensajeCierre(proximaApertura(deps.ahora(), deps.festivos)));
    deps.registrar(abierto ? "abrir" : "cerrar", origen, abierto ? "ABIERTO" : "CERRADO", detalle || "");
    return { cambio: true };
  } catch (e) {
    deps.registrar("error", origen, "?", e.message);
    avisarErrorVentana(e, deps);
    return { cambio: false, error: e.message };
  } finally {
    if (lock) try { lock.releaseLock(); } catch (e) {}
  }
}

// Un correo por día ante errores de FormApp (VEN-11).
function avisarErrorVentana(e, deps) {
  const hoy = claveFecha(deps.ahora());
  if (deps.props.get(CLAVE_AVISO_VENTANA) === hoy) return;
  try {
    deps.avisarAdmin("ERROR ventana del formulario",
      `<p>No se pudo cambiar el estado del formulario <code>${CONFIG.VENTANA.FORMULARIO}</code>:</p><p>${e.message}</p>` +
      `<p>Verifique que la cuenta que configuró los disparadores tenga permiso sobre el formulario y que el ID sea correcto. Este aviso se envía una vez al día.</p>`);
    deps.props.set(CLAVE_AVISO_VENTANA, hoy);
  } catch (e2) { Logger.log("No se pudo avisar del error de ventana: " + e2.message); }
}

// ---------- Programación (VEN-03, VEN-10) ----------

// Borra todos los disparadores de abrir/cerrar (solo existen como puntuales). Devuelve cuántos.
function limpiarDisparadoresPuntuales(deps) {
  let n = 0;
  deps.triggers.listar().forEach(t => { if (t.fn === FN_ABRIR || t.fn === FN_CERRAR) { deps.triggers.borrar(t); n++; } });
  return n;
}

function eliminarDisparadorPropio(fn, deps) {
  deps.triggers.listar().forEach(t => { if (t.fn === fn) deps.triggers.borrar(t); });
}

// Crea el disparador puntual; si la hora ya pasó (programador tardío), actúa de inmediato.
function crearPuntual(fn, fecha, deps) {
  if (fecha.getTime() <= deps.ahora().getTime()) {
    aplicarEstadoVentana(fn === FN_ABRIR, "programada (tardía)", `la hora programada ${fmtHM(fecha)} ya había pasado`, deps);
    return null;
  }
  return deps.triggers.crear(fn, fecha);
}

// Diario a las 6:00: limpia puntuales anteriores, crea los de hoy y reconcilia.
function programarVentanaCon(deps) {
  const borrados = limpiarDisparadoresPuntuales(deps);
  if (getModoVentana(deps) === "MANUAL") {
    deps.registrar("programador", "programada", "—", "omitido: modo MANUAL");
    return { creados: [] };
  }
  const tr = transicionesDelDia(inicioDeDia(deps.ahora()), deps.festivos);
  const creados = [];
  if (tr.abrir && crearPuntual(FN_ABRIR, tr.abrir, deps)) creados.push(`abrir ${fmtHM(tr.abrir)}`);
  if (tr.cerrar && crearPuntual(FN_CERRAR, tr.cerrar, deps)) creados.push(`cerrar ${fmtHM(tr.cerrar)}`);
  deps.registrar("programador", "programada", "—",
    (creados.length ? `disparadores creados: ${creados.join(", ")}` : "sin transiciones hoy") + (borrados ? `; ${borrados} puntual(es) anterior(es) eliminado(s)` : ""));
  reconciliarVentanaCon(deps);
  return { creados };
}

// Cada hora: el estado real debe coincidir con la regla (VEN-05).
function reconciliarVentanaCon(deps) {
  if (getModoVentana(deps) === "MANUAL") {
    deps.registrar("reconciliación", "reconciliación", "—", "sin acción: modo MANUAL");
    return { cambio: false };
  }
  const deseado = ventanaAbierta(deps.ahora(), deps.festivos);
  return aplicarEstadoVentana(deseado, "reconciliación",
    deseado ? "el formulario estaba cerrado dentro de la ventana" : "el formulario estaba abierto fuera de la ventana", deps);
}

// Puntos de entrada de los disparadores (Apps Script les pasa un evento; no se usa).
function programarVentana() { return programarVentanaCon(depsVentana()); }
function reconciliarVentana() { return reconciliarVentanaCon(depsVentana()); }
function abrirFormulario() { const deps = depsVentana(); aplicarEstadoVentana(true, "programada", "apertura programada", deps); eliminarDisparadorPropio(FN_ABRIR, deps); }
function cerrarFormulario() { const deps = depsVentana(); aplicarEstadoVentana(false, "programada", "cierre programado", deps); eliminarDisparadorPropio(FN_CERRAR, deps); }

// ---------- Menú (VEN-06, VEN-09) ----------

function abrirAhoraCon(deps) {
  setModoVentana(deps, "MANUAL");
  return aplicarEstadoVentana(true, "manual:" + deps.usuario(), "abierto a mano; programación suspendida (modo MANUAL)", deps);
}
function cerrarAhoraCon(deps) {
  setModoVentana(deps, "MANUAL");
  return aplicarEstadoVentana(false, "manual:" + deps.usuario(), "cerrado a mano; programación suspendida (modo MANUAL)", deps);
}
function suspenderProgramacionCon(deps) {
  setModoVentana(deps, "MANUAL");
  deps.registrar("suspender", "manual:" + deps.usuario(), "—", "programación suspendida; el formulario queda como está");
}
function reanudarProgramacionCon(deps) {
  setModoVentana(deps, "AUTO");
  deps.registrar("reanudar", "manual:" + deps.usuario(), "—", "programación reanudada; se reconcilia de inmediato");
  return reconciliarVentanaCon(deps);
}

function abrirAhora() { const r = abrirAhoraCon(depsVentana()); mostrarResultado("Abrir formulario", r.error ? "Error: " + r.error : (r.cambio ? "Formulario abierto. " : "Ya estaba abierto. ") + "Modo MANUAL: la programación automática no lo tocará hasta 'Reanudar programación'."); }
function cerrarAhora() { const r = cerrarAhoraCon(depsVentana()); mostrarResultado("Cerrar formulario", r.error ? "Error: " + r.error : (r.cambio ? "Formulario cerrado. " : "Ya estaba cerrado. ") + "Modo MANUAL: la programación automática no lo tocará hasta 'Reanudar programación'."); }
function suspenderProgramacion() { suspenderProgramacionCon(depsVentana()); mostrarResultado("Programación suspendida", "Modo MANUAL. El formulario queda en su estado actual hasta 'Reanudar programación'."); }
function reanudarProgramacion() { const r = reanudarProgramacionCon(depsVentana()); mostrarResultado("Programación reanudada", "Modo AUTO." + (r.cambio ? " El formulario se ajustó a la regla." : " El formulario ya estaba en el estado correcto.")); }

function estadoVentanaCon(deps) {
  const ahora = deps.ahora();
  let real; try { real = deps.formulario.estaAbierto() ? "ABIERTO" : "CERRADO"; } catch (e) { real = "ERROR: " + e.message; }
  const regla = ventanaAbierta(ahora, deps.festivos) ? "ABIERTO" : "CERRADO";
  const puntuales = deps.triggers.listar().filter(t => t.fn === FN_ABRIR || t.fn === FN_CERRAR).map(t => t.fn);
  return [
    `Formulario: ${deps.formulario.titulo()}`,
    `Estado real: ${real}`,
    `Estado según la regla: ${regla}`,
    `Modo: ${getModoVentana(deps)}`,
    `Próxima apertura: ${fmtHM(proximaApertura(ahora, deps.festivos))}`,
    `Próximo cierre: ${fmtHM(proximoCierre(ahora, deps.festivos))}`,
    `Disparadores puntuales pendientes: ${puntuales.length ? puntuales.join(", ") : "ninguno"}`
  ].join("\n");
}
function estadoVentana() { mostrarResultado("Estado de la ventana", estadoVentanaCon(depsVentana())); }

// ---------- Pruebas (spec 02) ----------

// Dependencias simuladas: formulario, propiedades, disparadores y bitácora en memoria.
function depsVentanaSimuladas(instante, abiertoInicial) {
  const estado = { abierto: abiertoInicial, mensaje: "", ahora: instante, bitacora: [], props: {}, triggers: [], avisos: 0, seq: 0 };
  const deps = depsVentana({
    ahora: () => estado.ahora,
    festivos: festivos2026(),
    formulario: {
      estaAbierto: () => { if (estado.falla) throw new Error("sin permiso"); return estado.abierto; },
      abrir: () => { estado.abierto = true; },
      cerrar: m => { estado.abierto = false; estado.mensaje = m; },
      titulo: () => "Formulario simulado"
    },
    props: { get: k => (k in estado.props ? estado.props[k] : null), set: (k, v) => { estado.props[k] = v; } },
    triggers: {
      listar: () => estado.triggers.slice(),
      crear: (fn, fecha) => { const id = "t" + (++estado.seq); estado.triggers.push({ id, fn, fecha }); return id; },
      borrar: t => { const i = estado.triggers.findIndex(x => x.id === t.id); if (i >= 0) estado.triggers.splice(i, 1); }
    },
    registrar: (accion, origen, est, detalle) => estado.bitacora.push({ accion, origen, estado: est, detalle }),
    usuario: () => "admin@prueba",
    avisarAdmin: () => { estado.avisos++; }
  });
  return { deps, estado };
}

function probarVentana() {
  const F = festivos2026(), fallos = []; let n = 0;
  const igual = (nombre, real, esperado) => { n++; if (String(real) !== String(esperado)) fallos.push(`${nombre}: esperado ${esperado}, obtenido ${real}`); };
  const ultima = b => b.length ? `${b[b.length - 1].accion}|${b[b.length - 1].origen}` : "—";

  // CA-VEN-03: transiciones del día
  [
    ["lun 19-oct", [2026, 10, 19], "08:00", null], ["mar 20-oct", [2026, 10, 20], null, null], ["vie 16-oct", [2026, 10, 16], null, "15:30"],
    ["vie 9-oct", [2026, 10, 9], null, "15:30"], ["mar 13-oct", [2026, 10, 13], "08:00", null], ["mié 1-abr", [2026, 4, 1], null, "15:30"],
    ["lun 6-abr", [2026, 4, 6], "08:00", null], ["lun 7-dic", [2026, 12, 7], "08:00", "15:30"], ["mié 9-dic", [2026, 12, 9], "08:00", null],
    ["sáb 17-oct", [2026, 10, 17], null, null]
  ].forEach(([nombre, d, abrir, cerrar]) => {
    const tr = transicionesDelDia(fechaLocal(...d), F);
    igual(`transiciones ${nombre}`, `${tr.abrir ? fmtHM(tr.abrir).slice(11) : null}/${tr.cerrar ? fmtHM(tr.cerrar).slice(11) : null}`, `${abrir}/${cerrar}`);
  });

  // CA-VEN-04: mensaje
  igual("mensaje vie 9-oct", mensajeCierre(proximaApertura(fechaLocal(2026, 10, 9, 15, 30), F)).includes("se reabrirá el martes 13 de octubre de 2026 a las 8:00 a. m."), true);
  igual("mensaje mié 1-abr", mensajeCierre(proximaApertura(fechaLocal(2026, 4, 1, 15, 30), F)).includes("lunes 6 de abril de 2026"), true);
  igual("mensaje sin extensión", mensajeCierre(null).includes("extensión"), false);

  // Programador: lun 19-oct 06:00 crea solo "abrir"; el formulario amaneció abierto → la reconciliación lo cierra
  let s = depsVentanaSimuladas(fechaLocal(2026, 10, 19, 6, 0), true);
  programarVentanaCon(s.deps);
  igual("programador lun: un puntual", s.estado.triggers.map(t => t.fn).join(","), FN_ABRIR);
  igual("programador lun: reconcilió (cerró antes de las 8)", s.estado.abierto, false);
  // lun 7-dic crea ambos
  s = depsVentanaSimuladas(fechaLocal(2026, 12, 7, 6, 0), false);
  programarVentanaCon(s.deps);
  igual("programador 7-dic: dos puntuales", s.estado.triggers.map(t => t.fn).sort().join(","), [FN_ABRIR, FN_CERRAR].sort().join(","));
  // sábado: ninguno
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 17, 6, 0), false);
  programarVentanaCon(s.deps);
  igual("programador sáb: sin puntuales", s.estado.triggers.length, 0);
  // programador tardío (09:00): abre de inmediato sin crear puntual
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 19, 9, 0), false);
  programarVentanaCon(s.deps);
  igual("programador tardío abre ya", s.estado.abierto, true);
  igual("programador tardío no crea puntual", s.estado.triggers.length, 0);

  // CA-VEN-10: los puntuales viejos se limpian
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 20, 6, 0), true);
  s.estado.triggers.push({ id: "viejo1", fn: FN_ABRIR }, { id: "viejo2", fn: FN_CERRAR }, { id: "otro", fn: "verificarSolicitudesVencidas" });
  programarVentanaCon(s.deps);
  igual("limpieza conserva los recurrentes", s.estado.triggers.map(t => t.fn).join(","), "verificarSolicitudesVencidas");

  // Disparador puntual se elimina a sí mismo
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 16, 15, 30), true);
  s.estado.triggers.push({ id: "c1", fn: FN_CERRAR });
  aplicarEstadoVentana(false, "programada", "cierre programado", s.deps); eliminarDisparadorPropio(FN_CERRAR, s.deps);
  igual("cierre programado cierra", s.estado.abierto, false);
  igual("cierre programado borra su disparador", s.estado.triggers.length, 0);
  igual("mensaje de cierre con reapertura", s.estado.mensaje.includes("lunes 19 de octubre de 2026"), true);

  // CA-VEN-05: cierre perdido → reconciliación
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 16, 16, 10), true);
  reconciliarVentanaCon(s.deps);
  igual("reconciliación cierra", s.estado.abierto, false);
  igual("reconciliación registra", ultima(s.estado.bitacora), "cerrar|reconciliación");
  reconciliarVentanaCon(s.deps);
  igual("reconciliación sin cambio no registra", s.estado.bitacora.length, 1);

  // CA-VEN-06: modo manual
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 17, 10, 0), false);
  abrirAhoraCon(s.deps);
  igual("abrir ahora abre", s.estado.abierto, true);
  igual("abrir ahora → MANUAL", getModoVentana(s.deps), "MANUAL");
  s.estado.ahora = fechaLocal(2026, 10, 17, 11, 0);
  reconciliarVentanaCon(s.deps);
  igual("reconciliación respeta MANUAL", s.estado.abierto, true);
  igual("reconciliación anota MANUAL", s.estado.bitacora[s.estado.bitacora.length - 1].detalle, "sin acción: modo MANUAL");
  programarVentanaCon(s.deps);
  igual("programador respeta MANUAL", s.estado.triggers.length, 0);
  reanudarProgramacionCon(s.deps);
  igual("reanudar cierra", s.estado.abierto, false);
  igual("reanudar → AUTO", getModoVentana(s.deps), "AUTO");

  // VEN-11: error de FormApp → bitácora + un solo aviso por día
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 19, 8, 0), false);
  s.estado.falla = true;
  const r1 = aplicarEstadoVentana(true, "programada", "", s.deps), r2 = aplicarEstadoVentana(true, "programada", "", s.deps);
  igual("error devuelto", !!r1.error && !!r2.error, true);
  igual("error en bitácora", s.estado.bitacora.filter(b => b.accion === "error").length, 2);
  igual("un aviso por día", s.estado.avisos, 1);

  // VEN-09: estado
  s = depsVentanaSimuladas(fechaLocal(2026, 10, 19, 7, 0), false);
  const texto = estadoVentanaCon(s.deps);
  igual("estado muestra próxima apertura", texto.includes("Próxima apertura: 2026-10-19 08:00"), true);
  igual("estado muestra próximo cierre", texto.includes("Próximo cierre: 2026-10-23 15:30"), true);

  const resumen = fallos.length ? `${fallos.length} de ${n} casos FALLAN:\n${fallos.join("\n")}` : `${n} casos correctos.`;
  mostrarResultado("Prueba de ventana del formulario", resumen);
  return fallos.length === 0;
}
