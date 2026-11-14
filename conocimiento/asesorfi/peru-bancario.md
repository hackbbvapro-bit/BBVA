# Cerebro — Sistema bancario peruano y estrategia de tarjetas

Base de conocimiento del asesor. Todo aquí es legal y está al alcance de cualquier cliente: lo que cambia no es el acceso, es saber que existe y saber el orden.

> **Nota sobre vigencia:** las tasas, topes legales y comisiones cambian. Los apartados marcados con ⏱ deben verificarse en la fuente oficial antes de citarse como número exacto. La mecánica (lo que no lleva ⏱) no cambia. Las cifras que no traen norma o fuente citada llevan `[SIN VERIFICAR]`.

---

## 1. La mecánica que lo explica todo: corte, pago y gracia

Esta sección es el 60% del valor de todo el documento. Casi nadie la usa bien.

**Analogía:** tu tarjeta es un préstamo que el banco te da *gratis* durante unos días. La fecha de corte es la foto que le toma el banco a tu deuda. Lo que salga en la foto lo pagas en la fecha de pago. Lo que ocurra *después* de la foto entra en la foto del mes siguiente.

Tres fechas:

- **Fecha de corte (facturación):** cierra el ciclo. Todo consumo hasta ese día entra en el estado de cuenta de este mes.
- **Fecha de pago (vencimiento):** el último día para pagar sin intereses ni mora. Suele caer ~18–22 días después del corte [SIN VERIFICAR].
- **Días de gracia:** el tiempo entre que compras y que te toca pagar. Es financiamiento **a costo cero**.

### La regla del día después del corte

Una compra hecha **el día siguiente al corte** obtiene la máxima gracia posible: espera casi un ciclo completo hasta el próximo corte, más los ~20 días hasta la fecha de pago.

```
Corte día 15, pago día 5 del mes siguiente:
  Compra el 16 de enero  -> entra en el corte del 15 de febrero -> se paga el 5 de marzo
                          -> 48 días de dinero del banco, gratis.
  Compra el 14 de enero  -> entra en el corte del 15 de enero  -> se paga el 5 de febrero
                          -> 22 días.
```

**Consecuencia práctica:** con dos o más tarjetas de bancos distintos, con fechas de corte separadas (ej. día 5 y día 20), siempre hay una tarjeta que está "recién cortada". Compras con esa. Eso solo, aplicado todo el año, es entre 30 y 50 días de flujo de caja gratis permanente [SIN VERIFICAR].

**Condición indispensable:** la gracia solo existe si pagas el **total facturado**. Si pagas menos, pierdes la gracia y los intereses empiezan a correr desde la fecha de cada compra, no desde el vencimiento.

### Lo que rompe la gracia

- Pagar el mínimo o cualquier monto menor al total facturado.
- **Disposición de efectivo** (retiro en cajero con la tarjeta de crédito): genera interés **desde el segundo cero**, sin gracia, y con comisión encima. Es el producto más caro del banco.
- Compras en cuotas: no tienen gracia, tienen tasa desde el día uno (salvo campañas sin intereses).

---

## 2. Cómo gana el banco contigo (para saber qué evitar)

Ordenado de más caro a menos caro para el cliente:

| Producto | Cómo te cobra | Veredicto |
|---|---|---|
| **Disposición de efectivo / "efectivo preferente"** | Comisión de desembolso (típico 3–5% [SIN VERIFICAR]) + TEA alta + sin gracia ⏱ | 🔴 Evitar salvo emergencia real |
| **Revolvente (pagar menos del total)** | TEA de las más altas del sistema, capitalizada mensual | 🔴 El agujero negro. Salir cuanto antes |
| **Pago mínimo** | Amortiza muy poco capital; el resto es interés | 🔴 Diseñado para que la deuda dure años |
| **Cuotas con intereses** | TEA fija sobre el total, se cobra completa aunque adelantes mal | 🟡 Solo si la TCEA es menor que tu alternativa |
| **Membresía anual** | Cargo fijo por tener el plástico | 🟡 Negociable y con frecuencia exonerable |
| **Seguro de desgravamen / protección de tarjeta** | Prima mensual sobre saldo | 🟡 Revisar si lo contrataste sin saberlo |
| **Comisión por uso en el exterior / cambio de moneda** | 2–3% sobre el monto ⏱ [SIN VERIFICAR] | 🟡 Comparar con tarjetas sin recargo |
| **Mora** | Interés moratorio + reporte a central de riesgo (la Ley 31143 prohíbe cobrar penalidad o comisión por el atraso; ver `salida-de-deudas.md` §3) | 🔴 El daño reputacional supera al monetario |
| **Compras normales pagadas al total** | El banco gana del comercio (intercambio), no de ti | 🟢 Esto es lo que quieres hacer |

