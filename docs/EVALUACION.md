# Evaluación del copiloto anticipador

> Trabajo hecho durante el evento (14-nov-2026).
> Todas las cifras de este documento salen de ejecutar `npm run evaluar` y están en
> [`docs/evaluacion/resultados.json`](evaluacion/resultados.json). Ninguna la escribió un modelo de lenguaje.
> Los datos son 100 % sintéticos (ver [DATOS.md](DATOS.md)); no hay datos de personas reales.

## 0. Resumen en un minuto

Probamos el copiloto con 1 000 clientes sintéticos que nunca había visto. A cada uno le mostramos
90 días de movimientos, le pedimos proyectar los 30 días siguientes y comparamos con lo que «de verdad»
pasó en esos 30 días.

| Pregunta | Respuesta medida |
|---|---|
| ¿Avisa cuando viene un déficit? | Sí: detecta **88,6 %** de los déficits reales (186 de 210). La mejor alternativa simple detecta 70,5 %. |
| ¿A qué costo? | Da **falsa alarma al 22,9 %** de quienes no iban a tener déficit (la alternativa simple, 11,1 %). De cada dos avisos, uno se cumple (precisión 50,7 %). |
| ¿Acierta el saldo? | A 7 días, sí (error medio S/ 518, el menor de los cuatro métodos). **A 14 y 30 días pierde contra alternativas simples** y es pesimista: a 30 días prevé de media S/ 1 261 menos de lo que hubo. |
| ¿Por qué se equivoca? | Porque **subestima el dinero que entra**: no reconoce el sueldo quincenal y usa un estimado muy prudente del ingreso variable. |
| ¿Dice qué tan seguro está? | Sí. La probabilidad de déficit calibrada tiene mejor puntaje (Brier 0,117) que decir a todos la tasa media (0,166) y que el aviso sí/no (0,205). La banda del 80 % cubre el 81,4 % de los casos a 30 días. |
| ¿La recomendación mejora la decisión? | Sí, pero poco: si la persona sigue la primera jugada, el déficit se evita en el **15 %** de los avisos acertados y el faltante baja de S/ 795 a S/ 628 de media. Con todas las jugadas, 25 % y S/ 502. |
| ¿Hace daño cuando se equivoca? | No lo encontramos: en 181 falsas alarmas, seguir la jugada **no creó ningún déficit** y su costo medio fue de 1 céntimo. |
| ¿Trata peor a algún grupo? | El aviso funciona parecido por tramo de ingreso. El error de saldo es mayor en dependientes y en ingreso irregular. |

Lo que **no** se puede concluir de aquí: que el copiloto acierte con personas reales. El generador de
datos y el motor los escribió el mismo equipo, y las proporciones del generador son supuestos de diseño,
no estadísticas de mercado (sección 10).

## 1. Cómo se midió

**Analogía.** Es como un examen con dos cuadernos: uno de práctica, donde se ajusta lo que haya que
ajustar, y otro de examen, que solo se abre para poner la nota.

- **Población A (práctica)**, semilla `20261114`, 1 000 clientes. Solo se usó para dos cosas: fijar el
  colchón inicial del generador y calcular las bandas y probabilidades de la sección 5.
- **Población B (examen)**, semilla `20261115`, 1 000 clientes. **Todo lo que se reporta aquí sale de B.**
- Cada cliente tiene 90 días de historia visible y 30 días de futuro oculto. Todos los métodos reciben
  exactamente lo mismo: la historia visible y el saldo del día de corte.
- El motor se evalúa tal como está en la app (`proyectar`), sin ajustes para esta prueba.
- La corrida es determinista: las mismas semillas dan el mismo archivo de resultados, byte a byte.

**Contra qué se compara.** Tres alternativas simples que cualquiera podría programar en una tarde:

| Método | Qué hace |
|---|---|
| `saldo_plano` | Supone que el saldo no cambia. |
| `promedio_90` | Reparte por igual, día a día, el flujo neto de los 90 días de historia. |
| `repetir_30` | Repite, día por día, lo que pasó en los últimos 30 días de historia. |
| `motor` | El copiloto: detecta pagos e ingresos fijos, los coloca en su fecha y suma un gasto e ingreso variable prudentes. |

**Población de examen.** 395 dependientes, 361 independientes, 244 mixtos; 695 con alguna deuda;
ingreso mensual mediano S/ 2 850 (p10 S/ 1 570, p90 S/ 5 823). 511 086 movimientos en total.
**210 de 1 000 clientes (21,0 %) caen en déficit** en los 30 días siguientes; cuando ocurre, el día
mediano es el 11 y el faltante mediano S/ 491,45.

