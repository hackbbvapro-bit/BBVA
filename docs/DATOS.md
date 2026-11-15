# Datos sintéticos del copiloto

> Trabajo hecho durante el evento (14-nov-2026).

**En una línea:** una población de 1 000 clientes inventados, con 90 días de movimientos que el
copiloto ve y 30 días siguientes que no ve, y con la respuesta correcta anotada en cada
movimiento. Sirve para medir si el copiloto acierta; el detalle de esas mediciones está en
[EVALUACION.md](EVALUACION.md).

**Ningún dato es de una persona real.** No hay nombres, documentos, teléfonos, direcciones ni
cuentas. Los comercios son inventados y no se usa ninguna marca. Todo sale de un generador con
semilla fija: quien lo ejecute obtiene exactamente los mismos archivos.

## 1. Qué hay y dónde

| Archivo | Filas | Qué contiene |
|---|---|---|
| `datos/sinteticos/clientes.csv` | 1 000 | Una fila por cliente, con la verdad de sus 30 días siguientes |
| `datos/sinteticos/deudas.csv` | 841 | Deudas declaradas (533 tarjetas, 308 préstamos) de 695 clientes |
| `datos/sinteticos/transacciones-muestra.csv` | 15 267 | Todos los movimientos de los 30 primeros clientes |
| `datos/sinteticos/transacciones-completo.csv` | 511 086 | Todos los movimientos de los 1 000 clientes. No está en el repositorio por su tamaño: se regenera (sección 6) |
| `docs/evaluacion/resultados.json` | — | Las métricas calculadas sobre esta población |
| `datos/sinteticos/agente/` | 6 clientes, 5 deudas, 3 087 movimientos | Seis clientes aparte (semilla `20261116`), mismo formato y todos con corte el 13-nov-2026 (historia del 16-ago al 13-nov-2026). Se usan para probar al asistente con IA (EVALUACION.md, sección 14) y se ven en la app, en «Datos de prueba» |

El código vive en `src/evaluacion/`: `poblacion.ts` (generador), `exportar.ts` (CSV) y
`corrida.evaluacion.ts` (la corrida oficial).

## 2. Diccionario de datos

Dinero en soles con dos decimales y punto decimal. Por dentro todo se calcula en céntimos
enteros; los decimales se arman al exportar, sin pasar por números de coma flotante.
Fechas en formato `AAAA-MM-DD`. No hay columna de hora: el generador trabaja por día y no se
inventa una.

### `transacciones-*.csv`

| Columna | Tipo | Valores | Significado |
|---|---|---|---|
| `customer_id` | texto | `cli-0001` … `cli-1000` | Cliente inventado |
| `transaction_id` | texto | `cli-0001-t0001` | Único dentro del archivo |
| `fecha` | fecha | | Día del movimiento |
| `monto` | decimal | positivo = entra, negativo = sale | Importe en soles |
| `moneda` | texto | `PEN` | Siempre soles |
| `tipo` | texto | `ingreso`, `gasto` | Signo del monto |
| `categoria` | texto | `sueldo`, `ingreso_variable`, `alquiler`, `servicios`, `suscripciones`, `deuda`, `comida`, `transporte`, `salud`, `educacion`, `ocio`, `compras`, `familia`, `otros` | Categoría del movimiento |
| `descripcion` | texto | | Texto que vería la persona en su estado de cuenta |
| `comercio` | texto | | Comercio o contraparte inventada |
| `canal` | texto | `cuenta`, `tarjeta`, `billetera_digital`, `efectivo` | Por dónde se movió. Los gastos con `tarjeta` no bajan el saldo de la cuenta: se pagan después con el «Pago de tarjeta» |
| `particion` | texto | `historia`, `oculto`, `futuro` | `historia`: lo que el copiloto ve (90 días). `oculto`: ocurrió en esos 90 días pero no llegó al copiloto (datos incompletos). `futuro`: los 30 días siguientes, que solo se usan para comprobar |
| `es_recurrente` | 0/1 | | **Etiqueta de verdad.** El movimiento pertenece a una serie que se repite |
| `serie` | texto | `mensual`, `quincenal`, `semanal` o vacío | **Etiqueta de verdad.** Cada cuánto se repite |
| `es_duplicado` | 0/1 | | **Etiqueta de verdad.** El movimiento es una copia que no debería estar |
| `tipo_duplicado` | texto | `cobro_doble`, `registro_repetido` o vacío | `cobro_doble`: el cargo se cobró dos veces y sí movió dinero. `registro_repetido`: la misma línea aparece dos veces pero el dinero se movió una sola vez |
| `es_atipico` | 0/1 | | **Etiqueta de verdad.** Gasto grande y único, fuera del patrón de la persona |

