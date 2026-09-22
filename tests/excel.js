/*
  Prueba contra el archivo real "TIEMPOS DE RESPUESTA.xlsx".

  Servicios.gs transcribe el Excel a mano y sirve de oráculo independiente de PUNTAJES.
  Pero nada vigilaba la transcripción en sí: si el Excel cambia y nadie toca el código,
  las dos copias del código siguen coincidiendo entre ellas y la suite queda en verde
  mientras la hoja de cálculo ya dice otra cosa.

  Esta prueba cierra ese hueco: abre el .xlsx del disco, reconstruye las seis pestañas y
  las compara con CAT_UBICACIONES, CAT_SERVICIOS, CAT_CANTIDAD, CAT_TIEMPOS,
  CAT_CATEGORIAS y VARIANTES_EDIFICIO. Al final recorre, fila por fila del Excel, la
  matriz completa ubicación × servicio × tramo de cantidad y comprueba el plazo que el
  motor le asigna a cada combinación usando los textos tal cual están en la hoja.

  Solo corre en Node (dentro de Sheets no hay acceso al archivo): `npm run test:excel`.
*/

const path = require("path");
const fs = require("fs");
const { leerLibro } = require("./xlsx");

const RUTA_EXCEL = path.resolve(__dirname, "..", "TIEMPOS DE RESPUESTA.xlsx");

const HOJAS = {
  UBICACIONES: "LISTA DE UBICACIONES",
  ARBOL: "ÁRBOL DE SERVICIOS",
  CANTIDAD: "CANTIDAD DE EQUIPOS",
  TIEMPOS: "TIEMPOS DE RESPUESTA",
  TABLA_UB: "tabla_ub",
  TABLA_SERV: "tabla_serv"
};

// --- Lectura de cada pestaña ----------------------------------------------

const celda = (fila, i) => (fila && fila[i] !== undefined ? fila[i] : "");
const vacia = fila => !fila || fila.every(c => String(c).trim() === "");

// "LISTA DE UBICACIONES": B edificio (solo en la primera fila del bloque), C ubicación, D puntaje.
function leerUbicaciones(hoja) {
  let edificio = "";
  return hoja.slice(1).filter(f => !vacia(f)).map(f => {
    if (celda(f, 1).trim()) edificio = celda(f, 1).trim();
    return { edificio, ubicacion: celda(f, 2), puntos: Number(celda(f, 3)) };
  });
}

// "ÁRBOL DE SERVICIOS": B categoría, C subcategoría 1, D subcategoría 2, E servicio, F puntaje.
// B y C solo aparecen en la primera fila de su bloque. C es un GRUPO (una pregunta aparte
// del formulario, que no puntúa) cuando hay subcategoría 2 o cuando no coincide con E;
// si C y E son el mismo texto, C es el servicio y no hay grupo.
function leerArbol(hoja) {
  let categoria = "", grupo = "";
  return hoja.slice(1).filter(f => !vacia(f)).map(f => {
    if (celda(f, 1).trim()) { categoria = celda(f, 1); grupo = ""; }
    const sub1 = celda(f, 2), sub2 = celda(f, 3), servicio = celda(f, 4);
    if (sub1.trim()) grupo = (sub2.trim() || sub1.trim() !== servicio.trim()) ? sub1.trim() : "";
    return { categoria, grupo, servicio, puntos: Number(celda(f, 5)) };
  });
}

// "CANTIDAD DE EQUIPOS": A rango ("1 A 3", "MAS DE 30"), B puntaje.
function leerCantidad(hoja) {
  return hoja.slice(1).filter(f => !vacia(f)).map(f => {
    const rango = celda(f, 0).trim();
    const nums = (rango.match(/\d+/g) || []).map(Number);
    const abierto = /MAS DE|MÁS DE/i.test(rango);
    return { rango, puntos: Number(celda(f, 1)), desde: abierto ? nums[0] + 1 : nums[0], hasta: abierto ? Infinity : nums[1] };
  });
}

// "TIEMPOS DE RESPUESTA": B etiqueta, C rango de puntaje ("1-10", "mayor a 70").
function leerTiempos(hoja) {
  return hoja.slice(1).filter(f => !vacia(f)).map(f => {
    const rango = celda(f, 2).trim();
    const nums = (rango.match(/\d+/g) || []).map(Number);
    const abierto = /mayor/i.test(rango);
    return { etiqueta: celda(f, 1).trim(), rango, desde: abierto ? nums[0] + 1 : nums[0], hasta: abierto ? Infinity : nums[1] };
  });
}

