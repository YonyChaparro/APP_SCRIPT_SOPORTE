#!/usr/bin/env node
/*
  Genera TIEMPOS_POR_SERVICIO.md: el plazo de respuesta de cada servicio posible.

  La tabla no se escribe a mano. Se obtiene llamando a `calcularPuntaje()` para todas las
  combinaciones y agrupando por puntaje de ubicación, porque dos ubicaciones con los
  mismos puntos dan siempre el mismo plazo: las 38 ubicaciones × 4 tramos de cantidad de
  cada servicio caben así en una tabla de 5 × 4 sin perder un solo caso.

  Las escalas y los rangos que encabezan el documento se leen del .xlsx, no del código.

  Uso:  npm run matriz
*/

const fs = require("fs");
const path = require("path");
const { cargar, valor } = require("./harness");
const { leerLibro } = require("./xlsx");

const RAIZ = path.resolve(__dirname, "..");
const SALIDA = path.join(RAIZ, "TIEMPOS_POR_SERVICIO.md");
const EXCEL = path.join(RAIZ, "TIEMPOS DE RESPUESTA.xlsx");

const ctx = cargar();
ctx.mostrarResultado = () => {};
const [CAT_UBICACIONES, CAT_SERVICIOS, CAT_CANTIDAD, CAT_TIEMPOS, CAT_CATEGORIAS] =
  valor(ctx, "[CAT_UBICACIONES, CAT_SERVICIOS, CAT_CANTIDAD, CAT_TIEMPOS, CAT_CATEGORIAS]");
const { calcularPuntaje } = ctx;

const libro = leerLibro(EXCEL);
const celda = (f, i) => (f && f[i] !== undefined ? String(f[i]).trim() : "");
const rangoCantidad = {};
libro["CANTIDAD DE EQUIPOS"].slice(1).forEach(f => { if (celda(f, 0)) rangoCantidad[celda(f, 0)] = celda(f, 1); });
const rangoTiempo = {};
libro["TIEMPOS DE RESPUESTA"].slice(1).forEach(f => { if (celda(f, 1)) rangoTiempo[celda(f, 1)] = celda(f, 2); });

// Puntajes de ubicación distintos, de menos a más, con las ubicaciones que los tienen.
const PUNTOS_UB = CAT_UBICACIONES.map(u => u.puntos).filter((p, i, a) => a.indexOf(p) === i).sort((a, b) => a - b);
const ubicacionDe = puntos => CAT_UBICACIONES.find(u => u.puntos === puntos);
const nombresDe = puntos => CAT_UBICACIONES.filter(u => u.puntos === puntos).map(u => `${u.canonico} (${u.edificio})`);

const plazo = (u, s, cantidad) => calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad });

const L = [];
const escribir = t => L.push(t === undefined ? "" : t);

escribir("# Tiempos de respuesta por servicio");
escribir();
escribir("Plazo que el sistema asigna a **cada servicio del árbol**, para cualquier ubicación y");
escribir("cualquier cantidad de equipos. Documento generado: `npm run matriz`. No se edita a mano.");
escribir();
escribir("Fuente de los puntajes: `TIEMPOS DE RESPUESTA.xlsx`. Que el código siga coincidiendo con");
escribir("ese archivo lo comprueban `npm run test:excel` y `npm run test:tiempos`.");
escribir();
escribir("El plazo sale de sumar tres puntajes —ubicación + servicio + cantidad— y buscar el total");
escribir("en la escala de tiempos. Como el puntaje es lo único que importa, dos ubicaciones con los");
escribir(`mismos puntos comparten plazo: por eso cada tabla tiene ${PUNTOS_UB.length} filas y no ${CAT_UBICACIONES.length}.`);
escribir();