Las cuatro columnas de etiqueta no las ve el copiloto: son la hoja de respuestas.

### `clientes.csv`

| Columna | Tipo | Significado |
|---|---|---|
| `customer_id` | texto | Cliente inventado |
| `tipo_perfil` | texto | `dependiente` (sueldo), `independiente` (ventas del día), `mixto` (ambos) |
| `fecha_corte` | fecha | «Hoy» para ese cliente. La historia termina ese día; el futuro empieza al siguiente |
| `ingreso_mensual_diseno` | decimal | Ingreso mensual con el que se diseñó al cliente. El copiloto no lo recibe |
| `saldo_apertura` | decimal | Saldo al empezar los 90 días |
| `saldo_corte` | decimal | Saldo en la fecha de corte. Es lo que el copiloto recibe como saldo actual |
| `escenarios` | texto | Escenarios activos, separados por `\|` (sección 4). Vacío = ninguno |
| `n_deudas`, `deuda_total` | entero, decimal | Número de deudas y suma de saldos |
| `mov_historia`, `mov_ocultos`, `mov_futuro` | entero | Movimientos en cada partición |
| `deficit_real_30d` | 0/1 | **Verdad.** El saldo real quedó en negativo algún día de los 30 siguientes |
| `dia_deficit` | entero o vacío | **Verdad.** Primer día (1 a 30) con saldo negativo |
| `faltante_maximo` | decimal | **Verdad.** Cuánto llegó a faltar en el peor día (0 si nunca faltó) |

### `deudas.csv`

| Columna | Tipo | Significado |
|---|---|---|
| `customer_id`, `deuda_id` | texto | Cliente y deuda |
| `nombre` | texto | Nombre inventado («Tarjeta Compras», «Préstamo Personal») |
| `tipo` | texto | `tarjeta` o `prestamo` |
| `saldo` | decimal | Lo que se debe en la fecha de corte |
| `tcea_pct` | decimal | Tasa de costo efectivo anual, en porcentaje |
| `pago_minimo`, `pago_habitual` | decimal | Pago mínimo exigido y lo que la persona suele pagar |
| `dia_pago` | entero | Día del mes en que vence |

## 3. Volumen y cobertura (medido en la corrida oficial)

| Dato | Valor |
|---|---|
| Clientes | 1 000 (395 dependientes, 361 independientes, 244 mixtos) |
| Movimientos | 511 086: 373 043 de historia, 10 033 ocultos, 128 010 de futuro |
| Fechas de corte | Repartidas del 2025-07-01 al 2026-06-30, para cubrir todos los meses, fines de mes y gratificaciones |
| Ingreso mensual de diseño | Percentil 10: S/ 1,570 · mediana: S/ 2,850 · percentil 90: S/ 5,823 |
| Clientes con deuda | 695 |
| Movimientos recurrentes etiquetados | 29 479 |
| Duplicados etiquetados | 412 |
| Gastos atípicos etiquetados | 448 |
| Movimientos con tarjeta | 18 392 |
| Clientes que terminan en déficit en 30 días | 210 (21,0 %) |

## 4. Escenarios que cubre

Un cliente puede tener varios a la vez. 267 clientes no tienen ninguno: son el grupo de control.

| Escenario | Clientes | Qué simula |
|---|---|---|
| `ingreso_irregular` | 302 | Sueldo que se atrasa de 3 a 10 días, o semanas flojas de ventas |
| `gasto_atipico` | 296 | De uno a tres gastos grandes e inesperados (emergencia médica, reparación, matrícula, apoyo a un familiar) |
| `cambio_patron` | 170 | A mitad de camino cambia la vida: sube el gasto, baja o sube el ingreso, o aparece un cargo nuevo |
| `datos_incompletos` | 163 | Falta un hueco de 10 a 20 días, o entre el 10 % y el 20 % de los movimientos sueltos |
| `movimiento_repetido` | 125 | De 1 a 4 líneas que aparecen dos veces sin que el dinero se haya movido dos veces |
| `suscripcion_duplicada` | 101 | Un cargo fijo cobrado dos veces con 0 a 2 días de diferencia |

Estos escenarios coinciden con los ejemplos de «cambio sorpresa» que anunció la organización
(ingresos variables, movimientos duplicados).

## 5. Supuestos de diseño

**Estas proporciones las elegimos nosotros. No son estadísticas del mercado peruano ni de ningún
banco, y no deben citarse como tales.** Se eligieron para que la población tenga variedad
suficiente para poner a prueba al copiloto, no para describir a la población real.

