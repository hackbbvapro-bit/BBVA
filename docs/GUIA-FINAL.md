# Guía para la final (sábado 14 y domingo 15 de noviembre)

Escrita el viernes 13 de noviembre de 2026 por la noche. Pensada para seguirla sin saber programar.
Analogía: la app es un carro ya armado y probado en el taller; falta echarle gasolina (las claves),
sacarlo a la calle (publicarlo) y manejarlo una vez antes de la carrera (probarlo en el celular).

Marcas: **[MEDIDO]** salió de ejecutar algo · **[ASUMIDO]** no se comprobó todavía.

## Cómo está todo ahora mismo

| Pieza | Estado |
|---|---|
| Motor que calcula, pantallas, chat, avisos dentro de la app | Funciona y está probado en vista de celular **[MEDIDO]** |
| Código en GitHub | En `main` de `github.com/hackbbvapro-bit/BBVA` (repositorio del equipo) desde el 14-nov-2026 **[MEDIDO]** |
| Dirección pública (producción) | **Publicada** en `https://copiloto-anticipador-hack.vercel.app`. Cada cambio en `main` la vuelve a publicar sola **[MEDIDO]**. Es pública, sin contraseña |
| Claves de notificaciones | Cargadas en el Vercel del equipo (producción y vista previa); `/api/estado` da `"push":true` [MEDIDO el 14-nov] |
| Agente de IA (Anthropic) | Clave cargada en local y en Vercel (producción y vista previa). En local respondió «¿Cómo llego a fin de mes?» con IA y sus cifras coinciden con el motor (S/ 200.00, S/ 4.64, S/ 35.44, S/ 677.20) [MEDIDO 14-nov] |
| Voz (Fish Audio) | Voz elegida: «Mayordomo Digital» (`9386123a44af4d43abf10de6e2eea923`). Clave cargada en local y en Vercel; producción devuelve audio con esa voz (tono comparado con la voz de referencia) [MEDIDO 14-nov]. La transcripción con Fish no se probó |
| Datos de la persona | Se guardan **en el navegador** (PGlite, base local); no hay servidor de datos ni cuentas reales. Se entra con una cuenta demo (Rosa) y «Restablecer datos de la demo» está en Perfil [MEDIDO 14-nov] |
| Subir un documento con IA real | Con clave: **sin probar con un archivo real**; sin clave ofrece el reporte de ejemplo [MEDIDO con el ejemplo] |
| Micrófono y notificaciones en un celular real | **Sin probar** |

Sin claves la app igual funciona completa: el chat responde con textos del motor (mismos números)
y la voz es la del propio celular. Ese es el plan B y está verificado.

## Paso 1 · Poner tope de gasto antes de pegar ninguna clave (10 min)

Por qué: la dirección de la app será pública. La app ya limita cuántas preguntas acepta por minuto
y por hora, pero el único freno que de verdad no se puede saltar es el que pone el proveedor.

1. **Anthropic** → `console.anthropic.com` → ajustes de facturación / límites → fija un límite de
   gasto mensual bajo (por ejemplo USD 10-20) **[ASUMIDO: el nombre exacto del menú puede variar]**.
2. **Fish Audio** → `fish.audio` → panel de la API → recarga solo un saldo pequeño o fija un tope
   **[ASUMIDO: no se revisó ese panel]**.
3. Crea una clave nueva en cada uno, solo para la hackathon. Así el lunes se borra sin afectar
   nada más.

## Paso 2 · Cargar las claves (10 min)

Son tres valores: `ANTHROPIC_API_KEY`, `FISH_API_KEY` y `FISH_VOICE_ID` (el id de una voz en español
de fish.audio: es el final de la dirección `fish.audio/m/<id>`).

**No las pegues en un chat, en WhatsApp ni en un archivo del repositorio.**

