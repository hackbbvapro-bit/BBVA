# Charla inaugural y láminas — 14-nov-2026 (transcripción ordenada)

> **Documento de trabajo interno.** Resume las 8 fotos de las láminas proyectadas en la charla
> inaugural y la transcripción hablada que tomó Iván.
> El material es de la organización: **no publicarlo en el repositorio público** sin confirmar que se puede.
> Lo que va entre comillas es literal de la lámina o de la charla. Lo marcado `[inferido]` estaba
> tapado en la foto o no se oyó bien, y lo marcado `[interpretación]` es lectura nuestra.
> Guía impresa: `GUIA-OFICIAL-AI-FINANCIAL-LIFE.md`. Análisis: `ANALISIS-GUIA-VS-PRODUCTO.md` (sección 10).

---

## Lámina 1 · Espacio de solución abierto

Seis ámbitos de ejemplo:

| Ámbito | Qué dice la lámina |
|---|---|
| Ahorro inteligente | (detalle no transcrito) |
| Suscripciones | Pagos recurrentes, duplicidades, alternativas. |
| Presupuesto dinámico | (detalle no transcrito) |
| Alertas y anomalías | (detalle no transcrito) |
| **Forecast financiero** | **«Predecir liquidez, saldo futuro o capacidad de cumplimiento.»** |
| Educación financiera | (detalle no transcrito) |

**«Regla clave: elegir un problema concreto, demostrarlo con datos sintéticos y probar que la
recomendación mejora la decisión del usuario.»**

## Lámina 2 · Capacidades técnicas que se quieren observar

| Capacidad | Ejemplos que da |
|---|---|
| GenAI útil | Asistente conversacional, explicaciones en lenguaje claro, insights y recomendaciones personalizadas. |
| Machine Learning | Predicción de saldo, clasificación de gastos, clustering de perfiles, forecasting o propensión a eventos. |
| Analítica avanzada | Segmentación, anomalías, estacionalidad, simulación de escenarios, priorización de oportunidades. |
| Datos sintéticos | Realistas, controlados y evaluables; **ground truth** (verdad de referencia) para medir la calidad de la detección. |
| Responsible AI | Explicabilidad, sesgos, límites de recomendación, privacidad por diseño, trazabilidad de decisiones. |
| Ingeniería | Arquitectura, modularidad, APIs, testing, seguridad, despliegue y observabilidad. |

«El jurado debe poder distinguir soluciones que solo "hablan" de IA de soluciones que realmente
razonan, miden, explican y funcionan.»

## Lámina 3 · Arquitectura de referencia abierta («modelo ilustrativo»)

```
Datos sintéticos  →  Motor analítico  →  IA / ML  →  Orquestación  →  Front / UX
perfiles,            categorías,         forecast,    agentes,          dashboard,
transacciones,       recurrencia,        anomalías,   reglas,           chat,
objetivos,           hábitos,            recomendador, evaluación,      recomendaciones,
eventos              señales             LLM          trazabilidad      simulador
```

«La arquitectura ganadora no será necesariamente la más compleja, sino la que entregue mejor
decisión, evidencia y experiencia.»

## Lámina 4 · Entregables esperados por equipo

«Elementos mínimos para evaluar de forma homogénea»:

| Entregable | Contenido |
|---|---|
| Demo funcional | Aplicación, prototipo o notebook interactivo que pueda ejecutarse o mostrarse de punta a punta. |
| Dataset sintético | Datos generados o utilizados, diccionario, supuestos y justificación de realismo. |
| Modelo / IA | Descripción de modelos, prompts, agentes, features y mecanismos de evaluación. |
| Evidencia técnica | Métricas de calidad, casos de prueba, resultados, limitaciones y trazabilidad. |
| Arquitectura | Diagrama, componentes, APIs, seguridad y decisiones técnicas clave. |
| Pitch final | Problema elegido, solución, valor para el usuario, demo y roadmap. |

**«Formato sugerido: 5 minutos de pitch + 5 [minutos de] demo + 5 minutos de preguntas del jurado.»**
(«minutos de» `[inferido]`: lo tapaba el ponente.)

## Lámina 5 · Criterios de evaluación

| Criterio | Peso | Qué mira |
|---|---:|---|
| Valor de producto y UX | 20 % | Claridad del problema, utilidad real, experiencia, comprensión del usuario. |
| IA / ML / analítica | 25 % | Calidad de modelos, insights, predicción, recomendación y evaluación. |
| Ingeniería y arquitectura | 20 % | Diseño técnico, modularidad, seguridad, testing y ejecución del MVP. |
| Datos sintéticos y evidencia | 15 % | Calidad del dataset, realismo, ground truth, trazabilidad y métricas. |
| Responsible AI | 10 % | Explicabilidad, privacidad, límites, sesgos y uso responsable. |
| Presentación y storytelling | 10 % | Claridad del pitch, demo, impacto y respuesta a preguntas. |
| **Total** | **100 %** | |

No aparece «Innovación» como criterio propio. **Esta tabla no coincide con la de la guía impresa**
(ver la comparación en el análisis, sección 10.1).

## Principios repetidos en la charla (no consta en qué lámina)

- «Cero datos reales.»
- «No se utilizará información confidencial de BBVA.»
- Uso responsable de la IA; seguridad «clave en todo».

---

## Lo que se dijo de palabra

### Logística
- Son **12 equipos** (la guía impresa decía 10).
- Las presentaciones son el **domingo, aproximadamente entre las 10 y las 12**.
- Duración del pitch: se dijo «10 minutos aproximadamente» y después «entre 10 y 15 minutos».
  Con la guía (10 + 3) y la lámina (5 + 5 + 5), hay **tres versiones del formato**.
- Hay una guía impresa en cada mesa.
- **Puede haber un cambio sorpresa** durante el evento.

### Qué se pide
- Un **«MVP funcional con datos propios»**. `[interpretación]` «Propios» = creados por el equipo
  (sintéticos), no datos reales de personas: en la misma charla se repite «cero datos reales».
- Mucho énfasis en **look and feel, usabilidad y «efecto wow»** (anécdota del ponente sobre apps
  bancarias que la gente abandona por poco usables).
- Sesgos: «identificar posibles sesgos y evitar decisiones discriminatorias por variables sensibles».

### Quién mira y qué mira
- En cada mesa hay **tres personas de BBVA: Product Owner, Scrum Master y QA**. Orientan al equipo
  y además **evalúan el talento de cada persona** en una aplicación: comunicación, liderazgo,
  iniciativa y calidad técnica.
- El jurado y otros miembros de BBVA también observan durante los dos días, no solo en el pitch.
- «Tenemos las herramientas y la capacidad y la intención de poder analizar qué estáis haciendo
  por detrás respecto al uso responsable y óptimo de la IA y el desarrollo.»
  `[interpretación]` Van a revisar el código y cómo se hizo, no solo la demo.

---

## Lo que queda sin aclarar (preguntar a los mentores de mesa)

1. ¿Cuál de las dos tablas de puntos manda, la de la guía impresa o la de la lámina?
2. ¿Cuál es el formato real del pitch (10 + 3, 5 + 5 + 5 o 10–15)?
3. ¿A qué hora y por qué medio se cierra la entrega?
4. ¿Está autorizado un LLM externo con datos sintéticos?
5. ¿Cómo quieren que se distinga el código previo del trabajo del evento?
6. ¿El repositorio de entrega puede ser público?
