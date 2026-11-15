# Informe de la noche — sábado 14-nov-2026 (04:22, Lima)

> Documento PRIVADO para Iván. **No subir al repositorio del equipo** (es público).
> Marcas: `[MEDIDO]` = lo vi ejecutarse; `[ASUMIDO]` = no lo pude comprobar.

## 1. Conclusión

La app está publicada, funcionando y con todo lo de esta noche ya en producción:
**https://copiloto-anticipador-hack.vercel.app** `[MEDIDO]`.

- 343 pruebas en verde. Compilación limpia. Vercel desplegó sin errores. `[MEDIDO]`
- Esta noche encontré y arreglé un fallo que habría quedado feo frente al jurado: el chat mostraba
  notas internas de la IA en inglés («Need both deudas and resumen…»). Ya no salen. `[MEDIDO]`
- Quedan cosas que **solo se pueden probar con un teléfono en la mano** (sección 5). No las doy por buenas.

## 2. Impacto en la demo

- La cuenta demo entra y el chat responde limpio, en español y con números correctos. Ejemplo real
  en producción: «Tarjeta Azul, TCEA 100,00 %; te faltan S/ 200,00 el lunes 23-nov; paga solo el
  mínimo de S/ 160,00». `[MEDIDO]`
- En formato celular (375 px de ancho) no hay nada desbordado. La barra inferior y el gráfico se ven
  bien. `[MEDIDO]`
- El guion de 3 minutos, las cifras del pitch, el plan B y las preguntas probables del jurado están
  en `docs/GUIA-FINAL.md` del repositorio (sección «Guion de la demo»).

## 3. Lo que se hizo (evidencia)

| Cambio | Qué arregla |
|---|---|
| `94145ee` | No se recomienda ahorrar en un depósito a quien no llega a fin de mes. |
| `6841757` | La API rechaza peticiones de otros sitios. El tope de gasto de IA solo se consume con peticiones válidas. |
| `adf3a4e` | El nombre y la descripción del cliente entran a la IA como dato, no como orden (evita «inyección de instrucciones»). |
| `3e401dc`, `971abf8` | Arreglos previos de la auditoría (P1). |
| `6802224` | **El chat ya no muestra las notas internas de la IA.** Lleva 3 pruebas nuevas: fallan sin el arreglo y pasan con él. |
| PR #1, #2, #3 | Unidos a `main` en hackbbvapro-bit/BBVA. El último, `49c775d`, actualiza la guía. |

Comprobaciones en producción `[MEDIDO]`:
- `/ingresar` responde 200.
- `/api/agente` responde 200. `/api/voz` responde 200.
- Un POST sin origen, o desde otro sitio, responde 403.

**Cómo funciona el arreglo del chat** (analogía): antes la IA «pensaba en voz alta» y la app lo
transmitía en directo. Ahora la app espera a que la IA termine de consultar los números y solo
entonces muestra la respuesta final. El precio: la respuesta aparece de golpe tras «Pensando…», ya
no palabra por palabra.

## 4. «No, Iván» — decisiones que mantuve

- **Tu dirección y tu nombre completo no entran en la cuenta demo.** El repositorio es público, lo verá
  el jurado y la Ley 29733 (datos personales) aplica. La demo usa solo personas inventadas.
- **La IA no decide montos.** Todos los números los calcula el código y tienen pruebas. La IA solo los
  explica. Es la regla 2 del proyecto y es lo que defiende la demo si el jurado pregunta «¿y si la IA
  se equivoca?».
- **Corregí el monto de la garantía.** El mínimo de la garantía líquida de BBVA es **S/ 500**, no
  S/ 700. La Tarjeta Start pide un depósito de S/ 500 a S/ 15 000. `[MEDIDO en la web de BBVA]`
- **El Reporte SBS es gratuito.** No lo presentes como un servicio de pago.

## 5. Lo que NO está probado (no lo des por hecho)

- El micrófono real (voz manos libres con ~2 s de silencio) en un teléfono.
- iPhone con Safari.
- Notificaciones push en un teléfono real.
- La transcripción con Fish Audio.
- Muchas personas usando la app a la vez (carga).
- Subir un documento real (foto o PDF) a la IA en producción.

## 6. Pendientes que te tocan a ti (antes de las 08:30 si se puede)

1. **Tope de gasto** en Anthropic y en Fish Audio: así una fuga no puede vaciar la tarjeta.
2. **Verificación en dos pasos (2FA)** en la cuenta de Vercel del equipo.
3. **Prueba en un iPhone real.** Recorre el guion entero: entrar, chat, voz y subir una foto.
4. **Graba un video de la demo** como plan B, por si falla el wifi del local.
5. **Ensaya con el proyector** una vez: tamaño de letra y modo claro.
6. **Abre una vez el enlace del Reporte SBS** (SBS-CAF) para confirmar que carga.

**Si producción se rompe en el escenario:** entra en Vercel → *Deployments* → elige el despliegue
anterior → **«Instant Rollback / Promote»**. Tarda segundos y no toca el código.

## 7. Costo y herramientas

- **Atlas costó $49,5** en esta misión. `[MEDIDO]`
- La auditoría de alpha se cortó por su tope de presupuesto. Recomiendo subir `alpha.max_cost_usd`
  en la configuración de Atlas antes de la próxima misión grande.
- Los commits nuevos usan un correo anónimo de GitHub (`noreply`). **Ojo:** los 22 commits antiguos
  del repositorio público siguen mostrando tu correo personal. No reescribí el historial porque
  exige un push forzado, y eso está prohibido sin tu permiso expreso. Si quieres taparlo, lo
  decidimos después de la final.

## 8. Mejoras conocidas que NO son urgentes (P2)

- Los números que escribe la IA no se comparan automáticamente contra los del motor. Hoy los toma
  de las herramientas, pero no hay una alarma si copia mal uno.
- `/api/avisos` no comprueba la sesión ni tiene tope global.
- El modo sin conexión (*service worker*) no tiene límite de espera de red.
- El reparto «qué pagar primero» es voraz: en casos raros puede saltarse una deuda de más prioridad.
- Los rangos del Reporte SBS están marcados `[SIN VERIFICAR]`.
- Posible doble conteo en ventanas que cruzan febrero, y una incoherencia en si «hoy» cuenta o no.
- «Qué pagar primero» no deja colchón (reserva cero).
- La respuesta del chat ya no aparece palabra por palabra (efecto del arreglo de esta noche).

Mi criterio: firmar la cookie de sesión (HMAC) aporta poco en una demo con datos inventados. No vale
la pena tocarlo antes de la final.

## 9. Decisión pendiente

Ninguna bloquea la demo. Lo único urgente es lo de la sección 6, sobre todo los **topes de gasto** y
la **prueba en iPhone**.