**Quién es cada cliente**
- Tipo de perfil: 40 % dependiente, 35 % independiente, 25 % mixto.
- Ingreso mensual: 70 % entre S/ 1,200 y S/ 3,500; 30 % entre S/ 3,500 y S/ 7,000.
- En los mixtos, el 55 % del ingreso es sueldo y el resto ventas.

**Cómo entra el dinero**
- Sueldo mensual el día 1, 15, 25, 28, 30 o 31; el 60 % se adelanta si cae en fin de semana.
- El 25 % de los dependientes cobra por quincena (día 15 y último día del mes).
- El 30 % de los mixtos recibe un pago semanal los viernes.
- El 70 % de los dependientes recibe gratificación en julio y diciembre.
- Las ventas del día varían mucho de un día a otro; el 85 % llega por billetera digital o efectivo.

**Cómo sale el dinero**
- Alquiler: 60 % de los clientes, entre el 18 % y el 32 % del ingreso; el 15 % lo paga tarde.
- Servicios: luz (85 %), agua (70 %), internet (70 %), celular (85 %), con variación mensual en luz y agua.
- De 0 a 3 suscripciones; parte se cobra en la tarjeta.
- Tarjeta de crédito: 55 % de los clientes, con saldo de 0.3 a 1.5 veces el ingreso, pago mínimo del 5 % y TCEA entre 45 % y 115 %.
- Préstamo: 30 % de los clientes, cuota entre el 6 % y el 14 % del ingreso, TCEA entre 18 % y 60 %.
- Gasto del día a día: el gasto total queda entre el 80 % y el 112 % del ingreso, con tendencia de −6 % a +9 % al mes y más gasto los tres días después de cobrar.
- Varios pasajes iguales el mismo día son normales (ida y vuelta): no son duplicados.

**Con cuánto colchón llega cada uno**
- El saldo de apertura se fija para que nadie quede en negativo durante los 90 días de historia.
- El día más apretado de la historia le quedó en la cuenta entre el 0 % y el 10 % de su ingreso mensual.
- Ese 10 % es el supuesto que decide cuánta gente termina en déficit. Lo probamos en la población
  de ajuste antes de fijarlo:

| Tope del colchón (parte del ingreso) | Clientes en déficit |
|---|---|
| 0.05 | 23,1 % |
| 0.08 | 22,1 % |
| **0.10 (elegido)** | **21,5 %** |
| 0.12 | 21,2 % |
| 0.15 | 19,7 % |
| 0.20 | 18,4 % |
| 0.30 | 15,1 % |

Con 0.30 había pocos casos de déficit para medir bien el aviso. Se eligió 0.10 mirando solo
cuántos casos de déficit salían, no qué tan bien le iba al copiloto.

## 6. Cómo se regenera

```bash
npm run evaluar
```

Tarda unos 13 segundos y reescribe `clientes.csv`, `deudas.csv`, `transacciones-muestra.csv` y
`resultados.json`. Para escribir también las 511 086 transacciones:

```bash
EVALUACION_COMPLETA=1 npm run evaluar
```

Dos poblaciones independientes, con semillas distintas:

| Población | Semilla | Para qué se usa |
|---|---|---|
| Ajuste | 20261114 | Solo para fijar parámetros (el colchón, las bandas de confianza, la probabilidad de déficit) |
| Evaluación | 20261115 | Solo para reportar. Es la que está en los CSV. Ninguna cifra publicada sale de la de ajuste |

Como quien repasa con un examen de práctica y se califica con otro distinto.

## 7. Qué tan realista es y qué no

**Lo que sí reproduce:** sueldos que caen en fin de semana, meses de 28 a 31 días, gratificaciones,
ingresos que varían de un día a otro, pagos fijos con monto que cambia, compras con tarjeta que
no tocan el saldo, datos que faltan, cobros dobles y líneas repetidas.

**Lo que no reproduce, y limita lo que se puede concluir:**
- **No está calibrado con datos reales.** No tuvimos acceso a ninguno, y no debíamos tenerlo.
- **El generador y el copiloto los escribió el mismo equipo.** Las formas en que el generador
  «complica» la vida son las que se nos ocurrieron; la vida real tiene otras.
- Sin estacionalidad de gasto (campaña escolar, Navidad), sin inflación y sin feriados.
- Una sola cuenta por cliente y una sola moneda.
- Sin transferencias entre personas que se devuelven, ni préstamos informales.
- Fuera de las reglas descritas (semanas flojas, más gasto tras cobrar, tendencia mensual), cada día se sortea por separado: no hay rachas de gasto ni hábitos que se arrastren de un día al siguiente.

**Lo que no contiene a propósito:** edad, sexo, distrito, estado civil, nivel educativo ni ninguna
otra variable sensible. El copiloto no las necesita y así no puede tratar distinto a nadie por ellas.
