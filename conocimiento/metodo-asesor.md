# Método de asesoría financiera personal (síntesis genérica para el MVP)

Síntesis propia, escrita para el proyecto de la hackatón: un «copiloto anticipador» que responde
«¿llego a fin de mes?» y «¿qué deuda pago primero?» con datos sintéticos.
Todos los números de este documento son **ejemplos inventados** (marcados «ejemplo»). Las cifras de
mercado o normativas que no pude respaldar llevan **[SIN VERIFICAR]**.

Regla madre del producto: **los números los calcula el programa; la IA solo los explica.**
Analogía: la IA es el copiloto que lee el tablero en voz alta; el tablero (el motor de cálculo) lo
fabrica código que se puede probar.

---

## 1. Cómo se gestionan y categorizan los gastos

### 1.1 Categorías (un árbol corto, no 40 casilleros)
Un buen árbol tiene pocos nodos y sirve para decidir. Propuesta para el MVP:

Grupos: vivienda (fijo); servicios (fijo-variable); alimentación y transporte (variable); salud y educación (fijo-variable); deuda (cuotas, pagos de tarjeta, intereses: obligación fija); suscripciones (fijo, evitable); ocio y compras (discrecional); familia/transferencias (variable); y «sin categoría», que se muestra siempre y nunca se oculta.

### 1.2 Fijos vs variables vs discrecionales
- **Fijo**: monto y fecha casi constantes (alquiler, cuota, internet). Se proyecta exacto.
- **Variable necesario**: monto cambia, pero no se puede dejar de pagar (comida, transporte). Se proyecta
  con promedio de las últimas semanas y un margen.
- **Discrecional**: se puede recortar sin consecuencias legales ni de calificación. Es donde viven las
  «jugadas» de ahorro.
- Utilidad práctica: para decidir si una persona «llega a fin de mes», lo que importa es separar lo
  **comprometido** (fijo + deuda + variable necesario) de lo **recortable**.

### 1.3 Gasto hormiga
- Definición operativa: movimientos **pequeños y frecuentes** (por ejemplo, menores a S/ 20) que
  individualmente no se sienten y en suma pesan. Umbral de «pequeño» = parámetro configurable.
- Detección: agrupar por comercio normalizado + categoría; contar frecuencia por semana; marcar
  hormiga si (monto < umbral) y (≥ N veces al mes). Mostrar el total mensual y anualizado.
- Ejemplo: 3 cafés/snacks de S/ 8 por semana ≈ S/ 100 al mes ≈ S/ 1.200 al año.
- Regla de tono: informar, **no moralizar**. La pregunta útil es «¿esto te acerca o te aleja de llegar a
  fin de mes?», no «gastas mal».

### 1.4 Suscripciones y cobros recurrentes
- Se detectan por **repetición**: mismo comercio (o descripción normalizada), monto igual o casi igual
  (tolerancia ±5 %), intervalo estable (≈7, 30, 90 o 365 días ± 3 días).
- Con 2 repeticiones es «posible recurrente»; con 3 o más es «recurrente confirmado».
- Se muestran con su próxima fecha esperada: alimentan directamente la proyección a 30 días.
- Acciones típicas: cancelar la que no se usa, exonerar membresías de tarjeta, reclamar cobros que no
  figuran en la hoja informativa del producto.

### 1.5 Categorización automática
Normalizar descripción (minúsculas, sin tildes ni códigos) → reglas por palabra clave de comercio (el primer acierto gana) → si no hay regla, «sin categoría» y se pregunta una vez, guardando la respuesta como regla. Transferencias entre cuentas propias no son gasto ni ingreso: se emparejan y se neutralizan.

---

## 2. Orden de prioridades (qué va primero y por qué)

Cuando hay dinero extra, o cuando **no alcanza** para todo, el orden no es el mismo.

### 2.1 Con dinero extra (de arriba hacia abajo, sin saltar escalones)
1. **Colchón mínimo**: cerca de 1 mes de gastos en efectivo. Sin él, cualquier imprevisto vuelve a la
   tarjeta y la deuda se realimenta.
