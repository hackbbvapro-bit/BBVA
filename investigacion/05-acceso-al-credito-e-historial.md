# 05 · Acceso al crédito, historial crediticio y marco legal en Perú (estado a 13-nov-2026)

Alcance: profundiza lo que `01-problemas-financieros-peru.md` y `conocimiento/metodo-asesor.md` (secc. 3.6 y 5) solo rozan. No repite sus cifras salvo para cruzarlas.

Leyenda de verificación: **[ABIERTO]** = lo leí en la página oficial durante esta investigación. **[BÚSQUEDA]** = salió solo de un resumen de buscador, sin abrir la fuente primaria. **[SIN VERIFICAR]** = no lo pude confirmar; no usar en pantalla. Ninguna cifra de este archivo la calculó un modelo de lenguaje: las que aparecen vienen de la fuente citada.

> Honestidad sobre el método: el acceso web de esta sesión fue inestable (la herramienta de descarga por consola fue denegada y el navegador integrado se desvió varias veces a otras páginas). Abrí y leí unas 12 páginas de forma fiable, no las 15 pedidas. Lo no abierto queda marcado. Los vacíos están en la sección (g).

---

## (a) Conclusión en 5 líneas

1. **No, Iván: "no tengo historial" y "estoy en Infocorp" son dos problemas distintos y el producto debe separarlos.** Sin historial = invisible (nadie te puede calificar); con morosidad = visible pero mal calificado. Las rutas son diferentes.
2. **El banco no decide con un número mágico: mira primero la categoría SBS (Normal/CPP/Deficiente/Dudoso/Pérdida), que depende de días de atraso, y aplica "alineamiento": la peor categoría que cualquier entidad te haya puesto prevalece.** [ABIERTO, SBS]
3. **Lo más accionable para un usuario rechazado: el Reporte de Deudas de la SBS es gratuito, y si hay un error solo lo puede corregir la entidad que lo reportó (no la SBS).** Desde la Ley 32327 (10-may-2025) la entidad tiene 7 días hábiles para corregir. [ABIERTO]
4. **El BBVA publica piso de entrada: S/ 700 de ingreso neto, 6 meses de continuidad y clasificación 100 % Normal.** Eso permite un "chequeo previo de elegibilidad" honesto en la app. [ABIERTO]
5. **Una IA puede explicar, simular y ordenar pasos, pero nunca prometer aprobación, nunca inventar una tasa y nunca decidir por el banco.** Las cifras las calcula el código; la ley (Ley 31143, SBS, Ley 29733) fija los márgenes.

Impacto para la demo: la función "Por qué me rechazan y cómo salgo" se puede construir 100 % con reglas públicas y datos sintéticos, sin consultar ningún buró real.

---

## (b) Tabla de cifras clave

