# Deuda de consumo y tarjetas de crédito en el Perú (estado a nov-2026)

Consulta: 13-nov-2026. Método: búsquedas web + apertura de 17 páginas de origen (BCRP, SBS, El Peruano, Infobae, Andina, La República, Perú Retail, Infomercado, SBS-estadísticas). Lo que solo vi en el resumen de un buscador va marcado **no verificado** [SIN VERIFICAR]. Etiquetas: [MEDIDO] = leído en la fuente abierta; [CALCULADO] = cuenta mía con fórmula; [ASUMIDO] = supuesto.

Profundiza y corrige `01-problemas-financieros-peru.md` (ver sección «Correcciones»).

---

## (a) Conclusión en 5 líneas

1. **La deuda de consumo crece rápido, pero la calidad de la cartera mejora**: crédito de consumo +13,2 % anual en set-2026 (tarjetas +11,7 %); el ratio de incumplimiento (RI) de consumo bajó de 10,5 % (jun-2024) a 6,2 % (mar-2026). El problema ya no es «todos están quebrando»: es **cuánto cuesta lo que se debe y quién queda atrapado**.
2. **La tarjeta es cara y se está encareciendo**: la tasa (TEA) promedio de tarjeta en bancos subió de 53,1 % (ene-2024) a 64,8 % (set-2026), con un tope legal de 114,68 % desde el 2-nov-2026. Quien paga poco cada mes puede tardar años en salir.
3. **Hay una bolsa grande de personas «fuera del sistema»**: una estimación privada (VANZUL) habla de más de 4,5 millones con deudas en mora o castigadas. La cifra oficial por persona no está en fuentes abiertas que pude leer.
4. **El crédito informal es la salida de quien ya no entra al banco**: 9,3 % de hogares urbanos recibió un préstamo informal (IPE, 2024) y el «gota a gota» pasó de 22 % a 35 % de ese mercado.
5. **El hueco de producto es claro**: nadie (que yo haya encontrado) le dice a una persona común, con fecha y en soles, «tu tarjeta te costará S/ X si pagas Y», ni le arma la salida (compra de deuda, reprogramar, pagar con retiro AFP). Eso es lo que un copiloto puede hacer con cálculo determinista.

---

## (b) Tabla de cifras clave

