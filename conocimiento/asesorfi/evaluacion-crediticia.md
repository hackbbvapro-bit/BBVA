# Cerebro — Cómo te lee el buró antes que el banco

> Este módulo conserva las **reglas aprendidas** al leer reportes de buró de crédito (CrediCheck y
> Sentinel). No contiene casos individuales ni datos de personas. Todo lo que sigue es observación
> de práctica, **no norma**: una regla vista pocas veces es hipótesis y se dice así.
> Marca general: `[SIN VERIFICAR]` salvo donde se cite norma.

---

## 0. Lo primero que hay que tener claro

Un reporte de buró privado (por ejemplo CrediCheck, con su motor de reglas) **no es la decisión
del banco**. Es el **primer filtro**, el que el sistema aplica en segundos antes de que un analista
lo vea. El banco después cruza tres cosas más que ese reporte no muestra:

1. **El reporte SBS/RCD completo** y su propio historial interno con el cliente.
2. **Sustento de ingresos**: la cuota tiene que caber en ~30 % del ingreso *demostrado*
   → ver [credito-sustento-ingresos.md](credito-sustento-ingresos.md) §1–2.
3. **Su modelo propio de score**, que puede pesar distinto que el del buró [ASUMIDO].

**Sentinel funciona distinto**: no publica veredicto de reglas ni capacidad de pago. Da una **banda
de puntaje**, la probabilidad de impago, la historia mes a mes y el detalle por entidad. Son escalas
distintas: el puntaje de un buró **no se compara** con el de otro.

Lo que se sabe con certeza es **qué hace saltar el primer filtro**. Por eso sirve: si no pasas el
filtro, lo demás ni se mira.

## 1. Anatomía del reporte — cómo leerlo en 2 minutos

| Dónde | Qué mirar | Qué significa |
|---|---|---|
| Resultado de reglas | **Veredicto**: CUMPLE / REVISAR / NO CUMPLE + "Detalle" | Si pasa o no el filtro y **por qué regla** |
| Primera página | Score y "X de 100 personas podrían caer en incumplimiento" | Riesgo estadístico del modelo de ese buró |
| Primera página | **Capacidad de pago mensual** (rango S/) | Cuota que el buró cree que soporta. S/ 0 = cerrado |
| Primera página | Semáforo actual y deuda total del DNI y del RUC | Verde < 0.001 · Amarillo 0.001–2 · Rojo > 2–6 [SIN VERIFICAR] |
| Primera página | **Bancarizado SÍ/NO** | Si tiene evidencia positiva en el sistema |
| "Detalle de la deuda SBS/Microfinanzas" | Entidad, monto, días, **calificación** NOR/CPP/DEF/DUD/PER | Bancos y cajas. Una sola DEF/DUD/PER = bloqueo |
| "Detalle de vencidos" | Acreedor, n.º de documentos, monto, **días** | Servicios, telefonía, SAT, municipio. **Cuentan para el filtro** |
| "Utilización de líneas" | Línea, usado, % | Utilización a fin de mes (no después del pago) |
| "Semáforos de los últimos 24 meses" | Cuántos meses en rojo | El analista ve la **historia**, no solo la foto de hoy |
| Secciones finales | RUC, representante legal, protestos, avales, deudores alimentarios | Riesgos vinculados (empresas a su nombre) |

### Anatomía del reporte Sentinel

| Dónde | Qué mirar | Qué significa |
|---|---|---|
| Primera página | **Banda**: Excelente 877–999 · Bueno 722–876 · Medio 598–721 · Bajo 477–597 · **Muy Bajo 1–476** [SIN VERIFICAR] | El score exacto y los semáforos pueden venir como imagen |
| Primera página | "N de 100 personas podrían caer en impago" y deuda total | Riesgo estadístico de *su* modelo |
| Primera página | "No es posible generar un score" | Sin conducta reciente que medir: **invisible**, no "malo" |
| "Resumen del último mes" | Deuda por entidad SBS + otros vencidos (DI = documentos impagos, PR = protestos, DT = tributaria, DL = laboral) | Igual que en el otro buró, los recibos impagos aparecen aparte |
| "Utilización de línea de crédito" | Línea aprobada vs usada por banco | Fin de mes |
| **"Posición Histórica"** | Por fecha: n.º de entidades, deuda SBS, vencida, impagos | Lo más valioso: muestra **la velocidad** con que creció la deuda (L12) |
| "Es Representante Legal de" | Empresas vinculadas | L9 |
| Pie de página | Quién generó el reporte | Si lo sacó un tercero, **él conserva una copia** de los datos |