## 2. ¿Acierta el saldo?

Error absoluto medio del saldo previsto, en soles (menos es mejor):

| Método | A 7 días | A 14 días | A 30 días | Sesgo a 30 días |
|---|---:|---:|---:|---:|
| **motor** | **518,48** | 860,21 | 1 553,68 | −1 260,57 |
| `repetir_30` | 545,73 | **822,07** | 1 162,83 | +5,12 |
| `saldo_plano` | 702,39 | 967,36 | **872,41** | −172,44 |
| `promedio_90` | 722,47 | 984,26 | 965,40 | +71,97 |

Error relativo mediano (error ÷ gasto mensual típico de la persona):

| Método | A 7 días | A 14 días | A 30 días |
|---|---:|---:|---:|
| **motor** | 9,6 % | 17,7 % | 37,8 % |
| `repetir_30` | **9,1 %** | **15,0 %** | 27,1 % |
| `saldo_plano` | 17,5 % | 27,5 % | **21,2 %** |
| `promedio_90` | 19,3 % | 27,7 % | 22,6 % |

**Lectura sin adornos.**

- A 7 días el motor y `repetir_30` están empatados: el motor gana en error medio y pierde por poco en
  error relativo mediano.
- **A 14 días gana `repetir_30`; a 30 días el motor es el peor de los cuatro.**
- El sesgo lo explica: el motor es sistemáticamente pesimista (prevé S/ 1 261 menos de lo que hubo a
  30 días). Los otros tres casi no tienen sesgo.

El copiloto, hoy, **no es un buen predictor del saldo a un mes**. Sirve como sistema de alerta
(sección 4), que es otra cosa.

## 3. ¿De dónde sale el error?

Flujo de los 30 días, media por cliente, en soles. «Diferencia» es previsto menos real.

| Componente | Previsto | Real | Diferencia |
|---|---:|---:|---:|
| Entradas fijas (sueldos) | 1 056,20 | 1 677,91 | **−621,71** |
| Entradas variables (ventas, extras) | 905,80 | 1 733,30 | **−827,50** |
| Salidas fijas (alquiler, servicios, cuotas) | −788,79 | −1 143,87 | +355,08 |
| Salidas variables (día a día) | −2 261,35 | −2 094,90 | −166,45 |

El pesimismo viene de **subestimar lo que entra** (S/ 1 449 de menos entre las dos filas). Se compensa
en parte porque también se le escapan pagos fijos (S/ 355).

Por tipo de perfil:

- **Dependientes:** prevé S/ 1 813 de sueldo cuando entran S/ 3 183, y no prevé nada de los S/ 390 de
  ingresos extra.
- **Independientes:** prevé S/ 1 971 de ventas cuando entran S/ 3 283 (60 %).
- **Mixtos:** se queda corto en S/ 331 de sueldo y S/ 819 de ingreso variable.

Las dos causas concretas, confirmadas en la sección 6:

1. El motor **no conoce el sueldo quincenal**: no detecta ni uno.
2. Para el ingreso variable usa a propósito un valor prudente (el percentil 25 de las semanas
   pasadas). Es una decisión de diseño —mejor asustar de más que de menos— y este es su precio.

## 4. ¿Avisa del déficit?

El aviso es la función central del producto: «en los próximos 30 días tu saldo baja de cero».

| Método | Déficits detectados (recall) | Avisos que se cumplen (precisión) | Falsas alarmas | F1 |
|---|---:|---:|---:|---:|
| **motor** | **88,6 %** (186 de 210) | 50,7 % | 22,9 % | 0,645 |
| `repetir_30` | 70,5 % (148 de 210) | 62,7 % | 11,1 % | **0,664** |
| `promedio_90` | 39,0 % (82 de 210) | 78,9 % | 2,8 % | 0,522 |
| `saldo_plano` | 0 % (nunca avisa) | — | 0 % | — |

Conteos del motor: 186 aciertos, 181 falsas alarmas, 24 déficits no avisados, 609 silencios correctos.

**Lectura.** El motor cambia precisión por cobertura: se le escapan 24 déficits donde a `repetir_30` se
le escapan 62, pero molesta al doble de personas que no tenían problema. En la medida combinada (F1)
`repetir_30` queda ligeramente por delante. Para un producto de alerta nos parece el intercambio
correcto —un déficit no avisado cuesta más que un aviso de sobra, y la sección 8 muestra que la falsa
alarma no hizo daño—, pero es un juicio nuestro, no un resultado.

