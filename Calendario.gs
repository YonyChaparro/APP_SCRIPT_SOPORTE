/*
  =================================================================
  --- CALENDARIO HÁBIL (spec 00) ---
  =================================================================
  Festivos nacionales de Colombia, aritmética de horas hábiles y
  regla de la ventana de atención. Un día hábil aporta 24 h; sábados,
  domingos y festivos aportan 0 h. Todas las funciones aceptan un
  `festivos` opcional (Set de "yyyy-MM-dd") para pruebas; si se omite,
  leen la pestaña Festivos.
*/

// Reglas de festivos nacionales (Ley 51 de 1983). Un cambio legal es una edición aquí.
const FESTIVOS_COLOMBIA = {
  fijos: [
    [1, 1, "Año Nuevo"], [5, 1, "Día del Trabajo"], [7, 20, "Día de la Independencia"],
    [8, 7, "Batalla de Boyacá"], [12, 8, "Inmaculada Concepción"], [12, 25, "Navidad"]
  ],
  // Se trasladan al lunes siguiente cuando no caen en lunes (Ley Emiliani).
  emiliani: [
    [1, 6, "Día de los Reyes Magos"], [3, 19, "Día de San José"], [6, 29, "San Pedro y San Pablo"],
    [8, 15, "Asunción de la Virgen"], [10, 12, "Día de la Raza"], [11, 1, "Todos los Santos"],
    [11, 11, "Independencia de Cartagena"]
  ],
  // Desplazamiento en días respecto al Domingo de Pascua (los positivos ya están trasladados al lunes).
  pascua: [
    [-3, "Jueves Santo"], [-2, "Viernes Santo"], [43, "Ascensión del Señor"],
    [64, "Corpus Christi"], [71, "Sagrado Corazón de Jesús"]
  ]
};

const MS_HORA = 3600000;

// ---------- Fechas ----------

// "yyyy-MM-dd" en la zona del script (los getters locales de Date usan esa zona).
function claveFecha(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function inicioDeDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function finDeDia(d)    { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
function diaAnterior(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); }
function horaDelDia(d, hm) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hm.h, hm.m); }
function sumarDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function esFechaValida(d) { return d instanceof Date && !isNaN(d.getTime()); }

// ---------- Festivos nacionales ----------

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher).
function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

// Lunes siguiente si no es lunes (getDay: 0 domingo … 6 sábado).
function trasladarALunes(d) { return sumarDias(d, (8 - d.getDay()) % 7); }

// Los 18 festivos nacionales del año, ordenados: [{ fecha, descripcion, regla }].
function festivosNacionales(anio) {
  const lista = [];
  FESTIVOS_COLOMBIA.fijos.forEach(([m, d, n]) => lista.push({ fecha: new Date(anio, m - 1, d), descripcion: n, regla: "fijo" }));
  FESTIVOS_COLOMBIA.emiliani.forEach(([m, d, n]) => {
    const original = new Date(anio, m - 1, d), fecha = trasladarALunes(original);
    const desc = fecha.getTime() === original.getTime() ? n : `${n} (trasladado del ${d} de ${MESES_ES[m - 1]})`;
    lista.push({ fecha, descripcion: desc, regla: "Emiliani" });
  });
  const P = pascua(anio);
  FESTIVOS_COLOMBIA.pascua.forEach(([off, n]) => lista.push({ fecha: sumarDias(P, off), descripcion: n, regla: "Pascua" }));
  return lista.sort((x, y) => x.fecha - y.fecha);
}

// ---------- Pestaña Festivos ----------

let _festivosCache = null;

// Lee la pestaña una vez por ejecución. Devuelve { fechas: Set, existe, filas, invalidas, anios: { 2026: { NACIONAL, MANUAL } } }.
function leerFestivos() {
  if (_festivosCache) return _festivosCache;
  const res = { fechas: new Set(), existe: false, filas: 0, invalidas: 0, anios: {} };
  const hoja = getHoja(CONFIG.HOJAS.FESTIVOS);
  if (hoja) {
    res.existe = true;
    if (hoja.getLastRow() > 1) {
      hoja.getRange(2, 1, hoja.getLastRow() - 1, 3).getValues().forEach(([fecha, , tipo]) => {
        if (fecha === "" || fecha == null) return;
        res.filas++;
        if (!esFechaValida(fecha)) { res.invalidas++; return; }
        res.fechas.add(claveFecha(fecha));
        const anio = fecha.getFullYear();
        res.anios[anio] = res.anios[anio] || { NACIONAL: 0, MANUAL: 0 };
        res.anios[anio][String(tipo).trim().toUpperCase() === "NACIONAL" ? "NACIONAL" : "MANUAL"]++;
      });
    }
  }
  _festivosCache = res;
  return res;
}

