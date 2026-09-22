/*
  Lector mínimo de .xlsx sin dependencias.

  Existe para que las pruebas puedan leer "TIEMPOS DE RESPUESTA.xlsx" tal cual está en el
  disco, en vez de fiarse de la transcripción a mano de Servicios.gs. Un .xlsx es un ZIP
  con XML dentro: se abre el ZIP con zlib (inflateRaw) y se recorren las celdas con
  expresiones regulares, que basta para el XML que genera Excel/Sheets.

  leerLibro(ruta) -> { "NOMBRE DE LA HOJA": [ [celdaA1, celdaB1, ...], ... ], ... }
  Las celdas vienen como texto crudo, SIN recortar: el Excel trae un espacio inicial en
  " VIDEO - PROYECTORES O PANTALLAS (…)" y esa rareza es justo lo que las pruebas vigilan.
*/

const fs = require("fs");
const zlib = require("zlib");

// --- ZIP -------------------------------------------------------------------

function abrirZip(ruta) {
  const buf = fs.readFileSync(ruta);

  // Fin del directorio central (EOCD): se busca hacia atrás porque lleva comentario opcional.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 65535; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error(`${ruta} no parece un ZIP (no se encontró el directorio central)`);

  const nEntradas = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const archivos = {};

  for (let i = 0; i < nEntradas; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("directorio central corrupto");
    const metodo    = buf.readUInt16LE(p + 10);
    const tamComp   = buf.readUInt32LE(p + 20);
    const lenNombre = buf.readUInt16LE(p + 28);
    const lenExtra  = buf.readUInt16LE(p + 30);
    const lenCom    = buf.readUInt16LE(p + 32);
    const offLocal  = buf.readUInt32LE(p + 42);
    const nombre    = buf.toString("utf8", p + 46, p + 46 + lenNombre);

    // La cabecera local repite el nombre y trae su propio "extra", casi nunca del mismo largo.
    const lenNombreLocal = buf.readUInt16LE(offLocal + 26);
    const lenExtraLocal  = buf.readUInt16LE(offLocal + 28);
    const ini  = offLocal + 30 + lenNombreLocal + lenExtraLocal;
    const crudo = buf.subarray(ini, ini + tamComp);

    archivos[nombre] = metodo === 0 ? crudo : zlib.inflateRawSync(crudo);
    p += 46 + lenNombre + lenExtra + lenCom;
  }
  return archivos;
}

// --- XML -------------------------------------------------------------------

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function desescapar(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (todo, e) => {
    if (e[0] === "#") return String.fromCodePoint(parseInt(e[1] === "x" ? e.slice(2) : e.slice(1), e[1] === "x" ? 16 : 10));
    return ENTIDADES[e] !== undefined ? ENTIDADES[e] : todo;
  });
}

// Concatena el texto de todos los <t> de un fragmento (una celda puede venir partida en
// varios "runs" con formato distinto: Excel los guarda como <r><t>..</t></r> seguidos).
function textoDeT(xml) {
  const partes = [];
  const re = /<t(?:\s[^>]*)?\/>|<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) partes.push(desescapar(m[1] || ""));
  return partes.join("");
}

function numeroDeColumna(ref) {
  const letras = /^([A-Z]+)/.exec(ref)[1];
  let n = 0;
  for (let i = 0; i < letras.length; i++) n = n * 26 + (letras.charCodeAt(i) - 64);
  return n;
}

// --- Libro -----------------------------------------------------------------

function leerLibro(ruta) {
  const zip = abrirZip(ruta);
  const txt = n => (zip[n] ? zip[n].toString("utf8") : "");

  // Cadenas compartidas: Excel guarda el texto repetido una sola vez y las celdas lo indexan.
  const compartidas = [];
  const ss = txt("xl/sharedStrings.xml");
  if (ss) {
    const re = /<si>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = re.exec(ss)) !== null) compartidas.push(textoDeT(m[1]));
  }

  // Nombre de hoja -> archivo, cruzando workbook.xml con sus relaciones.
  const rels = {};
  txt("xl/_rels/workbook.xml.rels").replace(/<Relationship\b([^>]*)\/>/g, (_, attrs) => {
    const id = /Id="([^"]+)"/.exec(attrs);
    const tgt = /Target="([^"]+)"/.exec(attrs);
    if (id && tgt) rels[id[1]] = tgt[1].replace(/^\/?(xl\/)?/, "xl/");
    return "";
  });

  const libro = {};
  const wb = txt("xl/workbook.xml");
  const reHoja = /<sheet\b([^>]*)\/>/g;
  let h;
  while ((h = reHoja.exec(wb)) !== null) {
    const nombre = desescapar(/name="([^"]*)"/.exec(h[1])[1]);
    const rid = /r:id="([^"]+)"/.exec(h[1])[1];
    libro[nombre] = leerHoja(txt(rels[rid]), compartidas);
  }
  return libro;
}

function leerHoja(xml, compartidas) {
  const filas = [];
  // Ojo con las etiquetas que se cierran solas (`<c r="D2" s="16"/>`, celda con formato y
  // sin valor): si se intenta casar `<c ...>…</c>` primero, la celda vacía se traga la
  // siguiente y todas las columnas se corren una posición.
  const reFila = /<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g;
  let f;
  while ((f = reFila.exec(xml)) !== null) {
    const attrs = f[1] || "";
    const nFila = parseInt(/r="(\d+)"/.exec(attrs)[1], 10);
    const celdas = [];

    const reCelda = /<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g;
    let c;
    while ((c = reCelda.exec(f[3] || "")) !== null) {
      const at = c[1] || "";
      const cuerpo = c[3] || "";
      const tipo = (/t="([^"]*)"/.exec(at) || [, ""])[1];
      const col = numeroDeColumna(/r="([A-Z]+\d+)"/.exec(at)[1]);

      let valor = "";
      if (tipo === "s") {
        const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo);
        valor = v ? (compartidas[parseInt(v[1], 10)] || "") : "";
      } else if (tipo === "inlineStr") {
        valor = textoDeT(cuerpo);
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo);
        valor = v ? desescapar(v[1]) : "";
      }
      celdas[col - 1] = String(valor);
    }

    while (filas.length < nFila - 1) filas.push([]);
    filas[nFila - 1] = Array.from({ length: celdas.length }, (_, i) => celdas[i] === undefined ? "" : celdas[i]);
  }
  return filas;
}

module.exports = { leerLibro };
