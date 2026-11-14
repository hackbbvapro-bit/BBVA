# Cambios en la web · copiloto en claro (14-nov-2026)

Rama `atlas/copiloto-pro`. Marcas: **[MEDIDO]** salió de ejecutar algo y ver la salida · **[ASUMIDO]** no se comprobó.

## Estado de las prioridades
| Prioridad | Qué | Estado |
|---|---|---|
| P1 | Tema claro BBVA, Inter, escala tipográfica | hecho |
| P2 | Ingreso con cuenta demo, cookie, `proxy.ts`, 401 en las APIs, menú Perfil/Salir | hecho |
| P3 | Base local (PGlite en el navegador) y «Mi dinero» con alta/edición/baja | hecho |
| P4 | Deudas: «Debo» y «Me deben», escenario «si te pagan» | hecho |
| P5 | Qué pagar primero (motor de prioridad) | hecho |
| P6 | Subir documentos (`/api/documento`), «Esto encontré», Reporte SBS | hecho; con IA real **sin probar** (no había clave) |
| P7 | Modo «Conversar» manos libres | código y tests; **micrófono real sin probar** |
| P8 | Centro de avisos generado desde la base | hecho |
| P9 | Recomendaciones BBVA con fuente | hecho |
| P10 | «Cómo funciona», estados, foco, reduced-motion | hecho |

## Cómo se usa cada cosa
- **Entrar:** `/ingresar` → «Ingresar con mi cuenta demo» (Rosa). Salir y Perfil están en el menú del avatar.
- **Inicio:** cuánto tienes hoy, qué día te falta y por qué, jugadas con su precio, gráfico. Si tienes cobros pendientes dentro del periodo aparece «Ver si te pagan S/ X» (línea punteada; esos cobros no están en la proyección base).
- **Mi dinero:** cuentas, ingresos fijos y gastos fijos. Agregar, editar o borrar recalcula Inicio al instante y sobrevive a recargar. No deja repetir el nombre de un fijo.
- **Deudas:** «Debo» (entidad, saldo, TCEA, mínimo, día de pago, atraso), «Me deben» (quién, cuánto, fecha prometida; marcar «ya me pagó») y «Reporte SBS» (calificación por deuda, «Qué pagar primero» con grupos Pagar ya / Pagar este mes / Negociar, recomendaciones BBVA con fuente y fecha de consulta 14-nov-2026).
- **Hablar:** chat y voz; panel «Súbeme un documento» (foto, captura o PDF ≤ 3 MB) → tarjeta «Esto encontré» editable → «Guardar lo marcado» solo guarda lo que confirmas. Sin clave de IA ofrece el reporte SBS de ejemplo (sintético, con marca de agua).
- **Avisos:** campanita con contador; los avisos los genera código desde la base (déficit, deuda que vence en ≤ 3 días, atraso, cobro vencido, documento analizado).
- **Cómo funciona:** desde el menú del avatar.
- **Sin internet:** tras la primera visita la app abre y calcula sin red (el `sw.js` guarda los archivos de PGlite).

## Cambio de último momento (iteración 11)
`disponibleParaDeudas` sumaba **todos** los pagos de deuda del mes al día más bajo, aunque uno llegara después de ese día. Con Rosa decía S/ 550.00 «disponibles» mientras Inicio decía que el 23-nov le faltan S/ 200.00. Ahora es el mínimo del saldo «si no se pagara ninguna deuda», día por día: **S/ 400.00**, y Qué pagar primero reparte Tarjeta Azul S/ 320.00 (160 mínimo + 160 extra) y Tarjeta Verde S/ 80.00. [MEDIDO] 2 tests nuevos en `paraPrioridad.test.ts` (valor de la semilla y «pagar lo disponible a destiempo no deja rojo ningún día») y 1 en `tmp-medir.test.ts` (el total repartido no supera lo disponible).

## Verificación de esta entrega
- [MEDIDO] `npm run typecheck` y `npm run lint` sin errores; `npm test`: 37 archivos / 327 tests pasan; `npm run build` ok.
- [MEDIDO] `references/tools/capturas-entrega.mjs` sobre el build servido: 18 capturas (6 pantallas × 390×844, 1024×768, 1440×900) en `docs/capturas/`, desborde horizontal 0 en las 18, 0 errores de consola, ninguna menciona a Carlos ni a Lucía. Cifras de Rosa: hoy S/ 461.40, déficit S/ 200.00, 5 vs 20 meses, ahorro S/ 1,206.37.

## Qué NO se pudo probar
- **Micrófono real** (modo Conversar, dictado) en Chrome de escritorio o iPhone: solo la máquina de estados con tests.
- **Archivo real con IA** (`/api/documento` con Anthropic): sin clave en este entorno; probado con el ejemplo y con tests de la ruta. En producción hay clave: probar una foto real antes de subir al escenario.
- **Notificaciones push** en un celular real, sobre todo iPhone.
- **Sin internet en Safari/iPhone:** probado solo en Chromium.
- **Contraste AA** del chip «Nuevo», de los puntos de nivel en Avisos y de «Cómo funciona»: revisado a ojo, sin `contraste.py`.
- **Anchos 375, 768 y 1920** en las pantallas nuevas de esta iteración: verificados antes con `capturar-pantallas.mjs`, no repetidos tras los últimos cambios.

## Observaciones de diseño para el dueño (gusto, no medibles)
- En escritorio, la pestaña «Debo» deja un hueco bajo la tarjeta izquierda y en «Reporte SBS» queda aire entre las dos tarjetas de la derecha: es el reparto en dos columnas, no un fallo, pero a tu ojo puede sobrar.
- En celular, el botón flotante «Hablar con el copiloto» tapa parte del contenido al desplazar la tarjeta «Esto encontré».
