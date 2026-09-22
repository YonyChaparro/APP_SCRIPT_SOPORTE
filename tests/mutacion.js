#!/usr/bin/env node
/*
  Prueba de mutación: comprueba que las suites detectan averías de verdad.

  Una suite que siempre pasa no prueba nada. Este script introduce, de una en una, averías
  realistas (un puntaje cambiado, una frontera corrida, un alias borrado, unas horas de
  plazo mal puestas…), ejecuta la suite que debería cazarlas y comprueba que falla. Al
  terminar restaura todos los archivos.

  Las mutaciones marcadas como `coherente` tocan a la vez el motor y su oráculo en el
  código, de forma que `probarServicios` se queda en verde: son justamente las que solo
  puede ver `tests/excel.js`, que lee el .xlsx del disco.

  Uso:  npm run mutacion
*/

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const CODIGO = "Código.gs";
const SERVICIOS = "Servicios.gs";
const CALENDARIO = "Calendario.gs";

// Comando que debe pasar a rojo con cada avería.
const COMANDOS = {
  servicios: "node tests/run.js servicios",
  tiempos: "node tests/run.js tiempos",
  excel: "node tests/excel.js",
  calendario: "node tests/run.js calendario",
  calculo: "node tests/run.js cálculo"
};

// { descripcion, suite, cambios: [[archivo, texto, reemplazo], …], coherente? }
const MUTACIONES = [
  // --- Catálogo de servicios (suite probarServicios) ---
  { descripcion: "puntaje de una ubicación", suite: "servicios",
    cambios: [[CODIGO, '"Biblioteca": 20', '"Biblioteca": 25']] },
  { descripcion: "puntaje de un servicio", suite: "servicios",
    cambios: [[CODIGO, '"Compras": 70', '"Compras": 60']] },
  { descripcion: "frontera de la escala de tiempos", suite: "servicios",
    cambios: [[CODIGO, '{ hasta: 30, etiqueta: "72 HORAS", horas: 72 }', '{ hasta: 29, etiqueta: "72 HORAS", horas: 72 }']] },
  { descripcion: "frontera de la escala de cantidad", suite: "servicios",
    cambios: [[CODIGO, "{ hasta: 14, puntos: 10 }", "{ hasta: 13, puntos: 10 }"]] },
  { descripcion: "alias que desambigua un homónimo", suite: "servicios",
    cambios: [[CODIGO, '"Mantenimiento Preventivo": "Mantenimiento Preventivo Impresora", "Otro": "Otros"', '"Otro": "Otros"']] },
  { descripcion: "alias de una ubicación", suite: "servicios",
    cambios: [[CODIGO, '"Sala 1": "Sala de Informática 1", ', ""]] },
  { descripcion: "selector de grupo tratado como servicio", suite: "servicios",
    cambios: [[CODIGO,
      'const GRUPOS_NO_SERVICIO = ["Hardware", "Software", "Conectividad", "Internet y Conectividad", "Usuario"]',
      'const GRUPOS_NO_SERVICIO = ["Hardware", "Software", "Conectividad", "Internet y Conectividad"]']] },
  { descripcion: "regresión de H-01: puntaje neutro vuelve a 0", suite: "servicios",
    cambios: [[CODIGO, "const PUNTAJE_SIN_COINCIDENCIA = 10", "const PUNTAJE_SIN_COINCIDENCIA = 0"]] },

  // --- Tiempos de respuesta (suite probarTiempos) ---
  { descripcion: "horas de un plazo (la etiqueta sigue bien, la fecha límite no)", suite: "tiempos",
    cambios: [[CODIGO, '{ hasta: 40, etiqueta: "5 DIAS", horas: 120 }', '{ hasta: 40, etiqueta: "5 DIAS", horas: 96 }']] },
  { descripcion: "escala de tiempos invertida (más puntos, menos plazo)", suite: "tiempos",
    cambios: [[CODIGO,
      '{ hasta: 20, etiqueta: "48 HORAS", horas: 48 },\n  { hasta: 30, etiqueta: "72 HORAS", horas: 72 },',
      '{ hasta: 20, etiqueta: "72 HORAS", horas: 72 },\n  { hasta: 30, etiqueta: "48 HORAS", horas: 48 },']] },
  { descripcion: "plazo desconocido cae en el tramo más urgente", suite: "tiempos",
    cambios: [[CODIGO, 'return horas === undefined ? HORAS_TIEMPO["NO ESTABLECIDO"] : horas;', "return horas === undefined ? 24 : horas;"]] },
  { descripcion: "fecha límite corrida una hora", suite: "tiempos",
    cambios: [[CALENDARIO, "return new Date(t.getTime() + restante * MS_HORA);", "return new Date(t.getTime() + (restante + 1) * MS_HORA);"]] },
  { descripcion: "la fecha límite deja de saltar los días no hábiles", suite: "tiempos",
    cambios: [[CALENDARIO, "if (!esDiaHabil(t, festivos)) t = siguienteDiaHabil(t, festivos);", ""]] },

  // --- Fórmula de la hoja (suite probarCalendario) ---
  { descripcion: "la fórmula se escribe siempre con comas, ignorando el idioma del archivo", suite: "calendario",
    cambios: [[CALENDARIO, 'const habiles = (desde, hasta) => `NETWORKDAYS.INTL(${A(desde, hasta, "1", F)})`;',
                           'const habiles = (desde, hasta) => `NETWORKDAYS.INTL(${[desde, hasta, "1", F].join(",")})`;']] },
  { descripcion: "LET pierde un nombre y queda con argumentos pares", suite: "calendario",
    cambios: [[CALENDARIO, '    "vdi", "INT(vini)",\n', '    "INT(vini)",\n']] },
  { descripcion: "regresión de H-16: la fórmula vuelve a fijar el número de fila", suite: "calendario",
    cambios: [[CALENDARIO, 'const L = `INDIRECT("${letraColumna(columnaLimite)}"&ROW())`;',
                           'const L = `${letraColumna(columnaLimite)}7`;']] },
  { descripcion: "paréntesis de más en la fórmula", suite: "calendario",
    cambios: [[CALENDARIO, 'return `=IF(${A(`NOT(ISNUMBER(${L}))`', 'return `=IF((${A(`NOT(ISNUMBER(${L}))`']] },

  // --- Auditoría de los formularios (suite probarCalculo) ---
  { descripcion: "«Subcategoría X» vuelve a tomarse por la pregunta de categoría", suite: "calculo",
    cambios: [[CODIGO, '  if (/subcategor/i.test(pregunta)) return "servicio";\n', ""]] },

  // --- Deriva respecto del Excel (solo la ve tests/excel.js) ---
  { descripcion: "puntaje de una ubicación cambiado en el motor Y en su oráculo", suite: "excel", coherente: true,
    cambios: [[CODIGO, '"Biblioteca": 20', '"Biblioteca": 25'],
              [SERVICIOS, 'excel: "BIBLIOTECA", canonico: "Biblioteca", puntos: 20', 'excel: "BIBLIOTECA", canonico: "Biblioteca", puntos: 25']] },
  { descripcion: "frontera de plazo cambiada en el motor Y en su oráculo", suite: "excel", coherente: true,
    cambios: [[CODIGO, '{ hasta: 30, etiqueta: "72 HORAS", horas: 72 }', '{ hasta: 29, etiqueta: "72 HORAS", horas: 72 }'],
              [SERVICIOS, '{ desde: 21, hasta: 30, etiqueta: "72 HORAS", horas: 72 }', '{ desde: 21, hasta: 29, etiqueta: "72 HORAS", horas: 72 }'],
              [SERVICIOS, '{ desde: 31, hasta: 40, etiqueta: "5 DIAS", horas: 120 }', '{ desde: 30, hasta: 40, etiqueta: "5 DIAS", horas: 120 }']] },
  { descripcion: 'se pierde el espacio inicial de " VIDEO - PROYECTORES…" del Excel', suite: "excel", coherente: true,
    cambios: [[SERVICIOS, '    " VIDEO - PROYECTORES O PANTALLAS (Solicitudes', '    "VIDEO - PROYECTORES O PANTALLAS (Solicitudes']] },
  { descripcion: "una ubicación del Excel desaparece del catálogo", suite: "excel", coherente: true,
    cambios: [[SERVICIOS, '  { edificio: "238", excel: "CENTRO EDITORIAL", canonico: "Centro Editorial", puntos: 20 },\n', ""],
              [CODIGO, '"Centro Editorial": 20, ', ""]] }
];