**¿Acierta la fecha?** En los 186 avisos acertados, la fecha prevista se aleja de la real una mediana de
3 días; el 57,5 % avisa el mismo día o antes, y el 58,1 % cae a 3 días o menos. `repetir_30` da
prácticamente lo mismo (3 días; 59,5 %; 58,1 %).

Los 24 déficits que el motor no avisó tenían un faltante medio de S/ 389,96.

## 5. ¿Qué tan seguro está?

Un aviso sí/no esconde cuánta confianza hay detrás. Medimos dos formas de decirlo.

**Banda del 80 %.** Con los errores de la población A se calcula un rango alrededor del saldo previsto
que debería contener el saldo real 8 de cada 10 veces. En B:

| | A 7 días | A 14 días | A 30 días |
|---|---:|---:|---:|
| Cobertura global | 82,7 % | 80,9 % | 81,4 % |
| Dependiente | 84,1 % | 81,5 % | 81,5 % |
| Independiente | 78,4 % | 74,8 % | 77,0 % |
| Mixto | 86,9 % | 88,9 % | 87,7 % |

La cobertura global cumple. Por perfil no es pareja: en independientes la banda se queda algo corta y
en mixtos sobra. Y la banda es **ancha**: a 30 días, una mediana de S/ 4 138 en dependientes,
S/ 2 679 en independientes y S/ 2 806 en mixtos. Es honesta, pero dice «no sé con mucha precisión».

**Probabilidad de déficit.** Según el margen que el motor proyecta (saldo mínimo previsto ÷ gasto
mensual típico), se asigna la probabilidad observada en A. Los cortes del margen se fijaron antes de
mirar resultados.

| Margen proyectado | Probabilidad que diríamos | Lo que pasó en B | Clientes |
|---|---:|---:|---:|
| Menos de −0,5 | 56,3 % | 58,1 % | 93 |
| −0,5 a −0,1 | 47,7 % | 50,0 % | 206 |
| −0,1 a 0 | 34,3 % | 42,6 % | 68 |
| **0 a 0,1** | **34,3 %** | **13,8 %** | 87 |
| 0,1 a 0,3 | 9,7 % | 7,1 % | 140 |
| 0,3 a 0,6 | 4,0 % | 1,2 % | 174 |
| Más de 0,6 | 0,4 % | 0 % | 232 |

Puntaje de Brier (menos es mejor): **probabilidad calibrada 0,117**; decir a todos la tasa media 0,166;
tratar el aviso del motor como 100 % / 0 % 0,205.

**Lo que está mal y hay que decir.** El tramo «0 a 0,1» está mal calibrado: diríamos 34 % y ocurre 14 %.
Ese tramo quedó unido al anterior al forzar que la probabilidad no suba cuando el margen mejora. Con 87
clientes no da para afinarlo más sin sobreajustar.

**Otra lectura incómoda:** incluso cuando el motor proyecta el peor margen, el déficit real ocurre el
58 % de las veces, no el 90 %. Es el mismo pesimismo de la sección 3.

## 6. ¿Reconoce los pagos e ingresos fijos?

Medido por movimiento de la historia, contra la etiqueta de verdad del generador.

| Corte | Detectados (recall) |
|---|---:|
| Global | 78,0 % (16 792 de 21 542) |
| Series mensuales | 78,9 % |
| Series semanales | 88,6 % |
| **Series quincenales** | **0 %** (0 de 602) |
| **Pagados con tarjeta** | **0 %** (0 de 760) |
| Historia completa | 82,3 % |
| **Historia con huecos** | **51,3 %** |

Precisión 99,95 %: cuando dice que algo es fijo, casi siempre lo es (9 errores).

Lo que más se le escapa: Sueldo (857 movimientos), Servicio de luz (714), Alquiler (695), Pago de
tarjeta (424).

**Tres huecos conocidos:**

1. **Quincenal:** el motor solo conoce «mensual» y «semanal».
2. **Tarjeta:** ignora a propósito lo pagado con tarjeta (no mueve el saldo de la cuenta), así que no
   ve las suscripciones cargadas ahí.
3. **Huecos:** exige al menos tres cobros, uno por mes; si faltan movimientos en la historia, pierde la serie.

## 7. Datos sospechosos

Reglas simples y explicables, no un modelo entrenado.

**Movimientos duplicados**

| Regla | Precisión | Recall | F1 |
|---|---:|---:|---:|
| Ingenua (mismo día, monto y descripción) | 0,4 % | 86,8 % | 0,007 |
| Prudente (respeta la costumbre de la persona) | 80,4 % | 66,8 % | 0,730 |

