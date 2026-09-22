/*
  =================================================================
  --- PLAZO DE RESPUESTA POR SERVICIO ---
  =================================================================

  `probarServicios()` (Servicios.gs) comprueba que cada ubicación y cada servicio del Excel
  valgan los puntos que dice el Excel. Esta suite recorre el tramo siguiente: de los puntos
  al **plazo** de la pestaña "TIEMPOS DE RESPUESTA" y de ahí a la **fecha límite** con el
  calendario hábil. Es lo que el solicitante recibe en el correo, así que se verifica para
  cada servicio del árbol, en todas sus grafías, contra todas las ubicaciones y todos los
  tramos de cantidad.

  Usa como oráculo el catálogo transcrito del Excel en Servicios.gs (CAT_*), no ESCALA_*.
  `tests/excel.js` cierra el círculo comparando ese catálogo con el .xlsx real del disco.

  Lo que añade sobre `probarServicios()`:
    - el campo `horas` del plazo (Servicios.gs solo mira la etiqueta),
    - la monotonía: más puntos nunca puede dar un plazo más corto,
    - las fronteras exactas de los tramos de cantidad, servicio por servicio,
    - la fecha límite hábil, verificada por su contrato y no por el algoritmo que la calcula,
    - el alcance: qué plazos puede llegar a producir cada servicio.
*/

// Plazos ordenados por urgencia: 0 es el tramo más urgente ("24 HORAS").
function tramoDePlazo(etiqueta) {
  for (let i = 0; i < CAT_TIEMPOS.length; i++) if (CAT_TIEMPOS[i].etiqueta === etiqueta) return i;
  return -1;
}

function horasEsperadasDePlazo(etiqueta) {
  const t = CAT_TIEMPOS.find(x => x.etiqueta === etiqueta);
  return t ? t.horas : null;
}

// Una ubicación por cada puntaje distinto de cada edificio: cubre todos los plazos
// alcanzables sin repetir 38 veces lo mismo cuando la prueba cruza variantes.
function ubicacionesTestigo() {
  const vistas = {}, testigos = [];
  CAT_UBICACIONES.forEach(u => {
    const clave = `${u.edificio}|${u.puntos}`;
    if (vistas[clave]) return;
    vistas[clave] = true;
    testigos.push(u);
  });
  return testigos;
}

// Un servicio por cada puntaje distinto del árbol.
function serviciosTestigo() {
  const vistos = {}, testigos = [];
  CAT_SERVICIOS.forEach(s => {
    if (vistos[s.puntos]) return;
    vistos[s.puntos] = true;
    testigos.push(s);
  });
  return testigos;
}

// Cantidades representativas: el primer y el último valor de cada tramo del Excel.
function cantidadesDePrueba() {
  const lista = [];
  CAT_CANTIDAD.forEach(t => {
    lista.push(t.desde);
    if (t.hasta !== t.desde) lista.push(t.hasta === 1000 ? 500 : t.hasta);
  });
  return lista;
}

// Resultado esperado de una solicitud, calculado solo con el catálogo del Excel.
function plazoEsperado(u, s, cantidad) {
  const total = u.puntos + s.puntos + puntosCantidadEsperados(cantidad);
  const etiqueta = etiquetaEsperada(total);
  return { total, etiqueta, horas: horasEsperadasDePlazo(etiqueta) };
}

/*
  =================================================================
  --- SUITE ---
  =================================================================
*/

