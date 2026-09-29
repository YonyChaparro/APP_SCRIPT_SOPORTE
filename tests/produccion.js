// Prueba del script de PRODUCCIÓN (produccion/Código.js), que es distinto del código del repo.
// Ejecuta sus onFormSubmit y onEditTrigger reales con hojas simuladas y compara el plazo que
// escriben en la bandeja y en el correo con el motor del repo, que a su vez está comprobado
// contra TIEMPOS DE RESPUESTA.xlsx (npm run test:excel).
//
//   node tests/produccion.js                              # produccion/Código.js
//   node tests/produccion.js produccion/Código.original.js  # control: el código sin corregir
//
// Escenarios: el formulario tal como está hoy, y variantes que ya han ocurrido o pueden
// ocurrir (pregunta recreada al final de la hoja, columnas movidas a mano, pregunta nueva,
// formulario de pruebas con opciones y categorías distintas).

const vm = require("vm");
const fs = require("fs");
const path = require("path");
const { cargar, valor } = require("./harness");
const F = require("./formulario_produccion");

const RAIZ = path.join(__dirname, "..");
const ARCHIVO = path.resolve(RAIZ, process.argv[2] || "produccion/Código.js");
const FUENTE = fs.readFileSync(ARCHIVO, "utf8");

const repo = cargar();
const motor = valor(repo, "calcularPuntaje");
const HORAS = valor(repo, "HORAS_TIEMPO");

// ---------- Hojas y servicios simulados ----------

function hoja(nombre, filas) {
  const celda = (r, c) => { const v = (filas[r - 1] || [])[c - 1]; return v === undefined ? "" : v; };
  const poner = (r, c, v) => { while (filas.length < r) filas.push([]); filas[r - 1][c - 1] = v; };
  return {
    filas,
    getName: () => nombre,
    getLastRow: () => filas.length,
    getLastColumn: () => Math.max(1, ...filas.map(r => r.length)),
    getDataRange() { return { getValues: () => filas.map(r => r.slice()) }; },
    getRange(r, c, nr = 1, nc = 1) {
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => celda(r + i, c + j))),
        getValue: () => celda(r, c),
        setValue(v) { poner(r, c, v); return this; },
        setValues(vs) { vs.forEach((fila, i) => fila.forEach((v, j) => poner(r + i, c + j, v))); return this; },
        setNumberFormat() { return this; }, setDataValidation() { return this; }, clearContent() { poner(r, c, ""); return this; },
        sort() { return this; }, getRow: () => r, getColumn: () => c
      };
    },
    deleteRow(r) { filas.splice(r - 1, 1); }
  };
}

