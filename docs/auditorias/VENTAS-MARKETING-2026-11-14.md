# Auditoría comercial y de marketing: copiloto anticipador

Fecha: sábado 14-nov-2026. Presentación: domingo 15-nov, aprox. 10:00-12:00 (`[SIN CONFIRMAR]` el formato: 10+3, 5+5+5 o 10-15 min).
Auditor: Hark. No se tocó código. El «cliente» a convencer es el jurado; detrás, BBVA como adoptante.

Etiquetas: `[MEDIDO]` lo leí o lo ejecuté yo en esta auditoría · `[DEL REPO]` cifra copiada de `docs/EVALUACION.md` o `investigacion/10-verificacion-de-cifras.md` (no la recalculé) · `[SUPUESTO]` criterio mío · `[SIN VERIFICAR]` no hay fuente.

**Qué revisé y qué no.** `[MEDIDO]` Descargué la producción (portada `/ingresar`, entrada con sesión de demo y los bundles JS) y contrasté sus textos con el código del workspace: coinciden (por ejemplo, la cadena «exclusivo para clientes» ya no está en producción; en las capturas viejas del repo sí aparece). La app dentro de la sesión se pinta en el navegador, así que **no pude ver en pantalla** Hoy, el asistente ni la simulación: eso lo leí del código y de las capturas de `docs/capturas/` (que son anteriores al último cambio de marca). **No probé la voz.** Antes de subir al escenario, alguien debe recorrerla en un celular real.

---

## 1. Veredicto: 6,5 / 10 como pieza de venta

**Conclusión:** el producto está mejor armado que contado. Tiene un gancho excelente («el lunes 23 te faltarán S/ 200») y una evidencia honesta que casi ningún equipo tendrá. Pero la portada abre con una lista de funciones en vez de con ese gancho, el pitch no tiene todavía un modelo de negocio para BBVA, y las cifras propias de evaluación incluyen cuatro datos incómodos que el jurado va a encontrar solo si no los decimos nosotros primero.

Analogía: es un buen mecánico que llega a la reunión con el motor impecable, pero sin decirle al cliente cuánto combustible ahorra ni cuánto cuesta el mantenimiento.

| Dimensión | Nota | Por qué |
|---|---:|---|
| Problema y gancho | 8 | Concreto, en soles, con fecha y causa. Rosa es memorable. |
| Mensaje en 10 segundos | 5 | La portada vende «Proyecta tu saldo día a día» (una función), no «sabrás el día que no te alcanza» (el resultado). El número que impacta está detrás de un clic. |
| Diferenciación | 7 | Hueco real y honesto: previsión de saldo + ingreso irregular. Pero BBVA ya tiene asistente (Blue), presupuestos y alertas; hay que posicionarse como capa de decisión sobre Blue, no como rival. |
| Evidencia | 8 | 1 000 clientes sintéticos, semilla de examen separada, baseline, calibración. Muy superior al promedio. Pero incluye resultados mediocres sin contexto de pitch. |
| Modelo de negocio para BBVA | 3 | No existe en ningún documento. Es el hueco más grande de la historia. |
| Credibilidad | 7 | Privacidad por diseño, aviso de prototipo, honestidad en límites. Resta: promesas sueltas en textos y un asistente sin evaluar. |

La nota sube a 8 con los cambios de la sección 2 hechos hoy; son cambios de texto y de guion, no de código de cálculo.

---

## 2. Los 5 cambios de mayor impacto (priorizados)

### Cambio 1 (crítico): abrir la portada con el resultado, no con la lista de funciones
`[MEDIDO]` Lo primero que ve el jurado tras el botón de ingreso (`bienvenida.tsx`) es la tarjeta «Qué hace el copiloto» con tres filas: «Proyecta tu saldo día a día», «Ordena tus deudas», «Te propone cómo evitarlo». Es lenguaje de catálogo. La frase fuerte («El lunes 23 de noviembre te faltarán S/ 200.00») solo aparece tras pulsar «Ver el caso de Rosa» y esperar la carga.

Texto propuesto para el título de la portada (sobre el gráfico de muestra):

