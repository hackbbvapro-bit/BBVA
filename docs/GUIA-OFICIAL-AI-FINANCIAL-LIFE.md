# Guía oficial del desafío «AI FINANCIAL LIFE» — transcripción ordenada

> **Documento de trabajo interno.** Transcripción de las 7 hojas fotografiadas de la guía que entregó
> la organización el 14-nov-2026, puestas en el orden original (las fotos llegaron al revés).
> Se omitió a propósito el dato de conexión del auditorio que venía en la portada.
> El material es de la organización: **no publicarlo en el repositorio público** sin confirmar que se puede.
> Las frases entre comillas son literales; el resto está transcrito con la redacción más fiel posible.

**Portada:** BBVA · Hackathon de Ingeniería · AI FINANCIAL LIFE · Guía oficial del desafío.
Lema: «Innovación aplicada a decisiones financieras más claras, seguras y útiles».

**Propósito:** documento de referencia para los dos días: reto, condiciones, especificaciones,
entregables y criterios de evaluación.

---

## 01 · La misión y las reglas del juego

«Ustedes son un equipo de producto e ingeniería. Deben seleccionar un problema financiero concreto,
justificar por qué importa, diseñar una experiencia útil y demostrar un MVP operativo en los dos días
del evento. Se premia el valor probado, no el número de funciones ni el uso decorativo de IA.»

### Ámbitos posibles (orientativos)
- Detección de gastos recurrentes y suscripciones.
- Predicción de liquidez.
- Planificación de ahorro.
- Alertas de anomalías.
- Simulación de escenarios.
- Educación financiera personalizada.
- Clasificación de gastos.
- Recomendaciones explicables.

«Elijan un problema principal y una población usuaria definida.»

### Condiciones obligatorias
- IA o ML con una función **demostrable y evaluable**.
- Analítica de datos **reproducible**.
- Interfaz o API utilizable.
- Datos no confidenciales.
- Demostración ejecutable.
- Explicar supuestos, limitaciones, incertidumbre y métricas.
- La solución **no puede prometer rentabilidades ni realizar operaciones financieras reales**.
- «No se permite usar datos personales reales, credenciales bancarias, sistemas internos BBVA ni
  material confidencial. Tampoco utilizar marcas o interfaces bancarias como si fueran un producto oficial.»

### Libertad técnica
- Se admiten modelos estadísticos, ML, LLM, agentes, RAG, reglas, open source y cualquier lenguaje o
  framework autorizado por la organización.
- «Deben poder explicar por qué cada técnica es necesaria y compararla con una alternativa sencilla.»
- BBVA **no proporciona** API keys (OpenAI, Anthropic, Gemini, etc.), créditos cloud ni máquinas con GPU.

---

## 02 · Qué debe construir el equipo (resultado mínimo verificable)

| Bloque | Qué se exige |
|---|---|
| Problema y usuario | Necesidad concreta, perfil, decisión a mejorar y criterio de éxito. |
| Datos | Dataset sintético o público autorizado; esquema, generación u origen, controles de calidad y sesgos. |
| Inteligencia | Modelo, algoritmo o agente funcional con entradas, salidas, evaluación y controles. |
| Experiencia | Flujo de usuario que transforme hallazgos en decisiones claras y accionables. |
| Ingeniería | MVP ejecutable, arquitectura explicada, instrucciones de inicio y pruebas básicas. |

---

## 03 · Datos y especificaciones técnicas

### Contrato de datos recomendado
`customer_id` ficticio, `transaction_id`, fecha/hora, monto, moneda, tipo, categoría, comercio ficticio,
saldo (opcional), ingreso recurrente (opcional) y etiquetas de referencia si se usan para evaluar.

«No incluir nombres, DNI/identificación oficial, teléfonos, cuentas o identificadores reales.»

### Calidad y trazabilidad
- Documentar: volumen, cobertura temporal, distribución de montos, valores faltantes, duplicados,
  casos extremos, semilla de generación y particiones train/validation/test cuando aplique.
- Incorporar **escenarios difíciles**: ingresos irregulares, suscripciones duplicadas, cambios de patrón,
  datos incompletos y transacciones atípicas.
- Evitar fuga de datos entre entrenamiento y evaluación.

### Arquitectura y controles mínimos
- Separar ingesta/preparación, lógica analítica/IA y capa de interacción.
- Mantener configuraciones y secretos fuera del código; no publicar claves en repositorios ni demos.
- Documentar dependencias, versión del modelo, prompts relevantes y mecanismos de fallback.
- Incluir validaciones de entrada, manejo de errores, tiempos de respuesta y pruebas reproducibles.
- Las recomendaciones deben incluir **fundamento, límites y, cuando proceda, nivel de confianza**.
  El usuario conserva la decisión final.

### Métricas (escoger las que correspondan)
| Ámbito | Métricas sugeridas |
|---|---|
| Analítica / ML | precision, recall, F1, MAE, MAPE, calibración, tasa de falsos positivos |
| IA generativa | exactitud factual, groundedness, utilidad, consistencia, evaluación con casos adversos |
| Producto | tiempo hasta insight, tareas completadas, claridad, accesibilidad, utilidad percibida |
| Ingeniería | pruebas superadas, reproducibilidad, latencia, estabilidad, costo por inferencia |

