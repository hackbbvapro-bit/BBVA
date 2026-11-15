# Análisis: guía oficial contra el producto construido

Fecha y hora de este análisis: sábado 14-nov-2026, 09:17 (hora de Lima) `[MEDIDO]`.
Base revisada: rama `rediseno-pro`, commit `dc7b668` (lo último hecho antes de que empezara el evento).
Guía ordenada: [GUIA-OFICIAL-AI-FINANCIAL-LIFE.md](GUIA-OFICIAL-AI-FINANCIAL-LIFE.md).

Etiquetas: `[MEDIDO]` = lo leí en el código o salió de ejecutar algo · `[ASUMIDO]` = criterio propio ·
`[SIN CONFIRMAR]` = depende de lo que diga la organización.

---

## 1. Conclusión en cinco líneas

1. **El problema elegido está bien.** «Predicción de liquidez» y «simulación de escenarios» están en la
   lista de ámbitos de la guía, y los ingresos irregulares son un «escenario difícil» que la guía pide.
2. **La base técnica es sólida** (capas separadas, 353 pruebas, respaldo sin IA, secretos fuera del código).
3. **Hoy rompemos o rozamos tres reglas** que la guía dice que se *penalizan*: marca oficial, datos
   personales reales hacia servicios externos y recomendación de productos concretos.
4. **Nos falta casi entero lo que más puntúa**: evaluación con baseline y métricas (25 puntos de
   «IA y analítica» + los entregables «Datos y metodología» y «Evaluación»).
5. **Sobran funciones.** La guía lo dice literal: «Se premia el valor probado, no el número de funciones
   ni el uso decorativo de IA». Lo construido anoche apostó a lo contrario (más funciones y más pulido).

Analogía: tenemos un auto bien armado y bonito, pero el jurado no califica el auto: califica la
**ficha de pruebas de manejo**. Esa ficha hoy no existe.

---

## 2. Semáforo de reglas (lo que no debemos tocar)

### 2.1 En rojo: corregir antes de enseñar nada

| # | Regla de la guía | Qué hace hoy la app | Evidencia `[MEDIDO]` | Arreglo |
|---|---|---|---|---|
| R1 | No usar «marcas o interfaces bancarias como si fueran un producto oficial» | Se presenta como «Copiloto · exclusivo para clientes BBVA» en el título de la pestaña, bajo el logo y en la pantalla de ingreso | `src/app/layout.tsx:13`, `src/componentes/ui.tsx:62`, `src/app/ingresar/page.tsx:15` | Cambiar por «Prototipo de hackathon · datos sintéticos · no es un producto oficial». La marca aparece en 13 archivos de `src/`: revisar uno por uno (varios son datos de ejemplo y pruebas). En `public/` solo hay iconos propios, sin logotipo del banco. |
| R2 | «No se permite usar datos personales reales» + LLM externo solo «sin enviar información personal» | La opción **principal** de la bienvenida es «Empezar con mis datos» y pide nombre, saldos y deudas reales en una dirección pública. Al conversar, ese perfil viaja al servidor y de ahí al modelo externo | `src/componentes/bienvenida.tsx`, `src/app/api/agente/route.ts`, `src/agente/prompt.ts` | Ver 2.4. No fusionar el PR #4 tal cual. |
| R3 | Igual que R2 | El prompt le dice al modelo que la persona «es inventada y todos sus datos son de ejemplo». En el modo «mis datos» eso es falso | `src/agente/prompt.ts` | Corregir el texto o no llamar al modelo en ese modo. |
| R4 | Igual que R2 | El escáner manda **capturas o PDF de banco reales** (datos personales e interfaz bancaria) a un servicio externo | `src/documentos/extraer.ts:72` | Sacarlo del recorrido; en producción, apagarlo o limitarlo a archivos de ejemplo sintéticos incluidos en el repositorio. |
| R5 | Igual que R2 | La voz de la persona se manda a un tercero para transcribirla | `src/app/api/transcribir/route.ts` | Sacarla de la demo principal; si se conserva, aviso claro y solo con el caso sintético. |