// Una pestaña de rangos con nombre: fila de encabezados -> columna de valores.
function leerColumnas(hoja, filaEncabezado, columnas) {
  const salida = {};
  columnas.forEach(c => {
    const cabecera = celda(hoja[filaEncabezado], c).trim();
    if (!cabecera) return;
    const valores = [];
    for (let f = filaEncabezado + 1; f < hoja.length; f++) {
      const v = celda(hoja[f], c).trim();
      if (!v) break;
      valores.push(v);
    }
    salida[cabecera] = valores;
  });
  return salida;
}

// --- Suite -----------------------------------------------------------------

function probarExcel(ctx) {
  const fallos = [];
  let casos = 0;
  const fallar = m => { if (fallos.length < 60) fallos.push(m); else if (fallos.length === 60) fallos.push("… (se omiten los demás)"); };

  if (!fs.existsSync(RUTA_EXCEL)) {
    return { ok: false, casos: 0, texto: `No se encontró ${path.basename(RUTA_EXCEL)} junto al código; sin él esta prueba no puede correr.` };
  }

  const libro = leerLibro(RUTA_EXCEL);
  // `valor()` evalúa dentro del contexto: los `const` de los .gs no son propiedades de ctx.
  const { valor } = require("./harness");
  const [CAT_UBICACIONES, CAT_SERVICIOS, CAT_CANTIDAD, CAT_TIEMPOS, CAT_CATEGORIAS, VARIANTES_EDIFICIO] =
    valor(ctx, "[CAT_UBICACIONES, CAT_SERVICIOS, CAT_CANTIDAD, CAT_TIEMPOS, CAT_CATEGORIAS, VARIANTES_EDIFICIO]");
  const { calcularPuntaje, esGrupo, normalizarTexto } = ctx;

  // ---- E0. Las seis pestañas siguen ahí y con los encabezados esperados.
  Object.keys(HOJAS).forEach(k => {
    casos++;
    if (!libro[HOJAS[k]]) fallar(`E0 falta la pestaña "${HOJAS[k]}" en el Excel`);
  });
  if (fallos.length) return { ok: false, casos, texto: fallos.join("\n") };

  const encabezados = [
    [HOJAS.UBICACIONES, 0, ["", "EDIFICIO", "UBICACIÓN", "PUNTAJE"]],
    [HOJAS.ARBOL, 0, ["", "CATEGORIA", "SUBCATEGORIA 1", "SUBCATEGORIA 2", "", "PUNTAJE"]],
    [HOJAS.CANTIDAD, 0, ["CANTIDAD DE EQUIPOS", "PUNTAJE"]],
    [HOJAS.TIEMPOS, 0, ["", "TIEMPOS DE RESPUESTA", "PUNTAJE"]]
  ];
  encabezados.forEach(([hoja, fila, esperados]) => {
    esperados.forEach((txt, i) => {
      casos++;
      if (celda(libro[hoja][fila], i).trim() !== txt) {
        fallar(`E0 "${hoja}" columna ${i + 1}: encabezado esperado "${txt}", encontrado "${celda(libro[hoja][fila], i)}"`);
      }
    });
  });

  // ---- E1. Pestaña LISTA DE UBICACIONES ↔ CAT_UBICACIONES.
  const ubExcel = leerUbicaciones(libro[HOJAS.UBICACIONES]);
  casos++;
  if (ubExcel.length !== CAT_UBICACIONES.length) {
    fallar(`E1 el Excel tiene ${ubExcel.length} ubicaciones y CAT_UBICACIONES ${CAT_UBICACIONES.length}`);
  }
  ubExcel.forEach(x => {
    casos++;
    const c = CAT_UBICACIONES.filter(u => u.edificio === x.edificio && u.excel === x.ubicacion);
    if (c.length !== 1) {
      fallar(`E1 ubicación ${x.edificio}/"${x.ubicacion}" del Excel: ${c.length} coincidencias en CAT_UBICACIONES (debería haber 1)`);
    } else if (c[0].puntos !== x.puntos) {
      fallar(`E1 ubicación ${x.edificio}/"${x.ubicacion}": el Excel dice ${x.puntos} puntos y CAT_UBICACIONES ${c[0].puntos}`);
    }
  });
  CAT_UBICACIONES.forEach(u => {
    casos++;
    if (!ubExcel.some(x => x.edificio === u.edificio && x.ubicacion === u.excel)) {
      fallar(`E1 CAT_UBICACIONES trae ${u.edificio}/"${u.excel}", que ya no está en el Excel`);
    }
  });

  // ---- E2. Pestaña ÁRBOL DE SERVICIOS ↔ CAT_SERVICIOS (sin las extensiones del formulario).
  const arbol = leerArbol(libro[HOJAS.ARBOL]);
  const delExcel = CAT_SERVICIOS.filter(s => !s.extension);
  casos++;
  if (arbol.length !== delExcel.length) {
    fallar(`E2 el Excel tiene ${arbol.length} hojas del árbol y CAT_SERVICIOS ${delExcel.length} sin contar extensiones`);
  }
  arbol.forEach(x => {
    casos++;
    // La categoría del Excel tiene que estar declarada, literal, entre las grafías de alguna
    // categoría canónica: así se detecta hasta el espacio inicial de " VIDEO - PROYECTORES…".
    const canonicas = Object.keys(CAT_CATEGORIAS).filter(k => CAT_CATEGORIAS[k].indexOf(x.categoria) !== -1);
    if (canonicas.length !== 1) {
      fallar(`E2 la categoría del Excel ${JSON.stringify(x.categoria)} aparece en ${canonicas.length} entradas de CAT_CATEGORIAS (debería ser 1)`);
      return;
    }
    const cat = canonicas[0];
    const c = delExcel.filter(s => s.categoria === cat && (s.excel || s.canonico) === x.servicio);
    if (c.length !== 1) {
      fallar(`E2 servicio "${x.servicio}" de "${cat}": ${c.length} coincidencias en CAT_SERVICIOS (debería haber 1)`);
      return;
    }
    if (c[0].puntos !== x.puntos) fallar(`E2 servicio "${x.servicio}" de "${cat}": el Excel dice ${x.puntos} puntos y CAT_SERVICIOS ${c[0].puntos}`);
    casos++;
    if ((c[0].grupo || "") !== x.grupo) fallar(`E2 servicio "${x.servicio}": el Excel lo agrupa bajo ${JSON.stringify(x.grupo)} y CAT_SERVICIOS bajo ${JSON.stringify(c[0].grupo || "")}`);
  });
  delExcel.forEach(s => {
    casos++;
    if (!arbol.some(x => x.servicio === (s.excel || s.canonico) && CAT_CATEGORIAS[s.categoria].indexOf(x.categoria) !== -1)) {
      fallar(`E2 CAT_SERVICIOS trae "${s.excel || s.canonico}" en "${s.categoria}", que ya no está en el árbol del Excel`);
    }
  });
  // Toda categoría canónica declara la grafía larga del Excel como su primera variante.
  Object.keys(CAT_CATEGORIAS).forEach(cat => {
    casos++;
    if (!arbol.some(x => x.categoria === CAT_CATEGORIAS[cat][0])) {
      fallar(`E2 la primera grafía declarada de "${cat}" no es la del Excel: ${JSON.stringify(CAT_CATEGORIAS[cat][0])}`);
    }
  });

  // ---- E3. Pestaña CANTIDAD DE EQUIPOS ↔ CAT_CANTIDAD.
  const cantExcel = leerCantidad(libro[HOJAS.CANTIDAD]);
  casos++;
  if (cantExcel.length !== CAT_CANTIDAD.length) fallar(`E3 el Excel tiene ${cantExcel.length} tramos de cantidad y CAT_CANTIDAD ${CAT_CANTIDAD.length}`);
  cantExcel.forEach((x, i) => {
    const c = CAT_CANTIDAD[i];
    casos++;
    if (!c) { fallar(`E3 falta en CAT_CANTIDAD el tramo "${x.rango}"`); return; }
    if (c.rango !== x.rango) fallar(`E3 tramo ${i + 1}: el Excel lo llama "${x.rango}" y CAT_CANTIDAD "${c.rango}"`);
    casos++;
    if (c.puntos !== x.puntos) fallar(`E3 tramo "${x.rango}": el Excel da ${x.puntos} puntos y CAT_CANTIDAD ${c.puntos}`);
    casos++;
    if (c.desde !== x.desde) fallar(`E3 tramo "${x.rango}": empieza en ${x.desde} según el Excel y en ${c.desde} según CAT_CANTIDAD`);
    casos++;
    // CAT_CANTIDAD cierra el último tramo en 1000 en vez de dejarlo abierto; es un detalle
    // de la transcripción, no del Excel, mientras cubra cualquier cantidad realista.
    const hastaOk = x.hasta === Infinity ? c.hasta >= 1000 : c.hasta === x.hasta;
    if (!hastaOk) fallar(`E3 tramo "${x.rango}": termina en ${x.hasta} según el Excel y en ${c.hasta} según CAT_CANTIDAD`);
  });

  // ---- E4. Pestaña TIEMPOS DE RESPUESTA ↔ CAT_TIEMPOS.
  const tiempoExcel = leerTiempos(libro[HOJAS.TIEMPOS]);
  casos++;
  if (tiempoExcel.length !== CAT_TIEMPOS.length) fallar(`E4 el Excel tiene ${tiempoExcel.length} plazos y CAT_TIEMPOS ${CAT_TIEMPOS.length}`);
  tiempoExcel.forEach((x, i) => {
    const c = CAT_TIEMPOS[i];
    casos++;
    if (!c) { fallar(`E4 falta en CAT_TIEMPOS el plazo "${x.etiqueta}"`); return; }
    if (c.etiqueta !== x.etiqueta) fallar(`E4 plazo ${i + 1}: el Excel lo llama "${x.etiqueta}" y CAT_TIEMPOS "${c.etiqueta}"`);
    casos++;
    if (c.desde !== x.desde) fallar(`E4 plazo "${x.etiqueta}": empieza en ${x.desde} puntos según el Excel ("${x.rango}") y en ${c.desde} según CAT_TIEMPOS`);
    casos++;
    if (c.hasta !== x.hasta) fallar(`E4 plazo "${x.etiqueta}": termina en ${x.hasta} puntos según el Excel ("${x.rango}") y en ${c.hasta} según CAT_TIEMPOS`);
  });
  // Los tramos del Excel se encadenan sin huecos ni solapes desde 1.
  tiempoExcel.forEach((x, i) => {
    casos++;
    const esperado = i === 0 ? 1 : tiempoExcel[i - 1].hasta + 1;
    if (x.desde !== esperado) fallar(`E4 el tramo "${x.etiqueta}" empieza en ${x.desde} y el anterior terminó en ${i === 0 ? "—" : tiempoExcel[i - 1].hasta}`);
  });

  // ---- E5. Pestaña oculta tabla_ub (los desplegables del formulario) ↔ VARIANTES_EDIFICIO.
  const tablaUb = leerColumnas(libro[HOJAS.TABLA_UB], 0, [1, 2, 3]);
  Object.keys(tablaUb).forEach(rango => {
    casos++;
    const edificio = Object.keys(VARIANTES_EDIFICIO).find(e => VARIANTES_EDIFICIO[e].indexOf(rango) !== -1);
    if (!edificio) { fallar(`E5 el rango con nombre "${rango}" de tabla_ub no está declarado en VARIANTES_EDIFICIO`); return; }
    casos++;
    const enExcel = CAT_UBICACIONES.filter(u => u.edificio === edificio).map(u => u.excel).sort();
    if (tablaUb[rango].slice().sort().join(" | ") !== enExcel.join(" | ")) {
      fallar(`E5 "${rango}" lista ${tablaUb[rango].length} ubicaciones y el catálogo ${enExcel.length} para el edificio ${edificio}`);
    }
  });
  Object.keys(VARIANTES_EDIFICIO).forEach(e => {
    casos++;
    if (!VARIANTES_EDIFICIO[e].some(v => tablaUb[v])) fallar(`E5 ningún rango con nombre de tabla_ub corresponde al edificio ${e}`);
  });

  // ---- E6. Pestaña oculta tabla_serv ↔ CAT_CATEGORIAS y CAT_SERVICIOS.
  // Dos bloques: el de categorías (fila 1) y el de grupos de revisión y reparación (fila 9).
  const tablaServ = leerColumnas(libro[HOJAS.TABLA_SERV], 0, [1, 2, 3, 4, 5, 6, 7]);
  Object.keys(tablaServ).forEach(rango => {
    casos++;
    const cats = Object.keys(CAT_CATEGORIAS).filter(k => CAT_CATEGORIAS[k].indexOf(rango) !== -1);
    if (cats.length !== 1) { fallar(`E6 el rango con nombre "${rango}" de tabla_serv aparece en ${cats.length} categorías de CAT_CATEGORIAS`); return; }
    const cat = cats[0];
    tablaServ[rango].forEach(valor => {
      casos++;
      const esServicio = CAT_SERVICIOS.some(s => s.categoria === cat && [s.canonico, s.excel].concat(s.variantes || []).some(v => v && normalizarTexto(v) === normalizarTexto(valor)));
      if (!esServicio && !esGrupo(valor)) {
        fallar(`E6 "${valor}" está en la columna "${rango}" de tabla_serv pero no es ni servicio de "${cat}" ni grupo reconocido`);
      }
    });
  });
  const grupos = leerColumnas(libro[HOJAS.TABLA_SERV], 8, [4, 5, 6]);
  Object.keys(grupos).forEach(grupo => {
    casos++;
    if (!esGrupo(grupo)) fallar(`E6 "${grupo}" encabeza un bloque de tabla_serv pero esGrupo() no lo reconoce como selector`);
    grupos[grupo].forEach(valor => {
      casos++;
      if (!CAT_SERVICIOS.some(s => [s.canonico, s.excel].some(v => v && normalizarTexto(v) === normalizarTexto(valor)))) {
        fallar(`E6 "${valor}" cuelga del grupo "${grupo}" en tabla_serv pero no está en CAT_SERVICIOS`);
      }
    });
  });

  // ---- E7. Matriz completa leída del archivo: cada ubicación × cada servicio × cada
  // tramo de cantidad, con los textos tal cual están en las celdas. El puntaje y el plazo
  // esperados salen del propio Excel, no del código.
  const puntosCantidadExcel = n => (cantExcel.find(t => n >= t.desde && n <= t.hasta) || cantExcel[cantExcel.length - 1]).puntos;
  const plazoExcel = total => (tiempoExcel.find(t => total >= t.desde && total <= t.hasta) || tiempoExcel[0]).etiqueta;
  const cantidades = cantExcel.map(t => t.desde);

  ubExcel.forEach(u => {
    arbol.forEach(s => {
      cantidades.forEach(cantidad => {
        casos++;
        const total = u.puntos + s.puntos + puntosCantidadExcel(cantidad);
        const etiqueta = plazoExcel(total);
        const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.ubicacion, categoria: s.categoria, servicio: s.servicio, cantidad });
        if (r.total !== total || r.tiempo !== etiqueta || r.avisos.length) {
          fallar(`E7 ${u.edificio}/"${u.ubicacion}" + "${s.servicio}" × ${cantidad}: el Excel da ${u.puntos}+${s.puntos}+${puntosCantidadExcel(cantidad)}=${total} → "${etiqueta}"; el motor da ${r.ptsUbicacion}+${r.ptsServicio}+${r.ptsCantidad}=${r.total} → "${r.tiempo}"${r.avisos.length ? " — " + r.avisos.join(" | ") : ""}`);
        }
      });
    });
  });

  const texto = fallos.length
    ? `${fallos.length} diferencia(s) entre el Excel y el código, en ${casos} comprobaciones:\n${fallos.join("\n")}`
    : `${casos} comprobaciones correctas contra ${path.basename(RUTA_EXCEL)}: ` +
      `${ubExcel.length} ubicaciones, ${arbol.length} hojas del árbol, ${cantExcel.length} tramos de cantidad, ` +
      `${tiempoExcel.length} plazos y las dos pestañas ocultas de desplegables; ` +
      `matriz de ${ubExcel.length * arbol.length * cantidades.length} combinaciones leídas del archivo.`;

  return { ok: fallos.length === 0, casos, texto };
}

module.exports = { probarExcel, RUTA_EXCEL };

if (require.main === module) {
  const { cargar } = require("./harness");
  const ctx = cargar();
  ctx.mostrarResultado = () => {};
  const r = probarExcel(ctx);
  console.log(`${r.ok ? "✓" : "✗"} Excel ↔ código`);
  console.log("   " + r.texto.split("\n").join("\n   "));
  process.exit(r.ok ? 0 : 1);
}
