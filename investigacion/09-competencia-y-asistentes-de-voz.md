# 09 · Competencia en Perú y LATAM, y estado del arte de asistentes financieros de voz

Fecha de la investigación: 13-nov-2026. Complementa `03-benchmark-asesores-ia-top.md` (no se repite lo que ya está ahí: Cleo 3.0, Copilot, Monarch, YNAB, Origin, Plum, Fintonic, BCP Clara, Interbank "Mis Finanzas", ruta de finanzas abiertas de la SBS).

Etiquetas: **[ABIERTA]** = abrí la página y leí el texto. **[SIN VERIFICAR]** = solo vi un titular o resumen del buscador. **[EMPRESA]** = dato que la propia empresa publica de sí misma.
Fuentes abiertas: 20 (listadas al final).

---

## Conclusión (léela primero)

1. **Hueco encontrado:** no hallé ningún banco, billetera o fintech de Perú que ofrezca, en un solo producto, (a) proyección del saldo con rangos, (b) aviso de déficit con fecha y causa, (c) 2-3 jugadas con su costo en soles, (d) por voz. Es ausencia de evidencia, no prueba de que no exista: **[SIN VERIFICAR]** del todo.
2. **Los grandes están "explorando", no lanzando.** BCP dice que prepara una banca móvil conversacional sin fecha; Yape "experimenta" con IA; el asistente de Mercado Pago es de Brasil primero y transaccional (pagar, transferir); la herramienta de deudas de Nubank es solo Brasil.
3. **La evidencia de comportamiento apoya la idea del equipo:** los recordatorios funcionan cuando se atan a la meta propia de la persona (Perú, +16 %) y casi no funcionan genéricos; la educación financiera sola rinde poco.
4. **Impacto para la demo:** el diferencial defendible no es "otro chat", es el aviso anticipado con fecha y costo, calculado por código y dicho por voz.

---

## 1. Perú: qué hay y qué falta

Pregunta clave: ¿alguien tiene proyección de saldo, aviso de déficit, plan de salida de deudas o asistente de voz? **Respuesta con lo que pude abrir: no encontré a nadie con las cuatro cosas juntas.**

| Producto | Qué hace | Qué le falta | Fuente |
|---|---|---|---|
| **BCP / Yape** | BCP: 17,3 M clientes digitales (81 % de la base) a ago-2026; Yape 16,9 M usuarios activos, unas 37 M operaciones por día. Prepara una Banca Móvil conversacional "hacia 2030", sin fecha. Su banco digital iO ofrece banca conversacional a más de 100 000 usuarios. Mibanco usa IA en WhatsApp (más de 25 700 usuarios activos al mes). | Hoy es responder y ejecutar; la propia nota habla de pasar a "recomendar" más adelante. No vi proyección de saldo ni aviso de déficit lanzados. Yape "experimenta" con IA para personalizar; cerca del 85 % de las entradas a Yape son para pagar. | [1] y [2] ABIERTAS. Clara (voz) del BCP: ver archivo 03. |
| **Interbank / Plin / Izipay** | Convenio con Anthropic para herramientas de IA y pagos Plin por WhatsApp anunciados (según buscador). | No pude abrir el artículo del convenio ni confirmar un asistente al cliente. | **[SIN VERIFICAR]** (resultados de búsqueda; Gestión es de pago, [17] solo mostró el adelanto). |
| **BBVA Perú** | App con 3,28 M clientes móviles activos a cierre de 2025; 581,7 M de transacciones monetarias en la app (+44,75 % anual); Plin: 453,2 M operaciones en 2025. Asistente **Blue**: más de 15 M de mensajes y más de 5 M de consultas en 2025. | Blue está presentado como autoservicio (consultas); la nota no menciona proyección de saldo ni voz. | [3] ABIERTA, 6-feb-2026 [EMPRESA]. |
| **Scotiabank** | No encontré asistente de IA para el cliente. | Todo. | **[SIN VERIFICAR]** (búsqueda sin resultados). |
| **BanBif** | Estrategia de IA hacia 2030 según un medio de startups. | No hallé producto de asistente. | **[SIN VERIFICAR]**. |
| **Cajas, financieras** | No encontré asistentes con proyección ni voz. Sí hay educación financiera presencial (ver sección 4, Fundación Microfinanzas BBVA). | Producto digital de anticipación. | **[SIN VERIFICAR]** (falta de resultados). |
| **Quipuk** (app peruana, de Ica) | Finanzas personales con IA e impuestos (Sunat) en una sola app. | Es un publirreportaje pagado por la marca; no hay cifras de usuarios ni pruebas de proyección con rangos. | [4] ABIERTA, RPP, 29-may-2026 [EMPRESA, publirreportaje]. |
| **Prestamype, Kontigo, Rextie, Tkambio, Ligo, B89, Agente Cash** | Préstamos entre personas / billetera en dólares digitales / cambio de moneda / pagos. | No encontré en ninguna un asistente de presupuesto o de deudas. Prestamype (US$ 2 M de inversionistas y US$ 25 M de línea) y Ligo (elegida por el BCRP para el piloto de pagos) salen solo en resultados. | **[SIN VERIFICAR]** (titulares). |