### 2.2 En ámbar: reencuadrar

| # | Regla de la guía | Qué hace hoy la app | Evidencia | Arreglo |
|---|---|---|---|---|
| A1 | Recomendaciones solo como «orientación educativa o simulación… no asesoramiento personalizado regulado» | Hay un catálogo de **productos BBVA reales** con condiciones y enlaces, que se activa según la situación de la persona | `src/recomendaciones/catalogo.ts` `[MEDIDO]` | Opción recomendada: cambiarlo por **tipos genéricos de alternativa** («reprogramar la cuota», «tarjeta con garantía») con fuente y fecha, y el texto «orientación educativa; consulta las condiciones vigentes con tu entidad». Así tampoco usamos la marca como si fuera oficial. |
| A2 | «El trabajo realizado durante el evento debe poder distinguirse» | Los 61 commits son de entre el 13-nov 19:43 y el 14-nov 07:53: **todo es anterior al evento** (inicio 08:30). No hay ninguna marca que separe antes y después | `git log` `[MEDIDO]` | Poner una etiqueta git `pre-evento` en `dc7b668` y declararlo sin rodeos en el README: qué se trajo hecho y qué se hizo en el evento. Preguntar a la organización (ver sección 8). |
| A3 | «No prometer rentabilidades» / lenguaje de certeza | Frases como «quedas libre en N meses» o «Te ahorras S/ X en intereses» suenan a promesa | `src/componentes/deudas.tsx:138-151` `[MEDIDO]` | Añadir el supuesto visible: «si mantienes este pago y no usas más la tarjeta» y «estimación». |
| A4 | Recomendaciones con «fundamento, límites y nivel de confianza» | Las alertas y jugadas muestran causa y costo, pero no confianza ni límites de forma explícita | `[MEDIDO]` (no existe el campo) | Ver capa de evidencia, punto E5. |
| A5 | «Reporte de deudas (SBS)» puede leerse como dato oficial de un regulador | Pestaña con ese nombre | `src/componentes/deudas.tsx:82` `[MEDIDO]` | Rotular «Simulación educativa de tu clasificación» y aclarar que no consulta ninguna central de riesgo. |
| A6 | LLM externo «únicamente si las reglas finales lo autorizan» | La explicación conversada usa un modelo externo | `src/agente/conversar.ts` `[MEDIDO]` | `[SIN CONFIRMAR]` Preguntar hoy. Si no se autoriza, ya tenemos el respaldo sin IA, pero entonces la parte «IA» tendría que ser el motor estadístico evaluado. |

### 2.3 En verde: ya cumple `[MEDIDO]`

- **Datos sintéticos con semilla reproducible**: generador propio (Mulberry32), tres perfiles, 90 días de
  movimientos, comercios ficticios — `src/datos/perfiles.ts`, `src/datos/azar.ts`.
- **Separación de capas**: datos (`src/datos`), cálculo (`src/motor`), explicación (`src/explica`,
  `src/agente`), interfaz (`src/componentes`, `src/app`).
- **Secretos fuera del código**: variables de entorno, `.env` ignorado por git, `.env.example` presente.
- **Validación de entradas, límites y errores**: esquemas Zod, comprobación de origen y de sesión,
  20 peticiones por minuto por visitante y 300 por hora en total — `src/app/api/agente/route.ts`.
- **Mecanismo de respaldo (fallback) y plan sin conexión a la IA**: si no hay clave o el modelo falla,
  responde el motor con plantillas — `src/agente/conversar.ts`.
- **La IA no calcula**: el modelo solo puede pedir cifras a cinco herramientas del motor —
  `src/agente/herramientas.ts`. Es justo la «recomendación explicable» que pide la guía.