| Dato | Valor | Fecha | Fuente | URL | Verificado |
|---|---|---|---|---|---|
| Umbral Normal, consumo (incl. tarjetas) | pago puntual o atraso máx. 8 días | vigente 2026 | SBS, Reporte de Deudas (FAQ) | https://www.sbs.gob.pe/usuarios/nuestros-servicios/reporte-de-deudas | [ABIERTO] |
| CPP consumo | 9 a 30 días de atraso | ídem | ídem | ídem | [ABIERTO] |
| Deficiente consumo | 31 a 60 días | ídem | ídem | ídem | [ABIERTO] |
| Dudoso consumo | 61 a 120 días | ídem | ídem | ídem | [ABIERTO] |
| Pérdida consumo | más de 120 días | ídem | ídem | ídem | [ABIERTO] |
| Hipotecario: Normal / CPP / Def. / Dudoso / Pérdida | hasta 30 / 31-60 / 61-120 / 121-365 / más de 365 días | ídem | ídem | ídem | [ABIERTO] |
| Frecuencia del Reporte de Deudas | actualización mensual, publicado a fin del mes siguiente | ídem | ídem | ídem | [ABIERTO] |
| Al cancelar una deuda | la SBS deja de mostrarla desde el mes de cancelación; el historial previo queda registrado | ídem | ídem | ídem | [ABIERTO] |
| Quién corrige un error | solo la entidad que reportó; se puede denunciar ante la SBS | ídem | ídem | ídem | [ABIERTO] |
| Plazo para corregir/emitir constancia | 7 días hábiles | Ley 32327, 10-may-2025 | Congreso / El Peruano (vía SBS y prensa) | [SIN VERIFICAR texto de la ley en página oficial] | [BÚSQUEDA + confirmado en SBS] |
| Ingreso neto mínimo de entrada BBVA | S/ 700 | consultado nov-2026 | BBVA Perú, requisitos de tarjeta/préstamo | https://www.bbva.pe | [ABIERTO] |
| Continuidad laboral mínima BBVA | 6 meses | ídem | BBVA Perú | ídem | [ABIERTO] |
| Clasificación exigida BBVA | 100 % Normal | ídem | BBVA Perú | ídem | [ABIERTO] |
| Tope de tasa (Ley 31143), consumo y mype | 114,13 % TEA en soles; 99,84 % en moneda extranjera (periodo may-oct 2026) | mayo-oct 2026 | BCRP / SBS (tasas máximas) | https://www.sbs.gob.pe (sección tasas máximas) | [ABIERTO] |
| Derogatoria de la Ley 31143 | rechazada en junio 2025 (44-46-4); el Ejecutivo habría vuelto a proponerla en 2026 | jun-2025 / 2026 | prensa | — | [BÚSQUEDA; estado 2026 SIN VERIFICAR] |
| Billetera digital | 72 % la usa; 36 % ha accedido a crédito | comunicado 5-nov-2026 | SBS | https://www.sbs.gob.pe | [ABIERTO] |
| Cuenta de ahorro/transaccional en adultos | 59 % (2024) | 2025 | IEP / Findex | https://iep.org.pe/wp-content/uploads/2025/09/Ge080925_16.pdf | [BÚSQUEDA; cifra en conflicto con otras lecturas, p. ej. 52 %. SIN VERIFICAR] |
| Informalidad laboral | 70,2 % (INEI 2025); ~7 de cada 10 (Infobae, 1-abr-2026) | 2025-2026 | INEI vía `01-problemas...` | — | cruzado con el archivo 01 |
| Adultos que no cubrirían un mes sin ingresos | 37 % | ver archivo 01 | SBS-CAF vía `01-problemas...` | — | cruzado con el archivo 01 |
| Mora de tarjetas | 4,9 % (mayo-2025) | may-2025 | SBS vía `01-problemas...` | — | cruzado con el archivo 01 |
| Nuevo reglamento de datos personales | DS 016-2024-JUS, vigente desde ~30-mar-2025 | 2025 | Minjusc / ANPD | — | [BÚSQUEDA] |
| Marco de finanzas abiertas | prepublicación SBS 5-nov-2026; intercambio previsto 2028 | nov-2026 | SBS | — | [BÚSQUEDA] |
| Reglamento que sustituiría la clasificación | Res. SBS 01250-2026 puesta a consulta el 27-abr-2026 | abr-2026 | SBS | — | [BÚSQUEDA] |

Cifras que **no se deben mostrar** hasta verificarlas: porcentaje exacto de adultos sin historial, brecha de género en crédito formal, brecha por regiones y número de víctimas del gota a gota (ver (g)).

---

## (c) "Cómo te ve el banco", explicado a una persona normal

Analogía: el banco es un casero que te alquila un cuarto. Antes de darte la llave, pregunta a los casero anteriores si pagaste a tiempo (tu historial), mira si tu sueldo alcanza (capacidad) y si llevas tiempo estable en un trabajo (continuidad).

### 1. La nota que más pesa: tu categoría SBS (regla pública)
Cada entidad te pone una categoría por deuda según los días de atraso. Para crédito de consumo (préstamo personal y tarjeta) [ABIERTO, SBS]:

| Categoría | Atraso en consumo | En palabras simples |
|---|---|---|
| 0 Normal | hasta 8 días | "al día" (8 días de gracia) |
| 1 CPP (Problemas potenciales) | 9 a 30 días | "te atrasaste" |
| 2 Deficiente | 31 a 60 días | "tienes un problema" |
| 3 Dudoso | 61 a 120 días | "casi perdido" |
| 4 Pérdida | más de 120 días | "perdido" |

Para hipotecario los límites son más holgados: hasta 30 días sigue siendo Normal.

**Regla de oro (alineamiento):** si en un banco estás en Normal y otra entidad te reporta en Deficiente, el primero está obligado a bajarte a la peor categoría. Una sola deuda atrasada en cualquier lugar puede cerrarte las demás puertas. [ABIERTO, SBS]

Implicación para el producto: la regla "8 días de gracia" es un dato duro que se puede usar en el asistente: "paga antes del día 8 y sigues en Normal". Para tarjetas, ojo: el pago mínimo vencido cuenta como atraso.

