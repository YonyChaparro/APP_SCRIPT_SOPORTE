/*
  =================================================================
  --- SECCIÓN 1: CONFIGURACIÓN GLOBAL Y PUNTAJES ---
  =================================================================
  Fuentes:
  - PUNTAJES (valores): "TIEMPOS DE RESPUESTA.xlsx", pestañas LISTA DE
    UBICACIONES, ÁRBOL DE SERVICIOS, CANTIDAD DE EQUIPOS y TIEMPOS DE RESPUESTA.
  - Nombres de ubicaciones, categorías y servicios: TAL CUAL aparecen en el
    formulario de producción ("Solicitudes Soporte Técnico"), que es lo que
    llega a la hoja. La comparación ignora mayúsculas, tildes y puntuación
    (ver normalizarTexto), pero no adivina abreviaturas ni sinónimos.
  Tras editar el formulario o el Excel, ejecutar "Auditar formulario" y
  "Probar cálculo de plazos" en el menú Soporte.
*/

const CONFIG = {
  HOJAS: {
    RESPUESTAS: "Respuestas_Oficiales", PENDIENTES: "Solicitudes Pendientes", ARCHIVO: "Solicitudes_Archivadas",
    AUDITORIA: "Auditoría_Formulario", FESTIVOS: "Festivos", BITACORA: "Bitácora_Ventana"
  },
  // Ventana de atención (specs 00 y 02): abre a las 8:00 de todo día hábil precedido de uno no hábil,
  // cierra a las 15:30 de todo día hábil seguido de uno no hábil. Ver Calendario.gs y Ventana.gs.
  VENTANA: {
    FORMULARIO: "1druQ9zqkqnISd6STqOU4DrThXb1Ev9_m4f19GrlLst8",   // pruebas; producción: 1gs6GlaxJqFyJSH1dCgc9gZPax-c4iRuEsZoxHKRk0-M
    APERTURA: { h: 8, m: 0 },
    CIERRE: { h: 15, m: 30 },
    HORA_PROGRAMADOR: 6,
    EXTENSION_EMERGENCIA: ""            // vacío: se omite la frase del mensaje de cierre
  },
  // Posiciones de RESPALDO. En ejecución cada columna se localiza por su encabezado
  // (ver detectarColumnas y ENCABEZADOS); estas posiciones solo se usan si el encabezado
  // no se reconoce. Así el script sobrevive a preguntas añadidas, quitadas o movidas.
  COL: { 
    CODIGO: 1, TIMESTAMP: 2, EMAIL: 3, NOMBRE: 4, TELEFONO: 5, 
    EDIFICIO: 6, UBICACION: [7, 8, 9], CATEGORIA: 10, 
    SERVICIO: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    CANTIDAD: 23, COMENTARIOS: 24, ESTADO: 25, FECHA_NOTIF: 26, 
    RESPONSABLE: 27, COMENTARIO_RESOLUCION: 28 
  },
  // Cómo reconocer cada columna por su encabezado (título de la pregunta o etiqueta del script).
  // Las columnas de servicio son todas las que quedan entre CATEGORIA y CANTIDAD.
  ENCABEZADOS: {
    TIMESTAMP: /marca temporal|timestamp/i,
    EMAIL: /correo|e-?mail/i,
    NOMBRE: /nombres? y apellidos/i,
    TELEFONO: /tel[eé]fono/i,
    EDIFICIO: /^seleccione el edificio/i,
    UBICACION: /ubicaci[oó]n exacta/i,
    CATEGORIA: /^seleccione la categor/i,
    CANTIDAD: /cantidad de equipos/i,
    COMENTARIOS: /comentarios adicionales/i,
    CODIGO: /^radicado$/i,
    ESTADO: /^estado$/i,
    FECHA_NOTIF: /^fecha (de )?notificaci/i,
    RESPONSABLE: /^resuelto por$/i,
    COMENTARIO_RESOLUCION: /^comentario (de )?resoluci/i
  },
  // Etiquetas que el script escribe en los encabezados de sus propias columnas cuando
  // están vacíos o genéricos ("Columna 25"), para poder reconocerlas en adelante.
  ETIQUETAS_SCRIPT: {
    CODIGO: "RADICADO", ESTADO: "ESTADO", FECHA_NOTIF: "FECHA NOTIFICACIÓN",
    RESPONSABLE: "RESUELTO POR", COMENTARIO_RESOLUCION: "COMENTARIO RESOLUCIÓN"
  },
  // Bandeja "Solicitudes Pendientes": posiciones de respaldo, reconocimiento por encabezado y
  // etiquetas con que el script crea las columnas que falten (spec 01, REL-04).
  COL_PENDIENTES: {
    CODIGO: 1, NOMBRE: 2, EDIFICIO: 3, UBICACION: 4, SERVICIO: 5, CANTIDAD: 6, COMENTARIOS: 7,
    TIEMPO: 8, FECHA_SOLICITUD: 9, RESPONSABLE: 10, OBSERVACIONES: 11, HORAS_RESTANTES: 12,
    INICIO_RELOJ: 13, FECHA_LIMITE: 14
  },
  ENCABEZADOS_PENDIENTES: {
    CODIGO: /^radicado$/i, NOMBRE: /^nombre/i, EDIFICIO: /^edificio$/i, UBICACION: /^ubicaci/i,
    SERVICIO: /^servicio$/i, CANTIDAD: /^cantidad/i, COMENTARIOS: /^comentarios/i,
    TIEMPO: /^tiempo (m[aá]ximo|de respuesta)/i, FECHA_SOLICITUD: /^fecha solicitud/i,
    RESPONSABLE: /^resuelto por/i, OBSERVACIONES: /^(observaciones|comentario de resoluci)/i,
    HORAS_RESTANTES: /^(horas h[aá]biles restantes|tiempo restante)/i,
    INICIO_RELOJ: /^inicio reloj/i, FECHA_LIMITE: /^fecha l[ií]mite/i
  },
  ETIQUETAS_PENDIENTES: {
    CODIGO: "RADICADO", NOMBRE: "NOMBRE", EDIFICIO: "EDIFICIO", UBICACION: "UBICACIÓN", SERVICIO: "SERVICIO",
    CANTIDAD: "CANTIDAD", COMENTARIOS: "COMENTARIOS", TIEMPO: "TIEMPO MÁXIMO", FECHA_SOLICITUD: "FECHA SOLICITUD",
    RESPONSABLE: "RESUELTO POR", OBSERVACIONES: "OBSERVACIONES", HORAS_RESTANTES: "HORAS HÁBILES RESTANTES",
    INICIO_RELOJ: "INICIO RELOJ", FECHA_LIMITE: "FECHA LÍMITE"
  },
  PREFIJO: "FCE-SOP-",
  URL_ENCUESTA: "https://forms.gle/msZfTTzQTJ76AX8c7",
  EMAIL_ADMIN: "soporte@fce.unal.edu.co",
  RESPONSABLES: ["Oscar", "Belisario", "Diego"],
  FORMULARIOS: {
    PRODUCCION: "1gs6GlaxJqFyJSH1dCgc9gZPax-c4iRuEsZoxHKRk0-M",
    PRUEBAS: "1druQ9zqkqnISd6STqOU4DrThXb1Ev9_m4f19GrlLst8"
  }
};

