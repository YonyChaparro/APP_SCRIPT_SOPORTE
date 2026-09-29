/*
  =================================================================
  --- SECCIÓN 1: CONFIGURACIÓN GLOBAL Y PUNTAJES ---
  =================================================================
  Nota: Las claves están en MAYÚSCULAS para coincidir con la 
  transformación .toUpperCase() que hace el script al leer los datos.
*/

const CONFIG = {
  HOJAS: { RESPUESTAS: "Respuestas_Oficiales", PENDIENTES: "Solicitudes Pendientes", ARCHIVO: "Solicitudes_Archivadas" },
  COL: { 
    CODIGO: 1, TIMESTAMP: 2, EMAIL: 3, NOMBRE: 4, TELEFONO: 5, 
    EDIFICIO: 6, UBICACION: [7, 8, 9], CATEGORIA: 10, 
    SUBCAT1: [11, 12, 13, 14, 19, 20, 21, 22], SUBCAT2: [15, 16, 17, 18], 
    CANTIDAD: 23, COMENTARIOS: 24, ESTADO: 25, FECHA_NOTIF: 26, 
    RESPONSABLE: 27, COMENTARIO_RESOLUCION: 28 
  },
  PREFIJO: "FCE-SOP-",
  URL_ENCUESTA: "https://forms.gle/msZfTTzQTJ76AX8c7",
  EMAIL_ADMIN: "soportec_fcebog@unal.edu.co",
  RESPONSABLES: ["Oscar", "Belisario", "Diego"]
};

const PUNTAJES = {
  UBICACION: {
    "311": {
      "ARCHIVO 311": 10, "DECANATURA": 1, "OFICINA DE APOYO DOCENTE 311": 20,
      "OFICINA DE CALIFICACIONES": 10, "OFICINAS DOCENTES": 20, "SALONES 311": 10,
      "SECRETARÍA ACADÉMICA": 5, "UNIDAD ADMINISTRATIVA": 5, "VICEDECANATURA": 1
    },
    "310": {
      "AUDITORIO PRINCIPAL": 10, "AUDITORIOS AUXILIARES": 10, "BIBLIOTECA": 20,
      "CADE - OFICINAS PROGRAMAS CURRICULARES": 10, "OFICINA APOYO A LA GESTIÓN": 20,
      "OFICINA AREA C. DE CONTABILILIDAD Y F.": 10, "OFICINA AREA C. DE ECONOMÍA Y DES.": 10,
      "OFICINA AREA C. DE GESTIÓN Y ORG.": 10, "OFICINA BIENESTAR": 10,
      "OFICINA DE SOPORTE TÉCNICO": 20, "OFICINA ORI": 10, "SALA 1": 20,
      "SALA 2": 20, "SALA 3": 20, "SALA DE JUNTAS": 5, "SALA DE VIDEOCONFERENCIAS": 5,
      "SALONES 310": 10, "UACE - SALÓN 205": 20, "UNIDAD DE INFORMÁTICA": 10
    },
    "238": {
      "ARCHIVO 238": 20, "CENTRO EDITORIAL": 20, "COMUNICACIONES": 20, 
      "OFICINA DE APOYO DOCENTE 238": 20, "OFICINAS DOCENTES": 10, "SALA 6": 30, 
      "SALONES 238": 30, "UACE - OFICINA": 20, "UNIDAD DE EMPRENDIMIENTO": 20, 
      "VICEDECANATURA DE INVESTIGACIÓN Y EXT.": 10
    }
  },
  SERVICIOS: {
    "BAJAS": 50, "COMPRAS": 70, "DIRECTRICES TÉCNICAS": 70,
    "INSTALACIÓN O CONEXIÓN": 10, "INSTALACIÓN DE TONER": 10, "FALLA DE RED": 10,
    "INSTALACIÓN Y ALISTAMIENTO": 25, "MOVIMIENTO DE EQUIPOS ENTRE OFICINAS": 20,
    "LIMPIEZA INTERNA Y EXTERNA": 25, "EQUIPO NO ENCIENDE": 5,
    "DAÑO EN PERIFERICOS (TECLADO, MOUSE, ETC.)": 5, "EQUIPO NO INICIA, PANTALLA NEGRA": 5,
    "EQUIPO LENTO": 10, "SOFTWARE CON FALLAS": 5, "EQUIPO SIN INTERNET, NO NAVEGA": 5,
    "ACCESO A SERVIDOR DE ARCHIVOS": 10, "OFFICE": 10, "VPN": 10,
    "TELEFONO SIN SERVICIO": 10, "CAMBIO O REPARACIÓN DE CABLES": 10,
    "NO PROYECTA, IMAGEN CON PROBLEMAS": 5,
    "INSTALACION / ACTUALIZACION DE PAQUETES": 10, "CARGA DE ARCHIVOS": 10, "BACKUPS": 10
  }
};