**Regla mental:** si el banco te lo ofrece con insistencia por teléfono o por app (efectivo, "convierte tu compra en cuotas", "usa tu línea paralela"), casi siempre es porque es rentable *para el banco*. Eso no lo hace malo automáticamente, pero obliga a calcular la TCEA antes de aceptar.

---

## 3. Historial crediticio en Perú: cómo funciona de verdad

### 3.1 Quién sabe qué de ti

- **SBS — Reporte de Deudas (Central de Riesgos):** la fuente oficial. Reúne lo que **todas** las entidades supervisadas reportan de ti. Consulta gratuita con DNI en el portal de la SBS.
- **Infocorp (Equifax) y Sentinel:** centrales de riesgo privadas. Toman la data de la SBS y agregan información propia (servicios, telecos, etc.) y arman su propio puntaje.
- **Mito a destruir:** Infocorp **no es una "lista negra"**. Todos estamos ahí. Estar en Infocorp con calificación Normal es *bueno* — significa que tienes historial. No tener historial es casi tan malo como tenerlo malo.

### 3.2 Las 5 categorías SBS (créditos de consumo y MYPE; Res. SBS 11356-2008)

| Categoría | Nombre | Días de atraso | Qué significa en la práctica |
|---|---|---|---|
| 0 | **Normal** | 0 – 8 días | Acceso a crédito sin fricción |
| 1 | **CPP** (Con Problemas Potenciales) | 9 – 30 días | Empiezan a cerrarte productos nuevos |
| 2 | **Deficiente** | 31 – 60 días | Acceso muy limitado |
| 3 | **Dudoso** | 61 – 120 días | Rechazo en la mayoría de entidades |
| 4 | **Pérdida** | más de 120 días | La entidad da la deuda por irrecuperable |

**El dato accionable:** el salto de Normal a CPP ocurre al **día 9** de atraso. Ocho días de atraso son recuperables sin marca de categoría; nueve ya te marcan. Y la marca **queda en el historial aunque pagues después** — pagar limpia la deuda, no borra el registro histórico del atraso.

**Corolario:** un atraso de 9 días por S/ 50 hace el mismo daño de categoría que uno por S/ 5,000. Nunca dejes vencer un monto pequeño "porque es poco".

### 3.3 Qué construye un buen historial (en orden de peso)

1. **Puntualidad** — cero atrasos, sostenido en el tiempo. Es el factor dominante.
2. **Antigüedad** — una tarjeta vieja vale más que una nueva. **Nunca cierres tu tarjeta más antigua**; si te molesta la membresía, negocia la exoneración o pide cambiarla de producto en vez de cancelarla.
3. **Utilización** — cuánto de tu línea usas. Ver sección 4.
4. **Mix de productos** — tener tarjeta + un crédito con cuotas (vehicular, personal, hipotecario) bien pagado demuestra más que solo tarjetas.
5. **Consultas** — muchas solicitudes de crédito en poco tiempo leen como desesperación. No pidas 4 tarjetas el mismo mes.

### 3.4 Higiene obligatoria

- Revisa tu reporte SBS al menos **cada 3 meses**. Buscas: deudas que no reconoces, montos mal reportados, cuentas que creías cerradas y siguen abiertas.
- Errores en centrales de riesgo son frecuentes y **se corrigen por reclamo formal**. La entidad que reportó mal es la que tiene que rectificar.
- Cuando cancelas un producto, exige **constancia de no adeudo**. Sin ese papel, la disputa futura la pierdes.

---

## 4. Utilización: la palanca más rápida que existe

**Utilización = saldo reportado ÷ línea de crédito.**

Umbrales: **< 30% es bueno, < 10% es excelente, > 50% te penaliza** [SIN VERIFICAR: reglas prácticas de la industria, no norma]. Aplica tanto por tarjeta individual como al total.