| Dato | Valor | Fecha del dato | Fuente | URL | Verificado |
|---|---|---|---|---|---|
| Tope legal de tasa compensatoria (consumo, MN), vigente | 114,68 % (era 114,13 % hasta 30-oct) | desde 2-nov-2026 | BCRP, series estadísticas (serie PD38590DD) | https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD38590DD/json/2026-10-20/2026-11-12 | Sí [MEDIDO] |
| TEA promedio tarjeta de crédito, banca, MN | 53,1 % (ene-2024) → 58,2 % (ene-2025) → 62,6 % (ene-2026) → 64,8 % (set-2026) | ene-2024 a set-2026 | BCRP, series PN07845NM (TEA, no TCEA) | https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PN07845NM-PN07863NM-PN07881NM/json/2024-1/2026-9 | Sí [MEDIDO] |
| TEA tarjeta, cajas municipales / cajas rurales | 37,1 % / 61,4 % | set-2026 | BCRP, mismas series | (misma URL) | Sí [MEDIDO] |
| Crédito de consumo, crecimiento anual | 13,2 % (ago: 12,7 %); +1,2 % mensual | set-2026 | BCRP vía Andina | https://andina.pe/agencia/noticia-consumer-credit-in-peru-grew-by-132-yearonyear-in-september-2026-1098441.aspx | Sí [MEDIDO] |
| Deuda en tarjetas, crecimiento anual | 11,7 % (ago: 11,9 %) | set-2026 | BCRP vía Andina | (misma URL) | Sí [MEDIDO] |
| Ratio de incumplimiento (RI) consumo | 6,2 % (pico 10,5 % en jun-2024) | mar-2026 | SBS, Informe de Estabilidad (IESF) vía El Peruano e Infobae | https://elperuano.pe/noticia/297240-sbs-mejor-situacion-financiera-de-los-hogares-impulsa-el-credito | Sí [MEDIDO] |
| Morosidad general del sistema | 3,3 % (mar-2026); 3,43 % (feb-2026, −0,59 pp anual) | feb/mar-2026 | SBS vía Infobae | https://www.infobae.com/peru/2026/06/03/sbs-utilidad-del-sistema-financiero-alcanza-los-s17934-millones-y-la-morosidad-vuelve-a-niveles-prepandemia/ | Sí [MEDIDO] |
| Ratio cuota-ingreso (RCI) promedio, consumo e hipotecario | 25,8 % (2025) vs 27 % (2024); mínimo desde 2018 | 2025 | SBS, IESF | (URL El Peruano arriba) | Sí [MEDIDO] |
| Crédito de consumo, crecimiento anual (SBS) | 8 % | mar-2026 | SBS, IESF | (URL El Peruano arriba) | Sí [MEDIDO] |
| Tarjetas de crédito de consumo emitidas por la banca | 6,2 millones | ~jun-2024 (nota de sep-2024) | Perú Retail citando a un investigador de la UCSS sobre datos SBS | https://www.peru-retail.com/cinco-bancos-controlan-el-89-de-las-tarjetas-de-credito-en-peru-estas-son-las-principales-entidades-emisoras/ | Sí, pero fuente secundaria y antigua |
| Concentración de tarjetas | 5 bancos = 89 % (BCP y Falabella 1,3 M c/u; Interbank 1 M; Ripley 902 mil; BBVA 883 mil) | ~2024 | Perú Retail (misma nota) | (misma URL) | Sí, secundaria |
| TEA promedio de tarjeta por banco (2024) | Ripley 100,02 %; Falabella 98,31 %; Interbank 71,09 %; BCP 68,97 %; BBVA 60,76 %; promedio sector 70,62 % | ~2024 | Perú Retail (misma nota) | (misma URL) | Sí, secundaria y de 2024; la serie BCRP de arriba (bancos, promedio) da otra base |
| Jóvenes 18-24 con tarjeta; mora de tarjetas de consumo en ese tramo | ~20 % con tarjeta; mora 6,2 % | ~2024 | Perú Retail (misma nota) | (misma URL) | Sí, secundaria. Ojo: 6,2 % aquí es morosidad de tarjetas en jóvenes, **no** es el RI de consumo (también 6,2 %): coincidencia, son medidas distintas |
| Millennials: deuda promedio; con atrasos | S/ 9.614,83 (tarjetas S/ 5.966,18); 43 % con deudas vencidas; ~30 % usa la tarjeta como «extensión del sueldo» | deuda a may-2024 (nota oct-2025) | Equifax vía Infobae | https://www.infobae.com/peru/2025/10/27/millennials-son-la-generacion-mas-endeudada-en-peru-tarjetas-de-credito-prestamos-e-hipotecas-presionan-su-economia/ | Sí (cifra de Equifax, no de la SBS) |
| Personas con deuda en mora o castigada | >4,5 millones; mercado S/ 40.000-50.000 millones; creciendo 7-9 % anual | nota del «27 de mayo» (año no visible; asumo 2026) [ASUMIDO] | VANZUL citado por Infomercado | https://infomercado.pe/mas-de-4-5-millones-de-peruanos-acumulan-deudas-vencidas/ | Sí, pero es estimación privada |
| Morosidad regional (sistema) | Loreto 7,25 %; Tumbes 6,82 %; Ancash 6,65 %; San Martín 6,52 %. Cajas rurales 6,31 %, cajas municipales 5,66 %, banca 3,1 %; Lima 2,7 % | feb-2026 | SBS vía Infobae | https://www.infobae.com/peru/2026/04/19/morosidad-del-sistema-financiero-cae-en-febrero-pero-tendria-un-hipo-en-no-mas-de-6-meses/ | Sí [MEDIDO] |
| Hogares urbanos con préstamo informal | 9,3 % (~605.000 familias; 580.000 en 2022); monto S/ 1.780 millones | 2024 | IPE vía La República | https://larepublica.pe/economia/2024/10/22/gota-a-gota-peruanos-pagan-hasta-cinco-veces-mas-por-un-prestamo-informal-1174492 | Sí (estudio IPE leído por vía de la nota) |
| «Gota a gota» dentro del crédito informal | 35 % (era 22 % dos años antes); ~211.000 familias; 51 % de usuarios paga >500 % anual; 78 % pagó más de lo pactado; 16 % se sintió amenazado | 2024 | IPE vía La República | (misma URL) | Sí |
| Razón más común del crédito informal | «el pago de deudas informales» (IPE) | 2024 | IPE vía La República | (misma URL) | Sí |
| 8.º retiro AFP: solicitudes y monto | 3,13 millones de afiliados; S/ 17.900 millones (20 % menos que el 7.º); la SBS reconoce que se destina a consumo y pago de deudas | a nov-2025 | SBS (superintendente) vía La República | https://larepublica.pe/economia/2025/12/11/sbs-alerta-que-4-millones-de-afiliados-ya-no-tienen-saldo-en-sus-afp-tras-retiros-masivos-hnews-1098163 | Sí |
| Afiliados AFP sin saldo | ~4 millones | dic-2025 | SBS vía La República; Infobae (feb-2026) | https://www.infobae.com/peru/2026/02/26/ultimo-retiro-afp-ha-sido-menor-a-anteriores-debido-a-cuentas-sin-fondo/ | Sí |
| Mensaje oficial sobre pago mínimo | «pagar solo el monto mínimo puede prolongar el tiempo necesario» y generar mayores costos | 19-sep-2026 | SBS, nota de prensa | https://www.sbs.gob.pe/noticia/detallenoticia/idnoticia/4003 | Sí |
| Tarjetas totales y morosidad específica de tarjetas 2026 | no obtenidos (tablas SBS en .XLS que no pude abrir) | — | SBS estadísticas B-3242 y C-1242 | https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=C-1242 | **No** |
| Morosidad de tarjetas 4,9 % (may-2025) vs 6,5 % (2023) | ver Correcciones | may-2025 | La República (nota 20-jul-2025), vía 01-problemas | https://larepublica.pe/economia/2025/07/20/record-en-creditos-de-consumo-peruanos-se-endeudan-mas-pero-pagan-a-tiempo-y-la-morosidad-sigue-baja-hnews-724640 | Sí (leí el pasaje; no hay serie mensual) |
| 6,26 millones de tarjetas | dic-2024 | BBVA «mitos y verdades» (citando SBS) | https://www.bbva.com/es/pe/salud-financiera/mitos-y-verdades-del-uso-de-las-tarjetas-de-credito/ | **No** [SIN VERIFICAR] (solo vi el extracto del buscador) |
| 6,2 millones de peruanos con deudas vencidas en el sistema financiero (SBS) | fecha no indicada | Revista Economía | https://www.revistaeconomia.com/del-ahogo-financiero-a-la-recuperacion-como-la-insolvencia-puede-ser-una-salida-en-peru/ | **No** [SIN VERIFICAR]; sin fecha, no usar en pitch |
| Retiro AFP: tope 4 UIT = S/ 21.400 | 8.º retiro | varias notas | — | **No** [SIN VERIFICAR] |
| Ley que reduce el plazo para salir de la «lista negra» de centrales de riesgo (7 días tras pagar) | ago-2025 | Congreso (título visto) | https://comunicaciones.congreso.gob.pe/despacho-informa/publican-ley-que-reduce-plazo-para-salir-de-lista-negra-de-centrales-de-riesgo/ | **No** [SIN VERIFICAR] el detalle de plazos |
| Reclamos/denuncias por tarjetas (Indecopi: >26 mil reclamos, 2023; ~500 sanciones a 17 proveedores) | 2023 / 2025 | Indecopi, Gestión | https://www.gob.pe/institucion/indecopi/noticias/793178-el-indecopi-atendio-mas-de-26-mil-reclamos-por-inconvenientes-con-tarjetas-de-credito | **No** [SIN VERIFICAR] |
| BBVA compra de deuda a tarjeta, hasta 36 cuotas | 2026 | BBVA Perú | https://www.bbva.pe | **No** [SIN VERIFICAR] |
| SBS: bancos responden por fraudes en tarjetas emitidas antes de jul-2025 desde 1-jun-2026 (Res. 00771-2026) | mar-2026 | Infobae | https://www.infobae.com/peru/2026/03/18/ | **No** [SIN VERIFICAR] (URL parcial) |