Las garantías (aunque no haya crédito) **cuentan como entidad** en la historia.

La leyenda del reporte trata como **"deuda menor"** lo vencido < S/ 100 (persona natural) o
< S/ 500 (empresa) [SIN VERIFICAR]: pinta amarillo en vez de rojo, **pero no evita la regla de
S/ 50** (§2).

## 2. Las reglas del filtro observadas

| Regla (texto literal del buró) | Veredicto | Qué la dispara | Cómo se levanta |
|---|---|---|---|
| "Documentos impagos mayor a S/.50 en los 12 meses" | **REVISAR** | Cualquier recibo/documento impago > S/ 50 en 12 meses (gas, teléfono, SAT) | Pagar con constancia y **12 meses** sin otro impago > S/ 50 |
| "Calificación Def, Dud, Per en los 12 meses" | **NO CUMPLE** + excluido de score + capacidad S/ 0 | **Una** entidad SBS con DEF/DUD/PER en 12 meses, **sin importar el monto** | Pagar + carta de no adeudo; 12 meses después del último mes en DEF/DUD/PER |
| "Cumple con todas las reglas de evaluación" | **CUMPLE** | Nada vencido relevante, todo NOR | — |

Estas reglas son observaciones de práctica sobre un buró concreto [SIN VERIFICAR]; la primera
está mejor confirmada que las otras dos.

## 3. Lecciones aprendidas

**L1. El buró mide conducta, no tamaño.** *(hipótesis)*
Un saldo residual pequeño olvidado en un banco, calificado PÉRDIDA, puede dar NO CUMPLE y
capacidad S/ 0. Una deuda mucho mayor, pagada puntual y todo NORMAL, solo da REVISAR y por recibos
impagos. Un saldo residual olvidado es lo más destructivo que existe por sol adeudado.

**L2. Los recibos de servicios pesan tanto como un banco para el filtro.** *(confirmada)*
Los REVISAR observados fueron por gas, telefonía o SAT, **ninguno por un banco**. Un documento
impago de telefonía viejo puede pintar el semáforo aunque haya cero vencido en bancos.
La gente cuida la tarjeta y olvida el gas.

**L3. La mancha más barata es la que más cuesta.** *(confirmada)*
Limpiar todo lo vencido suele costar poco frente al daño que hace. Casi siempre el problema
no es sobreendeudamiento sino abandono de pequeños recibos. Retorno por sol invertido: de los más
altos de cualquier acción financiera.

**L4. Score bajo no siempre es morosidad: también es "historial delgado".** *(hipótesis)*
Quien nunca falló pero solo ha movido montos chicos y tiene la tarjeta casi al tope puede tener
score tan bajo como quien tiene recibos vencidos pero pagó puntual un préstamo grande.
La limpieza abre la puerta; la **profundidad** (montos, plazo, variedad) sube el score.
En Sentinel el extremo es "No es posible generar un score": cero deudas y cero atrasos.
No tener deudas no es tener buen historial.

**L5. La probabilidad de impago va por tramos de puntaje, no punto a punto.** *(hipótesis)*
Puntajes cercanos caen en la misma probabilidad; hay cortes entre tramos.

**L6. La capacidad de pago no sale solo del historial bancario.** *(hipótesis)*
Una persona no bancarizada y con semáforo rojo puede recibir una capacidad alta. Hipótesis: el
modelo estima ingreso con datos externos (edad, RUC, zona, tipo de trabajo) [ASUMIDO].
Consecuencia: la capacidad alta **no compensa** un mal veredicto.

**L7. Que una deuda salga del reporte no significa que se pagó.** *(confirmada)*
Las deudas viejas desaparecen cerca de los **5 años** (Ley 27489). También pueden desaparecer
mucho antes por pago, venta a una recuperadora que no reporta o castigo: **el reporte no dice
cuál**. Hay que preguntarlo, no asumirlo. La deuda puede seguir siendo cobrable. **No
reconocerla por escrito ni pagar parcialmente sin asesoría** → ver
[negociacion-deuda.md](negociacion-deuda.md).

