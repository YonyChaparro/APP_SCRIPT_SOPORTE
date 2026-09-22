/*
  =================================================================
  --- CATÁLOGO DEL EXCEL Y PRUEBA EXHAUSTIVA DE SERVICIOS ---
  =================================================================

  Transcripción literal de "TIEMPOS DE RESPUESTA.xlsx" (pestañas LISTA DE UBICACIONES,
  ÁRBOL DE SERVICIOS, CANTIDAD DE EQUIPOS y TIEMPOS DE RESPUESTA) usada como *oráculo
  independiente* de PUNTAJES / ESCALA_CANTIDAD / ESCALA_TIEMPOS en Código.gs.

  El valor de la prueba está en la independencia: si alguien edita un puntaje en el código
  sin actualizar el Excel (o al revés), la suite falla y señala exactamente qué fila difiere.
  Por eso este archivo NO debe importar nada de PUNTAJES: repite los datos a mano.

  `probarServicios()` cubre, para cada servicio del árbol y cada una de sus variantes de
  escritura (Excel, formulario, rangos con nombre de la hoja `tabla_serv`), el puntaje
  resuelto, el nombre canónico, la ausencia de avisos y la etiqueta de plazo resultante.
*/

// --- Pestaña "LISTA DE UBICACIONES" --------------------------------------
// { edificio, excel: como se escribe en el Excel, canonico: clave de PUNTAJES, puntos,
//   variantes: otras grafías que el formulario puede enviar }
const CAT_UBICACIONES = [
  // Edificio 310
  { edificio: "310", excel: "AUDITORIO PRINCIPAL", canonico: "Auditorio Principal", puntos: 10 },
  { edificio: "310", excel: "AUDITORIOS AUXILIARES", canonico: "Auditorios Auxiliares", puntos: 10 },
  { edificio: "310", excel: "BIBLIOTECA", canonico: "Biblioteca", puntos: 20 },
  { edificio: "310", excel: "CADE - OFICINAS PROGRAMAS CURRICULARES", canonico: "CADE - Oficinas Programas Curriculares", puntos: 10 },
  { edificio: "310", excel: "OFICINA APOYO A LA GESTIÓN", canonico: "Oficina Apoyo a la Gestión", puntos: 20 },
  // El Excel trae el error de dedo "CONTABILILIDAD"; el formulario usa el nombre completo.
  { edificio: "310", excel: "OFICINA AREA C. DE CONTABILILIDAD Y F.", canonico: "Oficina Área Curricular de Contabilidad y Finanzas", puntos: 10, variantes: ["Oficina Area C. de Contabilidad y F."] },
  { edificio: "310", excel: "OFICINA AREA C. DE ECONOMÍA Y DES.", canonico: "Oficina Área Curricular de Economía y Desarrollo", puntos: 10 },
  { edificio: "310", excel: "OFICINA AREA C. DE GESTIÓN Y ORG.", canonico: "Oficina Área Curricular de Gestión y Organizaciones", puntos: 10 },
  { edificio: "310", excel: "OFICINA BIENESTAR", canonico: "Oficina Bienestar", puntos: 10 },
  { edificio: "310", excel: "OFICINA DE SOPORTE TÉCNICO", canonico: "Oficina de Soporte Técnico", puntos: 20 },
  { edificio: "310", excel: "OFICINA ORI", canonico: "Oficina ORI", puntos: 10 },
  { edificio: "310", excel: "SALA 1", canonico: "Sala de Informática 1", puntos: 20 },
  { edificio: "310", excel: "SALA 2", canonico: "Sala de Informática 2", puntos: 20 },
  { edificio: "310", excel: "SALA 3", canonico: "Sala de Informática 3", puntos: 20 },
  { edificio: "310", excel: "SALA DE JUNTAS", canonico: "Sala de Juntas", puntos: 5 },
  { edificio: "310", excel: "SALA DE VIDEOCONFERENCIAS", canonico: "Sala de Videoconferencias", puntos: 5 },
  { edificio: "310", excel: "SALONES 310", canonico: "Salones 310", puntos: 10 },
  { edificio: "310", excel: "UACE - SALÓN 205", canonico: "UACE - Salón 205", puntos: 20 },
  { edificio: "310", excel: "UNIDAD DE INFORMÁTICA", canonico: "UIFCE", puntos: 10 },

  // Edificio 311
  { edificio: "311", excel: "ARCHIVO 311", canonico: "Archivo 311", puntos: 10 },
  { edificio: "311", excel: "DECANATURA", canonico: "Decanatura", puntos: 1 },
  { edificio: "311", excel: "OFICINA DE APOYO DOCENTE 311", canonico: "Oficina de Apoyo Docente 311", puntos: 20 },
  { edificio: "311", excel: "OFICINA DE CALIFICACIONES", canonico: "Oficina de Calificaciones", puntos: 10 },
  // "OFICINAS DOCENTES" existe en 311 y en 238 con puntajes distintos: solo el edificio decide.
  { edificio: "311", excel: "OFICINAS DOCENTES", canonico: "Oficinas Docentes 311", puntos: 20, ambigua: true },
  { edificio: "311", excel: "SALONES 311", canonico: "Salones 311", puntos: 10 },
  { edificio: "311", excel: "SECRETARÍA ACADÉMICA", canonico: "Secretaría de Facultad", puntos: 5 },
  { edificio: "311", excel: "UNIDAD ADMINISTRATIVA", canonico: "Unidad Administrativa", puntos: 5 },
  { edificio: "311", excel: "VICEDECANATURA", canonico: "Vicedecanatura", puntos: 1 },

  // Edificio 238
  { edificio: "238", excel: "ARCHIVO 238", canonico: "Archivo 238", puntos: 20 },
  { edificio: "238", excel: "CENTRO EDITORIAL", canonico: "Centro Editorial", puntos: 20 },
  { edificio: "238", excel: "COMUNICACIONES", canonico: "Comunicaciones", puntos: 20 },
  { edificio: "238", excel: "OFICINA DE APOYO DOCENTE 238", canonico: "Oficina de Apoyo Docente 238", puntos: 20 },
  { edificio: "238", excel: "OFICINAS DOCENTES", canonico: "Oficinas Docentes 238", puntos: 10, ambigua: true },
  { edificio: "238", excel: "SALA 6", canonico: "Sala de Informática 6", puntos: 30 },
  { edificio: "238", excel: "SALONES 238", canonico: "Salones 238", puntos: 30 },
  { edificio: "238", excel: "UACE - OFICINA", canonico: "UACE - Oficina", puntos: 20 },
  { edificio: "238", excel: "UNIDAD DE EMPRENDIMIENTO", canonico: "Unidad de Emprendimiento", puntos: 20 },
  { edificio: "238", excel: "VICEDECANATURA DE INVESTIGACIÓN Y EXT.", canonico: "Vicedecanatura de Investigación y Extensión", puntos: 10 }
];

