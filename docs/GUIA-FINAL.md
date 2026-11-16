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
| Agente de IA (Anthropic) | Clave cargada en local y en Vercel (producción y vista previa). En local respondió «¿Cómo llego a fin de mes?» con IA y sus cifras coinciden con el motor (S/ 200.00, S/ 4.64, S/ 35.44, S/ 677.20) [MEDIDO 14-nov con el perfil anterior; **repetir la prueba con Andrea** antes de la demo] |
| Voz (Fish Audio) | Voz elegida: «Mayordomo Digital» (`9386123a44af4d43abf10de6e2eea923`). Clave cargada en local y en Vercel; producción devuelve audio con esa voz (tono comparado con la voz de referencia) [MEDIDO 14-nov]. La transcripción con Fish no se probó |
| Datos de la persona | Se guardan **en el navegador** (PGlite, base local); no hay servidor de datos ni cuentas reales. Se entra con una cuenta demo (Andrea) y «Restablecer datos de la demo» está en Perfil [MEDIDO 14-nov] |
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
contestar, prueba con `claude-sonnet-5-5` **[MEDIDO el 14-nov, 2 preguntas: Sonnet 5.5 contesta en 3,3–3,5 s y Opus 5.5 en 5,6–5,9 s; con Sonnet no se evaluó si mantiene las cifras exactas]**.

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
ensayo y el escenario. Di «el lunes 23», no «en 10 días». La app solo muestra a **Andrea**, fisioterapeuta independiente inventada (Carlos y Lucía
ya no aparecen).

| Momento | Qué haces | Qué se ve |
|---|---|---|
| 1. Problema (20 s) | Hablas, sin tocar | Las frases de «Cifras para el pitch» |
| 2. Entrar (10 s) | «Entrar al prototipo» → «Ver el caso de Andrea» | Andrea, fisioterapeuta independiente: cobra por sesión, ingresos que cambian cada semana, tres deudas. Hoy tiene **S/ 1,168.73** |
| 3. El aviso (25 s) | Lees el aviso de Inicio, sin tocar | «El lunes 23 de noviembre te faltarían **S/ 119.07**». Debajo, la causa con montos: «Ese día se juntan alquiler (S/ 850.00) y pago tarjeta azul (S/ 600.00). Quedan 10 días para evitarlo.» y «La salida más barata: pausa tus suscripciones este mes.» Un solo botón: «Ver qué cambia» |
| 4. Elegir (10 s) | Tocas «Ver qué cambia» | La app simula la salida más barata y baja sola hasta el gráfico y el antes/después |
| 5. Antes y después (35 s) | Lees la tarjeta | «Evitas el día en rojo» · Antes: te faltan **S/ 119.07** · Después: te quedan **S/ 42.73** · Cambio: **+S/ 161.80** · «No genera intereses, pero revisa si cobran algún cargo.» Debajo del gráfico: «Proyección referencial basada en los movimientos registrados…». Si hay tiempo, en «Opciones calculadas» toca «Paga solo el mínimo este mes»: después S/ 320.93, cambio +S/ 440.00, pero «Cuesta unos S/ 26.16 (estimado)» y la tarjeta sale en ámbar. Cierra con «Reiniciar comparación» |
| 6. Preguntar (40 s) | Asistente → «¿Qué pasa si solo pago el mínimo?» (escrita o por voz) | Responde con cifras del motor y vuelve a nombrar el lunes 23 de noviembre con -S/ 119.07 por el alquiler y la Tarjeta Azul. Si falla la voz, toca la pregunta sugerida |
| 7. Cierre (20 s) | Cierras | «Ningún número lo inventa la IA: los calcula un motor con 760 pruebas automáticas. La IA solo explica; el motor calcula» |

Antes y después verificados el 14-nov en `fase2-ux-demo` (servidor local, 375 y 390 px) **[MEDIDO]**:

| Opción | Antes | Después | Cambio | Conclusión |
|---|---|---|---|---|
| Pausa tus suscripciones este mes | te faltan S/ 119.07 | te quedan S/ 42.73 | +S/ 161.80 | Evitas el día en rojo (sin intereses) |
| Recorta salidas a comer y delivery de comida | te faltan S/ 119.07 | te quedan S/ 26.53 | +S/ 145.60 | Evitas el día en rojo |
| Paga solo el mínimo este mes | te faltan S/ 119.07 | te quedan S/ 320.93 | +S/ 440.00 | Evitas el día en rojo, cuesta unos S/ 26.16 (estimado) |

Si sobra tiempo o preguntan por los datos propios (cifras del ensayo del 14-nov, no repetidas en esta fase):
Mi dinero → agregar un gasto fijo de S/ 150.50 sube el faltante a **S/ 350.50** [MEDIDO con
`verificar-mi-dinero.mjs`]; el reporte SBS de ejemplo carga 5 deudas que **tú confirmas** antes de guardar.

Sin tocar nada más, solo con la cuenta demo (sin documento): Deudas muestra que con lo que ya paga
Andrea termina sus tres deudas en **9 meses** y ahorra **S/ 2,433.17** en intereses frente a pagar solo el mínimo
(25 meses) [MEDIDO 14-nov con el motor]. «Qué pagar primero» reparte lo disponible empezando por la Tarjeta Azul,
la más cara (TCEA 100.00 %).

Momento «si te pagan» (opcional, 15 s): Andrea tiene un cobro pendiente de un centro de rehabilitación,
S/ 480.00 prometidos para el viernes 20 de noviembre. En Inicio aparece «Ver si te pagan»: con ese cobro el
bache desaparece (saldo más bajo S/ 360.93), pero la proyección base no lo cuenta hasta que llegue.

Si preguntan «¿y si no hay problema?» o «¿y si me deben plata?»: en Deudas → Me deben agrega un cobro
(quién, cuánto, fecha prometida); en Inicio aparece «Ver si te pagan S/ X» con una línea punteada. Los
cobros no entran en la proyección base: la app lo dice.

Si falla la voz o el micrófono, escribe la pregunta o toca una sugerida; el flujo de documento y Mi dinero
no dependen de la voz.

## Cifras para el pitch

Regla del proyecto: ninguna cifra de mercado sin fuente. El detalle, los enlaces y lo que se
descartó están en
la verificación de cifras del equipo (no publicada).
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

- **«¿De dónde salen los datos?»** Son sintéticos, como pide el reto: la cuenta demo de Andrea con 90 días de
  movimientos generados por código; lo que agregas tú vive solo en tu navegador. No hay ningún dato real de nadie.
- **«¿Y si la IA se equivoca con un número?»** El agente no calcula: llama a funciones del motor y
  repite sus resultados. Si la IA no está, la app responde igual con textos del motor.
- **«¿Una TCEA de 100 % es real?»** Es un dato sintético del perfil. La tasa real del mercado solo
  se dice si está en el documento de cifras verificadas.
- **«¿Por qué no propone cambiar la fecha de pago?»** Porque no sirve para este mes: donde la entidad
  lo permite, el cambio de ciclo rige desde el ciclo siguiente. Por eso la app solo propone lo que la
  persona puede hacer hoy por su cuenta (pausar suscripciones, recortar ocio, pagar el mínimo) y, si
  preguntan, explica que hay que llamar a la entidad ANTES de la fecha para pedir una reprogramación.
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