**Contexto de mercado que sí abrí:**
- La SBS informa que la carga de deuda de los hogares respecto al ingreso bajó a 25,8 % en 2025 (27 % en 2024); el crédito de consumo creció 8 % anual a marzo-2026, en parte por billeteras digitales; morosidad de consumo 6,2 %, mype 6,9 %, total 3,3 % ([15] Infobae, 3-jun-2026).
- La SBS insiste públicamente en que "una línea de crédito no es un ingreso extra" ([16] 19-sep-2026): hay un problema de comprensión que el producto puede atacar.
- Sin finanzas abiertas operando aún (hoja de ruta 2027-2029, ver archivo 03), nadie puede ver todas las cuentas de una persona. Quien lo haga mañana tendrá que usar datos que la persona ingrese o su propio banco.

---

## 2. Latinoamérica: qué funcionó y qué no

| Producto | Qué hace | Qué se aprende | Fuente |
|---|---|---|---|
| **Nubank (Brasil)** | "Monitoramento de CPF" en NuScore, hecho con Acordo Certo: muestra deudas de la persona en otras instituciones, avisa de deudas nuevas y ofertas, y permite renegociar dentro de la app. Participa en Novo Desenrola Brasil (descuentos de hasta 90 %). Despliegue gradual. | La deuda se ataca con **ver todo + renegociar en el mismo lugar**. Solo Brasil, hay un registro de crédito central que Perú no tiene igual. | [5] ABIERTA, nu.com, 3-jun-2026 [EMPRESA]. Cifras del programa (R$ 1,8 mil millones, tope R$ 15 000): **[SIN VERIFICAR]**. |
| **Mercado Pago** | Asistente de IA por **voz o texto**: saldo, pagos, transferencias Pix, depósitos programados a "cofrinhos", para más de 68 M de usuarios. Brasil primero; Perú "en breve", sin fecha. | Lo lanzado es **transaccional**. Los consejos de presupuesto aparecen como plan futuro. Tiene voz, no anticipa. | [6] ABIERTA, Olhar Digital, 16-oct-2025. |
| **Ualá, RappiPay, Fintual, Destácame, Zenfi, Kueski, Mono** | Sin información verificada sobre asistentes conversacionales ni sobre operación en Perú. | Nada que aprender con rigor. | **[SIN VERIFICAR]**. |
| **Revolut en LATAM** | Titular de que planea invertir US$ 1 000 M en la región. | Competidor que viene, sin detalle. | **[SIN VERIFICAR]** (Peru Retail, 10-nov-2026, solo titular). |

**Qué funcionó y qué no, con lo abierto:**
- Funcionó (con medición propia de la empresa) renegociar dentro de la app y notificar deudas nuevas. Los resultados concretos de Nubank no se publican en la nota.
- Lo que falta en LATAM: ningún asistente abierto dice "tu saldo no alcanza el día X por Y".

---

## 3. Mundo: estado del arte (2025-2026)

