# Tiempos de respuesta por servicio

Plazo que el sistema asigna a **cada servicio del árbol**, para cualquier ubicación y
cualquier cantidad de equipos. Documento generado: `npm run matriz`. No se edita a mano.

Fuente de los puntajes: `TIEMPOS DE RESPUESTA.xlsx`. Que el código siga coincidiendo con
ese archivo lo comprueban `npm run test:excel` y `npm run test:tiempos`.

El plazo sale de sumar tres puntajes —ubicación + servicio + cantidad— y buscar el total
en la escala de tiempos. Como el puntaje es lo único que importa, dos ubicaciones con los
mismos puntos comparten plazo: por eso cada tabla tiene 5 filas y no 38.

## Escalas del Excel

| Puntaje total | Plazo | Horas hábiles |
|---|---|---|
| 1-10 | 24 HORAS | 24 |
| 11-20 | 48 HORAS | 48 |
| 21-30 | 72 HORAS | 72 |
| 31-40 | 5 DIAS | 120 |
| 41-50 | 10 DIAS | 240 |
| 51-60 | 15 DIAS | 360 |
| 61-70 | DURANTE EL SEMESTRE ACADÉMICO | 2160 |
| mayor a 70 | NO ESTABLECIDO | 2160 |

| Cantidad de equipos | Puntaje |
|---|---|
| 1 A 3 | 1 |
| 4 A 14 | 10 |
| 15 A 30 | 20 |
| MAS DE 30 | 35 |

Las horas son **hábiles**: un día hábil aporta 24 h y los sábados, domingos y festivos
aportan 0. La fecha límite se calcula desde el inicio del reloj, no desde la solicitud.

## Ubicaciones por puntaje

| Puntos | Ubicaciones |
|---|---|
| 1 | Decanatura (311), Vicedecanatura (311) |
| 5 | Sala de Juntas (310), Sala de Videoconferencias (310), Secretaría de Facultad (311), Unidad Administrativa (311) |
| 10 | Auditorio Principal (310), Auditorios Auxiliares (310), CADE - Oficinas Programas Curriculares (310), Oficina Área Curricular de Contabilidad y Finanzas (310), Oficina Área Curricular de Economía y Desarrollo (310), Oficina Área Curricular de Gestión y Organizaciones (310), Oficina Bienestar (310), Oficina ORI (310), Salones 310 (310), UIFCE (310), Archivo 311 (311), Oficina de Calificaciones (311), Salones 311 (311), Oficinas Docentes 238 (238), Vicedecanatura de Investigación y Extensión (238) |
| 20 | Biblioteca (310), Oficina Apoyo a la Gestión (310), Oficina de Soporte Técnico (310), Sala de Informática 1 (310), Sala de Informática 2 (310), Sala de Informática 3 (310), UACE - Salón 205 (310), Oficina de Apoyo Docente 311 (311), Oficinas Docentes 311 (311), Archivo 238 (238), Centro Editorial (238), Comunicaciones (238), Oficina de Apoyo Docente 238 (238), UACE - Oficina (238), Unidad de Emprendimiento (238) |
| 30 | Sala de Informática 6 (238), Salones 238 (238) |

## Plazo por servicio

### Conceptos Técnicos

**Bajas** — 50 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 15 DIAS <br>*52 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*61 pts* | NO ESTABLECIDO <br>*71 pts* | NO ESTABLECIDO <br>*86 pts* |
| **5** | 15 DIAS <br>*56 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* | NO ESTABLECIDO <br>*75 pts* | NO ESTABLECIDO <br>*90 pts* |
| **10** | DURANTE EL SEMESTRE ACADÉMICO <br>*61 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* | NO ESTABLECIDO <br>*80 pts* | NO ESTABLECIDO <br>*95 pts* |
| **20** | NO ESTABLECIDO <br>*71 pts* | NO ESTABLECIDO <br>*80 pts* | NO ESTABLECIDO <br>*90 pts* | NO ESTABLECIDO <br>*105 pts* |
| **30** | NO ESTABLECIDO <br>*81 pts* | NO ESTABLECIDO <br>*90 pts* | NO ESTABLECIDO <br>*100 pts* | NO ESTABLECIDO <br>*115 pts* |