### 2. Dónde queda registrado
- **Central de Riesgos de la SBS (Reporte de Deudas):** muestra tus deudas, líneas no usadas, avales y la categoría. Se actualiza cada mes y se publica a fin del mes siguiente (el dato de mayo sale a fin de junio). Si cancelas, dejas de figurar desde el mes de pago; lo anterior queda como historial. [ABIERTO]
- **Centrales privadas (Equifax-Infocorp, Sentinel/Experian, Informa del Perú):** son empresas privadas reguladas por la Ley 27489, **no supervisadas por la SBS**. Producen su propio puntaje (en Infocorp, de 1 a 999 [BÚSQUEDA]). [ABIERTO la parte de regulación; el rango del score es BÚSQUEDA]

### 3. Qué más mira el banco (con qué nivel de certeza)
| Criterio | Qué se sabe | Certeza |
|---|---|---|
| Ingreso mínimo | BBVA entrada: S/ 700 netos | [ABIERTO] |
| Continuidad | BBVA entrada: 6 meses | [ABIERTO] |
| Categoría | BBVA entrada: 100 % Normal | [ABIERTO] |
| Relación cuota/ingreso | La regla "no más de 30 %" circula mucho, pero cada banco fija la suya; no hay tope legal único publicado | [SIN VERIFICAR]; no mostrar como "regla del banco" |
| Uso de la línea de tarjeta | Se dice que sobre 30 %-50 % del cupo penaliza el puntaje; el cálculo exacto de los burós no es público | [SIN VERIFICAR]; presentar solo como "buena práctica" |
| Independientes e informales | Los bancos suelen exigir recibos por honorarios, movimientos de cuenta o declaración; las cajas y Mibanco evalúan el flujo real del negocio visitando el local | [BÚSQUEDA]; el detalle por entidad es SIN VERIFICAR |

### 4. Cuánto tiempo queda el dato malo (conflicto abierto)
- La SBS dice que al cancelar sales del reporte desde ese mes, pero el historial de meses anteriores permanece. [ABIERTO]
- Sobre el plazo en centrales privadas: se leen dos versiones (2 años tras cancelar; 5 años si no se pagó). Esto viene de la Ley 27489 y modificatorias; **no abrí el artículo**. [SIN VERIFICAR]. El producto debe decir "depende de la central; confirma en su reporte" y no dar años.

### 5. Cómo revisar tu reporte gratis
1. Reporte de Deudas SBS: gratis; la propia página indica que es un servicio sin costo (una vez por semestre con detalle gratuito según la página; el límite exacto: confirmar en el portal). [ABIERTO, límite SIN VERIFICAR]
2. Centrales privadas: por ley, el titular tiene derecho a ver su información; el costo y la frecuencia gratuita varían por empresa. [SIN VERIFICAR el detalle por empresa]

### 6. Cómo rectificar un error
1. Descarga el reporte y ubica la deuda que no reconoces o que ya pagaste.
2. Reclama ante la **entidad que reportó** (es la única facultada para rectificar). [ABIERTO]
3. Con la Ley 32327 (10-may-2025) tienen 7 días hábiles. [BÚSQUEDA, coincide con la SBS]
4. Si no corrigen, denuncia ante la SBS (evalúa infracción) o reclama en el Libro de Reclamaciones/Indecopi. [ABIERTO la denuncia SBS; Indecopi SIN VERIFICAR en esta sesión]

### 7. Mitos que el asistente puede desmentir
- **"Consultar mi reporte me baja el score".** Mirar tu propio reporte no es una consulta de crédito; no afecta la categoría SBS (la categoría depende de morosidad, historial, solvencia y alineamiento). [ABIERTO la parte de qué determina la clasificación; la afirmación sobre el score privado es SIN VERIFICAR, dar el consejo con cautela]
- **"Pagué y sigo apareciendo".** Normal durante un mes: el reporte se publica con retraso de hasta fin del mes siguiente. [ABIERTO]
- **"La SBS me puede borrar".** No; solo la entidad reportante rectifica. [ABIERTO]

---

## (d) Ruta realista de 6 a 12 meses

Aviso: esto es una guía educativa, no una promesa de aprobación (ver (e)).

**Caso A. "No tengo historial" (invisible)**
| Mes | Paso | Por qué |
|---|---|---|
| 0 | Bajar tu Reporte de Deudas SBS y confirmar que está vacío | punto de partida |
| 0-1 | Abrir cuenta de ahorros y depositar el sueldo/ingresos de forma regular | muestra ingreso y continuidad (BBVA pide 6 meses) |
| 1-3 | Pedir un producto de entrada: tarjeta de crédito de línea baja, crédito con garantía de tus ahorros o microcrédito | crea el primer registro |
| 1-12 | Usar poco y pagar siempre antes del día 8 | la categoría Normal tolera hasta 8 días de atraso |
| 6 | Revisar de nuevo el reporte y pedir un aumento de línea | recién hay historial mensual |
| 9-12 | Considerar un préstamo personal pequeño | segundo tipo de producto |

