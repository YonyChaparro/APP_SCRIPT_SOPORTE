/*
  =================================================================
  --- INFORME DE VERIFICACIÓN EN LA HOJA ---
  =================================================================

  Las suites `probar*()` corren sin tocar Google: son JavaScript puro. Quedan fuera de su
  alcance las cosas que solo existen dentro de Sheets —la pestaña `Festivos`, la bandeja
  de pendientes, los disparadores, el formulario real— y que `specs/README.md` lista como
  «verificación pendiente en la hoja».

  Este archivo las ejecuta todas de corrido y escribe el resultado en una pestaña, para
  poder revisarlo (o copiarlo y mandarlo) de una sola vez en lugar de ir abriendo opciones
  del menú una por una.

  Entrada:  Soporte → Verificación completa…

  Reparte los pasos en dos grupos:
    - DIAGNÓSTICO: se ejecuta siempre.
    - CORRECCIÓN:  escribe en la hoja (genera festivos, recalcula la bandeja). Se ejecuta
      únicamente si se confirma en el diálogo.

  El diagnóstico es de solo lectura con **una excepción**, heredada de `detectarColumnas`:
  cuando a una hoja le faltan los encabezados propios del script (RADICADO, ESTADO,
  FECHA LÍMITE…), los escribe en columnas libres. Nunca sobrescribe una celda con
  contenido, y el paso 3 informa exactamente cuáles creó.

  Lo que NO hace nunca por su cuenta, por ser destructivo o por mandar correo:
  instalar disparadores (`configurarTriggers` borra todos los existentes y avisa por
  correo) y abrir o cerrar el formulario. Ambos se reportan y se dejan al menú.
*/

const HOJA_VERIFICACION = "Informe_Verificación";

// Años que la verificación espera tener con festivos generados.
function aniosEsperados(ahora) {
  const y = (ahora || new Date()).getFullYear();
  return [y, y + 1];
}

// Un paso del informe. `estado` es OK, AVISO, ERROR u OMITIDO.
function paso(grupo, nombre, estado, detalle) {
  return { grupo, nombre, estado, detalle: String(detalle === undefined || detalle === null ? "" : detalle) };
}

// Ejecuta `fn` y lo convierte en un paso, sin dejar que una excepción aborte el informe.
function pasoSeguro(grupo, nombre, fn) {
  try {
    const r = fn();
    return paso(grupo, nombre, r.estado, r.detalle);
  } catch (e) {
    return paso(grupo, nombre, "ERROR", `${e.message}${e.stack ? "\n" + String(e.stack).split("\n").slice(0, 3).join("\n") : ""}`);
  }
}

/*
  =================================================================
  --- PASOS ---
  =================================================================
*/

function verificarEntorno() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const esPruebas = CONFIG.VENTANA.FORMULARIO === CONFIG.FORMULARIOS.PRUEBAS;
  const lineas = [
    `Hoja: ${ss.getName()} (${ss.getId()})`,
    `Zona horaria del script: ${Session.getScriptTimeZone()}`,
    `Ejecuta: ${(function () { try { return Session.getActiveUser().getEmail() || "desconocido"; } catch (e) { return "desconocido"; } })()}`,
    `Formulario que gobierna la ventana: ${CONFIG.VENTANA.FORMULARIO} (${esPruebas ? "PRUEBAS" : "producción u otro"})`,
    `Correo administrativo: ${CONFIG.EMAIL_ADMIN}`
  ];
  return { estado: esPruebas ? "OK" : "AVISO", detalle: lineas.join("\n") + (esPruebas ? "" : "\n⚠ La ventana apunta a un formulario que no es el de pruebas.") };
}