Cuenta de ejemplo [CALCULADO] (no es dato oficial; es la fórmula n = −ln(1 − B·i / P) / ln(1 + i), con TEA 64,77 %, o sea TEM 4,249 %, deuda de S/ 3.000 y cuota fija P; sin comisiones ni seguros, por eso es un piso del costo real):

| Pago mensual fijo | Meses para salir | Total pagado | Intereses |
|---|---|---|---|
| S/ 150 | 45,6 | S/ 6.835 | S/ 3.835 |
| S/ 200 | 24,4 | S/ 4.875 | S/ 1.875 |
| S/ 300 | 13,3 | S/ 3.988 | S/ 988 |
| S/ 500 | 7,1 | S/ 3.536 | S/ 536 |

Lectura: con S/ 150 al mes (5 % de la deuda), los intereses superan a lo prestado. El interés del primer mes sobre S/ 3.000 es ≈ S/ 127,5; si el pago mínimo es cercano a eso, la deuda casi no baja. La regla exacta del «pago mínimo» la fija cada banco; yo asumí cuota fija [ASUMIDO].

---

## Correcciones a `01-problemas-financieros-peru.md`

- **«La morosidad de tarjetas rebotó a 4,9 % (mayo-2025) tras 6,5 % en 2023»**: la redacción engaña. La nota original dice que la mora de tarjetas «se incrementó a 4,9 %, aún lejos del 6,5 % de 2023»: o sea, hubo un repunte puntual pero **el nivel es mucho menor que el de 2023**, y la tendencia posterior de consumo es a la baja (RI 10,5 % jun-2024 → 6,2 % mar-2026). No hay serie mensual de tarjetas posterior a may-2025 en lo que pude abrir. No se debe pitchear «la mora de tarjetas está subiendo».
- **«El crédito de consumo crece +7,0 % a set-2025»**: sigue siendo cierto, pero hoy es **+13,2 % (set-2026, BCRP)** y +8 % según la medida SBS a mar-2026. Son medidas distintas (sistema vs fecha); usar la del BCRP para «ahora».
- **No mezclar «morosidad» con «RI»**: 4,8 % (consumo, sistema supervisado, mar-2026) es morosidad [SIN VERIFICAR, dato de buscador]; 6,2 % es RI (incluye refinanciados y cartera castigada reciente). El pitch debe decir cuál usa.
- **Estaba marcado «no hallé el número de deudores»**: sigue sin estar oficial, pero hay una estimación privada (>4,5 M, VANZUL) y un cálculo de Equifax por generación. Ver gaps.
- **«Tasas de tarjetas pueden superar 100 %»**: cierto para tiendas retail (Ripley 100,02 %, Falabella 98,31 % en 2024), pero el promedio bancario es 64,8 %; el techo legal es 114,68 %. No decir «las tarjetas cobran 100 %» sin decir de cuáles.