// Grafías con que puede llegar el edificio (la columna del formulario, los rangos con
// nombre de `tabla_ub` y la escritura libre de una migración).
const VARIANTES_EDIFICIO = {
  "310": ["310", "ED_310", "Edificio 310", 310],
  "311": ["311", "ED_311", "Edificio 311", 311],
  "238": ["238", "ED_238", "Edificio 238", 238]
};

// --- Pestaña "ÁRBOL DE SERVICIOS", columna CATEGORIA ----------------------
// Cada categoría con todas sus grafías: nombre largo del Excel (con la descripción entre
// paréntesis, tal cual la escribe el formulario), nombre corto y rango con nombre de `tabla_serv`.
const CAT_CATEGORIAS = {
  "Conceptos Técnicos": [
    "CONCEPTOS TÉCNICOS (Solicitudes de conceptos técnicos para bajas, conceptos técnicos para compras y directrices técnicas)",
    "CONCEPTOS TÉCNICOS",
    "Conceptos Técnicos",
    "CONCEPTOS_TECNICOS",
    "Conceptos_Tecnicos"
  ],
  "Impresoras": [
    "IMPRESORAS (Solicitudes de mantenimientos preventivos, instalación o conexión a la red, cambio de toner o fallas de red)",
    "IMPRESORAS",
    "Impresoras"
  ],
  "PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO": [
    "PC Y PORTATILES - INSTALACIÓN Y ALISTAMIENTO (Solicitudes de instalación de equipos nuevos, instalación de Office y antivirus institucionales)",
    "PC Y PORTATILES - INSTALACIÓN Y ALISTAMIENTO",
    "PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO"
  ],
  "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN": [
    "PC Y PORTATILES - CAMBIO DE UBICACIÓN (Solicitudes de cambio de ubicación de equipos entre oficinas o edificios)",
    "PC Y PORTATILES - CAMBIO DE UBICACIÓN",
    "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN"
  ],
  "PC y Portátiles - Mantenimiento Preventivo": [
    "PC Y PORTATILES - MANTENIMIENTO PREVENTIVO (Solicitudes de limpieza interna y externa de equipos de cómputo)",
    "PC Y PORTATILES - MANTENIMIENTO PREVENTIVO",
    "PC y Portátiles - Mantenimiento Preventivo",
    "PC_Y_PORTATILES_MTO_PREVENTIVO",
    "PC_y_Portatiles_Mto_Preventivo"
  ],
  "PC y Portátiles - Revisión y Reparación": [
    "PC Y PORTATILES - REVISIÓN Y REPARACIÓN (Solicitudes de revision y reparacion de Hardware, software o problemas de conectividad a la red o internet)",
    "PC Y PORTATILES - REVISIÓN Y REPARACIÓN",
    "PC y Portátiles - Revisión y Reparación",
    "PC_Y_PORTATILES_REVISION_REPARACION",
    "PC_y_Portatiles_Revision_Reparacion"
  ],
  "Software - Instalación o Actualización": [
    "SOFTWARE - INSTALACIÓN O ACTUALIZACIÓN (Solicitudes de instalación de software, configuración de VPN)",
    "SOFTWARE - INSTALACIÓN O ACTUALIZACIÓN",
    "Software - Instalación o Actualización",
    "SOFTWARE_INSTALACION_ACTUALIZACION",
    "Software_Instalacion_Actualizacion"
  ],
  "Telefonía": [
    "TELEFONÍA (Solicitudes de revisión de problemas con teléfonos)",
    "TELEFONÍA",
    "TELEFONIA",
    "Telefonía"
  ],
  "Video - Proyectores o Pantallas": [
    // El Excel trae un espacio inicial en esta celda; nombreCategoria() lo recorta.
    " VIDEO - PROYECTORES O PANTALLAS (Solicitudes de mantenimiento preventivo, revision de fallas en la proyección de videoproyectores, TVs, monitores o pantallas interactivas)",
    "VIDEO - PROYECTORES O PANTALLAS",
    "Video - Proyectores o Pantallas",
    "VIDEO_PROYECTORES_PANTALLAS",
    "Video_Proyectores_Pantallas"
  ],
  "Servidor web y bases de datos": [
    "SERVIDORES (Unicamente para solicitudes relacionadas con los servidores de la Facultad)",
    "SERVIDORES",
    "Servidores",
    "Servidor web y bases de datos"
  ]
};