function verificarHojas() {
  const faltan = [], hay = [];
  Object.keys(CONFIG.HOJAS).forEach(k => {
    const nombre = CONFIG.HOJAS[k];
    const hoja = getHoja(nombre);
    if (hoja) hay.push(`${nombre} (${Math.max(0, hoja.getLastRow() - 1)} filas)`);
    else faltan.push(nombre);
  });
  // Archivo y Bitácora se crean solas al usarse; su ausencia no es un problema.
  const criticas = faltan.filter(n => n === CONFIG.HOJAS.RESPUESTAS || n === CONFIG.HOJAS.PENDIENTES);
  return {
    estado: criticas.length ? "ERROR" : (faltan.length ? "AVISO" : "OK"),
    detalle: `Presentes: ${hay.join(", ") || "ninguna"}\nAusentes: ${faltan.join(", ") || "ninguna"}` +
      (criticas.length ? `\n⚠ Faltan hojas imprescindibles: ${criticas.join(", ")}` : "")
  };
}

// Encabezados de la fila 1, como texto.
function encabezadosDe(hoja) {
  return hoja.getRange(1, 1, 1, Math.max(1, hoja.getLastColumn())).getValues()[0].map(h => String(h == null ? "" : h).trim());
}

function verificarColumnas() {
  const partes = [];
  const creados = [];
  let estado = "OK";

  // detectarColumnas() etiqueta las columnas propias del script que falten. Se compara la
  // fila de encabezados antes y después para poder decir qué creó, en vez de que aparezcan
  // columnas nuevas sin explicación.
  const detectar = (hoja, fn) => {
    const antes = encabezadosDe(hoja);
    const col = fn(hoja);
    encabezadosDe(hoja).forEach((h, i) => { if (h && h !== antes[i]) creados.push(`${hoja.getName()}!${letraColumna(i + 1)}1 = "${h}"`); });
    return col;
  };

  const resp = getHoja(CONFIG.HOJAS.RESPUESTAS);
  if (!resp) { partes.push(`${CONFIG.HOJAS.RESPUESTAS}: ausente`); estado = "ERROR"; }
  else {
    const COL = detectar(resp, detectarColumnas);
    partes.push(`${CONFIG.HOJAS.RESPUESTAS}: ${encabezadosDe(resp).length} columnas. ` +
      `CATEGORÍA=${COL.CATEGORIA}, SERVICIO=[${[].concat(COL.SERVICIO).join(", ")}], CANTIDAD=${COL.CANTIDAD}, RADICADO=${COL.CODIGO}, ESTADO=${COL.ESTADO}`);
    if (COL.faltantes && COL.faltantes.length) {
      estado = "AVISO";
      partes.push(`⚠ Sin encabezado reconocible (se usa la posición de respaldo): ${COL.faltantes.join(", ")}`);
    }
  }

  const pend = getHoja(CONFIG.HOJAS.PENDIENTES);
  if (!pend) { partes.push(`${CONFIG.HOJAS.PENDIENTES}: ausente`); estado = "ERROR"; }
  else {
    const antes = encabezadosDe(pend);
    const nuevas = ["INICIO_RELOJ", "FECHA_LIMITE"].filter(k => !antes.some(h => CONFIG.ENCABEZADOS_PENDIENTES[k].test(h)));
    const COLP = detectar(pend, detectarColumnasPendientes);
    partes.push(`${CONFIG.HOJAS.PENDIENTES}: ${encabezadosDe(pend).length} columnas. TIEMPO=${COLP.TIEMPO}, INICIO RELOJ=${COLP.INICIO_RELOJ}, FECHA LÍMITE=${COLP.FECHA_LIMITE}`);
    if (nuevas.length) {
      estado = estado === "ERROR" ? estado : "AVISO";
      partes.push(`⚠ La bandeja no traía ${nuevas.join(" ni ")}: falta migrarla con «Recalcular plazos de pendientes» (T-01-09).`);
    }
  }

  if (creados.length) partes.push(`Encabezados creados en columnas libres (no se sobrescribió nada): ${creados.join(", ")}`);
  return { estado, detalle: partes.join("\n") };
}

