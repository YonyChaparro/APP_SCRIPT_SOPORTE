/*
  =================================================================
  --- RELOJ HÁBIL (spec 01) ---
  =================================================================
  El plazo de una solicitud corre solo en horas hábiles (Calendario.gs).
  Inicio efectivo: la marca temporal si la ventana estaba abierta; si no,
  la siguiente apertura. Fecha límite: inicio + horas del plazo, hábiles.
*/

// Reloj de una solicitud: { marca, inicio, limite, fueraVentana, avisos }. `festivos` y `ahora` solo para pruebas.
function calcularReloj(marca, horas, festivos, ahora) {
  const now = ahora || new Date();
  const avisos = [];
  let base = marca instanceof Date ? marca : new Date(marca);
  const minimo = new Date(2020, 0, 1), maximo = new Date(now.getTime() + 24 * MS_HORA);
  if (!esFechaValida(base) || base < minimo || base > maximo) {
    avisos.push(`marca temporal inválida (${marca}); el plazo se contó desde ${fmtHM(now)}`);
    base = now;
  }
  const inicio = ventanaAbierta(base, festivos) ? base : proximaApertura(base, festivos);
  const limite = sumarHorasHabiles(inicio, horas, festivos);
  return { marca: base, inicio, limite, fueraVentana: inicio.getTime() > base.getTime(), avisos };
}

// Reloj de una fila ya existente: conserva INICIO RELOJ si lo tiene (REL-08); si no, lo deriva de la marca.
function relojDesdeFila(marca, inicioPrevio, horas, festivos, ahora) {
  if (esFechaValida(inicioPrevio)) {
    const marcaValida = esFechaValida(marca) ? marca : inicioPrevio;
    return { marca: marcaValida, inicio: inicioPrevio, limite: sumarHorasHabiles(inicioPrevio, horas, festivos),
             fueraVentana: inicioPrevio.getTime() > marcaValida.getTime(), avisos: [] };
  }
  return calcularReloj(marca, horas, festivos, ahora);
}

// Clasificación para la alerta diaria (REL-07): { estado: "VENCIDA" | "PROXIMA" | null, pct }.
function clasificarParaAlerta(horasTotales, horasRestantes) {
  const total = horasTotales > 0 ? horasTotales : 1;
  if (horasRestantes <= 0) return { estado: "VENCIDA", pct: 100 };
  const pct = Math.max(0, Math.min(100, Math.round((total - horasRestantes) / total * 100)));
  return { estado: horasRestantes <= total * 0.2 ? "PROXIMA" : null, pct };
}

function textoFueraVentana(reloj) {
  return `Recibida fuera del horario de atención (${formatearFechaLarga(reloj.marca)}); el plazo cuenta desde el ${formatearFechaLarga(reloj.inicio)}.`;
}

// Añade texto a la nota de una celda sin borrar lo que ya tenga.
function anexarNota(celda, texto) {
  const actual = celda.getNote();
  celda.setNote(actual ? `${actual}\n\n${texto}` : texto);
}

// Fila de Pendientes a partir de { CAMPO: valor } y el mapa de columnas detectado.
function filaPendientes(COLP, valores) {
  const campos = Object.keys(CONFIG.COL_PENDIENTES);
  const fila = new Array(Math.max.apply(null, campos.map(c => COLP[c]))).fill("");
  campos.forEach(c => { if (valores[c] !== undefined) fila[COLP[c] - 1] = valores[c]; });
  return fila;
}

// Escribe plazo, inicio, límite y fórmula de horas hábiles restantes en una fila de Pendientes.
function escribirRelojEnFila(hoja, fila, COLP, tiempo, reloj) {
  hoja.getRange(fila, COLP.TIEMPO).setValue(tiempo);
  hoja.getRange(fila, COLP.INICIO_RELOJ).setValue(reloj.inicio).setNumberFormat("dd/mm/yyyy hh:mm");
  hoja.getRange(fila, COLP.FECHA_LIMITE).setValue(reloj.limite).setNumberFormat("dd/mm/yyyy hh:mm");
  hoja.getRange(fila, COLP.HORAS_RESTANTES).setFormula(formulaHorasHabilesRestantes(COLP.FECHA_LIMITE)).setNumberFormat("0.00");
}

// ---------- Pruebas (spec 01) ----------

