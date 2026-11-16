# 2 · Dataset sintético

> Lámina: «Datos generados o utilizados, diccionario, supuestos y justificación de realismo».

**Documento completo:** [`docs/DATOS.md`](../../docs/DATOS.md). Este README es un resumen con enlaces.
Todos los datos son **inventados** por un generador con semilla: no hay datos de personas reales.

## Qué hay y dónde

| Archivo | Filas | Contenido |
|---|---:|---|
| [`datos/sinteticos/clientes.csv`](../../datos/sinteticos/clientes.csv) | 1 000 | Un cliente por fila, con la «verdad» de sus 30 días siguientes |
| [`datos/sinteticos/deudas.csv`](../../datos/sinteticos/deudas.csv) | 841 | Deudas declaradas (tarjetas y préstamos) de 695 clientes |
| [`datos/sinteticos/transacciones-muestra.csv`](../../datos/sinteticos/transacciones-muestra.csv) | 15 267 | Todos los movimientos de los primeros 30 clientes |
| `transacciones-completo.csv` | 511 086 | Los movimientos de los 1 000 clientes. No se sube por tamaño: se regenera con `EVALUACION_COMPLETA=1 npm run evaluar` |
| [`datos/sinteticos/agente/`](../../datos/sinteticos/agente/) | 6 clientes · 5 deudas · 3 087 movimientos | Población aparte (semilla `20261116`) para evaluar al asistente con IA |
| [`src/catalogo-bbva/productos.json`](../../src/catalogo-bbva/productos.json) | — | Catálogo de productos BBVA Perú copiado de la web oficial con fecha de consulta (no es sintético; es información pública) |

Recuento de filas `[MEDIDO]` contando las líneas de cada CSV sin la cabecera.

## Diccionario de datos

Está en [`docs/DATOS.md` §2](../../docs/DATOS.md#2-diccionario-de-datos): cada columna de
`transacciones-*.csv`, `clientes.csv` y `deudas.csv` con su tipo, valores posibles y significado.
Incluye **etiquetas de verdad** (`es_recurrente`, `serie`, `es_duplicado`, `tipo_duplicado`, atípicos)
para medir si el motor las detecta, y la columna `particion` (`historia` / `oculto` / `futuro`), que
separa lo que el copiloto ve de lo que solo se usa para comprobar.

Convenciones: soles con dos decimales; por dentro todo en **céntimos enteros** (nunca coma flotante);
fechas `AAAA-MM-DD`.

## Supuestos y escenarios

- Supuestos de diseño: [`docs/DATOS.md` §5](../../docs/DATOS.md#5-supuestos-de-diseño).
  Las proporciones del generador son **supuestos**, no estadísticas de mercado.
- Escenarios difíciles: [`docs/DATOS.md` §4](../../docs/DATOS.md#4-escenarios-que-cubre):
  `ingreso_irregular` (302 clientes), `gasto_atipico` (296), `cambio_patron` (170),
  `datos_incompletos` (163), `movimiento_repetido` (125) y `suscripcion_duplicada` (101); 267 clientes
  sin ninguno hacen de grupo de control.
- Perfiles de ingreso: dependientes (sueldo mensual o quincenal, gratificaciones), independientes
  (ventas diarias, 85 % por billetera digital o efectivo) y mixtos.
- Volumen y cobertura medidos: [`docs/DATOS.md` §3](../../docs/DATOS.md#3-volumen-y-cobertura-medido-en-la-corrida-oficial)
  (1 000 clientes: 395 dependientes, 361 independientes, 244 mixtos; 210 terminan en déficit).

## Justificación de realismo (y sus límites)

[`docs/DATOS.md` §7](../../docs/DATOS.md#7-qué-tan-realista-es-y-qué-no) explica qué se parece a la
realidad peruana y qué no. Las cifras de contexto (informalidad, uso de billeteras, costo de tarjetas)
se citan con su fuente en la verificación de cifras del equipo (no publicada).

Límite principal, dicho sin adornos: el generador y el motor los escribió el mismo equipo, así que
acertar con estos datos no prueba que se acierte con personas reales.

## Cómo se genera y se verifica

| Paso | Dónde |
|---|---|
| Generador con semilla | [`src/evaluacion/poblacion.ts`](../../src/evaluacion/poblacion.ts) |
| Exportación a CSV (sin coma flotante) | [`src/evaluacion/exportar.ts`](../../src/evaluacion/exportar.ts) |
| Corrida oficial (semillas y tamaño) | [`src/evaluacion/corrida.evaluacion.ts`](../../src/evaluacion/corrida.evaluacion.ts) |
| Pruebas del generador y la exportación | `src/evaluacion/poblacion.test.ts`, `src/evaluacion/exportar.test.ts` |

Dos poblaciones independientes: **ajuste** (semilla `20261114`, solo para fijar parámetros) y
**evaluación** (semilla `20261115`, la que está en los CSV y la única de la que salen cifras publicadas).

```bash
npm run evaluar                          # reescribe los CSV y docs/evaluacion/resultados.json
EVALUACION_COMPLETA=1 npm run evaluar    # además, las 511 086 transacciones
```