> **Te avisamos el día que no te alcanza la plata, antes de que llegue.**
> Ejemplo: «El lunes 23 te faltarán S/ 200. Estás a tiempo: te mostramos 3 salidas y lo que cuesta cada una, en soles.»

Botón principal (hoy: «Ver el caso de Rosa»):

> **Ver qué le pasa a Rosa en 30 segundos**

Mantener el botón secundario, pero ver cambio 5 sobre cómo se llama.

### Cambio 2 (crítico): construir el caso de negocio para BBVA y ponerlo en el pitch
El jurado es del banco. Si no dices qué gana BBVA, la pregunta decide por ti. La guía pide «valor para el usuario, demo y roadmap» y la lámina de presentación premia «impacto». Hoy no hay ni una hoja con esto. Propuesta en la sección 5, sin una sola cifra inventada: tres palancas (adopción, retención, mora evitada), con la fórmula y qué se mediría en un piloto.

### Cambio 3 (alto): contar las malas noticias de la evaluación nosotros, antes de que las pregunten
`[DEL REPO]` (`docs/EVALUACION.md`, sección 0, motor actual). Estas cuatro cifras las verá cualquiera que abra el repositorio, y la lámina dijo que van a mirar por detrás:

1. A 30 días el motor es **el peor de los cuatro métodos** en error de saldo (S/ 1 360) y es pesimista (prevé S/ 1 019 menos de lo real).
2. **De cada dos avisos, uno se cumple** (precisión 53,8 %); falsa alarma 19,4 % frente a 11,1 % del método simple.
3. La recomendación **ayuda poco**: evita el déficit en 5,1 % de los avisos acertados con la primera jugada (9 de 178; 9,6 % con todas) y el faltante medio solo baja de S/ 792,82 a S/ 736,55 (S/ 685,11 con todas). La cifra anterior (14,6 % / 24,7 %) se midió con jugadas que la app ya no usa.
4. Detecta **72,7 %** de los déficits de dependientes frente a 90,8 % de independientes: es una brecha entre grupos y la lámina pesa «Responsible AI» y sesgos.

Convertirlas en fortaleza: «Medimos contra tres alternativas simples y publicamos donde perdemos. El aviso detecta 84,8 % de los déficits reales; la mejor alternativa simple, 70,5 %. Pagamos eso con más falsas alarmas, y medimos que seguir una falsa alarma no costó dinero.» La guía lo premia («se penalizarán afirmaciones no verificadas, resultados fabricados») y nadie más lo va a decir.

Además: **ya no promocionar «mover un pago»** como jugada estrella. `[DEL REPO]` evita el déficit en 5,5 % de los casos (sección 8); «recortar un gasto» lo hace en 19,1 %. Y el propio informe pide bajar el tono del verbo «resuelve» (solo el 24 % de las jugadas que dicen resolver lo logran). `[SIN VERIFICAR]` si esos textos ya se suavizaron en la app; revisarlo antes de enseñarla.

### Cambio 4 (alto): rebajar las promesas implícitas en los textos
La guía prohíbe prometer rentabilidades y penaliza lo no verificado. `[MEDIDO]` en `bienvenida.tsx`: «Ordena tus deudas: Tarjetas y préstamos en el orden de pago **que más intereses te ahorra**» suena a promesa. `[DEL REPO]` el análisis ya marcó frases similares («quedas libre en N meses», «te ahorras S/ X») como riesgo A3; confirmar que el supuesto visible se añadió.

Texto propuesto:
> **Ordena tus deudas.** Te mostramos, según la simulación, en qué orden pagarlas cuesta menos en intereses.

Y bajo el aviso principal, una línea fija: «Es una estimación a partir de tus movimientos. Tú decides.»

### Cambio 5 (medio-alto): cuidar el relato «datos inventados»
Dos tensiones de mensaje que restan credibilidad si no se resuelven:
- La charla pidió un «MVP funcional con datos propios» `[DEL REPO, interpretación]` y énfasis en «efecto wow» y look and feel. Pero la portada y el botón secundario dicen «Empezar con mi situación». No se entiende si es un caso real o una simulación. Propuesta: «**Armar un caso de práctica**» (ya en `ANALISIS-GUIA-VS-PRODUCTO.md`, 2.4).
- La segunda promesa en la portada es «Incluye voz y asistente de IA». La voz manda audio a un tercero y el asistente no está evaluado. `[SIN VERIFICAR]` autorización de LLM externo (pregunta pendiente 4 de `CHARLA-Y-LAMINAS-14NOV.md`). Decir «el asistente explica; el código calcula» y mostrar el respaldo sin IA como plan B.