**Compras** — 70 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | NO ESTABLECIDO <br>*72 pts* | NO ESTABLECIDO <br>*81 pts* | NO ESTABLECIDO <br>*91 pts* | NO ESTABLECIDO <br>*106 pts* |
| **5** | NO ESTABLECIDO <br>*76 pts* | NO ESTABLECIDO <br>*85 pts* | NO ESTABLECIDO <br>*95 pts* | NO ESTABLECIDO <br>*110 pts* |
| **10** | NO ESTABLECIDO <br>*81 pts* | NO ESTABLECIDO <br>*90 pts* | NO ESTABLECIDO <br>*100 pts* | NO ESTABLECIDO <br>*115 pts* |
| **20** | NO ESTABLECIDO <br>*91 pts* | NO ESTABLECIDO <br>*100 pts* | NO ESTABLECIDO <br>*110 pts* | NO ESTABLECIDO <br>*125 pts* |
| **30** | NO ESTABLECIDO <br>*101 pts* | NO ESTABLECIDO <br>*110 pts* | NO ESTABLECIDO <br>*120 pts* | NO ESTABLECIDO <br>*135 pts* |

**Directrices Técnicas** — 70 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | NO ESTABLECIDO <br>*72 pts* | NO ESTABLECIDO <br>*81 pts* | NO ESTABLECIDO <br>*91 pts* | NO ESTABLECIDO <br>*106 pts* |
| **5** | NO ESTABLECIDO <br>*76 pts* | NO ESTABLECIDO <br>*85 pts* | NO ESTABLECIDO <br>*95 pts* | NO ESTABLECIDO <br>*110 pts* |
| **10** | NO ESTABLECIDO <br>*81 pts* | NO ESTABLECIDO <br>*90 pts* | NO ESTABLECIDO <br>*100 pts* | NO ESTABLECIDO <br>*115 pts* |
| **20** | NO ESTABLECIDO <br>*91 pts* | NO ESTABLECIDO <br>*100 pts* | NO ESTABLECIDO <br>*110 pts* | NO ESTABLECIDO <br>*125 pts* |
| **30** | NO ESTABLECIDO <br>*101 pts* | NO ESTABLECIDO <br>*110 pts* | NO ESTABLECIDO <br>*120 pts* | NO ESTABLECIDO <br>*135 pts* |

### Impresoras

**Mantenimiento Preventivo Impresora** — 30 puntos · el mismo texto existe en otra categoría con otro puntaje

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 5 DIAS <br>*32 pts* | 10 DIAS <br>*41 pts* | 15 DIAS <br>*51 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*66 pts* |
| **5** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |
| **10** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |
| **20** | 15 DIAS <br>*51 pts* | 15 DIAS <br>*60 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* | NO ESTABLECIDO <br>*85 pts* |
| **30** | DURANTE EL SEMESTRE ACADÉMICO <br>*61 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* | NO ESTABLECIDO <br>*80 pts* | NO ESTABLECIDO <br>*95 pts* |

**Instalación o Conexión** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Instalación de Toner** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Falla de Red** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Otros** — 20 puntos · el mismo texto existe en otra categoría con otro puntaje

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 72 HORAS <br>*22 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*41 pts* | 15 DIAS <br>*56 pts* |
| **5** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **10** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **20** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |
| **30** | 15 DIAS <br>*51 pts* | 15 DIAS <br>*60 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* | NO ESTABLECIDO <br>*85 pts* |

### PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO

**Instalación y Alistamiento** — 25 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 72 HORAS <br>*27 pts* | 5 DIAS <br>*36 pts* | 10 DIAS <br>*46 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*61 pts* |
| **5** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **10** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |
| **20** | 10 DIAS <br>*46 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* | NO ESTABLECIDO <br>*80 pts* |
| **30** | 15 DIAS <br>*56 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* | NO ESTABLECIDO <br>*75 pts* | NO ESTABLECIDO <br>*90 pts* |

### PC Y PORTÁTILES - CAMBIO DE UBICACIÓN

**Movimiento de equipos entre oficinas** — 20 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 72 HORAS <br>*22 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*41 pts* | 15 DIAS <br>*56 pts* |
| **5** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **10** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **20** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |
| **30** | 15 DIAS <br>*51 pts* | 15 DIAS <br>*60 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* | NO ESTABLECIDO <br>*85 pts* |