// --- Pestaña "ÁRBOL DE SERVICIOS", hojas -----------------------------------
// Un registro por hoja del árbol (29 del Excel + 2 extensiones que solo existen en el
// formulario). `grupo` es la SUBCATEGORIA 1 del Excel cuando la hay: el formulario la
// pregunta aparte y NO debe puntuarse como servicio.
const CAT_SERVICIOS = [
  { categoria: "Conceptos Técnicos", excel: "BAJAS", canonico: "Bajas", puntos: 50 },
  { categoria: "Conceptos Técnicos", excel: "COMPRAS", canonico: "Compras", puntos: 70 },
  { categoria: "Conceptos Técnicos", excel: "DIRECTRICES TÉCNICAS", canonico: "Directrices Técnicas", puntos: 70 },

  // "MANTENIMIENTO PREVENTIVO" y "OTRO" se repiten en otras categorías con otro puntaje:
  // el nombre canónico los desambigua y ALIAS.SERVICIO traduce la grafía del Excel.
  { categoria: "Impresoras", excel: "MANTENIMIENTO PREVENTIVO", canonico: "Mantenimiento Preventivo Impresora", puntos: 30, homonimo: true },
  { categoria: "Impresoras", excel: "INSTALACIÓN O CONEXIÓN", canonico: "Instalación o Conexión", puntos: 10 },
  { categoria: "Impresoras", excel: "INSTALACIÓN DE TONER", canonico: "Instalación de Toner", puntos: 10 },
  { categoria: "Impresoras", excel: "FALLA DE RED", canonico: "Falla de Red", puntos: 10 },
  { categoria: "Impresoras", excel: "OTRO", canonico: "Otros", puntos: 20, homonimo: true },

  { categoria: "PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO", excel: "INSTALACIÓN Y ALISTAMIENTO", canonico: "Instalación y Alistamiento", puntos: 25, unica: true },
  { categoria: "PC Y PORTÁTILES - CAMBIO DE UBICACIÓN", excel: "MOVIMIENTO DE EQUIPOS ENTRE OFICINAS", canonico: "Movimiento de equipos entre oficinas", puntos: 20, unica: true },
  { categoria: "PC y Portátiles - Mantenimiento Preventivo", excel: "LIMPIEZA INTERNA Y EXTERNA", canonico: "Limpieza Interna y Externa", puntos: 25, unica: true },

  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "HARDWARE", excel: "EQUIPO NO ENCIENDE", canonico: "Equipo no enciende", puntos: 5 },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "HARDWARE", excel: "DAÑO EN PERIFERICOS (TECLADO, MOUSE, ETC.)", canonico: "Daño en periféricos (Teclado, Mouse, etc)", puntos: 5 },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "SOFTWARE", excel: "EQUIPO NO INICIA, PANTALLA NEGRA", canonico: "Equipo no inicia - pantalla negra", puntos: 5 },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "SOFTWARE", excel: "EQUIPO LENTO", canonico: "Equipo Lento", puntos: 10 },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "SOFTWARE", excel: "SOFTWARE CON FALLAS", canonico: "Software con fallas", puntos: 5 },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "INTERNET Y CONECTIVIDAD", excel: "EQUIPO SIN INTERNET, NO NAVEGA", canonico: "Equipo sin internet - No navega", puntos: 5 },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "INTERNET Y CONECTIVIDAD", excel: "ACCESO A SERVIDOR DE ARCHIVOS", canonico: "Acceso a servidor de archivos", puntos: 10 },
  // Extensiones: el grupo "Usuario" existe en el formulario pero no en el Excel.
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "USUARIO", canonico: "Creación de usuarios en Windows", puntos: 10, extension: true },
  { categoria: "PC y Portátiles - Revisión y Reparación", grupo: "USUARIO", canonico: "Falla de inicio de sesión en Windows", puntos: 5, extension: true },

  { categoria: "Software - Instalación o Actualización", excel: "OFFICE", canonico: "Office", puntos: 10 },
  { categoria: "Software - Instalación o Actualización", excel: "VPN", canonico: "VPN", puntos: 10 },
  { categoria: "Software - Instalación o Actualización", excel: "OTRO", canonico: "Otro", puntos: 10, homonimo: true },

  { categoria: "Telefonía", excel: "TELEFONO SIN SERVICIO", canonico: "Teléfono sin servicio", puntos: 10 },
  { categoria: "Telefonía", excel: "CAMBIO O REPARACIÓN DE CABLES", canonico: "Cambio o Reparación de cables", puntos: 10 },

  { categoria: "Video - Proyectores o Pantallas", excel: "MANTENIMIENTO PREVENTIVO", canonico: "Mantenimiento Preventivo", puntos: 10, homonimo: true },
  { categoria: "Video - Proyectores o Pantallas", excel: "NO PROYECTA, IMAGEN CON PROBLEMAS", canonico: "No proyecta - Imagen con problemas", puntos: 5 },
  { categoria: "Video - Proyectores o Pantallas", excel: "OTRO", canonico: "Otro", puntos: 10, homonimo: true },

  { categoria: "Servidor web y bases de datos", grupo: "SERVIDOR WEB Y BASES DE DATOS", excel: "INSTALACION / ACTUALIZACION DE PAQUETES", canonico: "Instalación / Actualización de paquetes", puntos: 10 },
  { categoria: "Servidor web y bases de datos", grupo: "SERVIDOR WEB Y BASES DE DATOS", excel: "CARGA DE ARCHIVOS", canonico: "Carga de archivos", puntos: 10 },
  { categoria: "Servidor web y bases de datos", grupo: "SERVIDOR WEB Y BASES DE DATOS", excel: "BACKUPS", canonico: "Backups", puntos: 10 }
];