### El truco del timing — versión PERÚ

Ojo: el modelo de EE.UU. (el emisor reporta el saldo del día de corte) **no es el de Perú**. En Perú la regla está en la norma SBS.

**En Perú, lo que ve la central es el saldo contable al ÚLTIMO DÍA DEL MES**, el mismo para
todos los bancos:

- El Reporte Crediticio de Deudores (RCD, Anexo N° 6, Res. SBS 14353-2009) consigna "la fecha
  a la que corresponden los saldos", y el saldo de cada cliente **debe cuadrar con el Balance de
  Comprobación mensual** — es decir, el saldo final del mes.
- Las entidades envían el RCD hasta el **día 15** del mes siguiente (13 días desde la data de
  nov-2026 y 10 desde may-2027, Res. SBS 1663-2026). La SBS consolida en ~1 semana. Por eso un
  reporte del día 21 muestra "datos SBS al 31" del mes anterior.
- En **tarjetas**, se reporta el **saldo total adeudado** a fin de mes (cuenta 1401.01.02), no
  el del último estado de cuenta: **los consumos no facturados también cuentan** (inferencia sólida
  del Manual de Contabilidad SBS, no frase literal).
- **La fecha de corte de la tarjeta NO define el saldo reportado.** Sí define otro campo: el A-33
  informa si en el último ciclo pagaste **el total, el mínimo, menos del mínimo o nada**
  (Oficio Múltiple SBS 05838-2021). Ese dato también lo ven los bancos.

**La jugada:** un **abono antes de fin de mes** baja el saldo que se reporta. Margen práctico:
**3 a 5 días antes del último día**, en día hábil, y **antes de las 14:30 si es interbancario**
(las transferencias diferidas de la CCE pasan al siguiente día hábil) [SIN VERIFICAR: regla práctica]. Luego confirmar en la app
que la deuda bajó, y **no volver a comprar con esa tarjeta hasta el día 1**.

**Lo que NO reemplaza:** pagar el total facturado en la fecha de vencimiento. El campo A-33 registra
si pagaste solo el mínimo, aunque el saldo de fin de mes salga bajo.

**Cuándo usarla** (es un abono legítimo, no un truco contable): los 2–3 meses previos a pedir un aumento de línea o un crédito.

**Si la foto salió alta, no hay corrección rápida.** La Ley 32327 (actualización en 7 días hábiles)
solo aplica a deudas **en mora** que se regularizaron. Un saldo alto pero al día se corrige recién
con la foto del mes siguiente.
La ley **actualiza** el registro a "regularizado"; no borra el atraso pasado (eso solo lo hacen los 5 años
de la Ley 27489). Reglamento: Res. SBS 02531-2025, vigente desde 08/08/2025. Ver `credito-sustento-ingresos.md` §5.

### Otra vía: sube la línea, no bajes el gasto

Utilización es una fracción. Si no puedes bajar el numerador (gasto), sube el denominador (línea). Un aumento de línea aprobado baja tu utilización el mismo día, sin que cambies un solo hábito. Por eso escalar líneas no es solo "más crédito disponible": es **higiene de score**.

⚠️ Con una condición: subir la línea solo ayuda si **no** subes el gasto en proporción. Si cada aumento de línea se traduce en más consumo, estás construyendo la trampa en vez de la defensa.

---

## 5. Escalamiento de líneas — el playbook

Objetivo: llegar a líneas altas con utilización baja, que es exactamente el perfil que el sistema premia.

### Cómo decide el banco

Los bancos evalúan periódicamente y de forma automática: historial de pagos, uso real de la tarjeta, ingresos declarados y capacidad de pago (deuda total del sistema vs. ingreso). Algunos suben la línea solos; otros solo si lo pides.

Tres formas de pedirlo: app/web del banco, banca telefónica, o agencia. La app es la vía más rápida y la que menos fricción tiene.

### Secuencia de 12 meses

**Meses 1–3 — Construir la señal**
- Cero atrasos. Domicilia el pago total o pon alarmas 3 días antes de cada vencimiento.
- Usa la tarjeta **todos los meses** (una tarjeta sin movimiento no genera historial). Consumos reales, no compras artificiales.
- Mantén utilización reportada < 30% con pagos antes del corte.