- **No ejecuta operaciones reales** y no pide claves, tarjetas ni DNI (límites escritos en el prompt).
- **Pruebas reproducibles**: 40 archivos, 353 pruebas pasadas (medido en la sesión anterior).
- **Demo ejecutable** en local y desplegada, con cuenta de demostración de credenciales ficticias.
- **Sin logotipo bancario**: la marca es un icono propio con la palabra «Copiloto» — `src/componentes/ui.tsx:54`.

### 2.4 Qué hacer con «Empezar con mis datos» (la decisión más incómoda)

Se pidió que cualquiera pudiera entrar y cargar sus datos reales. **Con la guía en la mano, eso no puede
ser el camino principal**: es exactamente el «riesgo de privacidad» que la guía dice que se penaliza.

Lo que sí se puede conservar, y hasta juega a favor:

- **Opción principal:** «Ver el caso de Rosa» (y los otros dos perfiles sintéticos).
- **Opción secundaria:** «Armar un caso de práctica» — la persona inventa o redondea cifras, con el aviso
  «No pongas datos reales: esto es una simulación».
- **En el caso de práctica, nada sale del aparato**: los datos ya se guardan solo en el navegador
  (base local `idb://copiloto`) `[MEDIDO]`; falta que la explicación en ese modo use el respaldo sin IA
  ejecutado en el propio navegador, sin mandar el perfil al servidor.
- Esto se convierte en argumento de pitch: **«la privacidad está en el diseño, no en una promesa»**.

---

## 3. Cómo estamos frente a la tabla de puntos

Semáforo según la evidencia que hoy podríamos enseñar. No pongo números porque serían inventados.

| Criterio | Peso | Hoy | Por qué | Qué lo sube |
|---|---:|---|---|---|
| Valor y definición del problema | 15 | Ámbar | El problema es bueno, pero el usuario no está escrito como exige la guía (perfil, decisión, criterio de éxito) y la app quiere servir a todos | Una página: quién es, qué decisión mejora, cómo sabremos que funcionó |
| IA y analítica | 25 | **Rojo** | No hay baseline, ni métricas, ni casos adversos, ni comparación con una alternativa sencilla | Capa de evidencia (sección 5) |
| Calidad técnica | 25 | Verde claro | Arquitectura, pruebas y seguridad buenas; faltan el diagrama, la versión del modelo y los prompts documentados, y cerrar los riesgos R1–R5 | Documentar + corregir rojos |
| Producto y UX | 15 | Ámbar | Rediseño hecho, pero demasiadas pestañas y funciones para un recorrido de 10 minutos; falta confianza y límites visibles | Un recorrido único de tres pantallas |
| Innovación y diferenciación | 10 | Ámbar | «La IA explica, el código calcula» y el foco en ingreso irregular peruano son diferenciales reales, pero no están demostrados | Medir la fidelidad de las respuestas (groundedness) |
| Demo y evidencia | 10 | Ámbar | El MVP funciona; no hay «resultados verificables» que mostrar | Pantalla o documento de resultados + ensayo |

**Lectura:** los 50 puntos de «IA y analítica» y «Calidad técnica» se ganan con evidencia y documentos,
no con más pantallas. Ahí debe ir casi todo el tiempo que queda.

---

## 4. Entregables obligatorios (sección 05 de la guía)

| Entregable | Estado | Qué falta |
|---|---|---|
| README | Existe pero **desactualizado** (dice «sin IA todavía») y sin las secciones exigidas | Reescribir: problema, usuario, solución, cómo ejecutarlo, requisitos, qué es previo al evento |
| Código y demo | Listo | Corregir R1–R5 antes de publicar |
| Datos y metodología | Hay generador con semilla; **no hay** diccionario, controles de calidad ni escenarios difíciles | Ampliar generador + `docs/DATOS.md` |
| Evaluación | **No existe** | Banco de pruebas, baseline, métricas, resultados y ejemplos de errores → `docs/EVALUACION.md` |
| Arquitectura y seguridad | Repartido en varios documentos; **sin diagrama** | `docs/ARQUITECTURA.md` con un diagrama simple, modelo y versión, prompts, respaldo y salvaguardas |
| Pitch (10 + 3 min) | No preparado | Guion + ensayos + video de respaldo |