### PC y Portátiles - Mantenimiento Preventivo

**Limpieza Interna y Externa** — 25 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 72 HORAS <br>*27 pts* | 5 DIAS <br>*36 pts* | 10 DIAS <br>*46 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*61 pts* |
| **5** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **10** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |
| **20** | 10 DIAS <br>*46 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* | NO ESTABLECIDO <br>*80 pts* |
| **30** | 15 DIAS <br>*56 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* | NO ESTABLECIDO <br>*75 pts* | NO ESTABLECIDO <br>*90 pts* |

### PC y Portátiles - Revisión y Reparación

**Equipo no enciende** — 5 puntos · grupo «HARDWARE»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

**Daño en periféricos (Teclado, Mouse, etc)** — 5 puntos · grupo «HARDWARE»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

**Equipo no inicia - pantalla negra** — 5 puntos · grupo «SOFTWARE»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

**Equipo Lento** — 10 puntos · grupo «SOFTWARE»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Software con fallas** — 5 puntos · grupo «SOFTWARE»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

**Equipo sin internet - No navega** — 5 puntos · grupo «INTERNET Y CONECTIVIDAD»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

**Acceso a servidor de archivos** — 10 puntos · grupo «INTERNET Y CONECTIVIDAD»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Creación de usuarios en Windows** — 10 puntos · grupo «USUARIO» · solo en el formulario, no está en el Excel

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Falla de inicio de sesión en Windows** — 5 puntos · grupo «USUARIO» · solo en el formulario, no está en el Excel

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

### Software - Instalación o Actualización

**Office** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**VPN** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Otro** — 10 puntos · el mismo texto existe en otra categoría con otro puntaje

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

### Telefonía

**Teléfono sin servicio** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Cambio o Reparación de cables** — 10 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

### Video - Proyectores o Pantallas

**Mantenimiento Preventivo** — 10 puntos · el mismo texto existe en otra categoría con otro puntaje

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**No proyecta - Imagen con problemas** — 5 puntos

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 24 HORAS <br>*7 pts* | 48 HORAS <br>*16 pts* | 72 HORAS <br>*26 pts* | 10 DIAS <br>*41 pts* |
| **5** | 48 HORAS <br>*11 pts* | 48 HORAS <br>*20 pts* | 72 HORAS <br>*30 pts* | 10 DIAS <br>*45 pts* |
| **10** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **20** | 72 HORAS <br>*26 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*60 pts* |
| **30** | 5 DIAS <br>*36 pts* | 10 DIAS <br>*45 pts* | 15 DIAS <br>*55 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*70 pts* |

**Otro** — 10 puntos · el mismo texto existe en otra categoría con otro puntaje

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

### Servidor web y bases de datos

**Instalación / Actualización de paquetes** — 10 puntos · grupo «SERVIDOR WEB Y BASES DE DATOS»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Carga de archivos** — 10 puntos · grupo «SERVIDOR WEB Y BASES DE DATOS»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

**Backups** — 10 puntos · grupo «SERVIDOR WEB Y BASES DE DATOS»

| Puntos de la ubicación | 1 A 3 equipos | 4 A 14 equipos | 15 A 30 equipos | MAS DE 30 equipos |
|---|---|---|---|---|
| **1** | 48 HORAS <br>*12 pts* | 72 HORAS <br>*21 pts* | 5 DIAS <br>*31 pts* | 10 DIAS <br>*46 pts* |
| **5** | 48 HORAS <br>*16 pts* | 72 HORAS <br>*25 pts* | 5 DIAS <br>*35 pts* | 10 DIAS <br>*50 pts* |
| **10** | 72 HORAS <br>*21 pts* | 72 HORAS <br>*30 pts* | 5 DIAS <br>*40 pts* | 15 DIAS <br>*55 pts* |
| **20** | 5 DIAS <br>*31 pts* | 5 DIAS <br>*40 pts* | 10 DIAS <br>*50 pts* | DURANTE EL SEMESTRE ACADÉMICO <br>*65 pts* |
| **30** | 10 DIAS <br>*41 pts* | 10 DIAS <br>*50 pts* | 15 DIAS <br>*60 pts* | NO ESTABLECIDO <br>*75 pts* |

