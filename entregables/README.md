# Entregables — Copiloto anticipador (Hack BBVA 2026)

Índice de los entregables que pidió la organización en la lámina «Entregables esperados por equipo»
(charla del 14-nov-2026, transcrita en [`docs/CHARLA-Y-LAMINAS-14NOV.md`](../docs/CHARLA-Y-LAMINAS-14NOV.md)).

Cada carpeta tiene un `README.md` que **resume** el entregable y **enlaza** a los archivos originales
del repositorio. Los originales no se movieron: el código, las pruebas y el generador de datos los leen
desde su ruta actual. Solo se copiaron aquí las piezas finales que no son código (los diagramas).

| # | Entregable | Qué pide la lámina | Carpeta | Fuente principal |
|---|---|---|---|---|
| 1 | Demo funcional | Aplicación que pueda ejecutarse o mostrarse de punta a punta | [`1-demo-funcional/`](1-demo-funcional/) | App publicada y `src/` |
| 2 | Dataset sintético | Datos generados, diccionario, supuestos y justificación de realismo | [`2-dataset-sintetico/`](2-dataset-sintetico/) | [`docs/DATOS.md`](../docs/DATOS.md), `datos/sinteticos/` |
| 3 | Modelo / IA | Modelos, prompts, agentes, features y mecanismos de evaluación | [`3-modelo-ia/`](3-modelo-ia/) | `src/agente/`, `src/motor/` |
| 4 | Evidencia técnica | Métricas de calidad, casos de prueba, resultados, limitaciones y trazabilidad | [`4-evidencia-tecnica/`](4-evidencia-tecnica/) | [`docs/EVALUACION.md`](../docs/EVALUACION.md) |
| 5 | Arquitectura | Diagrama, componentes, APIs, seguridad y decisiones técnicas clave | [`5-arquitectura/`](5-arquitectura/) | Diagramas C4 y `src/app/api/` |

El pitch final se presenta en vivo y no forma parte de esta carpeta.

## El producto en tres líneas

- **Qué hace:** proyecta el saldo de una persona a 30 días, avisa del día en que le faltará dinero
  (con fecha, monto y causa) y propone 2-3 jugadas con su costo en soles.
- **Regla central:** los números los calcula un motor determinista con pruebas; la IA (Claude, de
  Anthropic) solo los explica y los consulta mediante herramientas. Ningún monto en pantalla sale del modelo.
- **Datos:** solo sintéticos e inventados. No hay datos de personas reales.

## Cómo verificar todo en 5 minutos

```bash
npm ci
npm run typecheck   # tipos
npm run lint        # estilo
npm test            # pruebas unitarias (motor, agente, APIs, interfaz, evaluación)
npm run build       # compilación de producción
npm run evaluar     # regenera métricas y datos sintéticos (≈30 s, sin llamadas de pago)
```

Las mismas cuatro primeras comprobaciones corren en cada pull request
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Convenciones de honestidad

- `[MEDIDO]`: cifra obtenida ejecutando el código del repositorio.
- `[SIN VERIFICAR]`: dato que no se pudo comprobar; no se presenta como hecho.
- Las cifras de mercado se citan con su fuente en
  [`investigacion/10-verificacion-de-cifras.md`](../investigacion/10-verificacion-de-cifras.md).