- **En Vercel (lo que ve el jurado):** `vercel.com` → proyecto `copiloto-anticipador-hack` → Settings →
  Environment Variables → añade las tres, marcadas para *Production* y *Preview*.
  Una variable nueva solo vale desde la siguiente publicación (ver paso 4).
- **En tu computadora (para probar):** abre el archivo `.env.local` de la carpeta del proyecto con
  un editor de texto, pega cada valor después del `=` de su línea y guarda. Ese archivo no se sube.

Opcional: `ANTHROPIC_MODEL`. Vacío usa `claude-opus-5-5`. Si en la prueba el agente tarda en
contestar, prueba con `claude-sonnet-5-5` **[ASUMIDO: más rápido y barato; no se midió]**.

## Paso 3 · Probar en la computadora (10 min)

```bash
npm run dev
```

Abre `http://localhost:3000` y comprueba, en este orden:

1. `http://localhost:3000/api/estado` dice qué piezas están activas. Debe mostrar `"ia":true`,
   `"voz":true` y `"push":true`. Si alguna sale en `false`, esa clave falta o está mal pegada
   (si acabas de editar `.env.local` y no cambia, para `npm run dev` con Ctrl+C y vuelve a arrancarlo).
2. Pestaña **Hablar** → toca «¿Cómo llego a fin de mes?». Si debajo de la respuesta aparece
   «Respuesta del motor, sin IA», el agente **no** está contestando: revisa la clave.
3. Con «Voz sí», la respuesta debe oírse con la voz de Fish Audio (no la del sistema).
4. Compara un monto de la respuesta con el de la pantalla **Inicio**. Deben coincidir al céntimo.
   Si el agente dice un número que no está en pantalla, **apaga el agente** (quita la clave) y
   presenta con el plan B: la regla de oro vale más que el efecto.

## Paso 4 · Publicar (hecho el 14-nov)

La app está publicada en `https://copiloto-anticipador-hack.vercel.app` con las claves de
Anthropic y Fish Audio cargadas y republicada: `/api/estado` devuelve `"ia":true`, `"voz":true` y
`"push":true` **[MEDIDO el 14-nov, 00:55]**.

Si algún día cambias una clave:

1. Cárgala en Vercel y luego: Deployments → el último → **Redeploy**. Una variable nueva
   solo vale desde la siguiente publicación.
2. Abre `https://copiloto-anticipador-hack.vercel.app/api/estado` y comprueba `"ia":true`, `"voz":true`
   y `"push":true`.
3. Repite el paso 3 en la dirección de producción.

Cualquier cambio que se fusione a `main` se publica solo. No fusiones nada el domingo antes de
presentar sin probarlo antes.

## Paso 5 · En el celular (15 min, hazlo antes de salir de casa)

1. Abre la dirección de producción en el celular (tiene que empezar por `https`).
2. **iPhone:** Safari → Compartir → «Añadir a pantalla de inicio». Abre la app desde ese icono.
   Sin este paso, en iPhone **no hay notificaciones**.
   **Android:** Chrome → menú → «Instalar app».
3. Campanita → «Activar avisos en este celular» → acepta el permiso → «Enviarme un aviso de
   prueba». Debe llegar una notificación del sistema, no solo el aviso dentro de la app.
4. Pestaña Hablar → toca el micrófono → acepta el permiso → haz una pregunta en voz alta.
5. Sube el volumen y prueba la voz. En iPhone, el interruptor lateral de silencio puede callarla.
6. Prueba una vez con datos móviles, sin wifi: el wifi de un evento suele fallar.

## Guion de la demo (3 minutos)

El tiempo exacto y el formato no están confirmados por los organizadores **[ASUMIDO: 3 min]**.

Las cifras salen de la app servida el 14-nov **[MEDIDO]**. La pantalla dice «Datos de demostración al
viernes 13 de noviembre»: la fecha está congelada a propósito para que los números no cambien entre el
ensayo y el escenario. Di «el lunes 23», no «en 10 días». La app solo muestra a **Rosa** (Carlos y Lucía
ya no aparecen).