function probarTiempos() {
  const fallos = [];
  let casos = 0;
  const fallar = m => { if (fallos.length < 60) fallos.push(m); else if (fallos.length === 60) fallos.push("… (se omiten los demás)"); };

  const F = festivos2026();
  const TESTIGOS_UB = ubicacionesTestigo();
  const TESTIGOS_SERV = serviciosTestigo();
  const TRAMOS = CAT_CANTIDAD.map(t => t.desde);

  // ---- TR1. Etiqueta y horas en la matriz completa, con los nombres canónicos.
  // probarServicios() ya recorre esta matriz con los nombres del Excel y comprueba el
  // total; aquí se usa la otra familia de grafías y se añade el campo `horas`, que es
  // el que alimenta la fecha límite.
  CAT_UBICACIONES.forEach(u => {
    CAT_SERVICIOS.forEach(s => {
      TRAMOS.forEach(cantidad => {
        casos++;
        const esperado = plazoEsperado(u, s, cantidad);
        const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad });
        if (r.tiempo !== esperado.etiqueta || r.horas !== esperado.horas || r.total !== esperado.total || r.avisos.length) {
          fallar(`TR1 ${u.edificio}/"${u.canonico}" + "${s.canonico}" × ${cantidad}: esperado ${esperado.total} pts → "${esperado.etiqueta}" (${esperado.horas} h), obtenido ${r.total} → "${r.tiempo}" (${r.horas} h)${r.avisos.length ? " — " + r.avisos.join(" | ") : ""}`);
        }
      });
    });
  });

  // ---- TR2. Monotonía: más puntos nunca puede dar un plazo más corto.
  // Si alguien invierte un tramo de la escala, la suma sigue cuadrando pero el plazo
  // deja de tener sentido; esto lo detecta.
  CAT_UBICACIONES.forEach(u => {
    CAT_SERVICIOS.forEach(s => {
      let anterior = -1;
      TRAMOS.forEach(cantidad => {
        casos++;
        const tramo = tramoDePlazo(calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad }).tiempo);
        if (tramo < anterior) fallar(`TR2 "${s.canonico}" en "${u.canonico}": subir a ${cantidad} equipos acortó el plazo`);
        anterior = tramo;
      });
    });
  });
  // A igual servicio y cantidad, una ubicación con más puntos nunca tiene plazo más corto.
  CAT_SERVICIOS.forEach(s => {
    TRAMOS.forEach(cantidad => {
      const ordenadas = TESTIGOS_UB.slice().sort((a, b) => a.puntos - b.puntos);
      let anterior = -1;
      ordenadas.forEach(u => {
        casos++;
        const tramo = tramoDePlazo(calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad }).tiempo);
        if (tramo < anterior) fallar(`TR2 "${s.canonico}" × ${cantidad}: "${u.canonico}" (${u.puntos} pts) da un plazo más corto que una ubicación de menos puntos`);
        anterior = tramo;
      });
    });
  });

  // ---- TR3. El plazo solo cambia en las fronteras del Excel: 3→4, 14→15, 30→31.
  TESTIGOS_UB.forEach(u => {
    CAT_SERVICIOS.forEach(s => {
      CAT_CANTIDAD.forEach(t => {
        const hasta = t.hasta === 1000 ? 500 : t.hasta;
        const a = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad: t.desde });
        const b = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad: hasta });
        casos++;
        if (a.tiempo !== b.tiempo || a.total !== b.total) {
          fallar(`TR3 "${s.canonico}" en "${u.canonico}": dentro del tramo "${t.rango}" el plazo cambió de "${a.tiempo}" (${t.desde}) a "${b.tiempo}" (${hasta})`);
        }
        // Un equipo más que el tope del tramo tiene que salir del tramo de cantidad.
        if (t.hasta !== 1000) {
          casos++;
          const c = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad: t.hasta + 1 });
          if (c.ptsCantidad === a.ptsCantidad) {
            fallar(`TR3 "${s.canonico}" en "${u.canonico}": ${t.hasta + 1} equipos siguen puntuando como el tramo "${t.rango}"`);
          }
        }
      });
    });
  });

  // ---- TR4. Cada servicio en todas sus grafías y bajo todas las grafías de su categoría
  // produce exactamente el mismo plazo que su forma canónica.
  CAT_SERVICIOS.forEach(s => {
    const categorias = CAT_CATEGORIAS[s.categoria];
    if (!categorias) { casos++; fallar(`TR4 categoría "${s.categoria}" sin variantes declaradas`); return; }
    TESTIGOS_UB.forEach(u => {
      TRAMOS.forEach(cantidad => {
        const esperado = plazoEsperado(u, s, cantidad);
        variantesDeServicio(s).forEach(servicio => {
          categorias.forEach(categoria => {
            casos++;
            const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria, servicio, cantidad });
            if (r.tiempo !== esperado.etiqueta || r.horas !== esperado.horas || r.total !== esperado.total) {
              fallar(`TR4 "${servicio}" en "${nombreCategoria(categoria)}" (${u.canonico} × ${cantidad}): esperado ${esperado.total} → "${esperado.etiqueta}" (${esperado.horas} h), obtenido ${r.total} → "${r.tiempo}" (${r.horas} h)`);
            } else if (r.servicioNombre !== s.canonico) {
              fallar(`TR4 "${servicio}" en "${nombreCategoria(categoria)}": se resolvió como "${r.servicioNombre}" y no como "${s.canonico}"`);
            } else if (r.avisos.length) {
              fallar(`TR4 "${servicio}" en "${nombreCategoria(categoria)}" no debería avisar: ${r.avisos.join(" | ")}`);
            }
          });
        });
      });
    });
  });

  // ---- TR5. Cada ubicación en todas sus grafías y con todas las grafías del edificio
  // produce el mismo plazo, para servicios de cada puntaje distinto.
  CAT_UBICACIONES.forEach(u => {
    TESTIGOS_SERV.forEach(s => {
      TRAMOS.forEach(cantidad => {
        const esperado = plazoEsperado(u, s, cantidad);
        variantesDeUbicacion(u).forEach(ubicacion => {
          VARIANTES_EDIFICIO[u.edificio].forEach(edificio => {
            casos++;
            const r = calcularPuntaje({ edificio, ubicacion, categoria: s.categoria, servicio: s.canonico, cantidad });
            if (r.tiempo !== esperado.etiqueta || r.horas !== esperado.horas || r.total !== esperado.total) {
              fallar(`TR5 "${ubicacion}" (edificio "${edificio}") + "${s.canonico}" × ${cantidad}: esperado ${esperado.total} → "${esperado.etiqueta}", obtenido ${r.total} → "${r.tiempo}"`);
            } else if (r.ubicacionNombre !== u.canonico) {
              fallar(`TR5 "${ubicacion}" (edificio "${edificio}") se resolvió como "${r.ubicacionNombre}" y no como "${u.canonico}"`);
            } else if (r.avisos.length) {
              fallar(`TR5 "${ubicacion}" (edificio "${edificio}") no debería avisar: ${r.avisos.join(" | ")}`);
            }
          });
        });
      });
    });
  });

  // ---- TR6. Etiqueta → horas, incluidas las grafías antiguas de la hoja.
  CAT_TIEMPOS.forEach(t => {
    [t.etiqueta, t.etiqueta.toLowerCase(), ` ${t.etiqueta} `, t.etiqueta.replace(/DIAS/, "DÍAS")].forEach(grafia => {
      casos++;
      if (horasDeTiempo(grafia) !== t.horas) fallar(`TR6 horas de "${grafia}": esperado ${t.horas}, obtenido ${horasDeTiempo(grafia)}`);
    });
  });
  // Una etiqueta que nadie reconoce cae en el plazo más largo, nunca en el más urgente.
  ["", null, undefined, "MAÑANA", "3 semanas"].forEach(grafia => {
    casos++;
    const horas = horasDeTiempo(grafia);
    if (horas !== horasEsperadasDePlazo("NO ESTABLECIDO")) {
      fallar(`TR6 etiqueta desconocida ${JSON.stringify(grafia)}: esperadas ${horasEsperadasDePlazo("NO ESTABLECIDO")} h, obtenidas ${horas}`);
    }
  });

  // ---- TR7. Del plazo a la fecha límite hábil.
  // No se compara contra otra implementación de la aritmética hábil, sino contra el
  // contrato: la fecha límite es el PRIMER instante con exactamente `horas` horas hábiles
  // desde el inicio. Un minuto antes tiene que faltar tiempo.
  const INICIOS = [
    ["lunes 09:00", fechaLocal(2026, 3, 2, 9, 0)],
    ["miércoles 16:30", fechaLocal(2026, 3, 4, 16, 30)],
    ["viernes 14:00", fechaLocal(2026, 3, 6, 14, 0)],
    ["viernes 23:00", fechaLocal(2026, 3, 6, 23, 0)],
    ["sábado 10:00", fechaLocal(2026, 3, 7, 10, 0)],
    ["domingo 00:00", fechaLocal(2026, 3, 8, 0, 0)],
    ["víspera de festivo (viernes 20-mar 09:00, lunes 23 festivo)", fechaLocal(2026, 3, 20, 9, 0)],
    ["festivo 23-mar 11:00", fechaLocal(2026, 3, 23, 11, 0)]
  ];
  const UN_MINUTO = 60000;
  CAT_TIEMPOS.forEach(t => {
    INICIOS.forEach(([nombre, inicio]) => {
      const limite = sumarHorasHabiles(inicio, t.horas, F);
      casos++;
      const transcurridas = horasHabilesEntre(inicio, limite, F);
      if (Math.abs(transcurridas - t.horas) > 1e-9) {
        fallar(`TR7 "${t.etiqueta}" desde ${nombre}: entre ${fmtHM(inicio)} y ${fmtHM(limite)} hay ${transcurridas} h hábiles, no ${t.horas}`);
      }
      casos++;
      const antes = horasHabilesEntre(inicio, new Date(limite.getTime() - UN_MINUTO), F);
      if (!(antes < t.horas)) {
        fallar(`TR7 "${t.etiqueta}" desde ${nombre}: ${fmtHM(limite)} no es el primer instante; un minuto antes ya sumaba ${antes} h`);
      }
      casos++;
      // Cae en día hábil, o justo en la medianoche que cierra uno.
      const cierraDiaHabil = horasHabilesEntre(new Date(limite.getTime() - UN_MINUTO), limite, F) > 0;
      if (!esDiaHabil(limite, F) && !cierraDiaHabil) {
        fallar(`TR7 "${t.etiqueta}" desde ${nombre}: la fecha límite ${fmtHM(limite)} cae en día no hábil`);
      }
      casos++;
      if (!(limite > inicio)) fallar(`TR7 "${t.etiqueta}" desde ${nombre}: la fecha límite ${fmtHM(limite)} no es posterior al inicio`);
    });
  });
  // Un plazo más largo nunca puede vencer antes que uno más corto desde el mismo inicio.
  INICIOS.forEach(([nombre, inicio]) => {
    let previo = null;
    CAT_TIEMPOS.forEach(t => {
      casos++;
      const limite = sumarHorasHabiles(inicio, t.horas, F);
      if (previo && limite < previo.limite) {
        fallar(`TR7 desde ${nombre}: "${t.etiqueta}" (${fmtHM(limite)}) vence antes que "${previo.etiqueta}" (${fmtHM(previo.limite)})`);
      }
      previo = { etiqueta: t.etiqueta, limite };
    });
  });
  // Y la fecha límite de una solicitud real: cada servicio, en su ubicación de más y de
  // menos puntos, desde un lunes hábil.
  const INICIO_REAL = fechaLocal(2026, 3, 2, 9, 0);
  const MENOS_PUNTOS = CAT_UBICACIONES.slice().sort((a, b) => a.puntos - b.puntos)[0];
  const MAS_PUNTOS = CAT_UBICACIONES.slice().sort((a, b) => b.puntos - a.puntos)[0];
  CAT_SERVICIOS.forEach(s => {
    [MENOS_PUNTOS, MAS_PUNTOS].forEach(u => {
      TRAMOS.forEach(cantidad => {
        const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad });
        const limite = sumarHorasHabiles(INICIO_REAL, r.horas, F);
        casos++;
        if (Math.abs(horasHabilesEntre(INICIO_REAL, limite, F) - r.horas) > 1e-9) {
          fallar(`TR7 "${s.canonico}" en "${u.canonico}" × ${cantidad} ("${r.tiempo}"): la fecha límite ${fmtHM(limite)} no deja ${r.horas} h hábiles`);
        }
      });
    });
  });

  // ---- TR8. Cantidad ausente o disparatada: el plazo del tramo mínimo, nunca un vacío.
  const CANTIDADES_RARAS = ["", "   ", 0, -3, null, undefined, "sin dato", "varios", "  2  ", "2 equipos"];
  TESTIGOS_UB.forEach(u => {
    CAT_SERVICIOS.forEach(s => {
      const esperado = plazoEsperado(u, s, 1);
      CANTIDADES_RARAS.forEach(cantidad => {
        casos++;
        const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad });
        if (r.tiempo !== esperado.etiqueta || r.horas !== esperado.horas) {
          fallar(`TR8 "${s.canonico}" en "${u.canonico}" con cantidad ${JSON.stringify(cantidad)}: esperado "${esperado.etiqueta}", obtenido "${r.tiempo}"`);
        }
        casos++;
        if (!r.tiempo || !(r.horas > 0)) fallar(`TR8 "${s.canonico}" con cantidad ${JSON.stringify(cantidad)} quedó sin plazo: "${r.tiempo}" / ${r.horas} h`);
      });
    });
  });

  // ---- TR9. Alcance: los plazos que cada servicio puede llegar a producir.
  // El mínimo y el máximo se calculan con el catálogo del Excel y se contrastan contra
  // el recorrido real de las 38 ubicaciones × 4 tramos.
  const alcance = [];
  const minUb = Math.min.apply(null, CAT_UBICACIONES.map(u => u.puntos));
  const maxUb = Math.max.apply(null, CAT_UBICACIONES.map(u => u.puntos));
  const minCant = Math.min.apply(null, CAT_CANTIDAD.map(t => t.puntos));
  const maxCant = Math.max.apply(null, CAT_CANTIDAD.map(t => t.puntos));
  CAT_SERVICIOS.forEach(s => {
    const vistos = [];
    let minReal = Infinity, maxReal = -Infinity;
    CAT_UBICACIONES.forEach(u => TRAMOS.forEach(cantidad => {
      const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.canonico, categoria: s.categoria, servicio: s.canonico, cantidad });
      if (vistos.indexOf(r.tiempo) === -1) vistos.push(r.tiempo);
      minReal = Math.min(minReal, r.total);
      maxReal = Math.max(maxReal, r.total);
    }));
    casos++;
    if (minReal !== minUb + s.puntos + minCant) fallar(`TR9 "${s.canonico}": puntaje mínimo esperado ${minUb + s.puntos + minCant}, obtenido ${minReal}`);
    casos++;
    if (maxReal !== maxUb + s.puntos + maxCant) fallar(`TR9 "${s.canonico}": puntaje máximo esperado ${maxUb + s.puntos + maxCant}, obtenido ${maxReal}`);
    casos++;
    const desconocidas = vistos.filter(e => tramoDePlazo(e) === -1);
    if (desconocidas.length) fallar(`TR9 "${s.canonico}" produjo plazos que no están en el Excel: ${desconocidas.join(", ")}`);
    casos++;
    const ordenados = vistos.map(tramoDePlazo).sort((a, b) => a - b);
    if (ordenados[0] !== tramoDePlazo(etiquetaEsperada(minReal)) || ordenados[ordenados.length - 1] !== tramoDePlazo(etiquetaEsperada(maxReal))) {
      const mas = CAT_TIEMPOS[ordenados[0]], menos = CAT_TIEMPOS[ordenados[ordenados.length - 1]];
      fallar(`TR9 "${s.canonico}": el recorrido va de "${mas && mas.etiqueta}" a "${menos && menos.etiqueta}" pero los extremos del Excel son "${etiquetaEsperada(minReal)}"–"${etiquetaEsperada(maxReal)}"`);
    }
    alcance.push(`${s.canonico}: ${etiquetaEsperada(minReal)} … ${etiquetaEsperada(maxReal)}`);
  });

  const resumen = fallos.length
    ? `${fallos.length} problema(s) en ${casos} casos:\n${fallos.join("\n")}`
    : `${casos} casos correctos.\n` +
      `Matriz de plazos: ${CAT_SERVICIOS.length} servicios × ${CAT_UBICACIONES.length} ubicaciones × ${CAT_CANTIDAD.length} tramos, ` +
      `en todas las grafías del servicio, la categoría, la ubicación y el edificio.\n` +
      `Fecha límite verificada por contrato para los ${CAT_TIEMPOS.length} plazos del Excel desde ${INICIOS.length} instantes distintos.\n` +
      `Alcance por servicio:\n  ${alcance.join("\n  ")}`;
  mostrarResultado("Prueba de tiempos de respuesta", resumen);
  return fallos.length === 0;
}