---

## 5. Idea de producto, ahora con la guía completa

### 5.1 En una frase

> **Copiloto anticipador:** le avisa a una persona con ingresos irregulares **qué día se quedará sin
> plata, por qué y con cuánta seguridad**, y le muestra dos o tres salidas con su costo en soles.
> El cálculo lo hace un motor estadístico probado contra una alternativa simple; la IA solo lo explica
> y se mide que no invente cifras.

### 5.2 Lo que pide la guía, respondido

| La guía pide | Nuestra respuesta |
|---|---|
| Problema principal | Predicción de liquidez a 30 días (con simulación de escenarios como apoyo) |
| Población definida | Trabajador independiente peruano con ingreso semanal variable (el caso «Rosa») `[ASUMIDO: falta citar fuente del tamaño de esta población o marcarla SIN VERIFICAR]` |
| Decisión a mejorar | «¿Qué hago **antes** del día en que no me alcanza?» (mover un pago, recortar un gasto, pagar el mínimo) |
| Criterio de éxito | El aviso de déficit acierta más y se equivoca menos que una regla simple, y la persona entiende la causa en menos de un minuto |
| IA/ML demostrable y evaluable | (a) Motor de proyección estadístico (percentil prudente de ingresos + detector de recurrentes), medido contra baseline. (b) Agente explicador con herramientas, medido en fidelidad a las cifras |
| Alternativa sencilla para comparar | (a) «Saldo de hoy + promedio neto de los últimos 30 días». (b) La explicación por plantillas sin IA, que ya existe |

### 5.3 Capa de evidencia (lo nuevo)

| # | Pieza | Qué es | Métrica |
|---|---|---|---|
| E1 | **Generador ampliado** | N clientes sintéticos con semilla (propongo 200), con el contrato de la guía (`customer_id`, `transaction_id`, moneda, tipo…) y **etiquetas de referencia** (qué movimiento es recurrente, cuál es duplicado, cuál atípico). Escenarios difíciles: ingreso irregular, suscripción duplicada, cambio de patrón, datos incompletos, gasto atípico | Diccionario, volumen, distribución de montos, semilla |
| E2 | **Prueba retrospectiva (backtest)** | Se le dan al motor 90 días, proyecta 30 y se compara con los 30 días «reales» que el generador guardó aparte. Sin fuga: el motor nunca ve esos 30 días | Error medio del saldo (MAE, MAPE); aciertos y falsas alarmas del aviso de déficit (precision, recall, tasa de falsos positivos); todo **contra el baseline** |
| E3 | **Detector de recurrentes** | Se compara lo que detecta con las etiquetas del generador | precision, recall, F1 |
| E4 | **Fidelidad del agente** | Banco de ~40 preguntas (incluye trampas: intentos de cambiarle las instrucciones, pedirle que invente una tasa, temas fuera de alcance). Un programa comprueba que **toda cifra de la respuesta existe en lo que devolvió el motor** | % de respuestas sin cifras inventadas, % de rechazos correctos, latencia y costo por respuesta; comparado con la plantilla sin IA |
| E5 | **Confianza y límites a la vista** | Cada aviso muestra «Confianza: alta / media / baja» (calculada por código según cuántas semanas de historial hay y cuánto varía el ingreso) y una línea de «qué no sabe este cálculo» | Calibración: cuando dice «alta», ¿acierta más? |
| E6 | **Eliminación de duplicados en la entrada** | Limpieza antes del motor | Prueba con el escenario de duplicados |
| E7 | **Entregables** | `docs/DATOS.md`, `docs/EVALUACION.md`, `docs/ARQUITECTURA.md`, README nuevo | Lista de la sección 4 |

### 5.4 Dos advertencias honestas sobre la evaluación