// --- Ejecución --------------------------------------------------------------

const ARCHIVOS = [CODIGO, SERVICIOS, CALENDARIO];
const originales = {};
ARCHIVOS.forEach(a => { originales[a] = fs.readFileSync(path.join(RAIZ, a), "utf8"); });

function correr(comando) {
  try {
    return { codigo: 0, salida: execSync(comando, { cwd: RAIZ, encoding: "utf8" }) };
  } catch (e) {
    return { codigo: e.status || 1, salida: e.stdout || "" };
  }
}

let detectadas = 0;
let saltadas = 0;

try {
  MUTACIONES.forEach(m => {
    const falta = m.cambios.find(([archivo, de]) => !originales[archivo].includes(de));
    if (falta) {
      saltadas++;
      console.log(`? ${m.descripcion}: el patrón ya no existe en ${falta[0]} (revisar esta mutación)`);
      return;
    }

    const textos = {};
    ARCHIVOS.forEach(a => { textos[a] = originales[a]; });
    m.cambios.forEach(([archivo, de, a]) => { textos[archivo] = textos[archivo].replace(de, a); });
    ARCHIVOS.forEach(a => fs.writeFileSync(path.join(RAIZ, a), textos[a]));

    // Las mutaciones "coherentes" solo demuestran algo si dejan verde la suite del
    // catálogo: si probarServicios también las caza, no hacía falta leer el Excel.
    let aviso = "";
    if (m.coherente && correr(COMANDOS.servicios).codigo !== 0) aviso = "  (ojo: probarServicios también la detecta)";

    const r = correr(COMANDOS[m.suite]);
    const detectada = r.codigo !== 0;
    if (detectada) detectadas++;
    const primera = (r.salida.split("\n").find(l => /^\s+((B|TR|E|V)\d|f[oó]rmula|rolDePregunta)/.test(l)) || "").trim();
    console.log(`${detectada ? "✓ detectada    " : "✗ NO DETECTADA "} [${m.suite}] ${m.descripcion}${aviso}`);
    if (detectada && primera) console.log(`                 ${primera.slice(0, 140)}`);
  });
} finally {
  ARCHIVOS.forEach(a => fs.writeFileSync(path.join(RAIZ, a), originales[a]));
}

const total = MUTACIONES.length - saltadas;
console.log(`\n${detectadas}/${total} mutaciones detectadas.`);
process.exit(detectadas === total ? 0 : 1);
