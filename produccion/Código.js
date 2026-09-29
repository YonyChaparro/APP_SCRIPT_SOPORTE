/*
  =================================================================
  --- SECCIÓN 1: CONFIGURACIÓN GLOBAL Y PUNTAJES ---
  =================================================================
  Nota: los puntajes se buscan normalizados (ver normalizarTexto), así que no
  importan mayúsculas, tildes ni puntuación.
*/

const CONFIG = {
  HOJAS: { RESPUESTAS: "Respuestas_Oficiales", PENDIENTES: "Solicitudes Pendientes", ARCHIVO: "Solicitudes_Archivadas" },
  COL: { 
    CODIGO: 1, TIMESTAMP: 2, EMAIL: 3, NOMBRE: 4, TELEFONO: 5, 
    EDIFICIO: 6, UBICACION: [7, 8, 9], CATEGORIA: 10, 
    SERVICIO: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],   // respaldo; ver ENCABEZADOS
    CANTIDAD: 23, COMENTARIOS: 24, ESTADO: 25, FECHA_NOTIF: 26, 
    RESPONSABLE: 27, COMENTARIO_RESOLUCION: 28 
  },
  PREFIJO: "FCE-SOP-",
  URL_ENCUESTA: "https://forms.gle/msZfTTzQTJ76AX8c7",
  EMAIL_ADMIN: "soportec_fcebog@unal.edu.co",
  RESPONSABLES: ["Oscar", "Belisario", "Diego"]
};

// Cómo se reconoce cada pregunta del formulario en Respuestas_Oficiales: por su encabezado,
// no por su posición. Así, añadir, quitar o mover una pregunta no desplaza los puntajes.
// CONFIG.COL solo se usa si un encabezado no aparece (y se avisa al administrador).
// Las columnas de servicio son todas las que quedan entre CATEGORIA y CANTIDAD, porque el
// formulario repite el título "Seleccione el servicio:" en varias secciones. Una pregunta
// añadida después de vincular el formulario aparece al final de la hoja: por eso, si ahí no
// hay un servicio de la categoría elegida, se busca también en las columnas no identificadas.
const ENCABEZADOS = {
  TIMESTAMP: /marca temporal|timestamp/i,
  EMAIL: /correo|e-?mail/i,
  NOMBRE: /nombres? y apellidos/i,
  TELEFONO: /^tel[eé]fono/i,
  EDIFICIO: /^seleccione el edificio/i,
  UBICACION: /ubicaci[oó]n exacta/i,        // una columna por edificio
  CATEGORIA: /^seleccione la categor/i,
  CANTIDAD: /cantidad de equipos/i,
  COMENTARIOS: /comentarios adicionales/i
};

