# Guía para la final (sábado 14 y domingo 15 de noviembre)

Escrita el viernes 13 de noviembre de 2026 por la noche. Pensada para seguirla sin saber programar.
Analogía: la app es un carro ya armado y probado en el taller; falta echarle gasolina (las claves),
sacarlo a la calle (publicarlo) y manejarlo una vez antes de la carrera (probarlo en el celular).

Marcas: **[MEDIDO]** salió de ejecutar algo · **[ASUMIDO]** no se comprobó todavía.

## Cómo está todo ahora mismo

| Pieza | Estado |
|---|---|
| Motor que calcula, pantallas, chat, avisos dentro de la app | Funciona y está probado en vista de celular **[MEDIDO]** |
| Código en GitHub | Pull request 1 fusionado a `main` el 13-nov-2026 **[MEDIDO]** |
| Dirección pública (producción) | **Publicada** en `https://copiloto-anticipador.vercel.app`. Cada fusión a `main` la vuelve a publicar sola **[MEDIDO]**. Es pública, sin contraseña |
| Claves de notificaciones | Cargadas en Vercel **[MEDIDO]** |
| Agente de IA (Anthropic) | Código listo. **Falta la clave. Nunca se probó con una clave real** |
| Voz (Fish Audio) | Código listo. **Faltan la clave y el id de la voz. Nunca se probó con una clave real** |
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

- **En Vercel (lo que ve el jurado):** `vercel.com` → proyecto `copiloto-anticipador` → Settings →
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
4. Compara un monto de la respuesta con el de la pantalla **Hoy**. Deben coincidir al céntimo.
   Si el agente dice un número que no está en pantalla, **apaga el agente** (quita la clave) y
   presenta con el plan B: la regla de oro vale más que el efecto.

## Paso 4 · Publicar (ya hecho; solo falta el Redeploy con tus claves)

La app ya está publicada en `https://copiloto-anticipador.vercel.app` **[MEDIDO el 13-nov]**: la
pantalla carga con Rosa y el chat responde con el motor («Respuesta del motor, sin IA»). Ahí
`/api/estado` devuelve hoy `"ia":false` y `"voz":false` porque faltan tus claves.

1. Cuando cargues las claves en Vercel: Deployments → el último → **Redeploy**. Una variable nueva
   solo vale desde la siguiente publicación.
2. Abre `https://copiloto-anticipador.vercel.app/api/estado` y comprueba `"ia":true`, `"voz":true`
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

Todas las cifras de abajo salen de la app **[MEDIDO el 13-nov]**. La pantalla dice «Datos de
demostración al viernes 13 de noviembre»: la fecha está congelada a propósito para que los números
no cambien entre el ensayo y el escenario. Por eso di «el lunes 23», no «en 10 días».

| Momento | Qué haces | Qué se ve |
|---|---|---|
| 1. Problema (30 s) | Hablas, sin tocar | Las frases de la sección «Cifras para el pitch» |
| 2. Rosa (20 s) | Perfil **Rosa**, pantalla Hoy | Independiente, ingresos irregulares. Hoy tiene **S/ 461.40** |
| 3. El aviso (60 s) | Lees el aviso y tocas la primera jugada | «Te faltarán **S/ 200.00**»: el **lunes 23 de noviembre** se juntan el alquiler y el pago de la tarjeta. Tres jugadas con su precio: cambiar la fecha del pago (**S/ 4.64**), pagar solo el mínimo (**S/ 26.16**), gastar menos en comida (gratis, pero sola no alcanza: guarda S/ 57.60). El gráfico dibuja el «después» |
| 4. Hablar (40 s) | Pestaña Hablar, pregunta con el micrófono «¿Me alcanza para gastar 300 soles?» | Contesta con voz que ahora no conviene y por qué. Luego «¿Qué deuda pago primero?» |
| 5. Deudas (20 s) | Pestaña Deudas | Con lo que ya paga termina en **5 meses** y ahorra **S/ 1,206.37** frente a pagar el mínimo (20 meses) |
| 6. Confianza (10 s) | Cierras | «Ningún número lo inventa la IA: los calcula un motor con 123 pruebas automáticas. La IA solo explica» |

Si sobra tiempo o preguntan «¿y si no hay problema?»:

- **Carlos** (sueldo fijo, S/ 1,503.50): no hay déficit. La app lo dice: su día más ajustado es el
  domingo 29 de noviembre, con S/ 151.74. Si pregunta por gastar S/ 300, responde que quedaría en
  rojo el martes 24 y que su máximo es S/ 151.74.
- **Lucía** (sueldo más Yape, S/ 899.20): le faltan S/ 25.30 el lunes 23, y si no hace nada el hueco
  crece hasta S/ 100.00 el domingo 29. La salida más barata no cuesta dinero: recortar comida guarda
  S/ 124.48.

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
| No hay internet | Si la app **ya estaba abierta**, Hoy y Deudas siguen funcionando (calculan en el celular). **No la cierres ni la recargues:** sin red no vuelve a abrir, porque la app no guarda copia para uso sin internet. El chat responde con el motor; la voz es la del celular. Lleva además una grabación de pantalla de la demo completa |
| Todo falla | `npm run dev` en la laptop y se muestra en el navegador en tamaño celular |

**Graba un video de la demo completa el sábado apenas funcione.** Es el seguro más barato.

## Preguntas probables del jurado (respuestas honestas)

- **«¿De dónde salen los datos?»** Son sintéticos, como pide el reto: tres perfiles con 90 días de
  movimientos generados por código. No hay ningún dato real de nadie.
- **«¿Y si la IA se equivoca con un número?»** El agente no calcula: llama a funciones del motor y
  repite sus resultados. Si la IA no está, la app responde igual con textos del motor.
- **«¿Una TCEA de 100 % es real?»** Es un dato sintético del perfil. La tasa real del mercado solo
  se dice si está en el documento de cifras verificadas.
- **«¿Cambiar la fecha de pago se puede de verdad?»** Depende del banco. La app lo presenta como
  algo que se *pide*, estima solo los intereses de esos días y avisa de que puede haber un cargo por
  pago tardío. No promete que el banco acepte.
- **«¿Se conecta a mi cuenta?»** No. Hoy no mueve dinero ni lee cuentas reales. El siguiente paso
  natural sería leer los movimientos con permiso del cliente.
- **«¿Dónde se guardan mis datos?»** En ningún lado: no hay base de datos ni cuentas de usuario.
- **«¿Qué falta para producción?»** Datos reales con consentimiento, cuentas, guardar las
  suscripciones de avisos y una revisión legal de protección de datos. No está hecho y no hay que
  decir que sí.

## Lo que NO está verificado (para que no te sorprenda)

- El agente con una clave real de Anthropic, y cuánto tarda en contestar.
- La voz y la transcripción con una clave real de Fish Audio.
- El micrófono en un celular real.
- Las notificaciones en un celular real, sobre todo en iPhone.
- Que la publicación en Vercel salga bien a la primera.
- El tope de preguntas por hora es por cada copia del servidor, no global de verdad: por eso el
  paso 1 (tope en el proveedor) no es opcional.