---

## 3. Propuesta de valor y diferenciación frente a la banca

### Lo que BBVA Perú ya ofrece (`[DEL REPO]`, `investigacion/02`, consulta del 13-nov, leída en resúmenes, no abriendo la app)
Categorización (Mi Día a Día), presupuestos con alerta, metas, compra de deuda y el asistente Blue. BBVA España y México van más lejos (movimientos previstos, salud financiera). La propia investigación advierte: «no presentar categorizador, presupuesto o meta como novedad».

### Dónde está el hueco `[DEL REPO: PROBABLE, no verificado como ausencia]`
Previsión de saldo a 30 días con fecha y causa; qué deuda pagar primero; ingreso irregular y dinero que pasa por Yape/Plin. Ningún hueco quedó verificado como ausente: **alguien con cuenta BBVA Perú debería abrir la app y comprobarlo antes del domingo**. Si el jurado dice «eso ya lo tenemos» y es cierto, la frase «nadie lo hace» destruye credibilidad. Usar «no encontramos» en lugar de «no existe».

### Frase de diferenciación (hacia el banco, no contra él)
> Una alerta de banco te dice que ya gastaste. Un presupuesto te dice cuánto planeabas gastar. El copiloto te dice **qué día no te alcanzará, por qué, y qué hacer antes de ese día**. Es una capa de decisión que puede vivir dentro de Blue.

Esa comparación es de enfoques, no ataca a nadie.

### Posicionamiento recomendado
«Extensión de Blue para quien no tiene sueldo fijo.» Alinea con la dirección que BBVA ya declaró para Blue (asistente hiperpersonalizado, fuente en `investigacion/02`, tercero, fecha sin verificar) y evita competir con la app.

---

## 4. Claridad en 10 segundos y textos de la portada

### Diagnóstico `[MEDIDO]` (producción, `/ingresar` y entrada)
- `/ingresar`: «Copiloto financiero · Te avisa antes de que te falte dinero y te dice qué pagar primero. Para probarlo entras con un caso de ejemplo: Rosa…». Está bien dicho, con el aviso de prototipo y sin marca bancaria (resuelto R1). Falta el número como imán. El botón dice «Entrar al prototipo»: lenguaje de sistema, no de beneficio.
- Entrada (`bienvenida.tsx`): tres funciones listadas; dos caminos; pie legal largo (cuatro líneas de 13 px).
- La pantalla Hoy (captura) es el mejor activo visual: tarjeta azul con la fecha, S/ 200 en grande y barras que se ponen rojas el 23. Eso debería ser la portada, no la tercera pantalla.

### Textos propuestos (listos para usar)

| Dónde | Hoy | Propuesto |
|---|---|---|
| `/ingresar`, título | Copiloto financiero | **Sabe qué día no te alcanza, antes de que llegue** |
| `/ingresar`, botón | Entrar al prototipo | **Ver el caso de Rosa** |
| `/ingresar`, nota | (aviso actual) | Mantener tal cual: «Prototipo de hackathon con datos sintéticos. No es un producto oficial de ningún banco.» |
| Entrada, fila 1 | Proyecta tu saldo día a día | **Te dice el día exacto en que te faltaría plata y por qué** |
| Entrada, fila 2 | Ordena tus deudas | **Te muestra qué deuda cuesta menos pagar primero (simulación)** |
| Entrada, fila 3 | Te propone cómo evitarlo | **Te da 2 o 3 salidas, cada una con su costo en soles** |
| Botón secundario | Empezar con mi situación | **Armar un caso de práctica (cifras inventadas)** |
| Pie legal | 4 líneas | 2 líneas: «Prototipo educativo con datos inventados. No es asesoría financiera ni opera con dinero real. Nunca escribas datos reales.» (el detalle de privacidad, en «Cómo funciona») |

