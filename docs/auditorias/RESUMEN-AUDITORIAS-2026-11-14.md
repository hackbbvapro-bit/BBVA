# Resumen de las tres auditorías — 14-nov-2026

Fuentes: `ALPHA-INTEGRAL-2026-11-14.md`, `REX-SEGURIDAD-2026-11-14.md` (+ `rex-veredictos.json`, verificado por un agente independiente), `VENTAS-MARKETING-2026-11-14.md`.

## Conclusión

| Auditoría | Nota | Veredicto en una línea |
|---|---|---|
| Alpha (integral) | 5,3 / 10 | «No lo compro» hoy; competitivo si se arreglan los P0. Tablas de la guía: ~63-65 / 100 → ~72-75 con los P0 arreglados [CALCULADO por Alpha]. |
| Rex (seguridad) | sin hallazgos altos ni críticos | 5 confirmados de severidad baja o informativa; el resto, rechazados por el verificador. |
| Hark (ventas) | 6,5 / 10 | El producto está mejor armado que contado. Sube a ~8 con cambios de texto y guion. |

El riesgo para la final no es la seguridad: es que el jurado vea **cifras que no cuadran entre pantallas**.

## P0 — antes de presentar

1. ~~**Cifras incoherentes entre pantallas** (Alpha P0-1)~~: **corregido el 14-nov (PR #12)**. «Qué pagar primero» ya no suma extra con un día en rojo y repite la regla de Mi ruta; Mi dinero y Mi ruta dan los mismos ingresos y gastos del mes (S/ 3,568.20 y S/ 3,112.70 con Andrea); Inicio, Mi ruta, Deudas y el asistente nombran la misma salida más barata. Lo cubre `coherencia.test.tsx`.
2. ~~**El aviso subestima el hueco** (Alpha P0-2)~~: **corregido el 14-nov (PR #12)**. Con Andrea no se reproducía (el primer día en rojo ya es el más bajo), pero se arregló el caso general: si el hueco crece, Inicio y Mi ruta dicen hasta cuánto y qué día.
3. **Abrir la portada con el resultado** (Hark, cambio 1): «Te avisamos el día que no te alcanza la plata, antes de que llegue». **Choca con la portada que tú aprobaste**: la decisión es tuya.
4. **Modelo de negocio para BBVA** (Hark, cambio 2): hoy no existe. Hace falta una hoja con tres palancas (adopción, retención y mora evitada), sin cifras inventadas.

## P1 — si hay tiempo

- ~~La jugada más barata es «pagar tarde»: eso educa mal (Alpha)~~: **corregido el 14-nov (PR #11)**. Ya no se propone mover la fecha de pago; las jugadas son pausar suscripciones, recortar ocio (nunca comida) y pagar el mínimo, cada una con su costo calculado.
- No hay banda de confianza en la proyección (Alpha).
- Dos «hoy» distintos; el aviso no se actualiza al simular (sigue pendiente tras el PR #12); una segunda pestaña deja la app en solo lectura (Alpha). *Textos truncados en móvil: corregidos en los indicadores de Inicio (PR #11); el resto de pantallas no se ha revisado.*
- Contar nosotros las cifras flojas de la evaluación antes de que las pregunten (Hark, cambio 3):
  - precisión del aviso: 53,8 %;
  - brecha de detección: 72,7 % en dependientes frente a 90,8 % en independientes.
- Suavizar promesas como «el orden que más intereses te ahorra» (Hark, cambio 4).
- Renombrar «Empezar con mi situación» a «Armar un caso de práctica» (Hark, cambio 5).
- ~~El ahorro de Deudas está mal atribuido~~: **corregido el 14-nov** (ahora dice que el ahorro sale de pagar más, no solo del orden).

## Seguridad (Rex) — todo bajo

| ID | Qué | Severidad | Acción |
|---|---|---|---|
| C-001 | La cookie solo valida el formato; un tercero podría agotar la cuota global de 300 por hora | baja | Firmar la cookie (HMAC) después de la final |
| C-003 | `/api/voz` sintetiza cualquier texto | baja | Limitar la longitud y el origen |
| C-004 | Los números que dice el modelo de lenguaje no se validan | informativa | Ya mitigado: las cifras llegan por herramientas del motor |
| C-005 | Hay correos personales en 31 commits de un repo público | baja | Decisión del dueño (reescribir el historial es destructivo) |
| C-006 | Al salir no se borra el almacenamiento local | baja | Borrar el almacenamiento local al salir |

## Decisiones que te tocan

1. **Límites de gasto en las consolas de Anthropic y Fish Audio** (Rex C-002). Solo los puedes poner tú.
2. **GitHub**: activar la protección de la rama `main` y Dependabot (C-019); decidir qué hacer con los correos que aparecen en los commits (C-005).
3. **Aviso de la Ley 29733 de datos personales** (C-017): solo hace falta si se piden datos reales; hoy todo es sintético.
4. ~~¿Arreglamos ya los P0 de Alpha?~~ Resuelto: sí, PR #12.
5. **Portada**: ¿mantener la tuya o abrir con el resultado, como propone Hark?