| Producto | Qué hace | Cifra o dato | Fuente |
|---|---|---|---|
| **Erica (Bank of America)** | Asistente de voz y texto desde 2018. | Más de 3 400 M de interacciones; unos 700 M solo en 2025; 20,6 M de usuarios. EricaAssist, versión generativa, para 18 000+ empleados (21-jul-2026). | [14] ABIERTA, CMSWire, 27-jul-2026 (cifras de la empresa citadas por el medio). |
| **Revolut AIR** | Copiloto gratuito para 13 M+ clientes del Reino Unido: gastos, suscripciones, presupuesto de viaje, congelar tarjeta. | La empresa dice que no guarda datos personales en socios de IA ni los usa para entrenar. | [13] ABIERTA, Tech.eu, 9-abr-2026. |
| **Starling / Lunar** | Starling lanzó asistente "agéntico" (mar-2026). Lunar dice que su asistente de voz atenderá cerca de 75 % de las llamadas a futuro. | Anuncios de empresa. | [13] ABIERTA. |
| **bunq Finn** | De buscador con IA (dic-2023) a asistente multiagente y multilingüe con paso a humanos. | Sin cifras de uso en lo leído. | [12] ABIERTA, CX Today, 28-jul-2026. |
| **NatWest** | Presupuestos por bolsillos y gestor de suscripciones en la app; funciones llegan 4 veces más rápido que en 2021. | Un asistente "agéntico" dentro de Cora, con modelos de OpenAI, para 25 000 clientes (según FSTech). | [10] ABIERTA 13-feb-2026; asistente agéntico **[SIN VERIFICAR]**. |
| **ChatGPT (finanzas personales)** | Conecta cuentas con Plaid (12 000+ instituciones), tablero, preguntas sobre tus propias finanzas, "memorias financieras". Desde 2-oct-2026 llega a usuarios Free y Go de EE. UU. con resúmenes semanales, monitoreo de crédito, soporte de **voz** y Android. | Más de 200 M de personas al mes consultan en ChatGPT temas como presupuesto. Dice que no reemplaza asesoría profesional. No puede mover dinero (vía buscador). | [11] ABIERTA, OpenAI, 15-may-2026 con actualizaciones hasta 2-oct-2026 [EMPRESA]. "No mueve dinero": **[SIN VERIFICAR]**. |
| **Cleo** | Ver archivo 03 (voz, "roast", multas). | Encuesta propia: ver abajo. | [7] ABIERTA, 28-ene-2026 [EMPRESA]. |
| **Anthropic** | No encontré producto propio de finanzas personales. | | **[SIN VERIFICAR]**. |

**Qué interacciones se usan de verdad:**
- Erica: el volumen enorme (700 M en 2025) sugiere que lo que la gente usa son consultas rápidas y repetidas, no conversaciones largas. Es mi inferencia, la nota no desglosa tipos **[ASUMIDO]**.
- Encuesta de Cleo (10 000 adultos de 28-40 años en EE. UU. y Reino Unido, [EMPRESA]): solo 13 % dice no saber cuánto ahorrar; los retos más citados son **gastos imprevistos (43 %)**, equilibrar hoy y mañana (38 %), autodisciplina (37 %), ingreso impredecible (21 %). Cerca de la mitad acepta que la IA actúe (pagar facturas, ayuda con sobregiro, mover ahorros). Lo que más construye confianza (22 %): "empezar pequeño y ver resultados". Implicación: la gente no pide clases, pide **anticipación y ayuda para ejecutar**.
- Muestra de países ricos: no se puede trasladar tal cual a Perú **[ASUMIDO]**.

---

## 4. Evidencia de comportamiento