function verificarFestivos() {
  _festivosCache = null;
  const f = leerFestivos();
  if (!f.existe) return { estado: "AVISO", detalle: `No existe la pestaña ${CONFIG.HOJAS.FESTIVOS}: solo se excluyen sábados y domingos. Los plazos que crucen un festivo saldrán largos.` };
  const anios = Object.keys(f.anios).sort();
  const faltan = aniosEsperados().filter(a => !(f.anios[a] && f.anios[a].NACIONAL > 0));
  const detalle = [
    `${f.filas} filas, ${f.invalidas} con fecha inválida.`,
    `Años con festivos: ${anios.map(a => `${a} (${f.anios[a].NACIONAL} nacionales, ${f.anios[a].MANUAL} manuales)`).join("; ") || "ninguno"}`,
    faltan.length ? `⚠ Sin generar: ${faltan.join(", ")}` : "Los dos años en curso están generados."
  ].join("\n");
  return { estado: faltan.length || f.invalidas ? "AVISO" : "OK", detalle };
}

function verificarSuites() {
  const suites = [
    ["Cálculo de plazos", probarCalculo],
    ["Catálogo de servicios", probarServicios],
    ["Tiempos de respuesta", probarTiempos],
    ["Calendario hábil", probarCalendario],
    ["Reloj hábil", probarRelojHabil],
    ["Ventana del formulario", probarVentana]
  ];
  const lineas = [];
  let fallidas = 0;
  const capturaPrevia = _capturaResultados;
  try {
    suites.forEach(([nombre, fn]) => {
      const captura = [];
      _capturaResultados = captura;
      let ok;
      try { ok = fn(); } catch (e) { ok = false; captura.push({ titulo: nombre, texto: `EXCEPCIÓN: ${e.message}` }); }
      _capturaResultados = capturaPrevia;
      if (!ok) fallidas++;
      // Del texto de cada suite basta la primera línea cuando pasa; todo él cuando falla.
      const texto = captura.map(c => c.texto).join("\n");
      lineas.push(`${ok ? "✓" : "✗"} ${nombre}: ${ok ? texto.split("\n")[0] : texto}`);
    });
  } finally {
    _capturaResultados = capturaPrevia;
  }
  return { estado: fallidas ? "ERROR" : "OK", detalle: lineas.join("\n") };
}

// La comprobación de la fórmula va aparte de las suites: es la única que necesita a Sheets
// de verdad, porque crea una hoja temporal y compara lo que Sheets calcula con lo que
// calcula el script. Fuera de Sheets no puede correr, y eso no es un fallo del sistema.
function verificarFormula() {
  const captura = [];
  const previa = _capturaResultados;
  _capturaResultados = captura;
  let ok;
  try { ok = probarFormulaHorasHabiles(); } finally { _capturaResultados = previa; }
  return { estado: ok ? "OK" : "ERROR", detalle: captura.map(c => c.texto).join("\n") || "Sin salida." };
}

function verificarBandeja() {
  const hoja = getHoja(CONFIG.HOJAS.PENDIENTES);
  if (!hoja) return { estado: "ERROR", detalle: `No existe la hoja ${CONFIG.HOJAS.PENDIENTES}.` };
  if (hoja.getLastRow() <= 1) return { estado: "OK", detalle: "La bandeja está vacía." };

  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
  const COLP = detectarColumnasPendientes(hoja);
  const ahora = new Date();
  const festivos = leerFestivos().fechas;
  let sinLimite = 0, fechaMala = 0, vencidas = 0, proximas = 0;
  const ejemplos = [];

  datos.forEach(f => {
    const g = campo => f[COLP[campo] - 1];
    if (!g("CODIGO")) return;
    if (!esFechaValida(g("FECHA_SOLICITUD")) || g("FECHA_SOLICITUD") < new Date(2020, 0, 1)) {
      fechaMala++;
      if (ejemplos.length < 5) ejemplos.push(`${g("CODIGO")}: fecha de solicitud inválida (${g("FECHA_SOLICITUD")})`);
      return;
    }
    const limite = g("FECHA_LIMITE");
    if (!esFechaValida(limite)) { sinLimite++; return; }
    const restantes = horasHabilesEntre(ahora, limite, festivos);
    const totales = horasDeTiempo(g("TIEMPO"));
    const clase = clasificarParaAlerta(totales, restantes);
    if (clase === "vencida") vencidas++;
    else if (clase === "proxima") proximas++;
  });

  const detalle = [
    `${datos.filter(f => f[COLP.CODIGO - 1]).length} solicitudes pendientes.`,
    `Sin fecha límite (sin migrar): ${sinLimite}`,
    `Con fecha de solicitud inválida: ${fechaMala}`,
    `Vencidas: ${vencidas} · Próximas a vencer: ${proximas}`,
    ejemplos.length ? "Ejemplos:\n  " + ejemplos.join("\n  ") : ""
  ].filter(Boolean).join("\n");
  return { estado: sinLimite || fechaMala ? "AVISO" : "OK", detalle };
}