2. **Pagos mínimos y cuotas al día** (ver 2.2): evitan mora y marcas.
3. **Deuda cara** (tarjeta revolvente, efectivo, TCEA muy alta): pagarla rinde, en la práctica, la tasa
   que se deja de pagar; es difícil de superar con cualquier inversión.
4. **Fondo de emergencia completo**: 3 a 6 meses de gasto (más cerca de 6 si el ingreso es irregular).
5. **Deuda de costo medio** (préstamos personales, vehicular).
6. **Inversión de largo plazo** y, al final, deuda barata (hipotecaria): sin urgencia de prepagar.

### 2.2 Cuando no alcanza (modo «sala de guerra»)
La regla peruana relevante: **el reloj de días de atraso manda sobre la tasa.** Una cuota que cruza
ciertos umbrales de atraso daña la calificación de forma que ninguna diferencia de tasa compensa.
Escala de la SBS (Res. SBS 11356-2008, categorías Normal / CPP / Deficiente / Dudoso / Pérdida):
aproximadamente Normal hasta 8 días de atraso, CPP de 9 a 30, Deficiente de 31 a 60, Dudoso de 61 a 120,
Pérdida más de 120 [SIN VERIFICAR: confirmar vigencia y que aplique igual a todo tipo de crédito].

Orden sugerido:
1. Cuotas **a punto de cruzar un umbral** (por ejemplo, entre el día 6 y el 8 de atraso).
2. Cuotas ya en CPP más cerca de pasar a Deficiente.
3. Cuotas que vencen en los próximos 3 días.
4. Con eso cubierto, el pago extra va por avalancha o bola de nieve (sección 3.1).
5. Deudas informales o familiares: se honran, pero **no compiten** con una cuota bancaria por cruzar
   un umbral; se avisa y se reprograma por escrito. Excepción: si la consecuencia de no pagar es peor
   que una marca (perder vivienda, herramienta de trabajo), el usuario decide.

### 2.3 Por qué
La mora tiene costo creciente y no lineal (intereses moratorios, calificación, acceso futuro); la tasa es lineal y conocida. Prohibido en el plan: préstamo para pagar préstamo sin bajar la TCEA, solo el mínimo teniendo deudas más baratas, avance de efectivo, préstamos informales de cobro diario.

---

## 3. Reglas de deuda

### 3.1 Avalancha vs bola de nieve
- **Avalancha**: pagar primero la de **mayor tasa (TCEA)**. Matemáticamente minimiza el interés total.
- **Bola de nieve**: pagar primero la de **menor saldo**. Cierra deudas rápido, da victorias pequeñas.
- Cuándo cuál: si las tasas son muy distintas → avalancha; si son parecidas, o la persona ya abandonó
  planes antes → bola de nieve (el plan que se cumple le gana al óptimo que se abandona).
- Implementación: el motor calcula **ambos** y muestra la diferencia en soles y en meses; la
  recomendación se decide por regla, no por la IA.

### 3.2 TCEA, TEA, TEM: qué es cada una y cómo se convierten
- **TEA**: tasa efectiva anual del interés. **TEM**: tasa efectiva mensual.
- **TCEA**: costo efectivo anual **incluyendo** comisiones, seguros y cargos obligatorios. Es la única
  base honesta para comparar productos. Comparar por «cuota baja» suele significar más plazo y más interés.
- Conversiones (capitalización compuesta):
  - `TEM = (1 + TEA)^(1/12) − 1`
  - `TEA = (1 + TEM)^12 − 1`
  - Tasa diaria: `(1 + TEA)^(1/360) − 1` (convención de 360 días usada en el sistema financiero local
    [SIN VERIFICAR para cada producto]).
  - Una tasa nominal anual (TNA) con capitalización mensual m: `TEA = (1 + TNA/12)^12 − 1`.
- **TCEA por flujos**: se busca la tasa periódica `r` que iguala lo recibido con lo pagado:
  `Desembolso_neto = Σ cuota_t / (1 + r)^t`, donde el desembolso neto ya descuenta comisiones iniciales
  y las cuotas ya incluyen seguros y comisiones periódicas. Luego `TCEA = (1 + r)^(períodos por año) − 1`.
  Se resuelve numéricamente (TIR); nunca «a ojo».