| Momento | Qué haces | Qué se ve |
|---|---|---|
| 1. Problema (20 s) | Hablas, sin tocar | Las frases de «Cifras para el pitch» |
| 2. Entrar (10 s) | `/ingresar` → «Ingresar con mi cuenta demo» | Rosa, independiente, ingresos irregulares. Hoy tiene **S/ 461.40** |
| 3. El aviso (35 s) | Lees el titular en Inicio y tocas la primera jugada | «El lunes 23 de noviembre te faltarán **S/ 200.00**»: se juntan el alquiler y el pago de la Tarjeta Azul. La salida más barata cuesta **S/ 4.64** (cambiar la fecha de un pago). El gráfico dibuja el «después» |
| 4. Tus datos (30 s) | Mi dinero → agregas un gasto fijo (por ejemplo S/ 150.50) | Inicio recalcula al instante: el faltante sube a **S/ 350.50** [MEDIDO con `verificar-mi-dinero.mjs`]. Recarga la página: sigue ahí (vive en tu navegador) |
| 5. Reporte SBS (40 s) | Hablar → «Usar reporte SBS de ejemplo» → «Esto encontré» → revisas y «Guardar lo marcado»; luego Deudas → Reporte SBS | La IA solo lee lo escrito y **tú confirmas**. Salen las 5 deudas del ejemplo, la calificación de cada una y «Qué pagar primero» con los grupos Pagar ya / Este mes / Negociar. Si hay clave, prueba antes con una foto tuya |
| 6. Hablar (30 s) | Pestaña Hablar, micrófono: «¿Qué deuda pago primero?» | Contesta con voz; la respuesta repite cifras del motor |
| 7. Cierre (15 s) | Cierras | «Ningún número lo inventa la IA: los calcula un motor con más de 300 pruebas automáticas (343). La IA solo explica y extrae lo que dice un documento, y tú confirmas» |

Sin tocar nada más, solo con la cuenta demo (sin documento): Deudas muestra que con lo que ya paga
Rosa termina en **5 meses** y ahorra **S/ 1,206.37** en intereses frente a pagar solo el mínimo (20 meses).
«Qué pagar primero» con la semilla: S/ 400.00 disponibles este mes; Tarjeta Azul S/ 320.00 (mínimo 160 más
160 extra porque es la más cara, TCEA 100.00 %) y Tarjeta Verde S/ 80.00.

Si preguntan «¿y si no hay problema?» o «¿y si me deben plata?»: en Deudas → Me deben agrega un cobro
(quién, cuánto, fecha prometida); en Inicio aparece «Ver si te pagan S/ X» con una línea punteada. Los
cobros no entran en la proyección base: la app lo dice.

Si falla la voz o el micrófono, escribe la pregunta o toca una sugerida; el flujo de documento y Mi dinero
no dependen de la voz.

## Cifras para el pitch

Regla del proyecto: ninguna cifra de mercado sin fuente. El detalle, los enlaces y lo que se
descartó están en
[`investigacion/10-verificacion-de-cifras.md`](../investigacion/10-verificacion-de-cifras.md).
Si una cifra no aparece ahí como verificada, no se dice.

Las tres que mejor cuentan el problema (elige dos; treinta segundos no dan para más):

1. «Solo 4 de cada 10 peruanos podría afrontar un gasto imprevisto de un mes de ingresos.»
   (SBS-CAF, Encuesta de Capacidades Financieras, 2026)
2. «La tasa promedio de las tarjetas pasó de 53,1 % en enero de 2024 a 64,8 % en setiembre de
   2026.» (BCRP)
3. «Solo 22 % de los peruanos sabe calcular un interés simple.» (SBS-CAF, 2026)