// Puntaje que recibe un componente cuando la opción no se reconoce.
// Antes era 0 (máxima urgencia) y el fallo pasaba inadvertido; ahora es un
// valor intermedio y la solicitud queda marcada para revisión.
const PUNTAJE_SIN_COINCIDENCIA = 10;
const MARCA_REVISAR = "⚠ REVISAR PUNTAJE";

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
  // Clave interna: opción de la subpregunta de esa categoría.
  // Un mismo nombre puede valer distinto según la categoría ("Otro", "Mantenimiento Preventivo").
  SERVICIOS: {
    "Conceptos Técnicos": { "Bajas": 50, "Compras": 70, "Directrices Técnicas": 70 },
    "Impresoras": {
      "Mantenimiento Preventivo Impresora": 30, "Instalación o Conexión": 10,
      "Instalación de Toner": 10, "Falla de Red": 10, "Otros": 20
    },
    "PC y Portátiles - Mantenimiento Preventivo": { "Limpieza Interna y Externa": 25 },
    // Sin subpregunta en el formulario: el único servicio se asume. Hoy solo existen en el
    // formulario de pruebas; el de producción aún no las tiene.
    "PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO": { "Instalación y Alistamiento": 25 },
    "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN": { "Movimiento de equipos entre oficinas": 20 },
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

// Nombres alternativos con que las tres fuentes (Excel "TIEMPOS DE RESPUESTA", formulario
// de producción y formulario de pruebas) designan la misma opción. Cada alias apunta a la
// clave canónica de PUNTAJES. Se comparan normalizados, así que basta con la grafía base.
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
    "311": {
      "Oficinas Docentes": "Oficinas Docentes 311",
      "Secretaría Académica": "Secretaría de Facultad"
    },
    "238": {
      "Oficinas Docentes": "Oficinas Docentes 238",
      "Sala 6": "Sala de Informática 6",
      "Vicedecanatura de Investigación y Ext.": "Vicedecanatura de Investigación y Extensión"
    }
  },
  CATEGORIA: {
    "Servidores": "Servidor web y bases de datos",
    "Conceptos_Tecnicos": "Conceptos Técnicos",
    "PC_y_Portatiles_Mto_Preventivo": "PC y Portátiles - Mantenimiento Preventivo",
    "PC_y_Portatiles_Revision_Reparacion": "PC y Portátiles - Revisión y Reparación",
    "Software_Instalacion_Actualizacion": "Software - Instalación o Actualización",
    "Video_Proyectores_Pantallas": "Video - Proyectores o Pantallas"
  },
  SERVICIO: {
    "Impresoras": { "Mantenimiento Preventivo": "Mantenimiento Preventivo Impresora", "Otro": "Otros" }
  }
};

// Valores que el formulario escribe en las columnas de servicio pero que NO son servicios:
// selectores intermedios que ramifican hacia otra pregunta. Se descartan donde aparezcan.
const GRUPOS_NO_SERVICIO = ["Hardware", "Software", "Conectividad", "Internet y Conectividad", "Usuario"];

// Escala de tiempos (pestaña TIEMPOS DE RESPUESTA del Excel): puntaje máximo de cada tramo,
// etiqueta que se escribe en la hoja y horas para la fórmula de tiempo restante.
const ESCALA_TIEMPOS = [
  { hasta: 10, etiqueta: "24 HORAS", horas: 24 },
  { hasta: 20, etiqueta: "48 HORAS", horas: 48 },
  { hasta: 30, etiqueta: "72 HORAS", horas: 72 },
  { hasta: 40, etiqueta: "5 DIAS", horas: 120 },
  { hasta: 50, etiqueta: "10 DIAS", horas: 240 },
  { hasta: 60, etiqueta: "15 DIAS", horas: 360 },
  { hasta: 70, etiqueta: "DURANTE EL SEMESTRE ACADÉMICO", horas: 2160 },
  { hasta: Infinity, etiqueta: "NO ESTABLECIDO", horas: 2160 }
];

// Escala de cantidad (pestaña CANTIDAD DE EQUIPOS del Excel).
const ESCALA_CANTIDAD = [
  { hasta: 3, puntos: 1 }, { hasta: 14, puntos: 10 }, { hasta: 30, puntos: 20 }, { hasta: Infinity, puntos: 35 }
];

const HORAS_TIEMPO = ESCALA_TIEMPOS.reduce((m, t) => { m[t.etiqueta] = t.horas; return m; }, {});