// Definición de tiempos y horas para fórmulas
const TIEMPOS = [
  [10, "24 HORAS"], [20, "48 HORAS"], [30, "72 HORAS"], [40, "5 DIAS"],
  [50, "10 DIAS"], [60, "15 DIAS"], [70, "DURANTE EL SEMESTRE ACADÉMICO"], [Infinity, "NO ESTABLECIDO"]
];

const HORAS_TIEMPO = {
  "24 HORAS": 24, "48 HORAS": 48, "72 HORAS": 72, "5 DIAS": 120,
  "10 DIAS": 240, "15 DIAS": 360, "DURANTE EL SEMESTRE ACADÉMICO": 2160, "NO ESTABLECIDO": 2160
};

const LISTA_SERVICIOS = Object.keys(PUNTAJES.SERVICIOS);

/*
  =================================================================
  --- SECCIÓN 2: ACTIVADORES PRINCIPALES (TRIGGERS) ---
  =================================================================
*/

function onFormSubmit(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) return;
    
    const hojaRespuestas = getHoja(CONFIG.HOJAS.RESPUESTAS);
    if (!hojaRespuestas) throw new Error(`Hoja de Respuestas no encontrada.`);
    
    const ultimaFila = hojaRespuestas.getLastRow();
    const propiedades = PropertiesService.getScriptProperties();
    const ultimoProcesado = propiedades.getProperty('ultimaFilaProcesada');
    
    if (ultimoProcesado && parseInt(ultimoProcesado) === ultimaFila) { 
      lock.releaseLock(); 
      return; 
    }

    const fila = hojaRespuestas.getRange(ultimaFila, 1, 1, CONFIG.COL.COMENTARIOS).getValues()[0];
    const valores = fila; // Array completo de valores

    // --- CÁLCULOS ---
    
    // 1. Datos básicos
    const email = fila[CONFIG.COL.EMAIL - 1];
    const nombre = fila[CONFIG.COL.NOMBRE - 1];
    const comentarios = fila[CONFIG.COL.COMENTARIOS - 1] || "Sin comentarios";
    const edificioRaw = valores[CONFIG.COL.EDIFICIO - 1];
    const categoria = valores[CONFIG.COL.CATEGORIA - 1];
    
    // 2. Ubicación (Manejo de ED_ y Mayúsculas)
    let edificio = (edificioRaw || "").toString().trim().toUpperCase();
    if (edificio.startsWith("ED_")) edificio = edificio.substring(3); // Quita prefijo
    
    const ubicacion = obtenerValorDeColumnas(valores, CONFIG.COL.UBICACION);
    
    // 3. Servicio
    let subcategoria = obtenerValorDeColumnas(valores, CONFIG.COL.SUBCAT1);
    if (!subcategoria) subcategoria = obtenerValorDeColumnas(valores, CONFIG.COL.SUBCAT2);

    // 4. Puntajes
    const ptsUbicacion = getPuntajeUbicacion(edificio, ubicacion);
    const ptsServicio = getPuntajeServicio(categoria, subcategoria);
    const cantidad = valores[CONFIG.COL.CANTIDAD - 1];
    const ptsCantidad = getPuntajeCantidad(cantidad);
    const correo_soporte = "soportec_fcebog@unal.edu.co";

    const puntajeTotal = ptsUbicacion + ptsServicio + ptsCantidad;
    const tiempo = calcularTiempo(puntajeTotal);
    const horasTotales = HORAS_TIEMPO[tiempo] || 2160;
    

    // --- ACCIONES EN HOJA ---
    
    const codigo = CONFIG.PREFIJO + String(ultimaFila + 575).padStart(3, "0");
    hojaRespuestas.getRange(ultimaFila, CONFIG.COL.CODIGO).setValue(codigo);
    hojaRespuestas.getRange(ultimaFila, CONFIG.COL.ESTADO).setValue("Pendiente");

    // --- ENVÍO DE CORREO DE CONFIRMACIÓN ---
    if (validarEmail(email)) {
      const asunto = "Registro número " + codigo;
      // Nota: Usamos la ubicación raw para que se vea bonita en el correo, o la procesada
      const email_html = templateConfirmacion(nombre, codigo, ubicacion, categoria, subcategoria, tiempo, comentarios);
      try { 
        MailApp.sendEmail({to: email + ',' + correo_soporte, subject: asunto, htmlBody: email_html, name: "Soporte Técnico - FCE"}); 
      } catch (emailError) { 
        Logger.log("ERROR enviando correo: " + emailError.message); 
      }
    }

    // --- INSERTAR EN PENDIENTES ---
    try {
      const hojaPendientes = getHoja(CONFIG.HOJAS.PENDIENTES);
      if (!hojaPendientes) throw new Error(`Hoja de Pendientes no encontrada.`);
      
      const fechaSolicitud = new Date(fila[CONFIG.COL.TIMESTAMP - 1]);
      const cantidadStr = String(cantidad);
      const newRow = hojaPendientes.getLastRow() + 1;
      
      // Fórmula dinámica para tiempo restante (Columna 12)
      const formulaTiempoRestante = `=${horasTotales} - (NOW() - I${newRow}) * 24`;
      
      const datosAceptados = [[codigo, nombre, edificioRaw, ubicacion, subcategoria, cantidadStr, comentarios, tiempo, fechaSolicitud, "", "", formulaTiempoRestante]];
      
      if (hojaPendientes.getLastRow() < 1) {
        const encabezados = [["RADICADO", "NOMBRE", "EDIFICIO", "UBICACIÓN", "SERVICIO", "CANTIDAD", "COMENTARIOS", "TIEMPO MÁXIMO", "FECHA SOLICITUD", "RESUELTO POR", "OBSERVACIONES", "TIEMPO RESTANTE (HRS)"]];
        hojaPendientes.getRange(1, 1, 1, 12).setValues(encabezados);
      }
      
      hojaPendientes.getRange(newRow, 1, 1, 12).setValues(datosAceptados);
      hojaPendientes.getRange(newRow, 9).setNumberFormat("dd/mm/yyyy hh:mm:ss");
      hojaPendientes.getRange(newRow, 12).setNumberFormat("0.00");
      
      actualizarListasDesplegables(hojaPendientes);
      ordenarPendientesPorPrioridad();

    } catch (errPendientes) { 
      logError("Procesando Hoja de Pendientes", errPendientes); 
    }

    propiedades.setProperty('ultimaFilaProcesada', ultimaFila.toString());
  } catch (err) { 
    logError("onFormSubmit (error principal)", err); 
  } finally { 
    lock.releaseLock(); 
  }
}