## Resumen: alcance de cada servicio

Plazo más corto y más largo que puede llegar a tener cada servicio, sobre las
38 ubicaciones × 4 tramos de cantidad.

| Servicio | Categoría | Puntos | Plazo más corto | Plazo más largo |
|---|---|---|---|---|
| Bajas | Conceptos Técnicos | 50 | 15 DIAS | NO ESTABLECIDO |
| Compras | Conceptos Técnicos | 70 | NO ESTABLECIDO | NO ESTABLECIDO |
| Directrices Técnicas | Conceptos Técnicos | 70 | NO ESTABLECIDO | NO ESTABLECIDO |
| Mantenimiento Preventivo Impresora | Impresoras | 30 | 5 DIAS | NO ESTABLECIDO |
| Instalación o Conexión | Impresoras | 10 | 48 HORAS | NO ESTABLECIDO |
| Instalación de Toner | Impresoras | 10 | 48 HORAS | NO ESTABLECIDO |
| Falla de Red | Impresoras | 10 | 48 HORAS | NO ESTABLECIDO |
| Otros | Impresoras | 20 | 72 HORAS | NO ESTABLECIDO |
| Instalación y Alistamiento | PC Y PORTÁTILES - INSTALACIÓN Y ALISTAMIENTO | 25 | 72 HORAS | NO ESTABLECIDO |
| Movimiento de equipos entre oficinas | PC Y PORTÁTILES - CAMBIO DE UBICACIÓN | 20 | 72 HORAS | NO ESTABLECIDO |
| Limpieza Interna y Externa | PC y Portátiles - Mantenimiento Preventivo | 25 | 72 HORAS | NO ESTABLECIDO |
| Equipo no enciende | PC y Portátiles - Revisión y Reparación | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Daño en periféricos (Teclado, Mouse, etc) | PC y Portátiles - Revisión y Reparación | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Equipo no inicia - pantalla negra | PC y Portátiles - Revisión y Reparación | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Equipo Lento | PC y Portátiles - Revisión y Reparación | 10 | 48 HORAS | NO ESTABLECIDO |
| Software con fallas | PC y Portátiles - Revisión y Reparación | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Equipo sin internet - No navega | PC y Portátiles - Revisión y Reparación | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Acceso a servidor de archivos | PC y Portátiles - Revisión y Reparación | 10 | 48 HORAS | NO ESTABLECIDO |
| Creación de usuarios en Windows | PC y Portátiles - Revisión y Reparación | 10 | 48 HORAS | NO ESTABLECIDO |
| Falla de inicio de sesión en Windows | PC y Portátiles - Revisión y Reparación | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Office | Software - Instalación o Actualización | 10 | 48 HORAS | NO ESTABLECIDO |
| VPN | Software - Instalación o Actualización | 10 | 48 HORAS | NO ESTABLECIDO |
| Otro | Software - Instalación o Actualización | 10 | 48 HORAS | NO ESTABLECIDO |
| Teléfono sin servicio | Telefonía | 10 | 48 HORAS | NO ESTABLECIDO |
| Cambio o Reparación de cables | Telefonía | 10 | 48 HORAS | NO ESTABLECIDO |
| Mantenimiento Preventivo | Video - Proyectores o Pantallas | 10 | 48 HORAS | NO ESTABLECIDO |
| No proyecta - Imagen con problemas | Video - Proyectores o Pantallas | 5 | 24 HORAS | DURANTE EL SEMESTRE ACADÉMICO |
| Otro | Video - Proyectores o Pantallas | 10 | 48 HORAS | NO ESTABLECIDO |
| Instalación / Actualización de paquetes | Servidor web y bases de datos | 10 | 48 HORAS | NO ESTABLECIDO |
| Carga de archivos | Servidor web y bases de datos | 10 | 48 HORAS | NO ESTABLECIDO |
| Backups | Servidor web y bases de datos | 10 | 48 HORAS | NO ESTABLECIDO |

**Servicios con un único plazo posible.** Su puntaje es tan alto que ni la ubicación ni
la cantidad de equipos cambian nada: caen siempre en el mismo tramo.

- Compras → siempre «NO ESTABLECIDO»
- Directrices Técnicas → siempre «NO ESTABLECIDO»