// Un contexto por escenario (compilar el script es lo caro). `usar` cambia las hojas y
// vacía correos y propiedades antes de cada caso.
function contexto() {
  let hojas = {}, activa = null, correos = [], props = {};
  const libro = { getSheetByName: n => hojas[n] || null, getActiveSheet: () => activa };
  const ctx = {
    console,
    Logger: { log() {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => libro, getActive: () => libro, flush() {},
      newDataValidation: () => ({ requireValueInList() { return this; }, build() { return {}; } }),
      getUi: () => ({ alert: () => "YES", Button: { YES: "YES" }, ButtonSet: { YES_NO: 1 } })
    },
    MailApp: { sendEmail: (...a) => correos.push(typeof a[0] === "object" ? a[0] : { to: a[0], subject: a[1], htmlBody: (a[3] || {}).htmlBody }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ScriptApp: {}, Session: {}, Utilities: {}
  };
  vm.createContext(ctx);
  vm.runInContext(FUENTE + "\n;this.__LISTA = typeof LISTA_SERVICIOS === 'undefined' ? [] : LISTA_SERVICIOS;", ctx, { filename: path.basename(ARCHIVO) });
  return {
    ctx,
    usar(h, a) { hojas = h; activa = a || null; correos = []; props = {}; return this; },
    get correos() { return correos; },
    avisos: () => correos.filter(m => /^ERROR/.test(m.subject || ""))
  };
}

// ---------- Construcción de filas ----------

// Fila de respuestas para un recorrido del formulario, sobre la disposición `columnas`.
function filaDe(columnas, u, s, cantidad) {
  const fila = columnas.map(() => "");
  const pon = (pred, v) => { const i = columnas.findIndex(pred); if (i >= 0) fila[i] = v; };
  pon(c => c.rol === "TIMESTAMP", "29/09/2026 9:00:00");
  pon(c => c.rol === "EMAIL", "prueba@unal.edu.co");
  pon(c => c.rol === "NOMBRE", "Prueba");
  pon(c => c.rol === "TELEFONO", "12345");
  pon(c => c.rol === "EDIFICIO", u.edificio);
  pon(c => c.rol === "UBICACION" && c.edificio === u.edificio, u.ubicacion);
  pon(c => c.rol === "CATEGORIA", s.categoria);
  s.celdas.forEach(([id, v]) => pon(c => c.id === id, v));
  pon(c => c.rol === "CANTIDAD", cantidad);
  pon(c => c.rol === "COMENTARIOS", "comentario");
  pon(c => c.rol === "OTRA", "respuesta a una pregunta nueva");
  return fila;
}

// Recorridos del formulario, con las celdas referidas por id de columna (no por posición).
function recorridos(columnas) {
  const conId = columnas.map(c => c);
  const ubic = [];
  conId.forEach(c => { if (c.rol === "UBICACION") c.opciones.forEach(u => ubic.push({ edificio: c.edificio, ubicacion: u })); });
  const serv = [];
  conId.find(c => c.rol === "CATEGORIA").opciones.forEach(categoria => {
    const propias = conId.filter(c => c.categoria === categoria && (c.rol === "SERVICIO" || c.rol === "GRUPO"));
    const grupo = propias.find(c => c.rol === "GRUPO");
    const directas = propias.filter(c => c.rol === "SERVICIO" && !c.grupo);
    if (!propias.length) serv.push({ categoria, servicio: "", celdas: [] });
    directas.forEach(c => c.opciones.forEach(s => serv.push({ categoria, servicio: s, celdas: [[c.id, s]] })));
    if (grupo) grupo.opciones.forEach(g => {
      const sub = propias.find(c => c.grupo === g);
      sub.opciones.forEach(s => serv.push({ categoria, servicio: s, celdas: [[grupo.id, g], [sub.id, s]] }));
    });
  });
  return { ubic, serv };
}

// ---------- Variantes de la hoja ----------

const base = () => F.COLUMNAS.map((c, i) => Object.assign({ id: i }, c));

const ESCENARIOS = {
  "Formulario actual": base,

  // Borrar una pregunta y crearla de nuevo deja su columna vieja vacía en su sitio y pone la
  // nueva al final de la hoja, después de las columnas del script.
  "Pregunta de Telefonía recreada (columna al final)": () => {
    const cols = base();
    const i = cols.findIndex(c => c.categoria === F.CATEGORIAS.TELEFONIA);
    const nueva = Object.assign({}, cols[i], { id: "tel-nueva" });
    cols[i] = { id: "tel-vieja", titulo: cols[i].titulo, rol: "VIEJA" };
    return cols.concat([nueva]);
  },

  // Una pregunta nueva sin relación con el plazo, también al final.
  "Pregunta nueva al final (no afecta el plazo)": () => base().concat([{ id: "placa", titulo: "Placa del equipo:", rol: "OTRA" }]),

  // Alguien mueve columnas de la hoja a mano: Cantidad y Comentarios antes de Categoría,
  // y Teléfono al final del bloque del formulario. Las columnas del script no se tocan.
  "Columnas del formulario movidas a mano": () => {
    const cols = base();
    const script = cols.splice(cols.findIndex(c => c.rol === "ESTADO"));
    const saca = pred => cols.splice(cols.findIndex(pred), 1)[0];
    const cant = saca(c => c.rol === "CANTIDAD"), com = saca(c => c.rol === "COMENTARIOS"), tel = saca(c => c.rol === "TELEFONO");
    cols.splice(cols.findIndex(c => c.rol === "CATEGORIA"), 0, cant, com);
    cols.push(tel);
    return cols.concat(script);
  },

  // Diferencias reales del formulario de pruebas (1druQ9…): "Secretaría Académica" y dos
  // categorías sin subpregunta.
  "Opciones del formulario de pruebas": () => {
    const cols = base();
    const u311 = cols.find(c => c.rol === "UBICACION" && c.edificio === "311");
    u311.opciones = u311.opciones.map(o => o === "Secretaría de Facultad" ? "Secretaría Académica" : o);
    const cat = cols.find(c => c.rol === "CATEGORIA");
    cat.opciones = cat.opciones.slice();
    cat.opciones.splice(4, 0, "PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO", "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN");
    return cols;
  }
};

const CANTIDADES = ["1", "3", "4", "14", "15", "30", "31", "200", "", "dos", "5 equipos", "aprox. 20", "Entre 10 y 12"];

// ---------- Ejecución ----------

let fallos = 0;
const muestra = [];

function probarEscenario(nombre, columnas) {
  const { ubic, serv } = recorridos(columnas);
  const encabezados = columnas.map(c => c.titulo);
  let n = 0, ok = 0, avisos = 0, mostrado = 0;
  const run = contexto();
  for (const u of ubic) for (const s of serv) for (const cantidad of CANTIDADES) {
    const e = motor({ edificio: u.edificio, ubicacion: u.ubicacion, categoria: s.categoria, servicio: s.servicio, cantidad });
    if (e.avisos.length) throw new Error(`el motor del repo no reconoce ${JSON.stringify(s)}: ${e.avisos}`);
    const R = hoja("Respuestas_Oficiales", [encabezados.slice(), filaDe(columnas, u, s, cantidad)]);
    const P = hoja("Solicitudes Pendientes", [F.ENCABEZADOS_PENDIENTES.slice()]);
    run.usar({ "Respuestas_Oficiales": R, "Solicitudes Pendientes": P });
    run.ctx.onFormSubmit({ range: R.getRange(2, 1) });
    const fp = P.filas[1] || [];
    const confirmacion = run.correos.find(m => /^Registro/.test(m.subject || ""));
    n++;
    avisos += run.avisos().length;
    const bien = fp[7] === e.tiempo && String(fp[11]).startsWith(`=${HORAS[e.tiempo]} -`) &&
      confirmacion && confirmacion.htmlBody.indexOf(e.tiempo) !== -1;
    if (bien) ok++;
    else if (muestra.length < 12) muestra.push(`${nombre}: ${u.edificio}/${u.ubicacion} · ${s.categoria.split(" (")[0]} › ${s.servicio || "(sin subpregunta)"} · cant "${cantidad}" → hoja ${fp[7]}, Excel ${e.tiempo}`);
    const nombreEsperado = (e.servicioNombre || "").toUpperCase();
    if (String(fp[4]).toUpperCase() === nombreEsperado) mostrado++;
  }
  const verde = ok === n && avisos === 0;
  if (!verde) fallos++;
  console.log(`${verde ? "✓" : "✗"} ${nombre}\n   ${ok}/${n} plazos iguales al Excel (bandeja, fórmula y correo), ` +
    `${avisos} avisos de puntaje no encontrado, servicio mostrado correcto en ${mostrado}/${n}.`);
}

for (const nombre in ESCENARIOS) probarEscenario(nombre, ESCENARIOS[nombre]());

// Cambio de servicio desde la bandeja (onEditTrigger): el plazo se recalcula con la
// categoría original de la solicitud. Combinaciones ambiguas (p. ej. "OTRO" en Telefonía)
// se puntúan con el valor neutro y avisan; no se cuentan como error.
(function probarCambioDeServicio() {
  const columnas = base();
  const { serv } = recorridos(columnas);
  const run = contexto();
  const lista = run.ctx.__LISTA;
  let n = 0, ok = 0, ambiguos = 0;
  for (const s of serv) for (const nuevo of lista) {
    const u = { edificio: "310", ubicacion: "UIFCE" };
    const fila = filaDe(columnas, u, s, "2");
    fila[0] = "FCE-SOP-900";
    const R = hoja("Respuestas_Oficiales", [columnas.map(c => c.titulo), fila]);
    const P = hoja("Solicitudes Pendientes", [F.ENCABEZADOS_PENDIENTES.slice(),
      ["FCE-SOP-900", "Prueba", "310", "UIFCE", nuevo, "2", "x", "", new Date(2026, 8, 29, 9), "", "", ""]]);
    run.usar({ "Respuestas_Oficiales": R, "Solicitudes Pendientes": P }, P);
    run.ctx.onEditTrigger({ range: P.getRange(2, 5) });
    const e = motor({ edificio: "310", ubicacion: "UIFCE", categoria: s.categoria, servicio: nuevo, cantidad: "2" });
    n++;
    if (e.avisos.some(a => /no reconocid/.test(a))) { ambiguos++; continue; }
    if (P.filas[1][7] === e.tiempo && String(P.filas[1][11]).startsWith(`=${HORAS[e.tiempo]} -`)) ok++;
    else if (muestra.length < 12) muestra.push(`Bandeja: ${s.categoria.split(" (")[0]} → ${nuevo}: hoja ${P.filas[1][7]}, Excel ${e.tiempo}`);
  }
  const verde = ok === n - ambiguos;
  if (!verde) fallos++;
  console.log(`${verde ? "✓" : "✗"} Cambio de servicio en la bandeja\n   ${ok}/${n - ambiguos} plazos iguales al Excel; ` +
    `${ambiguos} combinaciones ambiguas (p. ej. "OTRO" en Telefonía) que ni el motor del repo puede puntuar: ` +
    `se usa el valor neutro y se avisa.`);
})();

if (muestra.length) { console.log("\nEjemplos de diferencias:"); muestra.forEach(m => console.log("   " + m)); }
console.log(fallos ? `\n${fallos} escenario(s) con diferencias.` : "\nTodos los escenarios coinciden con el Excel.");
process.exitCode = fallos ? 1 : 0;
