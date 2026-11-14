# Cerebro — Ingreso variable: el método del sueldo artificial

Para independientes y negocios donde un mes entra mucho y otro poco. Extracto del módulo de
tesorería para MYPE; aplica igual a una persona con ingresos irregulares.

## 1. El método

1. Calcula tu **piso**: el mes más bajo de los últimos 12
2. Fija tu sueldo personal **en ese piso**, no en el promedio
3. Todo excedente sobre el piso va a **la cuenta de estabilización**, no a tu bolsillo
4. Los meses flojos se cubren de esa cuenta, no de la tarjeta

**Analogía:** es un embalse. En temporada de lluvia no riegas de más: guardas. En sequía usas
lo guardado. El error de siempre es gastar como si todos los meses fueran de lluvia.

**Síntoma de que no se está haciendo:** un mes llega y otro no. No es un problema de ingresos,
es un problema de embalse.

## 2. El mes miente, la semana dice la verdad

Si sumas ingresos y gastos del mes, el mes puede cuadrar. Pero si los compromisos vencen del 1
al 15 y los cobros entran del 20 al 30, **hay dos semanas en negativo cada mes** aunque el mes
cierre en positivo (ejemplo ilustrativo, sin montos).

**Analogía:** un río con caudal suficiente al año, pero que se seca en agosto. El promedio
anual no sirve si los cultivos mueren en agosto.

**Herramienta: proyección semanal a 13 semanas** (un trimestre, horizonte estándar de
tesorería [SIN VERIFICAR: convención de práctica]).

```
              S1      S2      S3      S4
Saldo inicial  X
+ Cobros
− Compromisos
= Saldo final          <- si alguna semana da negativo, ahí está el problema
```

Lo que se busca no es el total, es la **semana negativa**. Una vez identificada hay cuatro
palancas, de la más barata a la más cara: adelantar un cobro, mover un pago, meter capital, o
financiar.

## 3. Nexo con el crédito

Para un independiente, el sueldo artificial ordena el flujo, pero el banco solo reconoce el
ingreso **declarado** (ver `credito-sustento-ingresos.md`).