---

## (c) Las 5 situaciones de vida más comunes y dolorosas

1. **«Pago solo el mínimo y la deuda no baja»**: tarjeta de S/ 2.000-5.000 que se arrastra meses; los intereses se comen el pago. Masivo: ~6 millones de tarjetas de consumo (2024), deuda en tarjetas creciendo 11,7 % anual, y ~30 % de millennials la usa «como extensión del sueldo» (Equifax).
2. **«Tengo varias deudas y no sé cuál pagar primero»**: tarjeta + préstamo personal + cuotas de tienda; el 43 % de los millennials ya tiene alguna vencida (Equifax, deuda a may-2024). RCI promedio 25,8 % del ingreso solo en deuda.
3. **«Caí en mora, me reportaron y ya no me prestan»**: más de 4,5 millones con deuda en mora o castigada (estimación VANZUL), mayoría personas naturales fuera del sistema formal. Efecto doble: sin acceso a crédito barato y con cobranza.
4. **«Me falta para fin de mes y recurro a lo informal»**: 605.000 familias urbanas con préstamo informal; el gota a gota ya es 35 % de ese mercado; 51 % de sus usuarios paga más de 500 % anual (IPE). La razón más común es pagar otras deudas: círculo vicioso.
5. **«Saqué mi AFP para pagar deudas y ahora vuelvo a endeudarme»**: 3,13 millones pidieron el 8.º retiro (S/ 17.900 millones); la SBS reconoce que se usa para consumo y pago de deudas; ~4 millones de afiliados ya sin saldo. Se pierde el ahorro de jubilación y, si no se corrige el hábito, la deuda vuelve.