Cierres de llamada a la acción para el final del pitch (sin urgencia ni escasez):
> «Les proponemos un piloto de 8 semanas con un grupo pequeño de clientes con ingreso irregular, con una cifra que medir al final: cuántos avisos evitaron un descubierto.»  *(el «8 semanas» es una propuesta de diseño `[SUPUESTO]`; ajústenlo con lo que el equipo pueda defender)*

---

## 5. Modelo de negocio para BBVA (hoy no existe; esto es el borrador)

**Regla:** ninguna cifra de ingreso para BBVA se inventa. Se presenta como hipótesis con la fórmula y se dice qué se mediría. El jurado de un banco respeta una hipótesis bien armada y desconfía de un número redondo sin fuente.

### Las tres palancas

| Palanca | Qué es | Cómo se mediría en un piloto | Cifra |
|---|---|---|---|
| **Adopción** | Clientes que abren el aviso y actúan | % de clientes con ingreso irregular que reciben un aviso y abren la jugada | `[SIN VERIFICAR]` hasta piloto |
| **Retención** | Más razones para abrir la app cada semana | Sesiones semanales de quien tiene aviso activo vs. quien no | `[SIN VERIFICAR]` |
| **Mora evitada** | Menos atrasos por no poder pagar una cuota | Cuotas atrasadas en el grupo con aviso vs. un grupo de control | `[SIN VERIFICAR]` |

Fórmula del valor para el banco (con huecos honestos):

> Valor anual = clientes expuestos × % que recibe un aviso útil × % de atrasos evitados por aviso × costo medio de un atraso para el banco.
> Hoy no tenemos ni uno de esos tres últimos factores. **No ponerles número en el pitch.**

### Dato de contexto que sí está verificado `[DEL REPO, investigacion/10]`
- «La app de BBVA ya tiene 3,28 millones de clientes móviles activos» (BBVA Perú, nota del 6-feb-2026): https://www.bbva.com/es/pe/innovacion/la-aplicacion-de-bbva-supera-los-3-millones-de-clientes-activos-en-peru-y-se-consolida-como-el-principal-canal-transaccional/. Son clientes móviles activos, no clientes totales.
- «Solo 39 % podría afrontar un gasto imprevisto equivalente a un mes de ingresos» (SBS-CAF, 2026), fuente en `investigacion/10`. Mide gasto imprevisto, no colchón mensual.
- Cerca de 70 % de informalidad laboral según el INEI `[solo fuente secundaria; no abrió el PDF]`. Decirlo como «cerca de 70 %».

### Qué NO decir
- «El 37 % no tiene colchón» como dato SBS (es Ipsos para Banco Falabella).
- Cuota de BBVA en consumo (19,7 %): `[SIN VERIFICAR]`.
- Cualquier «ahorro por cliente», «mora reducida en X %» o ingresos proyectados. No existen.

### Costo de operar `[DEL REPO, GUIA-FINAL]`
Respuesta del asistente medida el 14-nov en 2 preguntas: Sonnet 5.5 en 3,3-3,5 s, Opus 5.5 en 5,6-5,9 s. El costo por consulta del asistente no está medido. **Mejor decir:** «Los cálculos corren sin IA, a costo de servidor; la IA solo pone palabras, y hay un respaldo sin IA.» Eso responde la pregunta de costo sin inventar una cifra.

---

## 6. Historia del pitch (5 bloques)

Formato `[SIN CONFIRMAR]`. Guion calibrado a 10 minutos; si es 5+5+5, los bloques 1, 2 y 4 son el «pitch» y el 3 es la demo.