function verificarTriggers() {
  const esperados = ["onFormSubmit", "onEditTrigger", "verificarSolicitudesVencidas", "generarReporteSemanal", "programarVentana", "reconciliarVentana"];
  const instalados = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  const faltan = esperados.filter(f => instalados.indexOf(f) === -1);
  const sobran = instalados.filter(f => esperados.indexOf(f) === -1 && f !== FN_ABRIR && f !== FN_CERRAR);
  const puntuales = instalados.filter(f => f === FN_ABRIR || f === FN_CERRAR);
  const detalle = [
    `Instalados (${instalados.length}): ${instalados.join(", ") || "ninguno"}`,
    faltan.length ? `⚠ Faltan: ${faltan.join(", ")} → usar «Soporte → Configurar triggers»` : "Los seis disparadores permanentes están instalados.",
    sobran.length ? `⚠ Sobran o son de versiones anteriores: ${sobran.join(", ")}` : "",
    puntuales.length ? `Disparadores puntuales de la ventana pendientes: ${puntuales.join(", ")}` : ""
  ].filter(Boolean).join("\n");
  // No se instalan desde aquí: configurarTriggers() borra todos los existentes y manda correo.
  return { estado: faltan.length || sobran.length ? "AVISO" : "OK", detalle };
}

function verificarVentana() {
  const texto = estadoVentanaCon(depsVentana());
  const ilegible = /Estado real: ERROR/.test(texto);
  const real = (texto.match(/Estado real: (\w+)/) || [])[1];
  const regla = (texto.match(/Estado según la regla: (\w+)/) || [])[1];
  const coherente = !ilegible && real === regla;
  const manual = /Modo: MANUAL/.test(texto);
  let nota = "";
  if (ilegible) nota = "\n⚠ No se pudo leer el estado del formulario: revisar permisos o el ID de CONFIG.VENTANA.FORMULARIO.";
  else if (manual && !coherente) nota = "\nEn modo MANUAL la programación no toca el formulario; que real y regla difieran es esperable.";
  else if (!coherente) nota = "\n⚠ El formulario no está en el estado que dicta la regla. Revisar los disparadores de la ventana.";
  return { estado: ilegible ? "ERROR" : (coherente || manual ? "OK" : "AVISO"), detalle: texto + nota };
}