- Ejemplo (ejemplo): préstamo de S/ 10.000, TEA 30 %, 12 cuotas iguales → TEM ≈ 2,21 %, cuota ≈ S/ 958,
  total pagado ≈ S/ 11.495, interés ≈ S/ 1.495. Si además hay seguro y comisión, la TCEA es mayor
  que 30 %: por eso se compara TCEA con TCEA.

### 3.3 Tarjeta de crédito: costo de pagar solo el mínimo
- El interés se calcula sobre saldo (en la práctica, saldo diario); el mínimo suele cubrir el interés y
  amortizar muy poco capital.
- Fórmula de meses con pago fijo `P`, saldo `B` y tasa mensual `i`: `n = −ln(1 − B·i/P) / ln(1 + i)`.
  Si `P ≤ B·i`, la deuda **nunca** baja (el motor debe avisarlo, no devolver un número).
- Ejemplo: tarjeta de S/ 3.000 con TCEA de 80 % → TEM ≈ 5,0 % (≈ S/ 150 de interés el primer mes).
  Pagando S/ 200 fijos al mes: ≈ 29 meses, ≈ S/ 5.700 pagados, ≈ S/ 2.700 solo de interés.
  Pagando S/ 400 al mes: ≈ 8 meses. Esa comparación es la «jugada» más convincente para el usuario.
- Señal roja: pagar el mínimo dos meses seguidos exige plan de rescate.
- Cuotas con interés para compras: solo si la TCEA es menor que la alternativa real del usuario.
  «Cuotas sin interés» hay que verificar que la TCEA sea de verdad 0 %.

### 3.4 Compra de deuda y refinanciación
- **Compra de deuda**: otra entidad paga la deuda cara y la reprograma más barata. Pasa el filtro si:
  (1) la TCEA nueva es **materialmente** menor; (2) el **costo total** baja, no solo la cuota (por
  estirar el plazo); (3) las líneas liberadas se **congelan** (si se vuelven a llenar, la deuda se duplica).
- Prueba del motor: `ahorro = costo_total_actual_restante − costo_total_nuevo (incluye comisiones)`;
  si `ahorro ≤ 0` o el plazo se alarga sin ahorro → «no conviene».
- **Reprogramación** (mover fechas/cuotas mientras se está al día) ≠ **refinanciación** (cambio de
  condiciones por dificultad de pago, que se reporta y puede degradar la calificación). Pedir primero
  lo menos costoso; refinanciar es la última herramienta antes de la mora larga.

### 3.5 Negociación con bancos (resumen operativo)
- **El momento decide casi todo**: negociar **antes** de atrasarse vale mucho más que después. Al
  día, el usuario es un cliente que el banco quiere conservar; en mora larga es una cuenta por cobrar.
- Frase tipo: «Quiero seguir pagando; hoy no puedo con esta cuota; ¿qué opciones de reprogramación
  hay antes de que sea atraso?».
- Todo por escrito: convenio completo, que el pago extingue la obligación, constancia de no adeudo,
  reporte de la cancelación a las centrales, cuenta oficial de la entidad. No pagar antes de tener
  el convenio.
- Pago anticipado: pedir por escrito si se aplica a reducir cuota o a reducir plazo.
- Escalamiento si no responden: reclamo formal a la entidad → defensoría del cliente financiero →
  autoridad de consumo. Plazos y topes exactos [SIN VERIFICAR].
- Deuda vieja o castigada: puede haber margen de descuento; reconocer o pagar parcialmente puede
  reactivar plazos de prescripción; consultar antes de firmar.

### 3.6 Centrales de riesgo (SBS e Infocorp-tipo), en general
- Se reporta la **conducta** (puntualidad, calificación por entidad, saldos, utilización), no solo el monto: un saldo pequeño olvidado en mora puede pesar más que una deuda grande al día.
- Que una deuda salga del reporte por el paso del tiempo no significa que esté pagada ni prescrita.
- Pagar una mora detiene el daño pero no borra el historial; los filtros suelen mirar 12 a 24 meses [SIN VERIFICAR el plazo de cada central].
- Utilización alta frena el score aunque no haya mora; se mide al **cierre del ciclo**: conviene pagar antes del corte. Abrir varias líneas en poco tiempo también pesa.