**Caso B. "Estoy mal calificado"**
1. Pagar o negociar la deuda más cara primero; guardar la constancia de pago.
2. Revisar si la categoría bajó tras pagar (ojo con el rezago mensual).
3. Mientras la categoría no sea Normal, evitar pedir créditos en el sistema financiero: serán rechazados y generarán más consultas. [consejo prudencial, ASUMIDO]
4. Pedir regularización formal: la Ley 32327 obliga a emitir la constancia de regularización en 7 días hábiles. [BÚSQUEDA/SBS]
5. Esperar un par de meses de pagos puntuales antes de volver a pedir.

**Productos de entrada (qué existe, certeza)**
| Producto | Dato |
|---|---|
| BBVA tarjeta/préstamo de entrada | Piso S/ 700, 6 meses de continuidad, categoría 100 % Normal [ABIERTO] |
| Tarjeta/crédito garantizado con depósito | Existe en la banca; condiciones por entidad SIN VERIFICAR |
| Microcrédito / cajas / Mibanco | Evalúan el flujo del negocio; tasas altas; tope Ley 31143 114,13 % TEA en soles para may-oct 2026 [ABIERTO] |
| BNPL (compra en cuotas) | Existe en comercio; regulación específica SIN VERIFICAR |
| Crédito en billetera digital | 36 % de usuarios de billeteras habría accedido a crédito [ABIERTO, SBS 5-nov-2026] |

---

## (e) Límites legales para el asistente de IA

Lo que **sí** puede decir:
- Explicar las categorías SBS, el alineamiento y cómo pedir el Reporte de Deudas.
- Calcular, con el código, cuotas, TCEA, costo total y fecha de pago; mostrar el tope legal vigente (114,13 % TEA soles, may-oct 2026) [ABIERTO].
- Decir "con tu perfil, hoy no cumples el piso publicado de BBVA (S/ 700, 6 meses, Normal)" **citando que es un criterio publicado**, no la decisión del banco.
- Recordar derechos: reclamar a la entidad que reportó, plazo de 7 días hábiles.

Lo que **no** puede decir:
- "Te van a aprobar", "tu solicitud será aprobada" o cualquier garantía de resultado.
- Una tasa personalizada que no salió del cálculo del código o de la hoja resumen del banco.
- "Te borro de Infocorp / te limpio el historial": solo la entidad reportante rectifica, y limpiar un dato veraz no se puede.
- Recomendar un producto concreto como asesoría personalizada de inversión o de crédito sin avisar que es informativo. Estado de la normativa de "asesoría" y publicidad financiera: **SIN VERIFICAR**; hasta confirmar, mostrar siempre aviso de "información, no asesoría" y la TCEA cuando se muestre una cuota.
- Decir que consultar el reporte propio baja el score o afirmarlo sin fuente.

Marco que lo rodea (resumen; estado de verificación):
| Norma | Qué impone | Verificado |
|---|---|---|
| Ley 31143 | Tope de tasas fijado semestralmente por el BCRP | [ABIERTO la cifra vigente; futuro de la ley SIN VERIFICAR] |
| Ley 27489 | Regula las centrales privadas de riesgo | [ABIERTO que existe y quién la regula] |
| Ley 32327 (10-may-2025) | 7 días hábiles para constancia y corrección | [BÚSQUEDA + coincide con SBS] |
| Transparencia SBS (TCEA, hoja resumen, pago anticipado sin penalidad) | Obliga a informar costo total antes de contratar | [SIN VERIFICAR en texto; conocimiento general, no usar en pantalla sin abrir la norma] |
| Ley 29733 + DS 016-2024-JUS | Datos personales: finalidad, consentimiento, derechos ARCO | [BÚSQUEDA] |
| Finanzas abiertas | Prepublicación SBS 5-nov-2026; intercambio previsto 2028 | [BÚSQUEDA]; por ahora no se puede conectar al banco real |
| Código de Protección al Consumidor (Ley 29571) | Información veraz, reclamos | [SIN VERIFICAR en esta sesión] |

Consecuencia de diseño: para la demo, datos 100 % sintéticos, sin consulta a buró real y con consentimiento explícito si algún día se subiera un archivo del usuario.

---