// Puntajes de TIEMPOS DE RESPUESTA.xlsx, con las opciones escritas como en el formulario.
// Se comparan normalizados (sin tildes, puntuación ni mayúsculas; ver normalizarTexto),
// así que "SALA DE INFORMÁTICA 1" y "Sala de Informática 1" son la misma clave.
const PUNTAJES = {
  UBICACION: {
    "310": {
      "Auditorio Principal": 10, "Auditorios Auxiliares": 10, "Biblioteca": 20,
      "CADE - Oficinas Programas Curriculares": 10, "Oficina Apoyo a la Gestión": 20,
      "Oficina Área Curricular de Contabilidad y Finanzas": 10,
      "Oficina Área Curricular de Economía y Desarrollo": 10,
      "Oficina Área Curricular de Gestión y Organizaciones": 10,
      "Oficina Bienestar": 10, "Oficina de Soporte Técnico": 20, "Oficina ORI": 10,
      "Sala de Informática 1": 20, "Sala de Informática 2": 20, "Sala de Informática 3": 20,
      "Sala de Juntas": 5, "Sala de Videoconferencias": 5, "Salones 310": 10,
      "UACE - Salón 205": 20, "UIFCE": 10
    },
    "311": {
      "Archivo 311": 10, "Decanatura": 1, "Oficina de Apoyo Docente 311": 20,
      "Oficina de Calificaciones": 10, "Oficinas Docentes 311": 20, "Salones 311": 10,
      "Secretaría de Facultad": 5, "Unidad Administrativa": 5, "Vicedecanatura": 1
    },
    "238": {
      "Archivo 238": 20, "Centro Editorial": 20, "Comunicaciones": 20,
      "Oficina de Apoyo Docente 238": 20, "Oficinas Docentes 238": 10, "Sala de Informática 6": 30,
      "Salones 238": 30, "UACE - Oficina": 20, "Unidad de Emprendimiento": 20,
      "Vicedecanatura de Investigación y Extensión": 10
    }
  },
  // Clave externa: nombre de la categoría sin la descripción entre paréntesis.
  // Un mismo servicio puede valer distinto según la categoría ("Otro", "Mantenimiento Preventivo").
  SERVICIOS: {
    "Conceptos Técnicos": { "Bajas": 50, "Compras": 70, "Directrices Técnicas": 70 },
    "Impresoras": {
      "Mantenimiento Preventivo Impresora": 30, "Instalación o Conexión": 10,
      "Instalación de Toner": 10, "Falla de Red": 10, "Otros": 20
    },
    "PC y Portátiles - Mantenimiento Preventivo": { "Limpieza Interna y Externa": 25 },
    // Sin subpregunta en el formulario: el único servicio se asume. Hoy solo existen en el
    // formulario de pruebas; se incluyen para que no queden sin puntaje si se publican.
    "PC y Portátiles - Instalación y Alistamiento": { "Instalación y Alistamiento": 25 },
    "PC y Portátiles - Cambio de Ubicación": { "Movimiento de equipos entre oficinas": 20 },
    "PC y Portátiles - Revisión y Reparación": {
      "Equipo no enciende": 5, "Daño en periféricos (Teclado, Mouse, etc)": 5,
      "Equipo no inicia - pantalla negra": 5, "Equipo Lento": 10, "Software con fallas": 5,
      "Equipo sin internet - No navega": 5, "Acceso a servidor de archivos": 10,
      // Grupo "Usuario": existe en el formulario pero no en el Excel. Valores provisionales.
      "Creación de usuarios en Windows": 10, "Falla de inicio de sesión en Windows": 5
    },
    "Software - Instalación o Actualización": { "Office": 10, "VPN": 10, "Otro": 10 },
    "Telefonía": { "Teléfono sin servicio": 10, "Cambio o Reparación de cables": 10 },
    "Video - Proyectores o Pantallas": {
      "Mantenimiento Preventivo": 10, "No proyecta - Imagen con problemas": 5, "Otro": 10
    },
    "Servidor web y bases de datos": {
      "Instalación / Actualización de paquetes": 10, "Carga de archivos": 10, "Backups": 10
    }
  }
};

// Otros nombres de la misma opción (versiones anteriores del formulario, formulario de
// pruebas, lista desplegable de Pendientes). Cada alias apunta a la clave de PUNTAJES.
const ALIAS = {
  UBICACION: {
    "310": {
      "Unidad de Informática": "UIFCE",
      "Sala 1": "Sala de Informática 1", "Sala 2": "Sala de Informática 2", "Sala 3": "Sala de Informática 3",
      "Oficina Area C. de Contabililidad y F.": "Oficina Área Curricular de Contabilidad y Finanzas",
      "Oficina Area C. de Contabilidad y F.": "Oficina Área Curricular de Contabilidad y Finanzas",
      "Oficina Area C. de Economía y Des.": "Oficina Área Curricular de Economía y Desarrollo",
      "Oficina Area C. de Gestión y Org.": "Oficina Área Curricular de Gestión y Organizaciones"
    },
    "311": { "Oficinas Docentes": "Oficinas Docentes 311", "Secretaría Académica": "Secretaría de Facultad" },
    "238": {
      "Oficinas Docentes": "Oficinas Docentes 238", "Sala 6": "Sala de Informática 6",
      "Vicedecanatura de Investigación y Ext.": "Vicedecanatura de Investigación y Extensión"
    }
  },
  SERVICIO: {
    "Impresoras": { "Mantenimiento Preventivo": "Mantenimiento Preventivo Impresora", "Otro": "Otros" }
  }
};

// Respuestas del formulario que ramifican hacia otra pregunta: no son servicios.
const GRUPOS_NO_SERVICIO = ["Hardware", "Software", "Conectividad", "Internet y Conectividad", "Usuario"];

// Puntaje de una opción que no está en PUNTAJES. Antes era 0, lo que acortaba el plazo en
// silencio; ahora es un valor intermedio y se avisa por correo al administrador.
const PUNTAJE_SIN_COINCIDENCIA = 10;