// --- Pestaña "CANTIDAD DE EQUIPOS" ----------------------------------------
const CAT_CANTIDAD = [
  { rango: "1 A 3", desde: 1, hasta: 3, puntos: 1 },
  { rango: "4 A 14", desde: 4, hasta: 14, puntos: 10 },
  { rango: "15 A 30", desde: 15, hasta: 30, puntos: 20 },
  { rango: "MAS DE 30", desde: 31, hasta: 1000, puntos: 35 }
];

// --- Pestaña "TIEMPOS DE RESPUESTA" ---------------------------------------
const CAT_TIEMPOS = [
  { desde: 1, hasta: 10, etiqueta: "24 HORAS", horas: 24 },
  { desde: 11, hasta: 20, etiqueta: "48 HORAS", horas: 48 },
  { desde: 21, hasta: 30, etiqueta: "72 HORAS", horas: 72 },
  { desde: 31, hasta: 40, etiqueta: "5 DIAS", horas: 120 },
  { desde: 41, hasta: 50, etiqueta: "10 DIAS", horas: 240 },
  { desde: 51, hasta: 60, etiqueta: "15 DIAS", horas: 360 },
  { desde: 61, hasta: 70, etiqueta: "DURANTE EL SEMESTRE ACADÉMICO", horas: 2160 },
  { desde: 71, hasta: Infinity, etiqueta: "NO ESTABLECIDO", horas: 2160 }
];

// Oráculo independiente: puntaje total -> etiqueta, leyendo solo CAT_TIEMPOS.
function etiquetaEsperada(total) {
  const tramo = CAT_TIEMPOS.find(t => total >= t.desde && total <= t.hasta);
  return tramo ? tramo.etiqueta : CAT_TIEMPOS[0].etiqueta;
}

// Oráculo independiente: cantidad -> puntos, leyendo solo CAT_CANTIDAD.
function puntosCantidadEsperados(n) {
  const tramo = CAT_CANTIDAD.find(t => n >= t.desde && n <= t.hasta);
  return tramo ? tramo.puntos : CAT_CANTIDAD[CAT_CANTIDAD.length - 1].puntos;
}

// Todas las grafías aceptadas de un servicio: canónica, la del Excel y las declaradas.
function variantesDeServicio(s) {
  const lista = [s.canonico];
  if (s.excel && s.excel !== s.canonico) lista.push(s.excel);
  (s.variantes || []).forEach(v => lista.push(v));
  return lista;
}