function verificarFormularios() {
  const todas = [];
  const lineas = [];
  let estado = "OK";
  [["PRUEBAS", CONFIG.FORMULARIOS.PRUEBAS], ["PRODUCCIÓN", CONFIG.FORMULARIOS.PRODUCCION]].forEach(([etiqueta, id]) => {
    try {
      const r = filasAuditoriaFormulario(id);
      todas.push.apply(todas, r.filas);
      const sin = r.filas.filter(f => f[4] === "SIN PUNTAJE");
      lineas.push(`${etiqueta} — ${r.titulo}: ${r.filas.length} opciones, ${r.sinPuntaje} sin puntaje.`);
      sin.slice(0, 10).forEach(f => lineas.push(`   ✗ [${f[2]}] ${f[1]} → «${f[3]}»`));
      if (sin.length > 10) lineas.push(`   … y ${sin.length - 10} más (ver hoja ${CONFIG.HOJAS.AUDITORIA})`);
      if (r.sinPuntaje) estado = "AVISO";
    } catch (e) {
      lineas.push(`${etiqueta} (${id}): no se pudo abrir — ${e.message}`);
      estado = estado === "OK" ? "AVISO" : estado;
    }
  });
  if (todas.length) escribirAuditoria(todas);
  return { estado, detalle: lineas.join("\n") + (todas.length ? `\nDetalle completo de los dos formularios en la hoja ${CONFIG.HOJAS.AUDITORIA}.` : "") };
}

// --- Pasos que escriben ----------------------------------------------------

function corregirFestivos() {
  const faltan = aniosEsperados().filter(a => { const f = leerFestivos(); return !(f.anios[a] && f.anios[a].NACIONAL > 0); });
  if (!faltan.length) return { estado: "OK", detalle: "No hacía falta generar nada." };
  const mensajes = faltan.map(a => generarFestivos(a).mensaje);
  return { estado: "OK", detalle: mensajes.join("\n") };
}

function corregirBandeja() {
  const hoja = getHoja(CONFIG.HOJAS.PENDIENTES);
  if (!hoja || hoja.getLastRow() <= 1) return { estado: "OMITIDO", detalle: "La bandeja está vacía." };
  const captura = [];
  const previa = _capturaResultados;
  _capturaResultados = captura;
  try { recalcularPendientes(); } finally { _capturaResultados = previa; }
  return { estado: "OK", detalle: captura.map(c => c.texto).join("\n") || "Recálculo ejecutado." };
}

/*
  =================================================================
  --- INFORME ---
  =================================================================
*/

// Ejecuta la verificación y devuelve la lista de pasos. `escribir` habilita los pasos
// que modifican la hoja (generar festivos y recalcular la bandeja).
function ejecutarVerificacion(opciones) {
  const escribir = !!(opciones && opciones.escribir);
  const pasos = [];

  pasos.push(pasoSeguro("Diagnóstico", "1. Entorno", verificarEntorno));
  pasos.push(pasoSeguro("Diagnóstico", "2. Hojas del libro", verificarHojas));
  pasos.push(pasoSeguro("Diagnóstico", "3. Columnas detectadas", verificarColumnas));
  pasos.push(pasoSeguro("Diagnóstico", "4. Pestaña Festivos", verificarFestivos));

  if (escribir) pasos.push(pasoSeguro("Corrección", "5. Generar festivos faltantes", corregirFestivos));
  else pasos.push(paso("Corrección", "5. Generar festivos faltantes", "OMITIDO", "No se confirmó la escritura."));

  pasos.push(pasoSeguro("Diagnóstico", "6. Pruebas automáticas", verificarSuites));
  pasos.push(pasoSeguro("Diagnóstico", "6b. Fórmula de horas hábiles ↔ script", verificarFormula));
  pasos.push(pasoSeguro("Diagnóstico", "7. Bandeja de pendientes", verificarBandeja));

  if (escribir) pasos.push(pasoSeguro("Corrección", "8. Recalcular plazos de pendientes", corregirBandeja));
  else pasos.push(paso("Corrección", "8. Recalcular plazos de pendientes", "OMITIDO", "No se confirmó la escritura."));

  if (escribir) pasos.push(pasoSeguro("Diagnóstico", "9. Bandeja tras el recálculo", verificarBandeja));

  pasos.push(pasoSeguro("Diagnóstico", "10. Disparadores", verificarTriggers));
  pasos.push(pasoSeguro("Diagnóstico", "11. Ventana del formulario", verificarVentana));
  pasos.push(pasoSeguro("Diagnóstico", "12. Opciones de los formularios", verificarFormularios));

  return pasos;
}