function probarRelojHabil() {
  const F = festivos2026(), AHORA = fechaLocal(2026, 10, 20, 12, 0), fallos = []; let n = 0;
  const igual = (nombre, real, esperado) => { n++; if (String(real) !== String(esperado)) fallos.push(`${nombre}: esperado ${esperado}, obtenido ${real}`); };

  // CA-REL-02/03
  [
    ["lun 19 10:00 · 24 HORAS", [2026, 10, 19, 10, 0], "24 HORAS", "2026-10-19 10:00", "2026-10-20 10:00", false],
    ["vie 16 10:00 · 24 HORAS", [2026, 10, 16, 10, 0], "24 HORAS", "2026-10-16 10:00", "2026-10-19 10:00", false],
    ["vie 16 16:00 · 24 HORAS", [2026, 10, 16, 16, 0], "24 HORAS", "2026-10-19 08:00", "2026-10-20 08:00", true],
    ["jue 8 14:00 · 48 HORAS", [2026, 10, 8, 14, 0], "48 HORAS", "2026-10-08 14:00", "2026-10-13 14:00", false],
    ["jue santo 09:00 · 72 HORAS", [2026, 4, 2, 9, 0], "72 HORAS", "2026-04-06 08:00", "2026-04-09 08:00", true],
    ["mar 20 03:00 · 24 HORAS", [2026, 10, 20, 3, 0], "24 HORAS", "2026-10-20 03:00", "2026-10-21 03:00", false],
    ["lun 19 10:00 · 5 DIAS", [2026, 10, 19, 10, 0], "5 DIAS", "2026-10-19 10:00", "2026-10-26 10:00", false],
    ["lun 7-dic 15:45 · 24 HORAS", [2026, 12, 7, 15, 45], "24 HORAS", "2026-12-09 08:00", "2026-12-10 08:00", true]
  ].forEach(([nombre, m, etiqueta, inicio, limite, fuera]) => {
    const r = calcularReloj(fechaLocal(...m), horasDeTiempo(etiqueta), F, fechaLocal(2026, 12, 31));
    igual("inicio " + nombre, fmtHM(r.inicio), inicio);
    igual("límite " + nombre, fmtHM(r.limite), limite);
    igual("fueraVentana " + nombre, r.fueraVentana, fuera);
  });

  // Marca temporal inválida
  const inv = calcularReloj("no es fecha", 24, F, AHORA);
  igual("marca inválida avisa", inv.avisos.length, 1);
  igual("marca inválida usa ahora", fmtHM(inv.marca), fmtHM(AHORA));

  // CA-REL-05
  const limite = fechaLocal(2026, 10, 13, 14, 0);
  igual("restantes vie 9 14:00", horasHabilesEntre(fechaLocal(2026, 10, 9, 14, 0), limite, F), 24);
  igual("restantes mié 14 14:00", horasHabilesEntre(fechaLocal(2026, 10, 14, 14, 0), limite, F), -24);

  // CA-REL-07
  igual("alerta 9h de 48", JSON.stringify(clasificarParaAlerta(48, 9)), JSON.stringify({ estado: "PROXIMA", pct: 81 }));
  igual("alerta -5h", JSON.stringify(clasificarParaAlerta(48, -5)), JSON.stringify({ estado: "VENCIDA", pct: 100 }));
  igual("alerta 20h de 48", clasificarParaAlerta(48, 20).estado, null);

  // CA-REL-08: cambio de servicio recalcula desde INICIO RELOJ
  const r8 = relojDesdeFila(fechaLocal(2026, 10, 19, 10, 0), fechaLocal(2026, 10, 19, 10, 0), horasDeTiempo("72 HORAS"), F, fechaLocal(2026, 10, 21, 9, 0));
  igual("REL-08 límite", fmtHM(r8.limite), "2026-10-22 10:00");
  igual("REL-08 sin inicio previo deriva de la marca", fmtHM(relojDesdeFila(fechaLocal(2026, 10, 16, 16, 0), "", 24, F, fechaLocal(2026, 10, 21)).inicio), "2026-10-19 08:00");

  // Fila de Pendientes por mapa de columnas
  const COLP = Object.assign({}, CONFIG.COL_PENDIENTES);
  const fila = filaPendientes(COLP, { CODIGO: "FCE-SOP-001", FECHA_LIMITE: "L" });
  igual("filaPendientes ancho", fila.length, 14);
  igual("filaPendientes posiciones", `${fila[0]}|${fila[13]}`, "FCE-SOP-001|L");

  // CA-REL-10/11: correo
  const reloj = calcularReloj(fechaLocal(2026, 10, 16, 16, 0), 24, F, fechaLocal(2026, 10, 21));
  const html = templateConfirmacion("Ana", "FCE-SOP-100", "Biblioteca", "Impresoras", "Falla de Red", "24 HORAS", "—", reloj);
  igual("correo plazo hábil", html.includes("24 HORAS (en días hábiles)"), true);
  igual("correo fecha límite", html.includes("martes 20 de octubre de 2026, 8:00 a. m."), true);
  igual("correo fuera de ventana", html.includes("lunes 19 de octubre de 2026, 8:00 a. m."), true);
  const html2 = templateConfirmacion("Ana", "X", "U", "C", "S", "24 HORAS", "—", calcularReloj(fechaLocal(2026, 10, 19, 10, 0), 24, F, fechaLocal(2026, 10, 21)));
  igual("correo dentro de ventana sin aclaración", html2.includes("fuera del horario"), false);

  const resumen = fallos.length ? `${fallos.length} de ${n} casos FALLAN:\n${fallos.join("\n")}` : `${n} casos correctos.`;
  mostrarResultado("Prueba de reloj hábil", resumen);
  return fallos.length === 0;
}