**Meses 4–6 — Primer pedido**
- Actualiza tus ingresos en el banco *antes* de pedir. Boletas, recibos por honorarios, declaración anual. El banco no adivina que ganas más.
- Pide aumento en tu banco principal (donde llega tu sueldo). Es el que más data tiene de ti y el que más fácil aprueba.
- Si te lo niegan, **pregunta el motivo** y pídelo por escrito. Ese motivo es tu lista de tareas.

**Meses 7–9 — Diversificar emisores**
- Segunda tarjeta en **otro** banco, idealmente con fecha de corte separada ~15 días de la primera (ver sección 1).
- Criterio de elección, en este orden: (1) sin membresía o exonerable, (2) TCEA baja, (3) beneficios que uses de verdad. Los beneficios son el último criterio, no el primero.
- No pidas dos tarjetas el mismo mes.

**Meses 10–12 — Consolidar**
- Segundo pedido de aumento en el banco 1, primer pedido en el banco 2.
- Aquí ya tienes lo que buscabas: línea total alta, utilización baja, dos ciclos de facturación desfasados, historial limpio de 12 meses.

### Qué NO hacer

- ❌ Pedir aumento con utilización arriba de 50% — es el peor momento posible.
- ❌ Aceptar automáticamente cada "línea paralela de efectivo" que te ofrecen. Esa línea suele ser un producto distinto, más caro, y a veces consume tu capacidad de endeudamiento.
- ❌ Cerrar tarjetas viejas para "ordenarte". Mata antigüedad y sube utilización de golpe.
- ❌ Aceptar un aumento y celebrarlo gastándolo.

---

## 6. Membresías y comisiones: casi todo es negociable

⏱ *El marco legal de topes de tasas y comisiones ha cambiado en los últimos años (Ley 31143 y modificaciones posteriores). Verificar vigencia en SBS antes de citar un tope específico.*

Lo que se mantiene estable en la práctica:

- Existen en el mercado peruano tarjetas **sin membresía** de los principales emisores. Si te cobran membresía, hay alternativa.
- La membresía **es negociable**. El guion que funciona: *"Estoy evaluando cambiarme a [tarjeta sin membresía de otro banco]. ¿Pueden exonerarme la membresía o tengo que cerrar la cuenta?"* — retención de clientes es un área real con presupuesto real.
- Muchas exoneraciones son **condicionales**: se activan con un consumo mínimo mensual. Vale la pena tenerlas anotadas para no perderlas por descuido.
- **Hoja Resumen Informativa (HRI):** cada tarjeta tiene una, y es obligatoria. Ahí está todo: TCEA, todas las comisiones, todos los seguros. Si el banco te cobra algo que no está en la HRI, es cobro indebido.

### Auditoría de comisiones (hacer 1 vez al año)

Revisar en el estado de cuenta línea por línea, buscando: seguros que no recuerdas contratar, "protección de tarjeta", membresías de programas de beneficios, comisión de mantenimiento, envío de estado físico. Cada uno de esos es cancelable con una llamada.

---

## 7. Cuotas vs. revolvente vs. contado

### Jerarquía de decisión

1. **Pagar el total facturado** — costo cero. Siempre la primera opción.
2. **Cuotas SIN intereses (campaña real)** — costo cero y además difiere el desembolso. Excelente, con una advertencia: verifica que la TCEA de la operación sea efectivamente 0%, porque a veces la "promoción sin intereses" trae comisión de por medio.
3. **Cuotas CON intereses** — solo si la TCEA es menor que tu alternativa real de financiamiento.
4. **Revolvente** — última opción, y con plan de salida escrito.

### La trampa del pago mínimo

El pago mínimo se compone de las cuotas del período más una porción del revolvente. Por regulación debe amortizar **algo** de capital — pero "algo" puede ser muy poco. Pagar el mínimo de forma sostenida es cómo una deuda de S/ 3,000 termina costando el doble [SIN VERIFICAR: ejemplo ilustrativo].

**Regla del asesor:** el pago mínimo existe para evitar la mora en un mes malo. Usarlo dos meses seguidos es una señal 🔴 que exige plan de rescate.

### La trampa de la conversión automática

Varios bancos ofrecen (o configuran por defecto) que las compras sobre cierto monto se conviertan en cuotas. Revisa la configuración de tu tarjeta en la app: si está activada y no lo decidiste tú, desactívala.

