#!/usr/bin/env node
/*
  Ejecuta las suites `probar*()` en Node con los servicios de Google simulados.

    node tests/run.js                 todas las suites
    node tests/run.js servicios       solo la de servicios
*/

const { cargar } = require("./harness");

const SUITES = [
  ["Cálculo de plazos", "probarCalculo"],
  ["Catálogo de servicios", "probarServicios"],
  ["Calendario hábil", "probarCalendario"],
  ["Reloj hábil", "probarRelojHabil"],
  ["Ventana del formulario", "probarVentana"]
];

const filtro = (process.argv[2] || "").toLowerCase();

let ctx;
try {
  ctx = cargar();
} catch (e) {
  console.error("✗ " + e.message);
  process.exit(2);
}

// Las suites llaman a mostrarResultado, que intenta abrir la UI de Sheets. En el arnés
// no hay UI: se captura el texto para imprimirlo en la terminal.
const salidas = [];
ctx.mostrarResultado = (titulo, texto) => salidas.push({ titulo, texto });

let fallos = 0;
let ejecutadas = 0;

SUITES.forEach(([nombre, fn]) => {
  if (filtro && !nombre.toLowerCase().includes(filtro) && !fn.toLowerCase().includes(filtro)) return;
  if (typeof ctx[fn] !== "function") {
    console.log(`· ${nombre}: no definida (${fn})`);
    return;
  }
  ejecutadas++;
  salidas.length = 0;
  let ok;
  try {
    ok = ctx[fn]();
  } catch (e) {
    ok = false;
    salidas.push({ titulo: nombre, texto: `EXCEPCIÓN: ${e.message}\n${e.stack}` });
  }
  if (!ok) fallos++;
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  salidas.forEach(s => console.log("   " + s.texto.split("\n").join("\n   ")));
});

if (ctx.__registro.length && process.env.VERBOSE) {
  console.log("\n--- Logger ---");
  ctx.__registro.forEach(l => console.log("   " + l));
}

console.log(`\n${ejecutadas - fallos}/${ejecutadas} suites en verde.`);
process.exit(fallos ? 1 : 0);
