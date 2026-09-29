// Estructura del formulario de producción (1gs6Glax…), leída con la API de Forms el
// 29/09/2026: preguntas en el orden en que aparecen como columnas en Respuestas_Oficiales,
// y la ramificación edificio → ubicación y categoría → servicio. Sin respuestas ni datos
// personales. Si el formulario cambia, actualice este archivo y vuelva a correr
// `npm run test:produccion`.

const CATEGORIAS = {
  CONCEPTOS: "Conceptos Técnicos (Solicitudes de conceptos técnicos para bajas, conceptos técnicos para compras y directrices técnicas)",
  IMPRESORAS: "Impresoras (Solicitudes de mantenimientos preventivos, instalación o conexión a la red, cambio de toner o fallas de red)",
  PC_MTO: "PC y Portátiles - Mantenimiento Preventivo (Solicitudes de limpieza interna y externa de equipos de cómputo)",
  PC_REV: "PC y Portátiles - Revisión y Reparación (Solicitudes de revision y reparacion de Hardware, software o problemas de conectividad a la red o internet)",
  SOFTWARE: "Software - Instalación o Actualización (Solicitudes de instalación de software, configuración de VPN)",
  TELEFONIA: "Telefonía (Solicitudes de revisión de problemas con teléfonos)",
  VIDEO: "Video - Proyectores o Pantallas (Solicitudes de mantenimiento preventivo, revision de fallas en la proyección de videoproyectores, TVs, monitores o pantallas interactivas)",
  SERVIDOR: "Servidor web y bases de datos (Únicamente para solicitudes relacionadas con los servidores de la Facultad)"
};