function onEditTrigger(e) {
  try {
    if (!e || !e.range) return;

    const h = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rango = e.range;
    const nombreHoja = h.getName();
    const fila = rango.getRow();
    const col = rango.getColumn();

    // CASO 1: CIERRE DE TICKET (Columna 10)
    if (nombreHoja === CONFIG.HOJAS.PENDIENTES && col === 10 && fila > 1) {
      const responsable = rango.getValue();
      if (!responsable) return;

      const ui = SpreadsheetApp.getUi();
      const respuesta = ui.alert("Confirmación", `¿Marcar solicitud como resuelta por ${responsable}?`, ui.ButtonSet.YES_NO);
      if (respuesta !== ui.Button.YES) {
        rango.clearContent();
        return;
      }
      
      const comentarioResolucion = h.getRange(fila, 11).getValue() || "Sin comentarios.";
      const codigo = h.getRange(fila, 1).getValue();
      
      procesarResolucion(codigo, responsable, comentarioResolucion);
      
      h.deleteRow(fila);
      ordenarPendientesPorPrioridad();
    }

    // CASO 2: CAMBIO DE SERVICIO (Columna 5)
    if (nombreHoja === CONFIG.HOJAS.PENDIENTES && col === 5 && fila > 1) {
      const nuevoServicio = rango.getValue();
      // Obtener datos necesarios para recalcular
      const filaDatos = h.getRange(fila, 1, 1, 8).getValues()[0];
      const ubicacion = filaDatos[3]; // Col 4
      const cantidadStr = String(filaDatos[5]); // Col 6
      
      // Recalcular puntaje
      // Nota: Aquí asumimos que la categoría no cambia, solo la subcategoría (servicio).
      // Usamos getPuntajeServicio con la nueva subcategoría.
      const ptsServicio = PUNTAJES.SERVICIOS[nuevoServicio.toUpperCase()] || 10;
      const ptsUbicacion = getPuntajeUbicacion(filaDatos[2], ubicacion); // Edificio está en col 3
      const ptsCantidad = getPuntajeCantidad(cantidadStr);
      const puntajeTotal = ptsUbicacion + ptsServicio + ptsCantidad;
      
      let nuevoTiempo = calcularTiempo(puntajeTotal);
      
      h.getRange(fila, 8).setValue(nuevoTiempo);
      
      // Actualizar fórmula
      const nuevasHorasTotales = HORAS_TIEMPO[nuevoTiempo] || 2160;
      const nuevaFormula = `=${nuevasHorasTotales} - (NOW() - I${fila}) * 24`;
      h.getRange(fila, 12).setValue(nuevaFormula);
      
      ordenarPendientesPorPrioridad();
    }
  } catch (err) {
    logError("onEditTrigger", err);
  }
}