La regla ingenua es inservible: de sus 98 913 falsas alarmas, 98 906 son «Pasaje» (ida y vuelta el
mismo día). La prudente detecta **todos** los cobros dobles de un cargo fijo (99 de 99) pero solo el
56 % de los registros repetidos; los 136 que se le escapan son pasajes repetidos por error, que no
puede distinguir de un pasaje legítimo.

**Gastos fuera de patrón:** precisión 81,4 %, recall 90,5 %, F1 0,857. Sus falsas alarmas son compras
grandes y poco frecuentes pero normales (ferretería, cuota de colegio).

**Corrección hecha durante la evaluación.** Una prueba unitaria destapó un fallo en la regla prudente:
con dos pasajes iguales al día durante tres días seguidos, marcaba algunos como duplicados aunque ya
había reconocido la costumbre. Se corrigió y la prueba quedó en el repositorio. Las cifras de esta
sección **no cambiaron** al repetir la corrida: el caso no aparece en la población. La corrección la
motivó la prueba, no los resultados del examen.

## 8. ¿La recomendación mejora la decisión?

Es la pregunta que pide el reto. Se mide así: se toma la jugada que propone el copiloto y se aplica
sobre el futuro **real** del cliente (no sobre la proyección), y se vuelve a calcular el saldo.

**Supuesto que hay que tener presente:** la persona hace exactamente lo que dice la jugada. Es un techo
de lo que se puede ganar, no una medida de cuánta gente la seguiría.

En toda la población (1 000 clientes):

| | Sin copiloto | Sigue la primera jugada | Sigue todas |
|---|---:|---:|---:|
| Clientes en déficit | 21,0 % | 18,2 % | 16,3 % |
| Faltante medio por cliente | S/ 157,31 | S/ 126,08 | S/ 102,74 |

En los 186 avisos acertados:

| | Primera jugada | Todas las jugadas |
|---|---:|---:|
| Déficit evitado del todo | 15,1 % | 25,3 % |
| Reducción mediana del faltante | 25,1 % | 49,4 % |
| Faltante medio (antes S/ 795,42) | S/ 627,55 | S/ 502,07 |

Costo medio de seguir la jugada: 4 céntimos.

**Por tipo de primera jugada:**

| Jugada | Casos | Evita el déficit | Reducción mediana |
|---|---:|---:|---:|
| Recortar un gasto | 131 | 19,1 % | 43,6 % |
| Mover un pago | 55 | 5,5 % | 2,0 % |
| Pagar el mínimo | 0 | — | — |

**Lectura sin adornos.**

- La recomendación **ayuda, pero no resuelve**: en 3 de cada 4 avisos acertados la persona sigue en
  déficit aunque haga todo lo que se le propone. Lo que sí baja es el tamaño del hueco.
- **«Mover un pago» casi no sirve** en los datos: cambia la fecha del problema, no el problema.
- Cuando el copiloto dice que la jugada «resuelve» (33 casos), el déficit se evita solo en el 24 %.
  **Esa promesa es demasiado optimista** y hay que suavizar el texto en la app.
- La jugada «pagar el mínimo» no salió primera ni una vez: no está evaluada.

**Cuando el copiloto se equivoca.** En las 181 falsas alarmas, seguir la jugada no creó ningún déficit;
el 0,55 % tuvo algún costo y el costo medio fue de 1 céntimo. El daño medido de una falsa alarma es la
molestia, no el dinero.

**Deudas (dato descriptivo, no contrastado).** De 695 clientes con deuda, en 281 el simulador encuentra
ahorro pagando primero la deuda más cara, con mediana de S/ 2 237,47; en 259 pagar solo mínimos no
termina la deuda. Esto sale de la simulación del propio motor, sin verdad de referencia.

## 9. ¿Trata igual a todos?

No hay variables sensibles en los datos (ni sexo, ni edad, ni distrito). Se compara por lo que sí hay.

**Por tipo de perfil** (motor):

| Perfil | Déficit real | Error a 30 días | Recall | Precisión | Falsas alarmas |
|---|---:|---:|---:|---:|---:|
| Dependiente | 19,5 % | S/ 2 021 (58,3 %) | 83,1 % | 46,0 % | 23,6 % |
| Independiente | 24,1 % | S/ 1 340 (36,5 %) | 90,8 % | 56,8 % | 21,9 % |
| Mixto | 18,9 % | S/ 1 113 (31,8 %) | 93,5 % | 48,3 % | 23,2 % |

