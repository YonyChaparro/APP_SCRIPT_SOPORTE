#!/usr/bin/env node
/*
  Prueba de mutación de la suite `probarServicios`.

  Una suite que siempre pasa no prueba nada. Este script introduce, de una en una, ocho
  averías realistas en Código.gs (un puntaje cambiado, una frontera de escala corrida, un
  alias borrado…), ejecuta la suite y comprueba que falla. Al terminar restaura el archivo.

  Uso:  npm run mutacion
*/

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const OBJETIVO = path.join(RAIZ, "Código.gs");

// [texto a reemplazar, reemplazo, qué avería representa]
const MUTACIONES = [
  ['"Biblioteca": 20', '"Biblioteca": 25', "puntaje de una ubicación"],
  ['"Compras": 70', '"Compras": 60', "puntaje de un servicio"],
  ['{ hasta: 30, etiqueta: "72 HORAS", horas: 72 }', '{ hasta: 29, etiqueta: "72 HORAS", horas: 72 }', "frontera de la escala de tiempos"],
  ["{ hasta: 14, puntos: 10 }", "{ hasta: 13, puntos: 10 }", "frontera de la escala de cantidad"],
  ['"Mantenimiento Preventivo": "Mantenimiento Preventivo Impresora", "Otro": "Otros"', '"Otro": "Otros"', "alias que desambigua un homónimo"],
  ['"Sala 1": "Sala de Informática 1", ', "", "alias de una ubicación"],
  [
    'const GRUPOS_NO_SERVICIO = ["Hardware", "Software", "Conectividad", "Internet y Conectividad", "Usuario"]',
    'const GRUPOS_NO_SERVICIO = ["Hardware", "Software", "Conectividad", "Internet y Conectividad"]',
    "selector de grupo tratado como servicio"
  ],
  ["const PUNTAJE_SIN_COINCIDENCIA = 10", "const PUNTAJE_SIN_COINCIDENCIA = 0", "regresión de H-01: puntaje neutro vuelve a 0"]
];

const original = fs.readFileSync(OBJETIVO, "utf8");
let detectadas = 0;
let saltadas = 0;

try {
  MUTACIONES.forEach(([de, a, descripcion]) => {
    if (!original.includes(de)) {
      saltadas++;
      console.log(`? ${descripcion}: el patrón ya no existe en Código.gs (revisar esta mutación)`);
      return;
    }
    fs.writeFileSync(OBJETIVO, original.replace(de, a));
    let salida = "";
    let codigo = 0;
    try {
      salida = execSync("node tests/run.js servicios", { cwd: RAIZ, encoding: "utf8" });
    } catch (e) {
      salida = e.stdout || "";
      codigo = e.status;
    }
    const detectada = codigo !== 0;
    if (detectada) detectadas++;
    const primera = (salida.split("\n").find(l => /^\s+B\d/.test(l)) || "").trim();
    console.log(`${detectada ? "✓ detectada    " : "✗ NO DETECTADA "} ${descripcion}`);
    if (detectada) console.log(`                 ${primera.slice(0, 120)}`);
  });
} finally {
  fs.writeFileSync(OBJETIVO, original);
}

const total = MUTACIONES.length - saltadas;
console.log(`\n${detectadas}/${total} mutaciones detectadas.`);
process.exit(detectadas === total ? 0 : 1);