// Vuelca los pasos en la pestaña del informe y devuelve el texto plano equivalente.
function escribirInforme(pasos) {
  const ahora = new Date();
  const sello = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const texto = [`INFORME DE VERIFICACIÓN — ${sello}`]
    .concat(pasos.map(p => `[${p.estado}] ${p.nombre} (${p.grupo})\n${p.detalle.split("\n").map(l => "    " + l).join("\n")}`))
    .join("\n\n");

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName(HOJA_VERIFICACION) || ss.insertSheet(HOJA_VERIFICACION);
    hoja.clear();
    hoja.getRange(1, 1, 1, 2).setValues([["INFORME DE VERIFICACIÓN", sello]]).setFontWeight("bold");
    hoja.getRange(2, 1, 1, 4).setValues([["GRUPO", "PASO", "ESTADO", "DETALLE"]]).setFontWeight("bold");
    const filas = pasos.map(p => [p.grupo, p.nombre, p.estado, p.detalle]);
    if (filas.length) hoja.getRange(3, 1, filas.length, 4).setValues(filas);
    hoja.setFrozenRows(2);
    hoja.autoResizeColumns(1, 3);
  } catch (e) {
    Logger.log("No se pudo escribir la pestaña del informe: " + e.message);
  }

  Logger.log(texto);
  return texto;
}

function resumenVerificacion(pasos) {
  const cuenta = { OK: 0, AVISO: 0, ERROR: 0, OMITIDO: 0 };
  pasos.forEach(p => { cuenta[p.estado] = (cuenta[p.estado] || 0) + 1; });
  const simbolo = { OK: "✓", AVISO: "!", ERROR: "✗", OMITIDO: "·" };
  return [
    `${cuenta.ERROR} error(es), ${cuenta.AVISO} aviso(s), ${cuenta.OK} correcto(s), ${cuenta.OMITIDO} omitido(s).`,
    ""
  ].concat(pasos.map(p => `${simbolo[p.estado] || "?"} ${p.nombre}`))
   .concat(["", `El detalle completo quedó en la pestaña «${HOJA_VERIFICACION}».`])
   .join("\n");
}

// Entrada del menú: pregunta si se autorizan los pasos que escriben y ejecuta.
function verificacionCompleta() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert(
    "Verificación completa",
    "Se revisarán hojas, columnas, festivos, las 6 suites de pruebas, la bandeja, los disparadores, " +
    "la ventana y las opciones de los dos formularios. El resultado se escribe en la pestaña " +
    `«${HOJA_VERIFICACION}».\n\n` +
    "¿Aplicar además las correcciones que escriben en la hoja (generar los festivos que falten y " +
    "recalcular los plazos de la bandeja)?\n\n" +
    "SÍ = diagnóstico + correcciones.\nNO = solo diagnóstico.\n\n" +
    "Con NO la única escritura posible es la de siempre al detectar columnas: si a una hoja le " +
    "faltan los encabezados propios del script (RADICADO, ESTADO, FECHA LÍMITE…), se crean en " +
    "columnas libres. Nunca se sobrescribe una celda con contenido y el informe dice cuáles creó.\n\n" +
    "En ningún caso se instalan disparadores ni se abre o cierra el formulario: eso sigue en el menú.",
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (r === ui.Button.CANCEL || r === ui.Button.CLOSE) return;

  const pasos = ejecutarVerificacion({ escribir: r === ui.Button.YES });
  const texto = escribirInforme(pasos);
  ui.alert("Verificación completa", resumenVerificacion(pasos), ui.ButtonSet.OK);
  return texto;
}

// Variante sin interfaz, para ejecutar desde el editor o desde el arnés de pruebas.
function verificacionSoloDiagnostico() {
  const pasos = ejecutarVerificacion({ escribir: false });
  const texto = escribirInforme(pasos);
  mostrarResultado("Verificación (solo diagnóstico)", resumenVerificacion(pasos));
  return texto;
}