// Una entrada por columna de la hoja (A = radicado, que añade el script).
// rol: qué es la columna; seccion: a qué opción de la pregunta anterior pertenece.
const COLUMNAS = [
  { titulo: "Radicado", rol: "CODIGO" },
  { titulo: "Marca temporal", rol: "TIMESTAMP" },
  { titulo: "Dirección de correo electrónico", rol: "EMAIL" },
  { titulo: "Nombres y Apellidos:", rol: "NOMBRE" },
  { titulo: "Teléfono o extensión:", rol: "TELEFONO" },
  { titulo: "Seleccione el Edificio donde se necesita el servicio:", rol: "EDIFICIO", opciones: ["310", "311", "238"] },
  { titulo: "Seleccione la ubicación exacta donde se necesita el servicio:", rol: "UBICACION", edificio: "310", opciones: [
    "Auditorio Principal", "Auditorios Auxiliares", "Biblioteca", "CADE - Oficinas Programas Curriculares",
    "Oficina Apoyo a la Gestión", "Oficina Área Curricular de Contabilidad y Finanzas",
    "Oficina Área Curricular de Economía y Desarrollo", "Oficina Área Curricular de Gestión y Organizaciones",
    "Oficina Bienestar", "Oficina de Soporte Técnico", "Oficina ORI", "Sala de Informática 1", "Sala de Informática 2",
    "Sala de Informática 3", "Sala de Juntas", "Sala de Videoconferencias", "Salones 310", "UACE - Salón 205", "UIFCE"] },
  { titulo: "Seleccione la ubicación exacta donde se necesita el servicio:", rol: "UBICACION", edificio: "311", opciones: [
    "Archivo 311", "Decanatura", "Oficina de Apoyo Docente 311", "Oficina de Calificaciones", "Oficinas Docentes 311",
    "Salones 311", "Secretaría de Facultad", "Unidad Administrativa", "Vicedecanatura"] },
  { titulo: "Seleccione la ubicación exacta donde se necesita el servicio:", rol: "UBICACION", edificio: "238", opciones: [
    "Archivo 238", "Centro Editorial", "Comunicaciones", "Oficina de Apoyo Docente 238", "Oficinas Docentes 238",
    "Sala de Informática 6", "Salones 238", "UACE - Oficina", "Unidad de Emprendimiento",
    "Vicedecanatura de Investigación y Extensión"] },
  { titulo: "Seleccione la categoría del servicio a solicitar:", rol: "CATEGORIA", opciones: Object.values(CATEGORIAS) },
  { titulo: "Seleccione el concepto técnico a solicitar:", rol: "SERVICIO", categoria: CATEGORIAS.CONCEPTOS,
    opciones: ["Bajas", "Compras", "Directrices Técnicas"] },
  { titulo: "Seleccione el servicio a solicitar relacionado con Impresoras:", rol: "SERVICIO", categoria: CATEGORIAS.IMPRESORAS,
    opciones: ["Mantenimiento Preventivo Impresora", "Instalación o Conexión", "Instalación de Toner", "Falla de Red", "Otros"] },
  { titulo: "Seleccione el servicio a solicitar relacionado con  PC y Portátiles -  Mantenimiento Preventivo", rol: "SERVICIO",
    categoria: CATEGORIAS.PC_MTO, opciones: ["Limpieza Interna y Externa"] },
  { titulo: "Seleccione el servicio a solicitar:", rol: "GRUPO", categoria: CATEGORIAS.PC_REV,
    opciones: ["Hardware", "Software", "Conectividad", "Usuario"] },
  { titulo: "Subcategoría Hardware:", rol: "SERVICIO", categoria: CATEGORIAS.PC_REV, grupo: "Hardware",
    opciones: ["Equipo no enciende", "Daño en periféricos (Teclado, Mouse, etc)"] },
  { titulo: "Subcategoría Software:", rol: "SERVICIO", categoria: CATEGORIAS.PC_REV, grupo: "Software",
    opciones: ["Equipo no inicia - pantalla negra", "Equipo Lento", "Software con fallas"] },
  { titulo: "Subcategoría Conectividad:", rol: "SERVICIO", categoria: CATEGORIAS.PC_REV, grupo: "Conectividad",
    opciones: ["Equipo sin internet - No navega", "Acceso a servidor de archivos"] },
  { titulo: "Subcategoría usuario:", rol: "SERVICIO", categoria: CATEGORIAS.PC_REV, grupo: "Usuario",
    opciones: ["Creación de usuarios en Windows", "Falla de inicio de sesión en Windows"] },
  { titulo: "Seleccione el servicio:", rol: "SERVICIO", categoria: CATEGORIAS.SOFTWARE, opciones: ["Office", "VPN", "Otro"] },
  { titulo: "Seleccione el servicio:", rol: "SERVICIO", categoria: CATEGORIAS.TELEFONIA,
    opciones: ["Teléfono sin servicio", "Cambio o Reparación de cables"] },
  { titulo: "Seleccione el servicio:", rol: "SERVICIO", categoria: CATEGORIAS.VIDEO,
    opciones: ["Mantenimiento Preventivo", "No proyecta - Imagen con problemas", "Otro"] },
  { titulo: "Seleccione el servicio:", rol: "SERVICIO", categoria: CATEGORIAS.SERVIDOR,
    opciones: ["Instalación / Actualización de paquetes", "Carga de archivos", "Backups"] },
  { titulo: "Cantidad de equipos que requieren el servicio:", rol: "CANTIDAD" },
  { titulo: "Comentarios adicionales del servicio (Como el salón específico, software a instalar o cualquier requerimiento que considere necesario):", rol: "COMENTARIOS" },
  // Columnas del script en la hoja de producción (encabezados tal como están hoy).
  { titulo: "Estado", rol: "ESTADO" },
  { titulo: "Día notificación", rol: "FECHA_NOTIF" },
  { titulo: "Responsable", rol: "RESPONSABLE" },
  { titulo: "Comentarios", rol: "COMENTARIO_RESOLUCION" }
];

// Encabezados de la bandeja "Solicitudes Pendientes" de producción (L1 está vacía).
const ENCABEZADOS_PENDIENTES = ["  ", "Nombres y apellidos", "Edificio", "Ubicación", "Servicio", "Cantidad de Equipos",
  "Comentarios Adicionales", "Tiempo de Respuesta Máximo", "Fecha Solicitud", "Resuelto por", "Comentario de Resolucion", ""];

module.exports = { CATEGORIAS, COLUMNAS, ENCABEZADOS_PENDIENTES };