Grupos más golpeados (parcial, con huecos):
- **Jóvenes**: ~20 % de 18-24 con tarjeta; mora de tarjetas 6,2 % en ese tramo (~2024, secundaria). Millennials: deuda promedio S/ 9.615.
- **Regiones**: Loreto, Tumbes, Ancash, San Martín por encima de 6,5 %; cajas rurales (6,31 %) y municipales (5,66 %) concentran la mora; Lima 2,7 %.
- **Independientes e informales**: informalidad 70,2 % (INEI 2025, vía 01-problemas, no reabierto aquí): sin ingreso fijo, la cuota fija duele más. Sin cifra propia de deuda por informalidad.
- **Mujeres**: **no hallé dato** de deuda o morosidad de tarjetas por sexo en fuente abierta. No afirmar nada.

---

## (d) Qué debería hacer un copiloto de IA en cada situación

Regla del proyecto: los montos, tasas y fechas los calcula el código; la IA solo explica.

1. **Pago mínimo**
   - Mostrar «si pagas el mínimo, terminas en N meses y pagas S/ X de intereses; si pagas S/ Y, terminas en M meses» (motor determinista con la TEA real de la tarjeta de la persona).
   - Alerta con fecha: «tu saldo no baja porque el mínimo apenas cubre el interés».
   - Proponer el pago que cierra la deuda en una fecha elegida y mostrar de dónde sale en el flujo de 30 días.
2. **Varias deudas**
   - Ordenar por TCEA (avalancha) y por saldo (bola de nieve), mostrar la diferencia en soles y meses, y recomendar por regla (ver `conocimiento/metodo-asesor.md` §3.1).
   - Detectar si el RCI personal pasa de ~30 % (referencia SBS) y avisar antes del próximo corte.
3. **Mora y reporte**
   - Explicar con lenguaje llano qué pasa en cada tramo de atraso y qué sale de las centrales (con el plazo de la ley vigente, una vez verificado).
   - Calcular el costo de refinanciar vs reprogramar vs comprar deuda, y avisar el efecto en la calificación (no inventar: marcarlo como estimado).
   - Preparar el mensaje al banco o a Indecopi/Defensoría con los datos ya ordenados (borrador; lo envía la persona).
4. **Tentación de crédito informal**
   - Antes del gota a gota o app dudosa: «este préstamo equivale a 500 % anual; así queda tu mes» y alternativa formal con costo en soles.
   - Checklist anti-fraude de apps (lista oficial de entidades supervisadas por la SBS) y advertencia de «te piden adelantado» o «acceso a tu galería/contactos».
   - Si ya está dentro: plan para salir sin pagar más que lo pactado, y a qué canal denunciar.