function festivosActivos(festivos) { return festivos || leerFestivos().fechas; }

// Agrega los festivos nacionales del año a la pestaña (la crea si falta). Idempotente por año:
// si el año ya tiene filas NACIONAL no agrega nada. Para anular un festivo, borre su fila.
function generarFestivos(anio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(CONFIG.HOJAS.FESTIVOS);
  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.HOJAS.FESTIVOS);
    hoja.getRange(1, 1, 1, 3).setValues([["FECHA", "DESCRIPCIÓN", "TIPO"]]).setFontWeight("bold");
    hoja.setFrozenRows(1);
    _festivosCache = null;
  }
  const actual = leerFestivos();
  if (actual.anios[anio] && actual.anios[anio].NACIONAL > 0) {
    return { agregados: 0, mensaje: `${anio} ya tiene ${actual.anios[anio].NACIONAL} festivos NACIONAL. Para regenerarlos, borre esas filas y repita.` };
  }
  const filas = festivosNacionales(anio).map(f => [f.fecha, f.descripcion, "NACIONAL"]);
  hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, 3).setValues(filas);
  const n = hoja.getLastRow() - 1;
  hoja.getRange(2, 1, n, 1).setNumberFormat("dd/mm/yyyy");
  hoja.getRange(2, 1, n, 3).sort({ column: 1, ascending: true });
  _festivosCache = null;
  return { agregados: filas.length, mensaje: `${filas.length} festivos de ${anio} agregados a la pestaña ${CONFIG.HOJAS.FESTIVOS}.` };
}

function generarFestivosDesdeMenu() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Generar festivos nacionales", "Año (cuatro cifras):", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const anio = parseInt(r.getResponseText(), 10);
  if (!(anio >= 2000 && anio <= 2100)) { ui.alert("Año inválido: " + r.getResponseText()); return; }
  ui.alert("Generar festivos", generarFestivos(anio).mensaje, ui.ButtonSet.OK);
}

// Años (en curso y siguiente) sin festivos NACIONAL generados. Lo usa la alerta diaria.
function aniosSinFestivos(ahora) {
  const f = leerFestivos(), y = (ahora || new Date()).getFullYear();
  return [y, y + 1].filter(a => !(f.anios[a] && f.anios[a].NACIONAL > 0));
}

// ---------- Aritmética hábil ----------

function esDiaHabil(fecha, festivos) {
  const ds = fecha.getDay();
  if (ds === 0 || ds === 6) return false;
  return !festivosActivos(festivos).has(claveFecha(fecha));
}

// 00:00 del primer día hábil estrictamente posterior.
function siguienteDiaHabil(fecha, festivos) {
  let d = finDeDia(fecha);
  while (!esDiaHabil(d, festivos)) d = finDeDia(d);
  return d;
}

// Horas hábiles del intervalo [a, b). Negativo si b < a.
function horasHabilesEntre(a, b, festivos) {
  if (b < a) return -horasHabilesEntre(b, a, festivos);
  let total = 0, d = inicioDeDia(a);
  while (d < b) {
    const fin = finDeDia(d);
    if (esDiaHabil(d, festivos)) total += (Math.min(b.getTime(), fin.getTime()) - Math.max(a.getTime(), d.getTime())) / MS_HORA;
    d = fin;
  }
  return total;
}

// Primer instante t >= inicio con exactamente `horas` horas hábiles desde inicio.
function sumarHorasHabiles(inicio, horas, festivos) {
  let restante = horas, t = new Date(inicio.getTime());
  if (!esDiaHabil(t, festivos)) t = siguienteDiaHabil(t, festivos);
  for (let i = 0; i < 100000; i++) {
    const disponible = (finDeDia(t).getTime() - t.getTime()) / MS_HORA;
    if (restante <= disponible + 1e-9) return new Date(t.getTime() + restante * MS_HORA);
    restante -= disponible;
    t = siguienteDiaHabil(t, festivos);
  }
  throw new Error("sumarHorasHabiles: intervalo demasiado largo");
}