---

## 4. El «escáner»: leer estados de cuenta y movimientos

Objetivo: convertir PDFs/CSV heterogéneos en un **libro de movimientos único y limpio**.

### 4.1 Formatos de entrada
CSV/Excel de la banca digital (el más fiable); PDF de estado de cuenta (a veces con contraseña: se pide al usuario, no se guarda); capturas con OCR (confianza baja). Para el MVP: **CSV sintético con esquema único**; el escáner real es post-hackatón.

### 4.2 Campos que se extraen por movimiento
`fecha`, `descripcion` (original), `descripcion_normalizada`, `monto` (con signo), `moneda`,
`saldo_posterior` (si existe), `cuenta/tarjeta` (alias, nunca número completo), `categoria`,
`origen` (archivo y número de línea), `es_recurrente`, `confianza`.

### 4.3 Reglas de lectura robustas
- Fecha al inicio de línea con varios formatos (dd/mm, dd/mm/aa, dd-mmm). El **año** se toma del
  encabezado del documento y se corrige en cambios de año (diciembre → enero), no por «el año máximo visto».
- Montos: decidir el separador decimal **por documento** y verificarlo (no por línea); paréntesis o
  signo final = negativo. Un monto ambiguo («1.234») se rechaza o se marca, no se adivina.
- **Conciliación obligatoria**: `saldo_inicial + Σ movimientos = saldo_final`. Si no cuadra, el
  archivo se marca «no confiable» y **no se importa en silencio**. Es el seguro contra parsers que
  cambian con el formato del banco.
- Fallo ruidoso: ante un formato desconocido, error claro; nunca datos plausibles pero erróneos.

### 4.4 Deduplicación (sin perder gastos legítimos)
- Cuando se reimporta el mismo archivo, no deben duplicarse movimientos (idempotencia).
- Pero **dos gastos idénticos el mismo día pueden ser legítimos** (dos pasajes iguales). La clave debe
  incluir algo que los distinga: `archivo_origen + número_de_línea + fecha + monto + descripción`.
  Ver lección 7.4.

### 4.5 Detección de recurrentes y de ingresos
- Recurrentes: ver 1.4. Ingresos: abonos periódicos del mismo origen; calcular **promedio, mínimo y
  desviación** de los últimos 6 a 12 meses, no solo el último.
- Transferencias propias: emparejar salida y entrada de igual monto en ventana de 0 a 2 días y excluirlas.

---

## 5. Reglas de «banquero»: qué mira un banco peruano

### 5.1 Capacidad de pago
- El analista parte del **ingreso demostrado**, no de lo que la persona pide. Como regla práctica, la
  cuota total mensual debe caber en torno al **30 % del ingreso neto** [SIN VERIFICAR: varía por entidad].
- Monto pedible aproximado: `(30 % × ingreso demostrado − cuotas actuales) × factor de anualidad`.
  Si el resultado es cero o negativo, ningún truco de tarjeta cambia la respuesta.
- Semáforo útil para el producto: cuota total / ingreso neto → verde < 25 %, ámbar 25–35 %, rojo > 35 %.

### 5.2 Endeudamiento y utilización
- Utilización = saldo reportado / línea. Umbrales de referencia: < 30 % bueno, < 10 % excelente,
  > 50 % penaliza [SIN VERIFICAR el peso exacto en cada modelo].
- Deuda total en el sistema frente al ingreso: lo que ve el banco además de lo que ve el usuario.
- Pagar la tarjeta completa (no el mínimo) es una señal de comportamiento; pagar solo el mínimo se
  informa como tal.

### 5.3 Ingresos sustentables
- Cuentan los ingresos **comprobables**: planilla (boletas), honorarios (recibos), negocio con
  declaraciones tributarias, alquileres declarados. Lo que no está documentado «no existe» para el banco.