| Hallazgo | Detalle | Fuente |
|---|---|---|
| Recordatorios atados a la meta propia | Karlan, McConnell, Mullainathan y Zinman, *Management Science* 2016: recordatorios mensuales de ahorro subieron el ahorro alrededor de 6 %; en Perú, los que mencionaban la meta elegida por el cliente: cerca de +16 %; los genéricos no tuvieron efecto. | NBER WP 16205; **[SIN VERIFICAR]** (cifras vistas en resultados de búsqueda, no abrí el paper; no pude abrir el PDF de NBER). |
| Recordatorios por SMS al pagar préstamos | Filipinas, 943 préstamos, 2008-2010 (IPA): **sin efecto promedio**; para prestatarios recurrentes, el mensaje con el nombre del oficial de crédito sí aumentó el pago. | [18] ABIERTA, IPA. |
| Mensaje conductual y mora | Colombia: experimento aleatorio con 7 029 clientes atrasados; el SMS reduce 4 % la probabilidad de mora, más con mensajes de norma social y en quienes tenían buen historial. Con 8 019 clientes al día, efecto cero. | [8] ABIERTA, Columbia CGEG, jul-2022. |
| SMS bidireccional para billeteras | Paraguay (Tigo Money): +21 % de transacciones en 2 meses; Filipinas: +7 % en 4 meses. Más de 4 mensajes en la primera semana perjudicaron. | [9] ABIERTA, CGAP, 30-may-2017. |
| Bajar costos no basta | J-PAL, revisión de 14 ensayos: reducir el costo de ahorrar sube la apertura de cuentas, pero casi no el uso regular; quedan barreras de confianza. Que la educación financiera rinde poco: lo dice el resumen del buscador, **[SIN VERIFICAR]** en la parte que leí. | [10b] ABIERTA, J-PAL, jul-2020. |
| Educación financiera BBVA | Fundación Microfinanzas BBVA reporta alcance de más de 500 000 personas en educación (2025) y recordatorios de ahorro por WhatsApp ("Impulso Ahorro"). | **[EMPRESA]**, autoinformado; no encontré evaluación causal independiente. BBVA Research (MIFI 2025) no abierto: **[SIN VERIFICAR]**. |

**Lectura para el producto (inferencia mía, **[ASUMIDO]**):** (1) el mensaje debe ser pocos y en el momento justo; (2) debe nombrar la meta o el compromiso de la persona; (3) donde más mueve es en quien está cerca del límite, no en quien ya paga bien; (4) la confianza se gana con una primera victoria pequeña.

---

## 5. Diseño conversacional para baja cultura financiera

Basado en lo abierto y en práctica; lo que no tiene fuente abierta va marcado.

1. **El motor calcula, la IA explica.** Los montos, fechas y tasas salen de código con pruebas; el modelo solo redacta. Respaldo: OpenAI dice que su experiencia se "diseñó y evaluó" para exactitud y aun así avisa que no sustituye asesoría [11]; el chatbot oficial de Nueva York dio respuestas ilegales y la ciudad lo dejó activo con un aviso ([12b] The Markup, 2-abr-2024).
2. **Responsabilidad por lo que dice el bot.** Caso Moffatt contra Air Canada (2024 BCCRT 149, publicado 14-feb-2024): la aerolínea fue declarada responsable por información errónea de su chatbot. **[SIN VERIFICAR]** por apertura directa: la página que intenté abrir estaba bloqueada; los detalles vienen de resúmenes del buscador. Mensaje para BBVA: lo que el asistente promete, el banco lo responde.
3. **Voz vs texto.** Hay indicios de que la voz ayuda donde se lee poco, pero la evidencia que hallé es de práctica: notificaciones de voz en wolof en Senegal (DFS Lab) y mensajes por IVR o en el idioma local (CGAP, Uganda y Tanzania). **[SIN VERIFICAR]**: no abrí esas fuentes. Para la demo, la voz debe ir acompañada de la cifra en pantalla.
4. **Largo y tono.** Respuestas de una o dos frases con un número y una acción; la nota de CGAP sobre cadencia (más de 4 mensajes en la primera semana empeoró el resultado) respalda no abrumar [9]. Tono llano, sin regaños; la gente "empieza pequeño" [7].
5. **Permisos.** Primero explicar, luego pedir confirmación antes de mover dinero. En Perú, BCP habla de ejecutar "lo que el cliente autorice" y admite la necesidad de más controles [1]. En la demo conviene que el asistente **proponga** y la persona **toque** para ejecutar.
6. **Confianza y explicabilidad.** Mostrar de dónde sale cada cifra ("sumé tus 3 pagos fijos y tu ingreso promedio") y qué supuestos usó. Revolut destaca públicamente qué hace y qué no hace con los datos [13].
7. **Fallos notorios a evitar:** respuestas ilegales con tono seguro (NYC, [12b]); promesas que contradicen la política (Air Canada, sin verificar).

---