// Todas las grafías aceptadas de una ubicación.
function variantesDeUbicacion(u) {
  const lista = [u.canonico];
  if (u.excel !== u.canonico) lista.push(u.excel);
  (u.variantes || []).forEach(v => lista.push(v));
  return lista;
}

/*
  =================================================================
  --- SUITE ---
  =================================================================
*/

function probarServicios() {
  const fallos = [];
  let casos = 0;
  const fallar = m => { if (fallos.length < 60) fallos.push(m); else if (fallos.length === 60) fallos.push("… (se omiten los demás)"); };

  // ---- B1. La escala de tiempos del código coincide con la del Excel, tramo por tramo.
  CAT_TIEMPOS.forEach(t => {
    const limites = t.hasta === Infinity ? [t.desde, 200, 1000] : [t.desde, t.hasta];
    limites.forEach(p => {
      casos++;
      const obtenido = calcularTiempo(p);
      if (obtenido !== t.etiqueta) fallar(`B1 escala de tiempos: puntaje ${p} → esperado "${t.etiqueta}", obtenido "${obtenido}"`);
      casos++;
      if (horasDeTiempo(t.etiqueta) !== t.horas) fallar(`B1 horas de "${t.etiqueta}": esperado ${t.horas}, obtenido ${horasDeTiempo(t.etiqueta)}`);
    });
  });
  // Puntaje mínimo posible del sistema (1 + 1 + 1 = 3) y frontera inferior 0.
  casos++;
  if (calcularTiempo(0) !== "24 HORAS") fallar(`B1 puntaje 0 debería caer en el primer tramo, obtenido "${calcularTiempo(0)}"`);

  // ---- B2. La escala de cantidad del código coincide con la del Excel.
  CAT_CANTIDAD.forEach(t => {
    const valores = t.hasta === 1000 ? [t.desde, 50, 500] : [t.desde, t.hasta];
    valores.forEach(n => {
      casos++;
      const obtenido = getPuntajeCantidad(n);
      if (obtenido !== t.puntos) fallar(`B2 cantidad ${n} (tramo "${t.rango}"): esperado ${t.puntos}, obtenido ${obtenido}`);
      // La misma cantidad escrita como texto libre debe dar lo mismo.
      casos++;
      const texto = getPuntajeCantidad(`${n} equipos`);
      if (texto !== t.puntos) fallar(`B2 cantidad "${n} equipos": esperado ${t.puntos}, obtenido ${texto}`);
    });
  });
  // Entradas degeneradas: nunca deben reventar ni saltar de tramo.
  [["", 1], [0, 1], [-5, 1], [null, 1], [undefined, 1], ["sin dato", 1], ["  7  ", 10]].forEach(([entrada, esperado]) => {
    casos++;
    const obtenido = getPuntajeCantidad(entrada);
    if (obtenido !== esperado) fallar(`B2 cantidad ${JSON.stringify(entrada)}: esperado ${esperado}, obtenido ${obtenido}`);
  });

  // ---- B3. Cada ubicación del Excel, en cada grafía y con cada forma de escribir el edificio.
  CAT_UBICACIONES.forEach(u => {
    variantesDeUbicacion(u).forEach(nombre => {
      VARIANTES_EDIFICIO[u.edificio].forEach(edificio => {
        casos++;
        const r = buscarPuntajeUbicacion(edificio, nombre);
        if (r.puntos !== u.puntos) {
          fallar(`B3 ubicación ${u.edificio}/"${nombre}" (edificio "${edificio}"): esperado ${u.puntos}, obtenido ${r.puntos} — ${r.aviso || "sin aviso"}`);
        } else if (r.nombre !== u.canonico) {
          fallar(`B3 ubicación ${u.edificio}/"${nombre}": nombre canónico esperado "${u.canonico}", obtenido "${r.nombre}"`);
        } else if (r.aviso) {
          fallar(`B3 ubicación ${u.edificio}/"${nombre}" (edificio "${edificio}") no debería avisar: ${r.aviso}`);
        }
      });
    });
  });

  // ---- B4. Cada servicio del árbol, en cada grafía y bajo cada grafía de su categoría.
  CAT_SERVICIOS.forEach(s => {
    const categorias = CAT_CATEGORIAS[s.categoria];
    if (!categorias) { casos++; fallar(`B4 categoría "${s.categoria}" sin variantes declaradas en CAT_CATEGORIAS`); return; }
    variantesDeServicio(s).forEach(servicio => {
      categorias.forEach(categoria => {
        casos++;
        const r = buscarPuntajeServicio(categoria, servicio);
        if (r.puntos !== s.puntos) {
          fallar(`B4 servicio "${servicio}" en "${nombreCategoria(categoria)}": esperado ${s.puntos}, obtenido ${r.puntos} — ${r.aviso || "sin aviso"}`);
        } else if (r.nombre !== s.canonico) {
          fallar(`B4 servicio "${servicio}" en "${nombreCategoria(categoria)}": canónico esperado "${s.canonico}", obtenido "${r.nombre}"`);
        } else if (r.aviso) {
          fallar(`B4 servicio "${servicio}" en "${nombreCategoria(categoria)}" no debería avisar: ${r.aviso}`);
        }
      });
    });
  });

  // ---- B5. Los selectores de grupo del formulario nunca puntúan como servicio.
  const gruposDelArbol = CAT_SERVICIOS.filter(s => s.grupo).map(s => s.grupo)
    .filter((g, i, a) => a.indexOf(g) === i)
    .concat(["Hardware", "Software", "Conectividad", "Internet y Conectividad", "Usuario"])
    .filter((g, i, a) => a.indexOf(g) === i);
  gruposDelArbol.forEach(grupo => {
    // "SERVIDOR WEB Y BASES DE DATOS" es a la vez grupo del Excel y nombre canónico de la
    // categoría en el código; el formulario no lo envía como valor, así que se excluye.
    if (normalizarTexto(grupo) === normalizarTexto("Servidor web y bases de datos")) return;
    casos++;
    if (!esGrupo(grupo)) fallar(`B5 "${grupo}" debería reconocerse como selector de grupo, no como servicio`);
    casos++;
    const fila = []; fila[CONFIG.COL.SERVICIO[0] - 1] = grupo;
    if (extraerServicio(fila, CONFIG.COL.SERVICIO, "PC y Portátiles - Revisión y Reparación") !== "") {
      fallar(`B5 extraerServicio no debería devolver el grupo "${grupo}"`);
    }
  });
  // Grupo en una columna y servicio en otra: se toma el servicio, no el grupo.
  CAT_SERVICIOS.filter(s => s.grupo && s.categoria === "PC y Portátiles - Revisión y Reparación").forEach(s => {
    casos++;
    const fila = [];
    fila[CONFIG.COL.SERVICIO[0] - 1] = s.grupo;
    fila[CONFIG.COL.SERVICIO[3] - 1] = s.canonico;
    const obtenido = extraerServicio(fila, CONFIG.COL.SERVICIO, s.categoria);
    if (obtenido !== s.canonico) fallar(`B5 con grupo "${s.grupo}" + servicio "${s.canonico}" se obtuvo "${obtenido}"`);
  });

  // ---- B6. Categorías de un solo servicio: el formulario no hace subpregunta y llega vacío.
  CAT_SERVICIOS.filter(s => s.unica).forEach(s => {
    CAT_CATEGORIAS[s.categoria].forEach(categoria => {
      ["", null, undefined, "   "].forEach(vacio => {
        casos++;
        const r = buscarPuntajeServicio(categoria, vacio);
        if (r.puntos !== s.puntos || r.nombre !== s.canonico) {
          fallar(`B6 "${nombreCategoria(categoria)}" sin servicio: esperado ${s.puntos}/"${s.canonico}", obtenido ${r.puntos}/"${r.nombre}"`);
        }
      });
    });
  });
  // Una categoría con varias opciones y servicio vacío NO debe adivinar.
  ["Impresoras", "Conceptos Técnicos", "Telefonía", "Video - Proyectores o Pantallas", "Software - Instalación o Actualización", "Servidor web y bases de datos", "PC y Portátiles - Revisión y Reparación"].forEach(cat => {
    casos++;
    const r = buscarPuntajeServicio(cat, "");
    if (r.puntos !== null || !r.aviso) fallar(`B6 "${cat}" sin servicio debería quedar sin resolver y avisar, obtenido ${r.puntos}`);
  });

  // ---- B7. Homónimos: el mismo texto vale distinto según la categoría.
  const homonimos = {};
  CAT_SERVICIOS.forEach(s => variantesDeServicio(s).forEach(v => {
    const k = normalizarTexto(v);
    (homonimos[k] = homonimos[k] || []).push(s);
  }));
  Object.keys(homonimos).filter(k => {
    const puntajes = homonimos[k].map(s => s.puntos).filter((p, i, a) => a.indexOf(p) === i);
    return homonimos[k].length > 1 && puntajes.length > 1;
  }).forEach(k => {
    homonimos[k].forEach(s => {
      casos++;
      const r = buscarPuntajeServicio(s.categoria, k);
      if (r.puntos !== s.puntos) fallar(`B7 homónimo "${k}" en "${s.categoria}": esperado ${s.puntos}, obtenido ${r.puntos}`);
    });
    // Sin categoría reconocible, un homónimo con puntajes distintos debe quedar sin resolver.
    casos++;
    const ciego = buscarPuntajeServicio("Categoría inexistente", k);
    if (ciego.puntos !== null) fallar(`B7 homónimo "${k}" sin categoría debería quedar sin resolver, obtenido ${ciego.puntos} ("${ciego.nombre}")`);
  });

  // ---- B8. Matriz exhaustiva ubicación × servicio × tramo de cantidad.
  // Verifica la suma y la etiqueta contra los oráculos del Excel, no contra el código.
  const cantidades = CAT_CANTIDAD.map(t => t.desde);
  CAT_UBICACIONES.forEach(u => {
    CAT_SERVICIOS.forEach(s => {
      cantidades.forEach(cantidad => {
        casos++;
        const r = calcularPuntaje({ edificio: u.edificio, ubicacion: u.excel, categoria: CAT_CATEGORIAS[s.categoria][0], servicio: s.excel || s.canonico, cantidad });
        const ptsCantidad = puntosCantidadEsperados(cantidad);
        const total = u.puntos + s.puntos + ptsCantidad;
        const etiqueta = etiquetaEsperada(total);
        if (r.total !== total || r.tiempo !== etiqueta || r.avisos.length) {
          fallar(`B8 ${u.edificio}/"${u.excel}" + "${s.excel || s.canonico}" × ${cantidad}: esperado ${u.puntos}+${s.puntos}+${ptsCantidad}=${total} "${etiqueta}", obtenido ${r.ptsUbicacion}+${r.ptsServicio}+${r.ptsCantidad}=${r.total} "${r.tiempo}"${r.avisos.length ? " — " + r.avisos.join(" | ") : ""}`);
        }
      });
    });
  });

  // ---- B9. Completitud en ambos sentidos entre el Excel y PUNTAJES.
  const enCodigoUb = [];
  Object.keys(PUNTAJES.UBICACION).forEach(ed => Object.keys(PUNTAJES.UBICACION[ed]).forEach(n => enCodigoUb.push(`${ed}|${n}`)));
  const enExcelUb = CAT_UBICACIONES.map(u => `${u.edificio}|${u.canonico}`);
  enExcelUb.filter(k => enCodigoUb.indexOf(k) === -1).forEach(k => { casos++; fallar(`B9 ubicación del Excel ausente en PUNTAJES: ${k}`); });
  enCodigoUb.filter(k => enExcelUb.indexOf(k) === -1).forEach(k => { casos++; fallar(`B9 ubicación en PUNTAJES que no está en el Excel: ${k}`); });
  casos++;
  if (enCodigoUb.length !== enExcelUb.length) fallar(`B9 el Excel tiene ${enExcelUb.length} ubicaciones y PUNTAJES ${enCodigoUb.length}`);

  const enCodigoServ = [];
  Object.keys(PUNTAJES.SERVICIOS).forEach(cat => Object.keys(PUNTAJES.SERVICIOS[cat]).forEach(s => enCodigoServ.push(`${cat}|${s}`)));
  const enExcelServ = CAT_SERVICIOS.map(s => `${s.categoria}|${s.canonico}`);
  enExcelServ.filter(k => enCodigoServ.indexOf(k) === -1).forEach(k => { casos++; fallar(`B9 servicio del catálogo ausente en PUNTAJES: ${k}`); });
  enCodigoServ.filter(k => enExcelServ.indexOf(k) === -1).forEach(k => { casos++; fallar(`B9 servicio en PUNTAJES que no está en el catálogo: ${k}`); });
  casos++;
  if (enCodigoServ.length !== enExcelServ.length) fallar(`B9 el catálogo tiene ${enExcelServ.length} servicios y PUNTAJES ${enCodigoServ.length}`);
  // Las dos extensiones (grupo "Usuario") no están en el Excel: deben seguir declaradas como tales.
  casos++;
  if (CAT_SERVICIOS.filter(s => s.extension).length !== 2) fallar("B9 se esperaban 2 servicios marcados como extensión del formulario");

  // Cada categoría canónica declarada en CAT_CATEGORIAS existe en PUNTAJES y viceversa.
  Object.keys(CAT_CATEGORIAS).forEach(cat => { casos++; if (!PUNTAJES.SERVICIOS[cat]) fallar(`B9 categoría "${cat}" del catálogo no existe en PUNTAJES`); });
  Object.keys(PUNTAJES.SERVICIOS).forEach(cat => { casos++; if (!CAT_CATEGORIAS[cat]) fallar(`B9 categoría "${cat}" de PUNTAJES no está en el catálogo`); });

  // ---- B10. Robustez: nada desconocido puede dar 0 ni pasar en silencio.
  [
    { titulo: "servicio inexistente", datos: { edificio: "310", ubicacion: "Biblioteca", categoria: "Impresoras", servicio: "Cambiar la bombilla", cantidad: 1 }, avisos: 1 },
    { titulo: "ubicación inexistente", datos: { edificio: "310", ubicacion: "Cafetería", categoria: "Impresoras", servicio: "Falla de Red", cantidad: 1 }, avisos: 1 },
    { titulo: "categoría inexistente con servicio único global", datos: { edificio: "310", ubicacion: "Biblioteca", categoria: "Nueva categoría", servicio: "Backups", cantidad: 1 }, avisos: 1 },
    { titulo: "todo vacío", datos: { edificio: "", ubicacion: "", categoria: "", servicio: "", cantidad: "" }, avisos: 2 },
    { titulo: "todo nulo", datos: { edificio: null, ubicacion: null, categoria: null, servicio: null, cantidad: null }, avisos: 2 }
  ].forEach(c => {
    casos++;
    const r = calcularPuntaje(c.datos);
    if (r.avisos.length !== c.avisos) fallar(`B10 ${c.titulo}: esperados ${c.avisos} avisos, obtenidos ${r.avisos.length} (${r.avisos.join(" | ")})`);
    casos++;
    if (r.total <= 0 || !r.tiempo) fallar(`B10 ${c.titulo}: total ${r.total} y etiqueta "${r.tiempo}"; nunca debe quedar en 0 ni vacío`);
  });
  // Un componente no resuelto usa el puntaje neutro, no 0 (hallazgo H-01). La constante
  // se verifica contra su contrato, no contra sí misma: si volviera a 0, una solicitud
  // enteramente irreconocible caería en el tramo más urgente y el fallo pasaría inadvertido.
  casos++;
  if (!(PUNTAJE_SIN_COINCIDENCIA > 0)) fallar(`B10 PUNTAJE_SIN_COINCIDENCIA debe ser > 0 para no simular máxima urgencia, vale ${PUNTAJE_SIN_COINCIDENCIA}`);
  casos++;
  const irreconocible = calcularPuntaje({ edificio: "999", ubicacion: "Cafetería", categoria: "Nueva categoría", servicio: "Cambiar la bombilla", cantidad: 1 });
  if (irreconocible.tiempo === CAT_TIEMPOS[0].etiqueta) {
    fallar(`B10 una solicitud irreconocible no puede quedar en el tramo más urgente ("${CAT_TIEMPOS[0].etiqueta}"): total ${irreconocible.total}`);
  }
  casos++;
  const neutro = calcularPuntaje({ edificio: "310", ubicacion: "Cafetería", categoria: "Impresoras", servicio: "Cambiar la bombilla", cantidad: 1 });
  if (neutro.ptsUbicacion !== PUNTAJE_SIN_COINCIDENCIA || neutro.ptsServicio !== PUNTAJE_SIN_COINCIDENCIA) {
    fallar(`B10 puntaje neutro: esperado ${PUNTAJE_SIN_COINCIDENCIA}+${PUNTAJE_SIN_COINCIDENCIA}, obtenido ${neutro.ptsUbicacion}+${neutro.ptsServicio}`);
  }
  // Ubicación de otro edificio: se resuelve pero deja aviso (salvo las ambiguas entre edificios).
  CAT_UBICACIONES.filter(u => !u.ambigua).forEach(u => {
    const otro = Object.keys(VARIANTES_EDIFICIO).find(e => e !== u.edificio);
    casos++;
    const r = buscarPuntajeUbicacion(otro, u.excel);
    if (r.puntos !== u.puntos) fallar(`B10 "${u.excel}" con edificio equivocado (${otro}): esperado ${u.puntos}, obtenido ${r.puntos}`);
    else if (!r.aviso) fallar(`B10 "${u.excel}" con edificio equivocado (${otro}) debería dejar aviso`);
  });
  // Las ambiguas (mismo nombre en dos edificios) no se pueden resolver sin edificio.
  CAT_UBICACIONES.filter(u => u.ambigua).forEach(u => {
    casos++;
    const r = buscarPuntajeUbicacion("", u.excel);
    if (r.puntos !== null) fallar(`B10 "${u.excel}" sin edificio es ambigua y no debería resolverse, obtenido ${r.puntos}`);
  });

  // ---- B11. Todo servicio del catálogo aparece en la lista desplegable de la bandeja.
  CAT_SERVICIOS.forEach(s => {
    casos++;
    if (LISTA_SERVICIOS.indexOf(s.canonico) === -1) fallar(`B11 "${s.canonico}" falta en LISTA_SERVICIOS (desplegable de Pendientes)`);
  });

  const resumen = fallos.length
    ? `${fallos.length} problema(s) en ${casos} casos:\n${fallos.join("\n")}`
    : `${casos} casos correctos (${CAT_SERVICIOS.length} servicios × ${CAT_UBICACIONES.length} ubicaciones × ${CAT_CANTIDAD.length} tramos de cantidad, más variantes de escritura).`;
  mostrarResultado("Prueba del catálogo de servicios", resumen);
  return fallos.length === 0;
}