- Para ingreso variable se usa **promedio reciente o el mes más bajo**, no el mejor mes.

### 5.4 Informales
- Un ingreso real pero no documentado no sustenta crédito formal. Camino: formalizar gradualmente (RUC, comprobantes, cuenta de uso exclusivo) y construir historial con un producto pequeño pagado a tiempo y baja utilización.
- A no promover: inflar ingresos con comprobantes que no corresponden a operaciones reales, fraccionar abonos para esquivar alertas, prestar garantías ajenas.

---

## 6. Particularidades de Perú

### 6.1 Yape / Plin y billeteras
- Gran parte del gasto diario de una persona pasa por transferencias entre personas y pagos a
  comercios con QR; las descripciones son pobres («Yape a Juan P.»). El categorizador debe apoyarse en
  **comercio/contacto recurrente** y permitir que el usuario etiquete a un contacto una vez.
- Distinguir: pago a comercio, pago entre personas, cobro del negocio, envío a familia. Una misma
  billetera suele mezclar gasto personal e ingreso del negocio del usuario.
- Límites de recepción y reporte a la autoridad tributaria existen, pero sus montos cambian
  [SIN VERIFICAR: topes y umbrales vigentes]; para el MVP basta con saber que **las entradas por
  billetera cuentan como flujo real** y que hay que proyectarlas.

### 6.2 Ingresos irregulares / informales
- Síntoma típico: «hay meses que llego y meses que no». Es un problema de **estabilización**, no
  solo de nivel de ingreso.
- Método del «sueldo artificial»: (1) calcular el piso (mes más bajo de los últimos 12);
  (2) fijar el gasto personal en ese piso; (3) el excedente va a una cuenta de estabilización;
  (4) los meses flojos se cubren de esa cuenta, no de la tarjeta.
- Para proyectar: usar **rango** (escenario bajo / base / alto), no un único número. Mostrar «llegas en
  el escenario base, no llegas en el bajo».
- Día de cobro incierto: modelar la fecha de ingreso como ventana, no como punto.

### 6.3 Renta de cuarta y quinta categoría (solo lo que afecta al flujo)
- **Quinta (planilla)**: el sueldo llega neto de retenciones; el flujo es predecible, con gratificaciones
  y otros pagos en meses específicos [SIN VERIFICAR montos y meses vigentes].
- **Cuarta (recibos por honorarios)**: el pago bruto no es el disponible; puede haber retención en
  ciertos importes, y el trabajador debe **apartar para impuestos** al cobrar. Para el copiloto: tratar
  «lo cobrado» y «lo disponible» como dos números distintos y proyectar el segundo.
- Topes y tasas exactas cambian cada año: no codificarlos fijos en el MVP.

### 6.4 Tarjetas de crédito
- Ciclo: **fecha de corte** (cierra el ciclo) y **fecha de pago** (unos ~20 días después, varía por
  producto [SIN VERIFICAR]). Compra el día siguiente al corte = máxima gracia.
- Pagar el **total facturado** evita intereses; pagar menos activa el revolvente a tasas altas.
- Membresías anuales (a veces exonerables con consumo mínimo), seguros de desgravamen y comisiones
  entran en la TCEA. La hoja informativa del producto es el documento que lo respalda.
- El avance de efectivo combina comisión de desembolso y tasa alta sin periodo de gracia: evitar.
- Comparar productos siempre por TCEA; consultar el comparador de tasas del regulador.

---

## 7. LECCIONES DE LA AUDITORÍA (fallos que el nuevo producto NO debe repetir)

Una auditoría de un asesor anterior encontró defectos de cálculo y de datos. Cada uno se convierte
aquí en una regla de ingeniería con su prueba.

### 7.1 Sumar meses a fechas con deriva
- **Fallo**: calcular cada vencimiento sumando un mes al anterior. 31-ene → 28-feb → 28-mar (debía ser
  31-mar). Desde febrero, todo vencimiento de día 29–31 queda corrido.