// Definición de tiempos y horas para fórmulas
const TIEMPOS = [
  [10, "24 HORAS"], [20, "48 HORAS"], [30, "72 HORAS"], [40, "5 DIAS"],
  [50, "10 DIAS"], [60, "15 DIAS"], [70, "DURANTE EL SEMESTRE ACADÉMICO"], [Infinity, "NO ESTABLECIDO"]
];

const HORAS_TIEMPO = {
  "24 HORAS": 24, "48 HORAS": 48, "72 HORAS": 72, "5 DIAS": 120,
  "10 DIAS": 240, "15 DIAS": 360, "DURANTE EL SEMESTRE ACADÉMICO": 2160, "NO ESTABLECIDO": 2160
};

// "Sala de Informática 1" y "SALA DE INFORMATICA 1." -> "SALA DE INFORMATICA 1"
function normalizarTexto(texto) {
  return String(texto == null ? "" : texto)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "Impresoras (Solicitudes de ...)" -> "Impresoras"
function nombreCategoria(categoria) {
  return String(categoria == null ? "" : categoria).split("(")[0].trim();
}

// "310", "ED_310" o "Edificio 310" -> "310"
function normalizarEdificio(edificio) {
  return String(edificio == null ? "" : edificio).replace(/\D/g, "");
}

// PUNTAJES y ALIAS con claves normalizadas, construido una sola vez por ejecución.
// Cada entrada guarda los puntos y el nombre canónico.
const INDICE = (function () {
  const ubicacion = {}, servicios = {};
  for (const ed in PUNTAJES.UBICACION) {
    ubicacion[ed] = {};
    for (const nombre in PUNTAJES.UBICACION[ed]) ubicacion[ed][normalizarTexto(nombre)] = { puntos: PUNTAJES.UBICACION[ed][nombre], nombre };
    for (const alias in (ALIAS.UBICACION[ed] || {})) {
      const canonico = ALIAS.UBICACION[ed][alias];
      ubicacion[ed][normalizarTexto(alias)] = { puntos: PUNTAJES.UBICACION[ed][canonico], nombre: canonico };
    }
  }
  for (const cat in PUNTAJES.SERVICIOS) {
    const opciones = {};
    for (const s in PUNTAJES.SERVICIOS[cat]) opciones[normalizarTexto(s)] = { puntos: PUNTAJES.SERVICIOS[cat][s], nombre: s };
    for (const alias in (ALIAS.SERVICIO[cat] || {})) {
      const canonico = ALIAS.SERVICIO[cat][alias];
      opciones[normalizarTexto(alias)] = { puntos: PUNTAJES.SERVICIOS[cat][canonico], nombre: canonico };
    }
    servicios[normalizarTexto(cat)] = opciones;
  }
  return { UBICACION: ubicacion, SERVICIOS: servicios };
})();

// Opciones de la lista desplegable "Servicio" en Pendientes, en mayúsculas como las escribe
// el script: todos los servicios, sin repetir.
const LISTA_SERVICIOS = Object.keys(PUNTAJES.SERVICIOS)
  .reduce((lista, cat) => lista.concat(Object.keys(PUNTAJES.SERVICIOS[cat])), [])
  .map(s => s.toUpperCase())
  .filter((s, i, arr) => arr.indexOf(s) === i)
  .sort();

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

    const COL = detectarColumnas(hojaRespuestas);
    const fila = hojaRespuestas.getRange(ultimaFila, 1, 1, hojaRespuestas.getLastColumn()).getValues()[0];

    // --- CÁLCULOS ---
    
    // 1. Datos básicos
    const email = fila[COL.EMAIL - 1];
    const nombre = fila[COL.NOMBRE - 1];
    const comentarios = fila[COL.COMENTARIOS - 1] || "Sin comentarios";
    const edificioRaw = fila[COL.EDIFICIO - 1];
    const categoria = fila[COL.CATEGORIA - 1];
    const edificio = normalizarEdificio(edificioRaw);
    
    // 2. Ubicación: la única columna de ubicación respondida (una por edificio)
    const ubicacion = obtenerValorDeColumnas(fila, COL.UBICACION);
    
    // 3. Servicio: la respuesta de la sección de su categoría, sin los selectores de grupo
    const servicio = extraerServicio(fila, COL.SERVICIO, categoria, COL.OTRAS);

    // 4. Puntajes
    const ptsUbicacion = getPuntajeUbicacion(edificio, ubicacion);
    const ptsServicio = getPuntajeServicio(categoria, servicio);
    const cantidad = fila[COL.CANTIDAD - 1];
    const ptsCantidad = getPuntajeCantidad(cantidad);
    // Nombre del servicio para el correo y la bandeja. En categorías sin subpregunta la
    // respuesta viene vacía y se muestra el único servicio de la categoría.
    const subcategoria = (servicio || nombreServicio(categoria, servicio)).toUpperCase();
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
      
      const fechaSolicitud = new Date(fila[COL.TIMESTAMP - 1]);
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
      
      // Recalcular puntaje con la categoría original de la solicitud: "OTRO" y
      // "MANTENIMIENTO PREVENTIVO" valen distinto según la categoría.
      const ptsServicio = getPuntajeServicio(categoriaDeRadicado(filaDatos[0]), nuevoServicio);
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

// Localiza las preguntas del formulario por su encabezado (ENCABEZADOS). Si alguno no se
// reconoce se usa la posición de CONFIG.COL y se avisa: el formulario cambió y hay que revisar
// ENCABEZADOS. Las columnas propias del script (radicado, estado…) siguen en CONFIG.COL.
const _columnas = {};
function detectarColumnas(hoja) {
  const clave = hoja.getName();
  if (_columnas[clave]) return _columnas[clave];
  const col = JSON.parse(JSON.stringify(CONFIG.COL));
  const encabezados = hoja.getRange(1, 1, 1, Math.max(1, hoja.getLastColumn())).getValues()[0]
    .map(h => String(h == null ? "" : h).trim());
  const faltantes = [];
  for (const campo in ENCABEZADOS) {
    const hallazgos = encabezados.map((h, i) => ENCABEZADOS[campo].test(h) ? i + 1 : 0).filter(Boolean);
    if (!hallazgos.length) { faltantes.push(campo); continue; }
    col[campo] = Array.isArray(CONFIG.COL[campo]) ? hallazgos : hallazgos[0];
  }
  if (faltantes.indexOf("CATEGORIA") === -1 && faltantes.indexOf("CANTIDAD") === -1 && col.CANTIDAD > col.CATEGORIA + 1) {
    col.SERVICIO = [];
    for (let c = col.CATEGORIA + 1; c < col.CANTIDAD; c++) col.SERVICIO.push(c);
  } else if (faltantes.indexOf("CATEGORIA") !== -1 || faltantes.indexOf("CANTIDAD") !== -1) {
    faltantes.push("SERVICIO");
  } else {
    col.SERVICIO = [];   // ninguna categoría tiene subpregunta
  }
  // Columnas que no son de ninguna pregunta conocida ni del script: posibles subpreguntas nuevas.
  const conocidas = [].concat(...Object.keys(ENCABEZADOS).map(c => col[c]), col.SERVICIO || [],
    CONFIG.COL.CODIGO, CONFIG.COL.ESTADO, CONFIG.COL.FECHA_NOTIF, CONFIG.COL.RESPONSABLE, CONFIG.COL.COMENTARIO_RESOLUCION);
  col.OTRAS = encabezados.map((h, i) => i + 1).filter(c => conocidas.indexOf(c) === -1);
  if (faltantes.length) {
    logError("detectarColumnas", { message: `Sin encabezado reconocible en ${hoja.getName()} para ${faltantes.join(", ")}; ` +
      `se usaron las posiciones de CONFIG.COL. Revise ENCABEZADOS en Código.gs.` });
  }
  _columnas[clave] = col;
  return col;
}

// true si el valor es un selector de grupo del formulario (Hardware, Software…), no un servicio.
function esGrupo(valor) {
  const clave = normalizarTexto(valor);
  return GRUPOS_NO_SERVICIO.some(g => normalizarTexto(g) === clave);
}

// Servicio de una fila: el valor de las columnas de servicio que no es un grupo. Por la
// ramificación del formulario solo debería haber uno; si hubiera varios, gana el que
// pertenece a la categoría elegida. Si ninguno pertenece, se busca en `otrasColumnas`
// (preguntas añadidas al final de la hoja) un valor que sí pertenezca.
function extraerServicio(fila, columnasServicio, categoria, otrasColumnas) {
  const valores = cols => (cols || [])
    .map(c => String(fila[c - 1] == null ? "" : fila[c - 1]).trim())
    .filter(v => v !== "" && !esGrupo(v));
  const deLaCategoria = v => INDICE.SERVICIOS[normalizarTexto(nombreCategoria(categoria))] &&
    INDICE.SERVICIOS[normalizarTexto(nombreCategoria(categoria))][normalizarTexto(v)];
  const candidatos = valores(columnasServicio);
  return candidatos.find(deLaCategoria) || valores(otrasColumnas).find(deLaCategoria) || candidatos[0] || "";
}

// Devuelve { puntos, nombre, encontrado }.
// - Dentro de la categoría elegida (con sus alias).
// - Respuesta vacía en una categoría de un solo servicio (sin subpregunta): ese servicio.
// - Si no está en su categoría (p. ej. cambio manual en Pendientes o categoría ausente), se
//   acepta cuando el nombre existe en otras categorías con un único puntaje.
function buscarServicio(categoria, servicio) {
  const clave = normalizarTexto(servicio);
  const cat = INDICE.SERVICIOS[normalizarTexto(nombreCategoria(categoria))];
  if (cat) {
    const opciones = Object.keys(cat);
    if (!clave && opciones.length === 1) return Object.assign({ encontrado: true }, cat[opciones[0]]);
    if (cat[clave]) return Object.assign({ encontrado: true }, cat[clave]);
  }
  const hallazgos = Object.keys(INDICE.SERVICIOS).map(k => INDICE.SERVICIOS[k][clave]).filter(Boolean);
  if (clave && hallazgos.length && hallazgos.every(h => h.puntos === hallazgos[0].puntos)) {
    return Object.assign({ encontrado: true }, hallazgos[0]);
  }
  return { puntos: null, nombre: String(servicio || ""), encontrado: false };
}

function nombreServicio(categoria, servicio) {
  return buscarServicio(categoria, servicio).nombre;
}

function getPuntajeUbicacion(edificio, ubicacion) {
  const ed = normalizarEdificio(edificio);
  const clave = normalizarTexto(ubicacion);
  const hit = (INDICE.UBICACION[ed] || {})[clave];
  if (hit) return hit.puntos;
  // Edificio vacío o equivocado: se acepta si la ubicación existe en un único edificio.
  const otros = Object.keys(INDICE.UBICACION).filter(e => INDICE.UBICACION[e][clave]);
  if (clave && otros.length === 1) return INDICE.UBICACION[otros[0]][clave].puntos;
  avisarSinCoincidencia(`ubicación "${ubicacion}" no reconocida en el edificio "${edificio}"`);
  return PUNTAJE_SIN_COINCIDENCIA;
}

function getPuntajeServicio(categoria, servicio) {
  const r = buscarServicio(categoria, servicio);
  if (r.encontrado) return r.puntos;
  avisarSinCoincidencia(`servicio "${servicio}" no reconocido en la categoría "${nombreCategoria(categoria)}"`);
  return PUNTAJE_SIN_COINCIDENCIA;
}

// Una opción sin puntaje significa que el formulario y PUNTAJES dejaron de coincidir: se avisa.
function avisarSinCoincidencia(detalle) {
  logError(`Puntaje no encontrado (se usó ${PUNTAJE_SIN_COINCIDENCIA})`, { message: `${detalle}. Actualice PUNTAJES en Código.gs.` });
}

// La bandeja de Pendientes no guarda la categoría; se toma de Respuestas por el radicado.
function categoriaDeRadicado(codigo) {
  const hoja = getHoja(CONFIG.HOJAS.RESPUESTAS);
  if (!hoja) return "";
  const COL = detectarColumnas(hoja);
  const fila = hoja.getDataRange().getValues().find(row => row[CONFIG.COL.CODIGO - 1] === codigo);
  return fila ? fila[COL.CATEGORIA - 1] : "";
}

// Puntaje por cantidad (pestaña CANTIDAD DE EQUIPOS del Excel). Toma el primer número del
// texto: "aprox. 20 equipos" -> 20 (parseInt daba NaN y lo contaba como 1 equipo).
function getPuntajeCantidad(cantidadIngresada) {
  const m = String(cantidadIngresada == null ? "" : cantidadIngresada).match(/-?\d+/);
  const num = m ? parseInt(m[0], 10) : 0;
  if (num <= 3) return 1;
  if (num <= 14) return 10;
  if (num <= 30) return 20;
  return 35;
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