5. **Retiro AFP para deudas**
   - Simulador «¿conviene usar mi retiro para esta deuda?»: ahorro de intereses (de la TEA de esa deuda) contra lo que se pierde en jubilación (supuesto de rentabilidad marcado [ASUMIDO]).
   - Priorizar la deuda más cara con el dinero, y programar que, una vez pagada, esa cuota se vaya a un ahorro automático para no re-endeudarse.

---

## (e) Tres cifras de impacto para abrir un pitch ante el jurado BBVA

1. **«La tarjeta promedio en el Perú cobra 64,8 % anual, y desde el 2 de noviembre el tope legal es 114,68 %.»** (BCRP, set-2026 y nov-2026) [MEDIDO]. Subió desde 53,1 % en enero de 2024.
2. **«Con una deuda de S/ 3.000 pagando S/ 150 al mes, tardas casi cuatro años y pagas más de S/ 3.800 solo en intereses.»** [CALCULADO] con la TEA promedio del BCRP (64,8 %), sin comisiones; es un ejemplo, no un dato oficial.
3. **«Más de 4,5 millones de peruanos tienen deudas en mora o castigadas; el gota a gota ya es 35 % del crédito informal.»** Esa cifra es una estimación de VANZUL (privada) y la del gota a gota es del IPE (2024). En el pitch decir «según VANZUL» y «según el IPE»; no presentarla como cifra oficial.

Cifra de contraste honesta que conviene tener lista (el jurado BBVA la conoce): el RI de consumo bajó a 6,2 % y la morosidad general es 3,3 %. El argumento no es «hay más mora» sino «hay más deuda y más cara, y la persona común no tiene quien le haga la cuenta».

---

## (f) Huecos de investigación

- **Número oficial de deudores y de tarjetas en 2026** (SBS B-3242 / C-1242 son .XLS que no pude descargar).
- **Morosidad específica de tarjetas después de may-2025**.
- **«Bicicleteo»** (pagar una tarjeta con otra): no hallé ninguna encuesta ni estadística. No usar el término con cifra.
- **Pago mínimo como conducta**: no hay cifra de cuántos pagan solo el mínimo; solo el mensaje de la SBS y el cálculo.
- **Retiro de efectivo con tarjeta** (disposición): vi 112,9 % de tasa en un caso en el buscador (BCP), sin abrir ni validar; no usarlo.
- **TCEA de tarjetas** (con comisiones y seguros): la serie BCRP es TEA. Falta el rango de TCEA real, que es lo que debe comparar el producto.
- **Membresías y comisiones más reclamadas**: sin cifra confirmada; las menciones de Indecopi/Gestión no se abrieron.
- **Compra de deuda, reprogramación y refinanciamiento en BBVA Perú**: sin condiciones verificadas; hay que abrir la página oficial del banco y su Defensoría. Idem efecto en la calificación crediticia y en Infocorp.
- **Informe 2025 de la Defensoría del Cliente Financiero**: no encontrado.
- **Mujeres, informales y jóvenes**: no hay serie de tarjetas por sexo ni por tipo de ingreso; para jóvenes solo una nota secundaria de 2024 y una de Equifax (millennials).
- **Compras en cuotas** y **retiro de CTS** para pagar deuda: no investigado a fondo.
- **Gota a gota 2025-2026**: la cifra IPE es de 2024; no abrí la nota de apps fraudulentas (La República, oct-2025: «2000 empresas operan bajo esta modalidad»).
- **Fecha del estudio VANZUL**: solo se ve «27 de mayo»; el año es una suposición mía.
- **Dato de BBVA 6,26 M tarjetas (dic-2024)**: no abrí la página.

---

## (g) Fuentes (páginas abiertas y leídas)