## 6. Hueco de mercado y 3 ideas diferenciales

**Hueco en una frase:** en Perú, hasta donde pude verificar, nadie le dice a la persona *"el día X te faltarán S/ Y por esta causa, y estas son 2-3 jugadas con su costo en soles"*, por voz y con cifras calculadas por código; los grandes todavía responden consultas y ejecutan pagos.

### Idea 1 · Aviso de déficit con fecha, causa y 2-3 jugadas costeadas, por voz
- **Qué es:** el asistente proyecta el saldo a 30 días con un rango (ingreso irregular), avisa del primer día en rojo y su causa, y dice por voz tres jugadas con el costo exacto: mover una fecha de pago, recortar un gasto, pedir un adelanto.
- **Por qué nadie lo tiene:** los asistentes revisados (BBVA Blue, Mercado Pago, BCP) reaccionan a preguntas o ejecutan pagos; no anticipan.
- **Por qué le importa a BBVA:** evita sobregiros y morosidad temprana, y le da un motivo para abrir la app antes del problema. **[ASUMIDO]**
- **Dificultad para construir en 1 día:** media. El motor determinista (dinero en céntimos, fechas sin deriva) ya está en el plan del MVP; la voz y el guion son lo que falta.

### Idea 2 · Plan de salida de deudas con costo real, atado a la meta de la persona
- **Qué es:** la persona dice "debo en tres lados"; el asistente ordena las deudas, calcula con código el costo total y cuánto se ahorra pagando primero la más cara, y fija un recordatorio que nombra la meta que la persona eligió (ej. "tu viaje" o "la matrícula").
- **Por qué nadie lo tiene:** lo más parecido es Nubank en Brasil (ver deudas ajenas y renegociar), que depende de un registro central; en Perú no hallé equivalente en asistentes conversacionales **[SIN VERIFICAR]**.
- **Por qué le importa a BBVA:** usa la evidencia de recordatorios con meta propia (+16 % en Perú, **[SIN VERIFICAR]** en el paper) y conecta con crédito sano en vez de sobreendeudamiento, tema que la SBS ya señala [15][16].
- **Dificultad en 1 día:** media. Calcular el orden y el ahorro con código es sencillo; ingresar deudas por voz y confirmarlas es lo delicado.

### Idea 3 · "Preparado para crédito": ver si conviene pedirlo y qué pasa si lo pides
- **Qué es:** antes de pedir un crédito, el asistente simula con el saldo proyectado cómo quedaría el mes: "si pides S/ X a Y meses, tu saldo mínimo bajaría a S/ Z el día W". Si no alcanza, propone la alternativa más barata.
- **Por qué nadie lo tiene:** hoy los bancos ofrecen líneas preaprobadas; no encontré uno que enseñe el efecto sobre el flujo de la persona antes de aceptar. La SBS ya advierte que una línea no es ingreso extra [16].
- **Por qué le importa a BBVA:** crédito mejor colocado y menos morosidad; acceso al crédito para quien hoy duda por miedo a no poder pagar. **[ASUMIDO]**
- **Dificultad en 1 día:** baja a media, si reutiliza el motor de la Idea 1 (misma proyección, un escenario más). La parte que exige cuidado es no parecer una oferta ni asesoría personalizada de inversión.

**Recomendación (inferencia mía):** la Idea 1 es el núcleo de la demo; las ideas 2 y 3 comparten su motor y pueden mostrarse como segunda y tercera escena.

---

## Vacíos (lo que no pude confirmar)

- Interbank-Anthropic y Plin por WhatsApp: solo vi resultados de búsqueda; Gestión es de pago.
- Scotiabank, BanBif, cajas, financieras, B89, Agente Cash: sin hallazgos; podría haber productos que el buscador no mostró.
- Destácame, Zenfi, Kueski, Ualá, RappiPay, Fintual, Mono: no encontré datos verificables sobre asistentes ni operación en Perú.
- Cifras de Experian (72 % de peruanos usa IA en servicios financieros) y de Credicorp (17,3 % de peruanos de 15-64 años la usó en jun-2026): solo vistas en resultados.
- Caso Air Canada, voz en Senegal, Uganda/Tanzania, Kenia: detalle de buscador, sin abrir.
- Paper de Karlan et al.: cifras de Perú (+16 %) no confirmadas abriendo la fuente.
- Qué hacen BBVA España y México con Blue más allá de Perú: fuera del alcance de esta nota.
- Ley 29733 (datos personales) y Reglamento: no investigada aquí (ya anotado en el archivo 03).
- No hay evaluación causal independiente de la educación financiera de BBVA.

