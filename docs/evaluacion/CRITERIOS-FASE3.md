# Fase 3 — criterios de aceptación, fijados ANTES de medir

Fecha: 2026-11-14. Este archivo se guarda en un commit propio antes de medir cualquier cambio del motor,
para que nadie pueda ajustar la regla al resultado. Todo con datos sintéticos; ninguna cifra viene de clientes reales.

## Dónde se mide cada cosa

| Uso | Población | Semilla | Para qué |
|---|---|---|---|
| Desarrollo (práctica) | A | 20261114 (calibra con 20261113) | Elegir, ajustar y descartar variantes. `AJUSTE=nombre npm run evaluar`. |
| Examen anterior | B | 20261115 | La corrida oficial de `EVALUACION.md`. Ya se miró muchas veces: NO sirve como examen nuevo. |
| Cohorte final nueva | C | **20261117** (calibra con 20261114) | Se corre UNA vez, con todos los cambios ya congelados, contra la línea base en la misma cohorte. |

La semilla 20261116 ya está usada (casos del agente) y no se reutiliza.

## Línea base de desarrollo (A, motor de `main` a1b6506) [MEDIDO]

Recall 79,1 % (170 de 215 déficits), falsas alarmas 20,4 % (160 de 785 sin déficit), precisión 51,5 %,
F1 0,624, error medio absoluto a 7 / 14 / 30 días: S/ 503,9 / 759,1 / 1 261,0. 45 déficits sin aviso.

Errores estándar (binomial) [CALCULADO]: recall ±2,77 puntos; falsas alarmas ±1,44 puntos.

## Regla de decisión para cada cambio (en A, uno por uno)

Orden de importancia: 1) no dejar déficits sin aviso, 2) no llenar de falsas alarmas, 3) acertar el saldo.

- **C1 Detección.** El recall no baja más de un error estándar: **≥ 76,3 %**.
- **C2 Falsas alarmas.** No suben más de un error estándar: **≤ 21,8 %**.
- **C3 Error de saldo.** El error medio absoluto a 7 y 14 días no empeora más de 2 %.
- **C4 Mejora real.** Se cumple al menos una de estas: error a 30 días −2 % o más; falsas alarmas −1,44 puntos
  o más (un error estándar); recall +2,77 puntos o más (un error estándar).

Un cambio se **acepta** solo si cumple C1, C2, C3 y C4. Si cumple C1-C3 pero no C4 es **neutro**: no se
promueve, porque añade complejidad sin beneficio medible. Si mejora el saldo pero rompe C1, se **rechaza**
y se reporta el costo-beneficio: cuántos déficits más quedan sin aviso a cambio de cuántos soles de error.

Además, por tipo de perfil (dependiente, independiente, mixto) ningún grupo puede perder más de 2 déficits
avisados ni subir más de 2 puntos sus falsas alarmas sin que se explique por qué en el informe.

## Regla para la cohorte final C (20261117)

Se mide el paquete de cambios aceptados contra el motor de `main` en la misma cohorte. Se recomienda fusionar
solo si en C también se cumplen C1, C2 y C3, y el error a 30 días no empeora. Si C contradice a A, gana C y el
cambio no se recomienda (aunque haya pasado en A). Se reportan recall, precisión, F1, falsas alarmas,
error a 7/14/30 días, resultados por perfil y por escenario, efecto de las recomendaciones y regresiones.

## Escenarios esperado y conservador (Tarea C)

Se evalúan aparte y NO entran en la pantalla principal en esta fase. Criterio fijado ahora:
- El escenario **conservador** debe quedar por debajo del saldo real (subestimar, no sobreestimar) en al menos
  el 80 % de los clientes a 30 días.
- El escenario **esperado** debe tener menor sesgo absoluto a 30 días que el conservador.
- Ninguno de los dos cambia el aviso de déficit del motor actual.