- **Por qué importa**: un aviso de pago con fecha equivocada produce mora real.
- **Cómo hacerlo bien**: calcular siempre desde un **ancla**: `fecha_n = ancla + n meses`, acotando el
  día al último día del mes destino. Nunca encadenar.
- **Test sugerido**: ancla 31-ene; esperar [28-feb, 31-mar, 30-abr, 31-may…] (y 29-feb en bisiesto);
  repetir con ancla 30 y 29. Comparar contra una tabla fija escrita a mano.

### 7.2 Día de pago 31 en febrero (caída por fecha inexistente)
- **Fallo**: construir `date(año, mes, día_pago)` con día 31 en un mes corto lanza error y el informe
  entero no sale.
- **Por qué importa**: el usuario pierde el diagnóstico justo en los meses en que más puede fallar.
- **Cómo hacerlo bien**: una única función `proximo_dia_del_mes(día, mes, año)` que acota al último día
  válido; prohibido construir fechas a mano en otras partes.
- **Test**: para día_pago ∈ {29, 30, 31} y mes ∈ {feb (bisiesto y no), abr, dic}, la función nunca
  lanza y devuelve el último día válido.

### 7.3 Tasa implícita que devuelve ~0 sin avisar y que confunde TCEA con TEA
- **Fallo**: al estimar la tasa a partir de «lo prestado» y «lo pagado», si lo pagado era menor que lo
  prestado (dato incompleto o error) el resultado salía cerca de 0 % sin ninguna advertencia; además
  se rotulaba «TCEA» a lo que era una TEA implícita sin comisiones ni seguros.
- **Por qué importa**: el usuario cree que su deuda es barata o que su costo es otro, y decide mal.
- **Cómo hacerlo bien**: (1) validar entradas: `total_pagado ≥ prestado`, plazo > 0, si no → error
  explícito «datos inconsistentes»; (2) nombrar bien: «tasa efectiva implícita» ≠ «TCEA»; (3) TCEA solo
  por flujos con comisiones y seguros (TIR); (4) devolver también el nivel de confianza.
- **Test**: préstamo de ejemplo con tasa conocida (S/ 10.000, TEA 30 %, 12 cuotas) → la función recupera
  30 % ± 0,01; con comisión añadida → TCEA > 30 %; con pagado < prestado → lanza error.

### 7.4 Deduplicación por hash que borra gastos idénticos legítimos
- **Fallo**: la huella del movimiento era `fecha + monto + descripción`; dos compras iguales el mismo
  día se contaban como una.
- **Por qué importa**: el libro subestima el gasto y el copiloto proyecta un saldo demasiado optimista.
- **Cómo hacerlo bien**: incluir en la clave el **origen** (archivo + número de línea) o un contador de
  ocurrencia dentro del día; la idempotencia se logra comparando contra lo ya importado **del mismo
  archivo**, no colapsando movimientos iguales.
- **Test**: un archivo con dos movimientos idénticos el mismo día → se importan 2; reimportar el mismo
  archivo → siguen siendo 2 (sin duplicar); archivo nuevo con uno igual en otra fecha → se suma 1.

### 7.5 Escritura no atómica del libro de movimientos
- **Fallo**: reescribir el archivo completo en el mismo sitio, sin copia previa. Un corte a mitad de
  escritura deja el libro truncado y se pierde todo el historial.
- **Por qué importa**: sin libro no hay proyección; es pérdida de datos irrecuperable.
- **Cómo hacerlo bien**: escribir a un archivo temporal en la misma carpeta, forzar vaciado a disco
  (`flush` + `fsync`) y **renombrar** sobre el original (operación atómica); conservar una copia
  fechada previa; si se usa base de datos, transacciones.
- **Test**: simular una excepción a mitad de escritura → el libro original queda intacto y legible;
  verificar que existe la copia fechada y que el conteo de filas antes/después cuadra.

### 7.6 Varias definiciones distintas de «deuda total»
- **Fallo**: cuatro scripts calculaban «deuda total» de forma diferente (solo saldos de tarjetas y
  préstamos; suma nominal con intereses futuros; solo capital sin tarjetas; saldo nominal). Dos
  totales distintos el mismo día.