// ---------- Regla de la ventana de atención ----------
// Abierta en t si el día es hábil, salvo antes de la apertura cuando el día anterior no es hábil
// y desde el cierre cuando el día siguiente no es hábil. Abierta de noche entre dos días hábiles.

function ventanaAbierta(t, festivos) {
  const D = inicioDeDia(t);
  if (!esDiaHabil(D, festivos)) return false;
  if (!esDiaHabil(diaAnterior(D), festivos) && t < horaDelDia(D, CONFIG.VENTANA.APERTURA)) return false;
  if (!esDiaHabil(finDeDia(D), festivos) && t >= horaDelDia(D, CONFIG.VENTANA.CIERRE)) return false;
  return true;
}

// Transiciones que ocurren en un día calendario: { abrir: Date|null, cerrar: Date|null }.
function transicionesDelDia(dia, festivos) {
  const D = inicioDeDia(dia);
  if (!esDiaHabil(D, festivos)) return { abrir: null, cerrar: null };
  return {
    abrir: esDiaHabil(diaAnterior(D), festivos) ? null : horaDelDia(D, CONFIG.VENTANA.APERTURA),
    cerrar: esDiaHabil(finDeDia(D), festivos) ? null : horaDelDia(D, CONFIG.VENTANA.CIERRE)
  };
}

// Primer instante > t en que la ventana pasa a abierta.
function proximaApertura(t, festivos) {
  let D = inicioDeDia(t);
  for (let i = 0; i < 400; i++) {
    const tr = transicionesDelDia(D, festivos);
    if (tr.abrir && tr.abrir > t) return tr.abrir;
    D = finDeDia(D);
  }
  return null;
}

// Primer instante > t en que la ventana pasa a cerrada.
function proximoCierre(t, festivos) {
  let D = inicioDeDia(t);
  for (let i = 0; i < 400; i++) {
    const tr = transicionesDelDia(D, festivos);
    if (tr.cerrar && tr.cerrar > t) return tr.cerrar;
    D = finDeDia(D);
  }
  return null;
}

// ---------- Formato en español ----------

const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "martes 20 de octubre de 2026, 8:00 a. m." (conHora=false omite la hora).
function formatearFechaLarga(d, conHora) {
  const base = `${DIAS_ES[d.getDay()]} ${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`;
  if (conHora === false) return base;
  const h12 = d.getHours() % 12 || 12, mm = String(d.getMinutes()).padStart(2, "0");
  return `${base}, ${h12}:${mm} ${d.getHours() < 12 ? "a. m." : "p. m."}`;
}

// ---------- Fórmula de hoja equivalente a horasHabilesEntre(ahora, límite) ----------