| # | Bloque | Tiempo | Qué ocurre |
|---|---|---:|---|
| 1 | Problema | 1:30 | Una persona con ingresos variables no falla por gastar mal: falla por no ver el día en que se juntan dos pagos. Una cifra verificada (39 % de SBS-CAF) y nada más. |
| 2 | Caso Rosa | 1:30 | Rosa vende comida y cobra con billeteras digitales. Tiene alquiler y tarjeta el lunes 23. Pausa. «¿Cuándo se entera Rosa hoy? El 23, cuando ya no le alcanza.» |
| 3 | Momento «wow» | 3:00 | Demo en vivo: abrir el celular con el aviso rojo, «El lunes 23 te faltarán S/ 200», tocar una jugada y ver cómo el gráfico sube. Luego preguntarle al asistente por voz «¿qué pasa si me pagan tarde?». |
| 4 | Evidencia | 2:30 | Una lámina: 1 000 clientes sintéticos nunca vistos, tres alternativas simples, tabla de dónde ganamos y dónde perdemos, con la brecha de dependientes dicha en voz alta. |
| 5 | Modelo para BBVA y cierre | 1:30 | Capa de decisión sobre Blue; tres palancas (adopción, retención, mora evitada); piloto con una cifra que medir; límites explícitos. |

Guion textual en la sección 8.

---

## 7. Objeciones probables del jurado y respuestas (8)

Cada respuesta usa solo lo que tenemos medido. Las marcadas con `*` son las 5 de mayor probabilidad.

**1.\* «Blue ya hace esto» / «Mi Día a Día ya tiene alertas.»**
*Qué significa:* ¿es una función nueva o un duplicado?
> «Blue y Mi Día a Día cuentan lo que ya pasó y alertan cuando te pasas de un presupuesto. En lo que revisamos no encontramos previsión del saldo a 30 días con fecha y causa para quien no tiene sueldo fijo; si está, agradeceríamos que nos lo muestren. El copiloto sería una capa de decisión dentro de Blue: no reemplaza nada.»

**2.\* «Lo midieron con datos que ustedes mismos inventaron.»**
*Qué significa:* circularidad.
> «Es verdad y lo escribimos en el informe, sección 10. Lo que medimos es qué tan bien aguanta el motor ante los procesos que supusimos, con una población de práctica y otra de examen con semillas distintas. No decimos que acierte con personas reales: eso solo lo dice un piloto con datos autorizados. Proponemos justo eso como siguiente paso.»

**3.\* «El aviso se equivoca una de cada dos veces» / «a 30 días es peor que un método simple.»**
*Qué significa:* ¿vale la pena el ruido?
> «Sí, lo medimos y lo publicamos. Detecta 84,8 % de los déficits reales; la mejor alternativa simple, 70,5 %. Pagamos eso con más falsas alarmas (19,4 % frente a 11,1 %). En las falsas alarmas medimos que seguir la jugada no creó ningún déficit y costó céntimos. A 30 días el saldo es el peor de los cuatro por ser prudente: por eso mostramos probabilidad y banda, no una promesa.»

**4.\* «¿Y si la IA se equivoca o da asesoría financiera?»**
*Qué significa:* riesgo y regulación.
> «La IA no calcula nada: pide las cifras a cinco herramientas del motor, que tiene pruebas. Si no hay IA o falla, responde el motor con plantillas. Presentamos orientación educativa y simulación, no asesoría regulada, como pide la guía. Una cosa que aún no medimos es qué tan fielmente repite las cifras el asistente: está pendiente y lo decimos.»

**5.\* «¿Cuánto vale esto para BBVA?»**
*Qué significa:* ¿es un producto o un trabajo escolar?
> «No tenemos todavía una cifra honesta y preferimos no inventarla. El valor sale de tres palancas: adopción, retención y mora evitada. Lo que proponemos es un piloto corto con un grupo de control y una pregunta única: ¿los clientes con aviso se atrasan menos? La app de BBVA ya tiene 3,28 millones de clientes móviles activos; incluso una fracción pequeña con ingreso irregular justificaría medirlo.»  *(no pasar de «justificaría medirlo»)*

**6. «Detecta menos déficits en dependientes (72,7 %) que en independientes (90,8 %).»**
> «Lo vimos. Es la parte de nuestra evaluación que más nos preocupa: al motor le fue peor con el asalariado porque no reconocía el sueldo quincenal; corregimos una causa y aún queda el pago de tarjeta no previsto. Nuestro primer paso con datos reales sería cerrar esa brecha antes de ampliar.»