**L8. La utilización alta no rompe reglas, pero frena.** *(hipótesis)*
Un uso muy alto con calificación NORMAL puede seguir siendo CUMPLE, pero acompaña al score bajo.
Se mide el saldo **de fin de mes** → pagar **antes del fin de mes**, no solo antes de la fecha de
pago (mecánica en [peru-bancario.md](peru-bancario.md) §4).

**L9. Las empresas a tu nombre viajan contigo.** *(hipótesis)*
El reporte muestra si eres representante legal y el estado de esa empresa (por ejemplo, en baja de
oficio). Si la empresa tiene deuda tributaria o laboral, puede alcanzarte [ASUMIDO, verificar en
SUNAT]. Aplica también a EIRL y RUC 10.

**L10. Los préstamos chicos encadenados bancarizan, pero no construyen.** *(hipótesis)*
Encadenar préstamos pequeños da "Bancarizado SÍ" pero no sube el score. Para construir: un
producto, usado poco, pagado total, durante meses.

**L11. Un pago no limpia el pasado; detiene el daño.** *(regla del sistema)*
El historial de los últimos 24 meses queda a la vista del analista. Las reglas de 12 meses corren
**desde el último mes en falta**. Por eso la fecha de pago importa: cada mes de demora mueve la
fecha de salida un mes más.

**L12. Abrir muchas entidades rápido pesa más que no tener atrasos.** *(hipótesis)*
Se observó un perfil con cero días de atraso y todo NORMAL, pero que pasó de pocas a muchas
entidades en un año, con utilización al 100 % y un recibo impago: banda **Muy Bajo** y alta
probabilidad de impago. Lectura: el modelo castiga la **velocidad** de endeudamiento y el uso
total de las líneas, no solo la mora. No se puede separar cuánto pesa cada factor [hipótesis].
Consecuencia práctica: **ninguna entidad nueva** hasta bajar la utilización bajo 50 % y limpiar
los impagos.

**L13. Una garantía también es una entidad.** *(hipótesis)*
Si una caja niega el crédito, la garantía firmada antes de la negativa puede seguir reportada en
la SBS por meses sin crédito detrás. Cuenta en "n.º de entidades" y suma a L12.
→ No firmar garantías **antes** de la aprobación escrita, y reclamar si quedan colgadas.

## 4. Cómo se analiza un reporte

1. Clasificar el problema (uno solo manda):
   **Bloqueo** (DEF/DUD/PER en SBS) > **Recibos impagos** > **Utilización** > **Historial delgado** > **Sin bancarizar**.
2. Para cada punto: costo en soles para limpiar, constancia que hay que exigir y la fecha estimada
   en que la regla deja de aplicar (12 meses + ~1 mes de reporte) [ESTIMADO].
3. Mirar la historia de 24 meses y lo que **salió** del reporte (L7), no solo lo vigente.
4. Revisar empresas vinculadas (L9).
5. Entregar: veredicto en una línea → qué le afecta → qué no → plan con costo y fecha → qué esperar.

## 5. Requisitos publicados por un banco para su tarjeta premium

(Sin ingreso mínimo publicado.) Más de 6 meses de historial con buen comportamiento; dependientes
con más de 1 año de antigüedad; independientes con 2 declaraciones de renta de 4.ª, recibos por
honorarios y 3 meses de pagos a SUNAT [SIN VERIFICAR: fuente original no conservada].
→ Para un independiente, **lo que no está declarado en SUNAT no existe** para el banco
(ver [credito-sustento-ingresos.md](credito-sustento-ingresos.md)).

## 6. Principio de método

- Una lección con pocos casos es **hipótesis** y se dice así.
- Si un caso nuevo contradice una lección, **gana el dato**.
- Lo que el banco **decidió** (aprobado, negado, monto, tasa) vale más que lo que predice el buró.
  Los bancos no suelen publicar los criterios de liberación de garantías ni de aprobación:
  pedir las respuestas **por escrito** con fecha.