1. BCRP, serie PD38590DD, tope de tasa compensatoria de consumo — https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD38590DD/json/2026-10-20/2026-11-12
2. BCRP, series PN07845NM/PN07863NM/PN07881NM, TEA tarjeta — https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PN07845NM-PN07863NM-PN07881NM/json/2024-1/2026-9
3. BCRP, nota informativa 2026-04-07 (abierta; el texto no cargó, solo se usó el dato de calendario de actualización vía buscador) — https://www.bcrp.gob.pe/docs/Transparencia/Notas-Informativas/2026/nota-informativa-2026-04-07.pdf
4. Andina (BCRP), crédito de consumo set-2026 — https://andina.pe/agencia/noticia-consumer-credit-in-peru-grew-by-132-yearonyear-in-september-2026-1098441.aspx
5. El Peruano (SBS IESF), 4-jun-2026 — https://elperuano.pe/noticia/297240-sbs-mejor-situacion-financiera-de-los-hogares-impulsa-el-credito
6. Infobae, 3-jun-2026 (SBS utilidad, morosidad 3,3 %, RCI) — https://www.infobae.com/peru/2026/06/03/sbs-utilidad-del-sistema-financiero-alcanza-los-s17934-millones-y-la-morosidad-vuelve-a-niveles-prepandemia/
7. Infobae, 19-abr-2026 (morosidad regional) — https://www.infobae.com/peru/2026/04/19/morosidad-del-sistema-financiero-cae-en-febrero-pero-tendria-un-hipo-en-no-mas-de-6-meses/
8. SBS, nota de prensa 19-sep-2026 (primera tarjeta, pago mínimo) — https://www.sbs.gob.pe/noticia/detallenoticia/idnoticia/4003
9. SBS estadísticas B-3242 (nº de tarjetas) y C-1242 (morosidad por tipo) — páginas abiertas, tablas no descargadas
10. Perú Retail, 23-sep-2024 (6,2 M tarjetas, tasas por banco, jóvenes) — https://www.peru-retail.com/cinco-bancos-controlan-el-89-de-las-tarjetas-de-credito-en-peru-estas-son-las-principales-entidades-emisoras/
11. La República, 20-jul-2025 (mora tarjetas 4,9 % vs 6,5 %) — https://larepublica.pe/economia/2025/07/20/record-en-creditos-de-consumo-peruanos-se-endeudan-mas-pero-pagan-a-tiempo-y-la-morosidad-sigue-baja-hnews-724640
12. La República, 22-oct-2024 (IPE crédito informal / gota a gota) — https://larepublica.pe/economia/2024/10/22/gota-a-gota-peruanos-pagan-hasta-cinco-veces-mas-por-un-prestamo-informal-1174492
13. Infomercado (VANZUL), nota del 27 de mayo — https://infomercado.pe/mas-de-4-5-millones-de-peruanos-acumulan-deudas-vencidas/
14. Infobae, 27-oct-2025 (Equifax, millennials) — https://www.infobae.com/peru/2025/10/27/millennials-son-la-generacion-mas-endeudada-en-peru-tarjetas-de-credito-prestamos-e-hipotecas-presionan-su-economia/
15. La República, 11-dic-2025 (SBS, 8.º retiro AFP) — https://larepublica.pe/economia/2025/12/11/sbs-alerta-que-4-millones-de-afiliados-ya-no-tienen-saldo-en-sus-afp-tras-retiros-masivos-hnews-1098163
16. Infobae, 26-feb-2026 (retiro AFP menor, cuentas sin fondo) — https://www.infobae.com/peru/2026/02/26/ultimo-retiro-afp-ha-sido-menor-a-anteriores-debido-a-cuentas-sin-fondo/
17. Expreso, nota «Banca peruana gana más que en EE.UU.» (13-sep-2026; abierta, no usada en cifras por no poder separar el dato de tarjetas) — https://www.expreso.com.pe/?p=1315179

Solo vistos en resultados de buscador (no abiertos; no se usan como dato firme): BBVA «mitos y verdades», Revista Economía, comunicado del Congreso sobre la ley de centrales de riesgo, Indecopi/Gestión, Infobae fraude SBS, La República apps de gota a gota (oct-2025).