Quién comprobó qué: la tasa de tarjetas la consulté directamente en las series del BCRP
**[MEDIDO]**. Las dos de la SBS-CAF las verificó un ayudante de investigación con su enlace; al
intentar abrir la nota de la SBS por segunda vez la página no cargó, así que **ábrela tú una vez
antes de decirlas** (el enlace está en el documento 10).

No digas: «37 % sin colchón según la SBS» (es de otra encuesta), «28 % confía en la IA» (es en
chatbots), ni la cuota de mercado de BBVA (sin verificar).

## Si algo falla en el escenario

| Falla | Qué hacer |
|---|---|
| El agente no contesta o tarda | Nada: a los 45 segundos como máximo el chat responde con el texto del motor. Mejor: usa los botones de preguntas sugeridas |
| No suena la voz de Fish | La app usa la voz del celular. Si tampoco suena, lee la respuesta en voz alta |
| El micrófono no escucha | Escribe la pregunta o toca una sugerida |
| No llega la notificación | Abre la campanita: los avisos están dentro de la app |
| No hay internet | Si la app **ya se abrió una vez con internet** en ese navegador, recargada sin red abre y calcula igual (guarda sus archivos tras la primera visita) [MEDIDO en Chromium; **sin probar en iPhone/Safari**]. Ábrela una vez con internet antes de salir. El chat responde con el motor; la voz es la del celular. Lleva además una grabación de pantalla de la demo completa |
| Todo falla | `npm run dev` en la laptop y se muestra en el navegador en tamaño celular |

**Graba un video de la demo completa el sábado apenas funcione.** Es el seguro más barato.

## Preguntas probables del jurado (respuestas honestas)

- **«¿De dónde salen los datos?»** Son sintéticos, como pide el reto: la cuenta demo de Rosa con 90 días de
  movimientos generados por código; lo que agregas tú vive solo en tu navegador. No hay ningún dato real de nadie.
- **«¿Y si la IA se equivoca con un número?»** El agente no calcula: llama a funciones del motor y
  repite sus resultados. Si la IA no está, la app responde igual con textos del motor.
- **«¿Una TCEA de 100 % es real?»** Es un dato sintético del perfil. La tasa real del mercado solo
  se dice si está en el documento de cifras verificadas.
- **«¿Cambiar la fecha de pago se puede de verdad?»** Depende del banco. La app lo presenta como
  algo que se *pide*, estima solo los intereses de esos días y avisa de que puede haber un cargo por
  pago tardío. No promete que el banco acepte.
- **«¿Se conecta a mi cuenta?»** No. Hoy no mueve dinero ni lee cuentas reales. El siguiente paso
  natural sería leer los movimientos con permiso del cliente.
- **«¿Dónde se guardan mis datos?»** En tu propio navegador (base local PGlite). No hay servidor de datos ni cuentas reales. Al conversar o subir un archivo, a la IA se le envía lo necesario para contestar; el archivo no se guarda.
- **«¿Qué falta para producción?»** Datos reales con consentimiento, cuentas, guardar las
  suscripciones de avisos y una revisión legal de protección de datos. No está hecho y no hay que
  decir que sí.

## Lo que NO está verificado (para que no te sorprenda)

- Cuánto tarda el agente en contestar con el wifi del evento.
- La transcripción de audio con Fish Audio (la voz sí está probada).
- El micrófono en un celular real.
- Las notificaciones en un celular real, sobre todo en iPhone.
- ~~Que la publicación en Vercel salga bien a la primera.~~ Verificado el 14-nov de madrugada: producción
  sirve la versión nueva, el ingreso demo, el chat con IA (respuesta limpia en español) y la voz
  responden, y a 375 px no hay desborde **[MEDIDO]**.
- Subir una foto o PDF **real** con la IA (solo se probó el reporte de ejemplo) y el modo Conversar con micrófono real.
- El tope de preguntas por hora es por cada copia del servidor, no global de verdad: por eso el
  paso 1 (tope en el proveedor) no es opcional.