---

## 04 · Desarrollo de la competición

- 10 equipos, mismo enunciado, caso concreto libre.
- «El jurado valorará evidencia observable, no promesas de desarrollo futuro.»
- Se puede presentar solución local, desplegada o grabada como respaldo; **la demo en vivo debe ser la principal**.

| Fase | Qué toca |
|---|---|
| Día 1 · Descubrir | Usuario, problema, datos, hipótesis, MVP, primer flujo funcional. |
| Día 1 · Desarrollar | Ingesta, lógica IA/ML, analítica, experiencia, probar escenarios. |
| Día 2 · Validar | Medir resultados, corregir fallos, ensayar la demo, preparar evidencias. |
| Cierre · Presentar | Pitch, demostración, métricas, arquitectura, preguntas. |

Los horarios de checkpoints, mentorías, cierre de entregas y presentaciones los comunica la organización.

---

## 05 · Entregables obligatorios

En una carpeta o repositorio accesible al jurado:

| Entregable | Contenido |
|---|---|
| README | Problema, usuario, solución, instrucciones de ejecución y requisitos de entorno. |
| Código y demo | MVP funcional; URL o ejecución local; credenciales ficticias si aplica. |
| Datos y metodología | Dataset sintético o enlace público, generador, diccionario y tratamiento aplicado. |
| Evaluación | Casos de prueba, baseline, métricas, resultados y ejemplos de errores. |
| Arquitectura y seguridad | Diagrama simple, componentes, modelos, dependencias y salvaguardas. |
| Pitch | Máximo 10 minutos de presentación + 3 de preguntas (sujeto a confirmación). |

---

## 06 · Cómo se evaluará

| Criterio | Peso | Qué mira |
|---|---:|---|
| Valor y definición del problema | 15 | Necesidad realista, foco y utilidad. |
| IA y analítica | 25 | Rigor, métricas, baselines, calidad de insights y explicabilidad. |
| Calidad técnica | 25 | Arquitectura, código, seguridad, pruebas y robustez. |
| Producto y UX | 15 | Claridad, accesibilidad, acciones útiles y confianza. |
| Innovación y diferenciación | 10 | Originalidad pertinente y criterio tecnológico. |
| Demo y evidencia | 10 | MVP operativo, resultados verificables y comunicación. |
| **Total** | **100** | |

«No se otorgarán puntos adicionales por usar más agentes, modelos o servicios. Se penalizarán
afirmaciones no verificadas, resultados fabricados y riesgos de privacidad o seguridad.»

---

## 07 · Prueba de evolución (si se activa)

La organización podrá entregar a todos los equipos el mismo cambio sorpresa. Ejemplos que da la guía:
ingresos variables, movimientos duplicados o una recomendación que debe ser explicable.
Se evalúa la capacidad de adaptar el MVP y **probar** el cambio.
Activación, momento e impacto se confirman antes del inicio.

---

## 08 · Operativa, soporte y preguntas frecuentes

**La organización da:** espacio, conectividad y electricidad según disponibilidad; reglas, cronograma,
canales de consulta, mentores, jurado y mecanismo de entrega. Cualquier acceso a infraestructura,
cuentas cloud, créditos de API o dataset común se comunicará expresamente.

**Cada equipo trae:** laptops y cargadores; herramientas; cuentas propias autorizadas;
**plan alternativo offline**; dependencias instalables; **capacidad de ejecutar una demo sin datos reales**.
Comprobar licencias y términos de uso de modelos, APIs y datasets.

### Preguntas frecuentes
| Pregunta | Respuesta de la guía |
|---|---|
| ¿Hay que hacer un banco digital completo? | No: es mejor resolver muy bien un problema delimitado. |
| ¿Se puede usar un LLM externo? | «Sí, únicamente si las reglas finales lo autorizan y sin enviar información personal o confidencial.» |
| ¿Dataset generado por IA? | Sí, si documentan cómo se creó y verifican su plausibilidad. |
| ¿Tamaño mínimo de datos? | No hay uno universal: justificar que permite validar el caso. |
| ¿Recomendaciones financieras? | «Sí, como orientación educativa o simulación, con supuestos claros; no asesoramiento personalizado regulado ni ejecución de operaciones.» |
| ¿Reutilizar código o librerías? | «Sí, con atribución y respetando licencias; el trabajo realizado durante el evento debe poder distinguirse.» |

---

## 09 · Checklist de salida

- [ ] Problema y usuario definidos
- [ ] Datos legales y reproducibles
- [ ] MVP ejecutable
- [ ] IA/ML aporta valor medido
- [ ] Baseline y casos adversos
- [ ] Seguridad y explicabilidad
- [ ] README y arquitectura
- [ ] Demo ensayada
- [ ] Entrega completa

---

**Principio rector (última hoja):** «la mejor solución no es la más compleja, sino la que convierte
datos e IA en una decisión financiera más clara, segura y demostrablemente útil.»
