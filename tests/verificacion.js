/*
  Prueba de humo del informe de verificación (`Verificacion.gs`).

  El informe solo dice la verdad dentro de Sheets: aquí no hay pestaña `Festivos`, ni
  bandeja, ni formulario, ni disparadores. Lo que sí se puede comprobar fuera de Google es
  que **ninguna avería del entorno lo tumbe**: es la herramienta con la que se diagnostica
  una hoja que va mal, así que tiene que sobrevivir a que falte todo y seguir informando.

  Se ejecuta dos veces: contra un libro vacío (el peor caso) y contra uno con las hojas
  mínimas. En los dos se exige que devuelva todos los pasos, que ninguno reviente por una
  excepción no capturada y que las suites de pruebas sigan saliendo en verde.

  Corre en Node con su propio contexto, sin el `mostrarResultado` que instala `run.js`:
  el informe necesita el original para capturar la salida de cada suite.
*/

const { cargar, hojaSimulada } = require("./harness");

// Un libro con lo mínimo para que los pasos de hojas y bandeja tengan algo que leer.
function libroMinimo() {
  return {
    hojas: {
      "Respuestas_Oficiales": [
        ["RADICADO", "Marca temporal", "Correo", "Nombres y apellidos", "Teléfono",
         "Seleccione el edificio", "Ubicación exacta", "Seleccione la categoría", "Servicio",
         "Cantidad de equipos", "Comentarios adicionales", "ESTADO"]
      ],
      "Solicitudes Pendientes": [
        ["RADICADO", "NOMBRE", "EDIFICIO", "UBICACIÓN", "SERVICIO", "CANTIDAD", "COMENTARIOS",
         "TIEMPO MÁXIMO", "FECHA SOLICITUD", "RESUELTO POR", "OBSERVACIONES", "HORAS HÁBILES RESTANTES"]
      ],
      "Festivos": [["FECHA", "DESCRIPCIÓN", "TIPO"]]
    }
  };
}

const ESTADOS = ["OK", "AVISO", "ERROR", "OMITIDO"];

function revisar(nombre, opciones, fallar, contar) {
  const ctx = cargar(opciones);
  let pasos;
  try {
    pasos = ctx.ejecutarVerificacion({ escribir: false });
  } catch (e) {
    fallar(`V1 ${nombre}: ejecutarVerificacion lanzó "${e.message}" — el informe nunca debe abortar`);
    return;
  }

  contar();
  if (!Array.isArray(pasos) || pasos.length < 10) {
    fallar(`V1 ${nombre}: se esperaban al menos 10 pasos, se obtuvieron ${pasos && pasos.length}`);
    return;
  }

  pasos.forEach(p => {
    contar();
    if (ESTADOS.indexOf(p.estado) === -1) fallar(`V2 ${nombre}: el paso "${p.nombre}" devolvió el estado desconocido "${p.estado}"`);
    contar();
    if (!p.nombre || !p.grupo) fallar(`V2 ${nombre}: hay un paso sin nombre o sin grupo (${JSON.stringify(p)})`);
    contar();
    // Un paso en ERROR por una excepción del entorno es legítimo; uno que deje el detalle
    // vacío no dice nada y no sirve para diagnosticar.
    if (p.estado !== "OMITIDO" && !p.detalle) fallar(`V2 ${nombre}: el paso "${p.nombre}" no dejó ningún detalle`);
  });

  // Las seis suites son JavaScript puro: tienen que pasar aunque no haya ni una hoja.
  const suites = pasos.find(p => /^6\. Pruebas autom/.test(p.nombre));
  contar();
  if (!suites) fallar(`V3 ${nombre}: el informe no incluyó el paso de pruebas automáticas`);
  else if (suites.estado !== "OK") fallar(`V3 ${nombre}: las suites deberían pasar sin Sheets, estado "${suites.estado}"\n${suites.detalle}`);

  // La de la fórmula necesita Sheets de verdad: aquí solo se exige que esté reportada y
  // que su fracaso quede explicado, no que pase.
  const formula = pasos.find(p => /F[oó]rmula de horas/.test(p.nombre));
  contar();
  if (!formula) fallar(`V3 ${nombre}: el informe no incluyó la comprobación de la fórmula`);
  else if (!formula.detalle) fallar(`V3 ${nombre}: la comprobación de la fórmula no explicó su resultado`);

  // Los pasos que escriben quedan omitidos cuando no se autoriza.
  pasos.filter(p => p.grupo === "Corrección").forEach(p => {
    contar();
    if (p.estado !== "OMITIDO") fallar(`V4 ${nombre}: "${p.nombre}" se ejecutó sin autorización de escritura (estado "${p.estado}")`);
  });

  // El resumen y el texto del informe se generan sin reventar y nombran cada paso.
  contar();
  const resumen = ctx.resumenVerificacion(pasos);
  if (!resumen || pasos.some(p => resumen.indexOf(p.nombre) === -1)) {
    fallar(`V5 ${nombre}: el resumen no menciona todos los pasos`);
  }
  contar();
  const texto = ctx.escribirInforme(pasos);
  if (!texto || texto.indexOf("INFORME DE VERIFICACIÓN") !== 0) fallar(`V5 ${nombre}: el informe en texto no se generó`);
}

function probarVerificacion() {
  const fallos = [];
  let casos = 0;
  const fallar = m => { if (fallos.length < 30) fallos.push(m); };
  const contar = () => { casos++; };

  revisar("libro vacío", {}, fallar, contar);
  revisar("libro mínimo", libroMinimo(), fallar, contar);

  const texto = fallos.length
    ? `${fallos.length} problema(s) en ${casos} comprobaciones:\n${fallos.join("\n")}`
    : `${casos} comprobaciones correctas: el informe se completa y se mantiene informativo con un libro vacío y con uno mínimo.`;
  return { ok: fallos.length === 0, casos, texto };
}

module.exports = { probarVerificacion };

if (require.main === module) {
  const r = probarVerificacion();
  console.log(`${r.ok ? "✓" : "✗"} Informe de verificación`);
  console.log("   " + r.texto.split("\n").join("\n   "));
  process.exit(r.ok ? 0 : 1);
}