// A1 de la columna n (1 → A, 27 → AA).
function letraColumna(n) {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

// Horas hábiles restantes hasta la celda de fecha límite (negativas si vencida). `ahoraExpr`
// permite fijar el instante en pruebas; por defecto NOW().
function formulaHorasHabilesRestantes(fila, columnaLimite, ahoraExpr) {
  const L = `${letraColumna(columnaLimite)}${fila}`;
  const F = `'${CONFIG.HOJAS.FESTIVOS}'!$A$2:$A`;
  const ahora = ahoraExpr || "NOW()";
  // Nombres de variable que no coinciden con funciones de Sheets en ningún idioma ("n" chocaba con N()).
  return `=IF(${L}="","",IFERROR(LET(vnow,${ahora},vlim,${L},vini,MIN(vnow,vlim),vfin,MAX(vnow,vlim),vdi,INT(vini),vdf,INT(vfin),` +
    `vhor,IF(vdi=vdf,(vfin-vini)*24,IF(NETWORKDAYS.INTL(vdi,vdi,1,${F})=1,(vdi+1-vini)*24,0)` +
    `+IF(vdf-vdi>1,NETWORKDAYS.INTL(vdi+1,vdf-1,1,${F})*24,0)+IF(NETWORKDAYS.INTL(vdf,vdf,1,${F})=1,(vfin-vdf)*24,0)),` +
    `IF(vnow>vlim,-vhor,vhor)),"REVISAR Festivos"))`;
}

// ---------- Pruebas (spec 00) ----------

// Festivos de 2026 fijos para que las pruebas no dependan de la pestaña.
function festivos2026() {
  return new Set(["2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01", "2026-05-18",
    "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
    "2026-11-16", "2026-12-08", "2026-12-25"]);
}
function fechaLocal(y, m, d, h, mi) { return new Date(y, m - 1, d, h || 0, mi || 0); }
function fmtHM(d) { return d ? `${claveFecha(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "—"; }

function probarCalendario() {
  const F = festivos2026(), fallos = []; let n = 0;
  const igual = (nombre, real, esperado) => { n++; if (String(real) !== String(esperado)) fallos.push(`${nombre}: esperado ${esperado}, obtenido ${real}`); };

  // CA-CAL-02: los 18 festivos de 2026
  const gen = festivosNacionales(2026).map(f => claveFecha(f.fecha));
  igual("festivos 2026", gen.join(","), Array.from(F).sort().join(","));
  igual("pascua 2026", claveFecha(pascua(2026)), "2026-04-05");

  // CA-CAL-04
  igual("hábil lun 12-oct (festivo)", esDiaHabil(fechaLocal(2026, 10, 12), F), false);
  igual("hábil mar 13-oct", esDiaHabil(fechaLocal(2026, 10, 13), F), true);
  igual("hábil sáb 17-oct", esDiaHabil(fechaLocal(2026, 10, 17), F), false);
  igual("hábil mar 8-dic (festivo)", esDiaHabil(fechaLocal(2026, 12, 8), F), false);

  // CA-CAL-05: horas hábiles
  [
    ["lun 19 10:00 → mar 20 10:00", [2026, 10, 19, 10], [2026, 10, 20, 10], 24],
    ["vie 16 10:00 → lun 19 10:00", [2026, 10, 16, 10], [2026, 10, 19, 10], 24],
    ["jue 8 14:00 → mar 13 14:00", [2026, 10, 8, 14], [2026, 10, 13, 14], 48],
    ["mié 1-abr 12:00 → lun 6-abr 12:00", [2026, 4, 1, 12], [2026, 4, 6, 12], 24],
    ["sáb 17 09:00 → dom 18 21:00", [2026, 10, 17, 9], [2026, 10, 18, 21], 0],
    ["mar 20 10:00 → lun 19 10:00", [2026, 10, 20, 10], [2026, 10, 19, 10], -24]
  ].forEach(([nombre, a, b, esperado]) => igual("horasHabilesEntre " + nombre, horasHabilesEntre(fechaLocal(...a), fechaLocal(...b), F), esperado));

  [
    ["vie 16 10:00 + 24", [2026, 10, 16, 10], 24, "2026-10-19 10:00"],
    ["jue 8 14:00 + 48", [2026, 10, 8, 14], 48, "2026-10-13 14:00"],
    ["sáb 17 09:00 + 1", [2026, 10, 17, 9], 1, "2026-10-19 01:00"],
    ["mié 1-abr 12:00 + 120", [2026, 4, 1, 12], 120, "2026-04-10 12:00"],
    ["lun 19 10:00 + 0", [2026, 10, 19, 10], 0, "2026-10-19 10:00"]
  ].forEach(([nombre, a, h, esperado]) => igual("sumarHorasHabiles " + nombre, fmtHM(sumarHorasHabiles(fechaLocal(...a), h, F)), esperado));

  // Identidad inversa
  const i0 = fechaLocal(2026, 10, 8, 14);
  [1, 24, 48, 120, 2160].forEach(h => igual(`inversa ${h}h`, horasHabilesEntre(i0, sumarHorasHabiles(i0, h, F), F).toFixed(6), h.toFixed(6)));

  // CA-CAL-06: ventana
  [
    ["lun 19 07:59", [2026, 10, 19, 7, 59], false, "2026-10-19 08:00", "2026-10-23 15:30"],
    ["lun 19 08:00", [2026, 10, 19, 8, 0], true, null, "2026-10-23 15:30"],
    ["mar 20 03:00", [2026, 10, 20, 3, 0], true, null, "2026-10-23 15:30"],
    ["vie 16 15:29", [2026, 10, 16, 15, 29], true, null, "2026-10-16 15:30"],
    ["vie 16 15:30", [2026, 10, 16, 15, 30], false, "2026-10-19 08:00", null],
    ["vie 9 16:00", [2026, 10, 9, 16, 0], false, "2026-10-13 08:00", null],
    ["mié 1-abr 15:30", [2026, 4, 1, 15, 30], false, "2026-04-06 08:00", null],
    ["lun 7-dic 15:30", [2026, 12, 7, 15, 30], false, "2026-12-09 08:00", null],
    ["mié 9-dic 07:00", [2026, 12, 9, 7, 0], false, "2026-12-09 08:00", "2026-12-11 15:30"]
  ].forEach(([nombre, t, abierta, apertura, cierre]) => {
    const T = fechaLocal(...t);
    igual("ventanaAbierta " + nombre, ventanaAbierta(T, F), abierta);
    if (apertura) igual("proximaApertura " + nombre, fmtHM(proximaApertura(T, F)), apertura);
    if (cierre) igual("proximoCierre " + nombre, fmtHM(proximoCierre(T, F)), cierre);
  });

  // Formato
  igual("fecha larga", formatearFechaLarga(fechaLocal(2026, 10, 20, 8, 0)), "martes 20 de octubre de 2026, 8:00 a. m.");
  igual("fecha larga pm", formatearFechaLarga(fechaLocal(2026, 4, 10, 15, 30)), "viernes 10 de abril de 2026, 3:30 p. m.");
  igual("letraColumna", [1, 12, 14, 26, 27, 52].map(letraColumna).join(","), "A,L,N,Z,AA,AZ");

  // CA-CAL-04b: estado de la pestaña real (solo dentro de Sheets)
  let notaHoja = "";
  try {
    const lectura = leerFestivos();
    if (!lectura.existe) notaHoja = `ADVERTENCIA: no existe la pestaña ${CONFIG.HOJAS.FESTIVOS}; solo se excluyen fines de semana.`;
    else if (lectura.filas === 0) notaHoja = `ADVERTENCIA: la pestaña ${CONFIG.HOJAS.FESTIVOS} está vacía; solo se excluyen fines de semana.`;
    else if (lectura.invalidas) notaHoja = `ADVERTENCIA: ${lectura.invalidas} fila(s) de ${CONFIG.HOJAS.FESTIVOS} sin fecha válida.`;
    const faltan = aniosSinFestivos();
    if (faltan.length) notaHoja += ` Años sin festivos generados: ${faltan.join(", ")}.`;
  } catch (e) { /* fuera de Sheets */ }

  const resumen = (fallos.length ? `${fallos.length} de ${n} casos FALLAN:\n${fallos.join("\n")}` : `${n} casos correctos.`) + (notaHoja ? "\n" + notaHoja : "");
  mostrarResultado("Prueba de calendario hábil", resumen);
  return fallos.length === 0;
}

// Compara la fórmula de hoja con horasHabilesEntre usando una hoja temporal (T-00-08). Solo dentro de Sheets.
function probarFormulaHorasHabiles() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!(leerFestivos().anios[2026] || {}).NACIONAL) generarFestivos(2026);
  const hoja = ss.insertSheet("_prueba_formula_" + Date.now());
  const casos = [
    [[2026, 10, 9, 14], [2026, 10, 13, 14]], [[2026, 10, 14, 14], [2026, 10, 13, 14]], [[2026, 10, 19, 10], [2026, 10, 20, 10]],
    [[2026, 10, 16, 10], [2026, 10, 19, 10]], [[2026, 4, 1, 12], [2026, 4, 10, 12]], [[2026, 10, 17, 9], [2026, 10, 18, 21]]
  ];
  const fallos = [];
  try {
    casos.forEach(([a, l], i) => {
      const fila = i + 1;
      hoja.getRange(fila, 2).setValue(fechaLocal(...l));
      hoja.getRange(fila, 1).setFormula(formulaHorasHabilesRestantes(fila, 2, `DATE(${a[0]},${a[1]},${a[2]})+TIME(${a[3]},0,0)`));
    });
    SpreadsheetApp.flush();
    casos.forEach(([a, l], i) => {
      const enHoja = hoja.getRange(i + 1, 1).getValue(), enScript = horasHabilesEntre(fechaLocal(...a), fechaLocal(...l));
      if (typeof enHoja !== "number" || Math.abs(enHoja - enScript) > 0.01) fallos.push(`caso ${i + 1}: hoja=${enHoja}, script=${enScript}`);
    });
  } finally { ss.deleteSheet(hoja); }
  const resumen = fallos.length ? `${fallos.length} de ${casos.length} FALLAN:\n${fallos.join("\n")}` : `${casos.length} casos: fórmula y script coinciden.`;
  mostrarResultado("Prueba fórmula ↔ script", resumen);
  return fallos.length === 0;
}