// Opciones de la lista desplegable "Servicio" en Pendientes: todos los servicios, sin repetir.
const LISTA_SERVICIOS = Object.keys(PUNTAJES.SERVICIOS)
  .reduce((lista, cat) => lista.concat(Object.keys(PUNTAJES.SERVICIOS[cat])), [])
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
    
    // 2. Ubicación
    const edificio = normalizarEdificio(edificioRaw);
    const ubicacion = obtenerValorDeColumnas(fila, COL.UBICACION);
    
    // 3. Servicio (descarta selectores de grupo como Hardware/Software/Conectividad/Usuario)
    const servicio = extraerServicio(fila, COL.SERVICIO, categoria);

    // 4. Puntajes
    const cantidad = fila[COL.CANTIDAD - 1];
    const calculo = calcularPuntaje({ edificio, ubicacion, categoria, servicio, cantidad });
    const tiempo = calculo.tiempo;
    const servicioMostrar = calculo.servicioNombre || servicio;
    const reloj = calcularReloj(fila[COL.TIMESTAMP - 1], calculo.horas);   // inicio efectivo y fecha límite en horas hábiles

    // --- ACCIONES EN HOJA ---
    
    const codigo = CONFIG.PREFIJO + String(ultimaFila - 1).padStart(3, "0");
    hojaRespuestas.getRange(ultimaFila, COL.CODIGO).setValue(codigo);
    hojaRespuestas.getRange(ultimaFila, COL.ESTADO).setValue("Pendiente");
    const avisos = calculo.avisos.concat(reloj.avisos);
    if (avisos.length) hojaRespuestas.getRange(ultimaFila, COL.CODIGO).setNote(MARCA_REVISAR + "\n- " + avisos.join("\n- "));

    // --- ENVÍO DE CORREO DE CONFIRMACIÓN ---
    if (validarEmail(email)) {
      const asunto = "Registro número " + codigo;
      // Nota: Usamos la ubicación raw para que se vea bonita en el correo, o la procesada
      const email_html = templateConfirmacion(nombre, codigo, ubicacion, categoria, servicioMostrar, tiempo, comentarios, reloj);
      try { 
        MailApp.sendEmail({to: email, subject: asunto, htmlBody: email_html, name: "Soporte Técnico - FCE"}); 
      } catch (emailError) { 
        Logger.log("ERROR enviando correo: " + emailError.message); 
      }
    }

    // --- INSERTAR EN PENDIENTES ---
    try {
      const hojaPendientes = getHoja(CONFIG.HOJAS.PENDIENTES);
      if (!hojaPendientes) throw new Error(`Hoja de Pendientes no encontrada.`);
      const COLP = detectarColumnasPendientes(hojaPendientes);   // crea los encabezados que falten
      const newRow = Math.max(2, hojaPendientes.getLastRow() + 1);

      const valoresFila = filaPendientes(COLP, {
        CODIGO: codigo, NOMBRE: nombre, EDIFICIO: edificioRaw, UBICACION: ubicacion, SERVICIO: servicioMostrar,
        CANTIDAD: String(cantidad), COMENTARIOS: comentarios, TIEMPO: tiempo, FECHA_SOLICITUD: reloj.marca,
        RESPONSABLE: "", OBSERVACIONES: "", HORAS_RESTANTES: "", INICIO_RELOJ: reloj.inicio, FECHA_LIMITE: reloj.limite
      });
      hojaPendientes.getRange(newRow, 1, 1, valoresFila.length).setValues([valoresFila]);
      hojaPendientes.getRange(newRow, COLP.FECHA_SOLICITUD).setNumberFormat("dd/mm/yyyy hh:mm:ss");
      escribirRelojEnFila(hojaPendientes, newRow, COLP, tiempo, reloj);
      if (avisos.length) marcarParaRevision(hojaPendientes, newRow, codigo, avisos, true);
      if (reloj.fueraVentana) anexarNota(hojaPendientes.getRange(newRow, COLP.CODIGO), textoFueraVentana(reloj));
      
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

    const rango = e.range;
    const h = rango.getSheet();
    const nombreHoja = h.getName();
    const fila = rango.getRow();
    const col = rango.getColumn();

    if (nombreHoja !== CONFIG.HOJAS.PENDIENTES || fila <= 1) return;
    const COLP = detectarColumnasPendientes(h);

    // CASO 1: CIERRE DE TICKET (columna "Resuelto por")
    if (col === COLP.RESPONSABLE) {
      const responsable = rango.getValue();
      if (!responsable) return;

      const ui = SpreadsheetApp.getUi();
      const respuesta = ui.alert("Confirmación", `¿Marcar solicitud como resuelta por ${responsable}?`, ui.ButtonSet.YES_NO);
      if (respuesta !== ui.Button.YES) {
        rango.clearContent();
        return;
      }
      
      const comentarioResolucion = h.getRange(fila, COLP.OBSERVACIONES).getValue() || "Sin comentarios.";
      const codigo = h.getRange(fila, COLP.CODIGO).getValue();
      
      procesarResolucion(codigo, responsable, comentarioResolucion);
      
      h.deleteRow(fila);
      ordenarPendientesPorPrioridad();
    }

    // CASO 2: CAMBIO DE SERVICIO (columna "Servicio")
    if (col === COLP.SERVICIO) {
      const nuevoServicio = rango.getValue();
      if (!nuevoServicio) return;
      const f = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
      const g = campo => f[COLP[campo] - 1];
      const codigo = g("CODIGO");

      // Mismo motor que onFormSubmit. La bandeja no guarda la categoría: se toma del histórico.
      const calculo = calcularPuntaje({
        edificio: g("EDIFICIO"), ubicacion: g("UBICACION"), categoria: categoriaDeRadicado(codigo),
        servicio: nuevoServicio, cantidad: g("CANTIDAD")
      });
      // El plazo nuevo se cuenta desde el INICIO RELOJ original, no desde el momento del cambio (REL-08).
      const reloj = relojDesdeFila(g("FECHA_SOLICITUD"), g("INICIO_RELOJ"), calculo.horas);
      escribirRelojEnFila(h, fila, COLP, calculo.tiempo, reloj);
      const avisos = calculo.avisos.concat(reloj.avisos);
      if (avisos.length) marcarParaRevision(h, fila, codigo, avisos, true);
      else limpiarMarcaRevision(h, fila);
      if (reloj.fueraVentana) anexarNota(h.getRange(fila, COLP.CODIGO), textoFueraVentana(reloj));
      
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
    const COL = detectarColumnas(hojaRespuestas);

    const datos = hojaRespuestas.getDataRange().getValues();
    const filaIndex = datos.findIndex(row => row[COL.CODIGO - 1] === codigo);

    if (filaIndex === -1) return;

    const filaActual = filaIndex + 1;
    const emailDestino = datos[filaIndex][COL.EMAIL - 1];

    hojaRespuestas.getRange(filaActual, COL.ESTADO).setValue("Resuelta");
    hojaRespuestas.getRange(filaActual, COL.RESPONSABLE).setValue(responsable);
    hojaRespuestas.getRange(filaActual, COL.COMENTARIO_RESOLUCION).setValue(comentarioResolucion);
    SpreadsheetApp.flush(); 

    if (validarEmail(emailDestino)) {
      try {
        const asunto = `Caso resuelto - Soporte ${codigo}`;
        const cuerpoHtml = templateResolucion(codigo, comentarioResolucion);
        MailApp.sendEmail(emailDestino, asunto, "Su solicitud ha sido resuelta.", { htmlBody: cuerpoHtml });
        
        hojaRespuestas.getRange(filaActual, COL.ESTADO).setValue("Notificada");
        hojaRespuestas.getRange(filaActual, COL.FECHA_NOTIF).setValue(new Date());
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

// Devuelve el primer valor no vacío entre las columnas indicadas, tal como lo escribió el formulario.
function obtenerValorDeColumnas(fila, indicesColumnas) {
  for (let i = 0; i < indicesColumnas.length; i++) {
    const valor = fila[indicesColumnas[i] - 1]; 
    if (valor && valor.toString().trim() !== "") return valor.toString().trim();
  }
  return "";
}

// Forma canónica para comparar: sin tildes, sin puntuación, sin espacios repetidos, en mayúsculas.
// "Equipo sin internet - No navega" y "EQUIPO SIN INTERNET, NO NAVEGA" producen la misma clave.
function normalizarTexto(texto) {
  return String(texto == null ? "" : texto)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "310", "ED_310" o "Edificio 310" -> "310"
function normalizarEdificio(edificio) {
  return String(edificio == null ? "" : edificio).replace(/\D/g, "");
}

// "Impresoras (Solicitudes de mantenimientos preventivos, ...)" -> "Impresoras"
function nombreCategoria(categoria) {
  return String(categoria == null ? "" : categoria).split("(")[0].trim();
}

// Índices normalizados de PUNTAJES y HORAS_TIEMPO, construidos una sola vez por ejecución.
const INDICE = (function () {
  const avisos = [];
  const ubicacion = {};
  for (const ed in PUNTAJES.UBICACION) {
    ubicacion[ed] = {};
    for (const nombre in PUNTAJES.UBICACION[ed]) {
      ubicacion[ed][normalizarTexto(nombre)] = { puntos: PUNTAJES.UBICACION[ed][nombre], nombre };
    }
    for (const alias in (ALIAS.UBICACION[ed] || {})) {
      const canonico = ALIAS.UBICACION[ed][alias];
      if (PUNTAJES.UBICACION[ed][canonico] === undefined) { avisos.push(`alias de ubicación "${alias}" apunta a "${canonico}", que no existe`); continue; }
      ubicacion[ed][normalizarTexto(alias)] = { puntos: PUNTAJES.UBICACION[ed][canonico], nombre: canonico };
    }
  }
  const servicios = {};
  for (const cat in PUNTAJES.SERVICIOS) {
    const opciones = {}, nombres = {};
    for (const s in PUNTAJES.SERVICIOS[cat]) {
      opciones[normalizarTexto(s)] = PUNTAJES.SERVICIOS[cat][s];
      nombres[normalizarTexto(s)] = s;
    }
    for (const alias in (ALIAS.SERVICIO[cat] || {})) {
      const canonico = ALIAS.SERVICIO[cat][alias];
      if (PUNTAJES.SERVICIOS[cat][canonico] === undefined) { avisos.push(`alias de servicio "${alias}" apunta a "${canonico}", que no existe en "${cat}"`); continue; }
      opciones[normalizarTexto(alias)] = PUNTAJES.SERVICIOS[cat][canonico];
      nombres[normalizarTexto(alias)] = canonico;
    }
    servicios[normalizarTexto(cat)] = { nombre: cat, opciones, nombres };
  }
  for (const alias in ALIAS.CATEGORIA) {
    const entrada = servicios[normalizarTexto(ALIAS.CATEGORIA[alias])];
    if (!entrada) { avisos.push(`alias de categoría "${alias}" apunta a "${ALIAS.CATEGORIA[alias]}", que no existe`); continue; }
    servicios[normalizarTexto(alias)] = entrada;
  }
  const horas = {};
  for (const etiqueta in HORAS_TIEMPO) horas[normalizarTexto(etiqueta)] = HORAS_TIEMPO[etiqueta];
  if (avisos.length) Logger.log("INDICE: " + avisos.join(" | "));
  return { UBICACION: ubicacion, SERVICIOS: servicios, HORAS: horas, AVISOS: avisos };
})();

// Devuelve { puntos, nombre, aviso }. puntos es null si la ubicación no se reconoce.
// Si no está en el edificio indicado pero existe en exactamente un edificio, se usa
// ese (con aviso): cubre edificio vacío o mal diligenciado.
function buscarPuntajeUbicacion(edificio, ubicacion) {
  const clave = normalizarTexto(ubicacion);
  if (!clave) return { puntos: null, nombre: "", aviso: "sin ubicación" };
  const ed = normalizarEdificio(edificio);
  const tabla = INDICE.UBICACION[ed];
  if (tabla && tabla[clave]) return { puntos: tabla[clave].puntos, nombre: tabla[clave].nombre, aviso: null };

  const edificios = Object.keys(INDICE.UBICACION).filter(e => INDICE.UBICACION[e][clave]);
  if (edificios.length === 1) {
    const hit = INDICE.UBICACION[edificios[0]][clave];
    return { puntos: hit.puntos, nombre: hit.nombre, aviso: `ubicación "${ubicacion}" no está en el edificio "${ed}"; se usó la del edificio ${edificios[0]}` };
  }
  return { puntos: null, nombre: String(ubicacion || ""), aviso: `ubicación "${ubicacion}" no reconocida en edificio "${ed}"` };
}

// true si el valor es un selector de grupo del formulario, no un servicio.
function esGrupo(valor) {
  const clave = normalizarTexto(valor);
  return GRUPOS_NO_SERVICIO.some(g => normalizarTexto(g) === clave);
}

// Servicio de una fila de respuestas: el primer valor no vacío de las columnas de servicio
// que no sea un grupo. Si hubiera varios candidatos (no debería, por la ramificación del
// formulario) prefiere el que exista en la categoría.
function extraerServicio(fila, columnasServicio, categoria) {
  const candidatos = columnasServicio
    .map(c => String(fila[c - 1] == null ? "" : fila[c - 1]).trim())
    .filter(v => v !== "" && !esGrupo(v));
  if (candidatos.length <= 1) return candidatos[0] || "";
  return candidatos.find(v => buscarPuntajeServicio(categoria, v).aviso === null) || candidatos[0];
}

// Localiza las columnas de la hoja de respuestas por su encabezado (CONFIG.ENCABEZADOS).
// - Columnas del formulario que no reconoce: usa la posición de respaldo de CONFIG.COL y
//   las reporta en `faltantes`.
// - Columnas propias del script (ETIQUETAS_SCRIPT) que no reconoce: si su posición de
//   respaldo está libre (encabezado vacío o "Columna N") la etiqueta ahí; si la ocupa una
//   pregunta del formulario, crea la columna al final. Nunca escribe sobre datos del formulario.
const _cacheColumnas = {};
// Mecánica común: esquema = { nombre, encabezados (regex por campo), respaldo (posiciones), etiquetas, despues? }.
function detectarColumnasEn(hoja, esquema) {
  const clave = `${hoja.getSheetId()}:${esquema.nombre}`;
  if (_cacheColumnas[clave]) return _cacheColumnas[clave];

  const col = JSON.parse(JSON.stringify(esquema.respaldo));
  let ultimaColumna = Math.max(1, hoja.getLastColumn());
  const encabezados = hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0].map(h => String(h == null ? "" : h).trim());
  const esLibre = h => h === "" || /^columna \d+$/i.test(h);
  const faltantes = [];
  for (const campo in esquema.encabezados) {
    const re = esquema.encabezados[campo];
    const hallazgos = encabezados.map((h, i) => re.test(h) ? i + 1 : 0).filter(Boolean);
    if (hallazgos.length) { col[campo] = Array.isArray(esquema.respaldo[campo]) ? hallazgos : hallazgos[0]; continue; }

    const etiqueta = esquema.etiquetas[campo];
    if (!etiqueta) { faltantes.push(campo); continue; }
    if (esLibre(encabezados[col[campo] - 1] || "")) {
      ultimaColumna = Math.max(ultimaColumna, col[campo]);
    } else {
      do { col[campo] = ++ultimaColumna; } while (!esLibre(encabezados[col[campo] - 1] || ""));
    }
    hoja.getRange(1, col[campo]).setValue(etiqueta);
    encabezados[col[campo] - 1] = etiqueta;
    Logger.log(`detectarColumnas(${hoja.getName()}): columna "${etiqueta}" etiquetada en la posición ${col[campo]}`);
  }
  col.faltantes = faltantes;
  if (esquema.despues) esquema.despues(col, faltantes);
  if (faltantes.length) Logger.log(`detectarColumnas(${hoja.getName()}): sin encabezado reconocible para ${faltantes.join(", ")}; se usa la posición de respaldo`);
  _cacheColumnas[clave] = col;
  return col;
}

// Hoja de respuestas del formulario. Las columnas de servicio son todas las que quedan entre CATEGORIA y CANTIDAD.
function detectarColumnas(hoja) {
  return detectarColumnasEn(hoja, {
    nombre: "respuestas", encabezados: CONFIG.ENCABEZADOS, respaldo: CONFIG.COL, etiquetas: CONFIG.ETIQUETAS_SCRIPT,
    despues: (col, faltantes) => {
      if (faltantes.indexOf("CATEGORIA") === -1 && faltantes.indexOf("CANTIDAD") === -1 && col.CANTIDAD > col.CATEGORIA + 1) {
        col.SERVICIO = [];
        for (let c = col.CATEGORIA + 1; c < col.CANTIDAD; c++) col.SERVICIO.push(c);
      } else {
        faltantes.push("SERVICIO");
      }
    }
  });
}

// Bandeja de pendientes. Todas sus columnas tienen etiqueta: en una hoja vacía se crean los 14 encabezados.
function detectarColumnasPendientes(hoja) {
  return detectarColumnasEn(hoja, {
    nombre: "pendientes", encabezados: CONFIG.ENCABEZADOS_PENDIENTES, respaldo: CONFIG.COL_PENDIENTES, etiquetas: CONFIG.ETIQUETAS_PENDIENTES
  });
}

// Devuelve { puntos, nombre, aviso }. puntos es null si el servicio no se reconoce;
// nombre es el servicio tal como figura en PUNTAJES.
// - Categoría sin subpregunta (un solo servicio posible): se asume ese servicio.
// - Si el servicio no está en su categoría pero existe en exactamente una
//   categoría, se usa esa (con aviso): cubre cambios de servicio hechos por los
//   técnicos en Pendientes y radicados sin categoría en el histórico.
function buscarPuntajeServicio(categoria, servicio) {
  const nombreCat = nombreCategoria(categoria);
  const claveServ = normalizarTexto(servicio);
  const cat = INDICE.SERVICIOS[normalizarTexto(nombreCat)];

  if (!claveServ) {
    const claves = cat ? Object.keys(cat.opciones) : [];
    if (claves.length === 1) return { puntos: cat.opciones[claves[0]], nombre: cat.nombres[claves[0]], aviso: null };
    return { puntos: null, nombre: "", aviso: `sin servicio en categoría "${nombreCat}"` };
  }

  if (cat && cat.opciones[claveServ] !== undefined) return { puntos: cat.opciones[claveServ], nombre: cat.nombres[claveServ], aviso: null };

  // Los alias de categoría comparten entrada con su canónica: se deduplica por entrada, no por clave.
  const coincidencias = [];
  Object.keys(INDICE.SERVICIOS).forEach(k => {
    const entrada = INDICE.SERVICIOS[k];
    if (entrada.opciones[claveServ] !== undefined && coincidencias.indexOf(entrada) === -1) coincidencias.push(entrada);
  });
  if (coincidencias.length === 1) {
    const encontrada = coincidencias[0];
    return { puntos: encontrada.opciones[claveServ], nombre: encontrada.nombres[claveServ], aviso: `"${servicio}" no está en la categoría "${nombreCat}"; se usó el puntaje de "${encontrada.nombre}"` };
  }
  return { puntos: null, nombre: String(servicio || ""), aviso: `servicio "${servicio}" no reconocido en categoría "${nombreCat}"` };
}

// Motor de priorización. Recibe { edificio, ubicacion, categoria, servicio, cantidad } y
// devuelve { total, tiempo, horas, ptsUbicacion, ptsServicio, ptsCantidad, ubicacionNombre, servicioNombre, avisos }.
// ubicacionNombre y servicioNombre son los nombres canónicos resueltos (alias → PUNTAJES).
// Nunca da 0 por una opción desconocida: usa PUNTAJE_SIN_COINCIDENCIA y lo reporta en avisos.
function calcularPuntaje(datos) {
  const avisos = [];

  const ubicacion = buscarPuntajeUbicacion(datos.edificio, datos.ubicacion);
  if (ubicacion.aviso) avisos.push(ubicacion.aviso);
  const ptsUbicacion = ubicacion.puntos === null ? PUNTAJE_SIN_COINCIDENCIA : ubicacion.puntos;

  const servicio = buscarPuntajeServicio(datos.categoria, datos.servicio);
  if (servicio.aviso) avisos.push(servicio.aviso);
  const ptsServicio = servicio.puntos === null ? PUNTAJE_SIN_COINCIDENCIA : servicio.puntos;

  const ptsCantidad = getPuntajeCantidad(datos.cantidad);
  const total = ptsUbicacion + ptsServicio + ptsCantidad;
  const tiempo = calcularTiempo(total);

  return { total, tiempo, horas: horasDeTiempo(tiempo), ptsUbicacion, ptsServicio, ptsCantidad, ubicacionNombre: ubicacion.nombre, servicioNombre: servicio.nombre, avisos };
}

// Horas del plazo. Tolera etiquetas antiguas como "5 DÍAS" (con tilde).
function horasDeTiempo(etiqueta) {
  const horas = INDICE.HORAS[normalizarTexto(etiqueta)];
  return horas === undefined ? HORAS_TIEMPO["NO ESTABLECIDO"] : horas;
}

// La bandeja de Pendientes no guarda la categoría; se toma del histórico por radicado.
function categoriaDeRadicado(codigo) {
  const hoja = getHoja(CONFIG.HOJAS.RESPUESTAS);
  if (!hoja) return "";
  const COL = detectarColumnas(hoja);
  const fila = hoja.getDataRange().getValues().find(row => row[COL.CODIGO - 1] === codigo);
  return fila ? fila[COL.CATEGORIA - 1] : "";
}

// Deja constancia visible de un puntaje no resuelto: fondo amarillo y nota en el
// radicado de Pendientes, registro en log y, si se pide, correo al administrador.
function marcarParaRevision(hoja, fila, codigo, avisos, enviarCorreo) {
  const texto = `${MARCA_REVISAR}\n- ${avisos.join("\n- ")}\nSe usó el puntaje neutro ${PUNTAJE_SIN_COINCIDENCIA}. ` +
    `Corrija PUNTAJES en Código.gs o la opción del formulario y luego use "Soporte > Recalcular plazos de pendientes".`;
  hoja.getRange(fila, 1).setBackground("#fff2cc").setNote(texto);
  Logger.log(`${codigo}: ${avisos.join(" | ")}`);
  if (enviarCorreo) {
    try {
      MailApp.sendEmail({ to: CONFIG.EMAIL_ADMIN, subject: `${MARCA_REVISAR} - ${codigo}`, htmlBody: `<p>${texto.replace(/\n/g, "<br>")}</p>` });
    } catch (e) { Logger.log("No se pudo enviar aviso de revisión: " + e.message); }
  }
}

function limpiarMarcaRevision(hoja, fila) {
  hoja.getRange(fila, 1).setBackground(null).clearNote();
}

// Puntaje por cantidad según ESCALA_CANTIDAD. Toma el primer número del texto
// ("2 equipos" → 2); sin número o ≤ 0 se trata como el tramo mínimo.
// El signo entra en la coincidencia: sin él, "-5" se leía como 5 y caía en el tramo 4-14.
function getPuntajeCantidad(cantidadIngresada) {
  const m = String(cantidadIngresada == null ? "" : cantidadIngresada).match(/-?\d+/);
  const num = m ? parseInt(m[0], 10) : 0;
  if (num <= 0) return ESCALA_CANTIDAD[0].puntos;
  return ESCALA_CANTIDAD.find(t => num <= t.hasta).puntos;
}

// Etiqueta de plazo según ESCALA_TIEMPOS.
function calcularTiempo(puntajeTotal) {
  return ESCALA_TIEMPOS.find(t => puntajeTotal <= t.hasta).etiqueta;
}

/*
  =================================================================
  --- SECCIÓN 5: FUNCIONES PROGRAMADAS (CRON JOBS) ---
  =================================================================
*/

// Alerta diaria en horas hábiles (REL-07): vencidas, próximas a vencer (≤ 20 % del plazo),
// filas sin fecha límite (pendientes de migrar) y años sin festivos generados.
function verificarSolicitudesVencidas() { 
  try { 
    const sinFestivos = aniosSinFestivos();
    const h = getHoja(CONFIG.HOJAS.PENDIENTES); 
    const vencidas = [], proximas = [], sinMigrar = [];
    if (h && h.getLastRow() > 1) {
      const COLP = detectarColumnasPendientes(h);
      const ahora = new Date();
      h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).getValues().forEach(f => {
        const g = campo => f[COLP[campo] - 1];
        const codigo = g("CODIGO");
        if (!codigo) return;
        const item = { codigo, nombre: g("NOMBRE"), ubicacion: g("UBICACION"), tiempoMax: g("TIEMPO"), limite: g("FECHA_LIMITE") };
        if (!esFechaValida(item.limite)) { sinMigrar.push(item); return; }
        const restantes = horasHabilesEntre(ahora, item.limite);
        const c = clasificarParaAlerta(horasDeTiempo(item.tiempoMax), restantes);
        item.horas = Math.round(Math.abs(restantes)); item.pct = c.pct;
        if (c.estado === "VENCIDA") vencidas.push(item);
        else if (c.estado === "PROXIMA") proximas.push(item);
      });
    }
    if (vencidas.length || proximas.length || sinMigrar.length || sinFestivos.length) {
      alertaVencidas(vencidas, proximas, sinMigrar, sinFestivos);
    }
  } catch (err) { 
    logError("verificarSolicitudesVencidas", err); 
  } 
}

function generarReporteSemanal() { 
  try { 
    const h = getHoja(CONFIG.HOJAS.RESPUESTAS); 
    const COL = detectarColumnas(h);
    const datos = h.getDataRange().getValues(); 
    const hace7 = new Date(Date.now() - 604800000); 
    let total = 0, resueltas = 0, pendientes = 0; 
    for (let i = 1; i < datos.length; i++) { 
      if (new Date(datos[i][COL.TIMESTAMP - 1]) < hace7) continue; 
      total++; 
      const estado = datos[i][COL.ESTADO - 1]; 
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

function templateConfirmacion(nombre, codigo, ubicacion, categoria, servicio, tiempo, comentarios, reloj) { 
  const fueraVentana = reloj && reloj.fueraVentana
    ? `<p style="color:#8a6d3b;background:#fcf8e3;padding:8px 12px;border-radius:4px;">Su solicitud fue recibida fuera del horario de atención (${formatearFechaLarga(reloj.marca)}); el plazo cuenta desde el <strong>${formatearFechaLarga(reloj.inicio)}</strong>.</p>`
    : "";
  return `<div style="font-family:Arial;font-size:14px;color:#333;">
    <p>Estimado/a <strong>${nombre}</strong>,</p>
    <p>Su solicitud ha sido creada exitosamente con código: <span style="font-size:18px;color:#d9534f;"><strong>${codigo}</strong></span></p>
    <p><strong>Detalles:</strong></p>
    <ul>
      <li><strong>Ubicación:</strong> ${ubicacion}</li>
      <li><strong>Servicio:</strong> ${servicio || nombreCategoria(categoria)}</li>
      <li><strong>Tiempo estimado de respuesta:</strong> ${tiempo} (en días hábiles)</li>
      ${reloj ? `<li><strong>Fecha límite estimada:</strong> ${formatearFechaLarga(reloj.limite)}</li>` : ""}
    </ul>
    ${fueraVentana}
    <p>Atentamente,<br><strong>Unidad de Informática - FCE</strong></p>
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

function alertaVencidas(vencidas, proximas, sinMigrar, sinFestivos) { 
  const td = v => `<td style="padding:6px 8px;border-bottom:1px solid #eee;">${v}</td>`;
  const tabla = (titulo, color, items, colHoras) => items.length ? `<h3 style="color:${color};margin:18px 0 6px;">${titulo} (${items.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f5f5f5;text-align:left;">
    <th style="padding:8px;">Radicado</th><th style="padding:8px;">Usuario</th><th style="padding:8px;">Ubicación</th><th style="padding:8px;">Plazo</th><th style="padding:8px;">Fecha límite</th><th style="padding:8px;">${colHoras}</th><th style="padding:8px;">% transcurrido</th></tr></thead>
    <tbody>${items.map(s => `<tr>${td(s.codigo)}${td(s.nombre)}${td(s.ubicacion)}${td(s.tiempoMax)}${td(formatearFechaLarga(s.limite))}${td(s.horas + " h hábiles")}${td(s.pct + " %")}</tr>`).join("")}</tbody></table>` : "";
  const html = `<div style="font-family:Arial;color:#333;"><h2 style="color:#d9534f;margin-bottom:4px;">Seguimiento de plazos — ${formatearFechaLarga(new Date(), false)}</h2>
    ${tabla("Solicitudes vencidas", "#d9534f", vencidas, "Retraso")}
    ${tabla("Próximas a vencer (≤ 20 % del plazo)", "#f0ad4e", proximas, "Restan")}
    ${sinMigrar.length ? `<p style="margin-top:18px;"><strong>${sinMigrar.length} solicitud(es) sin fecha límite</strong> (${sinMigrar.map(s => s.codigo).join(", ")}): ejecute <em>Soporte → Recalcular plazos de pendientes</em>.</p>` : ""}
    ${sinFestivos.length ? `<p style="color:#d9534f;"><strong>Atención:</strong> no hay festivos generados para ${sinFestivos.join(" y ")}. Los plazos que crucen esas fechas contarán los festivos como hábiles. Ejecute <em>Soporte → Generar festivos del año…</em></p>` : ""}
    </div>`;
  const asunto = vencidas.length ? `ALERTA: ${vencidas.length} solicitud(es) vencida(s)` : proximas.length ? `Aviso: ${proximas.length} solicitud(es) próxima(s) a vencer` : "Seguimiento de plazos: acción requerida";
  MailApp.sendEmail(CONFIG.EMAIL_ADMIN, asunto, "", { htmlBody: html }); 
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
    const COLP = detectarColumnasPendientes(hoja);
    const rango = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()); 
    rango.sort({ column: COLP.FECHA_LIMITE, ascending: true }); // lo más próximo a vencer arriba; sin fecha límite al final
  } catch(err) { 
    logError("ordenarPendientesPorPrioridad", err); 
  } 
}

function actualizarListasDesplegables(hoja) { 
  try { 
    const ultimaFila = hoja.getLastRow(); 
    if (ultimaFila <= 1) return; 
    
    const COLP = detectarColumnasPendientes(hoja);
    const rangoResponsables = hoja.getRange(2, COLP.RESPONSABLE, ultimaFila - 1, 1); 
    const reglaResponsables = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.RESPONSABLES, true).build(); 
    rangoResponsables.setDataValidation(reglaResponsables); 

    const rangoServicios = hoja.getRange(2, COLP.SERVICIO, ultimaFila - 1, 1);
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
    // Ventana del formulario (spec 02): programador diario y reconciliación horaria.
    ScriptApp.newTrigger('programarVentana').timeBased().atHour(CONFIG.VENTANA.HORA_PROGRAMADOR).everyDays(1).create();
    ScriptApp.newTrigger('reconciliarVentana').timeBased().everyHours(1).create();
    programarVentana();   // deja programado el día de hoy y el formulario en el estado que dicta la regla
    
    MailApp.sendEmail(CONFIG.EMAIL_ADMIN, "Triggers Configurados", "El sistema está listo."); 
  } catch (err) { 
    logError("configurarTriggers", err); 
  } 
}

/*
  =================================================================
  --- SECCIÓN 8: MENÚ, PRUEBAS Y AUDITORÍA ---
  =================================================================
*/

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Soporte")
    .addSubMenu(ui.createMenu("Pruebas")
      .addItem("Probar todo", "probarTodo")
      .addSeparator()
      .addItem("Cálculo de plazos", "probarCalculo")
      .addItem("Catálogo de servicios (Excel)", "probarServicios")
      .addItem("Tiempos de respuesta por servicio", "probarTiempos")
      .addItem("Calendario hábil", "probarCalendario")
      .addItem("Reloj hábil", "probarRelojHabil")
      .addItem("Ventana del formulario", "probarVentana")
      .addItem("Fórmula de horas hábiles ↔ script", "probarFormulaHorasHabiles"))
    .addSubMenu(ui.createMenu("Formulario")
      .addItem("Auditar formulario de producción", "auditarFormularioProduccion")
      .addItem("Auditar formulario de pruebas", "auditarFormularioPruebas")
      .addSeparator()
      .addItem("Estado de la ventana", "estadoVentana")
      .addItem("Abrir ahora (modo manual)", "abrirAhora")
      .addItem("Cerrar ahora (modo manual)", "cerrarAhora")
      .addItem("Suspender programación", "suspenderProgramacion")
      .addItem("Reanudar programación", "reanudarProgramacion"))
    .addSeparator()
    .addItem("Verificación completa…", "verificacionCompleta")
    .addItem("Generar festivos del año…", "generarFestivosDesdeMenu")
    .addItem("Recalcular plazos de pendientes", "recalcularPendientes")
    .addItem("Configurar triggers", "configurarTriggers")
    .addToUi();
}

// Casos de regresión. Los radicados 057-087 son solicitudes reales de Respuestas_Oficiales;
// los S-xx cubren opciones del formulario que aún no se han usado.
// Formato: [radicado, edificio, ubicación, categoría, servicio, cantidad, plazo esperado]
const CASOS_PRUEBA = [
  ["057", "310", "Auditorios Auxiliares", "Servidor web y bases de datos (Únicamente para solicitudes relacionadas con los servidores de la Facultad)", "Instalación / Actualización de paquetes", 12, "72 HORAS"],
  ["058", "310", "Auditorios Auxiliares", "Software - Instalación o Actualización (Solicitudes de instalación de software, configuración de VPN)", "Office", 12, "72 HORAS"],
  ["059", "310", "Biblioteca", "Impresoras (Solicitudes de mantenimientos preventivos, instalación o conexión a la red, cambio de toner o fallas de red)", "Instalación o Conexión", 2, "5 DIAS"],
  ["060", "238", "Comunicaciones", "PC y Portátiles - Revisión y Reparación (Solicitudes de revision y reparacion de Hardware, software o problemas de conectividad a la red o internet)", "Equipo sin internet - No navega", 2, "72 HORAS"],
  ["061", "310", "Biblioteca", "PC y Portátiles - Mantenimiento Preventivo (Solicitudes de limpieza interna y externa de equipos de cómputo)", "Limpieza Interna y Externa", 1, "10 DIAS"],
  ["062", "310", "UIFCE", "Conceptos Técnicos (Solicitudes de conceptos técnicos para bajas, conceptos técnicos para compras y directrices técnicas)", "Bajas", 3, "DURANTE EL SEMESTRE ACADÉMICO"],
  ["063", "310", "Auditorio Principal", "Conceptos Técnicos", "Bajas", 8, "DURANTE EL SEMESTRE ACADÉMICO"],
  ["064", "310", "Auditorio Principal", "Impresoras", "Falla de Red", 13, "72 HORAS"],
  ["065", "310", "Auditorio Principal", "PC y Portátiles - Revisión y Reparación", "Equipo no enciende", 5, "72 HORAS"],
  ["066", "310", "CADE - Oficinas Programas Curriculares", "PC y Portátiles - Mantenimiento Preventivo", "Limpieza Interna y Externa", 40, "DURANTE EL SEMESTRE ACADÉMICO"],
  ["067", "310", "Auditorios Auxiliares", "Impresoras", "Instalación de Toner", 2, "72 HORAS"],
  ["068", "310", "Biblioteca", "PC y Portátiles - Revisión y Reparación", "Software con fallas", 2, "72 HORAS"],
  ["069", "311", "Archivo 311", "PC y Portátiles - Mantenimiento Preventivo", "Limpieza Interna y Externa", 3, "5 DIAS"],
  ["070", "310", "Auditorios Auxiliares", "PC y Portátiles - Mantenimiento Preventivo", "Limpieza Interna y Externa", 3, "5 DIAS"],
  ["071", "310", "Auditorios Auxiliares", "PC y Portátiles - Revisión y Reparación", "Acceso a servidor de archivos", 2, "72 HORAS"],
  ["072", "310", "Biblioteca", "Telefonía (Solicitudes de revisión de problemas con teléfonos)", "Cambio o Reparación de cables", 2, "5 DIAS"],
  ["073", "311", "Oficina de Apoyo Docente 311", "Software - Instalación o Actualización", "Office", 2, "5 DIAS"],
  ["074", "311", "Archivo 311", "PC y Portátiles - Revisión y Reparación", "Equipo no enciende", 2, "48 HORAS"],
  ["075", "310", "Oficina Área Curricular de Contabilidad y Finanzas", "Software - Instalación o Actualización", "Office", 3, "72 HORAS"],
  ["076", "310", "Auditorios Auxiliares", "Impresoras", "Instalación de Toner", 2, "72 HORAS"],
  ["077", "310", "Auditorios Auxiliares", "PC y Portátiles - Mantenimiento Preventivo", "Limpieza Interna y Externa", 3, "5 DIAS"],
  ["078", "310", "Auditorios Auxiliares", "PC y Portátiles - Revisión y Reparación", "Equipo no inicia - pantalla negra", 2, "48 HORAS"],
  ["079", "311", "Oficina de Apoyo Docente 311", "Impresoras", "Mantenimiento Preventivo Impresora", 2, "15 DIAS"],
  ["080", "310", "Auditorio Principal", "Impresoras", "Mantenimiento Preventivo Impresora", 35, "NO ESTABLECIDO"],
  ["081", "311", "Salones 311", "Conceptos Técnicos", "Bajas", 2, "DURANTE EL SEMESTRE ACADÉMICO"],
  ["082", "311", "Oficinas Docentes 311", "Conceptos Técnicos", "Directrices Técnicas", 7, "NO ESTABLECIDO"],
  ["083", "310", "Auditorio Principal", "Conceptos Técnicos", "Bajas", 4, "DURANTE EL SEMESTRE ACADÉMICO"],
  ["084", "311", "Secretaría Académica", "Software - Instalación o Actualización", "Office", 2, "48 HORAS"],
  ["085", "238", "Vicedecanatura de Investigación y Extensión", "PC y Portátiles - Revisión y Reparación", "Acceso a servidor de archivos", 3, "72 HORAS"],
  ["086", "310", "UIFCE", "Software - Instalación o Actualización", "Otro", 2, "72 HORAS"],
  ["087", "310", "Biblioteca", "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN", "Equipo sin internet - No navega", 2, "72 HORAS"],
  ["S-01", "310", "Sala de Informática 1", "Impresoras", "Otros", 1, "10 DIAS"],
  ["S-02", "311", "Secretaría de Facultad", "Telefonía", "Teléfono sin servicio", 1, "48 HORAS"],
  ["S-03", "238", "Sala de Informática 6", "Video - Proyectores o Pantallas", "No proyecta - Imagen con problemas", 2, "5 DIAS"],
  ["S-04", "310", "Oficina Área Curricular de Gestión y Organizaciones", "PC y Portátiles - Revisión y Reparación", "Daño en periféricos (Teclado, Mouse, etc)", 1, "48 HORAS"],
  ["S-05", "311", "Decanatura", "PC y Portátiles - Revisión y Reparación", "Creación de usuarios en Windows", 1, "48 HORAS"],
  ["S-06", "ED_310", "UIFCE", "Video - Proyectores o Pantallas", "Mantenimiento Preventivo", 1, "72 HORAS"],
  ["S-07", "310", "Oficina ORI", "PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO", "", 2, "5 DIAS"],
  ["S-08", "311", "Unidad Administrativa", "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN", "", 5, "5 DIAS"],
  // X-xx: mismas solicitudes escritas con los nombres del Excel (tercera fuente de verdad)
  ["X-01", "310", "UNIDAD DE INFORMÁTICA", "SERVIDORES (Unicamente para solicitudes relacionadas con los servidores de la Facultad)", "INSTALACION / ACTUALIZACION DE PAQUETES", 12, "72 HORAS"],
  ["X-02", "311", "OFICINAS DOCENTES", "IMPRESORAS", "MANTENIMIENTO PREVENTIVO", 2, "15 DIAS"],
  ["X-03", "238", "OFICINAS DOCENTES", "IMPRESORAS", "OTRO", 1, "5 DIAS"],
  ["X-04", "310", "SALA 1", "PC Y PORTATILES - REVISIÓN Y REPARACIÓN", "EQUIPO SIN INTERNET, NO NAVEGA", 1, "72 HORAS"],
  ["X-05", "238", "VICEDECANATURA DE INVESTIGACIÓN Y EXT.", "VIDEO_PROYECTORES_PANTALLAS", "NO PROYECTA, IMAGEN CON PROBLEMAS", 1, "48 HORAS"],
  ["X-06", "310", "OFICINA AREA C. DE CONTABILILIDAD Y F.", "PC_Y_PORTATILES_MTO_PREVENTIVO", "LIMPIEZA INTERNA Y EXTERNA", 3, "5 DIAS"],
  // R-xx: respaldos ante datos incompletos
  ["R-01", "", "Biblioteca", "Impresoras", "Falla de Red", 1, "5 DIAS"],
  ["R-02", "Edificio 311", "Decanatura", "Telefonía", "Teléfono sin servicio", "2 equipos", "48 HORAS"]
];

// Ejecuta CASOS_PRUEBA y verifica además que una opción desconocida no dé 0 sino aviso.
// Muestra el resultado de una prueba: siempre en el log; en pantalla salvo cuando corre "Probar todo".
let _sinAlertas = false;
// Cuando vale un array, mostrarResultado escribe ahí en vez de abrir la interfaz. Lo usa
// el informe de verificación (Verificacion.gs) para recoger la salida de cada suite.
let _capturaResultados = null;
function mostrarResultado(titulo, texto) {
  Logger.log(texto);
  if (_capturaResultados) { _capturaResultados.push({ titulo, texto }); return; }
  if (_sinAlertas) return;
  try { SpreadsheetApp.getUi().alert(titulo, texto, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}

// Ejecuta todas las pruebas y resume.
function probarTodo() {
  _sinAlertas = true;
  const resultados = [];
  try {
    [["Cálculo de plazos", probarCalculo], ["Catálogo de servicios", probarServicios], ["Tiempos de respuesta", probarTiempos], ["Calendario hábil", probarCalendario], ["Reloj hábil", probarRelojHabil], ["Ventana del formulario", probarVentana]]
      .forEach(([nombre, fn]) => { let ok; try { ok = fn(); } catch (e) { ok = false; Logger.log(`${nombre}: EXCEPCIÓN ${e.message}`); } resultados.push(`${ok ? "✓" : "✗"} ${nombre}`); });
  } finally { _sinAlertas = false; }
  const todoOk = resultados.every(r => r.startsWith("✓"));
  mostrarResultado("Probar todo", (todoOk ? "Todas las pruebas en verde.\n" : "HAY PRUEBAS FALLIDAS (ver Registro de ejecución).\n") + resultados.join("\n"));
  return todoOk;
}

function probarCalculo() {
  const fallos = [];
  CASOS_PRUEBA.forEach(([cod, edificio, ubicacion, categoria, servicio, cantidad, esperado]) => {
    const r = calcularPuntaje({ edificio, ubicacion, categoria, servicio, cantidad });
    if (r.tiempo !== esperado) {
      fallos.push(`${cod}: esperado ${esperado}, obtenido ${r.tiempo} (${r.ptsUbicacion}+${r.ptsServicio}+${r.ptsCantidad}=${r.total})`);
    }
  });

  const desconocido = calcularPuntaje({ edificio: "310", ubicacion: "Oficina inexistente", categoria: "Impresoras", servicio: "Servicio inexistente", cantidad: 1 });
  if (desconocido.avisos.length !== 2 || desconocido.ptsUbicacion !== PUNTAJE_SIN_COINCIDENCIA || desconocido.ptsServicio !== PUNTAJE_SIN_COINCIDENCIA) {
    fallos.push(`opción desconocida: se esperaban 2 avisos y puntaje neutro, se obtuvo ${JSON.stringify(desconocido)}`);
  }

  // Los respaldos deben dejar rastro: R-01 (sin edificio) y R-02 (edificio con texto) avisan o no según corresponda.
  if (!calcularPuntaje({ edificio: "", ubicacion: "Biblioteca", categoria: "Impresoras", servicio: "Falla de Red", cantidad: 1 }).avisos.length) {
    fallos.push("ubicación resuelta por otro edificio debería generar aviso");
  }
  if (calcularPuntaje({ edificio: "", ubicacion: "Oficinas Docentes", categoria: "Impresoras", servicio: "Falla de Red", cantidad: 1 }).ptsUbicacion !== PUNTAJE_SIN_COINCIDENCIA) {
    fallos.push("ubicación ambigua entre edificios (Oficinas Docentes sin número) debería quedar sin resolver");
  }

  // Extracción del servicio en una fila: el grupo se descarta y el servicio real se toma de cualquier columna.
  const filaSintetica = []; filaSintetica[13] = "Conectividad"; filaSintetica[16] = "Equipo sin internet - No navega";
  if (extraerServicio(filaSintetica, CONFIG.COL.SERVICIO, "PC y Portátiles - Revisión y Reparación") !== "Equipo sin internet - No navega") {
    fallos.push("extraerServicio debería ignorar el grupo 'Conectividad' y devolver el servicio");
  }
  const filaSoloGrupo = []; filaSoloGrupo[13] = "Hardware";
  if (extraerServicio(filaSoloGrupo, CONFIG.COL.SERVICIO, "PC y Portátiles - Revisión y Reparación") !== "") {
    fallos.push("extraerServicio con solo un grupo debería devolver vacío");
  }

  // El auditor decide qué se pregunta por el título. "Subcategoría Hardware:" contiene
  // "categor" y se tomaba por la pregunta de categoría: los nueve servicios que cuelgan de
  // las subcategorías salían como SIN PUNTAJE en los dos formularios, sin serlo.
  [
    ["Seleccione el edificio", "edificio"],
    ["Seleccione la categoría del servicio", "categoria"],
    ["Ubicación exacta", "ubicacion"],
    ["Subcategoría Hardware:", "servicio"],
    ["Subcategoría Software:", "servicio"],
    ["Subcategoría Conectividad:", "servicio"],
    ["Subcategoría usuario:", "servicio"],
    ["SUBCATEGORÍA HARDWARE", "servicio"],
    ["Cantidad de equipos", "servicio"]
  ].forEach(([pregunta, esperado]) => {
    const obtenido = rolDePregunta(pregunta);
    if (obtenido !== esperado) fallos.push(`rolDePregunta("${pregunta}"): esperado "${esperado}", obtenido "${obtenido}"`);
  });

  // Alias mal apuntados en ALIAS se detectan al construir el índice.
  if (INDICE.AVISOS.length) fallos.push("ALIAS con destinos inexistentes: " + INDICE.AVISOS.join(" | "));

  // Con la hoja real: todas las columnas deben reconocerse por encabezado.
  try {
    const hoja = getHoja(CONFIG.HOJAS.RESPUESTAS);
    if (hoja) {
      const col = detectarColumnas(hoja);
      if (col.faltantes.length) fallos.push(`columnas sin encabezado reconocible en ${CONFIG.HOJAS.RESPUESTAS}: ${col.faltantes.join(", ")} (se usa la posición de respaldo)`);
    }
  } catch (e) { /* sin hoja activa (p. ej. prueba fuera de Sheets) */ }

  const total = CASOS_PRUEBA.length + 6;
  const resumen = fallos.length
    ? `${fallos.length} de ${total} casos FALLAN:\n${fallos.join("\n")}`
    : `${total} casos correctos.`;
  mostrarResultado("Prueba de cálculo de plazos", resumen);
  return fallos.length === 0;
}

function auditarFormularioProduccion() { auditarOpcionesFormulario(CONFIG.FORMULARIOS.PRODUCCION); }
function auditarFormularioPruebas() { auditarOpcionesFormulario(CONFIG.FORMULARIOS.PRUEBAS); }

// Recorre todas las preguntas de opción del formulario y verifica que cada opción
// tenga puntaje. Escribe el resultado en la hoja Auditoría_Formulario.
// Ejecutar cada vez que se edite el formulario.
function auditarOpcionesFormulario(formId) {
  const r = filasAuditoriaFormulario(formId);
  escribirAuditoria(r.filas);
  const resumen = `${r.titulo}: ${r.filas.length} opciones revisadas, ${r.sinPuntaje} sin puntaje. Ver hoja ${CONFIG.HOJAS.AUDITORIA}.`;
  Logger.log(resumen);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(resumen, "Auditoría de formulario", 10); } catch (e) {}
  return r.sinPuntaje;
}

// Qué se está preguntando, según el título de la pregunta del formulario.
// "Subcategoría Hardware:" contiene "categor": sin descartarla primero, el auditor la
// tomaba por la pregunta de categoría y daba SIN PUNTAJE a los nueve servicios que cuelgan
// de ella, en los dos formularios. Una subcategoría siempre pregunta por un servicio.
function rolDePregunta(pregunta) {
  if (/subcategor/i.test(pregunta)) return "servicio";
  if (/edificio/i.test(pregunta)) return "edificio";
  if (/ubicaci/i.test(pregunta)) return "ubicacion";
  if (/categor/i.test(pregunta)) return "categoria";
  return "servicio";
}

// Recorre el formulario y devuelve { titulo, filas, sinPuntaje } sin tocar la hoja.
function filasAuditoriaFormulario(formId) {
  const form = FormApp.openById(formId);
  const filas = [];
  let seccion = "";
  let sinPuntaje = 0;

  form.getItems().forEach(item => {
    const tipo = item.getType();
    if (tipo === FormApp.ItemType.PAGE_BREAK) { seccion = item.getTitle(); return; }

    let opciones;
    if (tipo === FormApp.ItemType.MULTIPLE_CHOICE) opciones = item.asMultipleChoiceItem().getChoices();
    else if (tipo === FormApp.ItemType.LIST) opciones = item.asListItem().getChoices();
    else return;

    const pregunta = item.getTitle();
    const rol = rolDePregunta(pregunta);
    opciones.map(c => c.getValue()).forEach(opcion => {
      let resultado, puntos = "", detalle = "";
      if (rol === "edificio") {
        resultado = "n/a";
      } else if (rol === "ubicacion") {
        const r = buscarPuntajeUbicacion(seccion, opcion); // la sección se titula "Edificio 310", etc.
        resultado = r.puntos === null ? "SIN PUNTAJE" : "OK";
        puntos = r.puntos === null ? "" : r.puntos;
        detalle = r.aviso || (normalizarTexto(r.nombre) !== normalizarTexto(opcion) ? `alias de "${r.nombre}"` : "");
      } else if (rol === "categoria") {
        resultado = INDICE.SERVICIOS[normalizarTexto(nombreCategoria(opcion))] ? "OK" : "SIN PUNTAJE";
      } else if (esGrupo(opcion)) {
        resultado = "n/a (grupo)";
      } else {
        const r = buscarPuntajeServicio(seccion, opcion);
        resultado = r.puntos === null ? "SIN PUNTAJE" : "OK";
        puntos = r.puntos === null ? "" : r.puntos;
        detalle = r.aviso || (normalizarTexto(r.nombre) !== normalizarTexto(opcion) ? `alias de "${r.nombre}"` : "");
      }
      if (resultado === "SIN PUNTAJE") sinPuntaje++;
      filas.push([form.getTitle(), pregunta, seccion, opcion, resultado, puntos, detalle]);
    });
  });

  return { titulo: form.getTitle(), filas, sinPuntaje };
}

// Vuelca en la hoja de auditoría las filas de uno o varios formularios, de una sola vez.
function escribirAuditoria(filas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.HOJAS.AUDITORIA) || ss.insertSheet(CONFIG.HOJAS.AUDITORIA);
  hoja.clear();
  hoja.getRange(1, 1, 1, 7).setValues([["FORMULARIO", "PREGUNTA", "SECCIÓN", "OPCIÓN", "RESULTADO", "PUNTAJE", "DETALLE"]]).setFontWeight("bold");
  if (filas.length) hoja.getRange(2, 1, filas.length, 7).setValues(filas);
  return hoja;
}

// Recalcula plazo y fórmula de tiempo restante de toda la bandeja con el motor actual.
// Usar tras corregir PUNTAJES o el formulario. No envía correos por fila.
// Recalcula plazo, inicio del reloj, fecha límite y fórmula de toda la bandeja con el motor
// actual (REL-09). Conserva INICIO RELOJ cuando existe. No envía correos por fila.
function recalcularPendientes() {
  const hoja = getHoja(CONFIG.HOJAS.PENDIENTES);
  if (!hoja || hoja.getLastRow() <= 1) return;
  const COLP = detectarColumnasPendientes(hoja);

  const encabezadoHoras = hoja.getRange(1, COLP.HORAS_RESTANTES);
  if (normalizarTexto(encabezadoHoras.getValue()) !== normalizarTexto(CONFIG.ETIQUETAS_PENDIENTES.HORAS_RESTANTES)) {
    encabezadoHoras.setValue(CONFIG.ETIQUETAS_PENDIENTES.HORAS_RESTANTES);
  }

  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
  const cambios = [], invalidas = [];
  datos.forEach((f, i) => {
    const fila = i + 2, g = campo => f[COLP[campo] - 1];
    const codigo = g("CODIGO");
    if (!codigo) return;

    const marca = g("FECHA_SOLICITUD");
    if (!esFechaValida(marca) || marca < new Date(2020, 0, 1)) {
      hoja.getRange(fila, COLP.CODIGO).setBackground("#fff2cc").setNote(`${MARCA_REVISAR}\nFecha de solicitud inválida (${marca}); corrija la fecha y vuelva a recalcular.`);
      invalidas.push(codigo);
      return;
    }

    const calculo = calcularPuntaje({ edificio: g("EDIFICIO"), ubicacion: g("UBICACION"), categoria: categoriaDeRadicado(codigo), servicio: g("SERVICIO"), cantidad: g("CANTIDAD") });
    const reloj = relojDesdeFila(marca, g("INICIO_RELOJ"), calculo.horas);
    const antes = `${g("TIEMPO")} · ${esFechaValida(g("FECHA_LIMITE")) ? fmtHM(g("FECHA_LIMITE")) : "sin fecha límite"}`;
    escribirRelojEnFila(hoja, fila, COLP, calculo.tiempo, reloj);
    if (calculo.avisos.length) marcarParaRevision(hoja, fila, codigo, calculo.avisos, false);
    else limpiarMarcaRevision(hoja, fila);
    if (reloj.fueraVentana) anexarNota(hoja.getRange(fila, COLP.CODIGO), textoFueraVentana(reloj));
    const despues = `${calculo.tiempo} · ${fmtHM(reloj.limite)}`;
    if (antes !== despues) cambios.push(`${codigo}: ${antes} → ${despues}`);
  });
  ordenarPendientesPorPrioridad();

  const resumen = (cambios.length ? `${cambios.length} fila(s) actualizada(s):\n${cambios.join("\n")}` : "Ningún plazo cambió.")
    + (invalidas.length ? `\n\nSin recalcular por fecha de solicitud inválida: ${invalidas.join(", ")}` : "");
  mostrarResultado("Recalcular pendientes", resumen);
}