/*
  =================================================================
  --- SECCIÓN 3: LÓGICA DE PROCESAMIENTO ---
  =================================================================
*/

function procesarResolucion(codigo, responsable, comentarioResolucion) {
  try {
    const hojaRespuestas = getHoja(CONFIG.HOJAS.RESPUESTAS);
    if (!hojaRespuestas) return;

    const datos = hojaRespuestas.getDataRange().getValues();
    const filaIndex = datos.findIndex(row => row[CONFIG.COL.CODIGO - 1] === codigo);

    if (filaIndex === -1) return;

    const filaActual = filaIndex + 1;
    const emailDestino = datos[filaIndex][CONFIG.COL.EMAIL - 1];

    hojaRespuestas.getRange(filaActual, CONFIG.COL.ESTADO).setValue("Resuelta");
    hojaRespuestas.getRange(filaActual, CONFIG.COL.RESPONSABLE).setValue(responsable);
    hojaRespuestas.getRange(filaActual, CONFIG.COL.COMENTARIO_RESOLUCION).setValue(comentarioResolucion);
    SpreadsheetApp.flush(); 

    if (validarEmail(emailDestino)) {
      try {
        const asunto = `Caso resuelto - Soporte ${codigo}`;
        const cuerpoHtml = templateResolucion(codigo, comentarioResolucion);
        MailApp.sendEmail(emailDestino, asunto, "Su solicitud ha sido resuelta.", { htmlBody: cuerpoHtml });
        
        hojaRespuestas.getRange(filaActual, CONFIG.COL.ESTADO).setValue("Notificada");
        hojaRespuestas.getRange(filaActual, CONFIG.COL.FECHA_NOTIF).setValue(new Date());
        SpreadsheetApp.flush();
      } catch (errorEnvio) {
        logError(`Falla en MailApp para ${codigo}`, errorEnvio);
      }
    }
  } catch (err) {
    logError("procesarResolucion", err);
  }
}

/*
  =================================================================
  --- SECCIÓN 4: FUNCIONES AUXILIARES DE CÁLCULO ---
  =================================================================
*/

function obtenerValorDeColumnas(fila, indicesColumnas) {
  for (let i = 0; i < indicesColumnas.length; i++) {
    let valor = fila[indicesColumnas[i] - 1]; 
    if (valor && valor.toString().trim() !== "") {
      return valor.toString().trim().toUpperCase();
    }
  }
  return "";
}

function getPuntajeUbicacion(edificio, ubicacion) {
  let ed = (edificio || "").toString().trim().toUpperCase();
  let ub = (ubicacion || "").toString().trim().toUpperCase();
  
  if (PUNTAJES.UBICACION[ed] && PUNTAJES.UBICACION[ed][ub] !== undefined) {
    return PUNTAJES.UBICACION[ed][ub];
  }
  return 0;
}

function getPuntajeServicio(categoria, subcategoria) {
  let cat = (categoria || "").toString().trim().toUpperCase();
  let sub = (subcategoria || "").toString().trim().toUpperCase();

  if (sub === "MANTENIMIENTO PREVENTIVO") {
    if (cat.includes("IMPRESORAS")) return 30;
    if (cat.includes("VIDEO")) return 10;
    return 10; // Default para PC
  }
  
  if (sub === "OTRO") {
    if (cat.includes("IMPRESORAS")) return 20;
    if (cat.includes("SOFTWARE")) return 10;
    if (cat.includes("VIDEO")) return 10;
    return 10;
  }

  return PUNTAJES.SERVICIOS[sub] || PUNTAJES.SERVICIOS[cat] || 0;
}