1. **Riesgo de hacernos trampa solos.** Si el generador fabrica los datos con las mismas reglas que usa
   el motor para predecir, las métricas saldrán perfectas y no probarán nada. Hay que meter ruido y
   escenarios que el motor *no* conoce, usar semillas distintas para ajustar y para evaluar, y decirlo
   en el documento como limitación.
2. **Puede que el motor no le gane al baseline en todo.** Si pasa, se publica igual, con ejemplos de
   errores. La guía penaliza «resultados fabricados» y premia explicar límites; un resultado honesto y
   mediocre vale más que uno perfecto y sospechoso.

Además, correr E4 gasta dinero real en el modelo (unas decenas de llamadas). Necesita visto bueno y tope
de gasto antes de ejecutarse. De paso conviene medir un modelo más pequeño: hoy está configurado el más
caro (`src/servidor/entorno.ts:10`) para respuestas de 2 a 4 frases, y el jurado puede preguntar por qué.

---

## 6. Comparación: lo construido contra lo que conviene presentar

| Tema | Lo construido (sobre un supuesto) | Lo que pide la guía | Qué hacemos |
|---|---|---|---|
| Problema | Liquidez a 30 días + deudas + reporte + cobros + voz + escáner + avisos | **Un** problema principal | **Mantener** liquidez; el resto pasa a «extras» fuera del recorrido |
| Usuario | «Cualquiera puede entrar con sus datos» | Población definida, datos no reales | **Cambiar** a independiente con ingreso irregular; caso de práctica como secundario |
| Datos | 3 perfiles sintéticos con semilla | Dataset documentado, con escenarios difíciles y etiquetas | **Ampliar** (E1) |
| Inteligencia | Motor por reglas + agente con herramientas | Evaluada, con baseline y casos adversos | **Medir** (E2–E4). No añadir modelos |
| Recomendaciones | Jugadas con costo + catálogo de productos BBVA | Educativas, con fundamento, límites y confianza | **Reencuadrar** catálogo (A1) y **añadir** confianza (E5) |
| Marca | «exclusivo para clientes BBVA» | No parecer producto oficial | **Quitar** (R1) |
| Voz, escáner, avisos push | Hechos y funcionando | No dan puntos; la voz y el escáner añaden riesgo de privacidad | **Fuera de la demo principal.** Se mencionan en una línea como trabajo previo |
| Diseño | Rediseño claro terminado (PR #4) | 15 puntos: claridad y confianza | **Conservar** el rediseño; **no fusionar** el PR hasta corregir R1–R5 |
| Documentación | README viejo, sin evaluación | 5 entregables + pitch | **Escribir** (E7) |
| Evidencia del evento | Todo hecho antes de las 08:30 | Trabajo del evento distinguible | **Etiquetar** `pre-evento` y declarar |

**Lo que NO haría aunque apetezca:** añadir otro modelo, un RAG, más agentes o más pantallas.
La guía lo dice dos veces: no dan puntos.

---

## 7. Plan para las horas que quedan

Horarios del evento: sábado hasta las 19:30; domingo de 08:30 a 13:30. La hora de cierre de entregas
todavía no la conocemos `[SIN CONFIRMAR]`; el plan asume congelar el código el domingo a las 10:00.

### Sábado 14

| Hora | Bloque | Resultado comprobable |
|---|---|---|
| 09:30–10:00 | **Decisiones y preguntas** a la organización (sección 8). Etiqueta `pre-evento` | Respuestas anotadas; etiqueta creada |
| 10:00–11:15 | **Cumplimiento** (R1–R5, A1, A3, A5): textos de marca, bienvenida, prompt, catálogo, rótulos | Pruebas en verde; ninguna mención «clientes BBVA»; el caso de práctica no envía nada |
| 11:15–14:00 | **Datos + backtest** (E1, E2, E6) | Comando único que genera el dataset y saca la tabla motor vs. baseline |
| 14:00–16:00 | **Recurrentes + fidelidad del agente** (E3, E4) | Tabla de métricas y lista de errores |
| 16:00–17:30 | **Confianza y límites en pantalla** (E5) + recorrido único de tres pantallas | Verlo funcionar en el teléfono |
| 17:30–18:45 | **Documentos** (E7): README, DATOS, EVALUACION, ARQUITECTURA | Los cinco entregables en el repositorio |
| 18:45–19:30 | **Primer ensayo** cronometrado + grabar video de respaldo | Video guardado; lista de fallos |

### Domingo 15

| Hora | Bloque | Resultado comprobable |
|---|---|---|
| 08:30–10:00 | Corregir fallos del ensayo. **Reserva para la prueba de evolución** si se activa | Pruebas en verde |
| 10:00 | **Congelar el código** | Última versión desplegada y verificada |
| 10:00–11:30 | Dos ensayos más, checklist de salida de la guía, entrega | Entrega confirmada |
| 11:30–13:30 | Pitch (según horario de la organización) | — |

Si el tiempo no alcanza, se recorta en este orden: E5 visual → E3 → fidelidad con menos preguntas.
**Nunca** se recortan el bloque de cumplimiento, el backtest con baseline ni los documentos.

### Preparados para la prueba de evolución

| Cambio sorpresa posible | Estado |
|---|---|
| Ingresos variables | Cubierto: es nuestro caso central |
| Movimientos duplicados | **Falta** (E6): hoy no se eliminan duplicados |
| Recomendación explicable | Medio: hay causas y costo; falta fundamento, límites y confianza (E5) |

---

## 8. Preguntas para la organización (hoy, cuanto antes)

1. ¿Las reglas finales **autorizan usar un LLM externo** con datos sintéticos? (FAQ de la guía.)
2. ¿Se activa la **prueba de evolución**? ¿Cuándo y cuánto pesa?
3. ¿A qué hora **cierran las entregas** y por qué mecanismo? ¿Horario de checkpoints y mentorías?
4. ¿Se confirma el pitch de **10 + 3 minutos**?
5. Traemos **código previo**: ¿cómo quieren que se distinga del trabajo del evento? (Tenemos anotado que
   se confirmó el 13-nov que se permite, pero no consta quién lo dijo ni con qué condiciones.)
6. ¿El repositorio de entrega puede ser **público**?

---

## 9. Decisiones que le tocan al equipo

1. **PR #4 (rediseño):** no fusionarlo tal cual. Recomendación: corregir primero los rojos en la misma rama.
2. **«Mis datos»:** pasa a «caso de práctica» secundario, sin enviar nada fuera del aparato.
3. **Voz, escáner y avisos:** fuera de la demo principal; escáner apagado en producción o solo con ejemplos.
4. **Catálogo de productos:** cambiar a alternativas genéricas educativas.
5. **Aprobar la capa de evidencia** y el tope de gasto para la evaluación del agente.
6. **Etiqueta `pre-evento`** y declaración en el README.

---

## 10. Actualización tras la charla inaugural (14-nov, 09:55)

Fuente: `CHARLA-Y-LAMINAS-14NOV.md`. Esta sección **manda sobre las secciones 3 y 7** donde se contradigan.

### 10.1 Hay dos tablas de puntos y no coinciden

| Tema | Guía impresa | Lámina de la charla | Qué cambia para nosotros |
|---|---:|---:|---|
| IA / ML / analítica | 25 | 25 | Igual. Sigue siendo el criterio más pesado y el más flojo hoy. |
| Calidad técnica / Ingeniería y arquitectura | 25 | 20 | Baja 5. Es donde mejor estamos. |
| Valor del problema + Producto y UX | 15 + 15 = 30 | 20 (uno solo) | Baja 10 en total, pero el ponente insistió de palabra en usabilidad y «efecto wow». |
| Datos sintéticos y evidencia | (dentro de «Demo y evidencia», 10) | **15, criterio propio** | Nuevo y hoy casi vacío: no hay dataset poblacional ni verdad de referencia. |
| Responsible AI | (repartido, sin peso propio) | **10, criterio propio** | Nuevo. Privacidad y límites se están cerrando; sesgos no existe. |
| Innovación y diferenciación | 10 | — | Desaparece. Lo «original» no puntúa por sí solo. |
| Demo / Presentación y storytelling | 10 | 10 | Igual. Añade «respuesta a preguntas» y «roadmap». |

**Cuál manda:** no se sabe; es la primera pregunta para los mentores de mesa. Mientras tanto se trabaja
para la unión de las dos, porque lo que pide la lámina (dataset, verdad de referencia, sesgos) también
lo pedía la guía en letra pequeña (secciones 03 y 05). No hay conflicto de trabajo, solo de pesos.

### 10.2 Lectura: la mitad de la nota es evidencia medida que hoy no existe

Con la tabla de la lámina, **IA/ML (25) + datos sintéticos y evidencia (15) + Responsible AI (10) = 50**.

Estado comprobado en el código a las 09:51 [MEDIDO con `ls` y `grep`]:

| Pieza que piden | ¿Existe? | Detalle |
|---|---|---|
| Generador de datos con semilla | Sí, mínimo | `src/datos/perfiles.ts` (60 líneas): **3 perfiles** (`independiente`, `dependiente`, `mixto`), 90 días, semillas fijas 17/29/43 |
| Dataset poblacional | No | No hay N clientes ni archivo de datos exportable |
| Verdad de referencia (ground truth) | No | Ningún movimiento lleva etiqueta de «recurrente», «duplicado» o «atípico» |
| Diccionario de datos y supuestos | No | — |
| Modelo de predicción | Sí | `src/motor/proyeccion.ts` (`proyectar`), `recurrentes.ts` (`detectarRecurrentes`, `estimarIngresoVariable`, `estimarGastoVariable`), con pruebas unitarias |
| Evaluación contra una alternativa simple | No | No hay carpeta de evaluación, backtest ni baseline |
| Análisis de sesgos | No | — |
| Pruebas de ingeniería | Sí | 353 pruebas en 40 archivos antes del bloque de cumplimiento [MEDIDO antes; por repetir] |

Analogía: tenemos un buen termómetro, pero nunca lo hemos comparado con otro para saber si marca bien.
El jurado va a puntuar esa comparación, no el termómetro.

### 10.3 Lo que la charla confirma

1. **El problema elegido encaja literal.** «Forecast financiero: predecir liquidez, saldo futuro o
   capacidad de cumplimiento» es exactamente el copiloto. No hay que cambiar de problema.
2. **Un solo problema.** «Regla clave: elegir un problema concreto». Deudas, voz, escáner y catálogo son
   acompañantes; en el pitch no deben ocupar más de una frase cada uno.
3. **La arquitectura ya tiene la forma que dibujaron.** Sus cinco cajas se corresponden con nuestras
   carpetas: datos sintéticos → `src/datos`; motor analítico → `src/motor`; IA/ML → `src/motor/proyeccion`
   + `src/agente`; orquestación → `src/agente` (herramientas) + `src/explica`; front → `src/componentes`.
   Falta la pieza «evaluación, trazabilidad» de la cuarta caja.
4. **Cumplimiento.** «Cero datos reales» y «no información confidencial de BBVA» confirman el bloque de
   correcciones que está en curso (marca, caso de práctica sin salida de datos, escáner solo con ejemplo).

### 10.4 Lo que la charla cambia

1. **Hay que probar que la recomendación mejora la decisión.** No basta con predecir el déficit: hay que
   medir qué pasa si el usuario sigue la jugada. Se puede calcular con el motor sobre la población
   sintética: % de déficits que se evitan siguiendo la jugada frente a no hacer nada; soles de interés
   ahorrados pagando en orden frente a pagar mínimos.
2. **Responsible AI pasa a criterio propio.** Hace falta una página o pantalla con: qué explica el
   sistema y cómo, qué no sabe, qué datos usa y cuáles no (ninguna variable sensible: ni sexo, ni edad,
   ni distrito), y **el error medido por tipo de perfil** (¿se equivoca más con el ingreso irregular que
   con el sueldo fijo?). Eso es el análisis de sesgos que piden.
3. **El aspecto pesa más de lo que le di en la sección 3.** UX sube a 20 con el problema y el ponente
   insistió en «efecto wow». El rediseño no fue tiempo perdido. Se mantiene que no hacen falta más
   pantallas: hace falta un recorrido corto y pulido.
4. **Entregable nuevo: roadmap** dentro del pitch, y descripción de «features» y «prompts» en Modelo/IA.
5. **Van a mirar por detrás.** La organización dijo que tiene herramientas e intención de analizar el uso
   de la IA y el desarrollo. Consecuencias: el historial de git debe contar la verdad (qué es previo,
   qué es del evento), no debe haber claves ni datos reales en ningún commit, y cada integrante debe
   poder explicar cualquier parte del código que le pregunten.
6. **Hay nota individual.** Los tres mentores de mesa (Product Owner, Scrum Master, QA) puntúan a cada
   persona en comunicación, liderazgo, iniciativa y calidad técnica. Eso no lo arregla el código: se gana
   hablándoles, enseñándoles avances y pidiéndoles opinión durante el día.
7. **Menos tiempo del que parecía.** Si se presenta el domingo entre las 10 y las 12, el domingo solo
   deja de 08:30 a poco antes de las 10 para ensayar. **Todo lo medible tiene que quedar hecho hoy.**

### 10.5 Dos cosas que no cambian aunque la charla parezca decir otra cosa

1. **«MVP funcional con datos propios» no autoriza datos reales de personas.** «Propios» es «hechos por
   el equipo». La misma charla dice «cero datos reales» y la guía lo penaliza. «Empezar con mis datos»
   se queda como caso de práctica secundario, sin enviar nada fuera del aparato.
2. **La lista de «Machine Learning» no es una lista de compras.** Añadir clustering o un clasificador
   para poder nombrarlos sería «hablar de IA». Lo que puntúa es un modelo de predicción comparado con
   una alternativa simple, con su error y su banda de confianza. Si el motor no le gana al baseline en
   algo, se publica igual (sección 5.4).

### 10.6 Orden de trabajo propuesto (sustituye al plan de la sección 7)

| # | Bloque | Criterio que alimenta | Cuándo |
|---|---|---|---|
| 1 | Terminar cumplimiento (en curso) | Responsible AI, Ingeniería | Sábado mañana |
| 2 | Dataset sintético poblacional con verdad de referencia + diccionario (E1) | Datos y evidencia 15 | Sábado mediodía |
| 3 | Evaluación: backtest con baseline, detector de recurrentes, mejora de la decisión (E2, E3, 10.4-1) | IA/ML 25, Datos y evidencia 15 | Sábado tarde |
| 4 | Página de IA responsable: confianza, límites, error por perfil (E5, 10.4-2) | Responsible AI 10, UX | Sábado tarde |
| 5 | Fidelidad del agente (E4) — necesita tope de gasto | IA/ML 25 | Sábado tarde, si hay visto bueno |
| 6 | Documentos de entrega: README, DATOS, EVALUACION, ARQUITECTURA, MODELO-IA | Los seis entregables | Sábado final |
| 7 | Pitch 5 + 5 con roadmap, y ensayo cronometrado | Presentación 10 | Sábado final y domingo 08:30 |
| 8 | Margen para el cambio sorpresa | Prueba de evolución | Reservar 1 hora |

Los bloques 2 a 4 son trabajo hecho durante el evento y dejan huella en git: de paso resuelven la regla
de «trabajo del evento distinguible del previo».

### 10.7 Preguntas añadidas para la organización (se suman a la sección 8)

7. **¿Qué tabla de puntos manda**, la de la guía impresa o la de la lámina?
8. ¿Formato real del pitch: 10 + 3, 5 + 5 + 5 o 10–15 minutos?
9. ¿Los entregables se suben a algún sitio o basta con el repositorio? ¿A qué hora se congela?