Al revés de lo que esperábamos, **al motor le va peor con el asalariado** que con el independiente: es
donde pesa el sueldo quincenal no detectado.

**Por tramo de ingreso** (motor):

| Ingreso mensual | Déficit real | Error relativo a 30 días | Recall | Precisión | Falsas alarmas |
|---|---:|---:|---:|---:|---:|
| Hasta S/ 2 000 | 22,5 % | 36,3 % | 86,0 % | 54,4 % | 20,9 % |
| S/ 2 000 a 3 500 | 20,0 % | 36,5 % | 86,5 % | 46,6 % | 24,7 % |
| Más de S/ 3 500 | 21,5 % | 40,5 % | 93,8 % | 54,6 % | 21,4 % |

No hay una diferencia de trato marcada: quien gana menos no recibe un aviso peor. El recall es algo
mayor en el tramo alto (7 puntos).

**Por escenario** (motor):

| Escenario | Déficit real | Error relativo a 30 días | Recall | Falsas alarmas |
|---|---:|---:|---:|---:|
| Sin complicaciones | 13,5 % | 25,6 % | 86,1 % | 16,9 % |
| Ingreso irregular | 21,9 % | 54,6 % | 92,4 % | 28,4 % |
| Datos incompletos | 22,7 % | 55,5 % | 89,2 % | 23,0 % |
| Movimiento repetido | 16,8 % | 42,9 % | 81,0 % | 25,0 % |
| Cambio de patrón | 31,2 % | 41,7 % | 94,3 % | 28,2 % |
| Gasto atípico | 29,4 % | 41,5 % | 90,8 % | 30,6 % |
| Suscripción duplicada | 24,8 % | 35,9 % | 92,0 % | 22,4 % |

El error se duplica con ingreso irregular y con datos incompletos. Las falsas alarmas suben hasta el
31 % cuando hay un gasto atípico en la historia.

## 10. Límites de esta evaluación

1. **Circularidad.** El mismo equipo escribió el generador y el motor. Estas cifras miden qué tan bien
   aguanta el motor ante los procesos que supusimos, no qué tan bien acierta con personas reales.
2. **Sin datos reales.** Las reglas del evento los prohíben. Las proporciones del generador (cuántos
   independientes, cuántos con tarjeta, cuánto se gasta) son **supuestos de diseño**, no estadísticas
   de mercado. La tasa de déficit del 21 % es consecuencia de esos supuestos.
3. **Cumplimiento total.** La mejora de la decisión supone que la persona sigue la jugada al pie de la
   letra. No medimos cuánta gente lo haría.
4. **Un solo sorteo.** Se reporta una población de 1 000. No calculamos intervalos de confianza; en
   grupos pequeños (33 jugadas que «prometen resolver», 55 «mover pago») las cifras son orientativas.
5. **El asistente conversacional no está evaluado aquí.** Esta evaluación cubre los cálculos. Medir si
   el asistente repite fielmente las cifras del motor requiere llamadas de pago a un modelo y está
   pendiente.
6. **30 días, una vez.** No medimos qué pasa si la persona usa el copiloto mes tras mes.

## 11. Qué haríamos con esta evidencia

En orden de impacto esperado, ajustando siempre en A y reportando en B con el antes y el después:

1. **Reconocer el sueldo quincenal.** Hoy se detecta 0 de 602; es la causa principal del pesimismo en
   dependientes.
2. **Revisar el estimado del ingreso variable.** En independientes, el percentil 25 prevé el 60 % de lo que entra. Probar
   la mediana para el saldo esperado y dejar el percentil 25 solo para el escenario prudente.
3. **Tolerar huecos** al detectar pagos fijos (hoy el recall cae de 82 % a 51 %).
4. **Mostrar la probabilidad calibrada y la banda** en lugar de un aviso sí/no.
5. **Bajar el tono de «resuelve»** en las jugadas y quitar prioridad a «mover un pago».

## 12. Cómo reproducirlo

```bash
npm install
npm test          # pruebas unitarias, incluidas las de la evaluación
npm run evaluar   # unos 15 segundos; reescribe docs/evaluacion/resultados.json y datos/sinteticos/
```

Código en `src/evaluacion/`: `poblacion.ts` (generador), `pronostico.ts` (los cuatro métodos),
`metricas.ts`, `decision.ts`, `detectores.ts`, `evaluar.ts` (arma el informe) y
`corrida.evaluacion.ts` (semillas y tamaño de la corrida oficial).
