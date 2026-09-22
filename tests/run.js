#!/usr/bin/env node
/*
  Ejecuta las suites `probar*()` en Node con los servicios de Google simulados.

    node tests/run.js                 todas las suites
    node tests/run.js servicios       solo la de servicios
*/

const { cargar } = require("./harness");

// Cada suite es [nombre, "nombreDeFunción"] para las que viven en un .gs, o
// [nombre, función(ctx)] para las que solo pueden correr en Node (leen archivos).
const SUITES = [
  ["Cálculo de plazos", "probarCalculo"],
  ["Catálogo de servicios", "probarServicios"],
  ["Tiempos de respuesta", "probarTiempos"],
  ["Calendario hábil", "probarCalendario"],
  ["Reloj hábil", "probarRelojHabil"],
  ["Ventana del formulario", "probarVentana"],
  ["Excel ↔ código (TIEMPOS DE RESPUESTA.xlsx)", require("./excel").probarExcel],
  ["Informe de verificación", require("./verificacion").probarVerificacion]
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
  const etiqueta = typeof fn === "function" ? nombre : fn;
  if (filtro && !nombre.toLowerCase().includes(filtro) && !etiqueta.toLowerCase().includes(filtro)) return;
  if (typeof fn !== "function" && typeof ctx[fn] !== "function") {
    console.log(`· ${nombre}: no definida (${fn})`);
    return;
  }
  ejecutadas++;
  salidas.length = 0;
  let ok;
  try {
    if (typeof fn === "function") {
      const r = fn(ctx);
      ok = r.ok;
      salidas.push({ titulo: nombre, texto: r.texto });
    } else {
      ok = ctx[fn]();
    }
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