function getPuntajeCantidad(cantidadIngresada) {
  let num = parseInt(cantidadIngresada, 10);
  if (isNaN(num) || num <= 0) return 1; 
  if (num >= 1 && num <= 3) return 1;
  if (num >= 4 && num <= 14) return 10;
  if (num >= 15 && num <= 30) return 20;
  if (num > 30) return 35;
  return 1;
}

function calcularTiempo(puntajeTotal) {
  if (puntajeTotal <= 10) return "24 HORAS";
  if (puntajeTotal <= 20) return "48 HORAS";
  if (puntajeTotal <= 30) return "72 HORAS";
  if (puntajeTotal <= 40) return "5 DIAS";
  if (puntajeTotal <= 50) return "10 DIAS";
  if (puntajeTotal <= 60) return "15 DIAS";
  if (puntajeTotal <= 70) return "DURANTE EL SEMESTRE ACADÉMICO";
  return "NO ESTABLECIDO";
}

/*
  =================================================================
  --- SECCIÓN 5: FUNCIONES PROGRAMADAS (CRON JOBS) ---
  =================================================================
*/

function verificarSolicitudesVencidas() { 
  try { 
    const h = getHoja(CONFIG.HOJAS.PENDIENTES); 
    if (!h || h.getLastRow() <= 1) return; 
    const datos = h.getDataRange().getValues(); 
    const vencidas = []; 
    for (let i = 1; i < datos.length; i++) { 
      if (!datos[i] || datos[i].length < 12) continue; 
      const [codigo, nombre, , ubicacion, , , , tiempoMax, , , , tiempoRestante] = datos[i]; 
      if (!codigo) continue; 
      
      const horasL = HORAS_TIEMPO[tiempoMax] || 240;
      const horasT = horasL - tiempoRestante;
      const pct = Math.round((horasT / horasL) * 100); 

      if (tiempoRestante <= (horasL * 0.2)) { 
        vencidas.push({ codigo, nombre, ubicacion, tiempoMax, horasT: Math.round(horasT), horasL, pct }); 
      } 
    } 
    if (vencidas.length > 0) { 
      alertaVencidas(vencidas); 
    } 
  } catch (err) { 
    logError("verificarSolicitudesVencidas", err); 
  } 
}

function generarReporteSemanal() { 
  try { 
    const h = getHoja(CONFIG.HOJAS.RESPUESTAS); 
    const datos = h.getDataRange().getValues(); 
    const hace7 = new Date(Date.now() - 604800000); 
    let total = 0, resueltas = 0, pendientes = 0; 
    for (let i = 1; i < datos.length; i++) { 
      if (new Date(datos[i][CONFIG.COL.TIMESTAMP - 1]) < hace7) continue; 
      total++; 
      const estado = datos[i][CONFIG.COL.ESTADO - 1]; 
      if (estado === "Resuelta" || estado === "Notificada") resueltas++; 
      else if (estado === "Pendiente") pendientes++; 
    } 
    const tasa = total > 0 ? Math.round((resueltas / total) * 100) : 0; 
    enviarReporte({ total, resueltas, pendientes, tasa }); 
  } catch (err) { 
    logError("generarReporteSemanal", err); 
  } 
}

/*
  =================================================================
  --- SECCIÓN 6: PLANTILLAS DE CORREO (HTML) ---
  =================================================================
*/

function templateConfirmacion(nombre, codigo, ubicacion, categoria, subcategoria, tiempo, comentarios) { 
  return `<div style="font-family:Arial;font-size:14px;color:#333;">
    <p>Estimado/a <strong>${nombre}</strong>,</p>
    <p>Su solicitud ha sido creada exitosamente con código: <span style="font-size:18px;color:#d9534f;"><strong>${codigo}</strong></span></p>
    <p><strong>Detalles:</strong></p>
    <ul>
      <li><strong>Ubicación:</strong> ${ubicacion}</li>
      <li><strong>Servicio:</strong> ${subcategoria || categoria}</li>
      <li><strong>Tiempo estimado de respuesta:</strong> ${tiempo}</li>
    </ul>
    <p>Atentamente,<br></p>

    <p>
      <strong>Soporte Técnico - Unidad de Informática</strong><br>
      Facultad de Ciencias Económicas<br>
      Universidad Nacional de Colombia – Sede Bogotá
    </p>
    <p style="font-size: 12px; color: #777;">
      Por favor, no responda a este mensaje. Ha sido generado automáticamente por el sistema de atención de solicitudes.
    </p>
  </div>`; 
}