**7. «¿Qué parte de esto hicieron durante el evento?»**
> `[SIN VERIFICAR]`: la autorización del código previo está en el README («se permite llegar con código previo», 13-nov). Declarar de frente: «El motor y la app base se trajeron hechos; en el evento hicimos la evaluación, la corrección del motor y la adaptación a la guía.» (Ver `docs/EVALUACION.md`, cabecera.)

**8. «¿Por qué solo Rosa? ¿Qué pasa con otros usuarios?»**
> «Elegimos un problema y un usuario, como pide la guía. Los 1 000 clientes sintéticos incluyen dependientes, independientes y mixtos, con ingreso irregular, datos incompletos y gastos atípicos; Rosa es el caso que puedes ver en un minuto.»

---

## 8. Guion del pitch (texto listo, ~10 min)

> Las frases están en voz del equipo. Cambiar las que no puedan decir con naturalidad.

**Bloque 1 · Problema (1:30)**
«Hay una persona que no falla por gastar mal. Falla porque no ve el día en que se juntan dos pagos. Según la Encuesta de Capacidades Financieras de la SBS y CAF, solo 4 de cada 10 peruanos, 39 %, podría afrontar un gasto imprevisto equivalente a un mes de ingresos. Y cuando tu ingreso cambia cada semana, nadie te avisa a tiempo. Les presentamos al copiloto anticipador.»

**Bloque 2 · Rosa (1:30)**
«Esta es Rosa. Es un personaje inventado. Vende comida y cobra con billeteras digitales. Tiene el alquiler y el pago de la tarjeta el lunes 23. Hoy, Rosa se entera ese lunes, cuando el pago ya no pasa. Les pregunto: ¿cuántos de sus clientes se enteran ese lunes?»

**Bloque 3 · Wow (3:00)**
«Miren el celular.» *(abrir Hoy)* «El lunes 23 de noviembre te faltarán S/ 200. Quedan diez días. No es una alerta de que ya gastó: es el día y la causa, antes.» *(tocar una jugada)* «Cada salida trae su costo en soles. Si Rosa recorta este gasto, el gráfico deja de ponerse rojo.» *(voz)* «Y puede preguntarle en voz alta. Una cosa importante: la IA no calcula ni un número. Cada cifra sale de código con pruebas; la IA solo la explica. Si se cae la IA, responde el motor igual.»

**Bloque 4 · Evidencia (2:30)**
«Lo probamos con 1 000 clientes sintéticos que el motor no había visto, con ingreso irregular, datos incompletos y gastos atípicos, y lo comparamos con tres alternativas simples. Detecta 84,8 % de los déficits; la mejor alternativa simple, 70,5 %. A cambio, hace más falsas alarmas: 19,4 % frente a 11,1 %, y en esas falsas alarmas seguir la jugada no creó ningún déficit. Donde perdemos, lo decimos: a 30 días el saldo es prudente y el error es mayor, y con dependientes detecta 72,7 % frente a 90,8 % con independientes. Son datos inventados por nosotros: miden el motor, no a personas reales. Lo reproducen con un comando.»

**Bloque 5 · Modelo para BBVA y cierre (1:30)**
«Para BBVA esto es una capa de decisión dentro de Blue para clientes con ingreso irregular. Tiene tres palancas: adopción, retención y mora evitada. No tenemos todavía una cifra honesta de cuánto valen y por eso no la inventamos: les proponemos un piloto con un grupo de control y una pregunta, si los clientes con aviso se atrasan menos. Es orientación educativa: el cliente siempre decide. Gracias.»

---

## 9. Qué métricas y evidencias mostrar

**Una sola lámina de evidencia** (no varias tablas), con estas filas `[DEL REPO, EVALUACION.md sec. 0]`:

| Pregunta | Motor | Mejor alternativa simple |
|---|---:|---:|
| Déficits reales detectados | 84,8 % (178 de 210) | 70,5 % |
| Falsa alarma | 19,4 % | 11,1 % |
| Probabilidad calibrada (Brier, menos es mejor) | 0,114 | 0,166 |
| Banda del 80 % cubre | 79,8 % | n. a. |
| Jugada evita el déficit | 5,1 % (1ª, 9 de 178) / 9,6 % (todas) | n. a. |