---

## 8. TCEA: la única cifra que importa

**TEA** = tasa de interés. **TCEA** = tasa + comisiones + seguros + todo cargo obligatorio. Es el costo real.

Comparar créditos por TEA o por "cuota mensual" es como comparar autos por el color. **Siempre TCEA.**

- La SBS publica y compara tasas de todas las entidades (portal de tasas / Retasas). Es gratis y es la herramienta que ningún banco te va a recomendar.
- Regla: antes de aceptar cualquier crédito, tarjeta o refinanciamiento, buscar la TCEA equivalente en al menos 3 entidades.
- Una "cuota más baja" casi siempre significa "más plazo" y por tanto **más intereses totales**. Compara el **costo total del crédito**, no la cuota.

---

## 9. Compra de deuda y refinanciamiento

**Compra de deuda:** otro banco paga tu deuda y te la traslada a mejor tasa. Es una herramienta legítima y en Perú es un mercado activo y competitivo.

Sirve si: la TCEA nueva es **materialmente** menor, y no alargas el plazo tanto que el ahorro se evapora.

Se vuelve trampa si: usas la compra de deuda para liberar la línea de la tarjeta vieja... y vuelves a llenarla. Ahí terminaste con dos deudas. **Regla: si haces compra de deuda, la línea liberada se congela.**

**Refinanciamiento (por dificultad de pago):** ojo — un refinanciamiento por incapacidad de pago **se reporta** y afecta la calificación. Distinto de una compra de deuda voluntaria por mejor tasa. Si estás por atrasarte, habla con el banco **antes** del vencimiento: reprogramar antes de caer en mora es mucho mejor que negociar después.

---

## 10. Tus derechos (y cómo usarlos)

Esto es dinero real que la mayoría deja sobre la mesa.

- **Reclamos:** el plazo para reclamar sobre el estado de cuenta no puede ser menor a **30 días desde la fecha de corte** [SIN VERIFICAR]. Reclama por escrito y guarda el número de registro.
- **Ruta de escalamiento:** (1) Canal de reclamos del banco → (2) Defensoría del Cliente Financiero → (3) **Indecopi**. Cada escalón sube la probabilidad de que te devuelvan.
- **Libro de Reclamaciones** — físico y virtual, obligatorio. Genera constancia con plazo de respuesta.
- **Cargos no reconocidos:** repórtalos apenas los detectes. Cuanto antes, más fuerte tu posición.
- **Bloqueo por robo/pérdida:** después del aviso, la responsabilidad pasa al emisor. **La hora del aviso es la que define quién paga** — llama primero, ordena después.
- **Cancelación de productos:** tienes derecho a cerrar un producto. Exige la constancia de no adeudo por escrito.
- **Modificación unilateral de condiciones:** el banco debe informarte con anticipación los cambios de tasas y comisiones; ante un cambio que no aceptas, tienes derecho a dar por concluida la relación sin penalidad.

---

## 11. Los 10 errores caros más comunes en Perú

1. **Pagar el mínimo** de forma habitual.
2. **Retirar efectivo con la tarjeta de crédito** — el producto más caro que existe.
3. **Pagar después de la fecha de vencimiento por un día** — mora + camino a CPP.
4. **Tener tarjeta en dólares y pagarla en soles sin mirar el tipo de cambio** que aplica el banco (suele ser peor que el del mercado).
5. **Cerrar la tarjeta más antigua** para "simplificar".
6. **No usar la tarjeta durante meses** — no genera historial y a veces la cancelan por inactividad.
7. **Aceptar cuotas por defecto** sin revisar la TCEA de la operación.
8. **No reclamar cargos pequeños** recurrentes — S/ 15 al mes son S/ 180 al año, y una llamada los quita.
9. **Pedir varios créditos el mismo mes** — lee como desesperación.
10. **Confundir línea disponible con dinero propio.** No es tu plata. Es un préstamo con fecha.

---

## 12. Orden de prioridades financieras (marco de decisión)

Cuando aparece plata extra, este es el orden — de arriba hacia abajo, sin saltarse escalones:

1. **Colchón mínimo:** 1 mes de gastos en efectivo líquido [SIN VERIFICAR: regla práctica]. Sin esto, cualquier imprevisto vuelve a la tarjeta.
2. **Matar deuda cara:** todo lo que tenga TCEA alta (revolvente, efectivo, tarjetas). Rendimiento garantizado igual a la tasa que dejas de pagar — imposible de superar con inversión.
3. **Fondo de emergencia completo:** 3 a 6 meses de gastos [SIN VERIFICAR: regla práctica]. En instrumento líquido y de bajo riesgo.
4. **Deuda de costo medio:** créditos personales, vehicular.
5. **Inversión de largo plazo** — diversificada, de bajo costo, con horizonte definido.
6. **Deuda barata** (hipotecaria con tasa baja): no hay urgencia en prepagarla si tu inversión rinde más.

**Método de pago de deudas:** *avalancha* (atacar la de mayor TCEA primero) es matemáticamente óptima. *Bola de nieve* (la de menor saldo primero) es psicológicamente más sostenible. Si la persona ha abandonado planes antes, bola de nieve gana — el plan que se cumple le gana al plan óptimo que se abandona.

---

## 13. Checklist mensual del asesor

**Al recibir el estado de cuenta (revisar dentro de los 30 días del corte):**
- [ ] Línea por línea: ¿reconozco todos los cargos?
- [ ] ¿Aparecieron comisiones o seguros nuevos?
- [ ] ¿Cuál fue la utilización reportada en el corte?
- [ ] ¿Hay saldo revolvente arrastrado? ¿Cuánto interés pagué este mes?

**Antes de cada fecha de pago:**
- [ ] Pago programado del **total facturado** (no del mínimo)
- [ ] Fondos disponibles en la cuenta de cargo

**Trimestral:**
- [ ] Reporte SBS de deudas — buscar errores
- [ ] Comparar mis TCEA contra el mercado
- [ ] ¿Toca pedir aumento de línea?

**Anual:**
- [ ] Auditoría completa de comisiones y seguros
- [ ] Renegociar membresías
- [ ] Revisar si mis tarjetas siguen siendo las mejores del mercado

---

## 14. Compra de deuda y consolidación — el mercado peruano

Trasladar tu deuda a otro banco que la paga y te la reprograma a mejores condiciones.
En Perú es un mercado activo: lo ofrecen **BCP, BBVA, Interbank, Scotiabank, Falabella,
Ripley y varias cajas municipales**.

- Rango de tasas ⏱: aproximadamente **14% a 38% TEA** según perfil; promedio 2026 estimado
  entre 18% y 35%. Plazos de 12 a 60 meses. Trámite típico: 5 a 15 días hábiles
  [SIN VERIFICAR: referencias de un comparador privado].
- **No daña tu historial**: la deuda anterior figura cancelada y la nueva como vigente.
  Bien ejecutada, hasta puede mejorar el score [SIN VERIFICAR].

**Los tres filtros antes de aceptar una compra de deuda:**

1. ¿La **TCEA** nueva es materialmente menor? (TCEA, no TEA, no "cuota")
2. ¿El **costo total** del crédito baja, o solo baja la cuota porque estiraron el plazo?
3. ¿Qué pasa con las líneas que quedan liberadas?

**Regla de hierro:** si haces compra de deuda, las líneas liberadas se congelan. Volver a
llenarlas es cómo una consolidación se convierte en el doble de deuda.

## 15. Reprogramación: el derecho de los 7 días

Cambio muy relevante: las entidades deben **atender solicitudes de reprogramación de deuda
en 7 días**, y mientras dura la evaluación **no pueden aplicarte intereses moratorios ni
cargos adicionales** a los originalmente pactados.

**Reprogramación ≠ refinanciamiento:**

| | Qué es | Efecto en el reporte |
|---|---|---|
| **Reprogramación** | Cambio de calendario sin nuevo contrato (mover fecha, 1-2 meses de gracia) | Menor impacto |
| **Refinanciamiento** | Se cancela el crédito y nace uno nuevo con otras condiciones | **Se reporta** como refinanciado |

**La regla de oro: negociar ANTES de dejar de pagar, no después.** Los bancos son mucho más
receptivos con quien se adelanta que con quien ya cayó en mora. Y no es solo actitud: antes
de la mora conservas tu calificación Normal, que es tu principal activo en la mesa.

## 16. Rutas de reclamo — el escalón que casi nadie usa

Tres instancias, en orden:

**1. El banco.** Reclamo formal con código de registro. Plazo general de respuesta:
hasta **15 días hábiles** (Reglamento de Reclamos SBS).

**2. Defensoría del Cliente Financiero (DCF) — dcf.pe.** Esta es la joya escondida:

- Es **gratuita**, virtual, y **no necesitas abogado**
- Resuelve en hasta **40 días hábiles** [SIN VERIFICAR: confirmar plazos y tope en dcf.pe]
- **Su resolución es vinculante para la entidad financiera** (a ti no te obliga)
- Requisitos: haber reclamado antes al banco y esperado **15 días hábiles** sin respuesta
  satisfactoria; que el hecho tenga menos de **2 años**; monto reclamado hasta **S/ 70,000**;
  y no tener el mismo caso en Indecopi o el Poder Judicial

**3. Indecopi.** Protección al consumidor, con capacidad de sancionar. También Libro de
Reclamaciones (físico y virtual, obligatorio).

**Para telecomunicaciones el camino es otro:** operador primero → **OSIPTEL** después.
Los operadores tienen entre 3 y 20 días hábiles [SIN VERIFICAR] para responder según el tema, y hay hasta
**2 años** para reclamar por falta de respuesta.

## 17. Seguros y cobros indebidos — la auditoría que se paga sola

- El **seguro de desgravamen** de tarjeta es **cancelable**. La SBS exige que se ofrezca
  una opción sin seguro y que el costo se informe de forma transparente antes de contratarlo.
- Si aparece en tu estado de cuenta **sin que lo hayas solicitado**, puedes exigir su
  cancelación inmediata y el **extorno** de lo cobrado.
- Si cancelaste el crédito antes y te siguieron cobrando el seguro, corresponde devolución.
- **Prueba:** tus estados de cuenta y el contrato. La HRI es tu mejor arma: si te cobran
  algo que no está ahí, es cobro indebido.

Auditoría anual, línea por línea: seguros no solicitados, "protección de tarjeta",
membresías de programas, comisión de mantenimiento, portes, envío de estado físico.

## 18. Alternativas al crédito caro (especialmente si tienes negocio)

**Cajas municipales y cooperativas.** No siempre son más caras que los bancos — a veces son
lo contrario. Las tasas varían muchísimo *dentro* de cada categoría ⏱, así que la
comparación se hace entidad por entidad en el portal de la SBS, no por prejuicio.

**Factoring — la alternativa que casi nadie con MYPE usa a tiempo.**

Si tu negocio emite facturas a crédito, puedes adelantar su cobro en vez de endeudarte:

- Comisiones típicas del orden de **1% a 3.5%** sobre la factura ⏱
- Hasta ~90% del valor de la factura, en menos de dos días
- **No es deuda nueva**: estás cobrando antes tu propia venta
- En Perú es un mercado grande y en crecimiento, dominado por MYPE

**El contraste que importa:** girar la tarjeta al 99% de utilización para cubrir capital de
trabajo puede costarte una TCEA de tres dígitos. Adelantar una factura cuesta un dígito.
Si el negocio factura a crédito, esta comparación se hace **antes** de tocar la tarjeta.

## 19. Puntos, millas y beneficios en Perú

Los programas principales: **BCP con LATAM Pass**, **BBVA Bonus**, **Interbank Benefit**,
**Scotiabank Rewards**.

- LATAM Pass acumula típicamente ~1 milla por dólar, con categorías aceleradas ⏱
- Interbank Benefit no está atado a una sola aerolínea: se canjea por pasajes en varias,
  hoteles, productos o efectivo — más flexible, generalmente menos valor por punto
- Las tarjetas premium suelen incluir salas VIP (Priority Pass) y equipaje adicional

**El orden correcto de decisión, que casi todo el mundo invierte:**

1. ¿Cuál es la **TCEA**?
2. ¿Cuánto cuesta la **membresía** y es exonerable?
3. **Recién ahí**: ¿los beneficios valen para mi vida real?

Un beneficio de millas nunca compensa una TCEA alta si arrastras saldo. **Los puntos son
para quien paga el total cada mes.** Si estás en revolvente, el programa de recompensas es
irrelevante — estás pagando por él muchas veces su valor.

---

## Fuentes

