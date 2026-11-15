# 4 · Evidencia técnica

> Lámina: «Métricas de calidad, casos de prueba, resultados, limitaciones y trazabilidad».

**Informe completo:** [`docs/EVALUACION.md`](../../docs/EVALUACION.md) (método, resultados, errores,
equidad, límites y cómo reproducirlo). Este README resume y enlaza.

## 1. Métricas de calidad del motor

Se probó con **1 000 clientes sintéticos** que el motor no había visto (semilla `20261115`). A cada
uno se le dieron 90 días de movimientos, se le pidió proyectar los 30 siguientes y se comparó con lo
que «de verdad» pasó. Referencia: tres métodos simples (saldo plano, promedio de 90 días, repetir los
últimos 30). Cifras `[MEDIDO]` tomadas de [`docs/EVALUACION.md` §0](../../docs/EVALUACION.md#0-resumen-en-un-minuto):

| Pregunta | Resultado |
|---|---|
| ¿Avisa cuando viene un déficit? | Detecta el **84,8 %** (178 de 210); la mejor alternativa simple, 70,5 % |
| ¿Cuántas falsas alarmas? | **19,4 %** de quienes no iban a tener déficit (la alternativa simple, 11,1 %). Precisión del aviso: 53,8 % |
| ¿Acierta el saldo? | Menor error medio a 7 y 14 días (S/ 481 y S/ 790). **A 30 días es el peor de los cuatro** (S/ 1 360) y es pesimista |
| ¿Dice qué tan seguro está? | Brier 0,114, mejor que la tasa media (0,166) y que el aviso sí/no (0,185). La banda del 80 % cubre el 79,8 % a 30 días. Se mide en la evaluación; la app todavía no la muestra |
| ¿La recomendación mejora la decisión? | **Poco:** siguiendo la primera jugada se evita el déficit en el 5,1 % de los avisos acertados |
| ¿Hace daño cuando se equivoca? | En 153 falsas alarmas, seguir la jugada no creó ningún déficit |
| ¿Trata igual a todos? | Por tramo de ingreso, parecido (83 %-88 %). Por perfil, no: **72,7 %** en dependientes frente a 90,8 % en independientes |

Datos crudos: [`docs/evaluacion/resultados.json`](../../docs/evaluacion/resultados.json) (incluye las
semillas y la configuración de la corrida). Antes de la corrección del §13:
[`resultados-antes.json`](../../docs/evaluacion/resultados-antes.json). Experimentos de la fase 3
(probados con la población de ajuste, regla fijada antes de medir): [`docs/evaluacion/ajuste/`](../../docs/evaluacion/ajuste/),
[`CRITERIOS-FASE3.md`](../../docs/evaluacion/CRITERIOS-FASE3.md).

## 2. Métricas de calidad del asistente con IA

| Medida | Resultado `[MEDIDO 14-nov]` |
|---|---|
| Respuestas con alguna cifra que el motor no dio | **0 de 36** |
| Preguntas tramposas con el comportamiento esperado | 12 de 12 |
| Tiempo de respuesta | mediana 4,9 s · máximo 8,5 s |

Detalle, fallos encontrados y su corrección: [`docs/EVALUACION.md` §14](../../docs/EVALUACION.md#14-el-asistente-con-ia-repite-las-cifras-del-motor).
Respuestas completas: [`docs/evaluacion/agente.json`](../../docs/evaluacion/agente.json).

## 3. Casos de prueba y resultados

Corrida en la rama `entregables`, el 15-nov-2026 `[MEDIDO]`:

| Comprobación | Comando | Resultado |
|---|---|---|
| Tipos | `npm run typecheck` | Sin errores |
| Estilo | `npm run lint` | Sin errores |
| Pruebas unitarias | `npm test` | **96 archivos, 1 034 pruebas, todas pasan** (≈30 s) |
| Compilación | `npm run build` | Compila |

Qué cubren las pruebas (`src/**/*.test.ts(x)`, junto a cada módulo):

| Área | Ejemplos |
|---|---|
| Dinero y fechas | Céntimos enteros; sumar meses desde la fecha ancla (31-ene → 28-feb → 31-mar; 29-feb) — `src/motor/dinero.test.ts`, `fechas.test.ts` |
| Motor | Proyección, recurrentes, jugadas, deudas, prioridad, simular — `src/motor/*.test.ts`; regresión de la fase 3 en `regresion-fase3.test.ts` |
| Agente | Qué se anota y qué no, confirmación de montos grandes, respaldo sin IA, elección de modelo — `src/agente/*.test.ts` |
| APIs y seguridad | Mismo origen, sesión, límites, validación — `src/servidor/*.test.ts`, `src/app/api/*/route.test.ts` |
| Interfaz | Coherencia de cifras entre pantallas (`coherencia.test.tsx`), sin marcas ajenas (`sin-marca.test.tsx`) |
| Evaluación | Generador, métricas, detectores, fidelidad — `src/evaluacion/*.test.ts` |

Las cuatro comprobaciones corren solas en cada pull request y en cada cambio a `main`:
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

## 4. Limitaciones

Resumen de [`docs/EVALUACION.md` §10](../../docs/EVALUACION.md#10-límites-de-esta-evaluación):

1. **Circularidad:** el mismo equipo escribió el generador y el motor. No prueba que acierte con personas reales.
2. **Sin datos reales:** las proporciones del generador son supuestos de diseño, no estadísticas de mercado.
3. **Cumplimiento total:** la mejora de la decisión supone que la persona sigue la jugada al pie de la letra.
4. **Un solo sorteo** de 1 000 clientes, sin intervalos de confianza.
5. **El asistente se midió en pequeño:** 36 preguntas, una corrida.
6. **30 días, una vez:** no se midió el uso mes tras mes.

Debilidades conocidas que no se esconden: a 30 días el error del saldo es el mayor de los cuatro
métodos; la precisión del aviso es 53,8 %; el aviso detecta peor a los dependientes.

## 5. Trazabilidad

| Qué | Dónde |
|---|---|
| Cada cifra de la pantalla sale de una función con prueba | `src/motor/` + su `.test.ts` |
| La IA no inventa cifras | Herramientas (`src/agente/herramientas.ts`) + medición de fidelidad (§2) |
| Reproducir datos y métricas | `npm run evaluar` regenera los CSV y `resultados.json` con semillas fijas ([`docs/EVALUACION.md` §12](../../docs/EVALUACION.md#12-cómo-reproducirlo)) |
| Antes y después de cada corrección | [`docs/EVALUACION.md` §13 y §15](../../docs/EVALUACION.md#13-corrección-hecha-con-esta-evidencia-antes-y-después) |
| Historia de cambios | Pull requests en GitHub con su CI; commits pequeños y explicativos |
| Auditorías internas (integral, seguridad, comunicación) | [`docs/auditorias/`](../../docs/auditorias/); resumen en [`RESUMEN-AUDITORIAS-2026-11-14.md`](../../docs/auditorias/RESUMEN-AUDITORIAS-2026-11-14.md) |
| Fuente de cada cifra de mercado | [`investigacion/10-verificacion-de-cifras.md`](../../investigacion/10-verificacion-de-cifras.md) |
| Registro de fallos en el servidor | Solo pieza, tipo de error y código de estado; nunca el mensaje, el cuerpo ni una clave — [`src/servidor/registro.ts`](../../src/servidor/registro.ts) |