escribir("## Escalas del Excel");
escribir();
escribir("| Puntaje total | Plazo | Horas hábiles |");
escribir("|---|---|---|");
CAT_TIEMPOS.forEach(t => escribir(`| ${rangoTiempo[t.etiqueta] || `${t.desde}–${t.hasta}`} | ${t.etiqueta} | ${t.horas} |`));
escribir();
escribir("| Cantidad de equipos | Puntaje |");
escribir("|---|---|");
CAT_CANTIDAD.forEach(t => escribir(`| ${t.rango} | ${rangoCantidad[t.rango] !== undefined ? rangoCantidad[t.rango] : t.puntos} |`));
escribir();
escribir("Las horas son **hábiles**: un día hábil aporta 24 h y los sábados, domingos y festivos");
escribir("aportan 0. La fecha límite se calcula desde el inicio del reloj, no desde la solicitud.");
escribir();

escribir("## Ubicaciones por puntaje");
escribir();
escribir("| Puntos | Ubicaciones |");
escribir("|---|---|");
PUNTOS_UB.forEach(p => escribir(`| ${p} | ${nombresDe(p).join(", ")} |`));
escribir();

escribir("## Plazo por servicio");
escribir();

const categorias = CAT_SERVICIOS.map(s => s.categoria).filter((c, i, a) => a.indexOf(c) === i);
categorias.forEach(cat => {
  escribir(`### ${cat}`);
  escribir();
  CAT_SERVICIOS.filter(s => s.categoria === cat).forEach(s => {
    const extra = [];
    if (s.grupo) extra.push(`grupo «${s.grupo}»`);
    if (s.extension) extra.push("solo en el formulario, no está en el Excel");
    if (s.homonimo) extra.push("el mismo texto existe en otra categoría con otro puntaje");
    escribir(`**${s.canonico}** — ${s.puntos} puntos${extra.length ? ` · ${extra.join(" · ")}` : ""}`);
    escribir();
    escribir(`| Puntos de la ubicación | ${CAT_CANTIDAD.map(t => `${t.rango} equipos`).join(" | ")} |`);
    escribir(`|---|${CAT_CANTIDAD.map(() => "---").join("|")}|`);
    PUNTOS_UB.forEach(p => {
      const u = ubicacionDe(p);
      const celdas = CAT_CANTIDAD.map(t => {
        const r = plazo(u, s, t.desde);
        return `${r.tiempo} <br>*${r.total} pts*`;
      });
      escribir(`| **${p}** | ${celdas.join(" | ")} |`);
    });
    escribir();
  });
});

escribir("## Resumen: alcance de cada servicio");
escribir();
escribir("Plazo más corto y más largo que puede llegar a tener cada servicio, sobre las");
escribir(`${CAT_UBICACIONES.length} ubicaciones × ${CAT_CANTIDAD.length} tramos de cantidad.`);
escribir();
escribir("| Servicio | Categoría | Puntos | Plazo más corto | Plazo más largo |");
escribir("|---|---|---|---|---|");
const fijos = [];
CAT_SERVICIOS.forEach(s => {
  let min = null, max = null;
  CAT_UBICACIONES.forEach(u => CAT_CANTIDAD.forEach(t => {
    const r = plazo(u, s, t.desde);
    const i = CAT_TIEMPOS.findIndex(x => x.etiqueta === r.tiempo);
    if (min === null || i < min) min = i;
    if (max === null || i > max) max = i;
  }));
  if (min === max) fijos.push(`${s.canonico} → siempre «${CAT_TIEMPOS[min].etiqueta}»`);
  escribir(`| ${s.canonico} | ${s.categoria} | ${s.puntos} | ${CAT_TIEMPOS[min].etiqueta} | ${CAT_TIEMPOS[max].etiqueta} |`);
});
escribir();
if (fijos.length) {
  escribir("**Servicios con un único plazo posible.** Su puntaje es tan alto que ni la ubicación ni");
  escribir("la cantidad de equipos cambian nada: caen siempre en el mismo tramo.");
  escribir();
  fijos.forEach(f => escribir(`- ${f}`));
  escribir();
}

fs.writeFileSync(SALIDA, L.join("\n"));
console.log(`Escrito ${path.relative(RAIZ, SALIDA)} (${L.length} líneas, ${CAT_SERVICIOS.length} servicios).`);
