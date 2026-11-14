# Cerebro — Sala de guerra: el protocolo para salir de deudas (Perú)

**Para qué existe este módulo.** Los demás módulos explican *cómo funciona* el sistema. Este dice
*en qué orden se dispara* cuando la plata no alcanza para todo. Es el protocolo que el asesor
aplica cada semana mientras la persona tenga cuotas atrasadas o en riesgo.

Investigado el 12/10/2026. 🟢 = norma o fuente oficial leída · 🟠 = prensa, blog o documento de
una entidad · ⚠️ = no verificado o con fuentes contradictorias · ⏱ = cambia con el tiempo.

---

## 1. La regla madre: el reloj de días de atraso manda sobre la tasa

En Perú hay un criterio que los libros gringos (avalancha vs. bola de nieve) no tienen: **la
calificación SBS**. Una cuota que cruza el día 9 o el día 31 de atraso hace un daño que ninguna
diferencia de tasa compensa: te cierra crédito nuevo, te sube el costo de todo lo que pidas después
y queda en el historial aunque pagues.

Tabla 🟢 (Res. SBS 11356-2008, numeral 3, texto consolidado con la modificatoria 2368-2023). Es
**la misma** para consumo revolvente, consumo no revolvente, microempresa y pequeña empresa:

| Días de atraso | Categoría | Qué hacer |
|---|---|---|
| 0 – 8 | Normal | Pagar antes del día 9. Es el último tramo sin marca |
| 9 – 30 | CPP | Ya hay marca del mes. Objetivo: no llegar al día 31 |
| 31 – 60 | Deficiente | Daño serio. Pagar o negociar ya, por escrito |
| 61 – 120 | Dudoso | Empieza a contagiar a otras entidades (ver §2) |
| > 120 | Pérdida | Va camino a castigo. Ver `negociacion-deuda.md` |

**El orden de pago cuando no alcanza (en este orden, sin saltarse):**

1. **Lo que esté entre el día 6 y el 8 de atraso.** Pagarlo hoy evita la marca CPP de ese mes.
2. **Lo que esté en CPP y más cerca del día 31.** Evita Deficiente.
3. **Lo que vence en los próximos 3 días** (para que no se sume a la lista de atrasados).
4. **Recién con eso cubierto**, el pago extra va por **avalancha** (la de mayor TCEA) si las tasas son
   muy distintas, o por **bola de nieve** (la de menor saldo) si las tasas son parecidas o si la
   persona viene de abandonar planes. Ver `consejeria.md` §6.
5. **Deudas informales y familiares** se pagan según lo acordado, pero **no compiten** con una cuota
   que está por cruzar el día 9 o el 31. Se les avisa y se reprograma con ellas por escrito
   (WhatsApp con fecha sirve de prueba).

**Una excepción:** si una informal tiene consecuencia peor que una marca (pérdida de la vivienda,
del local, de la herramienta de trabajo, o rompe una relación de la que depende el ingreso),
sube de prioridad. Eso lo decide la persona, no el asesor.

**Volver a Normal.** Si la cuota no fue refinanciada, al quedar con 8 días o menos de atraso la
siguiente foto mensual vuelve a Normal [CALCULADO del texto de la norma]. **La SBS mira el último
día del mes**: una cuota que se atrasó del 7 al 20 y se pagó el 21 llega al 31 en Normal. Lo que
queda es el registro histórico de centrales privadas, no la categoría del mes siguiente.

## 2. Alineamiento: cuándo una deuda mala contagia a las demás

🟢 Res. SBS 11356-2008 (versión consolidada a 2023; puede haber cambiado ⚠️):

- En deudores minoristas, las demás entidades **solo están obligadas a subir tu calificación**
  cuando la entidad que tiene **al menos el 20% de tu deuda en el sistema** te califica **Dudoso o
  Pérdida**.
- Dentro de una misma entidad, te califican por tu **peor producto**. Excepción: los saldos menores a
  S/ 100 o al 1% de tu deuda (tope 3 UIT).

**Traducción:** un CPP en una caja pequeña no tumba automáticamente tu Normal en el banco grande.
Un Dudoso en tu acreedor principal, sí. Por eso **hay que saber quién es tu acreedor del 20%** y
nunca dejarlo pasar de 60 días.

## 3. Lo que pueden y no pueden cobrarte por atrasarte

🟢 Ley 31143, texto consolidado:

- **Sí** pueden cobrar el interés compensatorio pactado más el **interés moratorio**, desde el día
  de la mora.
- **No** pueden cobrar **penalidad, comisión ni gasto por atraso o incumplimiento**, ni
  **capitalizar intereses** (cobrar interés sobre interés).
- **Tope de tasa** 🟢 (nota informativa BCRP 07/04/2026): **114.13% anual en soles**, 99.84% en
  dólares, vigente de mayo a octubre de 2026. ⏱ **Se actualiza el 1 de noviembre de 2026**: verificar la cifra vigente tras esa actualización. Cubre
  consumo y pequeña y microempresa.
- ⚠️ El Ejecutivo y una parte del Congreso han intentado derogar el tope. Verificar que siga vigente
  antes de citarlo.

**Acción:** si en un estado de cuenta o liquidación aparece "penalidad", "comisión de cobranza",
"gasto de mora" o "gasto administrativo por atraso", **se reclama por escrito**. Plazo de respuesta
de la entidad: **15 días hábiles** 🟢 (Res. SBS 04036-2022).

## 4. Las herramientas, con su costo real en calificación

| Herramienta | Qué hace | Costo oculto |
|---|---|---|
| **Pagar dentro del día 8** | Nada que firmar | Ninguno |
| **Reprogramación** (cambiar fechas sin "dificultad de pago") | Mueve cuotas | Normalmente ninguno; ver `peru-bancario.md` §15 (derecho de los 7 días) |
| **Refinanciación** 🟢 | Cambia plazo o monto **porque no puedes pagar** | Si estabas Normal **pasas a CPP**, y solo subes **una categoría cada 2 trimestres** pagando puntual. Un atraso durante el plan te sube de inmediato |
| **Compra de deuda** | Otra entidad paga la cara y te deja una más barata | Solo sirve si la **TCEA baja claramente y el plazo no se alarga** |
| **Pago anticipado** 🟠 (Ley 29571 art. 86; Indecopi multó al BCP con 110 UIT) | Reduce intereses al día del pago | Si abonas **más de 2 cuotas**, **tú eliges**: bajar la cuota o bajar el plazo. Si no eliges, bajan el plazo. Pedirlo por escrito |
| **Negociar cartera castigada** | Descuento sobre el saldo | Exigir carta de finiquito. Ver `negociacion-deuda.md` |

**Regla:** no se refinancia lo que se puede salvar ajustando el mes. Refinanciar es la última
herramienta antes de la mora larga, no la primera.

## 5. Derechos frente a la cobranza

🟢/🟠 Ley 29571 art. 62 e Indecopi:

- No pueden llamar ni visitar **entre las 20:00 y las 07:00**, ni **sábados, domingos ni feriados**.
- No pueden **contarle la deuda a terceros** (familia, trabajo, vecinos), ni publicar listas de
  deudores. Indecopi multó a Falabella, Scotiabank y, en 2026, al BCP por cartas a terceros.
- No pueden mandar papeles que **parezcan judiciales** sin serlo.
- Si una ventanilla se niega a recibir un pago, se pide constancia. Indecopi multó a Interbank por
  obstaculizar pagos en ventanilla 🟠.

**Siempre por escrito, con cargo:** cronograma actualizado, liquidación de deuda, y al cancelar,
**constancia de no adeudo**.

## 6. El otro lado: cobrar lo que te deben

Un negocio pequeño sale de deudas tanto por **lo que cobra** como por lo que recorta.

- Una **minuta simple** de reconocimiento de deuda **no** es título ejecutivo 🟠. Sí lo son:
  - una **letra de cambio protestada**;
  - un **acta de conciliación** (Ley 27287);
  - una **escritura pública** (CPC art. 688).
- Para cuentas por cobrar grandes, el asesor debe proponer:
  1. un **cronograma firmado** con fecha y monto;
  2. respaldado con **letras**, una por cuota;
  3. con revisión mensual. Si incumple dos cuotas, va a conciliación.
- Un acuerdo de "te pago periódicamente" sin montos ni fechas **no es un activo**: es una esperanza.
  El asesor no lo cuenta en el flujo de caja hasta que tenga fecha.

## 7. Lo que hunde más (prohibido en el plan)

1. **Préstamos "gota a gota" o apps no registradas en la SBS.** Señales: desembolso inmediato, solo
   DNI, interés diario, acceso a tus contactos. Usan cobranza extorsiva 🟠 (alertas SBS 2025).