## (f) Ideas de producto (concretas, para el copiloto)

1. **"Mi categoría hoy":** el usuario ingresa (sintético en demo) los días de atraso de cada deuda y el asistente devuelve la categoría SBS con la tabla oficial, y avisa del alineamiento. Todo es regla pública; el código lo calcula. Coste de construir: bajo.
2. **"El día 8":** alerta antes del día 8 de cada vencimiento: "si pagas hoy sigues en Normal; mañana ya no" (la tolerancia de 8 días es regla SBS para consumo). Se conecta con el motor de proyección de saldo del MVP.
3. **Chequeo previo de elegibilidad (con aviso legal):** compara tu perfil con el piso publicado de BBVA (S/ 700, 6 meses, Normal) y dice qué te falta, sin prometer aprobación.
4. **"Lee tu reporte":** el usuario pega o sube su Reporte de Deudas (con consentimiento) y el asistente lo traduce: qué es cada línea, qué es una línea no usada, qué categoría tienes, qué deuda pagar primero para salir de Deficiente.
5. **Guía de rectificación:** plantilla del reclamo a la entidad con el plazo de 7 días hábiles y la ruta de denuncia SBS.
6. **Detector de "préstamo trampa":** compara la TEA ofrecida con el tope vigente (114,13 % en soles) y advierte si supera el tope o si no entrega hoja resumen. Para alertas de apps fraudulentas y gota a gota, usar solo avisos genéricos hasta verificar cifras de víctimas.
7. **Ruta de 6-12 meses con calendario:** convierte la tabla (d) en tareas con fechas, calculadas por código.

---

## (g) Vacíos (lo que NO pude confirmar; no usar en pantalla)

- Porcentaje exacto de adultos con crédito formal, sin historial, por sexo, edad y región; la cifra de Findex/IEP (59 %) está en conflicto con otras lecturas.
- Permanencia de datos negativos en centrales privadas (Ley 27489 art. 10 y modificatorias): no abrí el texto.
- Estado de la Ley 31143 después de julio 2026 y valor del tope a partir de nov-2026.
- Víctimas, montos y tasas del gota a gota; texto de la alerta SBS sobre apps de préstamos fraudulentos (jul-2026).
- Reglas de transparencia (TCEA, hoja resumen, pago anticipado) y de publicidad/asesoría financiera: no abrí el texto de la norma.
- Detalles de DS 016-2024-JUS y de finanzas abiertas: solo resumen de buscador.
- Productos de entrada de BBVA (nombres, líneas, TEA) más allá del piso; condiciones de cajas, fintech y BNPL; prendarias y juntas/panderos.
- Si "consultar tu propio reporte baja el score": no hallé una fuente primaria que lo diga ni que lo niegue.

---

## (h) Fuentes

Abiertas y leídas:
1. SBS, "Reporte de Deudas - Portal del Usuario" (tabla de categorías, alineamiento, rectificación, centrales privadas). https://www.sbs.gob.pe/usuarios/nuestros-servicios/reporte-de-deudas
2. SBS, "Informalidad en los sistemas supervisados por SBS". https://www.sbs.gob.pe/usuarios/aprende-con-la-sbs/informalidad-en-los-sistemas-supervisados-por-sbs
3. BBVA Perú, requisitos de entrada (S/ 700, 6 meses, 100 % Normal). https://www.bbva.pe
4. SBS/BCRP, tasas máximas (114,13 % y 99,84 %). https://www.sbs.gob.pe
5. SBS, comunicado del 5-nov-2026 (billeteras digitales). https://www.sbs.gob.pe
6. Documentos internos: `investigacion/01-problemas-financieros-peru.md` y `conocimiento/metodo-asesor.md` (cifras SBS-CAF, INEI).
7. Otras páginas del portal SBS consultadas en el contexto de la sesión previa (FAQ de ley 32327 y regularización).

Solo resumen de buscador, no abiertas (tratar como pistas):
- IEP, Findex: https://iep.org.pe/wp-content/uploads/2025/09/Ge080925_16.pdf
- Congreso (rechazo de derogatoria Ley 31143, jun-2025), El Peruano (finanzas abiertas, DS 016-2024-JUS), Infobae (informalidad 1-abr-2026), Gestión (gota a gota), Infocorp/Sentinel.

---

## Decisión que te toca (Iván)

Elegir cuál de las ideas (1-3 del apartado (f)) entra en la demo de mañana. Mi recomendación: "Mi categoría hoy" + "El día 8", porque se apoyan en reglas SBS verificadas y no necesitan ninguna cifra dudosa.