Además: 353 pruebas pasadas `[DEL REPO, análisis de la mañana; volver a correr `npm test` antes de decirlo]`; `npm run evaluar` en ~30 s reproduce todo; el respaldo sin IA ya existe.

**Mostrar en vivo:** el aviso, una jugada y cómo cambia el gráfico; abrir el repositorio o `resultados.json` solo si preguntan.

**Qué NO mostrar como evidencia:** «353 pruebas» como medida de calidad del producto (mide el código, no el resultado); las capturas viejas con «exclusivo para clientes BBVA».

---

## 10. Qué sobra o resta credibilidad

1. **Cualquier «te ahorras S/ X» o «quedas libre en N meses» sin supuesto visible.** La guía penaliza afirmaciones no verificadas.
2. **«Mover un pago» como jugada estrella.** Evita el déficit en 5,5 % de los casos `[DEL REPO]`; si la demo la elige, el jurado lo notará.
3. **Cifras de mercado fuera de la lista verificada.** `investigacion/10` trae una lista «No decir ante el jurado» (37 % de Ipsos como SBS, 57 %/44 % de Ipsos, 28 % en «la IA», 19,7 % de cuota, Yape 16,9 M, 59 %, 4,9 % de mora de tarjetas, 26 mil reclamos, límite de 4 mensajes del CGAP). Respetarla literal.
4. **«Nadie lo hace.»** El hueco es PROBABLE, no verificado. Decir «no encontramos».
5. **Voz y escáner como protagonistas.** No dan puntos en la guía y añaden riesgo de privacidad; en la demo, la voz es un extra de 20 segundos, con plan B de texto.
6. **Mucho material en pantalla.** La pantalla Hoy, Mi dinero, Deudas, Reporte SBS y Hablar son demasiadas pestañas para 10 minutos. El jurado solo recordará una.
7. **Rosa con «Hola, Rosa»** y la fecha congelada «viernes 13 de noviembre»: está bien aclarado en la pantalla; decir en voz alta «el lunes 23», no «en 10 días» (ya está en `GUIA-FINAL.md`).
8. **Llamar «IA» al cálculo.** Un jurado técnico sabe que el motor es estadístico + reglas. Llamarlo «motor analítico evaluado» y reservar «IA» para el asistente que explica, que es justo lo que pide la lámina («distinguir soluciones que solo hablan de IA de las que razonan, miden y explican»).

---

## 11. Pendientes para hoy (en orden)

1. Abrir la app de BBVA Perú con cuenta real y comprobar si hay previsión de saldo, aviso de pago de tarjeta y apoyo a ingreso irregular. Cambia la frase de diferenciación.
2. Preguntar a un mentor de mesa: formato real del pitch, cuál tabla de puntos manda (guía impresa vs. lámina; la lámina sube «Valor de producto y UX» a 20 y añade «Responsible AI» y «Presentación y storytelling» con 10 cada uno), y si el LLM externo está autorizado con datos sintéticos.
3. Cambiar los textos del cambio 1, 4 y 5 (es trabajo del equipo; esta auditoría no tocó código).
4. Escribir la hoja de una página «Modelo para BBVA» con la tabla de la sección 5.
5. Ensayar el guion completo dos veces con cronómetro; la mayor parte de la nota de «Presentación y storytelling» sale de ahí.
6. Grabar el video de respaldo de los 3 minutos de la demo.

---

## 12. Cómo se pondera con las dos tablas de puntos

`[DEL REPO]` Hay dos tablas distintas (guía impresa y lámina). Esta auditoría pesa fuerte lo que aparece en las dos: problema/valor, IA y analítica (25 en ambas), ingeniería y presentación. Lo que cambia según la tabla:
- Si manda la **lámina**: «Responsible AI» (10) y «Datos sintéticos y evidencia» (15) son categorías propias. La brecha de dependientes, la privacidad por diseño y la explicabilidad pasan a ser puntos, no solo defensa. «Presentación y storytelling» (10) es lo que esta auditoría mejora más.
- Si manda la **guía**: «Innovación y diferenciación» (10) y «Demo y evidencia» (10). La diferenciación honesta de la sección 3 y la lámina de evidencia de la sección 9 son lo importante.

En ambos casos el mismo guion funciona.