## Fuentes abiertas (20)

1. Infomercado, 16-oct-2026: https://infomercado.pe/bcp-proyecta-una-banca-conversacional-con-ia-hacia-2030/
2. Peru Retail, 21-ago-2026: https://www.peru-retail.com/yape-prepara-una-nueva-etapa-de-crecimiento-con-personalizacion-e-inteligencia-artificial/
3. BBVA, 6-feb-2026: https://www.bbva.com/es/pe/innovacion/la-aplicacion-de-bbva-supera-los-3-millones-de-clientes-activos-en-peru-y-se-consolida-como-el-principal-canal-transaccional/
4. RPP (publirreportaje Quipuk), 29-may-2026: https://rpp.pe/campanas/publirreportaje/quipuk-la-app-peruana-que-te-ayuda-a-controlar-tus-finanzas-y-declarar-tus-impuestos-noticia-1690762
5. Nubank, 3-jun-2026: https://nu.com/pt/sala-de-imprensa/consumidores/nova-ferramenta-do-nubank-e-acordo-certo-alerta-sobre-dividas-em-diferentes-instituicoes-e-reune-ofertas-de-negociacao-em-um-so-lugar
6. Olhar Digital, 16-oct-2025: https://olhardigital.com.br/2025/10/16/pro/mercado-pago-lanca-assistente-financeiro-com-ia/
7. Cleo, 28-ene-2026: https://web.meetcleo.com/blog/what-users-want-ai-financial-assistant
8. Columbia CGEG (Barboni, Cárdenas, de Roux), jul-2022: https://cgeg.sipa.columbia.edu/content/behavioral-messages-and-debt-repayment
9. CGAP, 30-may-2017: https://www.cgap.org/blog/how-sms-messaging-can-change-financial-behaviors
10. NatWest Group, 13-feb-2026: https://www.natwestgroup.com/news-and-insights/latest-stories/ai-and-data/2026/feb/being-a-trusted-partner-for-tomorrows-banking-through-technology.html
10b. J-PAL, jul-2020: https://www.povertyactionlab.org/policy-insight/reducing-costs-saving
11. OpenAI, 15-may-2026 (actualizado hasta 2-oct-2026): https://openai.com/index/personal-finance-chatgpt/
12. CX Today, 28-jul-2026 (bunq Finn): https://cxtoday.com/bunq-finn-financial-ai-assistant
12b. The Markup, 2-abr-2024: https://themarkup.org/artificial-intelligence/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-despite-widespread-evidence-its-encouraging-illegal-behavior
13. Tech.eu, 9-abr-2026 (Revolut, Starling, Lunar): https://tech.eu/2026/04/09/revolut-wins-full-uk-banking-licence-as-finally-exits-mobilisation-phase/
14. CMSWire, 27-jul-2026 (Erica): https://www.cmswire.com/digital-experience/bank-of-americas-ai-playbook-what-cx-leaders-can-learn-from-ericas-long-game/
15. Infobae, 3-jun-2026 (datos SBS): https://www.infobae.com/peru/2026/06/03/sbs-utilidad-del-sistema-financiero-alcanza-los-s17934-millones-y-la-morosidad-vuelve-a-niveles-prepandemia/
16. SBS, 19-sep-2026: https://www.sbs.gob.pe/noticia/detallenoticia/idnoticia/4003
17. Gestión, 31-oct-2025 (solo adelanto, de pago): fuente sin contenido útil.
18. IPA, Filipinas (recordatorios por SMS, 2008-2010): https://www.poverty-action.org/study/text-message-loan-repayment-reminders-micro-borrowers-philippines

Nota de conteo: 18 numeradas más 10b y 12b = 20 páginas abiertas; la 17 solo mostró el adelanto, por lo que 19 aportan contenido.