2. **Préstamo para pagar préstamo sin bajar la TCEA.** Compra tiempo y lo cobra caro.
3. **Pagar solo el mínimo** de la tarjeta mientras hay otras deudas más baratas.
4. **Avance de efectivo**, que tiene TCEA altísima más ITF.
5. **Ruleteo con fintech para conseguir liquidez o millas.** Ver `tarjetas-peru-avanzado.md` §4.
   Comisión segura, millas inciertas, y señal de riesgo para el banco.

## 8. Rutina semanal (mientras haya atrasos)

Una vez por semana, o cuando la persona escriba:

1. Listar cada cuota atrasada con sus **días de atraso**, la categoría de hoy, la fecha límite y el
   día en que salta de categoría. Ordenarlas por urgencia.
2. **Mantener esa lista al día:** agregar la cuota cuando vence sin pagar y quitarla cuando la
   persona confirma el pago. Si la fecha no es segura, usar la más temprana.
3. Ordenar por la regla del §1 y dar **una sola lista**: qué pagar, cuánto, qué día y desde qué cuenta.
4. Revisar las cuentas por cobrar con fecha. Las que no tienen fecha no cuentan.
5. Cada 1 de mayo y cada 1 de noviembre, verificar el tope BCRP y si la Ley 31143 sigue vigente ⏱.

## Fuentes

- 🟢 Res. SBS 11356-2008 consolidada (categorías, alineamiento, refinanciados): https://intranet2.sbs.gob.pe/dv_int_cn/1097/v12.0/Adjuntos/11356-2008.r.pdf
- 🟢 SBS, reporte de deudas: https://www.sbs.gob.pe/usuarios/nuestros-servicios/reporte-de-deudas
- 🟢 Ley 31143 consolidada: https://leyes.congreso.gob.pe/Documentos/2016_2021/ADLP/Texto_Consolidado/31143-TXM.pdf
- 🟢 BCRP, nota informativa 07/04/2026 (tope 114.13%): https://www.bcrp.gob.pe/docs/Transparencia/Notas-Informativas/2026/nota-informativa-2026-04-07.pdf
- 🟢 Circular 0008-2021-BCRP: https://www.bcrp.gob.pe/docs/Transparencia/Normas-Legales/Circulares/2021/circular-0008-2021-bcrp.pdf
- 🟠 Reclamos en 15 días hábiles: https://andina.pe/agencia/noticia-entidades-supervisadas-por-sbs-atienden-reclamos-plazo-15-dias-habiles-943402.aspx
- 🟠 Pago anticipado, multa BCP: https://lpderecho.pe/indecopi-sanciona-bcp-no-reducir-intereses-clientes-pago-anticipado/
- 🟢/🟠 Cobranza: https://indecopi.gob.pe/web/atencion-al-ciudadano/metodos-de-cobranza · https://lpderecho.pe/confirman-multa-bcp-enviar-cartas-notariales-cobranza-terceros-ajenos-deuda-resolucion-352-2026-indecopi-aqp/
- 🟠 Interbank y el pago en ventanilla: https://infomercado.pe/indecopi-multo-a-interbank-con-mas-de-s-34-mil-por-obstaculizar-pago-en-ventanilla/
- 🟠 Títulos ejecutivos: https://lpderecho.pe/articulo-688-del-codigo-procesal-civil-titulos-ejecutivos/
- 🟠 Gota a gota: https://larepublica.pe/sociedad/2025/10/10/conoce-las-7-formas-de-identificar-apps-de-prestamos-usadas-por-gota-a-gota-2000-empresas-operan-bajo-esta-modalidad-evat-ntpe-865310
- 🟠 Evidencia sobre el orden de pago:
  - Gal & McShane 2012 (JMR): https://www.kellogg.northwestern.edu/news/blog/2012/08/07/the-snowball-approach-to-debt/
  - Kettle et al. 2016 (JCR): https://www.netspar.nl/en/knowledge-hub/repayment-concentration-and-consumer-motivation-to-get-out-debt/
  - HBR 2016: https://hbr.org/2016/12/research-the-best-strategy-for-paying-off-credit-card-debt

**Pendiente de verificar ⚠️:**
- tasa moratoria numérica;
- tasas 2026 de compra de deuda;
- plazos y tope del Defensor del Cliente Financiero;
- si la regla de alineamiento cambió después de 2023.
