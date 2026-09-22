/*
  Arnés Node para las suites `probar*()` de Apps Script.

  Carga los .gs en un único contexto `vm` (igual que hace Apps Script, donde todos
  los archivos comparten ámbito global) con los servicios de Google simulados. Permite
  ejecutar las pruebas fuera de Sheets, en CI o desde la terminal.

  Uso:  node tests/run.js [nombreDeSuite]
*/

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.resolve(__dirname, "..");
// Mismo orden que `filePushOrder` de .clasp.json: Código define CONFIG, del que dependen los demás.
const ARCHIVOS = ["Código.gs", "Calendario.gs", "Reloj.gs", "Ventana.gs", "Servicios.gs", "Tiempos.gs"];

// --- Simulación mínima de una hoja de cálculo ------------------------------
// Solo lo que usan las funciones bajo prueba. Una hoja es una matriz de valores.

function hojaSimulada(nombre, valores) {
  const datos = valores.map(f => f.slice());
  const rango = (fila, col, nFilas, nCols) => ({
    getValues: () => Array.from({ length: nFilas }, (_, i) =>
      Array.from({ length: nCols }, (_, j) => {
        const f = datos[fila - 1 + i];
        return f && f[col - 1 + j] !== undefined ? f[col - 1 + j] : "";
      })),
    setValues(v) {
      v.forEach((f, i) => f.forEach((val, j) => {
        while (datos.length < fila + i) datos.push([]);
        datos[fila - 1 + i][col - 1 + j] = val;
      }));
      return this;
    },
    setValue(v) { return this.setValues([[v]]); },
    setBackground() { return this; },
    setNote() { return this; },
    clearNote() { return this; },
    setFontWeight() { return this; },
    setNumberFormat() { return this; },
    setDataValidation() { return this; },
    clearDataValidations() { return this; },
    sort() { return this; }
  });
  return {
    nombre,
    datos,
    getName: () => nombre,
    getLastRow: () => datos.length,
    getLastColumn: () => datos.reduce((m, f) => Math.max(m, f.length), 0),
    getMaxRows: () => datos.length,
    getRange: (a, b, c, d) => rango(a, b, c === undefined ? 1 : c, d === undefined ? 1 : d),
    getDataRange: () => rango(1, 1, datos.length, datos.reduce((m, f) => Math.max(m, f.length), 0)),
    appendRow(fila) { datos.push(fila.slice()); return this; },
    insertRowBefore() { return this; },
    deleteRow(n) { datos.splice(n - 1, 1); return this; },
    clear() { datos.length = 0; return this; },
    autoResizeColumns() { return this; },
    setFrozenRows() { return this; },
    hideSheet() { return this; }
  };
}

function contextoGoogle(opciones) {
  const hojas = {};
  (opciones && opciones.hojas ? Object.keys(opciones.hojas) : []).forEach(n => {
    hojas[n] = hojaSimulada(n, opciones.hojas[n]);
  });

  const registro = [];
  const correos = [];
  const propiedades = {};

  const ctx = {
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    RegExp,
    Error,
    Infinity,
    NaN,
    parseInt,
    parseFloat,
    isNaN,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Promise,

    // --- Servicios de Google simulados ---
    Logger: { log: m => registro.push(String(m)) },

    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: n => hojas[n] || null,
        insertSheet: n => (hojas[n] = hojaSimulada(n, [])),
        getSheets: () => Object.keys(hojas).map(n => hojas[n]),
        getId: () => "hoja-simulada",
        getName: () => "Simulada"
      }),
      getUi: () => { throw new Error("sin interfaz de usuario fuera de Sheets"); },
      newDataValidation: () => {
        const v = { requireValueInList: () => v, setAllowInvalid: () => v, build: () => ({}) };
        return v;
      },
      flush: () => {}
    },

    MailApp: { sendEmail: m => correos.push(m) },

    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in propiedades ? propiedades[k] : null),
        setProperty: (k, v) => { propiedades[k] = String(v); },
        deleteProperty: k => { delete propiedades[k]; }
      })
    },

    ScriptApp: {
      getProjectTriggers: () => [],
      deleteTrigger: () => {},
      newTrigger: () => { throw new Error("no se crean disparadores en el arnés"); }
    },

    FormApp: {
      openById: () => { throw new Error("no se abre el formulario real en el arnés"); }
    },

    Session: {
      getScriptTimeZone: () => "America/Bogota",
      getActiveUser: () => ({ getEmail: () => "arnes@local" })
    },

    Utilities: {
      formatDate: (d, tz, fmt) => {
        const p = n => String(n).padStart(2, "0");
        return fmt
          .replace(/yyyy/g, d.getFullYear())
          .replace(/MM/g, p(d.getMonth() + 1))
          .replace(/dd/g, p(d.getDate()))
          .replace(/HH/g, p(d.getHours()))
          .replace(/mm/g, p(d.getMinutes()))
          .replace(/ss/g, p(d.getSeconds()));
      },
      sleep: () => {}
    },

    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {}, waitLock: () => {} })
    },

    // Acceso del arnés a lo que el código simulado produjo.
    __registro: registro,
    __correos: correos,
    __hojas: hojas
  };

  ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

// Carga los .gs en un contexto nuevo y devuelve ese contexto.
function cargar(opciones) {
  const ctx = contextoGoogle(opciones || {});
  ARCHIVOS.forEach(nombre => {
    const ruta = path.join(RAIZ, nombre);
    if (!fs.existsSync(ruta)) return;
    try {
      vm.runInContext(fs.readFileSync(ruta, "utf8"), ctx, { filename: nombre });
    } catch (e) {
      throw new Error(`Error al cargar ${nombre}: ${e.message}`);
    }
  });
  return ctx;
}

// Los `const` del nivel superior de un .gs no quedan como propiedades del contexto (van al
// ámbito léxico global, visible entre archivos pero no desde fuera). Para leer CAT_TIEMPOS y
// compañía desde una prueba en Node hay que evaluar el nombre dentro del propio contexto.
function valor(ctx, expresion) {
  return vm.runInContext(expresion, ctx);
}

module.exports = { cargar, hojaSimulada, valor, ARCHIVOS };