function templateResolucion(codigo, comentario) { 
  return `<div style="font-family:Arial;font-size:14px;color:#333;">
    <p>Su solicitud <strong>${codigo}</strong> ha sido resuelta.</p>
    <p><strong>Observaciones:</strong><br>${comentario}</p>
    <p>Califique nuestro servicio aquí: <a href="${CONFIG.URL_ENCUESTA}">${CONFIG.URL_ENCUESTA}</a></p>
    <p><strong>Unidad de Informática - FCE</strong></p>
  </div>`; 
}

function alertaVencidas(sols) { 
  let rows = ''; 
  sols.forEach(s => { 
    rows += `<tr><td style="padding:8px;">${s.codigo}</td><td style="padding:8px;">${s.nombre}</td><td style="padding:8px;">${s.ubicacion}</td><td style="padding:8px;">${s.pct}%</td></tr>`; 
  }); 
  const html = `<div style="font-family:Arial;"><h2 style="color:#d9534f;">ALERTA: Solicitudes Próximas a Vencer</h2><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:10px;">Código</th><th style="padding:10px;">Usuario</th><th style="padding:10px;">Ubicación</th><th style="padding:10px;">% Completado</th></tr></thead><tbody>${rows}</tbody></table></div>`; 
  MailApp.sendEmail(CONFIG.EMAIL_ADMIN, `ALERTA: Solicitudes próximas a vencer`, "", {htmlBody: html}); 
}

function enviarReporte(m) { 
  const html = `<div style="font-family:Arial;"><h2>Reporte Semanal</h2><p><strong>Total:</strong> ${m.total}</p><p><strong>Resueltas:</strong> ${m.resueltas}</p><p><strong>Pendientes:</strong> ${m.pendientes}</p><p><strong>Tasa:</strong> ${m.tasa}%</p></div>`; 
  MailApp.sendEmail(CONFIG.EMAIL_ADMIN, "Reporte Semanal", "", {htmlBody: html}); 
}

/*
  =================================================================
  --- SECCIÓN 7: UTILIDADES Y CONFIGURACIÓN ---
  =================================================================
*/

function ordenarPendientesPorPrioridad() { 
  try { 
    const hoja = getHoja(CONFIG.HOJAS.PENDIENTES); 
    if (!hoja || hoja.getLastRow() <= 1) return; 
    const rango = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()); 
    rango.sort({column: 12, ascending: true}); // Ordena por Tiempo Restante
  } catch(err) { 
    logError("ordenarPendientesPorPrioridad", err); 
  } 
}

function actualizarListasDesplegables(hoja) { 
  try { 
    const ultimaFila = hoja.getLastRow(); 
    if (ultimaFila <= 1) return; 
    
    const rangoResponsables = hoja.getRange(2, 10, ultimaFila - 1, 1); 
    const reglaResponsables = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.RESPONSABLES, true).build(); 
    rangoResponsables.setDataValidation(reglaResponsables); 

    const rangoServicios = hoja.getRange(2, 5, ultimaFila - 1, 1);
    const reglaServicios = SpreadsheetApp.newDataValidation().requireValueInList(LISTA_SERVICIOS, true).build();
    rangoServicios.setDataValidation(reglaServicios);
  } catch (err) { 
    logError("actualizarListasDesplegables", err); 
  } 
}

function logError(fn, err) { 
  const mensaje = err ? err.message : "Error desconocido"; 
  Logger.log(`ERROR en ${fn}: ${mensaje}`); 
  try { 
    MailApp.sendEmail({ to: CONFIG.EMAIL_ADMIN, subject: `ERROR Script Soporte - ${fn}`, htmlBody: `<p>${mensaje}</p>` }); 
  } catch (e) { } 
}

function getHoja(nombre) { 
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre); 
}

function validarEmail(email) { 
  return email && email.includes('@'); 
}

function configurarTriggers() { 
  try { 
    const triggersExistentes = ScriptApp.getProjectTriggers(); 
    triggersExistentes.forEach(t => ScriptApp.deleteTrigger(t)); 
    
    ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create(); 
    ScriptApp.newTrigger('onEditTrigger').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create(); 
    
    ScriptApp.newTrigger('verificarSolicitudesVencidas').timeBased().atHour(8).everyDays(1).create(); 
    ScriptApp.newTrigger('generarReporteSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create(); 
    
    MailApp.sendEmail(CONFIG.EMAIL_ADMIN, "Triggers Configurados", "El sistema está listo."); 
  } catch (err) { 
    logError("configurarTriggers", err); 
  } 
}