- [SBS — Reglamento de Tarjetas de Crédito y Débito (modificaciones, Res. SBS 02286-2024)](https://elcomercio.pe/economia/peru/sbs-aprueba-modificaciones-al-reglamento-de-las-tarjetas-de-credito-y-debito-ultimas-noticia/)
- [SBS — Pago mínimo debe amortizar parte del capital](https://www.sbs.gob.pe/noticia/detallenoticia/idnoticia/1166)
- [SBS — Resolución 6523-2013, Reglamento de Tarjetas de Crédito y Débito](https://intranet2.sbs.gob.pe/dv_int_cn/718/v3.0/Adjuntos/6523-2013.pdf)
- [Calificación crediticia según días de atraso (categorías SBS)](https://www.americatv.com.pe/noticias/util-e-interesante/cual-mi-calificacion-crediticia-infocorp-equifax-segun-dias-retraso-deuda-n450609)
- [Infocorp no es una lista negra — qué es realmente](https://reevalua.com/blog/que-es-infocorp-no-es-lista-negra-peru)
- [Cómo consultar tus deudas en Perú — Infocorp, SBS y Sentinel](https://tramitesperu.com/guias/consultar-deudas/)
- [Qué es Sentinel y cómo ver tu reporte gratis](https://kambista.com/economia/que-es-sentinel/)
- [BBVA Perú — Cómo aumentar tu línea de crédito](https://www.bbva.pe/blog/mi-guia-digital/aumenta-tu-linea-credito-facil.html)
- [BCP — Ampliación y aumento de línea de crédito](https://www.viabcp.com/tarjetas/ampliacion-linea-credito)
- [Interbank — Incremento de línea: requisitos](https://interbank.pe/centro-de-ayuda/tarjetas-de-credito/como-puedo-aumentar-mi-linea-de-credito-cuales-son-los-requisitos)
- [Scotiabank Perú — Incremento de línea](https://www.scotiabank.com.pe/personas/tarjetas/incremento-linea)
- [BBVA Perú — Hoja Resumen Informativa tarjetas de crédito (ejemplo de HRI)](https://www.bbva.pe/content/dam/public-web/peru/documents/personas/tarjetas/HRI-GENERAL.pdf)
- [Tarjetas de crédito Perú — tasas, costos y derechos](https://perugestiona.pe/deudas-finanzas/tarjeta-credito-peru/)
- [Comparativo de tarjetas sin membresía en Perú](https://tarjetas.pe/mejores-tarjetas-de-credito-peru)
- [Consolidación y compra de deuda en Perú](https://comparabancaperu.com/pages/blog/mejores-creditos-consolidar-deudas-peru-2026.html)
- [SBS — Reprogramación de deudas en 7 días](https://andina.pe/agencia/noticia-ahora-puedes-reprogramar-tu-deuda-condiciones-ventajosas-solo-7-dias-807910.aspx)
- [Defensoría del Cliente Financiero — requisitos y plazos](https://dcf.pe/preguntas-frecuentes)
- [Indecopi — Oficina de la DCF](https://indecopi.gob.pe/web/atencion-al-ciudadano/-/oficina-de-la-defensoria-del-cliente-financiero-dcf-peru)
- [OSIPTEL — cuándo y cómo reclamar](https://www.osiptel.gob.pe/portal-del-usuario/noticias/osiptel-te-explicamos-cuando-y-como-presentar-un-reclamo-por-problemas-con-la-prestacion-de-tus-servicios-de-telecomunicaciones/)
- [Cómo anular el seguro de tarjeta de crédito](https://comparabien.com.pe/blog-consejos/seguro-tarjeta-credito-que-y-como-anularlo-facilmente)
- [Negociación de deudas y cartera castigada en Perú](https://reevalua.com/negociacion-de-deudas)
- [ESAN — Negociar el pago de deudas con casas de cobranza](https://www.esan.edu.pe/conexion-esan/consejos-para-negociar-el-pago-de-deudas-con-casas-de-cobranza)
- [Prestamype — Factoring en el Perú](https://www.prestamype.com/articulos/el-factoring-en-el-peru)
- [SBS — Compara costos de créditos](https://www.sbs.gob.pe/usuarios/informate-y-compara/compara-productos-financieros/compara-costos-de-creditos)
- [BCP — Tarjeta LATAM Pass](https://latampass.latam.com/es_pe/acumula-millas/tarjeta-bcp-latam-pass)