- **Por qué importa**: el usuario pierde confianza y el copiloto contradice a su propia pantalla.
- **Cómo hacerlo bien**: **un solo módulo** de deuda con tres cifras siempre etiquetadas:
  `capital pendiente`, `monto nominal restante (con intereses)` y `vencido/en mora`. Todo reporte y
  toda explicación de la IA leen de ahí.
- **Test**: con un perfil sintético, todas las pantallas y respuestas devuelven la misma cifra para el
  mismo nombre de métrica; test de «no hay otra función que sume deudas».

### 7.7 Patrimonio que omite partidas
- **Fallo**: el patrimonio neto se calculaba como liquidez menos saldos de tarjetas y préstamos, sin
  restar lo vencido/impago ni sumar activos.
- **Por qué importa**: un número optimista lleva a decidir con falsa tranquilidad.
- **Cómo hacerlo bien**: `patrimonio = activos (líquido + otros) − pasivos (la definición única de 7.6)`,
  siempre con el desglose a la vista.
- **Test**: perfil con impagos y un activo no líquido → el patrimonio coincide con una cuenta hecha a
  mano; al añadir un impago, el patrimonio baja exactamente ese monto.

### 7.8 Otras lecciones breves
Montos y fechas dentro del código (todo a configuración); campos con el mes en el nombre (usar fechas ISO); claves desconocidas descartadas en silencio (validar esquema y fallar fuerte); comparar ventanas distintas (una ventana por comparación); tipo de cambio fijo sin fecha (guardar fecha y avisar); parser que da datos plausibles pero erróneos (conciliación, 4.3); cero pruebas (ninguna cifra sin prueba).

---

## 8. Qué sirve para el MVP de 2 días y qué NO

### 8.1 Meter (en este orden)
1. **Motor de proyección a 30 días** con datos sintéticos: saldo diario = saldo inicial + ingresos
   esperados − gastos fijos/recurrentes − variable estimado; detectar el **primer día en que el saldo
   cruza cero** («déficit el día X por causa Y»). Es el corazón del «¿llego a fin de mes?».
2. **Calendario de vencimientos correcto** (7.1 y 7.2) con función única de fechas.
3. **Conversión de tasas y TCEA por flujos** (3.2) + **simulador de pago mínimo** (3.3): da cifras
   concretas en soles.
4. **Comparador avalancha vs bola de nieve** (3.1) con ahorro en soles y meses.
5. **Una sola definición de deuda y de patrimonio** (7.6, 7.7).
6. **Escenarios de ingreso irregular**: bajo / base / alto para el caso de ingresos variables; la
   salida «llegas / no llegas / llegas justo».
7. **2 o 3 «jugadas» con costo en soles**: ej. pagar X primero ahorra S/ Y; mover una fecha de pago;
   cancelar una suscripción; evitar el mínimo. Cada jugada = una función con prueba, no texto libre.
8. **Detección simple de recurrentes y hormiga** (1.3 y 1.4) sobre el CSV sintético.
9. **Capa de IA**: recibe resultados ya calculados (JSON) y los explica en lenguaje claro; no calcula.
10. **Tests mínimos** (sección 7): fechas, tasa implícita, TCEA, dedupe, conciliación, deuda única.

### 8.2 NO meter en el MVP
- Lectura real de PDFs u OCR (CSV sintético con esquema fijo; siguiente fase).
- Cuentas reales, claves o ejecución de pagos: el producto recomienda, no ejecuta.
- Consulta real a centrales de riesgo o score; solo conceptos generales.
- Módulos tributarios detallados, inversión o asesoría de bolsa.
- Textos legales como verdad sin fuente fechada (usar [SIN VERIFICAR]).
- Optimización exótica o aprendizaje automático para categorizar: escenarios simples y reglas por palabra clave bastan.

### 8.3 Honestidad del producto
Cada cifra lleva etiqueta: calculada, estimada (con su supuesto) o dato del usuario. Si falta un dato, se pide; si son inconsistentes, se dice. Conclusión primero, sin moralizar. Descargo: orienta con datos de ejemplo; no reemplaza a un asesor autorizado.
